import re

with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace colors and styles
content = content.replace('bg-[#004b87]', 'bg-[#5c0931]') # Jazeera blue to Qatar maroon
content = content.replace('text-[#004b87]', 'text-[#5c0931]')
content = content.replace('border-[#004b87]', 'border-[#5c0931]')
content = content.replace('bg-[#00b0f0]', 'bg-[#8a1538]') # Light blue to lighter maroon
content = content.replace('text-[#00b0f0]', 'text-[#8a1538]')
content = content.replace('hover:bg-[#003865]', 'hover:bg-[#4a0727]')
content = content.replace('hover:text-[#003865]', 'hover:text-[#4a0727]')

# Replace logo
content = re.sub(r'<img[^>]*src="[^"]*jazeera-logo[^"]*"[^>]*>', r'<img src="/qatar-images/qatar-airways-logo.svg" alt="Qatar Airways" className="h-8 md:h-10" />', content)
content = re.sub(r'<img[^>]*src="[^"]*logo[^"]*"[^>]*>', r'<img src="/qatar-images/qatar-airways-logo.svg" alt="Qatar Airways" className="h-8 md:h-10" />', content)

# Replace banner images
content = re.sub(r'const banners = \[.*?\];', r'''const banners = [
  { img: "/qatar-images/hero.jpg", title: "عطلة الصيف بانتظارك مع رحلاتنا الموسمية", link: "احجز الآن" },
  { img: "/qatar-images/qsuite.jpg", title: "استمتع بتجربة السفر الأرقى", link: "اعرف المزيد" },
  { img: "/qatar-images/damascus.jpg", title: "استمتع برحلتين يومياً إلى دمشق", link: "اعرف المزيد" },
  { img: "/qatar-images/student.jpg", title: "حلّق عالياً مع نادي الطلاب", link: "انضم الآن" }
];''', content, flags=re.DOTALL)

# Replace offers
content = re.sub(r'const offers = \[.*?\];', r'''const offers = [
  { img: "/qatar-images/london.jpg", city: "لندن", date: "22 سبتمبر 2026 - 29 سبتمبر 2026", price: "QAR 3790" },
  { img: "/qatar-images/phuket.jpg", city: "بوكيت", date: "25 أغسطس 2026 - 15 سبتمبر 2026", price: "QAR 4410" },
  { img: "/qatar-images/cairo.jpg", city: "القاهرة", date: "23 أغسطس 2026 - 22 سبتمبر 2026", price: "QAR 1390" },
  { img: "/qatar-images/amman.jpg", city: "عمّان", date: "25 أغسطس 2026 - 08 سبتمبر 2026", price: "QAR 1830" },
  { img: "/qatar-images/beirut.jpg", city: "بيروت", date: "25 أغسطس 2026 - 09 سبتمبر 2026", price: "QAR 2070" },
  { img: "/qatar-images/nice.jpg", city: "نيس", date: "29 سبتمبر 2026 - 27 أكتوبر 2026", price: "QAR 3410" },
  { img: "/qatar-images/kualalumpur.jpg", city: "كوالالمبور", date: "23 سبتمبر 2026 - 29 سبتمبر 2026", price: "QAR 4480" }
];''', content, flags=re.DOTALL)

with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
