// ===== ניתוח שוק – צוות סרגייב =====
// מסך באפליקציה (גם במשרד דרך התפריט): הנכס של הלקוח, עסקאות שנמכרו, מודעות בשוק → חישוב → 9 שקופיות → PDF ומצגת.
// צילומי מסך נקראים ב-Gemini דרך השרת (בלי טוקנים של Claude). כל מספר מגיע מהנתונים שהוזנו.
(function () {
  'use strict';
  var G = window.SGAPP, esc = G.esc, toast = G.toast, db = G.db, api = G.api, render = G.render, isAdmin = G.isAdmin, nav = G.nav, D = G.D;
  var C = { dark: '#1F1F23', bg: '#FAFAF8', card: '#FFFFFF', line: '#E0DDD5', gold: '#B08A3E', goldD: '#D4B26A', goldT: '#8C6A22', tint: '#F4ECDA', orange: '#C2552B', orangeO: '#E07A45', gray: '#5F6368', dark2: '#2B2B31' };
  var M = { list: null, cur: null, busy: '', logo: null, libs: {} };
  var e = function (s) { return esc(s == null ? '' : s); };
  var n = function (v) { var x = +String(v == null ? '' : v).replace(/[^\d.]/g, ''); return isFinite(x) && x > 0 ? x : 0; };
  var fmt = function (v) { return v ? '₪' + Math.round(v).toLocaleString('he-IL') : '—'; };
  var fmtM = function (v) { return v ? (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' מיליון ₪' : '—'; };
  var r10 = function (v) { return Math.round(v / 10000) * 10000; };
  var pps = function (x) { return x && n(x.price) && n(x.sqm) ? n(x.price) / n(x.sqm) : 0; };
  var avg = function (a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; };
  var med = function (a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
  var norm = function (s) { return String(s || '').replace(/["'׳״\s\-]/g, '').replace(/^רחוב/, ''); };
  var blank = function () { return { client: { addr: '', city: 'פתח תקווה', rooms: '', floor: '', sqm: '', price: '', sqmAssumed: false }, deals: [], lists: [], rec: {}, owner: '' }; };

  // ---------- חישובים ----------
  function calc(A) {
    var c = A.client, rooms = n(c.rooms), sqm = n(c.sqm), price = n(c.price);
    var near = function (x) { return !rooms || !n(x.rooms) || Math.abs(n(x.rooms) - rooms) <= 0.5; };
    var dAll = A.deals.filter(function (x) { return pps(x); }), lAll = A.lists.filter(function (x) { return pps(x); });
    var dCmp = dAll.filter(near); if (dCmp.length < 2) dCmp = dAll;
    var lCmp = lAll.filter(near); if (lCmp.length < 2) lCmp = lAll;
    var dP = dCmp.map(pps), lP = lCmp.map(pps), cP = price && sqm ? price / sqm : 0;
    var bld = norm(c.addr), same = function (x) { return bld && norm(x.addr) === bld; };
    var sb = dAll.concat(lAll).filter(same);
    var twin = sb.filter(function (x) { return !rooms || n(x.rooms) === rooms; }).sort(function (a, b) { return Math.abs(n(a.floor) - n(c.floor)) - Math.abs(n(b.floor) - n(c.floor)); })[0] || null;
    var bigger = sb.filter(function (x) { return sqm && n(x.sqm) > sqm; }).sort(function (a, b) { return n(a.price) - n(b.price); })[0] || null;
    var basePps = med(dP) || (avg(lP) * 0.96), base = basePps * sqm;
    var rec = { quick: base ? r10(base * 0.97) : 0, list: base ? r10(base * 1.02) : 0, lo: base ? r10(base * 0.98) : 0, hi: base ? r10(base) : 0 };
    ['quick', 'list', 'lo', 'hi'].forEach(function (k) { if (n(A.rec[k])) rec[k] = n(A.rec[k]); });
    return { dCmp: dCmp, lCmp: lCmp, dAvg: avg(dP), dMed: med(dP), lAvg: avg(lP), cP: cP, twin: twin, bigger: bigger, base: base, rec: rec, gap: base && price ? price - base : 0, maxDeal: Math.max.apply(null, [0].concat(dCmp.map(function (x) { return n(x.price); }))) };
  }

  // ---------- מסכים ----------
  function view(r) {
    var id = r.split('/')[1];
    if (!id) return vList();
    if (!M.cur || String(M.cur.id || 'new') !== id) {
      if (id === 'new') M.cur = { id: null, title: '', data: blank() };
      else { var f = (M.list || []).filter(function (x) { return String(x.id) === id; })[0]; if (!f) { load(); return '<div class="load">טוען…</div>'; } M.cur = { id: f.id, title: f.title, data: Object.assign(blank(), f.data || {}) }; }
    }
    return vEdit();
  }
  function load() {
    db('market_analyses?select=id,title,updated_at,agent_id,data&order=updated_at.desc&limit=100').then(function (x) { M.list = x || []; render(); }).catch(function () { M.list = []; toast('לא נטען. נסו שוב.'); render(); });
  }
  function vList() {
    if (M.list === null) { load(); return '<div class="load">טוען…</div>'; }
    var who = function (a) { var g = (D.agents || []).filter(function (x) { return x.id === a; })[0]; return g ? g.name : ''; };
    return '<main class="page"><div class="head"><div><h1>ניתוח שוק</h1><p class="sub">עסקאות שנמכרו, מודעות בשוק והמלצת מחיר – מצגת ו-PDF ללקוח.</p></div><div class="head-acts"><a class="btn pri" href="#market/new">+ ניתוח חדש</a></div></div>' +
      (M.list.length ? '<div class="list">' + M.list.map(function (x) { return '<a class="row" href="#market/' + x.id + '"><span class="main"><b>' + e(x.title || 'ניתוח ללא שם') + '</b><small>' + e(String(x.updated_at || '').slice(0, 10).split('-').reverse().join('/')) + (isAdmin() && x.agent_id !== D.me.id ? ' · ' + e(who(x.agent_id)) : '') + '</small></span></a>'; }).join('') + '</div>'
        : '<div class="empty">עוד אין ניתוחים. לחצו "ניתוח חדש".</div>') + '</main>' + nav('today');
  }
  var F = function (k, label, v, ph, w) { return '<label class="field" style="margin:0"><span>' + label + '</span><input class="in" data-mkf="' + k + '" value="' + e(v) + '"' + (ph ? ' placeholder="' + e(ph) + '"' : '') + ' inputmode="' + (w || 'text') + '"></label>'; };
  function rowsTable(kind, rows) {
    var cols = kind === 'deals' ? [['addr', 'כתובת'], ['date', 'תאריך'], ['rooms', 'חד׳'], ['floor', 'קומה'], ['sqm', 'מ״ר'], ['price', 'מחיר']] : [['addr', 'כתובת'], ['rooms', 'חד׳'], ['floor', 'קומה'], ['sqm', 'מ״ר'], ['price', 'מחיר מבוקש'], ['broker', 'מתווך']];
    return '<div style="overflow:auto"><table class="mkt"><thead><tr>' + cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '<th>₪/מ״ר</th><th></th></tr></thead><tbody>' +
      rows.map(function (x, i) { return '<tr>' + cols.map(function (c) { return '<td><input data-mkr="' + kind + '.' + i + '.' + c[0] + '" value="' + e(c[0] === 'price' && x.price ? Number(x.price).toLocaleString('he-IL') : x[c[0]]) + '"' + (c[0] === 'date' ? ' placeholder="2026-08-12" dir="ltr"' : '') + (['rooms', 'floor', 'sqm', 'price'].indexOf(c[0]) >= 0 ? ' inputmode="decimal"' : '') + '></td>'; }).join('') + '<td class="pp">' + (pps(x) ? Math.round(pps(x)).toLocaleString('he-IL') : '') + '</td><td><button class="btn link" type="button" data-mk="del" data-k="' + kind + '" data-i="' + i + '" aria-label="מחיקת שורה">✕</button></td></tr>'; }).join('') +
      '</tbody></table></div>' + (rows.length ? '' : '<p class="sub" style="margin:6px 0">עוד אין שורות.</p>');
  }
  function vEdit() {
    var A = M.cur.data, c = A.client, R = calc(A), busy = M.busy;
    var upl = function (kind, label) { return '<label class="btn"' + (busy ? ' aria-disabled="true"' : '') + '>' + (busy === kind ? 'קורא את הצילום…' : label) + '<input type="file" accept="image/*" multiple hidden data-mku="' + kind + '"' + (busy ? ' disabled' : '') + '></label>'; };
    var recF = function (k, label) { return '<label class="field" style="margin:0"><span>' + label + '</span><input class="in" inputmode="numeric" data-mkrec="' + k + '" value="' + e(R.rec[k] ? R.rec[k].toLocaleString('he-IL') : '') + '"></label>'; };
    return '<main class="page"><style>.mkt{width:100%;border-collapse:collapse;font-size:15px;min-width:620px}.mkt th{font-size:13px;color:var(--muted);text-align:right;font-weight:600;padding:4px}.mkt td{padding:2px}.mkt input{width:100%;font:inherit;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:#fff;min-width:56px}.mkt td.pp{white-space:nowrap;color:var(--muted);padding:0 6px}.mksec{margin:14px 0}.mkg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.mkres{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:8px 0}.mkres div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px}.mkres b{display:block;font-size:20px}.mkres span{font-size:13px;color:var(--muted)}.mkwrap{border-radius:12px;overflow:hidden;border:1px solid var(--line);margin:10px 0;background:#fff}</style>' +
      '<div class="head"><div><h1>' + e(M.cur.title || c.addr || 'ניתוח חדש') + '</h1><p class="sub"><a href="#market">← כל הניתוחים</a></p></div><div class="head-acts"><button class="btn pri" type="button" data-mk="save">שמירה</button></div></div>' +
      '<div class="card mksec"><h2 style="margin-top:0">1. הנכס של הלקוח</h2><div class="mkg">' +
      F('addr', 'כתובת (רחוב ומספר)', c.addr, 'ז׳בוטינסקי 8') + F('city', 'עיר', c.city) + F('rooms', 'חדרים', c.rooms, '', 'decimal') + F('floor', 'קומה', c.floor, '', 'numeric') + F('sqm', 'שטח במ״ר', c.sqm, '', 'numeric') + F('price', 'המחיר שבעל הבית מבקש', c.price ? Number(c.price).toLocaleString('he-IL') : '', '', 'numeric') + F('owner', 'שם בעל הבית (לשער)', A.owner || '') +
      '</div><label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" data-mkchk="sqmAssumed"' + (c.sqmAssumed ? ' checked' : '') + '> השטח משוער (יסומן "לאימות")</label>' +
      '<div style="display:flex;gap:8px;align-items:end;margin-top:10px"><label class="field" style="margin:0;flex:1"><span>או מילוי לפי מספר נכס במערכת</span><input class="in" id="mkPid" inputmode="numeric" placeholder="למשל 399"></label><button class="btn" type="button" data-mk="fill">מילוי</button></div></div>' +
      '<div class="card mksec"><h2 style="margin-top:0">2. עסקאות שנמכרו (רשות המסים)</h2><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + upl('deals', '📷 העלאת צילום עסקאות') + '<button class="btn" type="button" data-mk="add" data-k="deals">+ שורה</button></div>' + rowsTable('deals', A.deals) + '</div>' +
      '<div class="card mksec"><h2 style="margin-top:0">3. דירות בשיווק עכשיו (יד2)</h2><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' + upl('lists', '📷 העלאת צילום מודעות') + '<button class="btn" type="button" data-mk="pool">דירות דומות מהמאגר</button><button class="btn" type="button" data-mk="add" data-k="lists">+ שורה</button></div>' + rowsTable('lists', A.lists) + '</div>' +
      '<div class="card mksec"><h2 style="margin-top:0">4. התוצאה</h2><div class="mkres">' +
      '<div><span>המחיר המבוקש למ״ר</span><b>' + (R.cP ? fmt(R.cP) : '—') + '</b></div><div><span>חציון עסקאות דומות למ״ר</span><b>' + (R.dMed ? fmt(R.dMed) : '—') + '</b><span>' + R.dCmp.length + ' עסקאות</span></div><div><span>ממוצע מודעות דומות למ״ר</span><b>' + (R.lAvg ? fmt(R.lAvg) : '—') + '</b><span>' + R.lCmp.length + ' מודעות</span></div><div><span>שווי לפי העסקאות</span><b>' + (R.base ? fmt(r10(R.base)) : '—') + '</b>' + (R.gap ? '<span>' + (R.gap > 0 ? 'המבוקש גבוה ב-' : 'המבוקש נמוך ב-') + fmt(Math.abs(R.gap)) + '</span>' : '') + '</div></div>' +
      '<p class="sub" style="margin:10px 0 6px">ההמלצה (אפשר לשנות):</p><div class="mkg">' + recF('quick', 'מכירה מהירה') + recF('list', 'מחיר מומלץ לפרסום') + recF('lo', 'טווח סגירה – מ') + recF('hi', 'טווח סגירה – עד') + '</div></div>' +
      '<div class="card mksec"><h2 style="margin-top:0">5. המצגת</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-mk="preview">תצוגה מקדימה</button><button class="btn pri" type="button" data-mk="pdf"' + (busy ? ' disabled' : '') + '>' + (busy === 'pdf' ? 'מכין PDF…' : 'הורדת PDF') + '</button><button class="btn" type="button" data-mk="pptx"' + (busy ? ' disabled' : '') + '>' + (busy === 'pptx' ? 'מכין מצגת…' : 'הורדת מצגת') + '</button>' + (M.cur.id && !isAdmin() ? '' : '') + '</div><div id="mkPrev"></div></div>' +
      (M.cur.id ? '<p style="text-align:center"><button class="btn link" type="button" data-mk="remove">מחיקת הניתוח</button></p>' : '') + '</main>' + nav('today');
  }

  // ---------- שקופיות ----------
  function logo() {
    if (M.logo) return Promise.resolve(M.logo);
    return new Promise(function (ok) {
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () {
        var cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; var x = cv.getContext('2d'); x.drawImage(im, 0, 0);
        try { var d = x.getImageData(0, 0, cv.width, cv.height), p = d.data; for (var i = 0; i < p.length; i += 4) { var mn = Math.min(p[i], p[i + 1], p[i + 2]); p[i + 3] = Math.max(0, Math.min(255, (255 - mn) * 255 / 45)); } x.putImageData(d, 0, 0); } catch (er) {}
        M.logo = cv.toDataURL('image/png'); ok(M.logo);
      };
      im.onerror = function () { M.logo = ''; ok(''); };
      im.src = '../f/logo.jpg';
    });
  }
  function slides(A) {
    var c = A.client, R = calc(A), L = M.logo, ad = c.addr || 'הנכס', agent = D.me || {}, ph = String(agent.phone || ''), aName = agent.name || 'צוות סרגייב';
    var month = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date());
    var T = 'font-family:Assistant,Arial,sans-serif;direction:rtl;';
    var S = function (body, i, dark) { return '<div class="mkS" style="' + T + 'position:relative;width:1600px;height:900px;overflow:hidden;background:' + (dark ? C.dark : C.bg) + ';color:' + (dark ? '#fff' : C.dark) + '">' + body + (i ? '<div style="position:absolute;bottom:30px;right:70px;font-size:17px;color:' + (dark ? '#B4B2A9' : C.gray) + '">צוות סרגייב · ניתוח שוק ' + e(ad) + '</div><div style="position:absolute;bottom:30px;left:70px;font-size:17px;color:' + (dark ? '#B4B2A9' : C.gray) + '">' + i + '</div>' : '') + '</div>'; };
    var H = function (title, sub, dark) { return (L && !dark ? '<img src="' + L + '" style="position:absolute;top:40px;left:60px;width:200px">' : '') + '<div style="position:absolute;top:48px;right:70px;left:300px;text-align:right"><div style="font-size:42px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e(title) + '</div>' + (sub ? '<div style="font-size:23px;color:' + (dark ? '#B4B2A9' : C.gray) + ';margin-top:6px">' + e(sub) + '</div>' : '') + '</div>'; };
    var card = 'background:#fff;border:1.5px solid ' + C.line + ';border-radius:18px;box-shadow:0 4px 14px rgba(0,0,0,.05);';
    var spec = [c.city, n(c.rooms) ? c.rooms + ' חדרים' : '', c.floor !== '' && c.floor != null ? 'קומה ' + c.floor : ''].filter(Boolean).join(' · ');
    var out = [];
    // 1 שער
    out.push(S('<div style="position:absolute;inset:0 800px 0 0;background:#fff;display:flex;align-items:center;justify-content:center">' + (L ? '<img src="' + L + '" style="width:440px">' : '<div style="font-size:60px;font-weight:700;color:' + C.gold + '">צוות סרגייב</div>') + '</div>' +
      '<div style="position:absolute;inset:0 0 0 800px;background:' + C.dark + ';color:#fff;padding:0 80px;display:flex;flex-direction:column;justify-content:center;text-align:right"><div style="font-size:26px;color:' + C.goldD + ';font-weight:700;letter-spacing:.02em">ניתוח שוק השוואתי</div><div style="font-size:72px;font-weight:700;line-height:1.1;margin:18px 0">' + e(ad) + '</div><div style="font-size:30px;color:#D3D1C7">' + e(spec) + '</div><div style="font-size:24px;color:' + C.goldD + ';margin-top:60px">הוכן עבור ' + e(A.owner || 'בעל/ת הנכס') + ' · ' + e(month) + '</div></div>', 0));
    // 2 הנכס
    var drow = function (l, v) { return '<div style="display:flex;justify-content:space-between;padding:18px 0;border-bottom:1px solid ' + C.line + ';font-size:28px"><span style="color:' + C.gray + '">' + l + '</span><b>' + v + '</b></div>'; };
    out.push(S(H('הנכס: ' + ad, 'פרטי הנכס והמחיר שבעל הבית מבקש') +
      '<div style="position:absolute;top:220px;right:70px;width:760px;' + card + 'padding:20px 40px">' + drow('כתובת', e(ad)) + drow('עיר', e(c.city || '—')) + drow('חדרים', e(c.rooms || '—')) + drow('קומה', e(c.floor === '' ? '—' : c.floor)) + drow('שטח', n(c.sqm) ? e(c.sqm) + ' מ״ר' + (c.sqmAssumed ? ' (לאימות)' : '') : '—') + '</div>' +
      '<div style="position:absolute;top:220px;left:70px;width:620px;height:500px;background:' + C.dark2 + ';border-radius:18px;color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center"><div style="font-size:28px;color:' + C.goldD + '">המחיר המבוקש</div><div style="font-size:72px;font-weight:700;margin:14px 0">' + fmt(n(c.price)) + '</div><div style="font-size:28px;color:#D3D1C7">' + (R.cP ? fmt(R.cP) + ' למ״ר' : '') + '</div></div>', 2));
    // 3 עסקאות
    var tbl = function (head, rows, tintIdx, foot) {
      return '<table style="width:100%;border-collapse:collapse;font-size:24px"><thead><tr>' + head.map(function (h) { return '<th style="text-align:right;padding:12px 14px;border-bottom:2px solid ' + C.dark + ';font-weight:700">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r, i) { return '<tr style="' + (i === tintIdx ? 'background:' + C.tint : '') + '">' + r.map(function (v, j) { return '<td style="padding:12px 14px;border-bottom:1px solid ' + C.line + ';' + (j === 0 ? 'font-weight:700' : '') + '">' + v + '</td>'; }).join('') + '</tr>'; }).join('') + (foot ? '<tr style="background:' + C.tint + ';font-weight:700">' + foot.map(function (v) { return '<td style="padding:12px 14px">' + v + '</td>'; }).join('') + '</tr>' : '') + '</tbody></table>';
    };
    var ds = A.deals.filter(function (x) { return pps(x); }).slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, 9);
    var dTitle = ds.length ? 'עסקאות ' + (n(c.rooms) ? c.rooms + ' חדרים ' : '') + 'באזור: עד ' + fmtM(R.maxDeal || Math.max.apply(null, ds.map(function (x) { return n(x.price); }))) : 'עסקאות שנמכרו באזור';
    out.push(S(H(dTitle, 'עסקאות שנסגרו בפועל, לפי נתוני רשות המסים') + '<div style="position:absolute;top:200px;right:70px;left:70px">' +
      tbl(['כתובת', 'תאריך', 'חדרים', 'קומה', 'מ״ר', 'מחיר', '₪ למ״ר'], ds.map(function (x) { return [e(x.addr), e(String(x.date || '').split('-').reverse().join('/')), e(x.rooms), e(x.floor), e(x.sqm), fmt(n(x.price)), fmt(pps(x))]; }), -1, ds.length ? ['ממוצע עסקאות דומות', '', '', '', '', '', fmt(R.dAvg)] : null) + '</div>', 3));
    // 4 מודעות
    var ls = A.lists.filter(function (x) { return pps(x); }).slice().sort(function (a, b) { return pps(a) - pps(b); }).slice(0, 9);
    var tw = -1; ls.forEach(function (x, i) { if (tw < 0 && n(x.rooms) === n(c.rooms) && (!n(c.sqm) || Math.abs(n(x.sqm) - n(c.sqm)) <= 10)) tw = i; });
    var lMin = Math.min.apply(null, [Infinity].concat(ls.map(function (x) { return n(x.price); }))), lMax = Math.max.apply(null, [0].concat(ls.map(function (x) { return n(x.price); })));
    out.push(S(H(ls.length ? ls.length + ' דירות דומות בשיווק: בין ' + fmtM(lMin).replace(' מיליון ₪', '') + ' ל-' + fmtM(lMax) : 'דירות בשיווק עכשיו', 'מודעות פעילות – מחירים מבוקשים, שנסגרים בדרך כלל נמוך יותר') + '<div style="position:absolute;top:200px;right:70px;left:70px">' +
      tbl(['כתובת', 'חדרים', 'קומה', 'מ״ר', 'מחיר מבוקש', '₪ למ״ר', 'משווק'], ls.map(function (x) { return [e(x.addr || x.nb || ''), e(x.rooms), e(x.floor), e(x.sqm), fmt(n(x.price)), fmt(pps(x)), e(x.broker || '')]; }), tw, ls.length ? ['ממוצע מודעות דומות', '', '', '', '', fmt(R.lAvg), ''] : null) + '</div>', 4));
    // 5 הצהרה
    var stat = function (l, v, s, hot) { return '<div style="flex:1;background:' + C.dark2 + ';border-radius:18px;padding:40px 30px;text-align:center;' + 'border:3px solid ' + (hot ? C.orangeO : 'transparent') + ';' + '"><div style="font-size:26px;color:#B4B2A9">' + l + '</div><div style="font-size:56px;font-weight:700;margin:14px 0;color:#fff">' + v + '</div><div style="font-size:24px;color:' + C.goldD + '">' + s + '</div></div>'; };
    var s2 = R.twin ? stat('דירה זהה בבניין', fmt(n(R.twin.price)), (R.twin.date ? 'נמכרה ' : 'מבוקש ') + fmt(pps(R.twin)) + ' למ״ר') : stat('עסקאות דומות – חציון', R.dMed ? fmt(r10(R.dMed * n(c.sqm))) : '—', R.dMed ? fmt(R.dMed) + ' למ״ר' : '');
    var s3 = R.bigger ? stat('דירה גדולה יותר בבניין', fmt(n(R.bigger.price)), n(R.bigger.sqm) + ' מ״ר · ' + fmt(pps(R.bigger)) + ' למ״ר') : stat('מודעות דומות – ממוצע', R.lAvg ? fmt(r10(R.lAvg * n(c.sqm))) : '—', R.lAvg ? fmt(R.lAvg) + ' למ״ר' : '');
    var sent = R.gap > 20000 ? 'המחיר המבוקש גבוה ב-' + fmt(r10(R.gap)) + ' ממה שהעסקאות בפועל תומכות בו.' : R.gap < -20000 ? 'המחיר המבוקש נמוך ב-' + fmt(r10(-R.gap)) + ' מהעסקאות בפועל – יש מקום להעלות.' : 'המחיר המבוקש בתוך הטווח של העסקאות בפועל.';
    out.push(S(H('המחיר המבוקש מול השוק', '', 1) + '<div style="position:absolute;top:220px;right:70px;left:70px;display:flex;gap:30px">' + stat('המחיר המבוקש', fmt(n(c.price)), R.cP ? fmt(R.cP) + ' למ״ר' : '', 1) + s2 + s3 + '</div><div style="position:absolute;top:640px;right:70px;left:70px;text-align:center;font-size:36px;font-weight:700">' + e(sent) + '</div>', 5, 1));
    // 6 מחיר למ״ר
    var bars = [['המחיר המבוקש', R.cP, C.orange], ['ממוצע עסקאות דומות', R.dAvg, C.gold], ['ממוצע מודעות דומות', R.lAvg, '#9A9A9A']].filter(function (b) { return b[1]; }), mx = Math.max.apply(null, [1].concat(bars.map(function (b) { return b[1]; })));
    out.push(S(H('מחיר למ״ר: ' + (R.cP && R.dAvg ? (R.cP > R.dAvg ? 'המבוקש גבוה ב-' + Math.round((R.cP / R.dAvg - 1) * 100) + '% מהעסקאות' : 'המבוקש בטווח העסקאות') : 'השוואה'), 'מחיר למ״ר – הדרך שבה קונים ושמאים משווים') + '<div style="position:absolute;top:230px;right:70px;left:70px">' +
      bars.map(function (b) { return '<div style="display:flex;align-items:center;gap:24px;margin-bottom:46px"><div style="width:330px;font-size:28px;font-weight:700;text-align:right">' + b[0] + '</div><div style="flex:1;display:flex;align-items:center;gap:18px"><div style="height:56px;border-radius:8px;background:' + b[2] + ';width:' + Math.round(b[1] / mx * 100) + '%"></div><b style="font-size:30px;white-space:nowrap">' + fmt(b[1]) + '</b></div></div>'; }).join('') +
      '<div style="background:' + C.tint + ';border-radius:14px;padding:22px 28px;font-size:24px;margin-top:20px">דירות גדולות נמכרות בדרך כלל במחיר נמוך יותר למ״ר, וקומות גבוהות במחיר גבוה יותר. ההשוואה הנכונה היא לדירות בגודל ובקומה דומים.</div></div>', 6));
    // 7 סיכונים
    var IC2 = { scale: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7zm10 0-3 7a3 3 0 0 0 6 0l-3-7z"/>', bank: '<path d="M3 10h18L12 4 3 10zM5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>', ruler: '<path d="M3 17 17 3l4 4L7 21l-4-4zM7 13l2 2M10 10l2 2M13 7l2 2"/>', glass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/>' };
    var risk = function (ic, t, s) { return '<div style="' + card + 'padding:34px;display:flex;gap:24px;align-items:flex-start"><div style="width:76px;height:76px;border-radius:50%;background:' + C.gold + ';flex:none;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + IC2[ic] + '</svg></div><div><div style="font-size:30px;font-weight:700;margin-bottom:8px">' + t + '</div><div style="font-size:23px;color:' + C.gray + ';line-height:1.45">' + s + '</div></div></div>'; };
    out.push(S(H('מה קורה כשהמחיר גבוה מהשוק', 'ארבעה דברים שעובדים נגד נכס במחיר לא נכון') + '<div style="position:absolute;top:210px;right:70px;left:70px;display:grid;grid-template-columns:1fr 1fr;gap:28px">' +
      risk('scale', 'הקונים משווים', 'קונים רואים את כל המודעות באזור ומשווים מחיר למ״ר. נכס יקר מהשאר פשוט מדולג.') +
      risk('bank', 'שמאי הבנק לא יתמוך', 'השמאי של הבנק מסתמך על עסקאות בפועל. מחיר גבוה מהן מקשה על הקונה לקבל משכנתא.') +
      risk('ruler', 'יקר מדירות גדולות יותר', 'כשדירה גדולה יותר נמכרת בסכום דומה, הקונים בוחרים בה.') +
      risk('glass', 'הנכס נשחק', 'נכס שמתפרסם הרבה זמן בלי עסקה מאבד עניין וכוח מיקוח, והמחיר הסופי יורד.') + '</div>', 7));
    // 8 המלצה
    var tier = function (l, v, s, main) { return '<div style="flex:1;' + (main ? 'background:' + C.dark + ';color:#fff;transform:scale(1.06);' : card) + 'border-radius:18px;padding:44px 30px;text-align:center"><div style="font-size:27px;color:' + (main ? C.goldD : C.gray) + '">' + l + '</div><div style="font-size:58px;font-weight:700;margin:16px 0">' + v + '</div><div style="font-size:22px;color:' + (main ? '#D3D1C7' : C.gray) + '">' + s + '</div></div>'; };
    out.push(S(H('ההמלצה: לצאת ב-' + fmt(R.rec.list), 'שלושה מחירים – ונקודת בדיקה משותפת אחרי 30 יום') + '<div style="position:absolute;top:240px;right:110px;left:110px;display:flex;gap:40px;align-items:center">' +
      tier('מכירה מהירה', fmt(R.rec.quick), 'למכירה תוך שבועות') + tier('מחיר מומלץ לפרסום', fmt(R.rec.list), 'משאיר מקום למשא ומתן', 1) + tier('טווח סגירה צפוי', R.rec.lo && R.rec.hi ? (R.rec.lo / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' עד ' + (R.rec.hi / 1e6).toFixed(2).replace(/\.?0+$/, '') : '—', 'מיליון ₪ · לפי העסקאות באזור') + '</div>' +
      '<div style="position:absolute;top:650px;right:110px;left:110px;background:' + C.tint + ';border-radius:14px;padding:24px 30px;font-size:26px"><b>נקודת בדיקה אחרי 30 יום:</b> אם היו פחות מ-3 ביקורים רציניים – יושבים יחד ובוחנים את המחיר מחדש.</div>', 8));
    // 9 סיום
    out.push(S('<div style="position:absolute;inset:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">' + (L ? '<img src="' + L + '" style="width:520px">' : '') + '<div style="font-size:40px;font-weight:700;margin-top:50px">' + e(aName) + (ph ? ' · <span dir="ltr">' + e(ph) + '</span>' : '') + '</div><div style="font-size:28px;color:' + C.gray + ';margin-top:12px">הצוות של אלכס סרגייב</div></div>', 0));
    return out;
  }
  function stage() { var s = document.getElementById('mkStage'); if (!s) { s = document.createElement('div'); s.id = 'mkStage'; s.style.cssText = 'position:fixed;left:-20000px;top:0;width:1600px;pointer-events:none'; document.body.appendChild(s); } return s; }
  function preview() {
    logo().then(function () {
      var box = document.getElementById('mkPrev'); if (!box) return; var w = box.clientWidth || 340, sc = w / 1600;
      box.innerHTML = slides(M.cur.data).map(function (h) { return '<div class="mkwrap" style="height:' + Math.round(900 * sc) + 'px"><div style="transform:scale(' + sc + ');transform-origin:top right;width:1600px">' + h + '</div></div>'; }).join('');
    });
  }
  function lib(name, url) { if (M.libs[name]) return M.libs[name]; M.libs[name] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = function () { delete M.libs[name]; no(new Error('lib')); }; document.head.appendChild(s); }); return M.libs[name]; }
  function shots() {
    return Promise.all([logo(), lib('h2c', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'), document.fonts ? document.fonts.ready : null]).then(function () {
      var st = stage(); st.innerHTML = slides(M.cur.data).join('');
      var els = [].slice.call(st.querySelectorAll('.mkS')), out = [];
      return els.reduce(function (p, el) { return p.then(function () { return window.html2canvas(el, { scale: 1.25, backgroundColor: null, logging: false }).then(function (cv) { out.push(cv.toDataURL('image/jpeg', 0.9)); }); }); }, Promise.resolve()).then(function () { st.innerHTML = ''; return out; });
    });
  }
  function fileName(ext) { return 'ניתוח-שוק-' + String(M.cur.data.client.addr || 'נכס').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') + '.' + ext; }
  function deliver(blob, name) {
    var f = null; try { f = new File([blob], name, { type: blob.type }); } catch (er) {}
    if (f && navigator.canShare && navigator.canShare({ files: [f] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) return navigator.share({ files: [f], title: name }).catch(function () {});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function exportPdf() {
    M.busy = 'pdf'; render();
    Promise.all([shots(), lib('pdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')]).then(function (r) {
      var J = window.jspdf.jsPDF, doc = new J({ orientation: 'landscape', unit: 'px', format: [1600, 900], hotfixes: ['px_scaling'], compress: true });
      r[0].forEach(function (img, i) { if (i) doc.addPage([1600, 900], 'landscape'); doc.addImage(img, 'JPEG', 0, 0, 1600, 900); });
      deliver(doc.output('blob'), fileName('pdf')); toast('ה-PDF מוכן');
    }).catch(function () { toast('לא הצלחתי להכין PDF. נסו שוב.'); }).then(function () { M.busy = ''; render(); });
  }
  function exportPptx() {
    M.busy = 'pptx'; render();
    Promise.all([shots(), lib('pptx', 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js')]).then(function (r) {
      var p = new window.PptxGenJS(); p.layout = 'LAYOUT_16x9'; p.title = 'ניתוח שוק ' + (M.cur.data.client.addr || '');
      r[0].forEach(function (img) { p.addSlide().addImage({ data: img, x: 0, y: 0, w: 10, h: 5.625 }); });
      return p.write({ outputType: 'blob' }).then(function (b) { deliver(new Blob([b], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), fileName('pptx')); toast('המצגת מוכנה'); });
    }).catch(function () { toast('לא הצלחתי להכין מצגת. נסו שוב.'); }).then(function () { M.busy = ''; render(); });
  }

  // ---------- פעולות ----------
  function read(files, kind) {
    var list = [].slice.call(files || []).slice(0, 4); if (!list.length) return;
    M.busy = kind; render();
    Promise.all(list.map(function (f) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { var s = Math.min(1, 1800 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(im.src); ok(cv.toDataURL('image/jpeg', 0.85).split(',')[1]); }; im.onerror = function () { ok(''); }; im.src = URL.createObjectURL(f); }); }))
      .then(function (imgs) { return api('mocr', { kind: kind === 'deals' ? 'deals' : 'listings', images: imgs.filter(Boolean) }); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || 'שגיאה'); var rows = (j.items || []); M.cur.data[kind] = M.cur.data[kind].concat(rows); toast(rows.length ? 'נקראו ' + rows.length + ' שורות. בדקו שהמספרים נכונים.' : 'לא נמצאו שורות בצילום'); })
      .catch(function (er) { toast('הקריאה נכשלה: ' + er.message); }).then(function () { M.busy = ''; render(); });
  }
  function save() {
    var A = M.cur.data, title = (A.client.addr || 'ניתוח שוק') + (A.client.city ? ', ' + A.client.city : '');
    var body = { title: title, data: A };
    var p = M.cur.id ? db('market_analyses?id=eq.' + M.cur.id, { method: 'PATCH', body: body, prefer: 'return=minimal' }).then(function () { return null; }) : db('market_analyses?select=id', { method: 'POST', body: Object.assign({ agent_id: D.me.id }, body), prefer: 'return=representation' });
    p.then(function (r) { if (r && r[0]) { M.cur.id = r[0].id; history.replaceState(null, '', '#market/' + r[0].id); } M.cur.title = title; M.list = null; toast('נשמר'); render(); }).catch(function () { toast('לא נשמר. נסו שוב.'); });
  }
  function fill() {
    var id = (document.getElementById('mkPid') || {}).value, p = (D.props || []).filter(function (x) { return String(x.id) === String(id).trim(); })[0];
    if (!p) { toast('לא נמצא נכס ' + (id || '')); return; }
    var c = M.cur.data.client; c.addr = [p.street, p.house_no].filter(Boolean).join(' '); c.city = p.city || c.city; c.rooms = p.rooms || ''; c.floor = p.floor == null ? '' : p.floor; c.sqm = p.sqm || ''; c.price = p.price || '';
    var o = (D.portals || []).filter(function (x) { return String(x.property_id) === String(p.id); })[0]; if (o && o.owner_name) M.cur.data.owner = o.owner_name;
    render();
  }
  function pool() {
    var c = M.cur.data.client, rooms = n(c.rooms), mine = norm(c.addr);
    var got = (D.props || []).filter(function (p) { return p.deal !== 'השכרה' && n(p.price) && n(p.sqm) && (!rooms || Math.abs(n(p.rooms) - rooms) <= 0.5) && (!c.city || !p.city || p.city === c.city) && norm([p.street, p.house_no].join(' ')) !== mine; })
      .sort(function (a, b) { return Math.abs(n(a.sqm) - n(c.sqm)) - Math.abs(n(b.sqm) - n(c.sqm)); }).slice(0, 6);
    if (!got.length) { toast('לא נמצאו דירות דומות במאגר'); return; }
    M.cur.data.lists = M.cur.data.lists.concat(got.map(function (p) { return { addr: [p.street, p.house_no].filter(Boolean).join(' ') || p.neighborhood || '', rooms: p.rooms || '', floor: p.floor == null ? '' : p.floor, sqm: p.sqm || '', price: p.price || '', broker: '' }; }));
    toast('נוספו ' + got.length + ' דירות מהמאגר'); render();
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-mk]'); if (!b || !M.cur) return; var a = b.dataset.mk, A = M.cur.data;
    if (a === 'save') save();
    else if (a === 'add') { A[b.dataset.k].push({}); render(); }
    else if (a === 'del') { A[b.dataset.k].splice(+b.dataset.i, 1); render(); }
    else if (a === 'fill') fill();
    else if (a === 'pool') pool();
    else if (a === 'preview') preview();
    else if (a === 'pdf') exportPdf();
    else if (a === 'pptx') exportPptx();
    else if (a === 'remove') { if (!b.dataset.c) { b.dataset.c = 1; b.textContent = 'למחוק? לחצו שוב'; return; } db('market_analyses?id=eq.' + M.cur.id, { method: 'DELETE', prefer: 'return=minimal' }).then(function () { M.cur = null; M.list = null; location.hash = '#market'; toast('נמחק'); }); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!M.cur) return; var A = M.cur.data;
    if (t.dataset.mku) { read(t.files, t.dataset.mku); t.value = ''; return; }
    if (t.dataset.mkchk) { A.client[t.dataset.mkchk] = t.checked; return; }
    if (t.dataset.mkf) { var k = t.dataset.mkf, v = t.value.trim(); if (k === 'owner') A.owner = v; else A.client[k] = k === 'price' ? n(v) || '' : v; render(); return; }
    if (t.dataset.mkr) { var p = t.dataset.mkr.split('.'), row = A[p[0]][+p[1]]; if (!row) return; var val = t.value.trim(); row[p[2]] = ['rooms', 'sqm', 'price'].indexOf(p[2]) >= 0 ? (n(val) || '') : p[2] === 'floor' ? (val === '' ? '' : +val.replace(/[^\d\-]/g, '') || 0) : val; render(); return; }
    if (t.dataset.mkrec) { A.rec[t.dataset.mkrec] = n(t.value) || ''; render(); }
  });
  window.MKT = { view: view };
})();
