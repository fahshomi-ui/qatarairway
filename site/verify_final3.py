#!/usr/bin/env python3
"""Group-based ordering keyed on the GROUP'S OWN city row (the allAirport=Y row).

For 'ب': Paris group's own city row is PAR whose city is "Paris" (Latin), so the
whole Paris group is tier B and sorts under "paris" — CDG/ORY ride with it and
land near the end, exactly as captured. باريس on CDG/ORY does not promote the
group because grouping happens first and the group's identity comes from its
city row.

For 'ا': the London group's city row is LON ("London", Latin) -> tier B under
"london", and LGW/LHR (city لندن) ride inside it. Matches capture.
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

groups = {}
for r in rows:
    groups.setdefault(r["cityCode"], []).append(r)

# keep only groups that have an allAirport=Y row (servable destinations)
groups = {k: v for k, v in groups.items() if any(r["all"] == "Y" for r in v)}
print("servable groups:", len(groups), "rows:", sum(len(v) for v in groups.values()))


def is_latin(s):
    return bool(s) and s[0].isascii() and s[0].isalpha()


def head(g):
    """The group's own city row: prefer the allAirport=Y row, else first row."""
    for r in g:
        if r["all"] == "Y":
            return r
    return g[0]


def test(query, expected, limit=50):
    q = query.lower()
    sel = []
    for k, g in groups.items():
        h = head(g)
        blob = " ".join([r["city"] + " " + r["country"] + " " + r["airport"] +
                         " " + " ".join(r["aliases"]) for r in g]).lower()
        if q not in blob:
            continue
        name = h["city"]
        tier = 0 if not is_latin(name) and name.lower().startswith(q) else 1
        sortname = name.lower()
        sel.append((tier, sortname, h["i"], g))

    sel.sort(key=lambda t: (t[0], t[1], t[2]))
    ordered = []
    for _, _, _, g in sel:
        ordered.extend(sorted(g, key=lambda r: r["i"]))

    got = [r["code"] for r in ordered][:limit]
    n = min(len(expected), len(got))
    same = sum(1 for a, b in zip(expected, got) if a == b)
    print("\nquery %r  groups=%d rows=%d  positional %d/%d"
          % (query, len(sel), len(ordered), same, n))
    print("  expected:", " ".join(expected[:22]))
    print("  got     :", " ".join(got[:22]))


test("ا", ALEF)
test("ب", BA)
