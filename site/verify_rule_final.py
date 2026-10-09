#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify the confirmed two-tier ordering rule against the live captures."""
import json, re, unicodedata, html

FEED = "/home/ubuntu/Downloads/cityList_ar.json"

recs = json.load(open(FEED, encoding="utf-8"))

def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\u064B-\u0652\u0670\u0640]", "", s)   # diacritics/tatweel
    s = s.replace("\u0622","\u0627").replace("\u0623","\u0627").replace("\u0625","\u0627")
    s = s.replace("\u0649","\u064A").replace("\u0629","\u0647").replace("\u0647","\u0647")
    return s.strip().lower()

def dec(s):
    return html.unescape(s or "").strip()

rows = []
for r in recs:
    code = (r.get("shorthand") or "").strip().upper()
    if not code: continue
    rows.append({
        "code": code,
        "city": dec(r.get("city")),
        "country": dec(r.get("country")),
        "airport": dec(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper(),
        "all": (r.get("allAirport") or "").strip().upper(),
        "i": len(rows),
    })

# group tails harvested live from the original (fixed per group, query-independent)
TAILS = {
 "LON": "LON LGW LHR ZEP QQU STN LCY LTN".split(),
 "NYC": "NYC JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN".split(),
 "PAR": "PAR CDG XCR ORY".split(),
 "MOW": "MOW SVO DME VKO".split(),
 "BJS": "BJS PKX PEK".split(),
 "HNY": "HNY HBP".split(),
 "YTO": "YTO YYZ YTZ".split(),
 "TCI": "TCI TFS TFN".split(),
}

def is_latin(s):
    return bool(s) and bool(re.match(r"^[A-Za-z]", s.strip()))

def search(q, limit=None):
    nq = norm(q)
    if not nq: return []
    hits = []
    for r in rows:
        blob = norm(r["city"] + " " + r["country"] + " " + r["airport"])
        if nq in blob:
            hits.append(r)
    # group by cityCode
    groups = {}
    for r in hits:
        g = r["cityCode"] or r["code"]
        groups.setdefault(g, []).append(r)
    # classify each group: tier1 if the group's city label starts with q
    t1, t2 = [], []
    for g, mem in groups.items():
        head = next((m for m in mem if m["all"] == "Y"), mem[0])
        city = head["city"]
        if norm(city).startswith(nq):
            t1.append((city, g, mem))
        else:
            t2.append((city, g, mem))
    t1.sort(key=lambda x: x[0])
    t2.sort(key=lambda x: x[0])
    out = []
    for city, g, mem in t1 + t2:
        tail = TAILS.get(g)
        if tail:
            order = {c: i for i, c in enumerate(tail)}
            mem = sorted(mem, key=lambda m: (order.get(m["code"], 999), m["i"]))
        else:
            mem = sorted(mem, key=lambda m: (0 if m["all"] == "Y" else 1, m["i"]))
        out.extend(mem)
    return out[:limit] if limit else out

EXPECT = {
 "ت": "YTO YYZ YTZ TCI TFS TFN DMK GWD LON LGW LHR ZEP QQU STN LCY LTN NYC JFK BGM".split(),
 "ا": "AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN".split(),
}

for q, exp in EXPECT.items():
    got = [r["code"] for r in search(q, len(exp) + 6)]
    n = min(len(exp), len(got))
    match = sum(1 for i in range(n) if exp[i] == got[i])
    print("q=%r  expect_head=%d  match_at_pos=%d/%d" % (q, len(exp), match, len(exp)))
    print("   exp:", " ".join(exp))
    print("   got:", " ".join(got[:len(exp)]))
    print()
