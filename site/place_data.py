#!/usr/bin/env python3
"""Place the inlined airport dataset before the widget JS.

inject_static.py rewrites the widget block on every run and re-adds a
<script src=".../airports.js"> tag. That tag is unreliable here: the
original page carries a <base href> and the Angular mount point
#bookingWidget-showHide gets wiped at runtime, so anything inside it
disappears. This script therefore:

1. removes any airports.js <script src> tags,
2. inlines the dataset as <script id="qa-airports-data">,
3. positions that tag immediately before the widget's own JS block,
   which lives outside the Angular container.
"""
import re

HTML = "index.html"
DATA = "airports.js"

html = open(HTML, encoding="utf-8").read()
data = open(DATA, encoding="utf-8").read()

# 1. Drop external airports.js script tags (any host, any path).
html, n_src = re.subn(r'<script[^>]*src="[^"]*airports\.js"[^>]*>\s*</script>', "", html)

# 2. Drop a previously inlined dataset so we do not accumulate copies.
html, n_old = re.subn(
    r'<script id="qa-airports-data">.*?</script>', "", html, flags=re.S
)

tag = '<script id="qa-airports-data">' + data + "</script>"

# 3. Anchor on the widget's own script block and insert the data right before it.
m = re.search(r"<script id=\"qa-static-bw-js\">", html)
if not m:
    # Fall back to locating the block by a function only the widget defines.
    m = None
    for hit in re.finditer(r"<script\b[^>]*>", html):
        start = hit.end()
        end = html.find("</script>", start)
        if end != -1 and "renderAc" in html[start:end]:
            m = hit
            break
    if not m:
        raise SystemExit("widget JS block not found")

insert_at = m.start()
html = html[:insert_at] + tag + html[insert_at:]

open(HTML, "w", encoding="utf-8").write(html)

# Verify: data must precede renderAc, and must not sit inside the mount point.
di = html.find('id="qa-airports-data"')
wi = html.find("renderAc")
mount = html.find('id="bookingWidget-showHide"')
mount_end = html.find("</div>", mount) if mount != -1 else -1
print(f"removed {n_src} src tag(s), {n_old} stale inline block(s)")
print(f"data at {di}, renderAc at {wi}, ordered correctly: {di < wi}")
print(f"data inside Angular mount: {mount != -1 and mount < di < mount_end}")
print(f"size: {len(html)} bytes")
