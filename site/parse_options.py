#!/usr/bin/env python3
"""Parse the original's rendered autocomplete options out of the saved HTML."""
import glob
import json
import os
import re

from bs4 import BeautifulSoup

f = sorted(glob.glob("/home/ubuntu/browser_html/qatarairways*.html"),
           key=os.path.getmtime, reverse=True)[0]
print("file:", f, os.path.getsize(f))

soup = BeautifulSoup(open(f, encoding="utf-8", errors="replace").read(), "html.parser")

opts = soup.select('mat-option, [role="option"]')
print("option nodes:", len(opts))

rows = []
for o in opts:
    txt = o.get_text("\n", strip=True)
    txt = re.sub(r"[\u200e\u200f]", "", txt)
    lines = [l.strip() for l in txt.split("\n") if l.strip()]
    if not lines:
        continue
    code = ""
    for j in range(len(lines) - 1, -1, -1):
        if re.fullmatch(r"[A-Z]{3}", lines[j]):
            code = lines[j]
            lines.pop(j)
            break
    rows.append({"code": code, "parts": lines})

print("parsed rows:", len(rows))
for r in rows[:30]:
    print("  %-4s  %s" % (r["code"], " / ".join(r["parts"])))

out = "/home/ubuntu/qa_full_site/orig_alef_rows.json"
json.dump(rows, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\nwrote", out, len(rows), "rows")
