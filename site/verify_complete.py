#!/usr/bin/env python3
"""Complete rule test.

Intra-group order (from live NYC/LON/PAR/MOW/BJS/HNY):
  1. head row (allAirport=Y) pinned first
  2. remaining rows: Latin-city rows sorted by city name, then Arabic-city rows
     sorted by city name.
Check NYC:
  Latin: Binghamton(BGM) Ithaca(ITH) Long Island(ISP) New York(SWF)
         Ogdensburg(OGS) Saranac Lake(SLK)
  live tail after JFK: ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN
  ALB city = الباني (Arabic) yet appears BEFORE the Latin block -> so JFK and ALB
  are special. JFK city=نيويورك, ALB city=الباني.
  Hypothesis: sort by the AIRPORT name? JFK=مطار جون إف كينيدي, ALB=مطار ألباني
  Arabic alphabetical on airport name:
    مطار أديرونداك(SLK) مطار ألباني(ALB) مطار أوجدينسبورج(OGS) ...
  That doesn't put JFK first either.
  Try: sort by Latin/English airport-city, i.e. the value used for the
  destination code order in the feed... Let's just brute force which single key
  reproduces the live tail.
"""
import html
import json
import re
import unicodedata

MARKS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def clean(t):
    return MARKS.sub("", unicodedata.normalize("NFKC", html.unescape(t or ""))).strip()


recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
byc = {}
for i, r in enumerate(recs):
    c = (r.get("shorthand") or "").strip().upper()
    if not c or c in byc:
        continue
    r["_i"] = i
    r["_code"] = c
    r["_city"] = clean(r.get("city")).split("*")[0].strip()
    r["_airport"] = clean(r.get("airport"))
    byc[c] = r

LIVE = {
    "NYC": "NYC JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN".split(),
    "LON": "LON LGW LHR ZEP QQU STN LCY LTN".split(),
    "PAR": "PAR CDG XCR ORY".split(),
    "MOW": "MOW SVO DME VKO".split(),
    "BJS": "BJS PKX PEK".split(),
    "HNY": "HNY HBP".split(),
}

# candidate sort keys for the tail
CANDS = {
    "feed_i": lambda r: r["_i"],
    "code": lambda r: r["_code"],
    "city": lambda r: r["_city"],
    "airport": lambda r: r["_airport"],
    "locationKey": lambda r: str(r.get("locationKey", "")),
    "priority+code": lambda r: (str(r.get("priority", "")), r["_code"]),
    "lat": lambda r: str(r.get("latitude", "")),
}

for cc, order in LIVE.items():
    tail = order[1:]
    print("=== %s tail live: %s" % (cc, " ".join(tail)))
    for name, kf in CANDS.items():
        got = sorted(tail, key=lambda c: kf(byc[c]))
        mark = "  <== MATCH" if got == tail else ""
        print("    %-14s %s%s" % (name, " ".join(got), mark))
    print()
