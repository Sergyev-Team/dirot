import html as H, os, json
def _ff(S):
    w=os.environ.get('DIROT_FONTS',os.path.join(os.path.dirname(os.path.abspath(__file__)),'fonts'))+'/'
    return ''.join(f"@font-face{{font-family:{n};font-weight:{wt};src:url(file://{w}{f})}}" for n,wt,f in [
      ('Heebo',400,'heebo-hebrew-400-normal.woff2'),('Heebo',400,'heebo-latin-400-normal.woff2'),('Heebo',700,'heebo-hebrew-700-normal.woff2'),('Heebo',700,'heebo-latin-700-normal.woff2'),
      ('Heebo',800,'heebo-hebrew-800-normal.woff2'),('Heebo',800,'heebo-latin-800-normal.woff2')])
def page(d,R,S):
    from build_all import fmt
    rooms=(f" {d['rooms'] if d['rooms']!=int(d['rooms']) else int(d['rooms'])} חד׳" if d['rooms'] else '')
    head=H.escape(d['type']+rooms)
    addr=H.escape(', '.join([x for x in [d['street']+(' '+d['hn'] if d['hn'] else ''), d['nb'] if d['nb'] and d['nb']!=d['street'] else '', d['city']] if x]))
    f=[]
    if d['sqm']: f.append(f"{d['sqm']} מ״ר")
    if d['floor'] is not None: f.append('קומת קרקע' if d['floor']==0 else f"קומה {d['floor']}")
    if d['el']=='כן': f.append('מעלית')
    if d['mm']=='כן': f.append('ממ״ד')
    facts=' · '.join(f)
    price=(fmt(d['price'])+' ₪') if d['price'] else ''
    badge='<div class="bd">ירד מחיר</div>' if d['prev'] else ('<div class="bd new">חדש!</div>' if d['isnew'] else '')
    logo=f"file://{R}/f/logo.jpg"
    css=_ff(S)+"*{margin:0;padding:0;box-sizing:border-box}body{width:1200px;height:630px;font-family:Heebo;direction:rtl;overflow:hidden;position:relative}"
    if d['imgs']:
        img=f"file://{R}/{d['imgs'][0]}"
        return f"""<html><head><style>{css}
.bg{{position:absolute;inset:0;background:url('{img}') center/cover}}.sh{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.82) 100%)}}
.lg{{position:absolute;top:26px;right:26px;background:#fff;border-radius:12px;padding:8px 12px}}.lg img{{height:62px;display:block}}
.bd{{position:absolute;top:30px;left:30px;background:#c62828;color:#fff;font-weight:800;font-size:30px;padding:6px 22px;border-radius:12px}}.bd.new{{background:#1b8a4c}}
.t{{position:absolute;right:42px;bottom:88px;color:#fff;text-align:right}}.t h1{{font-size:56px;font-weight:800;line-height:1.1}}.t p{{font-size:30px;margin-top:6px}}
.f{{position:absolute;right:42px;bottom:28px;color:#eee;font-size:28px}}.p{{position:absolute;left:42px;bottom:28px;color:#f3d48a;font-size:64px;font-weight:800;direction:ltr}}
.gl{{position:absolute;left:0;right:0;bottom:0;height:8px;background:#d4af5a}}</style></head><body><div class="bg"></div><div class="sh"></div>
<div class="lg"><img src="{logo}"></div>{badge}<div class="t"><h1>{head}</h1><p>{addr}</p></div><div class="f">{facts}</div><div class="p">{price}</div><div class="gl"></div></body></html>"""
    return f"""<html><head><style>{css}
.l{{position:absolute;left:0;top:0;width:690px;height:630px;background:#fff;display:flex;align-items:center;justify-content:center}}.l img{{width:560px}}
.r{{position:absolute;right:0;top:0;width:502px;height:630px;background:#151515;border-left:8px solid #d4af5a;padding:42px 40px;color:#fff}}
.lg{{float:left;background:#fff;border-radius:12px;padding:8px 12px}}.lg img{{height:70px;display:block}}
.p{{clear:both;padding-top:30px;color:#f3d48a;font-size:66px;font-weight:800;direction:ltr;text-align:right}}h1{{font-size:50px;font-weight:800;margin-top:4px}}
.a{{font-size:28px;color:#ddd;margin-top:16px;line-height:1.45}}.c{{display:inline-block;background:#e9c46a;color:#222;font-weight:700;font-size:24px;border-radius:10px;padding:4px 14px;margin-top:16px}}
.b{{position:absolute;bottom:42px;right:40px;background:#1b8a4c;color:#fff;font-weight:800;font-size:32px;border-radius:14px;padding:12px 30px}}</style></head><body>
<div class="l"><img src="{logo}"></div><div class="r"><div class="lg"><img src="{logo}"></div><div class="p">{price}</div><h1>{head}</h1>
<div class="a">{addr}{' · '+facts if facts else ''}</div><div class="c">תמונות בקרוב</div><div class="b">לחצו לצפייה ›</div></div></body></html>"""
def render(ds,R,S):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    os.makedirs(R+'/img/og',exist_ok=True); tmp=S+'/og_tmp.html'; png=S+'/og_tmp.png'
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':1200,'height':630})
        for d in ds:
            open(tmp,'w').write(page(d,R,S)); pg.goto('file://'+tmp); pg.wait_for_timeout(250)
            pg.screenshot(path=png); Image.open(png).convert('RGB').save(f"{R}/img/og/p{d['id']}.jpg",quality=86)
        b.close()
