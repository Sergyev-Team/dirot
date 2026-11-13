import json,sys,os,re,base64,datetime,hashlib
sys.path.insert(0,os.path.dirname(__file__))
from build_D import build_D
S=sys.argv[1] if len(sys.argv)>1 else os.environ['DIROT_STATE']; R=os.environ.get('DIROT_ROOT',os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); today=datetime.date.fromisoformat(sys.argv[2]) if len(sys.argv)>2 else datetime.date.today()
D,ALL,cutoff=build_D(S,today)
fmt=lambda n:f"{int(n):,}"
# ---- console rows
def console_rows():
    out=[]
    for c,(d,o,ids,st) in sorted(ALL.items()):
        br={};
        for i,r in sorted(o['rows'],key=lambda x:(x[1][0],-x[0]),reverse=True):
            k=(r[4] or r[3])
            if k not in br: br[k]=dict(name=r[3],phone=r[4],last=r[0],id=i)
        row=dict(id=c,ids=sorted(ids),deal=o['deal'],type=o['type'],city=o['city'],nb=o['nb'],street=o['street'],hn=str(o['hn']),rooms=o['rooms'],floor=o['floor'],sqm=o['sqm'],
                 price=d['price'] if d['price'] is not None else '',prev=d['prev'] if d['prev'] is not None else ('' if d['price'] is None else None),
                 el=o['el'],pk=o['pk'],mm=o['mm'],bal=o['bal'],cond=o['cond'],ren=o['ren'],last=o['last'],first=o['first'],status=st,imgs=len(d['imgs']),brokers=list(br.values()))
        out.append(row)
    return out
def apts():
    return [dict(id=d['id'],deal=d['deal'],type=d['type'],rooms=d['rooms'] or 0,price=d['price'],prev=d['prev'] or 0,el=d['el'],pk=d['pk'],mm=d['mm'],bal=d['bal'],nb=d['nb'],city=d['city'],
                 street=d['street'],hn=d['hn'],floor=d['floor'],sqm=d['sqm'],img=(d['imgs'][0] if d['imgs'] else ''),first=ALL[d['id']][1]['first']) for d in D]
def mkt_rows():
    rows=[];alias={}
    for c,(d,o,ids,st) in sorted(ALL.items()):
        for i in ids: alias[str(i)]=c
        rows.append(dict(id=c,street=d['street'],hn=d['hn'],city=d['city'],nb=d['nb'],rooms=d['rooms'] if d['rooms'] is not None else '',floor=d['floor'],sqm=d['sqm'],price=d['price'],
             el=d['el'],pk=d['pk'],mm=d['mm'],bal=d['bal'],bsz=d['bsz'],cond=d['cond'],ext=d['ext'],imgs=['../'+p for p in d['imgs']],
             prev=d['prev'] or 0,onsite=1 if st=='active' else 0,deal=d['deal'],type=d['type'],first=o['first'],last=o['last']))
    return rows,alias
def buyer_match(rows):
    b=json.load(open(S+'/buyers_snapshot.json')); P={p['name']:p for p in b['profiles']}
    BL=[dict(name=x['name'],phone=x['phone'],profile=x['profile']) for x in b['buyers'] if x.get('phone') and x.get('status','')!='הוסר']
    for r in rows:
        m=[]
        if r['price']:
            for i,x in enumerate(BL):
                p=P.get(x['profile'])
                if not p or p['deal']!=r['deal']: continue
                if p.get('rmin') and r['rooms'] and not (p['rmin']-0.5<=float(r['rooms'])<=(p.get('rmax') or 99)+0.5): continue
                if p.get('budget') and r['price']>p['budget']*1.07: continue
                if any(str(p.get(k,'')).startswith('חובה') and r[k]!='כן' for k in ('el','pk','mm')): continue
                m.append(i)
        r['bm']=m
    return BL
