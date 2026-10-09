#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Probe: which field set + match mode yields exactly the live rows (no extras)?"""
import json, re, html, unicodedata, itertools

recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))
def dec(s): return html.unescape(s or "").strip()
def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\u064B-\u0652\u0670\u0640]", "", s)
    s = s.replace("\u0622","\u0627").replace("\u0623","\u0627").replace("\u0625","\u0627")
    s = s.replace("\u0649","\u064A").replace("\u0629","\u0647")
    return s.strip().lower()

rows=[]
for r in recs:
    code=(r.get("shorthand") or "").strip().upper()
    if not code: continue
    cityraw=dec(r.get("city"))
    rows.append({
        "code":code,
        "aliases":[p.strip() for p in cityraw.split("*") if p.strip()],
        "country":dec(r.get("country")),
        "airport":dec(r.get("airport")),
        "cityCode":(r.get("cityCode") or "").strip().upper(),
        "all":(r.get("allAirport") or "").strip().upper(),
    })

LIVE = {
 "ت": set("YTO YYZ YTZ TCI TFS TFN DMK GWD LON LGW LHR ZEP QQU STN LCY LTN NYC JFK BGM".split()),
 "ا": set("AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN".split()),
}

def wordstart(hay, nq):
    """query matches the start of any word in hay"""
    for w in re.split(r"[\s,\-/()]+", hay):
        if w.startswith(nq): return True
    return False

MODES = {
  "city_aliases_wordstart": lambda r,nq: any(wordstart(norm(a),nq) for a in r["aliases"]),
  "city_first_wordstart":   lambda r,nq: wordstart(norm(r["aliases"][0]) if r["aliases"] else "",nq),
  "city_alias_prefix":      lambda r,nq: any(norm(a).startswith(nq) for a in r["aliases"]),
  "city+country_wordstart": lambda r,nq: any(wordstart(norm(a),nq) for a in r["aliases"]) or wordstart(norm(r["country"]),nq),
  "city+ctry+apt_wordstart":lambda r,nq: any(wordstart(norm(a),nq) for a in r["aliases"]) or wordstart(norm(r["country"]),nq) or wordstart(norm(r["airport"]),nq),
}

for name, fn in MODES.items():
    print("== mode:", name)
    for q, live in LIVE.items():
        nq=norm(q)
        got=set(r["code"] for r in rows if fn(r,nq))
        missing=live-got
        print("   q=%r  got=%-5d  covers_live=%d/%d  missing=%s" % (
            q, len(got), len(live&got), len(live), " ".join(sorted(missing))[:60]))
    print()
