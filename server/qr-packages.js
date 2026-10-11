"use strict";
// Qatar Airways Holidays packages API (stopover / flight + hotel / hotel).
//
// qatarairwaysholidays.com sits behind Cloudflare and its booking engine is a
// stateful, JS-driven flow. Each search therefore gets its own real Google Chrome
// context (patchright, headful under Xvfb) that drives the official page; the API
// returns fragments of the official markup in the shape expected by
// site/assets/package-*.js.

const crypto = require("crypto");

const HOL = "https://www.qatarairwaysholidays.com";
const MAX_SESSIONS = Number(process.env.QH_MAX_SESSIONS || 5);
const IDLE_MS = Number(process.env.QH_IDLE_MS || 30 * 60 * 1000);
const SEARCH_TIMEOUT_MS = 150000;
const log = (...a) => console.log("[qr-packages]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function ensureDisplay() {
  try {
    const qs = require("./qr-search");
    if (qs && qs._internals && qs._internals.ensureDisplay) await qs._internals.ensureDisplay();
  } catch (e) {}
}

// ---------------------------------------------------------------- browser
const BR = { browser: null, launching: null, launches: 0, lastError: null };

async function getBrowser() {
  if (BR.browser && BR.browser.isConnected()) return BR.browser;
  if (!BR.launching) {
    BR.launching = (async () => {
      const pw = getPw();
      if (!pw) throw new Error("browser_unavailable");
      await ensureDisplay();
      const browser = await pw.chromium.launch({
        headless: process.env.QR_HEADLESS === "1",
        channel: process.env.QR_CHROME_CHANNEL || "chrome",
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check", "--window-size=1366,900"],
      });
      browser.on("disconnected", () => {
        if (BR.browser === browser) BR.browser = null;
        for (const s of sessions.values()) if (s.browser === browser) dropSession(s.token, "browser_disconnected");
      });
      BR.browser = browser;
      BR.launches += 1;
      log("browser launched");
      return browser;
    })()
      .catch((e) => {
        BR.lastError = String((e && e.message) || e);
        throw e;
      })
      .finally(() => {
        BR.launching = null;
      });
  }
  return BR.launching;
}

const BLOCK_HOSTS = /(google-analytics|googletagmanager|doubleclick|facebook|hotjar|bing\.com|clarity\.ms|tiktok|snapchat|linkedin|twitter|cookielaw|onetrust|criteo|adnxs|taboola|outbrain|yahoo|pinterest|quantserve|demdex|omtrdc|newrelic|nr-data|sentry|trustarc|qualtrics)/i;

// ---------------------------------------------------------------- sessions
const sessions = new Map();

function newToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function dropSession(token, why) {
  const s = sessions.get(token);
  if (!s) return;
  sessions.delete(token);
  log("drop session", token.slice(0, 8), why || "");
  try {
    await s.ctx.close();
  } catch (e) {}
}

setInterval(() => {
  const now = Date.now();
  for (const s of sessions.values()) if (now - s.lastUsed > IDLE_MS) dropSession(s.token, "idle");
}, 60000).unref();

const HARD_MAX_SESSIONS = Number(process.env.QH_HARD_MAX_SESSIONS || MAX_SESSIONS + 3);
async function makeRoom() {
  while (sessions.size >= MAX_SESSIONS) {
    let oldest = null;
    for (const s of sessions.values()) if (!oldest || s.lastUsed < oldest.lastUsed) oldest = s;
    if (!oldest) break;
    // a visitor is still using every session: allow a few extra instead of breaking someone's booking
    if (Date.now() - oldest.lastUsed < 3 * 60 * 1000 && sessions.size < HARD_MAX_SESSIONS) break;
    await dropSession(oldest.token, "evicted");
  }
}
// last searches (route/dates/outcome only) for diagnosing "no results" reports
const recentSearches = [];
function noteSearch(s, params, outcome) {
  try {
    const g = (k) => {
      const f = params.find((x) => x[0] === k);
      return f ? String(f[1]) : "";
    };
    recentSearches.unshift({
      at: new Date().toISOString(),
      product: s.product,
      lang: s.lang,
      from: g("iataFrom"),
      to: g("iataTo"),
      out: g("outboundDate"),
      ret: g("returnDate") || (g("openjaw") ? "openjaw " + g("otherLegs[2][iataFrom]") + "-" + g("otherLegs[2][iataTo]") + " " + g("leg2_outboundDate") : g("oneway") === "1" ? "oneway" : ""),
      leg: g("stopover"),
      nights: g("stopover_nights"),
      cabin: g("classOfService"),
      pax: g("numPassengers") || g("numGuests[]"),
      hotel: g("destination") || g("hotelDestination") || "",
      outcome,
      ms: Date.now() - s.createdAt,
    });
    recentSearches.length = Math.min(recentSearches.length, 25);
  } catch (e) {}
}

function storefront(lang) {
  return lang === "en" ? "qa-en" : "qa-ar";
}

async function createSession(product, lang) {
  await makeRoom();
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    locale: lang === "en" ? "en-US" : "ar-QA",
    viewport: { width: 1366, height: 900 },
  });
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const t = req.resourceType();
    if (process.env.QH_NO_BLOCK !== "1" && (t === "image" || t === "media" || t === "font")) return route.abort();
    let host = "";
    try {
      host = new URL(req.url()).hostname;
    } catch (e) {}
    if (process.env.QH_NO_BLOCK !== "1" && BLOCK_HOSTS.test(host)) return route.abort();
    return route.continue();
  });
  // The official qa-ar pages define plural helpers (tr_nbf_*) with 6 Arabic plural forms but
  // only 3 strings, so e.g. "4 tours" throws and the tour/stopover results never render.
  // Wrap them so a missing form falls back to the last available string.
  await ctx.addInitScript(() => {
    const fixOne = (k) => {
      const f = window[k];
      if (typeof f !== "function" || f.__qhFixed) return;
      const src = String(f);
      const m = src.match(/var a=(\[[\s\S]*?\]);/);
      const pm = src.match(/^function\s*\(([^)]*)\)/);
      let arr = null;
      try {
        arr = m && JSON.parse(m[1]);
      } catch (e) {}
      const names = pm ? pm[1].split(",").map((x) => x.trim()).filter(Boolean) : [];
      const g = function () {
        try {
          return f.apply(this, arguments);
        } catch (e) {
          if (!arr || !arr.length) throw e;
          let out = String(arr[arr.length - 1]);
          names.forEach((n, i) => {
            const v = arguments[i] === undefined ? (n === "$num" ? 0 : "") : arguments[i];
            out = out.split(n).join(String(v));
          });
          return out;
        }
      };
      g.__qhFixed = true;
      try {
        window[k] = g;
      } catch (e) {}
    };
    const run = () => {
      try {
        Object.keys(window).forEach((k) => {
          if (k.indexOf("tr_") === 0) fixOne(k);
        });
      } catch (e) {}
    };
    document.addEventListener("DOMContentLoaded", run);
    window.addEventListener("load", run);
    setInterval(run, 500);
  });
  const page = await ctx.newPage();
  const s = {
    token: newToken(),
    product,
    lang,
    sf: storefront(lang),
    browser,
    ctx,
    page,
    chain: Promise.resolve(),
    lastUsed: Date.now(),
    createdAt: Date.now(),
    status: "searching",
    error: null,
    pending: 0,
    lastNet: Date.now(),
    navAt: Date.now(),
    job: null, // background selection job {status, data, error}
  };
  const tracked = (r) => {
    const t = r.resourceType();
    return (t === "xhr" || t === "fetch" || t === "document") && r.url().startsWith(HOL);
  };
  page.on("request", (r) => {
    if (!tracked(r)) return;
    s.pending += 1;
    s.lastNet = Date.now();
  });
  const done = (r) => {
    if (!tracked(r)) return;
    s.pending = Math.max(0, s.pending - 1);
    s.lastNet = Date.now();
  };
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) {
      s.navAt = Date.now();
      s.pending = 0;
    }
  });
  sessions.set(s.token, s);
  return s;
}

