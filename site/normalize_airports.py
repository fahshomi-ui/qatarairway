#!/usr/bin/env python3
"""Normalize the airport dataset so every row reads exactly like the live
Qatar Airways autocomplete: the city line is "<Latin city>, <Arabic country>"
and the second line is the Arabic airport name.

A handful of rows in the scraped data had the city written in Arabic; this
converts them back to their Latin form so the whole list is consistent.
"""
import re

# Arabic city -> Latin city (only for rows scraped with an Arabic city)
AR2LAT = {
    "لندن": "London",
    "باريس": "Paris",
    "هلسنكي": "Helsinki",
    "دبلن": "Dublin",
    "وارساو": "Warsaw",
}

path = "airports.js"
src = open(path, encoding="utf-8").read()


def repl(m):
    city, rest = m.group(1), m.group(2)
    return 'c:"%s%s' % (AR2LAT.get(city.strip(), city), rest)


out = re.sub(r'c:"([^",]+)(,[^"]*")', repl, src)
open(path, "w", encoding="utf-8").write(out)

cities = re.findall(r'c:"([^",]+)', out)
arabic_left = [c for c in set(cities) if re.search(r"[\u0600-\u06FF]", c)]
print("rows:", len(cities))
print("cities still Arabic:", sorted(arabic_left) if arabic_left else "none")
