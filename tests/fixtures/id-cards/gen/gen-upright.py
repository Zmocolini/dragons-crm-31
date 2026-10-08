# Generatorul pozelor up-XX.jpg (CI drept/înclinat ±3°, degradat: blur, JPEG slab, rezoluție mică, zgomot).
# Rulat dintr-un folder gol: scrie img/idXX.jpg + truth.json; în repo au fost redenumite up-XX.jpg, iar
# truth.json a intrat în ../expected.json. Fonturile vin din macOS — regenerarea pe altă mașină schimbă pixelii
# (deci și amprenta din baseline.json): de aceea pozele sunt comise, nu regenerate la test.
import json, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
random.seed(7)
F = "/System/Library/Fonts/Supplemental/"
sans = lambda s, b=False: ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if b else "/System/Library/Fonts/Supplemental/Arial.ttf", s)
monos = [F+"Courier New Bold.ttf", F+"Andale Mono.ttf", F+"Courier New.ttf"]
people = [("POPESCU","ANDREI-MIHAI","Popescu","Andrei-Mihai"),("IONESCU","MARIA","Ionescu","Maria"),("ȘTEFĂNESCU","ȘTEFAN","Ștefănescu","Ștefan"),
 ("HOSSEIN","MD RAHIM","Hossein","Md Rahim"),("DUMITRU","ELENA-IOANA","Dumitru","Elena-Ioana"),("RĂDULESCU","TUDOR","Rădulescu","Tudor"),
 ("POPA","ELEN","Popa","Elen"),("CONSTANTINESCU","ALEXANDRU","Constantinescu","Alexandru"),("AHSAN","MOHAMMAD","Ahsan","Mohammad"),
 ("NEAGU","IULIAN","Neagu","Iulian"),("MUNTEANU","CRISTINA","Munteanu","Cristina"),("ȚĂRANU","MIHAIL","Țăranu","Mihail")]
deacc = str.maketrans("ĂÂÎȘȚŞŢ","AAISTST")
key="279146358279"
def cnp_for(i):
    b = f"{1 if i%2==0 else 2}{80+i%19:02d}{1+i%12:02d}{1+i%28:02d}40{i:03d}"
    s = sum(int(b[k])*int(key[k]) for k in range(12)); return b + str(1 if s%11==10 else s%11)
def chk(s):
    w=[7,3,1]; v=lambda c: int(c) if c.isdigit() else (0 if c=="<" else ord(c)-55)
    return str(sum(v(c)*w[i%3] for i,c in enumerate(s))%10)
truth=[]
for i in range(24):
    sur, giv, tsur, tgiv = people[i%len(people)]
    cnp = cnp_for(i)
    W,H=1400,880
    card = Image.new("RGB",(W,H),(222,232,236)); d = ImageDraw.Draw(card)
    for k in range(60):  # guilloche
        y=random.randint(0,H); d.line([(0,y),(W,y+random.randint(-80,80))],fill=(200+random.randint(0,30),215,225),width=2)
    d.text((60,40),"ROMANIA  CARTE DE IDENTITATE",font=sans(40,True),fill=(30,40,90))
    d.text((60,120),"SERIA KS NR 1234"+f"{i:02d}",font=sans(30),fill=(20,20,20))
    d.text((60,170),"CNP "+cnp,font=sans(34,True),fill=(20,20,20))
    d.text((420,240),"Nume/Nom/Last name",font=sans(24),fill=(60,60,60)); d.text((420,272),sur,font=sans(40,True),fill=(10,10,10))
    d.text((420,340),"Prenume/Prenom/First name",font=sans(24),fill=(60,60,60)); d.text((420,372),giv,font=sans(40,True),fill=(10,10,10))
    d.rectangle([60,240,380,620],fill=(170,180,190))
    l1 = ("IDROU"+sur.translate(deacc)+"<<"+giv.translate(deacc).replace(" ","<").replace("-","<")).ljust(36,"<")[:36]
    doc=f"KS1234{i:02d}"; dob=cnp[1:7]; exp="290513"
    l2 = doc+chk(doc)+"ROU"+dob+chk(dob)+("M" if cnp[0] in "15" else "F")+exp+chk(exp)+cnp[0]+cnp[7:]
    l2 = l2 + chk(l2[0:10]+l2[13:20]+l2[21:35])
    mf = ImageFont.truetype(monos[i%3], 44)
    d.text((40,730),l1,font=mf,fill=(10,10,10)); d.text((40,800),l2,font=mf,fill=(10,10,10))
    # degradations — „fotografie de telefon"
    deg = i%6
    img = card
    bg = Image.new("RGB",(1700,1150),(random.randint(60,140),)*3)
    if deg in (1,4): img = img.rotate(random.choice([-3,-2,2,3]),expand=True,fillcolor=(90,90,90))
    bg.paste(img,(random.randint(40,200),random.randint(40,150))); img = bg
    if deg in (2,4): img = img.filter(ImageFilter.GaussianBlur(1.6))
    if deg==3: img = img.resize((800,int(800*img.height/img.width)))
    if deg==5:
        px=img.load()
        for _ in range(60000):
            x,y=random.randrange(img.width),random.randrange(img.height); v=random.randint(0,255); px[x,y]=(v,v,v)
    q = 30 if deg in (2,3,5) else 70
    p=f"img/id{i:02d}.jpg"; img.save(p,quality=q)
    truth.append({"file":p,"name":f"{tgiv} {tsur}","cnp":cnp,"deg":["clean","rot","blur","small","rot+blur","noise"][deg]})
json.dump(truth,open("truth.json","w"),ensure_ascii=False,indent=1)
print(len(truth))
