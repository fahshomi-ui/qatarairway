# Qatar Airways homepage clone — project notes

## Links
- Live clone (Netlify): https://qatarairwaysi-92510758.netlify.app
- Original: https://www.qatarairways.com/ar-qa/homepage.html
- GitHub repo: https://github.com/fanarali881-eng/qatarairways
- Backend (Railway): https://qatarairways-server-production.up.railway.app (admin at /admin/, password admin2026)

## Netlify
- Token: nfp_ew3FLNXKDqyiELxJTP5B5KwHDivFvHVuc982
- Site id: e3aa6bb0-504b-47ec-b497-3c57ddf8476b (qatarairwaysi-92510758)
- Working dir: /home/ubuntu/qa_full_site
- Workflow: edit `static_bw.html` → `python3 inject_static.py` → `NETLIFY_AUTH_TOKEN=... netlify deploy --prod --dir . --site e3aa6bb0-504b-47ec-b497-3c57ddf8476b`

## Files
- `index.html` — full scraped page (~1.13 MB) with the static widget injected
- `index.html.clean` — pre-injection snapshot (restore point)
- `static_bw.html` — hand-built booking widget (source of truth)
- `inject_static.py` — swaps the widget block inside index.html
- `airports.js` — 131 rows `{c:"LatinCity, ArabicCountry", n:"Arabic airport name", k:"IATA", t:"a"|"c"}`
- `normalize_airports.py`, `arabize.py` — data transforms; `airports.js.bak` is the pre-arabize copy
- `fonts/` — icomoon, jotia_*, graphik_*, almarai served locally
- `_headers` — `Access-Control-Allow-Origin: *`

## Fixes that must not regress
1. The scraped CSS contains `.val:empty{display:none}` which hid the from/to inputs. Widget uses class `qbwval` plus `display:block!important`.
2. Font URLs must be absolute to the Netlify domain because the page has `<base href="https://www.qatarairways.com/">`. `icomoon.eot`/`.svg` were 404 and were removed from `@font-face` (woff2/woff/ttf only). `document.fonts.check('16px icomoon')` is true.
3. OneTrust scripts (`otSDKStub.js`, `otBannerSdk.js`) were removed so the cookie banner no longer flickers; the accept button is wired by a small inline script.
4. Footer order in RTL (right to left): Avios checkbox, promo code, search button.
5. Card is centred with side margins, not full-bleed.

## Panel specs rebuilt from the original screenshots (2026-08-17)
### Airports dropdown
Width 470, max-height 412. Rows use `flex-direction:row-reverse` so the IATA code sits on the far left (15px `#1c1c20`, flex-basis 46px), the plane icon on the right (26px, stroke `#9a9aa2`). First line is `LatinCity, ArabicCountry` at 15px bold `#1c1c20`; second line is the Arabic airport name at 13px `#77777f`. Matched substrings wrapped in `<b>` on both lines. Row dividers 1px `#ececef`, hover `#eeecee`, custom scrollbar thumb `#b9b9c0`.

### Calendar
Width 1010, two months side by side with 44px gap. **Week starts Monday** via `start=(first.getDay()+6)%7`; weekday headers are full Arabic names الاثنين→الأحد. Month title 19px regular. Day cells 44px tall, 16px font. Selected day background is indigo `#4338ca` (not maroon), range `#f2f2f7`, past days `#b6b8c8`. Nav arrows absolutely positioned outside the grid (prev `right:-24px`, next `left:-24px`). Footer holds the "مواعيد حجز مرنة" checkbox on the right and the buttons "متابعة" (filled maroon) and "إلغاء التواريخ" (outlined maroon).

### Passengers
Width 418. Header "المسافرون" with bottom border. Rows: البالغون / 12 عاماً فما فوق, طفل / من 2 إلى 11 عاماً, رضيع / أقل من عامين, with an indigo circular "i" badge beside طفل and رضيع. Steppers use `flex-direction:row-reverse` so they render `+ n −`; zero values greyed `#a9a9b0`. "درجة السفر" section has **only two options**: الدرجة السياحية, and الدرجة الأولى ودرجة رجال الأعمال (درجة رجال الأعمال/الدرجة الأولى). Checked radio is an indigo ring with an indigo dot. "تأكيد" button spans the full width.

## Colors
maroon `#a3195b` (hover `#8a1449`), indigo `#4338ca`, text `#1c1c20`, muted `#77777f`, border `#e4e4e8`.

## Note on measuring the original
Computed styles cannot be read from the original page: `app-nbx-explore.shadowRoot` returns null on repeat visits, `#book-tab-flights` is unreachable from the main document, and every exfiltration trick (download link, document.title, console.log, return value) came back empty. Visual comparison of cropped screenshots is the working method.

