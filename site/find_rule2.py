#!/usr/bin/env python3
"""Reproduce the live original order for 'ا' exactly.

Live capture (stable across two loads):
  AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY
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
    city = parts[0].strip()
    aliases = [p.strip() for p in parts[1:] if p.strip()]
    rows.append({
        "i": i,
        "code": code,
        "city": city,
        "aliases": aliases,
        "country": clean(r.get("country")),
        "airport": clean(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper(),
    })

Q = "ا"


def words(text):
    return [w for w in re.split(r"[\s,\-/()\.]+", text) if w]


def matches(r):
    """Unfolded word-prefix match over city, country, airport, aliases, code."""
    for field in [r["city"], r["country"], r["airport"], r["code"]] + r["aliases"]:
        for w in words(field.lower()):
            if w.startswith(Q):
                return True
    return False


hits = [r for r in rows if matches(r)]
print("hits:", len(hits))

# Group by cityCode (falls back to code), order groups by the group's Latin
# city name if it has one, else by its Arabic city name; keep feed order inside.
groups = {}
for r in hits:
    key = r["cityCode"] or r["code"]
    groups.setdefault(key, []).append(r)


def latin_key(group):
    for r in group:
        c = r["city"]
        if c and c[0].isascii() and c[0].isalpha():
            return c.lower()
    return group[0]["city"].lower()


ordered = []
for key in sorted(groups, key=lambda k: (latin_key(groups[k]), groups[k][0]["i"])):
    ordered.extend(sorted(groups[key], key=lambda r: r["i"]))

got = [r["code"] for r in ordered][: len(EXPECTED)]
print("expected:", " ".join(EXPECTED))
print("got     :", " ".join(got))
print("MATCH" if got == EXPECTED else "differs")
print()
for r in ordered[:20]:
    print("  %-4s  %-28s  %s" % (r["code"], r["city"] + ", " + r["country"], r["airport"]))
