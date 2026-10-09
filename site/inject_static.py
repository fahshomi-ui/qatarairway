#!/usr/bin/env python3
"""Swap the static booking widget block inside index.html with the newest version.

On first run it replaces the Angular <app-nbx-explore> element; on later runs it
replaces the previously injected <div id="qa-static-bw"> ... </div> block.
"""
import re
import sys

HTML = 'index.html'
WIDGET = 'static_bw.html'

with open(HTML, encoding='utf-8') as f:
    html = f.read()

with open(WIDGET, encoding='utf-8') as f:
    widget = f.read()

orig_len = len(html)
start = html.find('<div id="qa-static-bw-wrap"')
if start == -1:
    start = html.find('<div id="qa-static-bw"')

if start > -1:
    # Find the matching closing </div> by counting div depth.
    depth = 0
    i = start
    end = -1
    tag_re = re.compile(r'</?div\b', re.I)
    while True:
        m = tag_re.search(html, i)
        if not m:
            break
        if m.group(0).lower().startswith('</'):
            depth -= 1
            if depth == 0:
                end = html.find('>', m.end()) + 1
                break
        else:
            depth += 1
        i = m.end()
    if end == -1:
        print('ERROR: could not find end of static widget block', file=sys.stderr)
        sys.exit(1)
    html = html[:start] + widget + html[end:]
    print('replaced existing static widget block')
else:
    pattern = re.compile(r'<app-nbx-explore\b[^>]*>\s*</app-nbx-explore>', re.I)
    html, n = pattern.subn(widget, html)
    print(f'replaced {n} app-nbx-explore element(s)')
    if n == 0:
        print('ERROR: no widget target found', file=sys.stderr)
        sys.exit(1)
    bundle = re.compile(
        r'<script[^>]*src="[^"]*booking-widget[^"]*"[^>]*>\s*</script>', re.I)
    html, nb = bundle.subn('', html)
    print(f'removed {nb} booking-widget bundle script(s)')

with open(HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'size: {orig_len} -> {len(html)} bytes')