// Serialise all work on one session page.
function inSession(s, fn) {
  const p = s.chain.then(fn, fn);
  s.chain = p.catch(() => {});
  s.lastUsed = Date.now();
  return p;
}

// ---------------------------------------------------------------- page helpers
async function quiet(s, ms = 1500, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (s.pending === 0 && Date.now() - s.lastNet >= ms) return true;
    await sleep(200);
  }
  return false;
}

async function removeOverlays(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll("#cookieLaw,#onetrust-consent-sdk,#pb_lightbox_bg").forEach((n) => n.remove());
    });
  } catch (e) {}
}

// Runs in the page. Returns a snapshot of the current state of the official page.
const SNAPSHOT = (opts) => {
  const abs = (v) => {
    try {
      return new URL(v, document.baseURI).href;
    } catch (e) {
      return v;
    }
  };
  const looksPath = (v) => typeof v === "string" && v && !/^(data:|blob:|javascript:|#|mailto:|tel:)/i.test(v) && !/[\s(){};]/.test(v);
  // dynamic official resources (image.php, min/...) are Cloudflare-challenged for visitors: proxy them
  const absImg = (v) => {
    const u = abs(v);
    try {
      const x = new URL(u);
      if (opts.proxyBase && /qatarairwaysholidays\.com$/i.test(x.hostname) && /\.php$|\/min\/|\/images\//i.test(x.pathname)) return opts.proxyBase + "/api/packages/asset?u=" + encodeURIComponent(x.pathname + x.search);
    } catch (e) {}
    return u;
  };
  function detailsHref(u) {
    const m = String(u).match(/\/details\/([0-9a-f-]{20,})\/([0-9a-f-]{20,})/i);
    if (!m) return null;
    return "/package-details?token=" + encodeURIComponent(opts.token) + "&choice=" + encodeURIComponent(m[2]) + "&product=" + encodeURIComponent(opts.product) + "&lang=" + encodeURIComponent(opts.lang);
  }
  function clean(root) {
    root.querySelectorAll("script,noscript,link[rel=preload],link[rel=prefetch]").forEach((n) => n.remove());
    root.querySelectorAll("*").forEach((n) => {
      for (const a of Array.from(n.attributes)) if (/^on/i.test(a.name)) n.removeAttribute(a.name);
    });
    root.querySelectorAll("[src]").forEach((n) => {
      const v = n.getAttribute("src");
      if (looksPath(v)) n.setAttribute("src", absImg(v));
    });
    // Official Google static maps key accepts requests without a referrer only.
    root.querySelectorAll('img[src*="maps.googleapis.com/maps/api/staticmap"]').forEach((n) => {
      n.setAttribute("referrerpolicy", "no-referrer");
      n.setAttribute("data-qa-static", "1");
      n.classList.add("qa-static-map");
    });
    ["data-src", "data-onload", "data-lazy", "data-bg", "data-original", "poster"].forEach((a) =>
      root.querySelectorAll("[" + a + "]").forEach((n) => {
        const v = n.getAttribute(a);
        if (looksPath(v) && /[\/.]/.test(v)) n.setAttribute(a, absImg(v));
      })
    );
    root.querySelectorAll("[srcset]").forEach((n) => {
      n.setAttribute(
        "srcset",
        n
          .getAttribute("srcset")
          .split(",")
          .map((p) => {
            const parts = p.trim().split(/\s+/);
            if (parts[0]) parts[0] = absImg(parts[0]);
            return parts.join(" ");
          })
          .join(", ")
      );
    });
    root.querySelectorAll('[style*="url("]').forEach((n) => {
      // official inline styles may use CSS escapes, e.g. url(hotelimg\2E php\3F img\3D ...)
      const unCss = (u) => u.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, "$1");
      n.setAttribute(
        "style",
        n.getAttribute("style").replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => (/^data:/i.test(u) ? m : 'url("' + absImg(unCss(u.trim())) + '")'))
      );
    });
    root.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (!looksPath(h)) return;
      const u = abs(h);
      const d = detailsHref(u);
      if (d) {
        a.setAttribute("href", d);
        a.removeAttribute("target");
      } else a.setAttribute("href", u);
    });
    root.querySelectorAll("form[action]").forEach((f) => f.setAttribute("action", abs(f.getAttribute("action"))));
    return root;
  }
  const out = { url: location.href, title: document.title };
  const numText = (t) => {
    const s = String(t || "").replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[,\u066c]/g, "");
    const m = s.match(/\d+/);
    return m ? Number(m[0]) : 0;
  };
  out.challenge = /just a moment|attention required|لحظة/i.test(document.title) || !!document.querySelector("#challenge-form,#cf-challenge-running,.cf-turnstile");
  const flow = document.querySelector(".bf_flow");
  out.flowClass = flow ? flow.className : "";
  const resultsNode = flow && flow.querySelector(".bf_results");
  out.isResults = !!(flow && /bf_flow_results/.test(flow.className) && resultsNode);
  out.items = resultsNode ? resultsNode.querySelectorAll(".bf_rsitem").length : 0;
  const bodyText = (document.body && document.body.innerText) || "";
  out.searching = !!Array.from(document.querySelectorAll(".bf_searching,.bf_loading,.bf_loadingctr,.bf_srchng")).find((n) => n.offsetParent !== null) || /searching for availability|جار[ٍي]? البحث/i.test(bodyText.slice(0, 6000));
  out.noResults = !!document.querySelector(".bf_noresults,.bf_nores,.bf_noresultsfound") || /no results|no availability|لا توجد نتائج|لا يوجد/i.test((resultsNode && resultsNode.innerText) || "");
  out.hasBasket = !!document.querySelector(".bf_basket,.bf_basketctr,.bf_basket_total,.bf_basket_item_product");
  out.isDetails = !!(flow && /bf_flow_details/.test(flow.className));
  out.isPayment = /payment\.php/i.test(location.pathname) || !!(flow && /bf_paymentpagectr/.test(flow.className));
  out.slidebox = !!Array.from(document.querySelectorAll(".bf_slidebox.show,.bf_slidebox.open")).find((n) => n.offsetParent !== null || n.getBoundingClientRect().width > 0);
  out.cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.href).filter(Boolean);
  out.inlineSig = Array.from(document.querySelectorAll("style")).length + ":" + Array.from(document.querySelectorAll("style")).reduce((a, n) => a + Math.round((n.textContent || "").length / 50000), 0);
  if (opts.mode === "results" && flow && resultsNode) {
    const fc = clean(flow.cloneNode(true));
    const rc = fc.querySelector(".bf_results");
    out.html = rc.innerHTML;
    rc.innerHTML = "";
    out.flowHtml = fc.outerHTML;
    const header = document.querySelector("#nbf_pageheader");
    out.headerHtml = header ? clean(header.cloneNode(true)).innerHTML : "";
    out.count = numText((flow.querySelector(".bf_numrslt") || {}).textContent) || out.items;
    const cp = flow.querySelector(".bf_pgctrl .bf_page.cp");
    out.page = cp ? numText(cp.getAttribute("data-page") || cp.textContent) || 1 : 1;
    out.pageCount = Math.max(1, ...Array.from(flow.querySelectorAll(".bf_pgctrl .bf_page[data-page]")).map((n) => Number(n.getAttribute("data-page")) || 0));
    const sort = flow.querySelector('input[name="filter_sortby"]:checked') || (flow.querySelector(".bf_sortopt.active input[name=\"filter_sortby\"]"));
    out.sortMode = sort ? sort.value : "sort_price";
    const tgl = flow.querySelector(".bf_prtgl");
    if (tgl) {
      const on = tgl.classList.contains("on");
      out.priceMode = tgl.classList.contains("default_pp") ? (on ? "t" : "pp") : on ? "pp" : "t";
    }
    const curr = document.querySelector("#bf-display-price-selector .nbf_tpl_displaypricecurrselectcontainer_selectedoption");
    out.currency = (curr && curr.getAttribute("data-curr")) || "QAR";
    const fs = {};
    flow.querySelectorAll('.bf_filters input[type="checkbox"][data-filter]').forEach((i) => {
      if (i.checked) (fs[i.getAttribute("data-filter")] = fs[i.getAttribute("data-filter")] || []).push(i.value);
    });
    out.filterState = fs;
    const pf = flow.querySelector('.bf_pricefltr input[data-filter="pricefrom"]');
    const pt = flow.querySelector('.bf_pricefltr input[data-filter="priceto"]');
    out.priceFrom = pf ? pf.value : "";
    out.priceTo = pt ? pt.value : "";
    const hn = flow.querySelector('.bf_filters input[name*="hotelname" i],.bf_filters input[data-filter="hotelname"]');
    out.hotelName = hn ? hn.value : "";
    const filters = {};
    flow.querySelectorAll(".bf_filters ol[data-filter]").forEach((ol) => {
      const name = ol.getAttribute("data-filter");
      const entries = {};
      ol.querySelectorAll("li").forEach((li) => {
        const input = li.querySelector("input[data-filter]");
        if (!input) return;
        const nm = li.querySelector(".bf_nm");
        const cst = li.querySelector(".bf_cst");
        entries[input.value] = { title: (nm ? nm.textContent : input.getAttribute("aria-label") || input.value).trim(), subtitle: cst ? cst.textContent.trim() : "" };
      });
      if (Object.keys(entries).length) filters[name] = entries;
    });
    out.filters = filters;
    const sortCosts = {};
    flow.querySelectorAll(".bf_sortopt").forEach((o) => {
      const input = o.querySelector('[name="filter_sortby"]');
      const cost = o.querySelector(".bf_sortcost");
      if (!input || !cost) return;
      const amt = cost.querySelector(".ibecurr[data-amt]");
      sortCosts[input.value] = { amount: amt ? Number(amt.getAttribute("data-amt")) : numText(cost.textContent), html: cost.innerHTML };
    });
    out.sortCosts = sortCosts;
    const fcls = flow.className;
    out.resultStage = /bf_flow_flight/.test(fcls) ? "flight" : /bf_flow_tour/.test(fcls) ? "tour" : /bf_flow_hotel/.test(fcls) ? "hotel" : /bf_flow_transfer/.test(fcls) ? "transfer" : "results";
  }
  if (opts.mode === "slidebox") {
    const boxes = Array.from(document.querySelectorAll(".bf_slidebox")).filter((n) => n.classList.contains("show") || n.classList.contains("open"));
    const box = boxes.reverse().find((n) => n.querySelector(".bf_slidebox_content"));
    let routeSrc = "";
    if (box) {
      const own = Array.from(box.querySelectorAll("script")).map((n) => n.textContent || "").filter((t) => /getElementById\('routemap'\)/.test(t));
      const all = Array.from(document.scripts).map((n) => n.textContent || "").filter((t) => /getElementById\('routemap'\)/.test(t));
      routeSrc = own.pop() || all.pop() || "";
    }
    // official route map data (markers + polylines) for the client-side map
    const route = { points: [], legs: [] };
    if (routeSrc) {
      const titles = {};
      routeSrc.replace(/const marker(\d+)Options\s*=\s*\{\s*title:\s*"((?:[^"\\]|\\.)*)"/g, (m, i, t) => {
        titles[i] = t.replace(/\\(.)/g, "$1");
        return m;
      });
      const seen = {};
      routeSrc.replace(/new BF_GoogleMap_Marker\('(\d+)',\s*(-?[\d.]+),\s*(-?[\d.]+)/g, (m, i, la, ln) => {
        const k = la + "," + ln;
        if (!seen[k]) {
          seen[k] = 1;
          route.points.push({ lat: Number(la), lng: Number(ln), title: titles[i] || "" });
        }
        return m;
      });
      const ll = "new google\\.maps\\.LatLng\\((-?[\\d.]+),\\s*(-?[\\d.]+)\\)";
      const re = new RegExp("Polyline\\(\\{[^]*?path:\\s*\\[" + ll + ",\\s*" + ll + "\\]", "g");
      let m;
      while ((m = re.exec(routeSrc))) route.legs.push({ from: { lat: Number(m[1]), lng: Number(m[2]) }, to: { lat: Number(m[3]), lng: Number(m[4]) } });
    }
    out.route = route;
    if (box) {
      const c = box.querySelector(".bf_slidebox_content").cloneNode(true);
      // the live Google map DOM cannot work outside the official page: leave an empty container
      c.querySelectorAll("#routemap").forEach((n) => {
        n.innerHTML = "";
        n.removeAttribute("style");
      });
      out.slideHtml = clean(c).innerHTML;
    } else out.slideHtml = "";
  }
  if (opts.mode === "basket") {
    let basket = document.querySelector(".bf_basketctr .bf_basket_visbilitycontainer") || document.querySelector(".bf_basketctr") || document.querySelector(".bf_basket");
    if (!basket) {
      const a = document.querySelector(".bf_basket_flight,.bf_basket_hotel");
      const t = document.querySelector(".bf_basket_total");
      let p = a;
      while (p && t && !p.contains(t)) p = p.parentElement;
      basket = p || null;
    }
    if (basket) {
      const c = clean(basket.cloneNode(true));
      // the frontend looks for product items with this class (stopover tour line)
      c.querySelectorAll(".bf_basket_item").forEach((n) => {
        if (!n.classList.contains("bf_basket_item_heading")) n.classList.add("bf_basket_item_product");
      });
      out.basketHtml = c.outerHTML;
    } else out.basketHtml = "";
    const opt = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return [];
      return Array.from(el.options || [])
        .map((o) => ({ value: String(o.value || ""), label: String(o.textContent || "").trim() }))
        .filter((o) => o.value && o.label)
        .slice(0, 300);
    };
    out.airlines = opt('select[name*="-alliance-"],select[name*="ffp" i][name*="airline" i],select[name*="loyalty" i]');
    out.phoneCodes = opt('#contact-phone-cc,select[name="contact-phone-cc"],#contact-mobile-cc,select[name*="dial" i]');
    out.countries = opt('#contact-country,select[name="contact-country"]');
    out.nationalities = opt('#contact-nationality,select[name="contact-nationality"]');
  }
  if (opts.mode === "rates") {
    const sel = opts.choice;
    const trigger = document.querySelector('.js-bf_showrates[data-results="' + sel + '"]');
    const card = trigger && trigger.closest(".bf_rsitem");
    let host = card && (card.querySelector(".bf_ratesctr,.bf_rates,.bf_roomrates,.bf_hotelrates,.js-bf_rates") || null);
    if (!host && card) {
      const g = card.querySelector(".js-bf_options");
      host = g ? g.closest(".bf_rsitem > *") || g.parentElement : null;
    }
    out.ratesHtml = host ? clean(host.cloneNode(true)).outerHTML : "";
    out.ratesGroups = card ? card.querySelectorAll(".js-bf_options").length : 0;
  }
  return out;
};

