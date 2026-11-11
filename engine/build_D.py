import json,sys,datetime
from model import *
def build_D(S,today=None):
    today=today or datetime.date.today()
    m=today.month-2; y=today.year+(m<=0); m=m+12 if m<=0 else m; y=today.year-(1 if today.month<=2 else 0)
    cutoff=datetime.date(y,m,min(today.day,28)).isoformat()
    T,A,g=load(S)
    EX=json.load(open(S+'/extras.json'));BZ=json.load(open(S+'/balsize.json'));IM=json.load(open(S+'/imgs.json'))
    OV=json.load(open(S+'/overrides.json'));FL=json.load(open(S+'/flags.json'))
    rem=set(FL['removed_static'])|{int(k) for k in json.load(open(S+'/removed_reasons.json'))}
    hide=set(FL['hide'])
    D=[];ALL={}
    for c in sorted(g):
        ids=g[c];o=merged(T,ids)
        for k,v in OV.get(str(c),{}).items(): o[k]=v
        prices=[r[14] for r in (T[i-1] for i in ids) if r[14]!='']
        allp=prices+[r[15] for r in (T[i-1] for i in ids) if r[15]!='']
        price=min(prices) if prices else ''
        prev=max(allp) if allp else ''
        if prev!='' and price!='' and prev<=price: prev=''
        o['price']=price;o['prev']=prev
        new=1 if (o['first'] and (today-datetime.date.fromisoformat(o['first'])).days<=7 and len(ids)==1) else 0
        d=dict(id=c,last=o['last'],deal=o['deal'],type=o['type'],city=o['city'],nb=o['nb'],street=o['street'],hn=str(o['hn']),
               rooms=o['rooms'] if o['rooms']!='' else None,floor=o['floor'] if o['floor']!='' else None,sqm=o['sqm'] if o['sqm']!='' else None,
               price=price if price!='' else None,prev=prev if prev!='' else None,isnew=new,el=o['el'],pk=o['pk'],mm=o['mm'],bal=o['bal'],
               bsz=next((BZ[str(i)] for i in [c]+ids if str(i) in BZ),0),ext=next((EX[str(i)] for i in [c]+ids if str(i) in EX),[]),
               cond=o['cond'],ren=o['ren'],imgs=next((IM[str(i)] for i in [c]+ids if str(i) in IM),[]))
        status='removed' if any(i in rem for i in ids) else ('hidden' if c in hide or not (o['street'] or o['nb']) or price=='' else ('expired' if o['last']<cutoff else 'active'))
        ALL[c]=(d,o,ids,status)
        if status=='active': D.append(d)
    return D,ALL,cutoff
