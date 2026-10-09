#!/usr/bin/env python3
"""Find the feed flag that separates rendered rows from filtered-out rows.

Captured for 'ب' (tier-A, city starts with ب), in order:
  EJA NBS PPB BVB PPN BOG BUH OTP BPA BPL PNT BUE EZE AEP
My sorted tier-A has 189 rows; only these 14 were rendered, at scattered
positions (8,43,68,95,101,104,105,106,128,141,150,154,153,152).
So a per-row flag must gate visibility. Find it.
"""
import html
import json
import re
import unicodedata
from collections import Counter

MARKS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def clean(t):
    return MARKS.sub("", unicodedata.normalize("NFKC", html.unescape(t or ""))).strip()


recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))

rows = []
for i, r in enumerate(recs):
    code = (r.get("shorthand") or "").strip().upper()
    if not code:
        continue
    r["_i"] = i
    r["_code"] = code
    r["_city"] = clean(r.get("city")).split("*")[0].strip()
    rows.append(r)

SHOWN = set("EJA NBS PPB BVB PPN BOG BUH OTP BPA BPL PNT BUE EZE AEP".split())

tierA = [r for r in rows if r["_city"].startswith("ب")]
shown = [r for r in tierA if r["_code"] in SHOWN]
hidden = [r for r in tierA if r["_code"] not in SHOWN]

print("tierA=%d shown=%d hidden=%d" % (len(tierA), len(shown), len(hidden)))

keys = set()
for r in tierA:
    keys.update(k for k in r if not k.startswith("_"))

print("\n%-22s %-28s %s" % ("field", "shown values", "hidden values"))
for k in sorted(keys):
    cs = Counter(str(r.get(k, "")) for r in shown)
    ch = Counter(str(r.get(k, "")) for r in hidden)
    # only report low-cardinality fields (flags)
    if len(cs) <= 4 and len(ch) <= 6:
        print("%-22s %-28s %s" % (k, dict(cs), dict(ch)))