async function snapshot(s, mode, extra) {
  return s.page.evaluate(SNAPSHOT, Object.assign({ mode, token: s.token, product: s.product, lang: s.lang, proxyBase: PROXY_BASE }, extra || {}));
}

// Hotel coordinates + cheapest price per hotel, read from the official checkStatus data
// (same data the official "View map" uses). Cached per official results URL.
async function hotelMapPoints(s) {
  try {
    const key = new URL(s.page.url()).pathname;
    if (s.mapPts && s.mapPts.key === key && s.mapPts.points.length) return s.mapPts.points;
    const points = await s.page.evaluate(async () => {
      const r = await fetch(location.pathname + "?i=0&m=checkStatus&preload=1", { credentials: "include" });
      const j = JSON.parse(await r.text());
      const best = {};
      Object.keys((j && j.results) || {}).forEach((id) => {
        const x = j.results[id] || {};
        const ix = x.indexes || {};
        const lat = Number(ix.lat), lon = Number(ix.lon);
        if (!isFinite(lat) || !isFinite(lon) || (!lat && !lon)) return;
        const cost = x.cost && Number(x.cost.c);
        const h = x.hotelhash || id;
        if (!best[h] || (cost && (!best[h].cost || cost < best[h].cost)))
          best[h] = { id, name: String(ix.hotelname || x.hotelname || ""), lat, lon, rating: Number(ix.hotelrating) || 0, cost: cost || 0 };
      });
      return Object.values(best);
    });
    s.mapPts = { key, points: Array.isArray(points) ? points : [] };
    return s.mapPts.points;
  } catch (e) {
    console.warn("[qr-packages] hotelMapPoints failed:", e && e.message);
    return [];
  }
}
async function resultsPayload(s, snap, extra) {
  const cssText = await cssTextFor(s, snap).catch(() => "");
  const mapPoints = snap.resultStage === "hotel" ? await hotelMapPoints(s).catch(() => []) : undefined;
  return Object.assign(
    {
      token: s.token,
      status: "ready",
      stage: "results",
      resultStage: snap.resultStage,
      html: snap.html,
      shell: { headerHtml: snap.headerHtml, flowHtml: snap.flowHtml, cssText },
      filters: snap.filters,
      count: snap.count,
      page: snap.page,
      pageCount: snap.pageCount,
      sortMode: snap.sortMode,
      priceMode: snap.priceMode,
      currency: snap.currency,
      filterState: snap.filterState,
      priceFrom: snap.priceFrom,
      priceTo: snap.priceTo,
      hotelName: snap.hotelName,
      sortCosts: snap.sortCosts,
      mapPoints,
    },
    extra || {}
  );
}

