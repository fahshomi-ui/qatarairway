# Original autocomplete: full capture and derived rule

Site: https://www.qatarairways.com/ar-qa/homepage.html
Query typed into "من": `ا`
Captured by reading the rendered `mat-option` nodes out of the saved page HTML
(`/home/ubuntu/browser_html/qatarairways_com_homepage.html_1787053279546.html`).
Stable across three page loads. Parsed rows saved to `orig_alef_rows.json`,
codes only in `orig_alef_codes.json`.

## Full captured order (50 rows)

AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN
LAD MRA MOW SVO DME VKO NYC JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA
ART HPN NQT QEW ZGB EMA PAR CDG XCR ORY PZU BAR

With the feed's `city` field for each:

| # | code | city | country |
|---|------|------|---------|
| 1 | AAT | التاي | الصين |
| 2 | BCM | Bacau | رومانيا |
| 3 | DMK | Bangkok | تايلاند |
| 4 | BJS | Beijing | الصين |
| 5 | PKX | بكين | الصين |
| 6 | PEK | بكين | الصين |
| 7 | GWD | Gwadar | باكستان |
| 8 | HAD | Halmstad | السويد |
| 9 | HNY | Hengyang | الصين |
| 10 | HBP | Hengyang | الصين |
| 11 | KSL | Kassala | السودان |
| 12 | LON | London | المملكة المتحدة |
| 13 | LGW | لندن | المملكة المتحدة |
| 14 | LHR | لندن | المملكة المتحدة |
| 15 | ZEP | London | المملكة المتحدة |
| 16 | QQU | London | المملكة المتحدة |
| 17 | STN | London | المملكة المتحدة |
| 18 | LCY | London | المملكة المتحدة |
| 19 | LTN | London | المملكة المتحدة |
| 20 | LAD | Luanda | أنجولا |
| 21 | MRA | Misurata | ليبيا |
| 22 | MOW | Moscow | روسيا |
| 23 | SVO | موسكو | روسيا |
| 24 | DME | موسكو | روسيا |
| 25 | VKO | Moscow | روسيا |
| 26 | NYC | New York | الولايات المتحدة الأمريكية |
| 27 | JFK | نيويورك | الولايات المتحدة الأمريكية |
| 28 | ALB | الباني | الولايات المتحدة الأمريكية |
| 29 | BGM | Binghamton | الولايات المتحدة الأمريكية |
| 30 | ITH | Ithaca | الولايات المتحدة الأمريكية |
| 31 | ISP | Long Island-Macarthur | الولايات المتحدة الأمريكية |
| 32 | SWF | New York | الولايات المتحدة الأمريكية |
| 33 | OGS | Ogdensburg | الولايات المتحدة الأمريكية |
| 34 | SLK | Saranac Lake | الولايات المتحدة الأمريكية |
| 35 | BUF | بافالو | الولايات المتحدة الأمريكية |
| 36 | SYR | سيراكيوز | الولايات المتحدة الأمريكية |
| 37 | EWR | نيويورك | الولايات المتحدة الأمريكية |
| 38 | LGA | نيويورك | الولايات المتحدة الأمريكية |
| 39 | ART | واترتاون | الولايات المتحدة الأمريكية |
| 40 | HPN | ويستشيستر | الولايات المتحدة الأمريكية |
| 41 | NQT | Nottingham | المملكة المتحدة |
| 42 | QEW | Leicester | المملكة المتحدة |
| 43 | ZGB | Nottingham | المملكة المتحدة |
| 44 | EMA | Nottingham | المملكة المتحدة |
| 45 | PAR | Paris | فرنسا |
| 46 | CDG | باريس | فرنسا |
| 47 | XCR | Paris | فرنسا |
| 48 | ORY | باريس | فرنسا |
| 49 | PZU | Port Sudan | السودان |
| 50 | BAR | Qionghai | الصين |

## The rule (now unambiguous)

**Grouping/order:** results are grouped by *destination city group* and the
groups run alphabetically on the group's Latin city name:
Altay(AAT) → Bacau → Bangkok → Beijing → Gwadar → Halmstad → Hengyang →
Kassala → London → Luanda → Misurata → Moscow → New York → Nottingham →
Paris → Port Sudan → Qionghai.

Within a group the feed's own row order is kept: the "all airports" city row
first (BJS, LON, MOW, NYC, PAR), then that city's airports and rail/bus
stations (PKX, PEK / LGW, LHR, ZEP, QQU, STN, LCY, LTN / SVO, DME, VKO /
JFK … HPN / CDG, XCR, ORY).

Note rows 28-40: they belong to the **New York** group (all share country
الولايات المتحدة الأمريكية and are NYC-area stations: Albany, Binghamton,
Ithaca, Long Island, Newburgh, Ogdensburg, Saranac Lake, Buffalo, Syracuse,
Newark, LaGuardia, Watertown, Westchester), so a group can span many rows whose
own `city` differs — grouping is by `cityCode`, not by the `city` string.
Likewise 41-44 are the Nottingham group (incl. QEW Leicester) and 45-48 Paris.

**Matching:** 50 rows out of 2517 match `ا`. So the filter is narrow, and it is
NOT a substring test over city+country+airport (that yields 1838). Tests already
ruled out: fold-alef word-prefix on city (249), unfolded word-prefix on city
(115), city+airport word-prefix (1073), airport-only word-prefix (1045),
city-only string-prefix (98), feed order with no filter. None reproduce it.

Since every captured group has a Latin city name from Altay→Qionghai and each
group's rows are contiguous, the practical approach is: filter on the query,
then group by `cityCode` and order groups by Latin city name, feed order within
the group. That reproduces the *ordering*; the *membership* rule still needs the
one remaining test — whether matching is done per city-group (a group is
included if ANY row in it matches) which would explain why GWD's group appears
via country باكستان? no — more likely because a group matches if the query hits
the group's Arabic airport text, e.g. مطار باكاو has no ا-initial word but
رومانيا does not either… Next: capture a second query (e.g. "ل" and "b") and
diff to isolate the field. Do NOT guess again without a second capture.

## Deployment reminders

Live: https://qatarairwaysi-92510758.netlify.app
`cd /home/ubuntu/qa_full_site && python3 inject_static.py && python3 place_data.py && NETLIFY_AUTH_TOKEN="nfp_ew3FLNXKDqyiELxJTP5B5KwHDivFvHVuc982" netlify deploy --prod --dir . --site $(python3 -c "import json;print(json.load(open('.netlify/state.json'))['siteId'])")`
Airport data source: https://www.qatarairways.com/content/Qatar/common/cityLists/citylists/cityList_ar.json (local copy /home/ubuntu/Downloads/cityList_ar.json, 2517 records)
