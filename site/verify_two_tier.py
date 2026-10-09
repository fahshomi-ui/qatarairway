#!/usr/bin/env python3
"""Verify the two-tier ordering rule against both live captures."""
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
    raw = clean(r.get("city"))
    parts = raw.split("*")
    rows.append({
        "i": i,
        "code": code,
        "city": parts[0].strip(),
        "aliases": [p.strip() for p in parts[1:] if p.strip()],
        "country": clean(r.get("country")),
        "airport": clean(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper() or code,
    })


def is_latin(s):
    return bool(s) and s[0].isascii() and s[0].isalpha()


def blob(r):
    return " ".join([r["city"], r["country"], r["airport"]] + r["aliases"]).lower()


def run(query, expected, limit=50):
    q = query.lower()
    hits = [r for r in rows if q in blob(r)]

    groups = {}
    for r in hits:
        groups.setdefault(r["cityCode"], []).append(r)

    def group_key(g):
        # A group is tier 1 if any of its rows' Arabic city starts with the query.
        arabic_start = None
        for r in g:
            if not is_latin(r["city"]) and r["city"].startswith(query):
                if arabic_start is None or r["city"] < arabic_start:
                    arabic_start = r["city"]
        if arabic_start is not None:
            return (0, arabic_start, g[0]["i"])
        latin = ""
        for r in g:
            if is_latin(r["city"]):
                latin = r["city"].lower()
                break
        if not latin:
            for r in g:
                for a in r["aliases"]:
                    if is_latin(a):
                        latin = a.lower()
                        break
                if latin:
                    break
        if not latin:
            latin = g[0]["city"]
        return (1, latin, g[0]["i"])

    ordered = []
    for key in sorted(groups, key=lambda k: group_key(groups[k])):
        ordered.extend(sorted(groups[key], key=lambda r: r["i"]))

    got = [r["code"] for r in ordered][:limit]
    n = min(len(expected), len(got))
    same = sum(1 for a, b in zip(expected[:n], got[:n]) if a == b)
    print("query %r  hits=%d  first-%d match: %d/%d" % (query, len(hits), n, same, n))
    print("  expected:", " ".join(expected[:20]))
    print("  got     :", " ".join(got[:20]))
    print()
    return got


run("ا", ALEF)
run("ب", BA)
