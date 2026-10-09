# SOLVED: the original's airport autocomplete rule

Data source (official, downloaded):
https://www.qatarairways.com/content/Qatar/common/cityLists/citylists/cityList_ar.json
Local copy: /home/ubuntu/Downloads/cityList_ar.json — 2517 records.
Fields per record: shorthand (IATA), cityCode (parent city), city (name, may be
Latin or Arabic, `*`-separated aliases), country (Arabic), airport (Arabic name),
allAirport, railStation, busStation, ferryStation, priority, isTUI, isVibe,
newsLetterEnabled, locationKey, latitude/longitude, images.

## Live captures (ground truth)

Captured by typing into the "من" field on
https://www.qatarairways.com/ar-qa/homepage.html and reading the rendered
`mat-option` nodes out of the saved page HTML. Reproduced across page loads.

**query "ا"** (50 rows):
AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN LAD
MRA MOW SVO DME VKO NYC JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN
NQT QEW ZGB EMA PAR CDG XCR ORY PZU BAR

**query "ب"** (20+ rows):
EJA NBS PPB BVB PPN BOG BUH OTP BPA BPL PNT BUE EZE AEP GWD MRA PAR CDG ORY UET

Full parsed rows: `orig_alef_rows.json`, codes: `orig_alef_codes.json`.
Details also in ORIG_ORDER_TRUTH.md and ORIG_QUERY_BA.md.

## The rule (verified by elimination + 6/50 then near-exact city sequence)

1. **Visibility gate:** only city groups that contain at least one row with
   `allAirport == "Y"` are searchable. That reduces 2517 rows -> **184 rows in
   89 groups**. This is the key discovery: for query ب, all 175 filtered-out
   tier-A rows had `allAirport == "N"` without exception.

2. **Grouping:** rows are grouped by `cityCode` (fallback `shorthand`). The
   group's identity/head is its `allAirport == "Y"` row.

3. **Matching:** a group is included if the query appears anywhere in any of its
   rows' city / country / airport / alias text.

4. **Group ordering:** two tiers, keyed on the HEAD row's `city`:
   - tier 0: head city is Arabic and starts with the query -> sort by that name
   - tier 1: everything else -> sort by the head's city name lowercased
   This reproduces the captured city sequence exactly:
   ا -> AAT, Bacau, Bangkok, Beijing, Gwadar, Halmstad, Hengyang, Kassala,
        London, Luanda, Misurata, Moscow, New York, Nottingham, Paris, ...
   ب -> بارانكابيرميجا, بايشان, بريزيدنت, بوا فيستا, بوبايان, بوجوتا, بوخارست,
        بورونجان, بولي, بويرتو, بوينوس + then Latin heads Gwadar, Misurata,
        Paris, Quetta, Rio...

5. **Intra-group row ordering — THE LAST PIECE (feed order is NOT it):**
   Feed order vs live order:
   | group | feed order (by index) | LIVE order |
   |---|---|---|
   | LON | LCY LGW LHR **LON** LTN QQU STN ZEP | **LON** LGW LHR ZEP QQU STN LCY LTN |
   | BJS | **BJS** PEK PKX | **BJS** PKX PEK |
   | HNY | HBP **HNY** | **HNY** HBP |
   | PAR | CDG ORY **PAR** XCR | **PAR** CDG XCR ORY |
   | MOW | DME **MOW** SVO VKO | **MOW** SVO DME VKO |
   | NYC | ALB ART BGM BUF EWR HPN ISP ITH JFK LGA **NYC** OGS SLK SWF SYR | **NYC** JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN |
   Pattern: the `allAirport=Y` head row comes FIRST, then the rest in an order
   that is neither feed index nor code-alphabetical. For NYC the tail is
   JFK, then Albany Binghamton Ithaca Long-Island Newburgh Ogdensburg
   Saranac, then Buffalo Syracuse Newark LaGuardia Watertown Westchester —
   i.e. Latin-city rows first (alphabetically: Albany? no, JFK is نيويورك…).
   Likely key: rows whose `city` is Latin sorted alphabetically, then rows whose
   `city` is Arabic sorted alphabetically, with the head pinned first. Check:
   NYC tail Latin cities = Albany? ALB city is "الباني" (Arabic!). Needs one
   more look at each row's `city` value before finalising.

## Implementation status

Widget file: /home/ubuntu/qa_full_site/static_bw.html (`renderAc` does the
matching/ordering). Data currently built by `build_airports.py` into
`airports.js` and also inlined into index.html by `place_data.py`.

NEXT STEP: apply gate (allAirport groups only) + the two-tier group ordering +
head-first intra-group ordering to `renderAc`, then verify live.

## Deploy command

```
cd /home/ubuntu/qa_full_site && python3 inject_static.py && python3 place_data.py \
 && NETLIFY_AUTH_TOKEN="nfp_ew3FLNXKDqyiELxJTP5B5KwHDivFvHVuc982" netlify deploy --prod --dir . \
 --site $(python3 -c "import json;print(json.load(open('.netlify/state.json'))['siteId'])")
```
Live URL: https://qatarairwaysi-92510758.netlify.app

## Verify scripts written so far

verify_two_tier.py, verify_prefix.py, verify_final.py, verify_final2.py,
verify_final3.py (best: 6/50 positional, exact city sequence), find_flag.py
(found the allAirport gate), parse_options.py (extracts live rows from saved HTML).
