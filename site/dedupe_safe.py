#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove ONLY the older duplicate widget <script>, keeping markup/CSS/data intact.
Also verify the widget markup and data script survive.
"""
import re, shutil, os, sys

P = "/home/ubuntu/qa_full_site/index.html"
shutil.copy(P, P + ".bak_safe")
h = open(P, encoding="utf-8").read()

blocks = []
for m in re.finditer(r"<script\b[^>]*>", h, re.I):
    endm = re.search(r"</script\s*>", h[m.end():], re.I)
    if not endm: continue
    body = h[m.end(): m.end() + endm.start()]
    if "qbw-cell-pax" in body and "renderAc" in body:
        blocks.append((m.start(), m.end() + endm.end(), len(body)))

print("widget script blocks:", len(blocks))
for i, (s, e, ln) in enumerate(blocks):
    print("   #%d offset=%d len=%d" % (i, s, ln))

if len(blocks) >= 2:
    # keep the FIRST block: inject_static.py always writes the newest copy in
    # place of the previous widget markup, so the first block is the fresh one.
    keep = blocks[0]
    print("keeping offset=%d len=%d (first / freshly injected)" % (keep[0], keep[2]))
    for s, e, ln in sorted(blocks[1:], key=lambda x: -x[0]):
        print("dropping offset=%d len=%d" % (s, ln))
        h = h[:s] + h[e:]
    open(P, "w", encoding="utf-8").write(h)
else:
    print("no duplicate to remove")

# collapse duplicate external airports.js tags, keeping the first one
h2 = open(P, encoding="utf-8").read()
tag = '<script src="https://qatarairwaysi-92510758.netlify.app/airports.js"></script>'
if h2.count(tag) > 1:
    first = h2.find(tag)
    head, tail = h2[:first + len(tag)], h2[first + len(tag):]
    tail = tail.replace(tag + "\n", "").replace(tag, "")
    open(P, "w", encoding="utf-8").write(head + tail)
    print("collapsed duplicate airports.js tags")

# ---- verify integrity ----
h2 = open(P, encoding="utf-8").read()
def cnt_scripts(pat):
    n = 0
    for m in re.finditer(r"<script\b[^>]*>", h2, re.I):
        endm = re.search(r"</script\s*>", h2[m.end():], re.I)
        if not endm: continue
        if pat in h2[m.end(): m.end() + endm.start()]: n += 1
    return n

print()
print("--- integrity check ---")
print("  widget scripts        :", cnt_scripts("renderAc"))
print("  note handler present  :", "dataset.note" in h2)
print("  note boxes            :", h2.count('class="qbw-note"'))
print("  markup #qa-static-bw  :", h2.count('id="qa-static-bw"'))
print("  panel #qbw-pan-ac     :", h2.count('id="qbw-pan-ac"'))
print("  panel #qbw-pan-cal    :", h2.count('id="qbw-pan-cal"'))
print("  panel #qbw-pan-pax    :", h2.count('id="qbw-pan-pax"'))
print("  cell  #qbw-cell-pax   :", h2.count('id="qbw-cell-pax"'))
print("  data script           :", h2.count('id="qa-airports-data"'))
m = re.search(r'<script id="qa-airports-data">', h2)
if m:
    endm = re.search(r"</script\s*>", h2[m.end():], re.I)
    body = h2[m.end(): m.end() + endm.start()]
    print("  airport records       :", len(re.findall(r'k:"[A-Z0-9]{3}"', body)))
    # ordering: data must come before the widget script
    wm = None
    for mm in re.finditer(r"<script\b[^>]*>", h2, re.I):
        em = re.search(r"</script\s*>", h2[mm.end():], re.I)
        if not em: continue
        if "renderAc" in h2[mm.end(): mm.end() + em.start()]:
            wm = mm.start()
    print("  data before widget    :", m.start() < wm if wm else "n/a")
print("  file size             :", os.path.getsize(P))
