"""Apps Script code deploy: the sheet runs a fixed loader; this pushes the signed, encrypted code to it.
  pack <file.gs>   (local) encrypt the code into engine/gs/code.enc
  deploy [--force] (GitHub Actions) decrypt, sign and send to the loader if its version differs
"""
import os, sys, json, base64, hashlib, hmac, time, urllib.request
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
ENC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gs', 'code.enc')
URL = os.environ.get('SHEET_URL', '')
def _key(pw, salt): return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=200000).derive(pw.encode())
def pack(path, pw):
    code = open(path, encoding='utf-8').read(); ver = hashlib.sha256(code.encode()).hexdigest()[:12]
    salt, iv = os.urandom(16), os.urandom(12); b = lambda x: base64.b64encode(x).decode()
    ct = AESGCM(_key(pw, salt)).encrypt(iv, json.dumps({'ver': ver, 'code': code}, ensure_ascii=False).encode(), None)
    os.makedirs(os.path.dirname(ENC), exist_ok=True); json.dump({'s': b(salt), 'i': b(iv), 'c': b(ct), 'ver': ver}, open(ENC, 'w')); print('packed', ver)
def _req(data=None, q=''):
    r = urllib.request.Request(URL + q, data=json.dumps(data).encode() if data is not None else None, headers={'Content-Type': 'text/plain;charset=utf-8'})
    return json.loads(urllib.request.urlopen(r, timeout=120).read().decode())
def deploy(pw, force=False):
    raw = json.load(open(ENC)); d = json.loads(AESGCM(_key(pw, base64.b64decode(raw['s']))).decrypt(base64.b64decode(raw['i']), base64.b64decode(raw['c']), None))
    code, ver = d['code'], d['ver']
    try: cur = _req(q='?op=lver')
    except Exception as e: print('loader not reachable:', e); sys.exit(1)
    if not cur.get('loader'): print('loader not installed yet (old script still running) – skipping'); return
    if cur.get('ver') == ver and not force: print('up to date', ver); return
    key = hashlib.sha256((pw + '|gs-deploy').encode()).hexdigest().encode(); ts = int(time.time() * 1000)
    sig = hmac.new(key, f'{ts}|{code}'.encode(), hashlib.sha256).hexdigest()
    r = _req({'op': 'deploy', 'code': code, 'ver': ver, 'ts': ts, 'sig': sig}); print('deploy:', {k: v for k, v in r.items() if k != 'detail'}, r.get('detail', ''))
    if not r.get('ok'): sys.exit(1)
    tok = __import__('re').search(r"const TOKEN = '([^']+)'", code).group(1)
    h = _req({'t': tok, 'op': 'setup'}); print('setup:', h)
    hh = _req({'t': tok, 'op': 'health'}); print('health:', json.dumps(hh, ensure_ascii=False))
    if not h.get('ok'):
        ts = int(time.time() * 1000); rb = _req({'op': 'rollback', 'ts': ts, 'sig': hmac.new(key, f'{ts}|rollback'.encode(), hashlib.sha256).hexdigest()})
        print('ROLLED BACK:', rb); sys.exit(1)
if __name__ == '__main__':
    pw = os.environ.get('DIROT_PW') or open(os.environ['PWFILE']).read().strip()
    if sys.argv[1] == 'pack': pack(sys.argv[2], pw)
    else: deploy(pw, '--force' in sys.argv)