if __name__=='__main__' and os.environ.get('CHECK'):
    old=json.load(open(S+'/rb/c84971d9f1d2f.json'))['rows'];O={r['id']:r for r in old};N={r['id']:r for r in console_rows()}
    n=0
    for c in O:
        for k in O[c]:
            if json.dumps(O[c][k],ensure_ascii=False)!=json.dumps(N[c].get(k),ensure_ascii=False):
                n+=1
                if n<25: print('console',c,k,O[c][k],N[c].get(k))
    print('console diffs',n)
    oa={a['id']:a for a in json.load(open(S+'/buyers_snapshot.json'))['apts']};na={a['id']:a for a in apts()};n=0
    for c in oa:
        if c in na:
            for k in oa[c]:
                if oa[c][k]!=na[c][k]:
                    n+=1
                    if n<10:print('apt',c,k,oa[c][k],na[c][k])
    print('apts diffs',n,set(oa)^set(na))
    om={r['id']:r for r in json.load(open(S+'/rb/eacbed7dad154.json'))['rows']};nr,_=mkt_rows();nm={r['id']:r for r in nr};n=0
    for c in om:
        for k in om[c]:
            if om[c][k]!=nm[c].get(k):
                n+=1
                if n<10:print('mkt',c,k,om[c][k],nm[c].get(k))
    print('mkt diffs',n)
    sys.exit()

# ================= output =================
import html as H
def title_of(d):
    t=d['type']+(f" {d['rooms'] if d['rooms']!=int(d['rooms'] or 0) else int(d['rooms'])} חד׳" if d['rooms'] else '')
    a=d['street']+(' '+d['hn'] if d['hn'] else '')
    loc=', '.join([x for x in [a, d['nb'] if d['nb'] and d['nb']!=d['street'] else '', d['city']] if x])
    p=(fmt(d['price'])+' ₪'+(' לחודש' if d['deal']=='השכרה' else '')) if d['price'] else ''
    return ' · '.join([x for x in [t,loc,p] if x])
def desc_of(d):
    f=[]
    if d['sqm']: f.append(f"{d['sqm']} מ״ר")
    if d['floor'] is not None: f.append('קומת קרקע' if d['floor']==0 else f"קומה {d['floor']}")
    if d['el']=='כן': f.append('מעלית')
    if d['pk']=='כן': f.append('חניה')
    if d['mm']=='כן': f.append('ממ״ד')
    if d['prev']: f.append('ירד מחיר!')
    return ' · '.join(f)
SITE='https://sergyev-team.github.io/dirot/'
def dpage(d):
    t=H.escape(title_of(d),quote=True); ds=H.escape((desc_of(d)+' | ' if desc_of(d) else '')+'צוות סרגייב – לחצו לתמונות ופרטים',quote=True); i=d['id']
    return f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{t}</title><meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:locale" content="he_IL"><meta property="og:site_name" content="צוות סרגייב">
