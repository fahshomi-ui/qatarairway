#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit: does our deployed dataset cover everything in the official feed?"""
import json, re, html, collections, os

FEED = "/home/ubuntu/Downloads/cityList_ar.json"
OURS = "/home/ubuntu/qa_full_site/airports.js"

recs = json.load(open(FEED, encoding="utf-8"))
def dec(s): return html.unescape(s or "").strip()

feed_codes = set()
feed_countries = collections.Counter()
for r in recs:
    c = (r.get("shorthand") or "").strip().upper()
    if not c: continue
    feed_codes.add(c)
    ctry = dec(r.get("country"))
    if ctry: feed_countries[ctry] += 1

print("=== OFFICIAL FEED ===")
print("  rows            :", len(recs))
print("  unique codes    :", len(feed_codes))
print("  unique countries:", len(feed_countries))

# parse our airports.js
src = open(OURS, encoding="utf-8").read()
our_codes = set(re.findall(r'k:"([A-Z0-9]{3})"', src))
if not our_codes:
    our_codes = set(re.findall(r'"code"\s*:\s*"([A-Z0-9]{3})"', src))
print()
print("=== OUR DEPLOYED DATA (airports.js) ===")
print("  file size       :", os.path.getsize(OURS), "bytes")
print("  unique codes    :", len(our_codes))

missing = feed_codes - our_codes
extra = our_codes - feed_codes
print()
print("=== COVERAGE ===")
print("  codes in feed but NOT in ours :", len(missing), (" -> " + " ".join(sorted(missing)[:20])) if missing else "")
print("  codes in ours but not in feed :", len(extra), (" -> " + " ".join(sorted(extra)[:20])) if extra else "")
pct = 100.0 * len(feed_codes & our_codes) / max(1, len(feed_codes))
print("  coverage                      : %.2f%%" % pct)

print()
print("=== TOP COUNTRIES IN FEED (all must be reachable) ===")
for ctry, n in feed_countries.most_common(15):
    print("   %-45s %d" % (ctry, n))

print()
print("  total countries:", len(feed_countries))
