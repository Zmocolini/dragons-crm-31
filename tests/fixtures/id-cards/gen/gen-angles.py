# Generatorul pozelor ang-*.jpg (CI + permis în orice unghi, perspectivă) — din sesiunea care a adăugat
# orientarea (691dea9). Doar .jpg-urile și expected.json au intrat în repo; .pgm-urile nu sunt folosite.
# Corpus sintetic de poze cu acte (CI românesc TD2 + permis de ședere TD1), fotografiate în orice poziție.
# Scrie <out>/<name>.jpg (ce încarcă userul), <out>/<name>.pgm (aceeași poză în gri, pt pipeline-ul nou în Node)
# și <out>/expected.json.
import json, math, random, sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
F = "/System/Library/Fonts/Supplemental/"
arial = lambda s: ImageFont.truetype(F + "Arial.ttf", s)
arialb = lambda s: ImageFont.truetype(F + "Arial Bold.ttf", s)
mono = lambda s: ImageFont.truetype(F + "Andale Mono.ttf", s)
KEY = "279146358279"

def chk(s):
    v=lambda c: 0 if c=="<" else int(c) if c.isdigit() else ord(c)-55
    return str(sum(v(c)*[7,3,1][i%3] for i,c in enumerate(s))%10)

def cnp_of(body):
    s = sum(int(d) * int(k) for d, k in zip(body, KEY)) % 11
    return body + str(1 if s == 10 else s)

def card(kind, surname, given, cnp, expiry):
    W, H = 1012, 638
    im = Image.new("RGB", (W, H), (226, 232, 238))
    d = ImageDraw.Draw(im)
    for y in range(0, H, 6):  # gilosaj
        d.line([(x, y + 4 * math.sin(x / 23 + y / 41)) for x in range(0, W, 8)], fill=(205, 214, 226), width=1)
    d.rectangle([40, 120, 300, 440], fill=(150, 150, 160))  # poza
    d.ellipse([110, 170, 230, 300], fill=(120, 110, 105))
    d.text((40, 30), "ROMANIA  ROUMANIE  ROMANIA", font=arialb(34), fill=(30, 50, 110))
    title = "CARTE DE IDENTITATE" if kind == "ci" else "PERMIS DE SEDERE"
    d.text((40, 75), title, font=arialb(28), fill=(30, 50, 110))
    x = 330
    d.text((x, 120), f"CNP {cnp}", font=arialb(30), fill=(20, 20, 20))
    d.text((x, 170), "Nume/Nom/Last name", font=arial(18), fill=(60, 60, 90))
    d.text((x, 192), surname, font=arialb(30), fill=(20, 20, 20))
    d.text((x, 240), "Prenume/Prenom/First name", font=arial(18), fill=(60, 60, 90))
    d.text((x, 262), " ".join(given), font=arialb(30), fill=(20, 20, 20))
    d.text((x, 310), "Valabilitate/Validite/Validity", font=arial(18), fill=(60, 60, 90))
    d.text((x, 332), f"01.06.19-{expiry[6:]}.{expiry[3:5]}.20{expiry[:2]}", font=arialb(26), fill=(20, 20, 20))
    names = surname + "<<" + "<".join(given)
    yymmdd = expiry.replace(".", "")
    if kind == "ci":
        opt = cnp[0] + cnp[7:]
        l1 = ("IDROU" + names).ljust(36, "<")[:36]
        dob = cnp[1:7]
        l2 = f"KS123456<{chk('KS123456<')}ROU{dob}{chk(dob)}{'M' if cnp[0] in '157' else 'F'}{yymmdd}{chk(yymmdd)}{opt}"
        l2 += chk(l2[0:10] + l2[13:20] + l2[21:35])
        lines = [l1, l2]
    else:
        l1 = "IRROU1234567<<<<<<<<<<<<<<<<<"[:30].ljust(30, "<")
        l2 = f"{cnp[1:7]}{chk(cnp[1:7])}M{yymmdd}{chk(yymmdd)}BGD<<<<<<<<<<<0"[:30].ljust(30, "<")
        l3 = names.ljust(30, "<")[:30]
        lines = [l1, l2, l3]
    fs = 33 if kind == "ci" else 38
    y0 = H - 30 - len(lines) * (fs + 12)
    for i, l in enumerate(lines):
        d.text((40, y0 + i * (fs + 12)), l, font=mono(fs), fill=(15, 15, 15))
    im.mrz = lines
    return im

