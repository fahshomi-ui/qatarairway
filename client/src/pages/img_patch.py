with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

repl = {
    '/jazeera_files/web_nav-en': '/qatar-images/qatar-airways-logo.svg',
    '/jazeera_files/Summer_WEB_EN': '/qatar-images/hero.jpg',
    '/jazeera_files/Banner_Kuwait_MOB_EN.jpg': '/qatar-images/damascus.jpg',
    '/jazeera_files/Summer_MOB_EN.jpg': '/qatar-images/hero.jpg',
    '/jazeera_files/img-banner': '/qatar-images/qsuite.jpg',
    '/jazeera_files/kw.jpg': '/qatar-images/qa-flag.png',
    'alt="Jazeera Airways"': 'alt="Qatar Airways"',
    'alt="Jazeera Membership Benefits"': 'alt="Qatar Airways Privilege Club"',
}
for o, n in repl.items():
    c = c.replace(o, n)

with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("images replaced")
