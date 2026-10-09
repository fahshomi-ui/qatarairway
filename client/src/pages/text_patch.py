with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

repl = {
    'Jazeera Airways': 'Qatar Airways',
    'jazeera': 'qatar',
    'Jazeera': 'Qatar Airways',
    'طيران الجزيرة': 'الخطوط الجوية القطرية',
    'الجزيرة': 'القطرية',
    'J9 Rewards': 'Privilege Club',
    'J9 Club': 'Privilege Club',
    'J9': 'QR',
    'KWI': 'DOH',
    'Kuwait': 'Doha',
    'الكويت': 'الدوحة',
    'iata: \'KWI\'': 'iata: \'DOH\'',
}
for o, n in repl.items():
    c = c.replace(o, n)

with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("texts replaced")
