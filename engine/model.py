import json,collections,re
F=['last','first','n','sender','phone','deal','type','city','nb','street','hn','rooms','floor','sqm','price','prev','el','pk','mm','bal','cond','ren']
def _n(s): return re.sub(r'["\'״׳\s\-\.]|רחוב|רח','',str(s or ''))
def _key(r):
    if not r[9] or not str(r[10]).strip(): return None
    return (_n(r[7] or 'פתח תקווה'),_n(r[9]),_n(r[10]))
def load(S):
    T=json.load(open(S+'/table_all.json'));A={int(k):v for k,v in json.load(open(S+'/merge.json')).items()}
    keymap={}
    for i in range(1,len(T)+1):
        if i in A:
            k=_key(T[i-1])
            if k and k not in keymap: keymap[k]=A[i]
    changed=False
    for i in range(1,len(T)+1):
        if i not in A:
            k=_key(T[i-1])
            if k and k in keymap: A[i]=keymap[k]
            else:
                A[i]=i
                if k: keymap[k]=i
            changed=True
    if changed: json.dump({str(k):v for k,v in A.items()},open(S+'/merge.json','w'))
    g=collections.defaultdict(list)
    for i in range(1,len(T)+1): g[A.get(i,i)].append(i)
    return T,A,g
def merged(T,ids):
    rs=sorted([(T[i-1],i) for i in ids],key=lambda x:(x[0][0],x[1]),reverse=True)
    o={}
    for k,f in enumerate(F):
        o[f]=next((r[k] for r,_ in rs if r[k] not in ('',None)),'')
    o['last']=rs[0][0][0]; o['first']=min(r[1] for r,_ in rs if r[1]) if any(r[1] for r,_ in rs) else ''
    o['rows']=[(i,r) for r,i in rs]
    return o
