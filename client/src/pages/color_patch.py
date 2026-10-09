# Jazeera blue palette -> Qatar Airways maroon palette
mapping = {
    '#004A97': '#5C0931',  # primary brand
    '#004a97': '#5C0931',
    '#001326': '#2E0518',  # dark
    '#003a78': '#4A0727',  # dark hover
    '#003581': '#4A0727',
    '#003875': '#4A0727',
    '#41b4e6': '#A21B47',  # accent
    '#cfe0f3': '#EFD9E2',  # light tint
    '#e1ecf7': '#F5E6EC',
    '#eef3f8': '#FAF3F6',
    '#e7f3fb': '#F8EDF2',
    '#f3f8ff': '#FDF7FA',
    '#cfd8e3': '#E5D3DB',
    '#dbe7f5': '#F0DFE7',
    '#E8F4FD': '#F9EEF3',
    '#5b6b7b': '#6B5560',
    '#9aa7b4': '#B49AA5',
    '#7a8a9a': '#9A7A88',
    '#555659': '#5A5257',
}

with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

for old, new in mapping.items():
    c = c.replace(old, new)

with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("colors replaced")
