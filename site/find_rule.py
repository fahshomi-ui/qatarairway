#!/usr/bin/env python3
"""Find the matching rule that reproduces the live original order for 'ا'.

Live capture (query "ا"), in order:
  AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON LGW LHR ZEP QQU STN LCY
"""
import html
import json
import re
import unicodedata

EXPECTED = ("AAT BCM DMK BJS PKX PEK GWD HAD HNY HBP KSL LON "
            "LGW LHR ZEP QQU STN LCY").split()

ARABIC_STRIP = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def norm(text):
    text = unicodedata.normalize("NFKC", text)
    text = ARABIC_STRIP.sub("", text)
    for a, b in (("\u0623", "\u0627"), ("\u0625", "\u0627"), ("\u0622", "\u0627"),
                 ("\u0649", "\u064A"), ("\u0629", "\u0647"),
                 ("\u0624", "\u0648"), ("\u0626", "\u064A")):
        text = text.replace(a, b)
    return text.lower().strip()


def raw(text):
    """No alef folding - keep أ/إ/آ distinct from ا."""
    text = unicodedata.normalize("NFKC", text)
    text = ARABIC_STRIP.sub("", text)
    return text.lower().strip()


recs = json.load(open("/home/ubuntu/Downloads/cityList_ar.json", encoding="utf-8"))

rows = []
for i, r in enumerate(recs):
    code = (r.get("shorthand") or "").strip().upper()
    if not code:
        continue
    city_raw = html.unescape(r.get("city") or "").strip()
    parts = city_raw.split("*")
    city = parts[0].strip()
    aliases = [p.strip() for p in parts[1:] if p.strip()]
    country = html.unescape(r.get("country") or "").strip()
    airport = html.unescape(r.get("airport") or "").strip()
    rows.append({
        "i": i, "code": code, "city": city, "country": country,
        "airport": airport, "aliases": aliases,
    })

Q = "ا"


def word_prefix(fields, fold):
    """Does any word in any field start with the query?"""
    f = norm if fold else raw
    q = f(Q)
    for val in fields:
        for word in re.split(r"[\s,\-/()]+", f(val)):
            if word.startswith(q):
                return True
    return False


RULES = {
    "city-only, folded, word-prefix":
        lambda r: word_prefix([r["city"]], True),
    "city-only, unfolded, word-prefix":
        lambda r: word_prefix([r["city"]], False),
    "city+airport, unfolded, word-prefix":
        lambda r: word_prefix([r["city"], r["airport"]], False),
    "city+airport, folded, word-prefix":
        lambda r: word_prefix([r["city"], r["airport"]], True),
    "city+country+airport, unfolded, word-prefix":
        lambda r: word_prefix([r["city"], r["country"], r["airport"]], False),
    "city-only, unfolded, string-prefix":
        lambda r: raw(r["city"]).startswith(raw(Q)),
    "airport-only, unfolded, word-prefix":
        lambda r: word_prefix([r["airport"]], False),
}

for name, rule in RULES.items():
    hits = [r["code"] for r in rows if rule(r)]
    head = hits[: len(EXPECTED)]
    ok = head == EXPECTED
    print("%-46s n=%-5d %s" % (name, len(hits), "MATCH" if ok else ""))
    if not ok:
        print("      got: %s" % " ".join(head[:18]))
print()
print("expected: %s" % " ".join(EXPECTED))
