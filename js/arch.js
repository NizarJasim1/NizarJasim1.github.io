// =============================================================
//  أدوات معمارية مشتركة للمعالم: أنسجة حجر/شبابيك (canvas)، قباب مضلّعة، بثق مضلعات، أسطوانات بـ UV بالمتر
//  الوحدة داخل المعالم = متر (المجموعة الداخلية تتصغّر 1/8 للمشهد)
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { mergeGeometries } from "../vendor/addons/utils/BufferGeometryUtils.js?v=69";
export { mergeGeometries };

export const rnd = (a, b) => a + Math.random() * (b - a);
let seed = 7;
export const srnd = (a, b) => { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); };
export function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
export function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const rgb = (c, v = 0) => `rgb(${Math.round(c[0] + v)},${Math.round(c[1] + v)},${Math.round(c[2] + v)})`;

// حجر حلان: مداميك (course م) بكتل مختلفة الطول — الصورة = size م
export function ashlarTex(base = [214, 202, 178], { size = 4, course = 0.5, jitter = 9, px = 512 } = {}) {
  const [c, g] = cv(px, px), [hc, h] = cv(px, px), k = px / size, ch = course * k;
  g.fillStyle = rgb(base, -22); g.fillRect(0, 0, px, px); h.fillStyle = "#4a4a4a"; h.fillRect(0, 0, px, px);
  for (let y = 0; y < px; y += ch) { let x = -srnd(0, 1.2 * k); while (x < px) { const w = srnd(0.7, 1.5) * k, v = srnd(-jitter, jitter); g.fillStyle = rgb(base, v); g.fillRect(x + 1.5, y + 1.5, w - 2.5, ch - 2.5); h.fillStyle = "#b0b0b0"; h.fillRect(x + 1.5, y + 1.5, w - 2.5, ch - 2.5); x += w; } }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${srnd(0, 1) < 0.5 ? "90,80,60" : "255,250,240"},0.07)`; g.fillRect(srnd(0, px), srnd(0, px), 2, 2); }
  const map = tex(c), bump = tex(hc, false); map.repeat.set(1 / size, 1 / size); bump.repeat.set(1 / size, 1 / size);
  return { map, bump };
}

// مسار قوس: kind = "pointed" (مدبب موصلي) | "round" | "ogee"
export function archPath(ctx, x, yBase, w, hSpring, rise, kind = "pointed") {
  const r = w / 2, cx = x + r;
  ctx.moveTo(x, yBase); ctx.lineTo(x, yBase - hSpring);
  if (kind === "round") ctx.arc(cx, yBase - hSpring, r, Math.PI, 0, false);
  else { const tip = yBase - hSpring - rise; ctx.quadraticCurveTo(x, tip + rise * 0.25, cx, tip); ctx.quadraticCurveTo(x + w, tip + rise * 0.25, x + w, yBase - hSpring); }
  ctx.lineTo(x + w, yBase); ctx.closePath();
}

// جدار بشبابيك مقوّسة متكررة — نسيج لـ "فتحة" واحدة (bay) عرضها bayW م وارتفاعها H م
// rows: [{ y0, h, w, kind, frame }] بالمتر من الأسفل
export function bayTex({ bayW, H, rows, base = [212, 200, 178], dark = [26, 22, 20], ppm = 28, glow = null, bands = [] }) {
  const W = Math.max(16, Math.round(bayW * ppm)), Hp = Math.min(1024, Math.round(H * ppm)), k = Hp / H;
  const [c, g] = cv(W, Hp), [hc, h] = cv(W, Hp);
  // خلفية حجر
  g.fillStyle = rgb(base, -16); g.fillRect(0, 0, W, Hp); h.fillStyle = "#555"; h.fillRect(0, 0, W, Hp);
  const course = 0.55 * k;
  for (let y = 0; y < Hp; y += course) { let x = -srnd(0, 30); while (x < W) { const w = srnd(0.8, 1.6) * k, v = srnd(-8, 8); g.fillStyle = rgb(base, v); g.fillRect(x + 1, y + 1, w - 2, course - 2); h.fillStyle = "#9a9a9a"; h.fillRect(x + 1, y + 1, w - 2, course - 2); x += w; } }
  // أشرطة أفقية (كورنيش/إفريز)
  for (const b of bands) { const y = Hp - (b.y + b.h) * k; g.fillStyle = rgb(b.color || base, b.v || 12); g.fillRect(0, y, W, b.h * k); h.fillStyle = b.hb || "#d0d0d0"; h.fillRect(0, y, W, b.h * k);
    if (b.arches) { const n = b.arches, aw = W / n; g.fillStyle = rgb(base, -55); h.fillStyle = "#222"; for (let i = 0; i < n; i++) { g.beginPath(); archPath(g, i * aw + aw * 0.22, y + b.h * k * 0.92, aw * 0.56, b.h * k * 0.45, b.h * k * 0.3, "round"); g.fill(); h.beginPath(); archPath(h, i * aw + aw * 0.22, y + b.h * k * 0.92, aw * 0.56, b.h * k * 0.45, b.h * k * 0.3, "round"); h.fill(); } } }
  // الشبابيك
  for (const r of rows) {
    const w = r.w * k, x = (W - w) / 2, yb = Hp - r.y0 * k, hs = (r.h - r.w * 0.6) * k, rise = r.w * 0.6 * k;
    // إطار حجر أفتح وبارز
    const f = (r.frame ?? 0.22) * k;
    g.fillStyle = rgb(base, 18); g.beginPath(); archPath(g, x - f, yb + f * 0.5, w + 2 * f, hs, rise + f, r.kind || "pointed"); g.fill();
    h.fillStyle = "#e8e8e8"; h.beginPath(); archPath(h, x - f, yb + f * 0.5, w + 2 * f, hs, rise + f, r.kind || "pointed"); h.fill();
    g.fillStyle = rgb(r.dark || dark); g.beginPath(); archPath(g, x, yb, w, hs, rise, r.kind || "pointed"); g.fill();
    h.fillStyle = "#101010"; h.beginPath(); archPath(h, x, yb, w, hs, rise, r.kind || "pointed"); h.fill();
    if (r.grille) { g.strokeStyle = "rgba(120,110,95,0.55)"; g.lineWidth = Math.max(1, k * 0.05); for (let yy = yb - 4; yy > yb - hs - rise * 0.6; yy -= k * 0.35) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } }
  }
  const map = tex(c), bump = tex(hc, false);
  let em = null;
  if (glow) { const [ec, e] = cv(W, Hp); e.fillStyle = "#000"; e.fillRect(0, 0, W, Hp); for (const r of rows) { const w = r.w * k, x = (W - w) / 2, yb = Hp - r.y0 * k; e.fillStyle = glow; e.beginPath(); archPath(e, x + 1, yb - 1, w - 2, (r.h - r.w * 0.6) * k, r.w * 0.6 * k - 2, r.kind || "pointed"); e.fill(); } em = tex(ec); }
  return { map, bump, em };
}

// أسطوانة مفتوحة بـ UV: u = عدد الفتحات حول المحيط، v = 0..1 على الارتفاع (للنسيج bayTex)
export function cylBays(r, y0, y1, nBays, seg = 64, r1 = r) {
  const g = new THREE.CylinderGeometry(r1, r, y1 - y0, seg, 1, true);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * nBays);
  g.translate(0, (y0 + y1) / 2, 0); return g;
}
// أسطوانة بـ UV بالمتر (لنسيج الحجر)
export function cylM(r, y0, y1, seg = 48, closed = false, r1 = r) {
  const g = new THREE.CylinderGeometry(r1, r, y1 - y0, seg, 1, !closed);
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); uv.setXY(i, (a + Math.PI) * r, p.getY(i) + (y1 - y0) / 2 + y0); }
  g.translate(0, (y0 + y1) / 2, 0); return g;
}
// صندوق بـ UV بالمتر
export function boxM(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)) > 0.5; const ay = Math.abs(n.getY(i)) > 0.5; uv.setXY(i, (ax ? p.getZ(i) + z : p.getX(i) + x), ay ? p.getZ(i) + z : p.getY(i) + y); }
  g.translate(x, y, z); return g;
}
// بثق مضلع (نقاط [x,z]) من y0 إلى y1 مع ثقوب — UV بالمتر
export function extrudeXZ(ring, y0, y1, holes = [], { cap = true } = {}) {
  const sh = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) { const ny = Math.abs(n.getY(i)); if (ny > 0.5) uv.setXY(i, p.getX(i), p.getZ(i)); else { const nx = n.getX(i), nz = n.getZ(i); uv.setXY(i, p.getX(i) * -nz + p.getZ(i) * nx, p.getY(i)); } }
  if (!cap) { /* keep */ }
  return g;
}
// سطح مستوي لمضلع على ارتفاع y
export function flatXZ(ring, y, holes = []) {
  const sh = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ShapeGeometry(sh, 6); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  return g;
}

// قبة مضلّعة: R نصف القطر، rise الارتفاع، ribs عدد الأضلاع، shape: 1 = نصف كروية، >1 = مدببة/بصلية خفيفة
export function ribbedDome(R, rise, ribs = 24, { rib = 0.03, point = 0.0, onion = 0, seg = 28 } = {}) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const f = i / seg, ph = (f * Math.PI) / 2;
    let r = R * Math.cos(ph) * (1 + onion * Math.sin(ph * 2) * 0.5), y = rise * Math.sin(ph);
    r *= 1 - point * Math.pow(f, 3); y += point * rise * 0.5 * Math.pow(f, 6);
    pts.push(new THREE.Vector2(Math.max(0.0005, r), y));
  }
  const g = new THREE.LatheGeometry(pts, ribs * 6);
  if (rib) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = 1 + rib * Math.pow(Math.abs(Math.cos((a * ribs) / 2)), 0.5) * (1 - Math.pow(y / (rise * 1.05), 3)); p.setX(i, x * k); p.setZ(i, z * k); } }
  g.computeVertexNormals(); return g;
}
// نسيج قبة: أضلاع + خطوط/زخرفة — u حول، v من القاعدة للقمة
export function domeTex({ base = [200, 190, 172], rib = [150, 140, 125], ribs = 24, stripe = null, cap = null, scale = false, w = 1024, h = 512 }) {
  const [c, g] = cv(w, h);
  const grd = g.createLinearGradient(0, h, 0, 0); grd.addColorStop(0, rgb(base, -12)); grd.addColorStop(1, rgb(base, 10)); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  if (scale) { for (let y = 0; y < h; y += 10) for (let x = (y / 10 % 2) * 7; x < w; x += 14) { g.strokeStyle = rgb(base, -30); g.lineWidth = 1; g.beginPath(); g.arc(x, y, 6, 0, Math.PI); g.stroke(); } }
  const bw = w / ribs;
  for (let i = 0; i < ribs; i++) {
    const x = i * bw;
    if (stripe && i % 2 === 0) { g.fillStyle = rgb(stripe); g.fillRect(x + bw * 0.35, h * 0.08, bw * 0.3, h * 0.92); }
    g.fillStyle = rgb(rib); g.fillRect(x - 1.5, 0, 3, h);
  }
  if (cap) { g.fillStyle = rgb(cap); g.fillRect(0, 0, w, h * 0.12); }
  g.fillStyle = rgb(base, -35); g.fillRect(0, h - 10, w, 10);
  const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// هلال + كرات (فِنيال)
export function finial(y, scale = 1, mat) {
  const parts = [];
  parts.push(new THREE.CylinderGeometry(0.05 * scale, 0.09 * scale, 1.6 * scale, 8).translate(0, y + 0.8 * scale, 0));
  for (const [yy, r] of [[0.35, 0.28], [0.85, 0.2], [1.25, 0.14]]) parts.push(new THREE.SphereGeometry(r * scale, 14, 10).translate(0, y + yy * scale, 0));
  parts.push(new THREE.TorusGeometry(0.34 * scale, 0.07 * scale, 8, 22, Math.PI * 1.45).rotateZ(Math.PI * 0.78).translate(0, y + 1.95 * scale, 0));
  return new THREE.Mesh(mergeGeometries(parts.map((p) => p.toNonIndexed())), mat);
}

// يدمج هندسات بنفس المادة
export function mergeAdd(group, geos, mat) { if (!geos.length) return null; const m = new THREE.Mesh(mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g))), mat); group.add(m); return m; }
