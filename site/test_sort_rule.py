#!/usr/bin/env python3
"""Find the sort key that reproduces the live original order for query "ا".

Key insight from verify_citycode_order.py: the feed's `city` field is
HTML-entity encoded, and the *decoded* values for the live sequence are:

    التاي, Bacau, Bangkok, Beijing, Beijing, Beijing, Gwadar, Halmstad,
    Hengyang, Hengyang, Kassala, London, London, ...

which IS ascending if you ignore the leading Arabic entry and compare the
Latin `city` field. So the original sorts by the feed's `city` field
(the canonical, mostly-Latin city name), NOT by the localized display label
and NOT by the airport code. Within one city, the feed's own row order is kept
(BJS before PKX before PEK; LON before LGW/LHR/ZEP/QQU/STN/LCY).
"""
import html
import json

LIVE = [
    "AAT", "BCM", "DMK", "BJS", "PKX", "PEK", "GWD", "HAD",
    "HNY", "HBP", "KSL", "LON", "LGW", "LHR", "ZEP", "QQU", "STN", "LCY",
]

raw = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
rows = raw if isinstance(raw, list) else next(
    v for v in raw.values() if isinstance(v, list)
)


def dec(v):
    return html.unescape(v) if isinstance(v, str) else v


for i, r in enumerate(rows):
    r["_i"] = i
    r["_city"] = dec(r.get("city")) or ""
    r["_country"] = dec(r.get("country")) or ""
    r["_airport"] = dec(r.get("airport")) or ""
    r["_code"] = r.get("shorthand") or ""

by_code = {r["_code"]: r for r in rows}

print("Live sequence with decoded city field:")
for c in LIVE:
    r = by_code.get(c)
    print(f"  {c:5} city={r['_city']!r:22} cityCode={str(r.get('cityCode')):6} feedIdx={r['_i']}")

# Is the decoded city field ascending across the live sequence?
cities = [by_code[c]["_city"] for c in LIVE]
print("\nis city field non-decreasing?",
      all(cities[i] <= cities[i + 1] for i in range(len(cities) - 1)))

# Now simulate: filter rows matching "ا" the way the widget does, sort by
# (city, feed index) and compare the head against the live sequence.
Q = "ا"


def norm(s):
    out = []
    for ch in s:
        if "\u0610" <= ch <= "\u061A" or "\u064B" <= ch <= "\u065F":
            continue
        if ch in "\u0623\u0625\u0622":
            ch = "\u0627"
        out.append(ch)
    return "".join(out).lower().strip()


qn = norm(Q)
matched = [
    r for r in rows
    if qn in norm(f"{r['_city']} {r['_country']} {r['_airport']} {r['_code']}")
]
print(f"\nmatched rows for {Q!r}: {len(matched)}")

# Group city rows with their stations: sort by city key, then feed index.
matched.sort(key=lambda r: (r["_city"], r["_i"]))
got = [r["_code"] for r in matched[: len(LIVE)]]
print("\nsimulated head:", got)
print("live head     :", LIVE)
print("exact match   :", got == LIVE)
hits = sum(1 for a, b in zip(got, LIVE) if a == b)
print(f"positional hits: {hits}/{len(LIVE)}")
