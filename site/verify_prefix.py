#!/usr/bin/env python3
"""Test: match = query is a prefix of the city name; order = alphabetical by city.

Arabic rows sort before/after Latin rows? From the "ب" capture the Arabic city
rows came FIRST (بارانكابيرميجا ... بوينس ايرس), then Latin-city rows whose
match came from elsewhere (Gwadar/باكستان, Misurata/ليبيا, Paris/باريس station,
Quetta/باكستان, Rio de Janeiro/البرازيل).

So: tier A = city-name prefix match, sorted by city name.
    tier B = match anywhere else, sorted by Latin city name.
"""
import html
import json
import re
import unicodedata

ALEF = ("AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN "
        "LCY LTN LAD MRA MOW SVO DME VKO NYC JFK ALB BGM ITH ISP SWF OGS SLK "
        "BUF SYR EWR LGA ART HPN NQT QEW ZGB EMA PAR CDG XCR ORY PZU BAR").split()

BA = ("EJA NBS PPB BVB PPN BOG BUH OTP BPA BPL PNT BUE EZE AEP GWD MRA PAR CDG "
      "ORY UET").split()

MARKS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def clean(t):
    return MARKS.sub("", unicodedata.normalize("NFKC", html.unescape(t or ""))).strip()


recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
rows = []
for i, r in enumerate(recs):
    code = (r.get("shorthand") or "").strip().upper()
    if not code:
        continue
    parts = clean(r.get("city")).split("*")
    rows.append({
        "i": i, "code": code,
        "city": parts[0].strip(),
        "aliases": [p.strip() for p in parts[1:] if p.strip()],
        "country": clean(r.get("country")),
        "airport": clean(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper() or code,
    })


def is_latin(s):
    return bool(s) and s[0].isascii() and s[0].isalpha()


def test(query, expected, limit=50):
    q = query.lower()

    tierA, tierB = [], []
    for r in rows:
        city = r["city"]
        if city.lower().startswith(q):
            tierA.append(r)
        else:
            hay = " ".join([r["country"], r["airport"]] + r["aliases"]).lower()
            if q in hay:
                tierB.append(r)

    # group each tier by cityCode, keep feed order inside a group
    def order(tier, key_fn):
        groups = {}
        for r in tier:
            groups.setdefault(r["cityCode"], []).append(r)
        out = []
        for k in sorted(groups, key=lambda k: key_fn(groups[k])):
            out.extend(sorted(groups[k], key=lambda r: r["i"]))
        return out

    def keyA(g):
        return (min(r["city"] for r in g), g[0]["i"])

    def keyB(g):
        latin = ""
        for r in g:
            if is_latin(r["city"]):
                latin = r["city"].lower()
                break
        if not latin:
            latin = g[0]["city"]
        return (latin, g[0]["i"])

    ordered = order(tierA, keyA) + order(tierB, keyB)
    got = [r["code"] for r in ordered][:limit]

    n = min(len(expected), len(got))
    same = sum(1 for a, b in zip(expected, got) if a == b)
    print("query %r  tierA=%d tierB=%d  positional match %d/%d"
          % (query, len(tierA), len(tierB), same, n))
    print("  expected:", " ".join(expected[:20]))
    print("  got     :", " ".join(got[:20]))
    print()


test("ا", ALEF)
test("ب", BA)
