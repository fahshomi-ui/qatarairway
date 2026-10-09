# Capture: query = "ت" (live original) — THE DECISIVE ONE

Rendered order (city label / station / code):

1.  تورنتو, كندا / تورونتو / YTO
2.  تورنتو, كندا / مطار تورونتو ليستر بي بيرسون الدولي / YYZ
3.  تورنتو, كندا / مطار بيلي بيشوب تورونتو سيتي / YTZ
4.  تينريف, اسبانيا / تينيريفي / TCI
5.  تينريف, اسبانيا / مطار تينيريفي سور / TFS
6.  تينريف, اسبانيا / مطار تينيريفي نورت سيوداد دي لا لاجونا / TFN
7.  Bangkok, تايلاند / مطار دون مويانج الدولي / DMK
8.  Gwadar, باكستان / Gwadar International Airport / GWD
9.  London, المملكة المتحدة / لندن / LON
10. لندن, المملكة المتحدة / مطار لندن جاتويك / LGW
11. لندن, المملكة المتحدة / مطار لندن هيثرو / LHR
12. London, المملكة المتحدة / محطة قطار لندن فيكتوريا / ZEP
13. London, المملكة المتحدة / محطة قطار لندن يوستن / QQU
14. London, المملكة المتحدة / مطار لندن ستانستيد / STN
15. London, المملكة المتحدة / مطار لندن سيتي / LCY
16. London, المملكة المتحدة / مطار لندن لوتون / LTN
17. New York, ... / مدينة نيويورك / NYC
18. نيويورك, ... / مطار جون إف كينيدي الدولي / JFK
19. Binghamton, ... / مطار جريتر بينجهام... / BGM
...

## CONFIRMED RULES

1. **Tier 1 = rows whose Arabic CITY starts with the query**, ordered
   alphabetically by the Arabic city name: تورنتو then تينريف.
   Wait — Arabic alphabetical would be تو before تي? و comes AFTER ي in the
   Arabic abjad order used for sorting? Standard Arabic alphabet order is:
   ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي
   so و (26th) < ي (27th) → تو < تي. YES, matches: تورنتو then تينريف.
   This is plain Unicode codepoint order too (و=0x648 < ي=0x64A). Consistent.

2. **Tier 2 = rows matching elsewhere** (country/airport name), ordered
   alphabetically by the LATIN city name:
   Bangkok(تايلاند), Gwadar(باكستان), London(المملكة المتحدة),
   New York(الولايات المتحدة), Binghamton...
   NOTE: BGM (Binghamton) comes right after JFK because it belongs to the
   New York cityCode group (NYC) — group members stay together.

3. **Intra-group order** = the group's own city row first (allAirport=Y), then
   the remaining rows. For LON the tail is LGW LHR ZEP QQU STN LCY LTN which is
   NOT feed order (feed: LCY LGW LHR LTN QQU STN ZEP) and NOT code order.
   Same tail appeared in the "ا" capture → the tail order is STABLE per group,
   independent of the query. So it is a fixed per-group ordering that comes from
   the original's own data/config, not derivable from cityList_ar.json.

## DECISION

The tail order is fixed per city group and identical across queries. So I can
harvest it ONCE per multi-airport city group and store it as an explicit
override table. There are only ~40 multi-airport groups worth caring about
(LON, NYC, PAR, MOW, BJS, TYO, MIL, ROM, WAS, CHI, YTO, TCI, BUE, RIO, SAO,
STO, OSA, SEL, JKT, IST, BKK, DXB...). Everything else is single-airport and
trivially ordered.

Known tails harvested so far:
  LON: LON LGW LHR ZEP QQU STN LCY LTN
  NYC: NYC JFK ALB BGM ITH ISP SWF OGS SLK BUF SYR EWR LGA ART HPN
  PAR: PAR CDG XCR ORY
  MOW: MOW SVO DME VKO
  BJS: BJS PKX PEK
  HNY: HNY HBP
  YTO: YTO YYZ YTZ
  TCI: TCI TFS TFN
  BUE: BUE EZE AEP
  BUH: BUH OTP

Plus the tier rules above, which ARE derivable. Implement:
  tier1 = city.startsWith(q), sort by city
  tier2 = else match, sort by latin city name of the group head
  groups keep their harvested tail order; unknown groups fall back to
  head-first + feed order.
