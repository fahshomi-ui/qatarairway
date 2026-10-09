#!/usr/bin/env python3
"""Verify the original's ordering rule using the observed screenshot.

Original list for query "ا" (Arabic alef), in order:
    ABD Abadan   / إيران
    YXX Abbotsford / كندا
    ABI Abilene  / الولايات المتحدة الأمريكية
    ADF Adiyaman / تركيا
    AJI Agri     / تركيا
    AWZ Ahwaz    / إيران

Codes are NOT ascending (ABD, YXX, ABI, ADF, AJI, AWZ), so the feed order /
code order is not the rule. Latin city names ARE ascending:
    Abadan < Abbotsford < Abilene < Adiyaman < Agri < Ahwaz
=> the original sorts matches alphabetically by the *city* label.
"""
import json
import re

OBSERVED = ["ABD", "YXX", "ABI", "ADF", "AJI", "AWZ"]

t = open("airports.js", encoding="utf-8").read()
entries = re.findall(
    r'\{c:"(.*?)", n:"(.*?)", k:"(.*?)", t:"(.*?)", s:"(.*?)"\}', t
)
print("parsed", len(entries))

AP = [{"c": c, "n": n, "k": k, "t": tp, "s": s} for c, n, k, tp, s in entries]

by_code = {a["k"]: a for a in AP}
print("\nThe six rows the original shows for 'ا':")
for code in OBSERVED:
    a = by_code.get(code)
    print(f"  {code:5} | {a['c'] if a else 'MISSING'}")

print("\nSorting those six by city label:")
subset = [by_code[c] for c in OBSERVED if c in by_code]
for a in sorted(subset, key=lambda a: a["c"]):
    print(f"  {a['k']:5} | {a['c']}")
