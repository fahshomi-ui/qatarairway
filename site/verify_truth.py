#!/usr/bin/env python3
"""Check that feed order reproduces the live original order for query 'ا'."""
import re

EXPECTED = """AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU
STN LCY""".split()

src = open("/home/ubuntu/qa_full_site/airports.js", encoding="utf-8").read()

rows = re.findall(r'\{c:"(.*?)", n:"(.*?)", k:"(.*?)", t:"(.*?)", s:"(.*?)"\}', src)
print("rows:", len(rows))

q = "ا"
hits = [r for r in rows if q in r[4]]
got = [r[2] for r in hits][: len(EXPECTED)]

print("expected:", " ".join(EXPECTED))
print("got     :", " ".join(got))
print("match   :", got == EXPECTED)

if got != EXPECTED:
    for i, (e, g) in enumerate(zip(EXPECTED, got), 1):
        flag = "" if e == g else "   <-- differs"
        print("%2d  expected %-4s got %-4s%s" % (i, e, g, flag))

print()
print("first 6 rendered rows:")
for r in hits[:6]:
    print("  %-4s  %s / %s" % (r[2], r[0], r[1]))
