#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Free substring match (city aliases + country + airport), two-tier ordering.
Tier1 = display city starts with query (sorted by display city)
Tier2 = everything else (sorted by display city)
Groups keep harvested tail order.
Compare only the HEAD of the list against the live capture (live is the visible window).
"""
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

rows=[]
for r in recs:
    code=(r.get("shorthand") or "").strip().upper()
    if not code: continue
    parts=[p.strip() for p in dec(r.get("city")).split("*") if p.strip()]
    rows.append({
        "code":code,
        "disp":parts[0] if parts else "",
        "aliases":parts,
        "country":dec(r.get("country")),
        "airport":dec(r.get("airport")),
        "cityCode":(r.get("cityCode") or "").strip().upper(),
        "all":(r.get("allAirport") or "").strip().upper(),
        "i":len(rows),
    })

TAILS = {
 "LON":"LON LGW LHR ZEP QQU STN LCY LTN".split(),
 "NYC":"NYC JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN".split(),
 "PAR":"PAR CDG XCR ORY".split(),
 "MOW":"MOW SVO DME VKO".split(),
 "BJS":"BJS PKX PEK".split(),
 "HNY":"HNY HBP".split(),
 "YTO":"YTO YYZ YTZ".split(),
 "TCI":"TCI TFS TFN".split(),
}

def search(q):
    nq=norm(q)
    if not nq: return []
    hits=[r for r in rows
          if nq in norm(" ".join(r["aliases"])) or nq in norm(r["country"]) or nq in norm(r["airport"])]
    groups={}
    for r in hits:
        g=r["cityCode"] or r["code"]
        groups.setdefault(g,[]).append(r)
    t1,t2=[],[]
    for g,mem in groups.items():
        head=next((m for m in mem if m["all"]=="Y"), mem[0])
        if norm(head["disp"]).startswith(nq): t1.append((head["disp"],g,mem))
        else: t2.append((head["disp"],g,mem))
    t1.sort(key=lambda x:x[0]); t2.sort(key=lambda x:x[0])
    out=[]
    for disp,g,mem in t1+t2:
        tail=TAILS.get(g)
        if tail:
            o={c:i for i,c in enumerate(tail)}
            mem=sorted(mem,key=lambda m:(o.get(m["code"],999),m["i"]))
        else:
            mem=sorted(mem,key=lambda m:(0 if m["all"]=="Y" else 1,m["i"]))
        out.extend(mem)
    return out

EXPECT = {
 "ت":"YTO YYZ YTZ TCI TFS TFN DMK GWD LON LGW LHR ZEP QQU STN LCY LTN NYC JFK BGM".split(),
 "ا":"AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY LTN".split(),
}

for q,exp in EXPECT.items():
    res=search(q); got=[r["code"] for r in res]
    n=min(len(exp),len(got))
    m=sum(1 for i in range(n) if exp[i]==got[i])
    # also: where does each expected code land?
    pos={c:i for i,c in enumerate(got)}
    print("q=%r total=%d  head_match=%d/%d" % (q,len(got),m,len(exp)))
    print("   exp:", " ".join(exp))
    print("   got:", " ".join(got[:len(exp)]))
    print("   expected codes' positions:", [(c,pos.get(c,-1)) for c in exp[:8]])
    print()
