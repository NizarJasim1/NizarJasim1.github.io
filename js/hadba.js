// =============================================================
//  منارة الحدباء — كما هي اليوم بعد إعادة البناء (اليونسكو 2024)
//  القياسات: مسح المحطة الروبوتية (Abdullah & Abed 2013)، Archnet، اليونسكو
//  الشكل والتفاصيل: صور ويكيميديا 2024–2026 (نهاري، ليلي، من الحديقة، من السطوح)
//
//  • القاعدة 18.2م: جزء سفلي 10م مليّس أبيض-كريمي بجدران مايلة (منحدرة)، صف 5 كوّات مستطيلة
//    بالوجه الجنوبي، باب مقوّس صغير. فوقه جزء آجر 8.2م: لوحة مربعة غاطسة بكل وجه
//    (الغربي: ميدالية نجمية، الباقي: شبكة معيّنات بأزرار آجر) بإطار زخرفي ضيّق
//  • الجذع 25.6م، قطره 5.23م بالأسفل و3.37م بالأعلى، مايل للشرق 1.6م (صفوف أفقية)
//    7 أحزمة هزارباف (من الأسفل): شيفرون كبير بفتحات، رصف سمكي، شبكة مثلثات،
//    متاهة كوفية ناعمة، معيّنات غامقة، وريدات سداسية، صفوف مثلثات — بينها أفاريز موجية رفيعة
//  • الشرفة على 43.8م: طوق بني (كوابيل) قطره 4.9م، درابزين أبيض، كشافات وسماعات
//  • جذع علوي آجر + قبيبة مليسة + عمود قمة بكرات وهلال → 50م
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { mergeGeometries } from "../vendor/addons/utils/BufferGeometryUtils.js?v=69";

export const HADBA = {
  lowH: 10.0, lowB: 10.0, lowT: 8.9,       // الجزء المليّس: عرض بالأسفل / بالأعلى
  upH: 8.2, upB: 8.55, upT: 8.35,          // جزء الآجر
  tiltDeg: 2.0,                             // القاعدة مايلة للشرق (المسح)
  shaftH: 25.6, dBot: 5.23, dTop: 3.37,
  lean: 1.6, leanN: 0.3,
  discD: 4.9, ringH: 0.85,
  drumD: 2.7, drumH: 3.0, domeH: 1.55,
};

const rnd = (a, b) => a + Math.random() * (b - a);
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c, srgb = true, wrapS = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = wrapS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  return t;
}
// آجر الحدباء: أصفر-رملي فاتح (buff)، مونة أفتح
const BR = [190, 162, 120], MO = [204, 185, 150];
const bc = (v = 0) => `rgb(${BR[0] + v | 0},${BR[1] + v * 0.92 | 0},${BR[2] + v * 0.8 | 0})`;

// رسام مزدوج: لون (g) + ارتفاع (h): 255 بارز، 140 سطح، 30 غاطس/فتحة
function P(g, h) {
  return {
    g, h,
    fill(x, y, w, hh, lvl, v = 0) { g.fillStyle = lvl === 0 ? `rgb(${146 + v},${120 + v},${88 + v})` : bc(v + (lvl === 2 ? 6 : -4)); g.fillRect(x, y, w, hh); h.fillStyle = `rgb(${[30, 140, 255][lvl]},0,0)`.replace(/rgb\((\d+),0,0\)/, (m, a) => `rgb(${a},${a},${a})`); h.fillRect(x, y, w, hh); },
    poly(pts, lvl, v = 0) { for (const q of [g, h]) { q.beginPath(); pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); q.closePath(); } g.fillStyle = lvl === 0 ? `rgb(${146 + v},${120 + v},${88 + v})` : bc(v + (lvl === 2 ? 6 : -4)); g.fill(); const a = [30, 140, 255][lvl]; h.fillStyle = `rgb(${a},${a},${a})`; h.fill(); },
    mortar(x, y, w, hh) { g.fillStyle = `rgb(${MO})`; g.fillRect(x, y, w, hh); h.fillStyle = "rgb(90,90,90)"; h.fillRect(x, y, w, hh); },
  };
}
// صف طابوق عادي (خلفية) بحجم bw×bh
function courses(p, x0, y0, w, hh, bw, bh, lvl = 1) {
  p.mortar(x0, y0, w, hh);
  for (let r = 0, y = y0; y < y0 + hh; r++, y += bh) for (let x = x0 - (r % 2) * bw / 2; x < x0 + w; x += bw) p.fill(Math.max(x, x0) + 1, y + 1, Math.min(bw - 2, x0 + w - x - 1), bh - 2, lvl, rnd(-10, 10));
}