<meta property="og:title" content="{t}"><meta property="og:description" content="{ds}">
<meta property="og:image" content="{SITE}img/og/p{i}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="{SITE}d/{i}.html"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=../#p={i}"><script>location.replace("../#p={i}")</script></head>
<body style="font-family:sans-serif;text-align:center;padding:40px"><a href="../#p={i}">לחצו כאן לצפייה</a></body></html>'''
def og_sig(d): return hashlib.md5(json.dumps([title_of(d),desc_of(d),d['imgs'][:1],d['isnew']],ensure_ascii=False).encode()).hexdigest()
def encrypt_into(path,data,pw):
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    t=open(path).read(); IT=int(re.search(r'IT=(\d+)',t).group(1))
    salt=os.urandom(16); iv=os.urandom(12)
    key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=IT).derive(pw.encode())
    import gzip as _gz; ct=AESGCM(key).encrypt(iv,_gz.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),9,mtime=0),None); b=lambda x:base64.b64encode(x).decode()
    for k,v in (('SALT',b(salt)),('IV',b(iv)),('CT',b(ct))):
        t,n=re.subn(k+r'="[^"]*"',lambda m:f'{k}="{v}"',t,count=1); assert n==1
    open(path,'w').write(t)
def sign_data():
    bs=json.load(open(S+'/buyers_snapshot.json'))
    by=[dict(name=x.get('name',''),phone=x.get('phone',''),profile=x.get('profile',''),status=x.get('status','')) for x in bs.get('buyers',[]) if x.get('name')]
    return dict(sync=json.load(open(S+'/mkt.json')).get('sync'),apts=apts(),buyers=by,bscript=bs.get('script'),btoken=bs.get('token'))
def upload_data():
    import collections as C
    idx=[];street_nb=C.defaultdict(C.Counter);nbs=set();cities=set();br={};last=''
    T=json.load(open(S+'/table_all.json'))
    for i,r in enumerate(T,1):
        if r[9] and r[8]: street_nb[r[9]][r[8]]+=1
        if r[8]: nbs.add(r[8])
        if r[7]: cities.add(r[7])
        if r[3] and r[4]: br[r[3]]=r[4]
        last=max(last,r[0] or '')
    for c,(d,o,ids,st) in sorted(ALL.items()):
        if st=='removed': continue
        bl={}
        for i,r in sorted(o['rows'],key=lambda x:(x[1][0],-x[0]),reverse=True):
            k=r[4] or r[3]
            if k and k not in bl: bl[k]=dict(name=r[3],phone=r[4],id=i)
        idx.append(dict(id=c,street=d['street'],hn=d['hn'],city=d['city'],nb=d['nb'],price=d['price'],last=o['last'],brokers=list(bl.values())))
    mk=json.load(open(S+'/mkt.json'))
    return dict(index=idx,streets={s:n.most_common(1)[0][0] for s,n in street_nb.items()},nbs=sorted(nbs),cities=sorted(cities,key=lambda x:(x!='פתח תקווה',x)),brokers=br,lastDate=last,sync=mk.get('sync'))
def write_all():
    pw=os.environ.get('DIROT_PW') or open(S+'/.pw').read().strip()
    tpl=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'site_template.html')).read()
    open(R+'/index.html','w').write(tpl.replace('__DATA__',json.dumps(D,ensure_ascii=False,separators=(',',':'))))
    for d in D: open(f"{R}/d/{d['id']}.html",'w').write(dpage(d))
    # k/all count
    ka=open(R+'/k/all.html').read(); ka=re.sub(r'\d+ דירות זמינות',f'{len(D)} דירות זמינות',ka); open(R+'/k/all.html','w').write(ka)
    # תמונות קטנות (webp) לרשימת הדירות – נוצרות פעם אחת לכל תמונה
    try:
        from PIL import Image
        import glob as _g
        for p in _g.glob(R+'/img/[0-9]*/[0-9]*.jpg'):
            tp=re.sub(r'/(\d+)\.jpg$',r'/t\1.webp',p)
            if os.path.exists(tp): continue
            try:
                im=Image.open(p); im=im.convert('RGB'); im.thumbnail((720,720)); im.save(tp,'WEBP',quality=70,method=5)
            except Exception as e: print('thumb fail',p,e)
    except Exception as e: print('thumbs skipped',e)
    # נתוני נכס קטנים לפורטל בעלי הנכסים (במקום להוריד את כל האתר)
    os.makedirs(R+'/o/L',exist_ok=True)
    for d in D: open(f"{R}/o/L/{d['id']}.json",'w').write(json.dumps(d,ensure_ascii=False,separators=(',',':')))
    # og manifest
    mf=S+'/og_manifest.json'; man=json.load(open(mf)) if os.path.exists(mf) else {}
    todo=[d for d in D if man.get(str(d['id']))!=og_sig(d) or not os.path.exists(f"{R}/img/og/p{d['id']}.jpg")]
    if todo:
        from og import render
        render(todo,R,S)
        for d in todo: man[str(d['id'])]=og_sig(d)
    json.dump(man,open(mf,'w'))
    # encrypted boards
    encrypt_into(R+'/x/c84971d9f1d2f.html',dict(rows=console_rows(),**{k:v for k,v in json.load(open(S+'/rb/c84971d9f1d2f.json')).items() if k!='rows'}),pw)
    b=json.load(open(S+'/buyers_snapshot.json')); b['apts']=apts(); b['built']=datetime.datetime.now(datetime.timezone.utc).isoformat(); b['sync']=json.load(open(S+'/mkt.json')).get('sync')
    encrypt_into(R+'/x/b018b2a874ee8.html',b,pw)
    mk=json.load(open(S+'/mkt.json')); rows,alias=mkt_rows(); BL=buyer_match(rows)
    encrypt_into(R+'/x/eacbed7dad154.html',dict(rows=rows,alias=alias,buyers=BL,site='https://sergyev-team.github.io/dirot/',**mk),pw)
    if os.path.exists(R+'/x/3a256a46e8e4d.html'): encrypt_into(R+'/x/3a256a46e8e4d.html',upload_data(),pw)
    if os.path.exists(R+'/x/de7f766b5893b.html'): encrypt_into(R+'/x/de7f766b5893b.html',sign_data(),pw)
    print('built',len(D),'active; og rendered',len(todo))
if __name__=='__main__': write_all()
