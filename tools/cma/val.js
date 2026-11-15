// Team Sergeyev market-analysis deck generator.
// Usage: node cma.js spec.json out.pptx   (run from this folder; needs ts_full.png here)
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

const S = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const OUT = process.argv[3] || "out.pptx";
const LOGO = path.join(__dirname, "ts_full.png");

const DK = "1F1F23", LT = "FAFAF8", GOLD = "B08A3E", GOLDT = "8C6A22", TINT = "F4ECDA",
  ORANGE = "C2552B", GRAY = "5F6368", LINE = "E0DDD5", WHITE = "FFFFFF", CARD = "2B2B31", BLK = "0E0E10";
const F = "Arial";
const nf = (n) => Math.round(n).toLocaleString("en-US");
const m2 = (n) => (n / 1e6).toFixed(2).replace(/0$/, "");
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const pdate = (d) => { const m = String(d).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (m) return new Date(+m[3], +m[2] - 1, +m[1]); const n = new Date(d); return isNaN(n) ? null : n; };
const fdate = (d) => { const x = pdate(d); return x ? `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}` : String(d); };

async function icon(Comp) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#FFFFFF", size: 256 }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

(async () => {
  const P = S.p;
  const today = S.today ? new Date(S.today) : new Date();
  const V = S.val; const psm = V.mid / P.sqm;
  const deals = S.deals.map((d) => ({ ...d, psm: d.price / d.sqm })).sort((a, b) => pdate(b.date) - pdate(a.date)).slice(0, 10);
  const lst = (S.listings || []).map((d) => ({ ...d, psm: d.price / d.sqm })).slice(0, 7);
  const dAvgPsm = avg(deals.map((d) => d.psm)), dAvgPrice = avg(deals.map((d) => d.price));
  const R = S.reco;
  const high = false;
  const days = P.listed ? Math.round((today - pdate(P.listed)) / 864e5) : null;
  const hlDeals = deals.filter((d) => d.hl);
  const keyDeals = [...(hlDeals.length ? hlDeals : deals)].sort((x, y) => Math.abs(x.sqm - S.p.sqm) - Math.abs(y.sqm - S.p.sqm)).slice(0, 2);
  const addr = S.address;

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "הערכת שווי – " + addr;
  pres.author = "צוות סרגייב";
  pres.theme = { headFontFace: F, bodyFontFace: F };
  const T = (o) => Object.assign({ fontFace: F, rtlMode: true, align: "right", isTextBox: true, margin: 0, valign: "top" }, o);
  const shadow = () => ({ type: "outer", blur: 6, offset: 1.5, angle: 90, color: "000000", opacity: 0.10 });
  let page = 1;
  function frame(s, title, sub, dark) {
    s.background = { color: dark ? DK : LT };
    if (!dark) s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y: 0.26, w: 1.62, h: 0.72, fill: { color: BLK }, line: { type: "none" }, rectRadius: 0.06 });
    s.addImage({ path: LOGO, x: 0.61, y: 0.29, w: 1.3, h: 0.725 });
    s.addText(title, T({ x: 2.3, y: 0.32, w: 7.2, h: 0.62, fontSize: title.length > 40 ? 21 : 24, bold: true, color: dark ? LT : DK, valign: "middle", fit: "shrink" }));
    if (sub) s.addText(sub, T({ x: 2.3, y: 0.96, w: 7.2, h: 0.3, fontSize: 13, color: dark ? "C9C6BD" : GRAY }));
    page++;
    s.addText("צוות סרגייב · חוות דעת לשווי שוק · " + addr, T({ x: 4.5, y: 5.22, w: 5.0, h: 0.25, fontSize: 10, color: dark ? "9A978F" : GRAY }));
    s.addText(String(page), T({ x: 0.5, y: 5.22, w: 0.6, h: 0.25, fontSize: 10, color: dark ? "9A978F" : GRAY, align: "left", rtlMode: false }));
  }
  function table(head, rows, total, hl, opt) {
    const rev = (r) => r.slice().reverse();
    const b = (c) => [{ type: "none" }, { type: "none" }, { pt: 0.75, color: c }, { type: "none" }];
    const out = [rev(head).map((h) => ({ text: h, options: { bold: true, color: DK, align: "right", rtlMode: true, border: b("9A978F") } }))];
    rows.forEach((r, i) => {
      const on = hl.includes(i);
      out.push(rev(r).map((c, j) => ({ text: String(c), options: { color: DK, align: "right", rtlMode: true, bold: j === 0 || on, fill: on ? { color: TINT } : undefined, border: b(LINE) } })));
    });
    if (total) out.push(rev(total).map((c) => ({ text: c, options: { color: DK, bold: true, align: "right", rtlMode: true, fill: { color: TINT }, border: b(LINE) } })));
    return out;
  }
  function statCards(s, cards, dark) {
    cards.forEach((c, i) => {
      const x = [6.67, 3.585, 0.5][i];
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.55, w: 2.83, h: 2.15, fill: { color: CARD }, line: c.hot ? { color: "E07A45", width: 2 } : { type: "none" }, rectRadius: 0.08 });
      s.addText(c.eyebrow, T({ x: x + 0.2, y: 1.75, w: 2.43, h: 0.3, fontSize: 14, bold: true, color: c.hot ? "F2A57F" : "D4B26A" }));
      s.addText(c.big, T({ x: x + 0.2, y: 2.15, w: 2.43, h: 0.6, fontSize: 28, bold: true, color: LT, valign: "middle", fit: "shrink" }));
      s.addText(c.l1, T({ x: x + 0.2, y: 2.9, w: 2.43, h: 0.28, fontSize: 13, color: "D9D6CE" }));
      s.addText(c.l2, T({ x: x + 0.2, y: 3.2, w: 2.43, h: 0.28, fontSize: 13, color: "D9D6CE" }));
    });
  }

  // 1 Cover
  {
    const s = pres.addSlide();
    s.background = { color: BLK };
    s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 0, w: 5.0, h: 5.625, fill: { color: DK }, line: { type: "none" } });
    s.addImage({ path: LOGO, x: 0.4, y: 1.4, w: 4.2, h: 2.343 });
    s.addText(S.eyebrow || "הערכת שווי וניתוח שוק", T({ x: 5.5, y: 1.35, w: 4.0, h: 0.35, fontSize: 16, bold: true, color: "D4B26A" }));
    s.addText(addr, T({ x: 5.5, y: 1.8, w: 4.0, h: 0.75, fontSize: 36, bold: true, color: LT, valign: "middle", fit: "shrink" }));
    s.addText(S.area, T({ x: 5.5, y: 2.6, w: 4.0, h: 0.4, fontSize: 20, color: LT }));
    s.addText(P.keyline, T({ x: 5.5, y: 3.1, w: 4.0, h: 0.7, fontSize: 15, color: "D9D6CE" }));
    s.addText(S.coverLine || `הוכן עבור ${S.owner || "בעל/ת הנכס"} · ${S.month}`, T({ x: 5.5, y: 4.85, w: 4.0, h: 0.3, fontSize: 12, color: "A9A69E" }));
  }


  // 2 Property
  {
    const s = pres.addSlide();
    frame(s, "הנכס הנבדק", "פרטי הנכס כפי שנמסרו ונבדקו מול המודעות והעסקאות");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.9, y: 1.45, w: 4.6, h: 3.55, fill: { color: WHITE }, line: { color: LINE, width: 0.75 }, rectRadius: 0.08, shadow: shadow() });
    const rows = P.facts.slice(0, 6);
    rows.forEach((r, i) => {
      const y = 1.58 + i * 0.555;
      s.addText(r[0], T({ x: 8.1, y, w: 1.2, h: 0.4, fontSize: 14, color: GRAY, valign: "middle" }));
      s.addText(r[1], T({ x: 5.1, y, w: 3.0, h: 0.4, fontSize: 14, bold: true, color: DK, valign: "middle", align: "left", fit: "shrink" }));
      if (i < rows.length - 1) s.addShape(pres.shapes.LINE, { x: 5.1, y: y + 0.47, w: 4.2, h: 0, line: { color: LINE, width: 0.75 } });
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.45, w: 4.1, h: 3.55, fill: { color: DK }, line: { type: "none" }, rectRadius: 0.08 });
    s.addText("שווי שוק מוערך", T({ x: 0.8, y: 1.85, w: 3.5, h: 0.35, fontSize: 15, color: "D4B26A", bold: true }));
    s.addText(`${nf(V.lo)} ₪\nעד ${nf(V.hi)} ₪`, T({ x: 0.8, y: 2.25, w: 3.5, h: 1.1, fontSize: 30, bold: true, color: LT, valign: "middle" }));
    s.addText(`כ־${nf(Math.round(V.lo / P.sqm / 50) * 50)} עד ${nf(Math.round(V.hi / P.sqm / 50) * 50)} ₪ למ״ר`, T({ x: 0.8, y: 3.5, w: 3.5, h: 0.35, fontSize: 15, color: "D9D6CE" }));
    s.addText(`נכון ל־${S.dateLong}`, T({ x: 0.8, y: 4.05, w: 3.5, h: 0.4, fontSize: 13, color: "D4B26A", bold: true }));
  }

  // 3 Deals
  {
    const s = pres.addSlide();
    const pr = deals.map((d) => d.price);
    const ds = deals.map((d) => pdate(d.date)).filter(Boolean).sort((a, b) => a - b);
    const my = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    frame(s, `עסקאות דומות נסגרו ב־${m2(Math.min(...pr))} עד ${m2(Math.max(...pr))} מיליון ₪`, `עסקאות שנסגרו לפי רשות המיסים${ds.length ? `, ${my(ds[0])} עד ${my(ds[ds.length - 1])}` : ""}`);
    const rows = deals.map((d) => [d.addr, fdate(d.date), d.rooms ?? "", d.floor ?? "", d.sqm, nf(d.price) + " ₪", nf(d.psm) + " ₪"]);
    const fs_ = rows.length > 9 ? 11 : 12;
    s.addTable(table(["כתובת", "תאריך", "חדרים", "קומה", "מ״ר", "מחיר עסקה", "₪ למ״ר"], rows, ["ממוצע", "", "", "", "", nf(dAvgPrice) + " ₪", nf(dAvgPsm) + " ₪"], deals.map((d, i) => (d.hl ? i : -1)).filter((i) => i >= 0)),
      { x: 0.5, y: 1.38, w: 9.0, colW: [1.25, 1.4, 0.75, 1.0, 0.7, 1.35, 2.55], rowH: rows.length > 9 ? 0.25 : 0.27, fontFace: F, fontSize: fs_, rtlMode: true });
    s.addText("מקור: רשות המיסים (govmap)." + (S.dealsNote ? " " + S.dealsNote : ""), T({ x: 0.5, y: 4.98, w: 9.0, h: 0.2, fontSize: 9, color: GRAY }));
  }

  // 4 Listings
  if (lst.length) {
    const s = pres.addSlide();
    const pr = lst.map((d) => d.price);
    frame(s, `נכסים דומים בשיווק: ${m2(Math.min(...pr))} עד ${m2(Math.max(...pr))} מיליון ₪`, "מחירים מבוקשים ביד 2. עסקאות נסגרות בדרך כלל מתחתם");
    const rows = lst.map((d) => [d.addr, d.type || "", d.rooms ?? "", d.floor ?? "", d.sqm, d.cond || "", nf(d.price) + " ₪", nf(d.psm) + " ₪"]);
    s.addTable(table(["כתובת", "סוג", "חדרים", "קומה", "בנוי", "מצב", "מחיר מבוקש", "₪ למ״ר"], rows, null, lst.map((d, i) => (d.hl ? i : -1)).filter((i) => i >= 0)),
      { x: 0.5, y: 1.5, w: 9.0, colW: [1.0, 1.25, 0.95, 0.6, 0.65, 0.75, 1.2, 2.6], rowH: 0.42, fontFace: F, fontSize: 13, rtlMode: true });
    s.addText("מקור: יד 2." + (S.listingsNote ? " " + S.listingsNote : ""), T({ x: 0.5, y: 4.95, w: 9.0, h: 0.2, fontSize: 9, color: GRAY }));
  }

  // 5 Statement
  {
    const s = pres.addSlide();
    frame(s, S.statementTitle || `העסקאות ברחוב תומכות בשווי של ${m2(V.lo)} עד ${m2(V.hi)} מיליון ₪`, "העסקאות הקרובות ביותר לנכס", true);
    const cards = [{ eyebrow: "שווי שוק מוערך", big: `${m2(V.lo)} עד ${m2(V.hi)}`, l1: "מיליון ₪", l2: `אמצע הטווח: ${nf(V.mid)} ₪`, hot: true }];
    keyDeals.forEach((d) => cards.push({ eyebrow: d.addr + " · נמכרה", big: nf(d.price) + " ₪", l1: `${d.sqm} מ״ר · ${d.rooms} חד׳` + (d.floor ? " · קומה " + d.floor : ""), l2: fdate(d.date) }));
    statCards(s, cards);
    s.addText([{ text: S.statementText || "השווי נקבע לפי עסקאות שנסגרו בפועל ברחוב ובסביבה הקרובה, בהתאמה לגודל, לקומה ולמצב הנכס.", options: { color: LT } }],
      T({ x: 0.5, y: 4.0, w: 9.0, h: 0.85, fontSize: 16, valign: "middle" }));
  }

  // 6 Bars
  {
    const s = pres.addSlide();
    frame(s, "מחיר למ״ר: הנכס מול העסקאות והשוק", `₪ למ״ר בנוי, על בסיס ${P.sqm} מ״ר`);
    const rows = deals.map((d) => [`${d.addr} · ${fdate(d.date)}`, d.psm, GOLD]);
    rows.push(["ממוצע העסקאות", dAvgPsm, "8C6A22", true]);
    if (lst.length) rows.push(["חציון הנכסים בשיווק", median(lst.map((d) => d.psm)), "6B6B73"]);
    rows.push([`השווי המוערך (${nf(V.mid)} ₪)`, psm, DK, true]);
    rows.sort((a, b) => b[1] - a[1]);
    const show = rows.slice(0, 8);
    const right = 5.95, maxW = 4.6, scale = maxW / (Math.max(...show.map((r) => r[1])) * 1.04), step = Math.min(0.44, 2.9 / show.length);
    show.forEach((r, i) => {
      const y = 1.4 + i * step;
      s.addText(r[0], T({ x: 6.1, y, w: 3.4, h: 0.36, fontSize: 12, bold: !!r[3], color: DK, valign: "middle", fit: "shrink" }));
      const w = r[1] * scale;
      s.addShape(pres.shapes.RECTANGLE, { x: right - w, y: y + 0.06, w, h: step * 0.55, fill: { color: r[2] }, line: { type: "none" } });
      s.addText(nf(r[1]) + " ₪", T({ x: right - w - 1.2, y, w: 1.1, h: 0.36, fontSize: 12, bold: true, color: DK, valign: "middle" }));
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.45, w: 9.0, h: 0.58, fill: { color: TINT }, line: { type: "none" }, rectRadius: 0.06 });
    s.addText(S.barsNote || "דירה קטנה נמכרת ביותר למ״ר מדירה גדולה, ולכן ההשוואה נעשית בעיקר מול דירות בגודל דומה.",
      T({ x: 0.7, y: 4.48, w: 8.6, h: 0.52, fontSize: 12, color: DK, valign: "middle" }));
  }

  // 7 Method
  {
    const s = pres.addSlide();
    frame(s, "שיטת ההערכה", "כך נקבע טווח השווי");
    const items = S.points || [["גישת ההשוואה", "השוואה לעסקאות שנסגרו בפועל לפי רשות המיסים, ברחוב ובסביבה הקרובה."], ["התאמות", "התאמה לגודל הנכס, לקומה, למספר החדרים ולמצב הפיזי."], ["נכסים בשיווק", "בדיקת המחירים המבוקשים ביד 2 לנכסים דומים, כמדד לביקוש ולהיצע."], ["מגבלות", "חוות דעת של מתווך מקרקעין, ואינה שומת מקרקעין של שמאי מוסמך."]];
    const ic = await Promise.all([fa.FaBalanceScale, fa.FaRulerCombined, fa.FaSearch, fa.FaInfoCircle].map(icon));
    const pos = [[5.1, 1.5], [0.5, 1.5], [5.1, 3.28], [0.5, 3.28]];
    items.slice(0, 4).forEach((it, i) => {
      const [x, y] = pos[i];
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.58, fill: { color: WHITE }, line: { color: LINE, width: 0.75 }, rectRadius: 0.08, shadow: shadow() });
      s.addShape(pres.shapes.OVAL, { x: x + 3.72, y: y + 0.22, w: 0.48, h: 0.48, fill: { color: GOLD }, line: { type: "none" } });
      s.addImage({ data: ic[i], x: x + 3.84, y: y + 0.34, w: 0.24, h: 0.24 });
      s.addText(it[0], T({ x: x + 0.2, y: y + 0.24, w: 3.4, h: 0.42, fontSize: 16, bold: true, color: DK, valign: "middle", fit: "shrink" }));
      s.addText(it[1], T({ x: x + 0.2, y: y + 0.78, w: 3.95, h: 0.7, fontSize: 13, color: "45464B" }));
    });
  }

  // 8 Conclusion
  {
    const s = pres.addSlide();
    frame(s, `מסקנה: שווי שוק של ${nf(V.lo)} עד ${nf(V.hi)} ₪`, `נכון ל־${S.dateLong}`);
    const tiers = [
      { x: 6.67, eyebrow: "גבול עליון", big: nf(V.hi) + " ₪", body: "נכס במצב טוב, בתנאי שוק נוחים" },
      { x: 3.585, eyebrow: "שווי שוק מוערך", big: nf(V.mid) + " ₪", body: "אמצע הטווח, בהתאם לעסקאות הדומות", main: true },
      { x: 0.5, eyebrow: "גבול תחתון", big: nf(V.lo) + " ₪", body: "מכירה בזמן קצר או בתנאים פחות נוחים" },
    ];
    tiers.forEach((t) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: t.x, y: 1.5, w: 2.83, h: 2.15, fill: { color: t.main ? DK : WHITE }, line: t.main ? { type: "none" } : { color: LINE, width: 0.75 }, rectRadius: 0.08, shadow: shadow() });
      s.addText(t.eyebrow, T({ x: t.x + 0.2, y: 1.72, w: 2.43, h: 0.3, fontSize: 14, bold: true, color: t.main ? "D4B26A" : GOLDT }));
      s.addText(t.big, T({ x: t.x + 0.2, y: 2.1, w: 2.43, h: 0.62, fontSize: t.main ? 30 : 26, bold: true, color: t.main ? LT : DK, valign: "middle", fit: "shrink" }));
      s.addText(t.body, T({ x: t.x + 0.2, y: 2.85, w: 2.43, h: 0.7, fontSize: 13, color: t.main ? "D9D6CE" : "45464B" }));
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.88, w: 9.0, h: 1.12, fill: { color: TINT }, line: { type: "none" }, rectRadius: 0.06 });
    s.addText([{ text: "הבהרה: ", options: { bold: true } }, { text: S.disclaimer || "חוות דעת זו נערכה על ידי מתווך מקרקעין מורשה, על בסיס נתוני עסקאות של רשות המיסים ומודעות פומביות, ומשקפת הערכת שווי שוק בלבד. היא אינה מהווה שומת מקרקעין של שמאי מקרקעין מוסמך, ולא נערכה בדיקה משפטית או הנדסית של הנכס." }],
      T({ x: 0.75, y: 3.93, w: 8.5, h: 1.02, fontSize: 12, color: DK, valign: "middle" }));
  }

  // 9 Closing
  {
    const s = pres.addSlide();
    s.background = { color: BLK };
    s.addImage({ path: LOGO, x: 2.9, y: 0.4, w: 4.2, h: 2.343 });
    s.addText(S.contact, T({ x: 1.0, y: 2.95, w: 8.0, h: 0.5, fontSize: 24, bold: true, color: LT, align: "center", valign: "middle" }));
    s.addText(S.license ? `מתווך מקרקעין · רישיון תיווך מס׳ ${S.license}` : "Team Sergeyev · צוות סרגייב", T({ x: 1.0, y: 3.45, w: 8.0, h: 0.4, fontSize: 16, color: "D4B26A", align: "center", valign: "middle" }));
    s.addText("Team Sergeyev · צוות סרגייב", T({ x: 1.0, y: 3.85, w: 8.0, h: 0.35, fontSize: 13, color: "A9A69E", align: "center", valign: "middle" }));
    s.addText(`תאריך: ${S.dateLong}`, T({ x: 5.3, y: 4.55, w: 3.4, h: 0.35, fontSize: 13, color: "D9D6CE" }));
    s.addText("חתימה: ____________________", T({ x: 1.3, y: 4.55, w: 3.6, h: 0.35, fontSize: 13, color: "D9D6CE" }));
  }

  await pres.writeFile({ fileName: OUT });
  console.log("ok", OUT);
})();
