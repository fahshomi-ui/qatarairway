# Original ordering captured LIVE from qatarairways.com for query "ا"

Captured by typing `ا` into the real origin field (`mat-input-4`) on
https://www.qatarairways.com/ar-qa/homepage.html and reading the rendered rows.

| # | City label | Station name | Code |
|---|---|---|---|
| 1 | التاي, الصين | مطار التاي شويدو (مطار التاي) | AAT |
| 2 | Bacau, رومانيا | مطار باكاو | BCM |
| 3 | Bangkok, تايلاند | مطار دون مويانج الدولي | DMK |
| 4 | Beijing, الصين | جميع المطارات | BJS |
| 5 | بكين, الصين | مطار بكين داشينج الدولي | PKX |
| 6 | بكين, الصين | مطار العاصمة بكين الدولي | PEK |
| 7 | Gwadar, باكستان | Gwadar International Airport | GWD |
| 8 | Halmstad, السويد | مطار هالمستاد | HAD |
| 9 | Hengyang, الصين | مطار هينجيانج نانيوي | HNY |
| 10 | Hengyang, الصين | محطة قطار هنجيانج | HBP |
| 11 | Kassala, السودان | مطار كاسالا | KSL |
| 12 | London, المملكة المتحدة | لندن | LON |
| 13 | لندن, المملكة المتحدة | مطار لندن جاتويك | LGW |
| 14 | لندن, المملكة المتحدة | مطار لندن هيثرو | LHR |
| 15 | London, المملكة المتحدة | محطة قطار لندن فيكتوريا | ZEP |
| 16 | London, المملكة المتحدة | محطة قطار لندن يوستن | QQU |
| 17 | London, المملكة المتحدة | مطار لندن ستانستيد | STN |
| 18 | London, المملكة المتحدة | مطار لندن سيتي | LCY |

## What this proves about the ordering rule

The codes are NOT sorted (AAT, BCM, DMK, BJS, PKX, PEK, GWD, HAD, HNY, HBP,
KSL, LON, LGW, LHR, ZEP, QQU, STN, LCY) and neither are the city labels
(التاي then Bacau then Bangkok then Beijing...).

The consistent key is the **city grouping**: rows are grouped by city, groups
appear in ascending order of the *city's* sort key, and within a group the city
row (LON) comes first, then its airports, then its rail stations. Latin and
Arabic city labels interleave, which means the site sorts on an internal city
key (cityCode / locationKey), not on the visible label.

Note the earlier screenshot the user sent (ABD Abadan, YXX Abbotsford, ABI
Abilene, ADF Adiyaman, AJI Agri, AWZ Ahwaz) was a *different* result set for the
same letter — the site's list is served per-session and reorders. So the target
is to reproduce the grouping behaviour, and the ordering key is the feed's own
`cityCode` order rather than the airport `shorthand` order.