// ---------------- الأحزمة السبعة ----------------
const BANDS = [
  { f: 0.22, draw: chevronHoles },   // 1 شيفرون كبير بفتحات
  { f: 0.12, draw: herringbone },    // 2 رصف سمكي
  { f: 0.14, draw: triLattice },     // 3 شبكة مثلثات/معيّنات كبيرة
  { f: 0.11, draw: kufic },          // 4 متاهة كوفية
  { f: 0.13, draw: diamondChecker }, // 5 معيّنات غامقة
  { f: 0.12, draw: rosettes },       // 6 وريدات سداسية
  { f: 0.10, draw: triangles },      // 7 صفوف مثلثات
];
function herringbone(p, x0, y0, w, hh, s = 10) {
  p.mortar(x0, y0, w, hh);
  const L = s * 2.6;
  for (let x = x0 - L; x < x0 + w + L; x += s * 2) for (let y = y0 - L; y < y0 + hh + L; y += s) {
    const up = Math.floor((x - x0) / (s * 2)) % 2 === 0;
    const a = [[x, y], [x + s * 0.9, y + (up ? -s * 0.9 : s * 0.9)]];
    p.poly([[a[0][0], a[0][1]], [a[1][0], a[1][1]], [a[1][0], a[1][1] + s * 0.42], [a[0][0], a[0][1] + s * 0.42]], 1, rnd(-12, 10));
  }
}
function chevronHoles(p, x0, y0, w, hh) {
  herringbone(p, x0, y0, w, hh, 12);
  // مسارات معيّنات كبيرة بارزة + فتحات مربعة صغيرة (فتحات السقالة)
  const S = 96;
  for (let x = x0; x < x0 + w + S; x += S) for (let y = y0; y < y0 + hh + S; y += S) {
    const cx = x, cy = y + ((x - x0) / S % 2 ? S / 2 : 0);
    p.poly([[cx, cy - S * 0.42], [cx + S * 0.42, cy], [cx, cy + S * 0.42], [cx - S * 0.42, cy], [cx, cy - S * 0.42], [cx, cy - S * 0.34], [cx - S * 0.34, cy], [cx, cy + S * 0.34], [cx + S * 0.34, cy], [cx, cy - S * 0.34]], 2, 4);
    p.fill(cx - 5, cy - 5, 10, 10, 0);
  }
}
function triLattice(p, x0, y0, w, hh) {
  courses(p, x0, y0, w, hh, 30, 8, 2);
  const S = 52, H2 = S * 0.86;
  for (let r = 0, y = y0; y < y0 + hh; r++, y += H2) for (let x = x0 - (r % 2) * S / 2; x < x0 + w + S; x += S) {
    p.poly([[x, y + H2 * 0.88], [x + S * 0.5, y + H2 * 0.12], [x + S, y + H2 * 0.88]], 0, 4);
  }
}
function kufic(p, x0, y0, w, hh) {
  courses(p, x0, y0, w, hh, 16, 6, 1);
  const S = 36;
  for (let x = x0; x < x0 + w; x += S) for (let y = y0; y < y0 + hh - S * 0.5; y += S) {
    const t = 5;
    p.fill(x + 3, y + 3, S - 6, t, 2); p.fill(x + 3, y + 3, t, S - 10, 2); p.fill(x + 3, y + S - 7 - t, S - 14, t, 2); p.fill(x + S - 11 - t, y + 13, t, S - 20, 2); p.fill(x + 13, y + 13, S - 24 - t, t, 2);
  }
}
function diamondChecker(p, x0, y0, w, hh) {
  courses(p, x0, y0, w, hh, 22, 7, 2);
  const S = 34;
  for (let r = 0, y = y0 + S / 2; y < y0 + hh; r++, y += S / 2) for (let x = x0 + (r % 2) * S / 2; x < x0 + w + S; x += S) {
    p.poly([[x, y - S * 0.3], [x + S * 0.3, y], [x, y + S * 0.3], [x - S * 0.3, y]], 0, 6);
  }
}
function rosettes(p, x0, y0, w, hh) {
  courses(p, x0, y0, w, hh, 14, 5, 1);
  const R = 15;
  for (let r = 0, y = y0 + R; y < y0 + hh; r++, y += R * 1.73) for (let x = x0 + (r % 2) * R; x < x0 + w + R; x += R * 2) {
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; p.poly([[x, y], [x + Math.cos(a - 0.3) * R, y + Math.sin(a - 0.3) * R], [x + Math.cos(a) * R * 1.05, y + Math.sin(a) * R * 1.05], [x + Math.cos(a + 0.3) * R, y + Math.sin(a + 0.3) * R]], k % 2 ? 2 : 1, 3); }
    p.fill(x - 2, y - 2, 4, 4, 0);
  }
}
function triangles(p, x0, y0, w, hh) {
  courses(p, x0, y0, w, hh, 18, 6, 2);
  const S = 40, H2 = 32;
  for (let r = 0, y = y0 + 6; y < y0 + hh - H2 * 0.5; r++, y += H2 * 1.1) for (let x = x0 - (r % 2) * S / 2; x < x0 + w + S; x += S) {
    p.poly([[x + 6, y + H2], [x + S / 2, y + 4], [x + S - 6, y + H2]], 0, 5);
    p.poly([[x + 13, y + H2 - 3], [x + S / 2, y + 14], [x + S - 13, y + H2 - 3]], 2, 4);
  }
}
function frieze(p, x0, y0, w, hh, kind) {
  p.mortar(x0, y0, w, hh);
  p.fill(x0, y0, w, hh * 0.18, 2, 4); p.fill(x0, y0 + hh * 0.82, w, hh * 0.18, 2, 4);
  if (kind === 0) {
    for (let x = x0; x < x0 + w; x += 2) { const y = y0 + hh * 0.5 + Math.sin((x - x0) / 9) * hh * 0.18; p.fill(x, y - hh * 0.1, 2, hh * 0.2, 2, 6); }
  } else {
    for (let x = x0; x < x0 + w; x += hh * 0.6) p.poly([[x, y0 + hh * 0.5], [x + hh * 0.3, y0 + hh * 0.25], [x + hh * 0.6, y0 + hh * 0.5], [x + hh * 0.3, y0 + hh * 0.75]], 2, 5);
  }
}