// Wait for the official page to reach a stable state after a search/selection.
// Returns {kind: 'results'|'no_results'|'payment'|'extras'|'other', snap}
async function waitStage(s, { timeout = 90000, sinceNav = 0, prevUrl = null } = {}) {
  const end = Date.now() + timeout;
  let last = null;
  while (Date.now() < end) {
    await sleep(700);
    // after a click, give the official page time to leave the current URL
    if (prevUrl && s.page.url() === prevUrl && Date.now() < end - timeout + 25000) continue;
    let snap;
    try {
      snap = await snapshot(s, "probe");
    } catch (e) {
      continue; // navigating
    }
    last = snap;
    if (snap.challenge) continue;
    const q = s.pending === 0 && Date.now() - s.lastNet >= 2000;
    if (!q) continue;
    if (snap.isResults && snap.items > 0 && !snap.searching) return { kind: "results", snap };
    if (snap.isResults && snap.items === 0 && Date.now() - s.navAt > 12000 && (snap.noResults || (!snap.searching && Date.now() - s.navAt > 30000))) return { kind: "no_results", snap };
    if (snap.isPayment && snap.hasBasket) return { kind: "payment", snap };
    if (!snap.isResults && snap.isDetails) return { kind: "details", snap };
    if (!snap.isResults && /bf_flow_addprod|\/extras\//i.test(snap.url + " " + snap.flowClass)) return { kind: "extras", snap };
    if (!snap.isResults && snap.hasBasket && /book|checkout|payment|passenger|confirm/i.test(snap.url + " " + snap.flowClass)) return { kind: "payment", snap };
    if (!snap.isResults && snap.hasBasket && Date.now() - s.navAt > 5000) return { kind: "payment", snap };
  }
  log("waitStage timeout", s.token.slice(0, 8), last && JSON.stringify({ url: last.url, flow: last.flowClass, items: last.items, searching: last.searching, basket: last.hasBasket, slide: last.slidebox, title: last.title }));
  return { kind: "timeout", snap: last };
}

// "No matching results" exactly as the official page shows it (header, search bar, steps, message)
async function noResultsResponse(s) {
  try {
    const snap = await snapshot(s, "results");
    if (snap && snap.isResults && snap.html) return resultsPayload(s, snap, { status: "no_results" });
  } catch (e) {
    log("no_results snapshot failed", String(e.message).slice(0, 80));
  }
  return { token: s.token, status: "no_results", stage: "results" };
}
// Turn the current official stage into the API response.
async function stageResponse(s, st) {
  if (st.kind === "results") {
    const snap = await snapshot(s, "results");
    return resultsPayload(s, snap);
  }
  if (st.kind === "no_results") return noResultsResponse(s);
  if (st.kind === "payment") return { token: s.token, status: "ready", stage: "payment" };
  if (st.kind === "extras") return { token: s.token, status: "ready", stage: "extras" };
  const e = new Error("stage_timeout");
  e.snap = st.snap;
  throw e;
}

// Hotel details page: confirm the (already chosen) room with the official Select button.
async function confirmDetails(s) {
  await removeOverlays(s.page);
  return s.page.evaluate(() => {
    const vis = (b) => b && b.offsetParent !== null;
    const b =
      Array.from(document.querySelectorAll(".js-bf_roomratescompact_selectedchoicebuttons .js-bf_selectproduct")).find(vis) ||
      Array.from(document.querySelectorAll(".js-bf_selectproduct")).find(vis) ||
      Array.from(document.querySelectorAll('.js-bf_option[data-checked="true"] .js-bf_choicebutton')).find(vis);
    if (!b) return "";
    b.scrollIntoView({ block: "center" });
    b.click();
    return (b.className || "").slice(0, 60);
  });
}

// "Travel Extras" stage is optional: continue to the booking page without extras.
async function skipExtras(s) {
  await removeOverlays(s.page);
  return s.page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll(".bf_continue,.js-bf_continue,.js-bf_nextstage,.js-bf_skip,.bf_nextpage button,.bf_nextpage a,button.bf_btn,a.bf_btn"));
    const btn =
      cands.find((b) => b.offsetParent !== null && b.classList.contains("bf_continue")) ||
      cands.find((b) => b.offsetParent !== null && /continue to book|continue|skip|proceed|متابعة|تابع|التالي|تخط|استمر/i.test(b.textContent || ""));
    if (!btn) return "";
    btn.click();
    return (btn.textContent || "").trim().slice(0, 40);
  });
}

async function advance(s, prevUrl, timeout = 90000) {
  let st = await waitStage(s, { timeout, prevUrl });
  for (let i = 0; i < 4; i += 1) {
    if (st.kind !== "details" && st.kind !== "extras") break;
    const prev = s.page.url();
    const clicked = st.kind === "details" ? await confirmDetails(s) : await skipExtras(s);
    log(st.kind, "->", clicked || "no button");
    if (!clicked) break;
    st = await waitStage(s, { timeout: 75000, prevUrl: prev });
  }
  return stageResponse(s, st);
}

async function clickSel(s, selector) {
  await removeOverlays(s.page);
  return s.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, selector);
}

