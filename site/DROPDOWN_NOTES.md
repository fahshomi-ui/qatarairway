# Original Qatar Airways booking-widget dropdowns — observed structure

Source: https://www.qatarairways.com/ar-qa/homepage.html (Angular widget, Shadow DOM)

## Field element IDs on the original
- Origin input: `mat-input-4` (label `من`, role combobox)
- Destination input: `mat-input-5` (label `إلى`)
- Depart date: `dpFromDate` / `bw-cal-2-depart` (value like `17 أغسطس 2026`)
- Return date: `dpToDate` (value like `24 أغسطس 2026`)
- Passengers/cabin: `mat-input-6` (value `1 المسافر الدرجة السياحية`)
- Swap button: aria-label "Swap origin and destination"
- Tabs: `book-tab-flights`, `book-tab-flightsandhotels`, `book-tab-managebooking`, `book-tab-flightstatus`

## Airport autocomplete panel behaviour
Typing at least 2-3 Arabic characters opens a scrollable list. Each row shows three parts:
1. small line: `City, Country` in Latin+Arabic mix, e.g. `London, المملكة المتحدة`
2. bold main line: airport or city name in Arabic, e.g. `لندن` / `مطار لندن هيثرو`
3. IATA code on the opposite side, e.g. `LON`, `LGW`, `LHR`

A pin/plane icon appears at the start of each row (city rows get a location pin, airport rows get a plane).
Matched substring in the typed query is rendered bold inside the name.

### Live sample captured for query "لند"
| City, country | Name | Code |
| --- | --- | --- |
| London, المملكة المتحدة | لندن | LON |
| لندن, المملكة المتحدة | مطار لندن جاتويك | LGW |
| لندن, المملكة المتحدة | مطار لندن هيثرو | LHR |
| ريكيافيك, أيسلندا | ريكيافيك | REK |
| ريكيافيك, أيسلندا | مطار كيفلافيك الدولي | KEF |
| مانزيني, سوازيلند | مطار ماتسافا | MTS |
| Manzini, سوازيلند | مطار الملك مسواتي الثالث الدولي | SHO |
| لندن, المملكة المتحدة | محطة قطارات كينج كروس | QQK |
| لندن, كندا | محطة قطارات لندن | XDQ |
| أمستردام, هولندا | مطار سخيبول أمستردام | AMS |
| أوكلاند, نيوزيلندا | مطار أوكلاند الدولي | AKL |
| دبلن, ايرلندا | مطار دبلن | DUB |
| هلسنكي, فنلندا | مطار هلسنكي فانتا | HEL |
| وارساو, بولندا | مطار وارسو شوبان | WAW |
| Amsterdam, هولندا | محطة قطار أمستردام المركزية | ZYA |
| Bydgoszcz, بولندا | مطار بيدجوشتش إجناسي يان بادرفسكي | BZG |
| Dunedin, نيوزيلندا | مطار دونيدن الدولي | DUD |
| Groningen, هولندا | مطار خرونينجن إيلد | GRQ |
| Ivalo, فنلندا | مطار إفالو | IVL |
| Joensuu, فنلندا | مطار جوينسو | JOE |
| Jyvaskyla, فنلندا | مطار يوفاسكولا | JYV |
| Kajaani, فنلندا | مطار كاجاني | KAJ |
| Kemi/Tornio, فنلندا | مطار كيمي-تورنيو | KEM |

The panel is rendered inside the widget's Shadow DOM, so `document.getElementById('mat-input-4')` from the page context returns null — only real browser input events (browser_input) reach it. This means the panel HTML cannot be exfiltrated by console script; it must be rebuilt.

## Plan for the clone
Rebuild these three dropdowns as static HTML/CSS/JS in `static_bw.html` with the same visual structure (icon + city,country line + bold name + IATA code), a real month calendar for the two date fields, and a passenger/cabin stepper panel. Airport data: embed a list of Qatar Airways destinations with Arabic names and IATA codes.