function shaftTextures() {
  const H = HADBA, W = 1400, PX = 2560, mpp = H.shaftH / PX;
  const [c, g] = canvas(W, PX), [hc, h] = canvas(W, PX);
  const p = P(g, h);
  const fr = 0.42, total = BANDS.reduce((s, b) => s + b.f, 0), scale = (H.shaftH - 6 * fr) / total;
  let m = 0;
  BANDS.forEach((b, i) => {
    const bh = b.f * scale, y0 = PX - (m + bh) / mpp;
    g.save(); h.save(); g.beginPath(); g.rect(0, y0, W, bh / mpp); g.clip(); h.beginPath(); h.rect(0, y0, W, bh / mpp); h.clip();
    b.draw(p, 0, y0, W, bh / mpp);
    g.restore(); h.restore();
    m += bh;
    if (i < 6) { frieze(p, 0, PX - (m + fr) / mpp, W, fr / mpp, i % 2); m += fr; }
  });
  // تلون طبيعي: بقع أفتح/أغمق وأثر مطر
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,240,210" : "70,50,30"},${rnd(0.02, 0.06)})`; g.fillRect(rnd(0, W), rnd(0, PX), rnd(20, 120), rnd(20, 160)); }
  return { map: tex(c), bump: tex(hc, false) };
}

