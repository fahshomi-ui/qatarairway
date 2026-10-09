#!/usr/bin/env python3
"""Remove duplicated widget blocks from index.html.

Repeated inject_static.py runs appended a fresh copy of the widget's
markup/CSS/JS without removing the previous one. The browser executed all
of them in order, so the *oldest* copy won: it re-bound the same element
ids and overwrote the newest ranking logic. Keep exactly one copy of each
part, the current one.
"""
import re
import sys

HTML = "index.html"
html = open(HTML, encoding="utf-8").read()
orig_len = len(html)


def script_blocks(text):
    """Yield (start, end) spans of <script>...</script> including tags."""
    for m in re.finditer(r"<script\b[^>]*>", text):
        body_start = m.end()
        close = text.find("</script>", body_start)
        if close == -1:
            continue
        yield m.start(), close + len("</script>"), text[body_start:close]


# --- 1. Deduplicate the widget JS: keep only the copy with the new ranking.
spans = [(s, e, b) for s, e, b in script_blocks(html) if "renderAc" in b]
print(f"found {len(spans)} widget JS block(s)")

keep = None
for s, e, b in spans:
    if "kindRank" in b:
        keep = (s, e)
if keep is None:
    sys.exit("no widget JS block with the new ranking (kindRank) found")

# Remove from the end so earlier offsets stay valid.
removed_js = 0
for s, e, b in sorted(spans, key=lambda t: t[0], reverse=True):
    if (s, e) == keep:
        continue
    html = html[:s] + html[e:]
    removed_js += 1
print(f"removed {removed_js} stale widget JS block(s)")

# --- 2. Deduplicate the widget markup + CSS wrappers.
for marker, pattern in (
    ("markup", r'<div id="qa-static-bw".*?<!--/qa-static-bw-->'),
    ("style", r"<style id=\"qa-static-bw-css\">.*?</style>"),
):
    hits = list(re.finditer(pattern, html, flags=re.S))
    if len(hits) > 1:
        # Keep the last occurrence, drop the rest.
        for m in reversed(hits[:-1]):
            html = html[: m.start()] + html[m.end() :]
        print(f"removed {len(hits) - 1} duplicate {marker} block(s)")
    else:
        print(f"{marker}: {len(hits)} block(s), nothing to remove")

# --- 3. Deduplicate the inlined dataset.
hits = list(re.finditer(r'<script id="qa-airports-data">.*?</script>', html, flags=re.S))
if len(hits) > 1:
    for m in reversed(hits[:-1]):
        html = html[: m.start()] + html[m.end() :]
    print(f"removed {len(hits) - 1} duplicate dataset block(s)")
else:
    print(f"dataset: {len(hits)} block(s)")

open(HTML, "w", encoding="utf-8").write(html)

# --- Verify final state.
final = [(s, e, b) for s, e, b in script_blocks(html) if "renderAc" in b]
di = html.find('id="qa-airports-data"')
wi = html.find("kindRank")
print(f"\nwidget JS blocks now: {len(final)}")
print(f"dataset before widget JS: {di < wi}")
print(f"size: {orig_len} -> {len(html)} bytes")
