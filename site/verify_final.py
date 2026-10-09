#!/usr/bin/env python3
"""Verify: visible = allAirport=='Y' rows (city groups), plus their group members.

Order: tier A (city name starts with query) alphabetically by city,
then tier B (matched elsewhere) alphabetically by Latin city name.
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
        "all": (r.get("allAirport") or "N").strip().upper(),
        "rail": (r.get("railStation") or "N").strip().upper(),
        "bus": (r.get("busStation") or "N").strip().upper(),
    })

# Groups that are "servable": contain at least one allAirport=Y row.
servable = set(r["cityCode"] for r in rows if r["all"] == "Y")
visible = [r for r in rows if r["cityCode"] in servable]
print("total=%d visible=%d groups=%d" % (len(rows), len(visible), len(servable)))


def is_latin(s):
    return bool(s) and s[0].isascii() and s[0].isalpha()


def test(query, expected, limit=50):
    q = query.lower()
    tierA, tierB = [], []
    for r in visible:
        if r["city"].lower().startswith(q):
            tierA.append(r)
        else:
            hay = " ".join([r["country"], r["airport"]] + r["aliases"]).lower()
            if q in hay:
                tierB.append(r)

    def order(tier, keyf):
        g = {}
        for r in tier:
            g.setdefault(r["cityCode"], []).append(r)
        out = []
        for k in sorted(g, key=lambda k: keyf(g[k])):
            out.extend(sorted(g[k], key=lambda r: r["i"]))
        return out

    kA = lambda g: (min(r["city"] for r in g), g[0]["i"])

    def kB(g):
        lat = next((r["city"].lower() for r in g if is_latin(r["city"])), g[0]["city"])
        return (lat, g[0]["i"])

    got = [r["code"] for r in order(tierA, kA) + order(tierB, kB)][:limit]
    n = min(len(expected), len(got))
    same = sum(1 for a, b in zip(expected, got) if a == b)
    print("\nquery %r  tierA=%d tierB=%d  positional %d/%d"
          % (query, len(tierA), len(tierB), same, n))
    print("  expected:", " ".join(expected[:20]))
    print("  got     :", " ".join(got[:20]))


test("ا", ALEF)
test("ب", BA)
