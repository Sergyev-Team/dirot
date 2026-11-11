import os,json,base64,sys
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
S=sys.argv[1]; R='/home/claude/dirot'; slug=open(S+'/.hubslug').read().strip(); pw=open(S+'/.pw').read().strip().encode()
salt=os.urandom(16);iv=os.urandom(12);IT=250000
key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=IT).derive(pw)
ct=AESGCM(key).encrypt(iv,b'"ok"',None);b=lambda x:base64.b64encode(x).decode()
man={"name":"משרד סרגייב","short_name":"משרד סרגייב","lang":"he","dir":"rtl","start_url":f"./{slug}.html","scope":"./","display":"standalone","background_color":"#0e0c09","theme_color":"#0e0c09",
     "icons":[{"src":"../f/app192.png","sizes":"192x192","type":"image/png"},{"src":"../f/app512.png","sizes":"512x512","type":"image/png","purpose":"any"}]}
json.dump(man,open(f'{R}/x/office.webmanifest','w'),ensure_ascii=False)
html=r'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>משרד סרגייב</title><link rel="manifest" href="office.webmanifest"><meta name="theme-color" content="#0e0c09">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="משרד סרגייב"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="../f/app180.png"><link rel="icon" href="../f/app192.png">
<style>
:root{--gold:#d4af5a;--bg:#0e0c09;--fg:#f5efe2}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#f5f3ee;font-family:"Assistant","Arial Hebrew",Arial,sans-serif}
[hidden]{display:none!important}
.bar{position:fixed;top:0;left:0;right:0;z-index:5;background:var(--bg);color:var(--fg);padding-top:env(safe-area-inset-top,0px);box-shadow:0 2px 12px rgba(0,0,0,.35)}
.top{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 4px}
.top b{font-size:18px;letter-spacing:.5px}.top b span{color:var(--gold)}
.top img{height:30px;border-radius:6px;background:#fff;padding:2px 4px}
.out{background:none;border:1px solid #4a4334;color:#cfc6b4;border-radius:8px;font:inherit;font-size:13px;padding:4px 10px;cursor:pointer}
.tabs{display:flex}.tabs button{flex:1;background:none;border:0;color:#cfc6b4;font:inherit;font-weight:700;font-size:15px;white-space:nowrap;padding:10px 4px 12px;cursor:pointer;border-bottom:3px solid transparent}
.tabs button.on{color:#fff;border-bottom-color:var(--gold)}
.frames{position:fixed;left:0;right:0;bottom:0;top:var(--bh,96px)}
.frames iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#f5f3ee}
.lock{min-height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:24px}
.lock form{background:#17140f;border:1px solid #3a3324;border-radius:20px;padding:28px 22px;width:100%;max-width:380px;color:var(--fg);text-align:center}
.lock img{height:64px;background:#fff;border-radius:10px;padding:4px 8px;margin-bottom:12px}
.lock h1{margin:0 0 4px;font-size:26px}.lock h1 span{color:var(--gold)}.lock p{color:#b3ab98;margin:0 0 18px}
.lock input{width:100%;font:inherit;font-size:20px;padding:12px;border-radius:12px;border:1.5px solid #4a4334;background:#0e0c09;color:#fff;text-align:center}
.lock button{margin-top:14px;width:100%;font:inherit;font-size:19px;font-weight:800;padding:12px;border-radius:12px;border:0;background:linear-gradient(90deg,#b8902f,#f0d58a,#b8902f);color:#111;cursor:pointer}
.err{color:#f19c9c!important;margin-top:10px!important}
</style></head><body>
<div class="lock" id="lock"><form id="lf"><img src="../f/logo.jpg" alt=""><h1>משרד <span>סרגייב</span></h1><p>קונים · מתווך · שיווק · העלאה</p>
<input id="pw" type="password" placeholder="קוד כניסה" autocomplete="current-password" required><button type="submit">כניסה</button><p class="err" id="err" hidden>הקוד לא נכון. נסו שוב.</p></form></div>
<div id="app" hidden>
 <div class="bar" id="bar"><div class="top"><b>משרד <span>סרגייב</span></b><div style="display:flex;gap:8px;align-items:center"><button class="out" id="out">יציאה</button><img src="../f/logo.jpg" alt=""></div></div>
  <div class="tabs" id="tabs"><button data-t="buy">👥 קונים</button><button data-t="con">🏢 מתווך</button><button data-t="mkt">📣 שיווק</button><button data-t="upl">➕ העלאה</button></div></div>
 <div class="frames" id="frames"></div>
</div>
<script>
const KEY="sergyev_console_pw",SALT="__SALT__",IV="__IV__",CT="__CT__",IT=__IT__;
const B={buy:"b018b2a874ee8.html",con:"c84971d9f1d2f.html",mkt:"eacbed7dad154.html",upl:"3a256a46e8e4d.html"};
const SLUGS={b018b2a874ee8:"buy",c84971d9f1d2f:"con",eacbed7dad154:"mkt","3a256a46e8e4d":"upl"};
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function check(pw){try{const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
 const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b64(SALT),iterations:IT,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]);
 await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(IV)},key,b64(CT));return true}catch(e){return false}}
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const F={};
function frame(t,url){let f=F[t];if(!f){f=document.createElement("iframe");f.title=t;f.src=url||B[t];f.onload=()=>hook(f);document.getElementById("frames").appendChild(f);F[t]=f}else if(url){f.src=url}return f}
function show(t,url){ls.set("office_tab",t);document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));const f=frame(t,url);Object.entries(F).forEach(([k,x])=>x.hidden=k!==t)}
function hook(f){try{const d=f.contentDocument;if(!d||d._hooked)return;d._hooked=1;
  d.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[href]");if(!a)return;const h=a.getAttribute("href")||"";
    const m=h.match(/x\/([0-9a-f]{13})\.html(#.*)?$/);if(m&&SLUGS[m[1]]){e.preventDefault();e.stopPropagation();show(SLUGS[m[1]],B[SLUGS[m[1]]]+(m[2]||""));return}
    if(/^(https?:)?\/\//.test(h)&&!h.includes(location.host)&&!a.target){a.target="_blank";a.rel="noopener"}},true);
  const st=d.createElement("style");st.textContent="html{scroll-padding-top:0}";d.head.appendChild(st)}catch(e){}}
function sizeBar(){document.documentElement.style.setProperty("--bh",document.getElementById("bar").offsetHeight+"px")}
function start(){document.getElementById("lock").hidden=true;document.getElementById("app").hidden=false;sizeBar();
  document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>show(b.dataset.t));
  const h=location.hash.match(/^#(buy|con|mkt|upl)/);show(h?h[1]:(ls.get("office_tab")||"mkt"))}
window.addEventListener("resize",sizeBar);
document.getElementById("out").onclick=()=>{if(confirm("לצאת ולמחוק את הקוד מהמכשיר הזה?")){ls.del(KEY);location.reload()}};
document.getElementById("lf").onsubmit=async e=>{e.preventDefault();const pw=document.getElementById("pw").value;if(await check(pw)){ls.set(KEY,pw);start()}else document.getElementById("err").hidden=false};
(async()=>{const s=ls.get(KEY);if(s&&await check(s))start();else{ls.del(KEY);document.getElementById("pw").focus()}})();
</script></body></html>'''
html=html.replace('__SALT__',b(salt)).replace('__IV__',b(iv)).replace('__CT__',b(ct)).replace('__IT__',str(IT))
open(f'{R}/x/{slug}.html','w').write(html); print('hub',slug)
