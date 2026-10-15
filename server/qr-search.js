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
B.spares = []; // warmed, validated contexts ready to take over
B.chromes = []; // every Chrome launched and not yet closed


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

// ---------------------------------------------------------------- process health
// The container has a process (pid) limit. If Chrome cannot even start (EAGAIN) the
// container is exhausted; restart it instead of staying broken (Railway restarts on exit).
function procStats() {
  const fs = require("fs");
  const out = { total: 0, zombies: 0, chrome: 0, pidsMax: null, pidsCurrent: null, pid1: null };
  try {
    out.pid1 = fs.readFileSync("/proc/1/cmdline", "utf8").split("\0").join(" ").trim().slice(0, 120);
  } catch (e) {}
  try {
    for (const d of fs.readdirSync("/proc")) {
      if (!/^\d+$/.test(d)) continue;
      try {
        const st = fs.readFileSync("/proc/" + d + "/stat", "utf8");
        const name = st.slice(st.indexOf("(") + 1, st.lastIndexOf(")"));
        const state = st.slice(st.lastIndexOf(")") + 2, st.lastIndexOf(")") + 3);
        out.total += 1;
        if (state === "Z") out.zombies += 1;
        if (/chrome/i.test(name)) out.chrome += 1;
      } catch (e) {}
    }
  } catch (e) {}
  for (const [k, f] of [["pidsMax", "/sys/fs/cgroup/pids.max"], ["pidsCurrent", "/sys/fs/cgroup/pids.current"], ["pidsMax", "/sys/fs/cgroup/pids/pids.max"], ["pidsCurrent", "/sys/fs/cgroup/pids/pids.current"]]) {
    if (out[k] != null) continue;
    try {
      out[k] = fs.readFileSync(f, "utf8").trim();
    } catch (e) {}
  }
  return out;
}

// pids budget (cgroup pids.max counts Chrome threads, ~240 per Chrome)
function headroomFor(n) {
  const st = procStats();
  B.proc = st;
  const max = Number(st.pidsMax), cur = Number(st.pidsCurrent);
  if (!(max > 0) || !(cur >= 0)) return true;
  return cur + n < max * 0.88;
}

function restartContainer(why) {
  log("RESTARTING PROCESS:", why, JSON.stringify(procStats()));
  setTimeout(() => process.exit(1), 500);
}

async function launchGuard(fn) {
  try {
    return await fn();
  } catch (e) {
    const msg = String((e && e.message) || e);
    B.launchFails = (B.launchFails || 0) + 1;
    if (/Resource temporarily unavailable|EAGAIN|posix_spawn|Cannot allocate memory|ENOMEM/i.test(msg) || B.launchFails >= 3) {
      restartContainer("chrome launch failed x" + B.launchFails + ": " + msg.slice(0, 160));
    }
    throw e;
  }
}

// Watchdog: no successful search for a long time while searches keep failing -> restart.
setInterval(() => {
  const st = procStats();
  B.proc = st;
  const max = Number(st.pidsMax);
  if (max > 0 && Number(st.pidsCurrent) > max * 0.85) log("WARN pids near limit", st.pidsCurrent + "/" + max, "chrome", st.chrome, "zombies", st.zombies);
  if (max > 0 && Number(st.pidsCurrent) > max * 0.8 && B.spares.length) {
    // make room for package sessions: drop a spare context
    const sp = B.spares.pop();
    log("dropping a spare context (pids " + st.pidsCurrent + "/" + max + ")");
    sp.context.close().catch(() => {});
  }
  if (st.zombies > 300) restartContainer("too many zombies " + st.zombies);
}, 60000).unref();

async function closeChrome(br) {
  if (!br) return;
  B.chromes = B.chromes.filter((c) => c.browser !== br);
  if (B.chrome === br) B.chrome = null;
  try {
    await br.close();
  } catch (e) {}
}

// Close Chromes nothing uses anymore (e.g. the previous one after an age rotation).
function reapChromes() {
  const inUse = new Set([B.browser, B.chrome, ...B.spares.map((x) => x.browser)].filter(Boolean));
  for (const c of B.chromes.slice()) {
    if (!inUse.has(c.browser)) {
      log("closing unused chrome");
      closeChrome(c.browser);
    }
  }
}

