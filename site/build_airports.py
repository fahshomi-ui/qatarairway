#!/usr/bin/env python3
"""Convert the official Qatar Airways cityList_ar.json into airports.js.

Source: https://www.qatarairways.com/content/Qatar/common/cityLists/citylists/cityList_ar.json

Per record the feed provides:
  shorthand    -> IATA / station code
  city         -> display city, plus '*alias*alias' search aliases appended
  country      -> country name (Arabic)
  airport      -> airport / station name (Arabic)
  railStation / busStation / ferryStation / allAirport -> icon type

Output rows keep the fields the widget already renders and add `s`, a
lowercase space-joined search blob containing the display city, the country,
the airport name, the station code and every alias from the feed. Arabic text
is normalised (alef/hamza forms unified, tatweel and diacritics stripped) so
typing "لند" matches "لندن" without matching "أوكلاند".
"""
import html
import json
import re
import unicodedata

SRC = "/home/ubuntu/Downloads/cityList_ar.json"
OUT = "/home/ubuntu/qa_full_site/airports.js"

# Arabic diacritics and tatweel
ARABIC_STRIP = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u0640\u06D6-\u06ED]")


def decode(value):
    if not value:
        return ""
    return html.unescape(value).strip()


def split_city(value):
    """Return (display_city, [aliases]) from a feed city field.

    The feed encodes 'الدوحة*qatar*katar' - display name first, then
    lowercase search aliases separated by '*'.
    """
    text = decode(value)
    if not text:
        return "", []
    parts = text.split("*")
    return parts[0].strip(), [p.strip() for p in parts[1:] if p.strip()]


def normalise(text):
    """Fold Arabic orthographic variants and strip marks for searching."""
    text = unicodedata.normalize("NFKC", text)
    text = ARABIC_STRIP.sub("", text)
    text = (
        text.replace("\u0623", "\u0627")  # أ -> ا
        .replace("\u0625", "\u0627")  # إ -> ا
        .replace("\u0622", "\u0627")  # آ -> ا
        .replace("\u0649", "\u064A")  # ى -> ي
        .replace("\u0629", "\u0647")  # ة -> ه
        .replace("\u0624", "\u0648")  # ؤ -> و
        .replace("\u0626", "\u064A")  # ئ -> ي
    )
    return text.lower().strip()


def icon_type(rec, airport):
    if rec.get("railStation") == "Y":
        return "r"
    if rec.get("busStation") == "Y":
        return "b"
    if rec.get("ferryStation") == "Y":
        return "f"
    if rec.get("allAirport") == "Y" or not airport:
        return "c"
    return "a"


def _is_arabic(text):
    """True when the string starts with an Arabic letter."""
    for ch in text:
        if ch.isspace():
            continue
        return "\u0600" <= ch <= "\u06FF"
    return False


def js_escape(text):
    return text.replace("\\", "\\\\").replace('"', '\\"')


def main():
    with open(SRC, encoding="utf-8") as fh:
        records = json.load(fh)

    rows = []
    seen = set()
    for feed_index, rec in enumerate(records):
        code = (rec.get("shorthand") or "").strip().upper()
        if not code:
            continue

        city, aliases = split_city(rec.get("city"))
        country = decode(rec.get("country"))
        airport = decode(rec.get("airport"))

        name = airport or city
        if not name:
            continue

        label = "%s, %s" % (city, country) if city and country else (city or country)

        key = (code, name)
        if key in seen:
            continue
        seen.add(key)

        # Searchable blob: display fields + feed aliases + code.
        blob_parts = [city, country, airport, code] + aliases
        blob = " ".join(normalise(p) for p in blob_parts if p)
        blob = re.sub(r"\s+", " ", blob).strip()

        rows.append(
            {
                "city": city,
                "index": feed_index,
                "js": '  {c:"%s", n:"%s", k:"%s", t:"%s", s:"%s"},'
                % (
                    js_escape(label),
                    js_escape(name),
                    js_escape(code),
                    icon_type(rec, airport),
                    js_escape(blob),
                ),
            }
        )

    # The live site does NOT sort autocomplete results at all - it filters the
    # feed and renders matches in the feed's own record order, which is why a
    # city row is immediately followed by its own stations. Captured live for
    # query "ا": AAT, BCM, DMK, BJS, PKX, PEK, GWD, HAD, HNY, HBP, KSL, LON,
    # LGW, LHR, ZEP, QQU, STN, LCY - neither alphabetical by city nor by code.
    # See ORIG_ORDER_TRUTH.md. So emit rows exactly as the feed lists them.
    rows = [row["js"] for row in rows]

    header = (
        "/* Official Qatar Airways station list.\n"
        "   Source: /content/Qatar/common/cityLists/citylists/cityList_ar.json\n"
        "   %d entries, in the feed's own record order (the live site does not sort).\n"
        "   c=display city+country  n=airport/station name  k=IATA code\n"
        "   t=icon (a airport, c city, r rail, b bus, f ferry)\n"
        "   s=normalised search blob (Arabic folded, aliases included) */\n" % len(rows)
    )
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(header)
        fh.write("window.QA_AIRPORTS = [\n")
        fh.write("\n".join(rows))
        fh.write("\n];\n")

    print("wrote %d entries" % len(rows))
    for row in rows[:3]:
        print(row)


if __name__ == "__main__":
    main()
