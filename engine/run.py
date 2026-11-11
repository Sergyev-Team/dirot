"""GitHub Actions entry: python engine/run.py prepare|build|finish  (state dir in $DIROT_STATE)"""
import os,sys,json,re,base64,hashlib,datetime,urllib.request,urllib.parse
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
S=os.environ.get('DIROT_STATE','/tmp/dirot_state'); os.makedirs(S,exist_ok=True)
URL=os.environ.get('SHEET_URL',''); TOK=os.environ.get('SHEET_TOKEN',''); PW=os.environ.get('DIROT_PW','')
READY=bool(URL and TOK and PW)
sys.path.insert(0,HERE); import state_tool
def get(op):
    with urllib.request.urlopen(URL+'?'+urllib.parse.urlencode({'t':TOK,'op':op}),timeout=120) as r: return json.loads(r.read())
def post(body):
    req=urllib.request.Request(URL,data=json.dumps(dict(t=TOK,**body)).encode(),headers={'Content-Type':'text/plain'})
    with urllib.request.urlopen(req,timeout=120) as r: return json.loads(r.read())
def num(x):
    x=str(x).replace(',','').replace('₪','').strip()
    if x=='': return ''
    try: v=float(x); return int(v) if v==int(v) else v
    except: return x
def dt(x):
    m=re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})',x or ''); return f'{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}' if m else (x or '')
def out(k,v):
    if os.environ.get('GITHUB_OUTPUT'): open(os.environ['GITHUB_OUTPUT'],'a').write(f'{k}={v}\n')
def digest():
    return hashlib.md5(b''.join(open(os.path.join(S,f),'rb').read() for f in state_tool.FILES if f!='meta.json' and os.path.exists(os.path.join(S,f)))).hexdigest()
def prepare():
    state_tool.unpack(S,PW)
    open(S+'/.digest0','w').write(digest())
    meta0=open(S+'/meta.json').read() if os.path.exists(S+'/meta.json') else ''
    open(S+'/.meta0','w').write(meta0)
    meta=json.load(open(S+'/meta.json')) if os.path.exists(S+'/meta.json') else {}
    rows=get('table')['rows']; T=[];rem={}
    for i,r in enumerate(rows):
        r=list(r)+['']*(27-len(r))
        if not str(r[0]).strip(): continue
        T.append([dt(r[1]),dt(r[2]),num(r[3]),r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11],num(r[12]),num(r[13]),num(r[14]),num(r[15]),num(r[16]),r[17],r[18],r[19],r[20],r[21],r[22]])
        if str(r[26]).strip(): rem[str(i+1)]=r[26]
    json.dump(T,open(S+'/table_all.json','w'),ensure_ascii=False); json.dump(rem,open(S+'/removed_reasons.json','w'),ensure_ascii=False)
    h=hashlib.md5(json.dumps([T,rem],ensure_ascii=False).encode()).hexdigest()
    items=get('inbox').get('items',[])
    EX=json.load(open(S+'/extras.json'));BZ=json.load(open(S+'/balsize.json'));IM=json.load(open(S+'/imgs.json'))
    acks=[]
    for it in items:
        i=str(it['id'])
        if it.get('extras'): EX[i]=it['extras']
        if it.get('bsz'): BZ[i]=it['bsz']
        ph=[p for p in it.get('photos') or [] if p]
        if ph:
            d=os.path.join(ROOT,'img',i); os.makedirs(d,exist_ok=True)
            old=IM.get(i,[]) if not it.get('replacePhotos') else []
            if it.get('replacePhotos'):
                for f in os.listdir(d): os.remove(os.path.join(d,f))
            n=len(old); new=[]
            for b in ph:
                n+=1; open(os.path.join(d,f'{n}.jpg'),'wb').write(base64.b64decode(b)); new.append(f'img/{i}/{n}.jpg')
            IM[i]=old+new
        acks.append(it['qrow'])
    json.dump(EX,open(S+'/extras.json','w'),ensure_ascii=False);json.dump(BZ,open(S+'/balsize.json','w'));json.dump(IM,open(S+'/imgs.json','w'))
    today=datetime.date.today().isoformat()
    need=bool(items) or h!=meta.get('hash') or today!=meta.get('day') or os.environ.get('FORCE')=='1'
    meta.update(hash=h,day=today,pending_acks=acks); json.dump(meta,open(S+'/meta.json','w'))
    print('rows',len(T),'inbox',len(items),'build',need); out('build','true' if need else 'false')
def build():
    os.environ['DIROT_ROOT']=ROOT
    import subprocess; subprocess.check_call([sys.executable,os.path.join(HERE,'build_all.py'),S])
def finish():
    meta=json.load(open(S+'/meta.json')); acks=meta.pop('pending_acks',[])
    json.dump(meta,open(S+'/meta.json','w'))
    if digest()!=open(S+'/.digest0').read() or open(S+'/meta.json').read()!=open(S+'/.meta0').read(): state_tool.pack(S,PW)
    if acks: print(post({'op':'ack','rows':acks}))
if __name__=='__main__':
    if not READY:
        print('secrets not set yet - skipping'); out('build','false'); sys.exit(0)
    {'prepare':prepare,'build':build,'finish':finish}[sys.argv[1]]()