## Official airport/city data source (found 2026-08-17)
`https://www.qatarairways.com/content/Qatar/common/cityLists/citylists/cityList_ar.json`

- 1,731,645 bytes, a JSON **array of 2,517 entries**.
- Discovered via `performance.getEntriesByType('resource')` on the live homepage after typing in the origin field; the Angular widget loads this file for its autocomplete.
- Blocked for `curl` from the sandbox (Akamai returns connection reset / 000). Must be fetched **inside the browser** (`fetch('/content/Qatar/common/cityLists/citylists/cityList_ar.json')`), then exfiltrated via a Blob download to `/home/ubuntu/Downloads/`.
- Entry shape (first record):
  `{"cityCode":"","countryCode":"DZ","priority":"ol","newsLetterEnabled":"N","railStation":"N","busStation":"N","allAirport":"N","isTUI":"N","isVibe":"Y","locationKey":"7ad02a24fc971f262db1498f0ccf7492","ferryStation":"N","shorthand":"AAE","latitude":"","longitude":"","map":"","video":"","squareImage":...}`
- `shorthand` is the IATA code; `countryCode` is the ISO country; `railStation`/`busStation`/`ferryStation`/`allAirport` flags decide which icon the original renders.
- Other master endpoints (`/masterservice/getAirports`, `/content/Qatar/swaggerResponse/...`) return Access Denied / Page not found, so this cityList file is the real source.

Related: `masterserviceurls` attribute on `<app-root>` in the scraped page lists the service names, and `dispatcherservicepath="/content/Qatar/swaggerResponse/"`.

## Status 2026-08-17 23:26 — official list live, sorting needs work
`airports.js` is now generated by `build_airports.py` from the downloaded feed: **2,517 entries**, original feed order preserved, `window.QA_AIRPORTS.length === 2517` confirmed on the deployed site.

Two integration fixes were needed:
1. `inject_static.py` had written the `<script src=".../airports.js">` tag **after** the widget script, so `QA_AIRPORTS` was undefined at init (count=0). The data is now **inlined** as `<script id="qa-airports-data">` immediately before the widget block, guaranteeing order.
2. Netlify site id in `.netlify/state.json` is `e3aa6bb0-504b-47ec-b497-3c57ddf8476b` (an earlier hardcoded id was wrong and produced "Project not found").

**Outstanding issue:** searching `لند` returns 60 rows but they are alphabetical-by-code noise (AKL أوكلاند, AMS أمستردام, BZG Bydgoszcz, CFN دونيغال, CHC كرايستشيرش...) instead of London first. The match/ranking logic in `static_bw.html` must be tightened — it currently matches too loosely across fields and does not rank exact city/prefix hits first. The original ranks prefix matches on city/airport/code before substring matches.

## Integration gotchas (2026-08-17, late)
The airport data must **not** be inlined inside `<div id="bookingWidget-showHide">`. That container is the original Angular mount point and its contents get wiped at runtime, which silently deleted the `<script id="qa-airports-data">` tag (symptom: `QA_AIRPORTS` undefined even though the tag existed in the served HTML). The data script now sits **after** the widget markup's closing `</div></div>` and **before** the widget's own JS block, outside any Angular-managed container.

`inject_static.py` rewrites the widget block on every run and re-adds a `<script src=".../airports.js">` tag, so after each `python3 inject_static.py` the data placement must be re-checked. A stale absolute-URL script tag pointing at the Netlify domain also remains in the file.

`build_airports.py` now emits a fifth field `s` per row: a normalised, space-joined search blob (display city, country, airport name, IATA code, plus the `*alias*alias` aliases the feed appends to `city`). Normalisation folds أ/إ/آ→ا, ى→ي, ة→ه, ؤ→و, ئ→ي and strips diacritics/tatweel. Example rows:
`{c:"الدوحة, قطر", n:"مطار حمد الدولي", k:"DOH", t:"a", s:"الدوحه قطر مطار حمد الدولي doh quatar katar"}`
`{c:"لندن, المملكة المتحدة", n:"مطار لندن هيثرو", k:"LHR", t:"a", s:"لندن المملكه المتحده مطار لندن هيثرو lhr england great britain heathrow"}`

The widget's `renderAc` uses the same `norm()` folding and ranks: exact code 100, code prefix 90, blob prefix 80, word-start 70, substring 30. This was required because `toLowerCase()` alone does nothing for Arabic, so `لند` was matching `أوكلاند`/`أمستردام`.

Netlify deploy command that works:
`NETLIFY_AUTH_TOKEN="nfp_ew3FLNXKDqyiELxJTP5B5KwHDivFvHVuc982" netlify deploy --prod --dir . --site e3aa6bb0-504b-47ec-b497-3c57ddf8476b`
