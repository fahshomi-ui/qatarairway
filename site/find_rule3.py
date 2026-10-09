#!/usr/bin/env python3
"""Narrow down the original's matching rule for 'ا'.

Live: AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY

Observations from the captured rows:
  AAT التاي        -> city label starts with ا
  BCM Bacau        -> city Latin, airport مطار باكاو (no ا start)... country رومانيا no
  BJS Beijing      -> airport 'جميع المطارات'
  LON London       -> airport 'لندن'
So the matched token is not obvious from display fields alone.
Maybe the feed carries an explicit Arabic 'cityName' or alias we are ignoring.
Dump the raw records for these codes to see every field.
"""
import json

CODES = ("AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR "
         "ZEP QQU STN LCY").split()

recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))

by_code = {}
for r in recs:
    c = (r.get("shorthand") or "").strip().upper()
    if c and c not in by_code:
        by_code[c] = r

print("=== matched rows: every field ===")
for c in CODES:
    r = by_code.get(c)
    if not r:
        print(c, "NOT IN FEED")
        continue
    print("\n--- %s ---" % c)
    for k, v in r.items():
        if v not in (None, "", "N"):
            print("    %-16s %r" % (k, v))

print()
print("=== rows we wrongly include (should NOT match) ===")
for c in ("AAE", "AAL", "AAP", "AAQ", "AAR", "YXX", "ABI"):
    r = by_code.get(c)
    if not r:
        continue
    print("\n--- %s ---" % c)
    for k, v in r.items():
        if v not in (None, "", "N"):
            print("    %-16s %r" % (k, v))
