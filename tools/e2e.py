"""Read-only end-to-end check of the live site + boards + Apps Script API (runs in GitHub Actions).
Prints only errors/timings (repo is public). Screenshots are zipped and encrypted with DIROT_PW."""
import os, json, time, zipfile, io, base64, sys
from playwright.sync_api import sync_playwright
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
SITE = 'https://sergeyev-team.com/'; PW = os.environ['DIROT_PW']; OUT = '/tmp/e2e'; os.makedirs(OUT, exist_ok=True)
REPORT = []; SHOTS = []
def run_page(pg, name, url, actions=None, unlock=True, wait=6000):
    errs, slow, fails = [], [], []
    t0 = {}
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:200]))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    pg.on('request', lambda r: t0.__setitem__(r.url, time.time()))
    def on_resp(r):
        dt = time.time() - t0.get(r.url, time.time())
        u = r.url.split('?')[0][-60:]
        if r.status >= 400: fails.append(f'{r.status} {u}')
        if 'script.google' in r.url or 'googleusercontent' in r.url:
            q = r.url.split('op=')[1].split('&')[0] if 'op=' in r.url else (r.request.post_data or '')[:0]
            try: op = json.loads(r.request.post_data or '{}').get('op') or json.loads(r.request.post_data or '{}').get('action') or q
            except Exception: op = q
            slow.append((op or 'get', round(dt, 1)))
    pg.on('response', on_resp)
    st = time.time(); pg.goto(url, wait_until='domcontentloaded')
    if unlock:
        try:
            pg.wait_for_selector('input[type=password]', timeout=8000); pg.fill('input[type=password]', PW); pg.keyboard.press('Enter')
        except Exception as e: errs.append('no lock form: ' + str(e)[:80])
    pg.wait_for_timeout(wait)
    res = {}
    if actions:
        try: res = actions(pg) or {}
        except Exception as e: errs.append('action failed: ' + str(e)[:300])
    p = f'{OUT}/{name}.png'; pg.screenshot(path=p, full_page=True); SHOTS.append(p)
    REPORT.append({'page': name, 'load_s': round(time.time() - st, 1), 'errors': errs[:12], 'http_fail': fails[:10], 'api': slow[:20], **res})

def sgn_actions(pg):
    r = {}
    def shot(n): p = f'{OUT}/sgn_{n}.png'; pg.screenshot(path=p, full_page=True); SHOTS.append(p)
    r['drafts'] = pg.locator('.cdi').count(); shot('new')
    for m in ['list', 'own']:
        btn = pg.locator(f'#modes button[data-m="{m}"]')
        if btn.is_visible(): btn.click()
        else: pg.evaluate(f"location.hash='#{m}'")  # הכפתור מוסתר כשנכנסים לפורטל דרך הקישור
        pg.wait_for_timeout(9000); shot(m)
    r['list_groups'] = pg.locator('.cg').count(); r['owner_cards'] = pg.locator('.oc').count()
    return r
def ceo_actions(pg):
    pg.wait_for_timeout(25000); t = pg.locator('#m-ceo').inner_text()
    return {'ceo_rows': pg.locator('.ctab tbody tr').count(), 'ceo_head': t[:120].replace('\n', ' | ')}
def mng_actions(pg):
    pg.wait_for_timeout(15000); p2 = f'{OUT}/manage_desktop.png'
    pg.set_viewport_size({'width': 1200, 'height': 900}); pg.wait_for_timeout(800); pg.screenshot(path=p2, full_page=True); SHOTS.append(p2); return {'mng_text': pg.locator('.mx').inner_text()[:200].replace('\n', ' | ') if pg.locator('.mx').count() else 'NO PANEL'}
def buy_actions(pg):
    n = pg.locator('li.card').count(); r = {'buyer_cards': n, 'first_buyers_last': [([x for x in t.split('\n') if 'קשר אחרון' in x or 'אין תאריך' in x] or ['?'])[0][:30] for t in pg.locator('li.card').all_inner_texts()[:6]]}
    b = pg.locator('button:has-text("📅 סיור")')
    r['dbg'] = pg.evaluate("""()=>{const B=window.__KB.S().buyers;const f=x=>String(x||'').replace(/\\d/g,'9');const c={};B.forEach(b=>{const k='last:'+f(b.last)+' month:'+f(b.month);c[k]=(c[k]||0)+1});return c}""")
    r['tour_btns'] = b.count()
    if b.count(): b.first.click(); pg.wait_for_timeout(500); r['tour_form'] = pg.locator('.tourf').count()
    return r
def site_actions(pg):
    m = pg.evaluate("""()=>{const n=performance.getEntriesByType('navigation')[0];const l=performance.getEntriesByType('largest-contentful-paint');return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),cards:document.querySelectorAll('.list li, li.item, .card').length}}""")
    return m
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(vp=(400, 860)): return b.new_context(viewport={'width': vp[0], 'height': vp[1]}).new_page()
    run_page(page(), 'site', SITE, site_actions, unlock=False, wait=4000)
    run_page(page(), 'site_detail', SITE + '#p=399', unlock=False, wait=3000)
    run_page(page(), 'site_desktop', SITE, unlock=False, wait=3000) if False else None
    run_page(page(), 'dpage', SITE + 'd/399.html', unlock=False, wait=2500)
    for n, u in [('privacy', SITE + 'privacy.html'), ('terms', SITE + 'terms.html'), ('portal_login', SITE + 'o/'), ('app_login', SITE + 'app/')]:
        run_page(page(), n, u, unlock=False, wait=2500)
    run_page(page(), 'hub', SITE + 'x/a0d769373a49b.html', wait=8000)
    run_page(page(), 'office_team', SITE + 'x/a0d769373a49b.html#team', wait=7000)
    run_page(page(), 'office_tasks', SITE + 'x/a0d769373a49b.html#atk', wait=7000)
    run_page(page(), 'buyers', SITE + 'x/b018b2a874ee8.html', buy_actions, wait=9000)
    run_page(page(), 'broker', SITE + 'x/c84971d9f1d2f.html', wait=6000)
    run_page(page(), 'marketing', SITE + 'x/eacbed7dad154.html', wait=6000)
    run_page(page(), 'upload', SITE + 'x/3a256a46e8e4d.html', wait=5000)
    run_page(page(), 'signing', SITE + 'x/de7f766b5893b.html', sgn_actions, wait=6000)
    run_page(page((1100, 900)), 'ceo', SITE + 'x/de7f766b5893b.html#ceo', ceo_actions, wait=3000)
    run_page(page(), 'manage399', SITE + 'x/de7f766b5893b.html#m=399', mng_actions, wait=3000)
    b.close()
print(json.dumps(REPORT, ensure_ascii=False, indent=1))
buf = io.BytesIO(); z = zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED)
for s in SHOTS: z.write(s, os.path.basename(s))
z.writestr('report.json', json.dumps(REPORT, ensure_ascii=False, indent=1)); z.close()
salt, iv = os.urandom(16), os.urandom(12)
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=200000).derive(PW.encode())
open('/tmp/e2e.enc', 'wb').write(salt + iv + AESGCM(key).encrypt(iv, buf.getvalue(), None))