// ---------------- وجوه قاعدة الآجر ----------------
function baseFace(face) {
  const S = 1024, [c, g] = canvas(S, S), [hc, h] = canvas(S, S), p = P(g, h);
  courses(p, 0, 0, S, S, 34, 10, 1);
  // إطار اللوحة: غاطس ثم شريط زخرفي ضيق
  const m = 70, b = 34;
  p.fill(m - 8, m - 8, S - 2 * m + 16, S - 2 * m + 16, 0, 10);
  courses(p, m, m, S - 2 * m, S - 2 * m, 26, 8, 1);
  // شريط الإطار: نجوم سداسية صغيرة متتالية
  const star = (cx, cy, r1, r2, n, rot) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, r = i % 2 ? r2 : r1; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; };
  for (let t = m + b / 2; t < S - m; t += b) for (const [x, y] of [[t, m + b / 2], [t, S - m - b / 2], [m + b / 2, t], [S - m - b / 2, t]]) p.poly(star(x, y, b * 0.42, b * 0.22, 6, -Math.PI / 2), 2, 8);
  const ix = m + b + 6, iw = S - 2 * ix;
  p.fill(ix - 4, ix - 4, iw + 8, iw + 8, 0, 6);
  if (face === "W") {
    // ميدالية سجادية: مربع وسطي بنجمة ثمانية ونجوم خماسية حولها، داخل حقل تشبيك
    courses(p, ix, ix, iw, iw, 20, 7, 1);
    for (let y = ix + 20; y < ix + iw; y += 40) for (let x = ix + 20 + ((y / 40) % 2) * 20; x < ix + iw; x += 40) p.poly([[x, y - 9], [x + 9, y], [x, y + 9], [x - 9, y]], 2, 6);
    const cx = S / 2, cy = S / 2, R = iw * 0.3;
    p.fill(cx - R * 1.15, cy - R * 1.15, R * 2.3, R * 2.3, 0, 8);
    courses(p, cx - R * 1.1, cy - R * 1.1, R * 2.2, R * 2.2, 18, 6, 1);
    p.poly(star(cx, cy, R * 0.62, R * 0.34, 8, Math.PI / 8), 2, 12);
    p.poly(star(cx, cy, R * 0.4, R * 0.22, 8, Math.PI / 8), 0, 8);
    p.poly(star(cx, cy, R * 0.18, R * 0.1, 8, 0), 2, 14);
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; p.poly(star(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, R * 0.18, R * 0.08, 5, a - Math.PI / 2), 2, 10); }
  } else {
    // شبكة معيّنات بأزرار آجر (مثل الصور)
    courses(p, ix, ix, iw, iw, 22, 7, 1);
    const D = 64;
    for (let y = ix - D; y < ix + iw + D; y += D / 2) for (let x = ix - D + ((y / (D / 2)) % 2) * D / 2; x < ix + iw + D; x += D) {
      // خطوط الشبكة البارزة
      p.poly([[x, y - D / 2], [x + 6, y - D / 2], [x + D / 2 + 6, y], [x + D / 2, y]], 2, 8);
      p.poly([[x, y - D / 2], [x - 6, y - D / 2], [x - D / 2 - 6, y], [x - D / 2, y]], 2, 8);
      // زر بالوسط + نقطتين غامقتين
      p.fill(x - 6, y - 6, 12, 12, 2, 14);
      p.fill(x - 3, y + 10, 6, 6, 0); p.fill(x - 3, y - 16, 6, 6, 0);
    }
    g.save(); g.restore();
  }
  // تلون
  for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,240,210" : "60,45,30"},${rnd(0.02, 0.05)})`; g.fillRect(rnd(0, S), rnd(0, S), rnd(30, 140), rnd(30, 140)); }
  return { map: tex(c, true, false), bump: tex(hc, false, false) };
}

