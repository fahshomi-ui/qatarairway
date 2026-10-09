#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, html, collections

recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
def dec(s): return html.unescape(s or "").strip()

by = {}
for r in recs:
    c = (r.get("shorthand") or "").strip().upper()
    if c and c not in by: by[c] = r

LIVE_TA = "YTO YYZ YTZ TCI TFS TFN DMK GWD LON LGW LHR ZEP QQU STN LCY LTN NYC JFK BGM".split()
LIVE_A  = "AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN".split()

print("=== priority values of LIVE rows (query ت) ===")
for c in LIVE_TA:
    r = by.get(c)
    if not r: print("  %-4s MISSING" % c); continue
    print("  %-4s pri=%-4r all=%s city=%r" % (c, r.get("priority"), r.get("allAirport"), dec(r.get("city"))))

print()
print("=== priority distribution over the whole feed ===")
cnt = collections.Counter((r.get("priority") or "").strip() for r in recs)
for k, v in cnt.most_common(): print("   %-6r %d" % (k, v))

print()
print("=== how many rows have priority of the live set ===")
livepri = set((by[c].get("priority") or "").strip() for c in LIVE_TA if c in by)
print("   live priorities:", livepri)
n = sum(1 for r in recs if (r.get("priority") or "").strip() in livepri)
print("   feed rows with those priorities:", n)
