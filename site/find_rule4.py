#!/usr/bin/env python3
"""Reproduce the live original order for 'ا' exactly.

Live: AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY

Key insight from field dump: every matched row's `city` field is one of
التاي / Bacau / Bangkok / Beijing / بكين / Gwadar / Halmstad / Hengyang /
Kassala / London. Rows whose city is Annaba, البورج, ساماريندا, أنابا,
Abbotsford, Abilene, Adrar, Ahwaz, Aizawl do NOT appear.

Both البورج and التاي start with ا, yet only التاي matched -> so a plain
"city starts with ا" rule is wrong. But note the ORDER is alphabetical on the
Latin city name, and البورج/ساماريندا have no Latin sibling. Hypothesis: the
original is showing an alphabetical window (a page) of results, not all of them,
and the visible rows are simply the first page starting at التاي/Bacau.

Test: sort ALL rows by Latin-ish city key and see whether the captured sequence
appears as a contiguous run.
"""
import html
import json
import re
import unicodedata

EXPECTED = ("AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON "
            "LGW LHR ZEP QQU STN LCY").split()

MARKS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def clean(t):
    return MARKS.sub("", unicodedata.normalize("NFKC", html.unescape(t or ""))).strip()


recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))

rows = []
for i, r in enumerate(recs):
    code = (r.get("shorthand") or "").strip().upper()
    if not code:
        continue
    raw_city = clean(r.get("city"))
    parts = raw_city.split("*")
    rows.append({
        "i": i,
        "code": code,
        "city": parts[0].strip(),
        "aliases": [p.strip() for p in parts[1:] if p.strip()],
        "country": clean(r.get("country")),
        "airport": clean(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper(),
    })

by_code = {r["code"]: r for r in rows}

print("=== does the captured run appear contiguously when all rows are")
print("    grouped by city and ordered by city name? ===")

groups = {}
for r in rows:
    groups.setdefault(r["cityCode"] or r["code"], []).append(r)


def city_key(group):
    for r in group:
        c = r["city"]
        if c and c[0].isascii() and c[0].isalpha():
            return c.lower()
    return group[0]["city"]


ordered = []
for key in sorted(groups, key=lambda k: (city_key(groups[k]), groups[k][0]["i"])):
    ordered.extend(sorted(groups[key], key=lambda r: r["i"]))

seq = [r["code"] for r in ordered]
# find where AAT sits and print the following rows
if "AAT" in seq:
    p = seq.index("AAT")
    print("AAT at position %d of %d" % (p, len(seq)))
    print("run from AAT:", " ".join(seq[p:p + 18]))
    print("expected    :", " ".join(EXPECTED))
    print("MATCH" if seq[p:p + len(EXPECTED)] == EXPECTED else "differs")
    print()
    print("rows around AAT:")
    for r in ordered[max(0, p - 3):p + 19]:
        mark = " <=" if r["code"] in EXPECTED else ""
        print("  %-4s  %-30s %s%s" % (r["code"], r["city"], r["airport"][:34], mark))
