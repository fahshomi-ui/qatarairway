# Original booking widget — visual spec (measured from screenshot)

Reference screenshot crop: /home/ubuntu/orig_widget.png (1786x506, scale ≈ 2x of a 893px-wide viewport, i.e. roughly 1.4x of a 1280 CSS px layout).

## Overall card
White card, rounded top-left corner visibly larger (~8px), subtle shadow, sits overlapping the hero image bottom. Card body has generous horizontal padding (~32px at 1280px width).

## Tab row
Background is a very light warm grey (#f7f5f6-ish) for inactive area; the **active tab sits on white** and extends the white of the body upward — there is no maroon underline visible in the screenshot; instead the active tab is distinguished purely by the white background plus maroon text and maroon icon. Tabs are right-aligned (RTL start). Icon appears **to the right of** (before) the label in RTL, separated by ~10px. Label font size ≈ 15px, active weight is normal-to-medium, not heavy bold. Tab height ≈ 56px. Inactive label colour is near-black (#3a3a3a), active is maroon (#5c0931). Icons are line-art (outline) style, not solid fills.

## Trip-type radio row
Right-aligned, sits ~20px below the tab row. Selected radio is a filled **dark blue/indigo** dot (not maroon) — appears as a solid indigo circle with white centre dot. Unselected radios are thin grey outlined circles ~20px. Label size ≈ 14px, dark grey. Gap between options ≈ 30px.

## Field row
One bordered rounded rectangle (radius ≈ 6px, border 1px #e0e0e0, very light) spanning the full body width, height ≈ 62px. Cells are separated by **short thin vertical dividers** that do not span the full height (they are inset vertically, roughly the middle 60%). Each cell: tiny grey label on the first line (≈ 11-12px, #767676) and the value beneath in dark near-black bold (≈ 15-16px). Both are right-aligned in RTL. Icons appear at the **start (right) edge** of some cells, small and outline style.

Cell order right-to-left: `من` (with plane icon) | circular **swap** button (two horizontal arrows, thin outline, no visible border circle in the screenshot — it looks like a bare icon) | `إلى` (with landing-plane icon) | `رحلة المغادرة` (calendar icon) | `رحلة ذهاب وعودة` (calendar icon) | `المسافرون / درجة السفر` (person icon) with a **chevron-down** at the far left end of the row.

Note: in the original the "من" and "إلى" cells are empty placeholders (label only, no value) until the user types.

## Footer row
Left side (RTL end): maroon pill button `ابحث عن الرحلات`, radius fully rounded (~28px), height ≈ 52px, horizontal padding ≈ 48px, font ≈ 16px, colour #8e2157/#5c0931 family — the screenshot reads closer to **#8e2157** (a lighter maroon/magenta) than the darker header maroon.
Middle: `إضافة رمز ترويجي` as plain dark text with a thin `+` glyph to its left; **not** maroon-coloured — it is dark grey/black.
Right side (RTL start): checkbox `احجز باستخدام نقاط أفيوس`, square outline checkbox ~20px, label dark grey ≈ 14px.

## Key corrections vs current clone
1. Active tab has **no maroon bottom border**; distinction is white background + maroon text.
2. Tab icons are outline/line-art, positioned before the label in RTL reading order.
3. Radio selected colour is **indigo/dark blue**, not maroon.
4. Field dividers are short/inset, not full-height.
5. `من` and `إلى` should show label only (empty value), matching the original's untouched state.
6. Promo-code text is dark, not maroon; the `+` sits after the text in RTL.
7. Search button maroon is the lighter `#8e2157`.
8. Passenger cell has a chevron-down control at the row's end.
