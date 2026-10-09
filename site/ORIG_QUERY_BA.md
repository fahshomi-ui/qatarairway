# Second capture: query = "ب" (live original)

Order as rendered (city label / station / code):

1.  بارانكابيرميجا, كولومبيا / مطار ياريجويز / EJA
2.  بايشان, الصين / مطار بايشان تشانغباى شان / NBS
3.  بريزيدنت برودينتي, البرازيل / مطار أدهيمار دي باروس الإقليمي / PPB
4.  بوا فيستا, البرازيل / مطار بوا فيستا / BVB
5.  بوبايان, كولومبيا / مطار جويلرمو ليون فالينسيا / PPN
6.  بوجوتا, كولومبيا / مطار إلدورادو الدولي / BOG
7.  بوخارست, رومانيا / بوخارست / BUH
8.  بوخارست, رومانيا / مطار هنري كواندا الدولي / OTP
9.  بورونجان, الفليبين / مطار بورونجان / BPA
10. بولي/ألاشانكو, الصين / مطار بولي ألاشانكو / BPL
11. بويرتو ناتاليس, شيلي / مطار تنينتي خوليو جالاردو / PNT
12. بوينوس أيرس, الأرجنتين / بوينس آيرس / BUE
13. بوينس ايرس, الأرجنتين / مطار مِنيستر بيستاريني الدولي / EZE
14. بوينس ايرس, الأرجنتين / مطار خورخي نيوبري إيربارك / AEP
15. Gwadar, باكستان / Gwadar International Airport / GWD
16. Misurata, ليبيا / مطار مصراتة / MRA
17. Paris, فرنسا / باريس / PAR
18. باريس, فرنسا / مطار شارل ديجول الدولي / CDG
19. باريس, فرنسا / مطار باريس-أورلي / ORY
20. Quetta, باكستان / مطار كويتا / UET
21. Rio de Janeiro, البرازيل / ريو دي جانيرو / R...

## THE RULE (finally unambiguous — two tiers)

**Tier 1 — rows whose Arabic CITY name starts with the query**, sorted
alphabetically by that Arabic city name:
بارانكابيرميجا, بايشان, بريزيدنت, بوا فيستا, بوبايان, بوجوتا, بوخارست,
بورونجان, بولي, بويرتو, بوينوس/بوينس.
(Arabic alphabetical: ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي —
so با < بر < بو is correct.)

**Tier 2 — rows that match only elsewhere** (Arabic country name, or the
station/airport name), sorted alphabetically by the **Latin city** name:
Gwadar(باكستان), Misurata(ليبيا), Paris(باريس in station), Quetta(باكستان),
Rio de Janeiro(البرازيل)...

Within a city group the feed row order is kept, city "all airports" row first
(BUH before OTP, BUE before EZE/AEP, PAR before CDG/ORY).

## Cross-check against the "ا" capture

Tier 1 for "ا" = rows whose Arabic city starts with ا: التاي(AAT) only?  No —
also الباني(ALB). Captured order was AAT first, then a long tier-2 run
(Bacau, Bangkok, Beijing, Gwadar, Halmstad, Hengyang, Kassala, London, Luanda,
Misurata, Moscow, New York...) with ALB appearing at #28 inside the New York
group. That is consistent: ALB's group is the New York group (cityCode NYC), and
groups are ordered by Latin city name, so the whole NYC group lands at "New
York" and ALB rides inside it.

So the final algorithm:
1. Determine matching rows (query appears anywhere in city / country / airport /
   aliases — the wide match, which is why 50 rows came back for ا and ~21+ for ب).
   NOTE: 1838 rows matched the wide test for ا but only 50 were rendered — the
   panel renders a limited window (~50) of the ordered result set. Confirm the
   cap, then apply it.
2. Group rows by cityCode (fallback shorthand).
3. Sort groups: tier 1 (group's Arabic city starts with query) before tier 2;
   tier 1 by Arabic city name, tier 2 by Latin city name.
4. Keep feed order within each group.
5. Render only the first ~50 groups/rows.
