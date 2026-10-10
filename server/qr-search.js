// Qatar Airways live flight search API (replacement for the old 34.142.131.43:8791 service).
// Registered on the main Express app: /qr-api/api/* and /api/qr/*
const OFFERS_URL =
  "https://www.qatarairways.com/dapi/public/bff/web/flight-search/flight-offers";
const FS_API_KEY = "74f2474702784207a9785eb3ef8ae4e4";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

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
function officialHeaders(lang) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": lang || "en",
    "qr-lang": lang || "en",
    "session-id": uuid(),
    "X-AssignedDeviceID": deviceId(),
    nbx_fs_api_key: FS_API_KEY,
    "User-Agent": UA,
    Origin: "https://www.qatarairways.com",
    Referer: "https://www.qatarairways.com/app/booking/flight-selection",
  };
}

async function upstream(url, body, lang, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: officialHeaders(lang),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = function registerQrSearch(app) {
  app.get("/api/qr-probe", async (req, res) => {
    const t0 = Date.now();
    const body = {
      channel: "WEB_DESKTOP",
      itineraries: [
        { origin: "DOH", destination: "AMM", departureDate: req.query.date || "2026-10-20", isRequested: true },
      ],
      cabinClass: "ECONOMY",
      ignoreInvalidPromoCode: true,
      passengers: [{ type: "ADT", count: 1 }],
    };
    try {
      const r = await upstream(OFFERS_URL, body, "en");
      let offers = null;
      try { offers = (JSON.parse(r.text).flightOffers || []).length; } catch (e) {}
      res.json({ status: r.status, ms: Date.now() - t0, len: r.text.length, offers, head: offers == null ? r.text.slice(0, 200) : undefined });
    } catch (e) {
      res.json({ error: String(e), ms: Date.now() - t0 });
    }
  });
};
