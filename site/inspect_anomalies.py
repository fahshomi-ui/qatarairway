#!/usr/bin/env python3
"""Inspect why YEA, LOO and XIK sort ahead of the Arabic-named cities."""
import html
import json

CODES = {"YEA", "LOO", "XIK"}

raw = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
rows = raw if isinstance(raw, list) else next(
    v for v in raw.values() if isinstance(v, list)
)

for r in rows:
    if (r.get("shorthand") or "").strip().upper() in CODES:
        print("code    :", r.get("shorthand"))
        print("  city  :", repr(html.unescape(r.get("city") or "")))
        print("  airport:", repr(html.unescape(r.get("airport") or "")))
        print("  country:", repr(html.unescape(r.get("country") or "")))
        print()
