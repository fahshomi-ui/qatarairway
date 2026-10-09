#!/usr/bin/env python3
"""Check what ordering the official feed uses, and what the widget shows."""
import json
import re

raw = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
rows = raw if isinstance(raw, list) else next(
    v for v in raw.values() if isinstance(v, list)
)
print("feed rows:", len(rows))
print("feed keys:", sorted(rows[0].keys()))
print()
print("first 10 rows in FEED order:")
for r in rows[:10]:
    code = r.get("shorthand") or r.get("code")
    print(f"  {code:5} | city={r.get('cityName')!r:28} | country={r.get('countryName')!r}")

# Now the built dataset used by the widget.
t = open("airports.js", encoding="utf-8").read()
entries = re.findall(r"\{c:\"(.*?)\", n:\"(.*?)\", k:\"(.*?)\", t:\"(.*?)\"", t)
print(f"\nwidget dataset rows: {len(entries)}")
print("first 10 in widget order:")
for c, n, k, tp in entries[:10]:
    print(f"  {k:5} | {c}")
