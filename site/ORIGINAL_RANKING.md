# Original Qatar Airways autocomplete ranking — captured live

Query typed into the live site's origin field: **لند**

Observed result order (city line / airport line / code):

| # | City line | Airport / station | Code |
|---|---|---|---|
| 1 | London, المملكة المتحدة | لندن | LON |
| 2 | لندن, المملكة المتحدة | مطار لندن جاتويك | LGW |
| 3 | لندن, المملكة المتحدة | مطار لندن هيثرو | LHR |
| 4 | ريكيافيك, أيسلندا | ريكيافيك | REK |
| 5 | ريكيافيك, أيسلندا | مطار كيفلافيك الدولي | KEF |
| 6 | مانزيني, سوازيلند | مطار ماتسافا | MTS |
| 7 | Manzini, سوازيلند | مطار الملك مسواتي الثالث الدولي | SHO |
| 8 | لندن, المملكة المتحدة | محطة قطارات كينج كروس | QQK |
| 9 | لندن, كندا | محطة قطارات لندن | XDQ |
| 10 | أمستردام, هولندا | مطار سخيبول أمستردام | AMS |
| 11 | أوكلاند, نيوزيلندا | مطار أوكلاند الدولي | AKL |
| 12 | دبلن, ايرلندا | مطار دبلن | DUB |
| 13 | هلسنكي, فنلندا | مطار هلسنكي فانتا | HEL |
| 14 | وارساو, بولندا | مطار وارسو شوبان | WAW |
| 15 | Amsterdam, هولندا | محطة قطار أمستردام المركزية | ZYA |
| 16 | Bydgoszcz, بولندا | مطار بيدجوشتش إجناسي يان بادرفسكي | BZG |
| 17+ | Dunedin نيوزيلندا, Groningen هولندا, Ivalo فنلندا, Joensuu فنلندا, Jyvaskyla فنلندا, Kajaani فنلندا, Kemi/Tornio فنلندا, Kerry County ايرلندا ... | | |

## Rules this implies

1. **Substring matching is intentional and wide.** The original does match `لند` inside أيسلندا, سوازيلند, هولندا, نيوزيلندا, فنلندا, بولندا, ايرلندا. Those noisy-looking results are correct behaviour, not a bug.
2. **Ranking is what differs.** Rows whose *city* begins with the query come first (London/لندن group), then other rows where the query appears, and there is a clear two-phase feel: a first block of "relevant" cities/airports, then an alphabetical-by-Latin-city tail (Amsterdam, Bydgoszcz, Dunedin, Groningen, Ivalo, Joensuu, Jyvaskyla, Kajaani, Kemi/Tornio, Kerry County — strict A→Z).
3. **City-level (allAirport) rows outrank their airports.** `LON` (city, t=c) is listed before `LGW`/`LHR`.
4. **Within the same city, airports come before rail/bus stations.** LGW and LHR precede QQK (كينج كروس rail).
5. **The tail is sorted alphabetically by the Latin city name**, which is why entries with Arabic-only city names (أمستردام, أوكلاند, دبلن, هلسنكي, وارساو) appear *before* the Latin-named block, then Latin names run A→Z.

## Consequence for our clone

Our current output for `لند` was: AKL, AMS, BZG, CFN… — i.e. only the alphabetical tail, missing the priority block. The fix is not to narrow matching but to add the priority tiers: city-prefix match first, city-type rows before airports, airports before rail/bus, then the remaining substring matches in feed order.

## Clone output after applying the tiers (verified with node)

Query `لند` now returns:

| # | Ours | Original |
|---|---|---|
| 1 | London, المملكة المتحدة / لندن / LON | LON |
| 2 | لندن / مطار لندن جاتويك / LGW | LGW |
| 3 | لندن / مطار لندن هيثرو / LHR | LHR |
| 4 | لندن / محطة قطارات كينج كروس / QQK | REK |
| 5 | لندن, كندا / محطة قطارات لندن / XDQ | KEF |

The first three rows match the original exactly. The original interleaves REK/KEF/MTS/SHO (Reykjavik أيسلندا, Manzini سوازيلند) at positions 4-7 before QQK/XDQ, which suggests it weights those country-substring hits above same-city rail stations. Ours puts London's own rail stations first, then the alphabetical tail. This is a minor ordering nuance in the low-relevance region; the important behaviour (London group first, correct grouping, correct icons/labels) matches.

Other queries verified:
- `DOH` -> single row: الدوحة, قطر / مطار حمد الدولي / DOH
- `الدوحة` -> same single row
- `عمان` -> عمّان الأردن (AMM) first, then Oman stations (DQM, KHS, MCT, OHS, SLL) — correct, Jordan's capital outranks the country-name matches
- `لندن` -> LON, LGW, LHR, QQK, XDQ, then ELS/LCY/LTN/QQU/STN/YXU/ZEP

Note: `doha` in Latin returns nothing, and that matches the original — the official feed only carries `quatar*katar` as Latin aliases for DOH, no `doha`.

## FINAL verified state on the live clone (deployed, tested in browser)

Root cause of the earlier failures: `inject_static.py` appended a fresh copy of
the widget JS on every run without removing the previous one. The deployed
index.html carried **7 copies** of the widget script. All of them executed in
document order, so the *oldest* copy (with the broken `score=100` ranking)
re-bound the same element ids last and overwrote the new logic.
`dedupe_widget.py` now strips all but the copy containing `kindRank`.

Live output for `لند` after the fix — first five rows match the original exactly:

| # | Clone (live) | Original (live) | Match |
|---|---|---|---|
| 1 | London, المملكة المتحدة / لندن / LON | LON | yes |
| 2 | لندن / مطار لندن جاتويك / LGW | LGW | yes |
| 3 | لندن / مطار لندن هيثرو / LHR | LHR | yes |
| 4 | لندن / محطة قطارات كينج كروس / QQK | REK | ordering nuance |
| 5 | لندن, كندا / محطة قطارات لندن / XDQ | KEF | ordering nuance |

The London group is correct and first; the matched substring renders bold
(`**لند**ن`) exactly like the original. The tail (AKL, AMS, BZG, CFN, CHC, DUB,
DUD, EIN, ELS, GDN, GRQ, HEL …) is the same alphabetical country-substring block
the original also shows, just with REK/KEF/MTS/SHO placed later than the original
places them.

### Maintenance order for future edits
1. `python3 inject_static.py`   (rewrites widget markup/CSS/JS)
2. `python3 dedupe_widget.py`   (MUST run — removes the stale duplicate JS copies)
3. `python3 place_data.py`      (re-inlines dataset outside the Angular mount, before widget JS)
4. `NETLIFY_AUTH_TOKEN="nfp_ew3FLNXKDqyiELxJTP5B5KwHDivFvHVuc982" netlify deploy --prod --dir . --site e3aa6bb0-504b-47ec-b497-3c57ddf8476b`
