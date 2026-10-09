#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find every <script> block that references qbw-cell-pax and keep only the LAST one."""
import re, shutil, os

P = "/home/ubuntu/qa_full_site/index.html"
shutil.copy(P, P + ".bak_dup")
h = open(P, encoding="utf-8").read()

# locate all script blocks
blocks = []
for m in re.finditer(r"<script\b[^>]*>", h, re.I):
    start = m.start()
    endm = re.search(r"</script\s*>", h[m.end():], re.I)
    if not endm: continue
    end = m.end() + endm.end()
    body = h[m.end(): m.end() + endm.start()]
    blocks.append((start, end, body))

hits = [(s, e, len(b)) for (s, e, b) in blocks if "qbw-cell-pax" in b]
print("script blocks referencing qbw-cell-pax:", len(hits))
for i, (s, e, ln) in enumerate(hits):
    print("   #%d  offset=%d  len=%d" % (i, s, ln))

if len(hits) <= 1:
    print("nothing to remove")
    raise SystemExit(0)

# keep the LAST (largest offset) - it is the newest injection; remove the others
keep = max(hits, key=lambda x: x[0])
print("keeping the block at offset", keep[0], "len", keep[2])
remove = [x for x in hits if x[0] != keep[0]]
# remove from the end backwards so offsets stay valid
for s, e, ln in sorted(remove, key=lambda x: -x[0]):
    print("removing block at", s, "len", ln)
    h = h[:s] + h[e:]

open(P, "w", encoding="utf-8").write(h)
print("done. new size:", os.path.getsize(P))

# re-verify
h2 = open(P, encoding="utf-8").read()
n = 0
for m in re.finditer(r"<script\b[^>]*>", h2, re.I):
    endm = re.search(r"</script\s*>", h2[m.end():], re.I)
    if not endm: continue
    if "qbw-cell-pax" in h2[m.end(): m.end() + endm.start()]: n += 1
print("remaining blocks referencing qbw-cell-pax:", n)

# also check the markup + css aren't duplicated
print("markup count (qa-static-bw):", h2.count('id="qa-static-bw"'))
print("panel count (qbw-pan-pax) :", h2.count('id="qbw-pan-pax"'))
print("data script count         :", h2.count("QBW_AIRPORTS"))
