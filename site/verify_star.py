#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""city field is 'DisplayName*alias*alias'. Verify ordering with that in mind."""
import json, re, html, unicodedata

recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
def dec(s): return html.unescape(s or "").strip()

def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\u064B-\u0652\u0670\u0640]", "", s)
    s = s.replace("\u0622","\u0627").replace("\u0623","\u0627").replace("\u0625","\u0627")
    s = s.replace("\u0649","\u064A").replace("\u0629","\u0647")
    return s.strip().lower()

rows = []
for r in recs:
    code = (r.get("shorthand") or "").strip().upper()
    if not code: continue
    cityraw = dec(r.get("city"))
    parts = [p.strip() for p in cityraw.split("*") if p.strip()]
    rows.append({
        "code": code,
        "disp": parts[0] if parts else "",
        "aliases": parts,
        "country": dec(r.get("country")),
        "airport": dec(r.get("airport")),
        "cityCode": (r.get("cityCode") or "").strip().upper(),
        "all": (r.get("allAirport") or "").strip().upper(),
        "i": len(rows),
    })

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

def search(q, limit=None):
    nq = norm(q)
    if not nq: return []
    hits = []
    for r in rows:
        blob = norm(" ".join(r["aliases"]) + " " + r["country"] + " " + r["airport"])
        if nq in blob: hits.append(r)
    groups = {}
    for r in hits:
        g = r["cityCode"] or r["code"]
        groups.setdefault(g, []).append(r)
    t1, t2 = [], []
    for g, mem in groups.items():
        head = next((m for m in mem if m["all"] == "Y"), mem[0])
        disp = head["disp"]
        # tier1: any alias of the head starts with the query
        if any(norm(a).startswith(nq) for a in head["aliases"]):
            t1.append((disp, g, mem))
        else:
            t2.append((disp, g, mem))
    t1.sort(key=lambda x: x[0])
    t2.sort(key=lambda x: x[0])
    out = []
    for disp, g, mem in t1 + t2:
        tail = TAILS.get(g)
        if tail:
            o = {c: i for i, c in enumerate(tail)}
            mem = sorted(mem, key=lambda m: (o.get(m["code"], 999), m["i"]))
        else:
            mem = sorted(mem, key=lambda m: (0 if m["all"] == "Y" else 1, m["i"]))
        out.extend(mem)
    return out[:limit] if limit else out

EXPECT = {
 "ت": "YTO YYZ YTZ TCI TFS TFN DMK GWD LON LGW LHR ZEP QQU STN LCY LTN NYC JFK BGM".split(),
 "ا": "AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN".split(),
}

for q, exp in EXPECT.items():
    res = search(q, len(exp) + 8)
    got = [r["code"] for r in res]
    n = min(len(exp), len(got))
    m = sum(1 for i in range(n) if exp[i] == got[i])
    print("q=%r  positional_match=%d/%d   total_hits=%d" % (q, m, len(exp), len(search(q))))
    print("   exp:", " ".join(exp))
    print("   got:", " ".join(got[:len(exp)]))
    print()
