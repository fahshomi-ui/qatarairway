#!/usr/bin/env python3
"""Extract the original's rendered autocomplete rows from the saved page text.

The live page renders every matching row into the DOM (the markdown dump shows
them as repeating triples: city label / station name / CODE, with the matched
letters wrapped in ** by the markdown extractor).
"""
import glob
import json
import os
import re

CANDIDATES = sorted(
    glob.glob("/home/ubuntu/page_texts/www.qatarairways.com_ar-qa_homepage.html.md"),
    key=os.path.getmtime,
    reverse=True,
)

if not CANDIDATES:
    raise SystemExit("no saved page text found")

path = CANDIDATES[0]
text = open(path, encoding="utf-8").read()
print("source:", path, len(text), "chars")

# Strip the bold markers the extractor added around matched letters.
clean = text.replace("**", "")

lines = [l.strip() for l in clean.split("\n")]
lines = [l for l in lines if l]

rows = []
for i, line in enumerate(lines):
    if re.fullmatch(r"[A-Z]{3}", line):
        # The two preceding non-empty lines are the city label and station name.
        if i >= 2:
            city = lines[i - 2]
            station = lines[i - 1]
            rows.append({"code": line, "city": city, "station": station})

print("rows found:", len(rows))
for r in rows[:25]:
    print("  %-4s  %-34s %s" % (r["code"], r["city"], r["station"]))

out = "/home/ubuntu/qa_full_site/orig_alef_rows.json"
json.dump(rows, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\nwrote", out)
