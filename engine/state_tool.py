"""Pack/unpack the private engine state (encrypted with the boards password)."""
import os,sys,json,base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
FILES=['merge.json','extras.json','balsize.json','imgs.json','overrides.json','flags.json','mkt.json','buyers_snapshot.json','og_manifest.json','rb/c84971d9f1d2f.json','meta.json']
ENC=os.path.join(os.path.dirname(os.path.abspath(__file__)),'state.enc')
def _key(pw,salt): return PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=200000).derive(pw.encode())
def unpack(S,pw):
    raw=json.load(open(ENC)); salt=base64.b64decode(raw['s']); iv=base64.b64decode(raw['i'])
    data=json.loads(AESGCM(_key(pw,salt)).decrypt(iv,base64.b64decode(raw['c']),None))
    for f,v in data.items():
        p=os.path.join(S,f); os.makedirs(os.path.dirname(p),exist_ok=True); open(p,'w').write(v)
def pack(S,pw):
    data={f:open(os.path.join(S,f)).read() for f in FILES if os.path.exists(os.path.join(S,f))}
    salt=os.urandom(16); iv=os.urandom(12); b=lambda x:base64.b64encode(x).decode()
    ct=AESGCM(_key(pw,salt)).encrypt(iv,json.dumps(data,ensure_ascii=False).encode(),None)
    json.dump({'s':b(salt),'i':b(iv),'c':b(ct)},open(ENC,'w'))
if __name__=='__main__':
    cmd,S=sys.argv[1],sys.argv[2]; pw=os.environ.get('DIROT_PW') or open(os.path.join(S,'.pw')).read().strip()
    (unpack if cmd=='unpack' else pack)(S,pw); print(cmd,'ok')
