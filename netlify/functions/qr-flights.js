// Netlify Function: live Qatar Airways flight search proxy.
// Calls the official public BFF endpoint with the exact contract used by
// qatarairways.com and returns a normalized payload for our results page.
//
// POST /api/qr-flights
//   { tripType: 'O'|'R'|'M', cabinClass, adults, children, infants,
//     legs: [{ origin, destination, date }], currency, lang }

const OFFERS_URL =
  "https://www.qatarairways.com/dapi/public/bff/web/flight-search/flight-offers";
const CAL_URL =
  "https://www.qatarairways.com/dapi/public/bff/web/flight-search/fare-calendars";
const FS_API_KEY = "74f2474702784207a9785eb3ef8ae4e4";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const CABIN_MAP = {
  E: "ECONOMY",
  ECONOMY: "ECONOMY",
  B: "PREMIUM",
  BUSINESS: "PREMIUM",
  PREMIUM: "PREMIUM",
  F: "FIRST",
  FIRST: "FIRST",
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function deviceId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i += 1)
    out += chars[Math.floor(Math.random() * chars.length)];
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

function buildPassengers(adults, children, infants) {
  const pax = [];
  const a = Math.max(1, Number(adults) || 1);
  pax.push({ type: "ADT", count: a });
  const c = Number(children) || 0;
  if (c > 0) pax.push({ type: "CHD", count: c });
  const i = Number(infants) || 0;
  if (i > 0) pax.push({ type: "INF", count: i });
  return pax;
}

function normalizeOffer(offer, dictionaries) {
  const segments = (offer.segments || []).map((s) => ({
    flightNumber: s.flightNumber,
    aircraft: s.vehicle ? s.vehicle.name || s.vehicle.shortName : null,
    origin: s.departure && s.departure.origin ? s.departure.origin.iataCode : null,
    destination:
      s.arrival && s.arrival.destination ? s.arrival.destination.iataCode : null,
    departureTime: s.departure ? s.departure.dateTime : null,
    arrivalTime: s.arrival ? s.arrival.dateTime : null,
    durationMinutes: s.duration ? Math.round(s.duration / 60) : null,
    carrier: s.operatorLogo ? s.operatorLogo.operatorCode : null,
    carrierName: s.operatingAirlineName || null,
    qsuite: !!s.qSuiteEquipped,
    daysDifference:
      s.arrival && typeof s.arrival.daysDifference === "number"
        ? s.arrival.daysDifference
        : 0,
  }));

  const cabins = {};
  (offer.fareOffers || []).forEach((f) => {
    const family = f.fareFamilyCode || "";
    let group = "ECONOMY";
    if (/BUSINESS|PREMIUM/i.test(family)) group = "BUSINESS";
    if (/^FIRST/i.test(family)) group = "FIRST";
    const total = f.price ? f.price.total : null;
    if (total == null) return;
    if (!cabins[group] || total < cabins[group].total) {
      cabins[group] = {
        total,
        base: f.price ? f.price.base : null,
        currency: f.price ? f.price.currencyCode : null,
        fareFamily: family,
        boundId: f.boundId || null,
        availableSeats: f.availableSeats || null,
      };
    }
  });

  const viaCodes = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    if (segments[i].destination) viaCodes.push(segments[i].destination);
  }

  return {
    origin: offer.origin ? offer.origin.iataCode : null,
    destination: offer.destination ? offer.destination.iataCode : null,
    durationMinutes: offer.duration ? Math.round(offer.duration / 60) : null,
    stops: typeof offer.numberOfStops === "number" ? offer.numberOfStops : null,
    arrivalDaysDifference: offer.arrivalDaysDifference || 0,
    departureTime: segments.length ? segments[0].departureTime : null,
    arrivalTime: segments.length ? segments[segments.length - 1].arrivalTime : null,
    via: viaCodes,
    segments,
    cabins,
    carriers: [...new Set(segments.map((s) => s.carrier).filter(Boolean))],
    lowestFare: !!offer.lowestFare,
    dictionaryHint: dictionaries ? undefined : undefined,
  };
}

export const handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers: cors, body: "" };

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const lang = payload.lang === "ar" ? "ar" : "en";
    const cabinClass = CABIN_MAP[(payload.cabinClass || "E").toUpperCase()] || "ECONOMY";
    const legs = Array.isArray(payload.legs) ? payload.legs.filter(Boolean) : [];

    if (!legs.length)
      return json(400, cors, { error: "missing_legs" });

    const itineraries = legs.map((l, idx) => ({
      origin: String(l.origin || "").toUpperCase(),
      destination: String(l.destination || "").toUpperCase(),
      departureDate: l.date,
      isRequested: idx === (Number(payload.requestedLeg) || 0),
    }));

    const body = {
      channel: "WEB_DESKTOP",
      itineraries,
      cabinClass,
      ignoreInvalidPromoCode: true,
      passengers: buildPassengers(
        payload.adults,
        payload.children,
        payload.infants
      ),
    };
    if (payload.currency) body.currency = payload.currency;

    const res = await fetch(OFFERS_URL, {
      method: "POST",
      headers: officialHeaders(lang),
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (res.status === 204)
      return json(200, cors, { source: "qatarairways", offers: [], noResults: true });

    if (!res.ok)
      return json(res.status, cors, {
        error: "upstream_error",
        status: res.status,
        detail: text.slice(0, 400),
      });

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return json(502, cors, { error: "bad_upstream_json" });
    }

    const offers = (data.flightOffers || []).map((o) =>
      normalizeOffer(o, data.dictionaries)
    );

    return json(200, cors, {
      source: "qatarairways",
      requestedAt: new Date().toISOString(),
      alertMessages: data.alertMessages || [],
      stations: data.requestStationDetails || {},
      viaStations: data.viaStations || {},
      currency:
        offers.length && offers[0].cabins.ECONOMY
          ? offers[0].cabins.ECONOMY.currency
          : payload.currency || "QAR",
      count: offers.length,
      offers,
    });
  } catch (err) {
    return json(500, cors, { error: "proxy_failed", message: String(err) });
  }
};

function json(statusCode, cors, obj) {
  return {
    statusCode,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}