// لياسة الجزء السفلي: أبيض-كريمي ببقع رطوبة خفيفة، كوّات وباب
function plasterFace(face) {
  const W = 512, H = 512, [c, g] = canvas(W, H), [hc, h] = canvas(W, H);
  g.fillStyle = "#e9e2d4"; g.fillRect(0, 0, W, H); h.fillStyle = "#888"; h.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${Math.random() < 0.6 ? "150,135,110" : "255,255,250"},${rnd(0.02, 0.07)})`; g.beginPath(); g.ellipse(rnd(0, W), rnd(0, H), rnd(6, 50), rnd(6, 40), 0, 0, 7); g.fill(); }
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(110,90,60,.16)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const hole = (x, y, w, hh, arch) => {
    for (const [q, col] of [[g, arch ? "#3e362c" : "#cfc6b4"], [h, arch ? "#222" : "#5a5a5a"]]) { q.fillStyle = col; q.beginPath(); if (arch) { q.moveTo(x, y + hh); q.lineTo(x, y + w / 2); q.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); q.lineTo(x + w, y + hh); } else q.rect(x, y, w, hh); q.fill(); }
  };
  if (face === "S") for (let k = 0; k < 5; k++) hole(40 + k * 92, 16, 58, 150, false);     // صف 5 كوّات بأعلى الجزء المليّس
  if (face === "E") hole(W / 2 - 24, H - 130, 48, 126, true);                              // باب مقوّس صغير
  if (face === "W") hole(150, 300, 26, 54, true);                                          // شباك صغير
  return { map: tex(c, true, false), bump: tex(hc, false, false) };
}

// موشور مربع مستدق مايل (القمة مزاحة dx للشرق) — يرجع وجه لكل اتجاه
function prism(y0, y1, s0, s1, dx0, dx1) {
  const A = [[dx0 + s0 / 2, y0, -s0 / 2], [dx0 + s0 / 2, y0, s0 / 2], [dx0 - s0 / 2, y0, s0 / 2], [dx0 - s0 / 2, y0, -s0 / 2]];
  const B = [[dx1 + s1 / 2, y1, -s1 / 2], [dx1 + s1 / 2, y1, s1 / 2], [dx1 - s1 / 2, y1, s1 / 2], [dx1 - s1 / 2, y1, -s1 / 2]];
  const quad = (a, b, cc, d) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...cc, ...a, ...cc, ...d], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    g.computeVertexNormals(); return g;
  };
  // الشرق +x، الشمال −z
  return { E: quad(A[1], A[0], B[0], B[1]), W: quad(A[3], A[2], B[2], B[3]), N: quad(A[0], A[3], B[3], B[0]), S: quad(A[2], A[1], B[1], B[2]) };
}

export function buildHadba() {
  const H = HADBA;
  const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const t = Math.tan((H.tiltDeg * Math.PI) / 180);
  const y1 = H.lowH, y2 = H.lowH + H.upH;
  // ---- الجزء المليّس ----
  const low = prism(0, y1, H.lowB, H.lowT, 0, y1 * t);
  for (const k of ["E", "W", "N", "S"]) { const f = plasterFace(k); inner.add(new THREE.Mesh(low[k], new THREE.MeshStandardMaterial({ map: f.map, bumpMap: f.bump, bumpScale: 1.5, roughness: 0.95 }))); }
  const lip = new THREE.Mesh(new THREE.BoxGeometry(H.lowT + 0.15, 0.22, H.lowT + 0.15), new THREE.MeshStandardMaterial({ color: 0xd9d0bf, roughness: 0.95 })); lip.position.set(y1 * t, y1 - 0.06, 0); inner.add(lip);
  // ---- جزء الآجر ----
  const up = prism(y1, y2, H.upB, H.upT, y1 * t, y2 * t);
  for (const k of ["E", "W", "N", "S"]) { const f = baseFace(k); inner.add(new THREE.Mesh(up[k], new THREE.MeshStandardMaterial({ map: f.map, bumpMap: f.bump, bumpScale: 2.4, roughness: 0.9 }))); }
  const capMat = new THREE.MeshStandardMaterial({ color: 0xbfa57e, roughness: 0.92 });
  const cap = new THREE.Mesh(new THREE.BoxGeometry(H.upT + 0.12, 0.3, H.upT + 0.12), capMat); cap.position.set(y2 * t, y2 - 0.12, 0); inner.add(cap);

  // ---- الجذع: حلقات أفقية مزاحة ----
  const tx = shaftTextures();
  const SEG = 72, RINGS = 140, base = y2 * t;
  const center = (u) => [base + H.lean * Math.pow(u, 1.8), -H.leanN * Math.pow(u, 1.8)];
  const rad = (u) => (H.dBot + (H.dTop - H.dBot) * u) / 2;
  const pos = [], uv = [], idx = [];
  for (let r = 0; r <= RINGS; r++) {
    const u = r / RINGS, y = y2 + u * H.shaftH, [cx, cz] = center(u), R = rad(u);
    for (let s = 0; s <= SEG; s++) { const a = (s / SEG) * Math.PI * 2; pos.push(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R); uv.push((s / SEG) * (R / rad(0)), u); }
  }
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = r * (SEG + 1) + s, b = a + SEG + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals();
  inner.add(new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 3.2, roughness: 0.9 })));

  // ---- الشرفة: طوق بني بكوابيل + درابزين أبيض + كشافات وسماعات ----
  const yT = y2 + H.shaftH, [tcx, tcz] = center(1), rT = rad(1);
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.6 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(H.discD / 2, rT + 0.12, H.ringH, 56), wood); ring.position.set(tcx, yT + H.ringH / 2 - 0.15, tcz); inner.add(ring);
  const brk = [];
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; const b = new THREE.BoxGeometry(0.75, 0.16, 0.12); b.translate(rT + 0.38, 0, 0); b.rotateY(-a); b.translate(tcx, yT - 0.12, tcz); brk.push(b.toNonIndexed()); }
  inner.add(new THREE.Mesh(mergeGeometries(brk), new THREE.MeshStandardMaterial({ color: 0x7a4f28, roughness: 0.65 })));
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5, metalness: 0.3 });
  const floorY = yT + H.ringH - 0.15, RR = H.discD / 2 - 0.08, rail = [];
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; const b = new THREE.BoxGeometry(0.035, 1.0, 0.035); b.translate(tcx + Math.cos(a) * RR, floorY + 0.5, tcz + Math.sin(a) * RR); rail.push(b.toNonIndexed()); }
  for (const yy of [0.5, 1.0]) { const r = new THREE.TorusGeometry(RR, 0.03, 6, 72); r.rotateX(Math.PI / 2); r.translate(tcx, floorY + yy, tcz); rail.push(r.toNonIndexed()); }
  inner.add(new THREE.Mesh(mergeGeometries(rail), white));
  const gear = [], lights = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, x = tcx + Math.cos(a) * (RR + 0.2), z = tcz + Math.sin(a) * (RR + 0.2);
    const horn = new THREE.CylinderGeometry(0.22, 0.06, 0.5, 10); horn.rotateZ(Math.PI / 2); horn.rotateY(-a); horn.translate(x, floorY + 1.3, z); gear.push(horn.toNonIndexed());
    const lamp = new THREE.BoxGeometry(0.35, 0.28, 0.12); lamp.rotateY(-a + Math.PI / 2); lamp.translate(x, yT - 0.5, z); gear.push(lamp.toNonIndexed());
    lights.push([x, yT - 0.5, z]);
  }
  inner.add(new THREE.Mesh(mergeGeometries(gear), white));
  // ---- الجذع العلوي + القبيبة + عمود القمة ----
  const drumMat = new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump, bumpScale: 2, roughness: 0.9 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(H.drumD / 2, H.drumD / 2, H.drumH, 48, 1, true), drumMat); drum.position.set(tcx, floorY + H.drumH / 2, tcz); inner.add(drum);
  drum.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = 0.9 + v * 0.1; });
  const cornice = new THREE.Mesh(new THREE.CylinderGeometry(H.drumD / 2 + 0.14, H.drumD / 2 + 0.05, 0.22, 48), capMat); cornice.position.set(tcx, floorY + H.drumH, tcz); inner.add(cornice);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }));
  const pa = Math.PI / 2; plaque.position.set(tcx, floorY + 1.05, tcz + H.drumD / 2 + 0.02); inner.add(plaque);
  const pts = [];
  for (let i = 0; i <= 24; i++) { const f = i / 24, ph = (f * Math.PI) / 2; pts.push(new THREE.Vector2(Math.max(0.001, (H.drumD / 2) * Math.cos(ph)), H.domeH * Math.sin(ph) + 0.12 * Math.pow(f, 5))); }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.85 })); dome.position.set(tcx, floorY + H.drumH + 0.1, tcz); inner.add(dome);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.3, metalness: 0.9 });
  const yTip = floorY + H.drumH + 0.1 + H.domeH + 0.12;
  const fin = [];
  const rod = new THREE.CylinderGeometry(0.035, 0.05, 1.5, 8); rod.translate(tcx, yTip + 0.75, tcz); fin.push(rod.toNonIndexed());
  for (const [yy, r] of [[0.25, 0.14], [0.6, 0.11], [0.95, 0.08]]) { const s = new THREE.SphereGeometry(r, 12, 8); s.translate(tcx, yTip + yy, tcz); fin.push(s.toNonIndexed()); }
  const cr = new THREE.TorusGeometry(0.22, 0.045, 6, 20, Math.PI * 1.45); cr.rotateZ(Math.PI * 0.78); cr.translate(tcx, yTip + 1.55, tcz); fin.push(cr.toNonIndexed());
  inner.add(new THREE.Mesh(mergeGeometries(fin), brass));

  inner.scale.setScalar(1 / 8);
  const S = 1 / 8, V3 = (x, y, z) => new THREE.Vector3(x * S, y * S, z * S);
  const perches = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.2; perches.push({ o: grp, p: V3(tcx + Math.cos(a) * RR, floorY + 1.05, tcz + Math.sin(a) * RR), yaw: -a + rnd(-0.3, 0.3) }); }
  for (const [cx, cz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) perches.push({ o: grp, p: V3(y2 * t + cx * H.upT * 0.44, y2 + 0.06, cz * H.upT * 0.44), yaw: Math.atan2(-cz, cx) + rnd(-0.5, 0.5) });
  perches.push({ o: grp, p: V3(tcx, yTip + 1.2, tcz), yaw: 0 });
  grp.userData = { perches, top: V3(tcx, yT + 2, tcz), height: (yTip + 1.8) * S, floodlights: lights.map(([x, y, z]) => V3(x, y, z)) };
  return grp;
}
