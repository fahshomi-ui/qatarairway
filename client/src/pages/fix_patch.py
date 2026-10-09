with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

fixes = {
    'Qatar Airways.Airways': 'qatarairways',
    'Qatar Airways Airways': 'Qatar Airways',
    'جزيرة للشحن الجوي': 'القطرية للشحن الجوي',
    'جزيرة للرحلات الخاصة': 'القطرية للرحلات الخاصة',
    'مبنى الجزيرة': 'مطار حمد الدولي',
    'مواقف مريحة لركّاب الجزيرة': 'مواقف مريحة لركّاب القطرية',
    'الكويت العصرية': 'الدوحة العصرية',
    'DOHD': 'DOH',
}
for o, n in fixes.items():
    c = c.replace(o, n)

with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("fixed")
