#!/usr/bin/env python3
"""Check which feed field reproduces the live original ordering for query "ا".

Live order captured from qatarairways.com (see ORIG_ORDER_ALEF.md):
"""
import json

LIVE = [
    "AAT", "BCM", "DMK", "BJS", "PKX", "PEK", "GWD", "HAD",
    "HNY", "HBP", "KSL", "LON", "LGW", "LHR", "ZEP", "QQU", "STN", "LCY",
]

raw = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
rows = raw if isinstance(raw, list) else next(
    v for v in raw.values() if isinstance(v, list)
)
by_code = {r.get("shorthand"): r for r in rows}

print(f"{'code':6}{'cityCode':10}{'priority':10}{'locationKey':22}{'city':24}country")
print("-" * 96)
for code in LIVE:
    r = by_code.get(code)
    if not r:
        print(f"{code:6}MISSING")
        continue
    print(
        f"{code:6}"
        f"{str(r.get('cityCode')):10}"
        f"{str(r.get('priority')):10}"
        f"{str(r.get('locationKey'))[:20]:22}"
        f"{str(r.get('city'))[:22]:24}"
        f"{r.get('country')}"
    )

# Does the feed's own index order match the live order?
idx = {r.get("shorthand"): i for i, r in enumerate(rows)}
print("\nfeed index for each live row:")
print([idx.get(c) for c in LIVE])
