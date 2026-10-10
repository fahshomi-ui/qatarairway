// Qatar Airways live flight search API for the qtatr frontend.
// Replaces the old (dead) http://34.142.131.43:8791 service.
//
// Endpoints (same contract the frontend bundle expects):
//   POST /api/search          -> { offers, currency, count, noResults, places, calendar }
//   POST /api/calendar        -> { faresFromCalendar, moreDates, currency }
//   POST /api/calendar-range  -> { calendar }
//   GET  /api/qr-status       -> health / browser state
//
// flight-offers is protected by Akamai Bot Manager, so it is executed from inside a
// real Google Chrome session (patchright, headful under Xvfb). fare-calendars works
// with a plain server-side fetch, with the browser as a fallback.

const BASE = "https://www.qatarairways.com";
const OFFERS_PATH = "/dapi/public/bff/web/flight-search/flight-offers";
const CALENDAR_PATH = "/dapi/public/bff/web/flight-search/fare-calendars";
const HOME_URL = BASE + "/en/homepage.html";
const FS_PAGE = BASE + "/app/booking/flight-selection";
const FS_API_KEY = "74f2474702784207a9785eb3ef8ae4e4";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const CABIN_MAP = { E: "ECONOMY", B: "BUSINESS", F: "FIRST", ECONOMY: "ECONOMY", BUSINESS: "BUSINESS", FIRST: "FIRST" };

const log = (...a) => console.log("[qr-search]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deviceId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function todayPlus(n) {
  return addDays(new Date().toISOString().slice(0, 10), n);
}

// ---------------------------------------------------------------- browser manager
let pwModule;
function getPw() {
  if (pwModule === undefined) {
    try {
      pwModule = require("patchright");
    } catch (e) {
      log("patchright not available:", e.message);
      pwModule = null;
    }
  }
  return pwModule;
}

const B = {
  browser: null,
  context: null,
  page: null,
  readyAt: 0,
  warming: null,
  fails: 0,
  okCount: 0,
  failCount: 0,
  lastError: null,
  lastOkAt: 0,
};

// Railway may override the Docker CMD (custom start command), so start a virtual
// display ourselves when none is available.
let xvfbStarted = false;
async function ensureDisplay() {
  if (process.env.QR_HEADLESS === "1" || process.env.DISPLAY || process.platform !== "linux") return;
  if (xvfbStarted) return;
  const fs = require("fs");
  const bin = ["/usr/bin/Xvfb", "/usr/local/bin/Xvfb"].find((p) => fs.existsSync(p));
  if (!bin) {
    log("Xvfb not found; headful Chrome will fail");
    return;
  }
  const { spawn } = require("child_process");
  const disp = ":99";
  try {
    fs.unlinkSync("/tmp/.X99-lock");
  } catch (e) {}
  const proc = spawn(bin, [disp, "-screen", "0", "1366x900x24", "-nolisten", "tcp", "-ac"], {
    stdio: "ignore",
    detached: false,
  });
  proc.on("exit", (code) => {
    log("Xvfb exited", code);
    xvfbStarted = false;
    if (process.env.DISPLAY === disp) delete process.env.DISPLAY;
  });
  xvfbStarted = true;
  process.env.DISPLAY = disp;
  await sleep(1500);
  log("started Xvfb on", disp);
}

async function closeBrowser() {
  const b = B.browser;
  B.browser = null;
  B.context = null;
  B.page = null;
  B.readyAt = 0;
  if (b) {
    try {
      await b.close();
    } catch (e) {}
  }
}

async function wiggle(page, n = 4) {
  for (let i = 0; i < n; i += 1) {
    try {
      await page.mouse.move(100 + Math.random() * 1100, 100 + Math.random() * 600, { steps: 8 });
      await page.waitForTimeout(200 + Math.random() * 250);
    } catch (e) {
      return;
    }
  }
}

function warmUrl() {
  const q = new URLSearchParams({
    widget: "QR", searchType: "F", addTaxToFare: "Y", minPurTime: "0", selLang: "en",
    tripType: "O", fromStation: "DOH", toStation: "LHR", departing: todayPlus(21),
    bookingClass: "E", adults: "1", children: "0", infants: "0", ofw: "0", teenager: "0",
    flexibleDate: "off", allowRedemption: "N",
  });
  return `${FS_PAGE}?${q.toString()}`;
}