// Full reset (hard failures only).
async function closeBrowser() {
  const all = B.chromes.map((c) => c.browser);
  B.browser = null;
  B.context = null;
  B.page = null;
  B.readyAt = 0;
  B.spares = [];
  B.chrome = null;
  B.chromes = [];
  for (const b of all) {
    try {
      await b.close();
    } catch (e) {}
  }
}

// Drop only the primary context; spares in the same Chrome keep working.
async function dropPrimary() {
  const c = B.context;
  B.context = null;
  B.page = null;
  B.readyAt = 0;
  if (c) {
    try {
      await c.close();
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

// One Chrome hosting a small pool of independently warmed contexts (each has its own cookies,
// i.e. its own Akamai session, ~80 threads vs ~240 for a whole Chrome). The primary context
// serves requests; validated spare contexts take over instantly on 403s or age, so users
// almost never wait for a ~35 s warm-up.
const SPARES = Math.max(0, Number(process.env.QR_SPARES || 2));
const CHROME_MAX_AGE = 3 * 60 * 60 * 1000;
const SPARE_MAX_AGE = 3 * 60 * 60 * 1000; // kept fresh by refreshCtx; new sessions are hard to get
const CTX_REFRESH_MS = 12 * 60 * 1000;
const NEW_CTX_GAP_MS = 90 * 1000; // QR rejects brand-new sessions opened in quick succession
// After consecutive rejected new sessions, wait longer before opening another (IP cool-down).
function newCtxGap() {
  const r = B.newRejects || 0;
  return [NEW_CTX_GAP_MS, 3, 6, 12, 15][Math.min(4, r)] * (r ? 60 * 1000 : 1);
}
function newCtxAllowed() {
  return Date.now() >= (B.lastNewCtxAt || 0) + newCtxGap();
}

async function launchChrome() {
  const pw = getPw();
  if (!pw) throw new Error("browser_unavailable");
  await ensureDisplay();
  const proxy = process.env.QR_PROXY_SERVER
    ? { server: process.env.QR_PROXY_SERVER, username: process.env.QR_PROXY_USER || undefined, password: process.env.QR_PROXY_PASS || undefined }
    : undefined;
  const browser = await launchGuard(() => pw.chromium.launch({
    headless: process.env.QR_HEADLESS === "1",
    proxy,
    channel: process.env.QR_CHROME_CHANNEL || "chrome",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1366,900",
      // real browsers always expose WebGL; without a GPU use Chrome's software renderer
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
    ],
  }));
  B.launchFails = 0;
  B.chromes.push({ browser, at: Date.now() });
  browser.on("disconnected", () => {
    B.chromes = B.chromes.filter((c) => c.browser !== browser);
    if (B.chrome === browser) B.chrome = null;
    if (B.browser === browser) {
      B.browser = null;
      B.context = null;
      B.page = null;
      B.readyAt = 0;
    }
    B.spares = B.spares.filter((x) => x.browser !== browser);
  });
  B.chrome = browser;
  B.chromeAt = Date.now();
  B.chromeLaunches = (B.chromeLaunches || 0) + 1;
  log("chrome launched");
  return browser;
}

function getChrome() {
  if (B.chrome && B.chrome.isConnected() && Date.now() - B.chromeAt < CHROME_MAX_AGE) return Promise.resolve(B.chrome);
  if (!B.chromeLaunching) {
    B.chromeLaunching = launchChrome().finally(() => {
      B.chromeLaunching = null;
    });
  }
  return B.chromeLaunching;
}

async function warmCtx() {
  const browser = await getChrome();
  const t0 = Date.now();
  B.lastNewCtxAt = t0;
  const w = await warmPage(browser);
  w.valid = await validateWarmed(w);
  w.readyAt = Date.now();
  log(`context warmed in ${Date.now() - t0}ms valid=${w.valid}`);
  B.newRejects = w.valid ? 0 : (B.newRejects || 0) + 1;
  B.warmLog = (B.warmLog || []).concat([{ at: new Date().toISOString().slice(11, 19), ms: Date.now() - t0, valid: w.valid, id: w.id, spa: w.spa.slice(0, 4), vst: w.vst || [] }]).slice(-12);
  return w;
}

// Judge a warmed session mostly by the official page's own flight-offers call (no extra
// protected requests: every rejected call raises the IP's bot score). At most one own call.
async function validateWarmed(w) {
  if (process.env.QR_NO_VALIDATE === "1") return true;
  const spa = w.spa || [];
  if (spa.length && !spa.includes(200)) return false; // the official app itself was rejected
  const d = todayPlus(20 + Math.floor(Math.random() * 10));
  const { body } = buildQrBody({ legs: [{ origin: "DOH", destination: "LHR", date: d }], adults: 1, children: 0, infants: 0, cabinClass: "E" });
  await wiggle(w.page, 2);
  let r;
  try {
    w.own = true;
    r = await w.page.evaluate(PAGE_FETCH, { url: BASE + OFFERS_PATH, body, lang: "en", apiKey: FS_API_KEY });
  } catch (e) {
    return false;
  } finally {
    w.own = false;
  }
  w.uses = (w.uses || 0) + 1;
  w.lastUse = Date.now();
  w.vst = [r.status];
  return !!(r.status && r.status !== 403);
}

function install(w, keepPrev) {
  const prevCtx = keepPrev ? null : B.context;
  B.cur = w;
  B.browser = w.browser;
  B.context = w.context;
  B.page = w.page;
  B.readyAt = w.readyAt;
  B.fails = w.valid === false ? 2 : 0; // unproven session: swap to a proven spare asap
  if (prevCtx && prevCtx !== w.context) {
    // let any in-flight request on the old context finish, then free it
    setTimeout(() => {
      prevCtx.close().catch(() => {});
      reapChromes();
    }, 10000).unref();
  } else reapChromes();
}

function pruneSpares() {
  const now = Date.now();
  B.spares = B.spares.filter((x) => {
    const ok = x.page && !x.page.isClosed() && x.browser.isConnected() && now - x.readyAt < SPARE_MAX_AGE;
    if (!ok) x.context.close().catch(() => {});
    return ok;
  });
}

function spareOk() {
  pruneSpares();
  return B.spares.length > 0;
}

// Promote a ready spare to primary (instant). Returns true when swapped.
function promoteSpare(why) {
  if (!spareOk()) return false;
  const i = B.spares.findIndex((x) => !x.busy);
  if (i < 0) return false;
  const old = B.cur;
  install(B.spares.splice(i, 1)[0], true);
  B.swaps = (B.swaps || 0) + 1;
  log("swapped to spare context:", why, "spares left", B.spares.length);
  if (old && old.page && !old.page.isClosed()) reviveLater(old);
  fillSpares();
  return true;
}

// Re-run the official page inside an existing context: refreshes the bot sensor and shows
// whether the session is still accepted, without opening a brand-new session.
async function refreshCtx(w, why) {
  if (!w || !w.page || w.page.isClosed()) return false;
  const n0 = w.spa.length;
  const t0 = Date.now();
  try {
    await w.page.goto(warmUrl(), { waitUntil: "domcontentloaded", timeout: 30000 });
    // wait for the official app's own search call (fresh sensor + acceptance signal), max 6 s
    for (let i = 0; i < 30 && w.spa.length === n0; i += 1) await w.page.waitForTimeout(200);
    await wiggle(w.page, 2);
  } catch (e) {
    return false;
  }
  w.refreshMs = Date.now() - t0;
  const got = w.spa.slice(n0);
  const ok = got.length ? got.includes(200) : true;
  w.refreshedAt = Date.now();
  B.refreshLog = (B.refreshLog || []).concat([{ at: new Date().toISOString().slice(11, 19), id: w.id, why, spa: got, ok, ms: w.refreshMs }]).slice(-12);
  return ok;
}

// A context that just got a 403: give it a minute, refresh it, keep it as a spare if accepted.
function reviveLater(w) {
  w.busy = true;
  setTimeout(async () => {
    let ok = false;
    try {
      ok = await refreshCtx(w, "revive");
    } catch (e) {}
    w.busy = false;
    if (ok && B.spares.length < SPARES + 1 && w.browser.isConnected()) {
      w.readyAt = Date.now();
      B.spares.push(w);
      log("revived context", w.id, "as spare");
    } else {
      w.context.close().catch(() => {});
      reapChromes();
    }
  }, 45000).unref();
}

function fillSpares() {
  if (B.spareWarming || SPARES <= 0 || process.env.QR_NO_SPARE === "1") return B.spareWarming;
  if (Date.now() < (B.spareBackoffUntil || 0)) return null; // QR is rejecting new sessions: cool down
  B.spareWarming = (async () => {
    await sleep(3000);
    for (let tries = 0; tries < 2 * SPARES + 2; tries += 1) {
      pruneSpares();
      if (B.spares.length >= SPARES) return;
      const gap = (B.lastNewCtxAt || 0) + newCtxGap() - Date.now();
      if (gap > 0) await sleep(gap);
      pruneSpares();
      if (B.spares.length >= SPARES) return;
      if (!headroomFor(150)) throw new Error("no_pids_headroom");
      const c = await warmCtx();
      if (c.valid) {
        B.spares.push(c);
        B.rejectRun = 0;
        B.backoffN = 0;
      } else {
        B.rejectRun = (B.rejectRun || 0) + 1;
        log("spare not accepted, retrying (run " + B.rejectRun + ")");
        c.context.close().catch(() => {});
        if (B.rejectRun >= 2) {
          // stop adding load while the IP is being challenged; back off progressively
          const mins = [4, 8, 15, 20][Math.min(3, B.backoffN || 0)];
          B.backoffN = (B.backoffN || 0) + 1;
          B.rejectRun = 0;
          B.spareBackoffUntil = Date.now() + mins * 60 * 1000;
          throw new Error("rejected twice, cooling down " + mins + " min");
        }
      }
    }
  })()
    .catch((e) => log("spare warm failed:", String((e && e.message) || e)))
    .finally(() => {
      B.spareWarming = null;
      reapChromes();
    });
  return B.spareWarming;
}
const startSpare = fillSpares;

async function warm() {
  try {
    install(await warmCtx());
    B.warmFails = 0;
  } catch (e) {
    B.warmFails = (B.warmFails || 0) + 1;
    throw e;
  }
  fillSpares();
}

function startWarm() {
  if (!B.warming && B.page && !B.page.isClosed() && !newCtxAllowed()) return Promise.resolve(); // cooling down
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
    B.warming.catch(() => {});
  }
  return B.warming;
}

// Look like an ordinary desktop: screen larger than the window, local timezone of the egress IP.
function ctxOptions() {
  const o = { locale: "en-US", viewport: { width: 1366, height: 800 }, screen: { width: 1920, height: 1080 } };
  if (B.tz) o.timezoneId = B.tz;
  return o;
}
async function detectTimezone() {
  if (B.tz || B.tzTried) return;
  B.tzTried = true;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch("http://ip-api.com/json/?fields=status,timezone,countryCode,city", { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json();
    if (j && j.status === "success" && j.timezone) {
      B.tz = j.timezone;
      B.geo = `${j.city || ""},${j.countryCode || ""}`;
      log("egress timezone", B.tz, B.geo);
    }
  } catch (e) {}
}

async function warmPage(browser) {
  await detectTimezone();
  const context = await browser.newContext(ctxOptions());
  try {
    // Save memory/bandwidth: skip images & media (not used by the bot sensor).
    await context.route("**/*", (route) => {
      const t = route.request().resourceType();
      if (t === "image" || t === "media") return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const w = { browser, context, page, readyAt: 0, id: (B.ctxSeq = (B.ctxSeq || 0) + 1), uses: 0, lastUse: 0, spa: [] };
    page.on("response", (r) => {
      try {
        if (r.url().includes(OFFERS_PATH) && r.request().method() === "POST" && !w.own) w.spa.push(r.status());
      } catch (e) {}
    });
    await page.goto(HOME_URL, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(4000);
    await wiggle(page, 5);
    await page.goto(warmUrl(), { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    await wiggle(page, 3);
    w.readyAt = Date.now();
    return w;
  } catch (e) {
    context.close().catch(() => {}); // never leak a half-warmed context
    throw e;
  }
}

async function ensurePage() {
  const alive = B.page && !B.page.isClosed();
  const old = false; // never rotate a working session just for age (new sessions get rejected)
  if (alive && (B.fails >= 2 || old) && promoteSpare(B.fails >= 2 ? "blocked x" + B.fails : "aged")) return B.page;
  if (alive && B.fails < 8) {
    // no spare ready: refresh in the background while the current page keeps serving
    if (old || B.fails >= 3) startWarm();
    return B.page;
  }
  if (!alive && promoteSpare("primary gone")) return B.page;
  await startWarm();
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
    let refreshed = false;
    for (let attempt = 0; attempt < 10 && Date.now() < until; attempt += 1) {
      let page;
      try {
        page = await ensurePage();
      } catch (e) {
        last = { status: 0, text: "", error: String(e) };
        if ((B.warmFails || 0) >= 2) await closeBrowser(); // Chrome itself looks broken
        else await dropPrimary();
        await sleep(500);
        continue;
      }
      let r;
      const w = B.cur && B.cur.page === page ? B.cur : null;
      const tf = Date.now();
      try {
        if (w) w.own = true;
        r = await page.evaluate(PAGE_FETCH, { url: BASE + path, body, lang, apiKey: FS_API_KEY });
      } catch (e) {
        r = { status: 0, text: "", error: String(e) };
        if (page === B.page) await dropPrimary();
      } finally {
        if (w) w.own = false;
      }
      B.reqLog = (B.reqLog || []).concat([{
        at: new Date().toISOString().slice(11, 19),
        p: path === OFFERS_PATH ? "offers" : "cal",
        st: r.status,
        ms: Date.now() - tf,
        ctx: w ? w.id : null,
        n: w ? w.uses : null,
        age: w ? Math.round((tf - w.readyAt) / 1000) : null,
        idle: w && w.lastUse ? Math.round((tf - w.lastUse) / 1000) : null,
      }]).slice(-40);
      if (w) {
        w.uses += 1;
        w.lastUse = Date.now();
      }
      if (process.env.QR_TEST_FAIL_N && (B.testFails || 0) < Number(process.env.QR_TEST_FAIL_N)) {
        B.testFails = (B.testFails || 0) + 1; // test hook only: simulate an Akamai 403
        r = { status: 403, text: "" };
      }
      last = r;
      if (r.status === 200 || r.status === 204 || (r.status >= 400 && r.status < 500 && r.status !== 403)) {
        B.fails = 0;
        B.okCount += 1;
        B.lastOkAt = Date.now();
        if (w && path === OFFERS_PATH && process.env.QR_POST_REFRESH !== "0") {
          // QR often rejects a second call on the same sensor data; re-arm the session while
          // the visitor is reading the results, so their next search goes straight through.
          setTimeout(() => {
            if (B.cur === w) serial(() => (B.cur === w ? refreshCtx(w, "post") : null)).catch(() => {});
          }, 50);
        }
        return r;
      }
      B.fails += 1;
      B.failCount += 1;
      if (promoteSpare("blocked x" + B.fails)) continue; // instant fresh session, no extra wait
      if (!refreshed && B.cur && B.cur.page === B.page) {
        refreshed = true; // no spare: refresh this session's sensor once and retry (~6 s)
        await refreshCtx(B.cur, "403");
        continue;
      }
      if (B.page) {
        await wiggle(B.page, 3);
        await sleep(900 + attempt * 300);
      }
      if (refreshed && !spareOk() && !B.warming && !newCtxAllowed()) break; // blocked, cooling down: fail fast
      if (B.fails >= 3) startWarm(); // fresh profile in the background
      if (B.warming && B.fails >= 5) {
        // blocked repeatedly: wait for the fresh browser (within this request's deadline)
        await Promise.race([B.warming.catch(() => {}), sleep(Math.max(0, until - Date.now() - 6000))]);
      }
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


// ---------------------------------------------------------------- lab (diagnostics, key-protected)
// Measures how long a fresh session stays accepted under different refresh strategies.
const LAB_HASH = "ccc730b25af3508fdc7b412c456360c984ead2eff4e8e96e6339771fb0b6d4ed";
let labBusy = false;
let labResult = null;
async function labFingerprint() {
  const browser = await getChrome();
  await detectTimezone();
  const context = await browser.newContext(ctxOptions());
  try {
    const page = await context.newPage();
    await page.goto("https://example.com/");
    return await page.evaluate(() => {
      const o = {};
      const n = navigator;
      Object.assign(o, { ua: n.userAgent, webdriver: n.webdriver, hc: n.hardwareConcurrency, mem: n.deviceMemory, langs: n.languages, platform: n.platform, plugins: n.plugins.length, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, screen: [screen.width, screen.height, screen.availWidth, screen.availHeight, screen.colorDepth, devicePixelRatio], outer: [outerWidth, outerHeight, innerWidth, innerHeight] });
      try {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
        o.webgl = gl ? [gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR), gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)] : null;
      } catch (e) { o.webgl = "err " + e; }
      const fonts = ["Arial", "Times New Roman", "Courier New", "Verdana", "Helvetica", "Georgia", "Segoe UI", "Roboto", "Liberation Sans", "DejaVu Sans", "Noto Sans"];
      o.fonts = fonts.filter((f) => document.fonts.check("12px '" + f + "'"));
      o.uaData = n.userAgentData ? { brands: n.userAgentData.brands.map((b) => b.brand + " " + b.version), mobile: n.userAgentData.mobile, platform: n.userAgentData.platform } : null;
      o.conn = n.connection ? { type: n.connection.effectiveType, rtt: n.connection.rtt } : null;
      o.mem = n.deviceMemory;
      return o;
    }).then((o) => Object.assign(o, { geo: B.geo, tzSet: B.tz }));
  } finally {
    context.close().catch(() => {});
  }
}
async function labRun(mode, n, gapMs) {
  const browser = await getChrome();
  const w = await warmPage(browser);
  const out = { mode, warmSpa: w.spa.slice(), steps: [] };
  let sensor = 0;
  w.page.on("request", (q) => {
    try {
      if (q.method() === "POST" && /sensor_data/.test(q.postData() || "")) sensor += 1;
    } catch (e) {}
  });
  const dests = ["LHR", "IST", "AMM", "CAI", "JED", "BKK", "KUL", "CDG", "FRA", "MCT", "BEY", "RUH"];
  try {
    for (let k = 0; k < n; k += 1) {
      const s0 = sensor;
      const t0 = Date.now();
      const spa0 = w.spa.length;
      try {
        if (mode === "wiggle") await wiggle(w.page, 3);
        if (mode === "reload") {
          await w.page.goto(warmUrl(), { waitUntil: "domcontentloaded", timeout: 45000 });
          await w.page.waitForTimeout(3000);
          await wiggle(w.page, 3);
        }
        if (mode === "home") {
          await w.page.goto(HOME_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
          await w.page.waitForTimeout(3000);
          await wiggle(w.page, 3);
        }
      } catch (e) {}
      const { body } = buildQrBody({ legs: [{ origin: "DOH", destination: dests[k % dests.length], date: todayPlus(15 + k) }], adults: 1, children: 0, infants: 0, cabinClass: "E" });
      const tf = Date.now();
      w.own = true;
      let r;
      try {
        r = await w.page.evaluate(PAGE_FETCH, { url: BASE + OFFERS_PATH, body, lang: "en", apiKey: FS_API_KEY });
      } catch (e) {
        r = { status: 0, error: String(e).slice(0, 80) };
      }
      w.own = false;
      let abck = "";
      try {
        abck = ((await w.context.cookies()).find((c) => c.name === "_abck") || {}).value || "";
      } catch (e) {}
      out.steps.push({ k, st: r.status, prep: tf - t0, ms: Date.now() - tf, sensor: sensor - s0, spa: w.spa.slice(spa0), abck: abck.split("~")[1] });
      await sleep(gapMs);
    }
  } finally {
    w.context.close().catch(() => {});
    reapChromes();
  }
  return out;
}
function registerLab(app, cors) {
  app.get("/api/qr-lab", cors, async (req, res) => {
    const k = String(req.query.k || "");
    if (require("crypto").createHash("sha256").update(k).digest("hex") !== LAB_HASH) return res.status(404).end();
    if (labBusy) return res.json({ error: "busy" });
    if (!headroomFor(150)) return res.json({ error: "no_headroom", proc: procStats() });
    if (req.query.get) return res.json({ busy: labBusy, result: labResult });
    labBusy = true;
    labResult = null;
    const mode = String(req.query.mode || "none");
    const n = Math.max(1, Math.min(8, Number(req.query.n) || 5));
    const gap = Math.max(0, Math.min(30000, Number(req.query.gap) || 2000));
    (mode === "fp" ? labFingerprint() : labRun(mode, n, gap))
      .then((r) => { labResult = r; })
      .catch((e) => { labResult = { error: String((e && e.message) || e) }; })
      .finally(() => { labBusy = false; });
    res.json({ started: mode });
  });
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
      const r = await browserPost(OFFERS_PATH, body, lang, 50000);
      // flights first: the page loads the date strip on its own, so don't hold results for it
      let calendar = await Promise.race([calendarP, sleep(600).then(() => undefined)]);
      const calLate = calendar === undefined;
      if (calLate) calendar = null;
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
      if (calLate) calendarP.then((c) => { if (c) out.calendar = c; }); // cached copy gets it later
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
      proc: procStats(),
      launchFails: B.launchFails || 0,
      warming: !!B.warming,
      readyForSec: B.readyAt ? Math.round((Date.now() - B.readyAt) / 1000) : null,
      ok: B.okCount,
      failed: B.failCount,
      lastOkSecAgo: B.lastOkAt ? Math.round((Date.now() - B.lastOkAt) / 1000) : null,
      lastError: B.lastError,
      cacheSize: cache.size,
      spareReady: !!spareOk(),
      spares: B.spares.length,
      spareBackoffSec: Math.max(0, Math.round(((B.spareBackoffUntil || 0) - Date.now()) / 1000)),
      newSessionInSec: Math.max(0, Math.round(((B.lastNewCtxAt || 0) + newCtxGap() - Date.now()) / 1000)),
      newRejects: B.newRejects || 0,
      primaryFails: B.fails,
      proxy: !!process.env.QR_PROXY_SERVER,
      spareAgeSec: B.spares[0] ? Math.round((Date.now() - B.spares[0].readyAt) / 1000) : null,
      chromes: B.chromes.length,
      spareWarming: !!B.spareWarming,
      swaps: B.swaps || 0,
      warmLog: B.warmLog || [],
      reqLog: B.reqLog || [],
      refreshLog: B.refreshLog || [],
      primary: B.cur ? { id: B.cur.id, uses: B.cur.uses, ageSec: Math.round((Date.now() - B.cur.readyAt) / 1000) } : null,
    });
  });
  registerLab(app, cors);

  // Warm the browser shortly after boot and keep it fresh, so user searches are fast.
  if (process.env.QR_BROWSER_DISABLED !== "1" && getPw()) {
    setTimeout(() => {
      serial(() => ensurePage()).catch(() => {});
    }, 8000);
    setInterval(() => {
      if (B.warming) return;
      const now = Date.now();
      const w = B.cur;
      if (B.page && w && w.page === B.page && now - Math.max(w.lastUse || 0, w.refreshedAt || 0, w.readyAt || 0) > CTX_REFRESH_MS) {
        // idle primary: refresh through the request queue (never in the middle of a search)
        serial(() => refreshCtx(w, "idle").then((ok) => {
          if (!ok) B.fails = Math.max(B.fails, 1);
        })).catch(() => {});
      }
      const sp = B.spares.find((x) => !x.busy && now - Math.max(x.refreshedAt || 0, x.readyAt || 0) > CTX_REFRESH_MS);
      if (sp) {
        sp.busy = true;
        refreshCtx(sp, "spare idle").then((ok) => {
          sp.busy = false;
          if (!ok) {
            B.spares = B.spares.filter((x) => x !== sp);
            sp.context.close().catch(() => {});
          }
        });
      }
      if (B.page && B.fails >= 2) promoteSpare("primary rejected");
      if (B.page && w && w.page === B.page && B.fails >= 2 && !w.busy && now - Math.max(w.refreshedAt || 0, w.readyAt || 0) > 3 * 60 * 1000) {
        serial(() => refreshCtx(w, "blocked").then((ok) => {
          if (ok) B.fails = 0; // the same session is accepted again
        })).catch(() => {});
      }
      if (!B.page) startWarm();
      else if (!spareOk()) startSpare();
    }, 30 * 1000).unref();
  }
};

module.exports._internals = { ensureDisplay, normalizeOffer, buildQrBody, calendarFromRaw, fmt, browserPost, fetchCalendarRaw, OFFERS_PATH, PAGE_FETCH, FS_API_KEY };