function cssStr(v) {
  return String(v).replace(/["\\]/g, "");
}

// ---------------------------------------------------------------- official CSS / blocked assets
// Cloudflare challenges the dynamic resources (min/ bundles, style.php, image.php) when the
// visitor's browser requests them directly, so the server builds the stylesheet inside the
// cleared session and serves it (and the dynamic images) through /qr-api.
const PROXY_BASE = process.env.QH_PROXY_BASE || "/qr-api";
const cssStore = new Map(); // key -> {gz, raw, at}
const cssBuilding = new Map();
const assetStore = new Map(); // path -> {buf, type, at}
let assetBytes = 0;

function proxyAssetUrl(absUrl) {
  try {
    const u = new URL(absUrl);
    if (!/qatarairwaysholidays\.com$/i.test(u.hostname)) return absUrl;
    if (!/\.php$|\/min\/|\/images\//i.test(u.pathname)) return absUrl;
    return PROXY_BASE + "/api/packages/asset?u=" + encodeURIComponent(u.pathname + u.search);
  } catch (e) {
    return absUrl;
  }
}

const BUILD_CSS = async () => {
  const fix = (css, base) =>
    css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      u = u.trim();
      if (/^(data:|#|about:)/i.test(u) || /%22/i.test(u)) return m;
      try {
        return 'url("' + new URL(u, base).href + '")';
      } catch (e) {
        return m;
      }
    });
  const parts = [];
  for (const n of Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))) {
    if (n.tagName === "STYLE") {
      parts.push(fix(n.textContent || "", document.baseURI));
      continue;
    }
    const h = n.href;
    if (!h) continue;
    try {
      const r = await fetch(h, { credentials: "include" });
      if (!r.ok) continue;
      const t = await r.text();
      if (/^\s*<(!doctype|html)/i.test(t.slice(0, 200))) continue;
      parts.push("/* " + h.split("?")[0].slice(-70) + " */\n" + fix(t, h));
    } catch (e) {}
  }
  return parts.join("\n");
};

async function cssTextFor(s, snap) {
  const links = snap.cssLinks || [];
  if (!links.length) return "";
  const key = crypto.createHash("sha1").update(s.lang + "|" + links.join("|") + "|" + (snap.inlineSig || "")).digest("hex").slice(0, 16);
  if (!cssStore.has(key)) {
    if (!cssBuilding.has(key)) {
      cssBuilding.set(
        key,
        (async () => {
          const t0 = Date.now();
          const src = await s.page.evaluate(BUILD_CSS);
          const ABS = /url\("(https:\/\/www\.qatarairwaysholidays\.com\/[^"]+)"\)/gi;
          const css = src.replace(ABS, (m, u) => 'url("' + proxyAssetUrl(u) + '")');
          const zlib = require("zlib");
          cssStore.set(key, { raw: css, gz: zlib.gzipSync(css), at: Date.now(), inlined: false });
          while (cssStore.size > 30) cssStore.delete(cssStore.keys().next().value);
          log("css built", key, Math.round(css.length / 1024) + "KB", Date.now() - t0 + "ms");
          // in the background, embed the small dynamic images (switches, icons, sprites) so later
          // visitors get a page that is complete on first paint without extra image requests
          const dyn = new Set();
          src.replace(ABS, (m, u) => {
            if (proxyAssetUrl(u) !== u) dyn.add(u);
            return m;
          });
          (async () => {
            const list = Array.from(dyn).slice(0, 300);
            for (let attempt = 0; attempt < 3; attempt += 1) {
              const page = attempt === 0 ? s.page : livePage();
              if (!page) break;
              try {
                const t1 = Date.now();
                const got = await page.evaluate(FETCH_MANY, list);
                const inl = {};
                got.forEach((r) => {
                  if (r && r.status === 200 && r.b64 && !/text\/html/i.test(r.type || "")) inl[r.u] = "data:" + (String(r.type).split(";")[0].trim() || "image/png") + ";base64," + r.b64;
                });
                const full = src.replace(ABS, (m, u) => 'url("' + (inl[u] || proxyAssetUrl(u)) + '")');
                if (cssStore.has(key)) cssStore.set(key, { raw: full, gz: zlib.gzipSync(full), at: Date.now(), inlined: true });
                log("css inlined", key, Object.keys(inl).length + "/" + dyn.size, Date.now() - t1 + "ms");
                return;
              } catch (e) {
                log("css inline retry", attempt, String(e.message).slice(0, 80));
                await sleep(5000);
              }
            }
          })();
        })().finally(() => cssBuilding.delete(key))
      );
    }
    try {
      await cssBuilding.get(key);
    } catch (e) {
      log("css build failed", e.message);
      return "";
    }
  }
  return '@import url("' + PROXY_BASE + "/api/packages/css/" + key + '.css");';
}

function livePage() {
  let best = null;
  for (const s of sessions.values()) {
    try {
      if (!s.page.isClosed() && s.page.url().startsWith(HOL) && (!best || s.lastUsed > best.lastUsed)) best = s;
    } catch (e) {}
  }
  return best && best.page;
}