async function warm() {
  const pw = getPw();
  if (!pw) throw new Error("browser_unavailable");
  await closeBrowser();
  await ensureDisplay();
  const t0 = Date.now();
  const browser = await pw.chromium.launch({
    headless: process.env.QR_HEADLESS === "1",
    channel: process.env.QR_CHROME_CHANNEL || "chrome",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1366,900",
    ],
  });
  browser.on("disconnected", () => {
    if (B.browser === browser) {
      B.browser = null;
      B.context = null;
      B.page = null;
      B.readyAt = 0;
    }
  });
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1366, height: 800 } });
  // Save memory/bandwidth: skip images & media (not used by the bot sensor).
  await context.route("**/*", (route) => {
    const t = route.request().resourceType();
    if (t === "image" || t === "media") return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(HOME_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(4000);
  await wiggle(page, 5);
  await page.goto(warmUrl(), { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  await wiggle(page, 3);
  B.browser = browser;
  B.context = context;
  B.page = page;
  B.readyAt = Date.now();
  B.fails = 0;
  log(`browser warmed in ${Date.now() - t0}ms`);
}

async function ensurePage() {
  const fresh = B.page && !B.page.isClosed() && Date.now() - B.readyAt < 25 * 60 * 1000;
  if (fresh && B.fails < 5) return B.page;
  if (!B.warming) {
    B.warming = warm()
      .catch((e) => {
        B.lastError = String(e && e.message ? e.message : e);
        log("warm failed:", B.lastError);
        throw e;
      })
      .finally(() => {
        B.warming = null;
      });
  }
  await B.warming;
  return B.page;
}

// Serialise all browser work on the single page.
let chain = Promise.resolve();
function serial(fn) {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}

const PAGE_FETCH = async ({ url, body, lang, apiKey }) => {
  const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const clean = (v) => (v ? String(v).replace(/^"+|"+$/g, "") : "");
  let sid = clean(sessionStorage.getItem("nbx.session.id"));
  if (!sid) {
    sid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  let did = clean(localStorage.getItem("nbx.device.id"));
  if (!did) did = hex(32);
  const tid = hex(32);
  const spid = hex(16);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      method: "POST",
      credentials: "include",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "qr-lang": lang || "en",
        "session-id": sid,
        "X-AssignedDeviceID": did,
        nbx_fs_api_key: apiKey,
        "request-id": `|${tid}.${spid}`,
        traceparent: `00-${tid}-${spid}-01`,
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    return { status: r.status, text };
  } catch (e) {
    return { status: 0, text: "", error: String(e) };
  } finally {
    clearTimeout(timer);
  }
};

async function browserPost(path, body, lang, deadlineMs = 22000) {
  return serial(async () => {
    const until = Date.now() + deadlineMs;
    let last = { status: 0, text: "", error: "not_started" };
    for (let attempt = 0; attempt < 10 && Date.now() < until; attempt += 1) {
      let page;
      try {
        page = await ensurePage();
      } catch (e) {
        last = { status: 0, text: "", error: String(e) };
        await closeBrowser();
        await sleep(500);
        continue;
      }
      let r;
      try {
        r = await page.evaluate(PAGE_FETCH, { url: BASE + path, body, lang, apiKey: FS_API_KEY });
      } catch (e) {
        r = { status: 0, text: "", error: String(e) };
        await closeBrowser();
      }
      last = r;
      if (r.status === 200 || r.status === 204 || (r.status >= 400 && r.status < 500 && r.status !== 403)) {
        B.fails = 0;
        B.okCount += 1;
        B.lastOkAt = Date.now();
        return r;
      }
      B.fails += 1;
      B.failCount += 1;
      if (B.page) {
        await wiggle(B.page, 3);
        await sleep(900 + attempt * 300);
      }
      if (B.fails >= 6) await closeBrowser(); // re-warm with a fresh profile
    }
    return last;
  });
}

async function serverPost(path, body, lang) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": lang || "en",
        "qr-lang": lang || "en",
        "session-id": uuid(),
        "X-AssignedDeviceID": deviceId(),
        nbx_fs_api_key: FS_API_KEY,
        "User-Agent": UA,
        Origin: BASE,
        Referer: FS_PAGE,
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    return { status: 0, text: "", error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- request building
function buildPassengers(adults, children, infants) {
  const pax = [{ type: "ADT", count: Math.max(1, Number(adults) || 1) }];
  const c = Number(children) || 0;
  if (c > 0) pax.push({ type: "CHD", count: c });
  const i = Number(infants) || 0;
  if (i > 0) pax.push({ type: "INF", count: i });
  return pax;
}

function buildQrBody(p, overrideDate) {
  const legs = Array.isArray(p.legs) && p.legs.length
    ? p.legs.filter(Boolean)
    : [{ origin: p.origin, destination: p.destination, date: p.date }];
  const req = Math.min(Math.max(0, Number(p.requestedLeg) || 0), legs.length - 1);
  const itineraries = legs.map((l, idx) => ({
    origin: String(l.origin || "").toUpperCase(),
    destination: String(l.destination || "").toUpperCase(),
    departureDate: idx === req && overrideDate ? overrideDate : l.date,
    isRequested: idx === req,
  }));
  const body = {
    channel: "WEB_DESKTOP",
    itineraries,
    cabinClass: CABIN_MAP[String(p.cabinClass || "E").toUpperCase()] || "ECONOMY",
    ignoreInvalidPromoCode: true,
    passengers: buildPassengers(p.adults, p.children, p.infants),
    currencyCode: "QAR",
  };
  if (req > 0 && p.selectedOutboundFareOfferId) body.selectedOutboundFareOfferId = p.selectedOutboundFareOfferId;
  return { body, legs, req };
}

// ---------------------------------------------------------------- normalisation
function fmt(template, params) {
  if (!template) return "";
  let out = String(template);
  // Simple positional placeholders first ({1} may appear inside plural branches).
  out = out.replace(/\{(\d+)\}/g, (m, idx) => (params[Number(idx)] != null ? String(params[Number(idx)]) : ""));
  // ICU plural: {0, plural, one {...} other {...}}
  out = out.replace(/\{(\d+),\s*plural,\s*((?:[^{}]|\{[^{}]*\})*)\}/g, (m, idx, body) => {
    const n = Number(params[Number(idx)]);
    const forms = {};
    body.replace(/(\w+)\s*\{([^{}]*)\}/g, (mm, k, v) => {
      forms[k] = v;
      return mm;
    });
    const form = n === 1 && forms.one != null ? forms.one : forms.other != null ? forms.other : Object.values(forms)[0] || "";
    return form.replace(/#/g, String(params[Number(idx)]));
  });
  return out.trim();
}

function shortFeature(f, ar) {
  const key = String(f.localizationKey || "");
  const p = f.parameters || [];
  const fee = ar ? "مقابل رسوم" : "For a fee";
  const free = ar ? "بدون رسوم" : "No fees";
  switch (f.type) {
    case "STANDARD_SEAT":
    case "PREFERRED_SEAT":
    case "SEAT_SELECTION":
      return key.includes("FREE_OF_CHARGE") ? free : fee;
    case "LOUNGE_ACCESS":
      return key.includes("FREE_OF_CHARGE") ? (ar ? "مشمول" : "Included") : fee;
    case "CHECKIN_BAGGAGE":
      if (key.includes("PIECE")) {
        const n = Number(p[0]) || 1;
        return ar ? `${n} ${n === 1 ? "قطعة" : "قطع"}، ${p[1]} كغ` : `${n} piece${n === 1 ? "" : "s"}, ${p[1]}kg`;
      }
      return ar ? `${p[0]} كغ` : `${p[0]}kg`;
    case "HAND_BAGGAGE": {
      const n = Number(p[0]) || 1;
      return ar ? `${n} ${n === 1 ? "قطعة" : "قطع"}، ${p[1]} كغ` : `${n} piece${n === 1 ? "" : "s"}, ${p[1]}kg`;
    }
    case "CHANGE_PENALTY":
      if (key.includes("FREE_OF_CHARGE")) return ar ? "غير محدود" : "Unlimited";
      if (key.includes("FREE_WITH_CONDITIONS")) {
        const n = Number(p[0]) || 1;
        return ar ? (n === 1 ? "تغيير واحد" : `${n} تغييرات`) : `${n} change${n === 1 ? "" : "s"}`;
      }
      return fee;
    case "REFUND_PAYMENT":
      return key.includes("FREE_OF_CHARGE")
        ? ar ? "في أي وقت" : "Any time"
        : ar ? "خلال 24 ساعة من الحجز" : "Within 24 hours of booking";
    case "UPGRADE_WITH_QMILES":
      return key.includes("ELIGIBLE") ? (ar ? "متاح" : "Available") : ar ? "غير متاح" : "Not available";
    default:
      return "";
  }
}

function buildPlaces(dict) {
  const loc = (dict && dict.localization) || {};
  const places = {};
  for (const [k, v] of Object.entries(loc)) {
    const m = /^(city|station)\.([A-Z]{3})$/.exec(k);
    if (!m) continue;
    places[m[2]] = places[m[2]] || {};
    if (m[1] === "city") places[m[2]].city = v;
    else places[m[2]].airport = v;
  }
  return places;
}

function normalizeOffer(offer, dict, ar) {
  const loc = (dict && dict.localization) || {};
  const rawSegs = offer.segments || [];
  const segments = rawSegs.map((s, i) => {
    const next = rawSegs[i + 1];
    let connectionMinutes = null;
    if (next && s.arrival && next.departure) {
      connectionMinutes = Math.max(
        0,
        Math.round((new Date(next.departure.dateTime).getTime() - new Date(s.arrival.dateTime).getTime()) / 60000)
      );
    }
    return {
      flightNumber: s.flightNumber,
      aircraft: s.vehicle ? s.vehicle.name || s.vehicle.shortName || "" : "",
      origin: s.departure && s.departure.origin ? s.departure.origin.iataCode : null,
      destination: s.arrival && s.arrival.destination ? s.arrival.destination.iataCode : null,
      departureTime: s.departure ? s.departure.dateTime : null,
      arrivalTime: s.arrival ? s.arrival.dateTime : null,
      durationMinutes: s.duration ? Math.round(s.duration / 60) : 0,
      carrier: s.operatorLogo ? s.operatorLogo.operatorCode : "QR",
      carrierName: s.operatingAirlineName || "Qatar Airways",
      qsuite: !!s.qSuiteEquipped,
      connectionMinutes,
      daysDifference: s.arrival && typeof s.arrival.daysDifference === "number" ? s.arrival.daysDifference : 0,
    };
  });

  const features = [];
  if (rawSegs.some((s) => s.qSuiteEquipped)) features.push("QSUITE");
  if (rawSegs.some((s) => (s.flightFeatures || []).some((f) => f.type === "STARLINK"))) features.push("STARLINK");

  const cabins = {};
  const fareFamilies = [];
  for (const f of offer.fareOffers || []) {
    const code = f.fareFamilyCode || "";
    let group = f.cabinType || "ECONOMY";
    if (!/^(ECONOMY|BUSINESS|FIRST)$/.test(group)) {
      group = /^FIRST/i.test(code) ? "FIRST" : /BUSINESS|PREMIUM/i.test(code) ? "BUSINESS" : "ECONOMY";
    }
    const total = f.price ? Number(f.price.total) : null;
    if (total == null || Number.isNaN(total)) continue;
    const base = f.price && f.price.base != null ? Number(f.price.base) : null;
    const disc = f.appliedDiscount || null;
    const originalTotal =
      (disc && (disc.originalTotalPrice || (disc.originalPrice && disc.originalPrice.total))) ||
      (f.originalPrice && f.originalPrice.total) ||
      null;

    const ffFeatures = [];
    let avios = null;
    let aviosText = "";
    for (const ft of f.fareFamilyFeatures || []) {
      const long = fmt(loc[ft.localizationKey], ft.parameters || []);
      if (ft.type === "EARNED_MILES") {
        avios = ft.parameters && ft.parameters[0] ? String(ft.parameters[0]) : null;
        aviosText = long || (avios ? (ar ? `اكسب ${avios} نقطة أفيوس` : `Earn ${avios} Avios`) : "");
        continue;
      }
      ffFeatures.push({ type: ft.type, short: shortFeature(ft, ar) || long, long: long || shortFeature(ft, ar) });
      if (ft.type === "SEAT_SELECTION") {
        ffFeatures.push({ type: "STANDARD_SEAT", short: shortFeature(ft, ar), long });
      }
    }

    fareFamilies.push({
      code,
      name: loc[`fare_family.${code}`] || code.replace(/^(ECONOMY|BUSINESS|FIRST)_/, "").replace(/_/g, " "),
      cabinGroup: group,
      cabinType: group,
      cabin: group,
      total,
      base,
      originalTotal: originalTotal != null ? Number(originalTotal) : null,
      boundId: f.boundId || null,
      availableSeats: f.availableSeats || null,
      isLowestFare: !!f.isLowestFare,
      avios,
      aviosText,
      features: ffFeatures,
    });

    if (!cabins[group] || total < cabins[group].total) {
      cabins[group] = {
        total,
        base,
        currency: f.price ? f.price.currencyCode : "QAR",
        fareFamily: code,
        boundId: f.boundId || null,
        availableSeats: f.availableSeats || null,
        isLowestFare: !!f.isLowestFare,
        appliedDiscount: originalTotal != null ? { originalTotalPrice: Number(originalTotal) } : undefined,
      };
    }
  }

  const via = [];
  for (let i = 0; i < segments.length - 1; i += 1) if (segments[i].destination) via.push(segments[i].destination);

  return {
    origin: offer.origin ? offer.origin.iataCode : null,
    destination: offer.destination ? offer.destination.iataCode : null,
    durationMinutes: offer.duration ? Math.round(offer.duration / 60) : 0,
    stops: typeof offer.numberOfStops === "number" ? offer.numberOfStops : Math.max(0, segments.length - 1),
    arrivalDaysDifference: offer.arrivalDaysDifference || 0,
    departureTime: segments.length ? segments[0].departureTime : null,
    arrivalTime: segments.length ? segments[segments.length - 1].arrivalTime : null,
    via,
    segments,
    cabins,
    carriers: [...new Set(segments.map((s) => s.carrier).filter(Boolean))],
    features,
    tags: offer.tags || [],
    fareFamilies,
  };
}

// ---------------------------------------------------------------- calendar
async function fetchCalendarRaw(payload, anchorDate, flexibility, lang) {
  const { body } = buildQrBody(payload, anchorDate);
  body.flexibility = Math.max(1, Math.min(15, Math.round(Number(flexibility) || 3)));
  let r = await serverPost(CALENDAR_PATH, body, lang);
  if (r.status === 403 || r.status === 0) r = await browserPost(CALENDAR_PATH, body, lang, 12000);
  if (r.status === 204) return { faresFromCalendar: [], moreDates: [] };
  if (r.status !== 200) throw new Error(`calendar_${r.status}`);
  return JSON.parse(r.text);
}

function calendarFromRaw(raw) {
  const prices = {};
  const known = [];
  let currency = null;
  for (const j of [...(raw.faresFromCalendar || []), ...(raw.moreDates || [])]) {
    if (!j || !j.date) continue;
    if (!known.includes(j.date)) known.push(j.date);
    if (typeof j.lowestPrice === "number") prices[j.date] = j.lowestPrice;
    if (!currency && j.currencyCode) currency = j.currencyCode;
  }
  return { prices, known, currency: currency || "QAR", complete: true };
}

// ---------------------------------------------------------------- caches
const cache = new Map();
function cacheGet(k) {
  const v = cache.get(k);
  if (!v) return null;
  if (Date.now() > v.exp) {
    cache.delete(k);
    return null;
  }
  return v.val;
}
function cacheSet(k, val, ttlMs) {
  cache.set(k, { val, exp: Date.now() + ttlMs });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
}

// ---------------------------------------------------------------- routes
module.exports = function registerQrSearch(app) {
  const cors = (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  };
  const paths = (p) => [p, `/qr-api${p}`];

  app.options(paths("/api/search"), cors);
  app.options(paths("/api/calendar"), cors);
  app.options(paths("/api/calendar-range"), cors);

  app.post(paths("/api/search"), cors, async (req, res) => {
    const p = req.body || {};
    const lang = p.lang === "en" ? "en" : "ar";
    const ar = lang === "ar";
    try {
      const { body, legs, req: reqLeg } = buildQrBody(p);
      if (!body.itineraries.length || !body.itineraries[reqLeg].origin || !body.itineraries[reqLeg].departureDate) {
        return res.status(400).json({ error: "missing_legs", offers: [] });
      }
      const key = `s|${lang}|${JSON.stringify(body)}`;
      const hit = cacheGet(key);
      if (hit) return res.json(hit);

      const reqDate = body.itineraries[reqLeg].departureDate;
      const calendarP = fetchCalendarRaw(p, reqDate, 3, lang)
        .then(calendarFromRaw)
        .catch(() => null);

      const t0 = Date.now();
      const r = await browserPost(OFFERS_PATH, body, lang, 22000);
      const calendar = await calendarP;
      log(`search ${body.itineraries.map((i) => `${i.origin}-${i.destination}@${i.departureDate}${i.isRequested ? "*" : ""}`).join(",")} -> ${r.status} in ${Date.now() - t0}ms`);

      if (r.status === 204 || (r.status === 200 && !r.text)) {
        const out = { source: "qatarairways", offers: [], count: 0, noResults: true, currency: "QAR", places: {}, calendar };
        cacheSet(key, out, 3 * 60 * 1000);
        return res.json(out);
      }
      if (r.status !== 200) {
        return res.json({ error: "upstream_error", status: r.status, offers: [], calendar });
      }
      let data;
      try {
        data = JSON.parse(r.text);
      } catch (e) {
        return res.json({ error: "upstream_error", status: 502, offers: [], calendar });
      }
      const offers = (data.flightOffers || []).map((o) => normalizeOffer(o, data.dictionaries, ar));
      const out = {
        source: "qatarairways",
        requestedAt: new Date().toISOString(),
        currency: "QAR",
        count: offers.length,
        noResults: offers.length === 0,
        offers,
        places: buildPlaces(data.dictionaries),
        alertMessages: data.alertMessages || [],
        calendar,
      };
      cacheSet(key, out, 4 * 60 * 1000);
      return res.json(out);
    } catch (e) {
      log("search error:", e && e.message);
      return res.json({ error: "upstream_error", message: String(e && e.message), offers: [] });
    }
  });

  app.post(paths("/api/calendar"), cors, async (req, res) => {
    const p = req.body || {};
    const lang = p.lang === "en" ? "en" : "ar";
    try {
      const legs = Array.isArray(p.legs) && p.legs.length ? p.legs : [{ origin: p.origin, destination: p.destination, date: p.date }];
      const reqLeg = Math.min(Math.max(0, Number(p.requestedLeg) || 0), legs.length - 1);
      const anchor = p.anchorDate || (legs[reqLeg] && legs[reqLeg].date);
      const flex = Math.max(1, Math.min(15, Number(p.flexibility) || 3));
      const key = `c|${JSON.stringify([legs, reqLeg, p.selectedOutboundFareOfferId || null, anchor, flex, p.cabinClass, p.adults, p.children, p.infants])}`;
      const hit = cacheGet(key);
      if (hit) return res.json(hit);
      const raw = await fetchCalendarRaw(p, anchor, flex, lang);
      const all = [...(raw.faresFromCalendar || []), ...(raw.moreDates || [])];
      const currency = (all.find((j) => j && j.currencyCode) || {}).currencyCode || "QAR";
      const out = { faresFromCalendar: raw.faresFromCalendar || [], moreDates: raw.moreDates || [], currency };
      cacheSet(key, out, 10 * 60 * 1000);
      return res.json(out);
    } catch (e) {
      return res.json({ error: "upstream_error", message: String(e && e.message), faresFromCalendar: [], moreDates: [] });
    }
  });

  app.post(paths("/api/calendar-range"), cors, async (req, res) => {
    const p = req.body || {};
    const lang = p.lang === "en" ? "en" : "ar";
    try {
      const legs = Array.isArray(p.legs) && p.legs.length ? p.legs : [{ origin: p.origin, destination: p.destination, date: p.date }];
      const reqLeg = Math.min(Math.max(0, Number(p.requestedLeg) || 0), legs.length - 1);
      const raw = await fetchCalendarRaw(p, legs[reqLeg] && legs[reqLeg].date, 7, lang);
      return res.json({ calendar: calendarFromRaw(raw) });
    } catch (e) {
      return res.json({ error: "upstream_error", message: String(e && e.message) });
    }
  });

  app.get("/api/qr-status", cors, (req, res) => {
    res.json({
      browserAvailable: !!getPw(),
      browserReady: !!(B.page && !B.page.isClosed()),
      warming: !!B.warming,
      readyForSec: B.readyAt ? Math.round((Date.now() - B.readyAt) / 1000) : null,
      ok: B.okCount,
      failed: B.failCount,
      lastOkSecAgo: B.lastOkAt ? Math.round((Date.now() - B.lastOkAt) / 1000) : null,
      lastError: B.lastError,
      cacheSize: cache.size,
    });
  });

  // Warm the browser shortly after boot and keep it fresh, so user searches are fast.
  if (process.env.QR_BROWSER_DISABLED !== "1" && getPw()) {
    setTimeout(() => {
      serial(() => ensurePage()).catch(() => {});
    }, 8000);
    setInterval(() => {
      if (!B.warming && (!B.page || Date.now() - B.readyAt > 20 * 60 * 1000)) {
        serial(() => ensurePage()).catch(() => {});
      }
    }, 5 * 60 * 1000).unref();
  }
};

module.exports._internals = { normalizeOffer, buildQrBody, calendarFromRaw, fmt, browserPost, fetchCalendarRaw, OFFERS_PATH };
