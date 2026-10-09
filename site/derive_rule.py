#!/usr/bin/env python3
"""Derive the original's matching + ordering rule from the 50-row capture."""
import html
import json
import re
import unicodedata

rows = json.load(open("/home/ubuntu/qa_full_site/orig_alef_rows.json", encoding="utf-8"))

# The parser split text on the highlighted letters; rejoin each row's parts.
captured = []
for r in rows:
    if not r["code"]:
        continue
    joined = "".join(r["parts"])
    captured.append({"code": r["code"], "text": joined})

print("captured rows:", len(captured))
codes = [c["code"] for c in captured]
print("order:", " ".join(codes))
print()

MARKS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def clean(t):
    return MARKS.sub("", unicodedata.normalize("NFKC", html.unescape(t or ""))).strip()


recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
feed = []
for i, r in enumerate(recs):
    code = (r.get("shorthand") or "").strip().upper()
    if not code:
        continue
    raw = clean(r.get("city"))
    parts = raw.split("*")
    feed.append({
        "i": i,
        "code": code,
        "city": parts[0].strip(),
        "aliases": [p.strip() for p in parts[1:] if p.strip()],
        "country": clean(r.get("country")),
        "airport": clean(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper(),
    })

by = {r["code"]: r for r in feed}
capset = set(codes)

print("=== city field of every captured row, in captured order ===")
for c in codes:
    r = by.get(c)
    if r:
        print("  %-4s  %-34s | %s" % (c, r["city"], r["country"]))

print()
print("=== how many feed rows have a city whose Latin form sorts in this range? ===")


def latin_of(r):
    """Latin city name for the row's city group, if any."""
    if r["city"] and r["city"][0].isascii() and r["city"][0].isalpha():
        return r["city"]
    for a in r["aliases"]:
        if a and a[0].isascii() and a[0].isalpha():
            return a
    return ""


missing = [c for c in codes if c not in by]
print("captured codes not in feed:", missing)

json.dump(codes, open("/home/ubuntu/qa_full_site/orig_alef_codes.json", "w"),
          ensure_ascii=False)
print("\nwrote orig_alef_codes.json")
