#!/usr/bin/env python3
"""Print the attributes of the element that carries `masterserviceurls`
so we can discover the API base URL used by the original booking widget.
"""
import re

s = open("index.html", encoding="utf-8", errors="replace").read()
i = s.find("masterserviceurls")

# walk back to the opening '<' of this tag
start = s.rfind("<", 0, i)
end = s.find(">", i)
tag = s[start:end + 1]
print("TAG LENGTH:", len(tag))
print("TAG NAME:", tag[1:40].split()[0])
print()

for m in re.finditer(r'([a-zA-Z0-9_:-]+)="([^"]*)"', tag):
    name, val = m.group(1), m.group(2)
    if len(val) > 200:
        val = val[:200] + " ...(truncated)"
    print("%-32s = %s" % (name, val))