def photo(cardim, angle, frame=(2400, 1800), scale=0.62, seed=0, dark=False):
    rnd = random.Random(seed)
    bg = Image.new("RGB", frame, (120, 85, 55))
    px = bg.load()
    for y in range(0, frame[1], 3):  # lemn
        for x in range(0, frame[0], 3):
            v = int(20 * math.sin(x / 37 + 3 * math.sin(y / 90)) + rnd.randint(-12, 12))
            c = (120 + v, 85 + v, 55 + v // 2)
            for dy in range(3):
                for dx in range(3):
                    if x + dx < frame[0] and y + dy < frame[1]: px[x + dx, y + dy] = c
    cw = int(min(frame) * scale * 1.45) if frame[0] >= frame[1] else int(frame[0] * scale * 1.45)
    cw = min(cw, int(max(frame) * 0.9))
    c = cardim.resize((cw, int(cw * cardim.height / cardim.width)), Image.LANCZOS).convert("RGBA")
    w0, h0 = c.size
    j = lambda v: rnd.uniform(-0.09, 0.09) * v
    dst = [(j(w0), j(h0)), (w0 + j(w0), j(h0)), (w0 + j(w0), h0 + j(h0)), (j(w0), h0 + j(h0))]
    src = [(0, 0), (w0, 0), (w0, h0), (0, h0)]
    A = []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    coeffs = np.linalg.solve(np.array(A, float), np.array([p for uv in src for p in uv], float))
    c = c.transform((w0, h0), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)
    c = c.rotate(angle, expand=True, resample=Image.BICUBIC)
    bg.paste(c, ((frame[0] - c.width) // 2 + rnd.randint(-60, 60), (frame[1] - c.height) // 2 + rnd.randint(-60, 60)), c)
    # umbră / lumină neuniformă
    grad = Image.linear_gradient("L").resize(frame).rotate(rnd.randint(0, 359))
    bg = Image.composite(bg, ImageEnhance.Brightness(bg).enhance(0.55 if dark else 0.75), grad)
    return bg.filter(ImageFilter.GaussianBlur(1.5))

expected = {}
people = [
    ("ci", "NEAGU", ["ADRIAN", "COSTEL"], cnp_of("178081940012"), "30.10.27"),
    ("ci", "VASILESCU", ["ROXANA"], cnp_of("296020212349"), "34.02.02"),
    ("permit", "UDDIN", ["SALAH"], cnp_of("795050540007"), "29.05.05"),
    ("permit", "MAGAR", ["SURESH", "KUMAR"], cnp_of("897090940021"), "28.09.09"),
]
rnd0 = random.Random(31337)
cases = []
for p in range(4):
    for k in range(4):
        ang = rnd0.choice([0, 90, 180, 270]) + rnd0.uniform(-35, 35)
        frame = rnd0.choice([(2400, 1800), (1800, 2400), (2200, 2200)])
        cases.append((p, round(ang, 1), frame, rnd0.uniform(0.38, 0.62), rnd0.random() < 0.3))
for i, (p, ang, frame, sc, dark) in enumerate(cases):
    kind, sur, giv, cnp, exp = people[p]
    cd = card(kind, sur, giv, cnp, exp)
    im = photo(cd, ang, frame, sc, seed=i, dark=dark)
    name = f"{i:02d}-{kind}-{ang}"
    im = im.resize((im.width * 2 // 3, im.height * 2 // 3), Image.LANCZOS)
    im.save(OUT / f"{name}.jpg", quality=60)
    im.convert("L").save(OUT / f"{name}.pgm")
    full = " ".join(g.title() for g in giv) + " " + sur.title()
    exp_iso = f"20{exp[:2]}-{exp[3:5]}-{exp[6:]}"
    expected[name] = {"mrz": cd.mrz, "fullName": full, "cnp": cnp, **({"expiryIso": exp_iso} if kind == "ci" else {})}
(OUT / "expected.json").write_text(json.dumps(expected, indent=1))
print(len(expected), "imagini")