const FETCH_ASSET = async (u) => {
  const r = await fetch(u, { credentials: "include" });
  const b = new Uint8Array(await r.arrayBuffer());
  let str = "";
  for (let i = 0; i < b.length; i += 0x8000) str += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return { status: r.status, type: r.headers.get("content-type") || "", b64: btoa(str) };
};
// fetch many small assets inside the cleared page (8 at a time); big files are left to the proxy
const FETCH_MANY = async (list) => {
  const out = [];
  let i = 0;
  const one = async (u) => {
    try {
      const r = await fetch(u, { credentials: "include" });
      const b = new Uint8Array(await r.arrayBuffer());
      if (b.length > 40000) return { u, status: r.status, big: true };
      let str = "";
      for (let j = 0; j < b.length; j += 0x8000) str += String.fromCharCode.apply(null, b.subarray(j, j + 0x8000));
      return { u, status: r.status, type: r.headers.get("content-type") || "", b64: btoa(str) };
    } catch (e) {
      return { u, status: 0 };
    }
  };
  const worker = async () => {
    while (i < list.length) {
      const k = i++;
      out[k] = await one(list[k]);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return out;
};

// ---------------------------------------------------------------- actions
async function startSearch(payload) {
  const product = ["stopover", "flight-hotel", "hotel"].includes(payload.product) ? payload.product : "stopover";
  const lang = payload.lang === "en" ? "en" : "ar";
  const params = Array.isArray(payload.params) ? payload.params.filter((p) => Array.isArray(p) && p.length >= 2) : [];
  if (!params.length) throw Object.assign(new Error("expired_session"), { http: 400 });
  const s = await createSession(product, lang);
  const qs = new URLSearchParams();
  params.forEach(([k, v]) => qs.append(String(k), String(v)));
  const url = `${HOL}/${s.sf}/search.php?${qs.toString()}`;
  s.wantPriceMode = payload.priceMode === "t" || payload.priceMode === "pp" ? payload.priceMode : null;
  log("search", s.token.slice(0, 8), product, lang, url.slice(0, 160));
  s.search = inSession(s, async () => {
    try {
      for (let attempt = 1; ; attempt += 1) {
        try {
          await s.page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
          break;
        } catch (e) {
          if (attempt >= 3 || !/net::|timeout/i.test(String(e && e.message))) throw e;
          log("search goto retry", attempt, String(e.message).slice(0, 60));
          await sleep(1500 * attempt);
        }
      }
      const st = await waitStage(s, { timeout: SEARCH_TIMEOUT_MS });
      if (st.kind === "results" && s.wantPriceMode) {
        const snap = await snapshot(s, "results");
        if (snap.priceMode && snap.priceMode !== s.wantPriceMode) {
          await clickSel(s, ".bf_flow .bf_prtgl img, .bf_flow .bf_prtgl");
          await quiet(s, 1200, 20000);
        }
      }
      s.status = st.kind === "results" ? "ready" : st.kind === "no_results" ? "no_results" : st.kind === "timeout" ? "error" : "ready";
      s.searchStage = st;
      if (s.status === "error") s.error = "search_timeout";
      log("search done", s.token.slice(0, 8), st.kind, st.snap && st.snap.items, Date.now() - s.createdAt + "ms");
      noteSearch(s, params, st.kind + (st.snap && st.snap.items ? ":" + (st.snap.count || st.snap.items) : ""));
    } catch (e) {
      s.status = "error";
      s.error = String((e && e.message) || e);
      log("search failed", s.token.slice(0, 8), s.error);
      noteSearch(s, params, "error:" + s.error.slice(0, 60));
    }
  });
  return s;
}

async function statusResponse(s) {
  if (s.status === "searching") return { token: s.token, status: "searching" };
  if (s.status === "no_results") return inSession(s, () => noResultsResponse(s));
  if (s.status === "error") throw Object.assign(new Error(s.error || "search_failed"), { http: 502 });
  return inSession(s, async () => {
    const st = await waitStage(s, { timeout: 30000 });
    return stageResponse(s, st);
  });
}

async function applyPage(s, body) {
  return inSession(s, async () => {
    const page = s.page;
    let snap = await snapshot(s, "results");
    if (!snap.isResults) throw Object.assign(new Error("not_results"), { http: 409 });
    const sig = () =>
      page.evaluate(() => {
        const f = document.querySelector(".bf_flow");
        if (!f) return "";
        const first = f.querySelector(".bf_results .bf_rsitem");
        const sel = first && first.querySelector("[data-selection],[data-results],[data-hash]");
        const sort = f.querySelector('input[name="filter_sortby"]:checked');
        const tgl = f.querySelector(".bf_prtgl");
        const amt = first && first.querySelector(".ibecurr[data-amt]");
        return [
          (f.querySelector(".bf_numrslt") || {}).textContent,
          sel ? sel.getAttribute("data-selection") || sel.getAttribute("data-results") || sel.getAttribute("data-hash") : "",
          (f.querySelector(".bf_pgctrl .bf_page.cp") || {}).textContent,
          sort ? sort.value : "",
          tgl ? tgl.className : "",
          amt ? amt.getAttribute("data-amt") : "",
          f.querySelectorAll(".bf_results .bf_rsitem").length,
        ].join("|");
      });
    const step = async (fn, arg) => {
      await removeOverlays(page);
      const before = await sig();
      const did = await page.evaluate(fn, arg);
      if (did) {
        const end = Date.now() + 14000;
        let cur = before;
        let changedAt = 0;
        while (Date.now() < end) {
          await sleep(300);
          const now = await sig();
          if (now !== cur) {
            cur = now;
            changedAt = Date.now();
            continue;
          }
          // changed at least once and stable for 1.5s with results rendered
          if (changedAt && Date.now() - changedAt > 1500 && !/\|0$/.test(cur)) break;
          if (!changedAt && Date.now() - end + 14000 > 9000) break;
        }
        await quiet(s, 900, 25000);
      }
      return did;
    };
    // sort
    if (body.sortMode && body.sortMode !== snap.sortMode) {
      await step((mode) => {
        const input = Array.from(document.querySelectorAll('.bf_flow .bf_sortopt [name="filter_sortby"]')).find((i) => i.value === mode);
        if (!input) return false;
        const opt = input.closest(".bf_sortopt");
        const cont = opt.closest(".bf_sortopt_container");
        const active = cont && cont.querySelector(".bf_sortopt.active");
        if (active && active !== opt) active.click();
        opt.click();
        if (!input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return true;
      }, body.sortMode);
    }
    // price mode
    if ((body.priceMode === "t" || body.priceMode === "pp") && snap.priceMode && body.priceMode !== snap.priceMode) {
      await step(() => {
        const t = document.querySelector(".bf_flow .bf_prtgl img") || document.querySelector(".bf_flow .bf_prtgl");
        if (!t) return false;
        t.click();
        return true;
      });
    }
    // currency
    if ((body.currency === "QAR" || body.currency === "AVI") && body.currency !== snap.currency) {
      await step((c) => {
        const opt = document.querySelector('#bf-display-price-selector .nbf_tpl_displaypricecurrselectcontainer_option[data-curr="' + c + '"]');
        if (!opt) return false;
        const sel = document.querySelector("#bf-display-price-selector .nbf_tpl_displaypricecurrselectcontainer_selectedoption");
        if (sel) sel.click();
        opt.click();
        return true;
      }, body.currency);
    }
    // checkbox filters
    const want = body.filters && typeof body.filters === "object" ? body.filters : {};
    await step((w) => {
      let changed = false;
      document.querySelectorAll('.bf_flow .bf_filters input[type="checkbox"][data-filter]').forEach((i) => {
        const name = i.getAttribute("data-filter");
        if (name === "duration" && !w.duration) return; // handled locally by the frontend on the hotel stage
        const on = Array.isArray(w[name]) && w[name].map(String).includes(String(i.value));
        if (i.checked !== on) {
          i.click();
          changed = true;
        }
      });
      return changed;
    }, want);
    // price range + hotel name
    await step(
      (r) => {
        let changed = false;
        const set = (el, v, ev) => {
          if (!el || el.value === v) return;
          el.value = v;
          ev.forEach((e) => el.dispatchEvent(new Event(e, { bubbles: true })));
          el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
          changed = true;
        };
        set(document.querySelector('.bf_flow .bf_pricefltr input[data-filter="pricefrom"]'), r.from, ["input", "change"]);
        set(document.querySelector('.bf_flow .bf_pricefltr input[data-filter="priceto"]'), r.to, ["input", "change"]);
        set(document.querySelector('.bf_flow .bf_filters input[name*="hotelname" i],.bf_flow .bf_filters input[data-filter="hotelname"]'), r.hotel, ["input", "change"]);
        return changed;
      },
      { from: body.priceFrom == null ? "" : String(body.priceFrom), to: body.priceTo == null ? "" : String(body.priceTo), hotel: body.hotelName == null ? "" : String(body.hotelName) }
    );
    // page
    snap = await snapshot(s, "results");
    const want_page = Math.max(1, Number(body.page) || 1);
    if (want_page !== snap.page) {
      await step((p) => {
        const b = document.querySelector('.bf_flow .bf_pgctrl .bf_page[data-page="' + p + '"]');
        if (!b) return false;
        b.click();
        return true;
      }, want_page);
    }
    await quiet(s, 1000, 15000);
    snap = await snapshot(s, "results");
    return resultsPayload(s, snap);
  });
}

async function detailsSlidebox(s, choice) {
  return inSession(s, async () => {
    const page = s.page;
    await removeOverlays(page);
    await page.evaluate(() => {
      document.querySelectorAll(".bf_slidebox.show .bf_slidebox_close, .bf_slidebox.show .js-bf_slideboxclose").forEach((b) => b.click());
    });
    const ok = await page.evaluate((c) => {
      const link = Array.from(document.querySelectorAll(".bf_results a.js-bf_showdetails[href], .bf_results a[href*='/details/']")).find((a) => a.getAttribute("href").indexOf(c) >= 0);
      if (!link) return false;
      link.click();
      return true;
    }, cssStr(choice));
    if (!ok) throw Object.assign(new Error("unknown_choice"), { http: 404 });
    const end = Date.now() + 40000;
    let snap = null;
    while (Date.now() < end) {
      await sleep(600);
      if (s.pending > 0 || Date.now() - s.lastNet < 900) continue;
      snap = await snapshot(s, "slidebox");
      if (snap.slideHtml && snap.slideHtml.length > 500 && !/bf_slidepanel_loading/.test(snap.slideHtml.slice(0, 400))) break;
    }
    if (!snap || !snap.slideHtml) throw Object.assign(new Error("details_unavailable"), { http: 502 });
    // close it again so the results page stays usable
    await page.evaluate(() => {
      document.querySelectorAll(".bf_slidebox.show .bf_slidebox_close, .bf_slidebox.show .js-bf_slideboxclose").forEach((b) => b.click());
    });
    return { token: s.token, status: "ready", html: snap.slideHtml, map: snap.route || {} };
  });
}

async function selectResult(s, choice) {
  return inSession(s, async () => {
    const page = s.page;
    const prev = page.url();
    await removeOverlays(page);
    const ok = await page.evaluate((c) => {
      const btn = document.querySelector('.bf_results .js-bf_selectproduct[data-selection="' + c + '"]') || document.querySelector('.js-bf_selectproduct[data-selection="' + c + '"]');
      if (!btn) return false;
      btn.scrollIntoView({ block: "center" });
      btn.click();
      return true;
    }, cssStr(choice));
    if (!ok) throw Object.assign(new Error("unknown_choice"), { http: 404 });
    return advance(s, prev, 90000);
  });
}

async function tourWhoosher(s, hash) {
  return inSession(s, async () => {
    const page = s.page;
    await removeOverlays(page);
    const ok = await page.evaluate((h) => {
      const el = document.querySelector('.js-bf_opentourwhoosher[data-hash="' + h + '"]');
      if (!el) return false;
      el.scrollIntoView({ block: "center" });
      el.click();
      return true;
    }, cssStr(hash));
    if (!ok) throw Object.assign(new Error("unknown_tour"), { http: 404 });
    const end = Date.now() + 45000;
    let snap = null;
    while (Date.now() < end) {
      await sleep(600);
      if (s.pending > 0 || Date.now() - s.lastNet < 900) continue;
      snap = await snapshot(s, "slidebox");
      if (snap.slideHtml && /js-bf_selectpms/.test(snap.slideHtml)) break;
    }
    if (!snap || !/js-bf_selectpms/.test(snap.slideHtml || "")) throw Object.assign(new Error("tour_unavailable"), { http: 502 });
    s.openTour = hash;
    return { token: s.token, status: "ready", html: snap.slideHtml };
  });
}

async function tourSelect(s, hash, selection) {
  const open = await inSession(s, async () =>
    s.page.evaluate((sel) => !!document.querySelector('.js-bf_selectpms[data-selection="' + sel + '"]'), cssStr(selection))
  );
  if (!open) await tourWhoosher(s, hash);
  return inSession(s, async () => {
    const page = s.page;
    const prev = page.url();
    const ok = await page.evaluate((sel) => {
      const el = document.querySelector('.js-bf_selectpms[data-selection="' + sel + '"]');
      if (!el) return false;
      el.click();
      return true;
    }, cssStr(selection));
    if (!ok) throw Object.assign(new Error("unknown_selection"), { http: 404 });
    return advance(s, prev, 90000);
  });
}

async function hotelRates(s, choice) {
  return inSession(s, async () => {
    const page = s.page;
    await removeOverlays(page);
    const ok = await page.evaluate((c) => {
      const t = document.querySelector('.js-bf_showrates[data-results="' + c + '"]');
      if (!t) return false;
      const card = t.closest(".bf_rsitem");
      if (card && card.querySelector(".js-bf_options")) return true;
      t.scrollIntoView({ block: "center" });
      t.click();
      return true;
    }, cssStr(choice));
    if (!ok) throw Object.assign(new Error("unknown_choice"), { http: 404 });
    const end = Date.now() + 45000;
    let snap = null;
    while (Date.now() < end) {
      await sleep(600);
      if (s.pending > 0 || Date.now() - s.lastNet < 900) continue;
      snap = await snapshot(s, "rates", { choice: cssStr(choice) });
      if (snap.ratesGroups > 0 && snap.ratesHtml) break;
    }
    if (!snap || !snap.ratesHtml) throw Object.assign(new Error("rates_unavailable"), { http: 502 });
    return { token: s.token, status: "ready", html: snap.ratesHtml };
  });
}

function hotelSelect(s, choice, selections) {
  if (s.job && s.job.status === "selecting") return { token: s.token, status: "selecting", stage: "selecting" };
  const job = { status: "selecting", data: null, error: null };
  s.job = job;
  inSession(s, async () => {
    const page = s.page;
    await removeOverlays(page);
    const prev = page.url();
    // make sure the rates are open
    await page.evaluate((c) => {
      const t = document.querySelector('.js-bf_showrates[data-results="' + c + '"]');
      const card = t && t.closest(".bf_rsitem");
      if (t && card && !card.querySelector(".js-bf_options")) t.click();
    }, cssStr(choice));
    const endOpen = Date.now() + 30000;
    while (Date.now() < endOpen) {
      const n = await page.evaluate((c) => {
        const t = document.querySelector('.js-bf_showrates[data-results="' + c + '"]');
        const card = t && t.closest(".bf_rsitem");
        return card ? card.querySelectorAll(".js-bf_options").length : 0;
      }, cssStr(choice));
      if (n > 0) break;
      await sleep(600);
    }
    await quiet(s, 900, 15000);
    const r = await page.evaluate(
      ({ c, sels }) => {
        const t = document.querySelector('.js-bf_showrates[data-results="' + c + '"]');
        const card = t && t.closest(".bf_rsitem");
        if (!card) return "no_card";
        const groups = Array.from(card.querySelectorAll(".js-bf_options"));
        const buttons = [];
        groups.forEach((g, gi) => {
          const wanted = sels[gi];
          let opt = null;
          if (wanted) {
            const input = Array.from(g.querySelectorAll(".js-bf_optioninput")).find((i) => i.value === wanted);
            opt = input && input.closest(".js-bf_option");
          }
          if (!opt) opt = g.querySelector('.js-bf_option[data-checked="true"],.js-bf_option.bf_option--selected') || g.querySelector(".js-bf_option");
          const b = opt && opt.querySelector(".js-bf_choicebutton");
          if (b) buttons.push(b);
        });
        if (!buttons.length) return "no_select";
        // Each room's "Select" button performs the official selectProduct action
        // (for multi-room stays the last one completes the choice).
        buttons.forEach((b, i) => setTimeout(() => b.click(), i * 900));
        return "ok";
      },
      { c: cssStr(choice), sels: (selections || []).map(cssStr) }
    );
    if (r !== "ok") throw Object.assign(new Error("hotel_" + r), { http: 409 });
    await sleep(1000 * Math.max(1, (selections || []).length));
    return advance(s, prev, 90000);
  })
    .then((data) => {
      job.status = "done";
      job.data = data;
    })
    .catch((e) => {
      job.status = "error";
      job.error = String((e && e.message) || e);
      log("hotel-select failed", s.token.slice(0, 8), job.error);
    });
  return { token: s.token, status: "selecting", stage: "selecting" };
}

function hotelSelectStatus(s) {
  const job = s.job;
  if (!job) throw Object.assign(new Error("no_selection"), { http: 409 });
  if (job.status === "selecting") return { token: s.token, status: "selecting", stage: "selecting" };
  if (job.status === "error") throw Object.assign(new Error(job.error || "selection_failed"), { http: 502 });
  return job.data;
}

async function summary(s) {
  return inSession(s, async () => {
    let snap = await snapshot(s, "basket");
    if (!snap.basketHtml) {
      await quiet(s, 1500, 20000);
      snap = await snapshot(s, "basket");
    }
    if (!snap.basketHtml) throw Object.assign(new Error("summary_unavailable"), { http: 409 });
    return {
      token: s.token,
      status: "ready",
      stage: "summary",
      html: snap.basketHtml,
      airlines: snap.airlines,
      phoneCodes: snap.phoneCodes,
      countries: snap.countries,
      nationalities: snap.nationalities,
    };
  });
}

// ---------------------------------------------------------------- express wiring
module.exports = function registerQrPackages(app) {
  const express = require("express");
  const json = express.json({ limit: "256kb" });
  const cors = (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  };
  const paths = (p) => [p, "/qr-api" + p];
  const need = (req) => {
    const t = String((req.body && req.body.token) || "");
    const s = sessions.get(t);
    if (!s) throw Object.assign(new Error("expired_session"), { http: 410 });
    s.lastUsed = Date.now();
    return s;
  };
  const route = (p, fn) => {
    app.options(paths(p), cors);
    app.post(paths(p), cors, json, async (req, res) => {
      const t0 = Date.now();
      try {
        const out = await fn(req.body || {}, req);
        res.json(out);
        log(p, out && out.status, out && out.stage, Date.now() - t0 + "ms");
      } catch (e) {
        const code = e.http || 502;
        log(p, "error", e.message, Date.now() - t0 + "ms");
        res.status(code).json({ error: e.message || "upstream_error" });
      }
    });
  };

  route("/api/packages/search", async (body) => {
    const s = await startSearch(body);
    // give quick searches a chance to complete in the first response
    const end = Date.now() + 20000;
    while (Date.now() < end && s.status === "searching") await sleep(500);
    return statusResponse(s);
  });
  route("/api/packages/status", async (body, req) => {
    const s = need(req);
    const end = Date.now() + 8000;
    while (Date.now() < end && s.status === "searching") await sleep(400);
    return statusResponse(s);
  });
  route("/api/packages/page", async (body, req) => applyPage(need(req), body));
  route("/api/packages/details", async (body, req) => {
    const s = need(req);
    const exists = await inSession(s, () =>
      s.page.evaluate((c) => !!document.querySelector('.js-bf_selectproduct[data-selection="' + c + '"]'), cssStr(body.choice || ""))
    );
    if (!exists) throw Object.assign(new Error("unknown_choice"), { http: 404 });
    return { token: s.token, status: "ready" };
  });
  route("/api/packages/details-slidebox", async (body, req) => detailsSlidebox(need(req), String(body.choice || "")));
  route("/api/packages/select", async (body, req) => selectResult(need(req), String(body.choice || "")));
  route("/api/packages/tour-whoosher", async (body, req) => tourWhoosher(need(req), String(body.hash || "")));
  route("/api/packages/tour-select", async (body, req) => tourSelect(need(req), String(body.hash || ""), String(body.selection || "")));
  route("/api/packages/hotel-rates", async (body, req) => hotelRates(need(req), String(body.choice || "")));
  route("/api/packages/hotel-select", async (body, req) => hotelSelect(need(req), String(body.choice || ""), Array.isArray(body.selections) ? body.selections : []));
  route("/api/packages/hotel-select-status", async (body, req) => {
    const s = need(req);
    const end = Date.now() + 5000;
    while (Date.now() < end && s.job && s.job.status === "selecting") await sleep(400);
    return hotelSelectStatus(s);
  });
  route("/api/packages/summary", async (body, req) => summary(need(req)));

  // official stylesheet built inside the cleared session (see cssTextFor)
  app.get(paths("/api/packages/css/:key.css"), (req, res) => {
    const c = cssStore.get(String(req.params.key || ""));
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!c) return res.status(404).type("text/css").send("/* expired */");
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    // until the images are embedded, let browsers pick up the complete version on the next visit
    res.setHeader("Cache-Control", c.inlined ? "public, max-age=21600" : "no-cache");
    res.setHeader("Vary", "Accept-Encoding");
    if (/\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
      res.setHeader("Content-Encoding", "gzip");
      return res.end(c.gz);
    }
    return res.end(c.raw);
  });

  // dynamic official images (image.php ...) fetched through a live cleared session
  app.get(paths("/api/packages/asset"), async (req, res) => {
    const u = String(req.query.u || "");
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!/^\/[^/]/.test(u) || u.length > 600 || !/\.php|\/min\/|\/images\//i.test(u)) return res.sendStatus(400);
    const hit = assetStore.get(u);
    const send = (a) => {
      res.setHeader("Content-Type", a.type || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(a.buf);
    };
    if (hit) return send(hit);
    const page = livePage();
    if (!page) return res.sendStatus(503);
    try {
      let r = await page.evaluate(FETCH_ASSET, HOL + u);
      // some images exist only under the English storefront
      if (r.status === 404 && /^\/qa-ar\//.test(u)) r = await page.evaluate(FETCH_ASSET, HOL + u.replace(/^\/qa-ar\//, "/qa-en/"));
      if (r.status !== 200 || /text\/html/i.test(r.type)) return res.sendStatus(r.status === 200 ? 502 : r.status);
      let buf = Buffer.from(r.b64, "base64");
      if (/text\/css/i.test(r.type)) {
        // make url() references work from the visitor's domain
        const base = HOL + u;
        const css = buf.toString("utf8").replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, ref) => {
          ref = ref.trim();
          if (/^(data:|#|about:)/i.test(ref) || /%22/i.test(ref)) return m;
          try {
            return 'url("' + proxyAssetUrl(new URL(ref, base).href) + '")';
          } catch (e) {
            return m;
          }
        });
        buf = Buffer.from(css, "utf8");
      }
      const a = { buf, type: r.type, at: Date.now() };
      assetStore.set(u, a);
      assetBytes += a.buf.length;
      while (assetBytes > 40 * 1024 * 1024 && assetStore.size) {
        const k = assetStore.keys().next().value;
        assetBytes -= assetStore.get(k).buf.length;
        assetStore.delete(k);
      }
      return send(a);
    } catch (e) {
      return res.sendStatus(502);
    }
  });

  app.get("/api/packages/_status", cors, (req, res) => {
    // local-only DOM inspection (never enabled in production)
    if (req.query.eval && process.env.QH_DEBUG_EVAL === "1") {
      const s = Array.from(sessions.values()).find((x) => x.token.startsWith(String(req.query.t || "")));
      if (!s) return res.sendStatus(404);
      return s.page
        .evaluate((code) => {
          // eslint-disable-next-line no-new-func
          return Promise.resolve(new Function(code)());
        }, String(req.query.eval))
        .then((v) => res.json({ v }))
        .catch((e) => res.status(500).json({ error: String(e.message) }));
    }
    // debug screenshot of a session (token prefix), protected by QH_DEBUG_KEY when set
    if (req.query.shot) {
      const allowed = process.env.QH_DEBUG_EVAL === "1" || (process.env.QH_DEBUG_KEY && req.query.key === process.env.QH_DEBUG_KEY);
      if (!allowed) return res.sendStatus(403);
      const s = Array.from(sessions.values()).find((x) => x.token.startsWith(String(req.query.shot)));
      if (!s) return res.sendStatus(404);
      return s.page
        .screenshot({ type: "jpeg", quality: 60, fullPage: req.query.full === "1" })
        .then((b) => res.type("jpeg").send(b))
        .catch((e) => res.status(500).send(String(e.message)));
    }
    res.json({
      browser: !!(BR.browser && BR.browser.isConnected()),
      launches: BR.launches,
      lastError: BR.lastError,
      recent: recentSearches,
      sessions: Array.from(sessions.values()).map((s) => ({
        t: s.token.slice(0, 6),
        product: s.product,
        lang: s.lang,
        status: s.status,
        ageS: Math.round((Date.now() - s.createdAt) / 1000),
        idleS: Math.round((Date.now() - s.lastUsed) / 1000),
        url: (() => {
          try {
            return s.page.url().replace(HOL, "");
          } catch (e) {
            return "";
          }
        })(),
      })),
    });
  });
};

module.exports._internals = { sessions, startSearch, statusResponse, applyPage, detailsSlidebox, selectResult, tourWhoosher, tourSelect, hotelRates, hotelSelect, hotelSelectStatus, summary, snapshot, waitStage };
