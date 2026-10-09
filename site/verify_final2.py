#!/usr/bin/env python3
"""Order rows individually (not group-collapsed) and see if captures reproduce.

Insight from the last run: with the allAirport gate the membership is right
(all captured codes present, 184 visible rows) but my group-collapsed ordering
pulls Paris/CDG to the front for 'ب' because its group's min city is "باريس".
The original clearly orders by EACH ROW's own city name, keeping a city's
sub-rows attached to the city row via cityCode only when the city row itself
also matched.
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
    })

servable = set(r["cityCode"] for r in rows if r["all"] == "Y")
visible = [r for r in rows if r["cityCode"] in servable]


def is_latin(s):
    return bool(s) and s[0].isascii() and s[0].isalpha()


def test(query, expected, limit=50):
    q = query.lower()
    hits = []
    for r in visible:
        if r["city"].lower().startswith(q):
            hits.append((0, r))
        else:
            hay = " ".join([r["country"], r["airport"]] + r["aliases"]).lower()
            if q in hay:
                hits.append((1, r))

    # attach non-matching siblings of a matched city row
    matched_groups = set(r["cityCode"] for _, r in hits)

    def key(t):
        tier, r = t
        if tier == 0:
            return (0, r["city"], r["i"])
        lat = r["city"].lower() if is_latin(r["city"]) else r["city"]
        return (1, lat, r["i"])

    ordered = [r for _, r in sorted(hits, key=key)]
    got = [r["code"] for r in ordered][:limit]
    n = min(len(expected), len(got))
    same = sum(1 for a, b in zip(expected, got) if a == b)
    print("query %r  hits=%d  positional %d/%d" % (query, len(hits), same, n))
    print("  expected:", " ".join(expected[:20]))
    print("  got     :", " ".join(got[:20]))
    print()


test("ا", ALEF)
test("ب", BA)
