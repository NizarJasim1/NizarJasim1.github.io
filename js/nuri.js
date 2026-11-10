// =============================================================
//  مصلى جامع النوري الكبير — بعد إعادة الإعمار (افتُتح 1/9/2025)
//  المسقط: مضلّع OSM للمصلى (53.5×25م، محوره مايل −5.8°)، والمنارة بالزاوية الشمالية الغربية للصحن
//  الشكل من الصور (شباط 2025، تشرين2 2025، أيلول 2026):
//   • حجر حلان كريمي، سطح مستوي بكورنيش أبيض، شبابيك مقوّسة بمشبكات غامقة بين دعامات جدارية
//   • الواجهة الشمالية على الصحن: رواق 11 قوس مدبّب موصلي على أعمدة مرمر، وكتلة شرقية أعلى بشباك
//   • قبة خضراء مضلّعة بخطوط ذهبية فوق رقبة بيضاء، وهلال
//   • مئذنتين حجر بلون رملي بشرفة ودرابزين أبيض وقبيبة
//   • الصحن: غربه مبلّط مرمر أبيض، شرقه حديقة (ثيل وشجيرات)، ورواق أقواس على الجهة الغربية للمنارة
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { mergeGeometries } from "../vendor/addons/utils/BufferGeometryUtils.js?v=69";

export const NURI = {
  L: 53.5, D: 25, H: 9.2, porch: 4.7, arches: 11, eastBlock: 8.5, eastH: 10.8,
  // القبة بمنتصف المصلى (صورة Google الحديثة: قاعدتها المثمنة بنص السطح)
  dome: { x: 0, z: 1.0, r: 5.0, drumH: 2.4, h: 6.6, ribs: 20 },
  // أربع منائر (صور الجزيرة أيلول 2025 من الزاوية الجنوبية الشرقية + صورة الصحن 2026):
  //  الكبيرة فوق كتلة البوابة الشرقية، المتوسطة بالزاوية الشمالية الشرقية، صغيرة نحيفة خلفهن، وصغيرة بالطرف الغربي
  minarets: [ { x: 23.5, z: 6.5, h: 33, r: 1.45, y0: 10.8 }, { x: 24.5, z: -9.5, h: 26, r: 1.2, y0: 10.8 }, { x: 13.5, z: -10.5, h: 19.5, r: 0.8 }, { x: -24.5, z: 8.5, h: 20, r: 1.0 } ],
};
const rnd = (a, b) => a + Math.random() * (b - a);
function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function T(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }

// حجر حلان: مداميك 0.5م بكتل بأطوال مختلفة، لون كريمي-رملي
function ashlar() {
  const W = 512, [c, g] = cv(W, W), [hc, h] = cv(W, W);
  g.fillStyle = "#cdbb98"; g.fillRect(0, 0, W, W); h.fillStyle = "#555"; h.fillRect(0, 0, W, W);
  const ch = 64;                                                // 0.5م لكل 64px (الصورة = 4م)
  for (let y = 0; y < W; y += ch) { let x = -rnd(0, 80); while (x < W) { const w = rnd(90, 190); const v = rnd(-10, 10); g.fillStyle = `rgb(${226 + v},${213 + v},${186 + v})`; g.fillRect(x + 2, y + 2, w - 3, ch - 3); h.fillStyle = "#aaa"; h.fillRect(x + 2, y + 2, w - 3, ch - 3); x += w; } }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "120,100,70" : "255,250,235"},0.08)`; g.fillRect(rnd(0, W), rnd(0, W), 2, 2); }
  return { map: T(c), bump: T(hc, false) };
}
// قوس موصلي مدبّب (ogee خفيف) — مسار بنقاط
function archPts(cx, w, spring, peak, n = 14) {
  const pts = [], r = w / 2;
  for (let i = 0; i <= n; i++) { const t = i / n, x = cx - r + t * w; const u = Math.abs(t - 0.5) * 2; const y = spring + (peak - spring) * Math.pow(1 - u, 0.55) * (1 - 0.08 * Math.sin(Math.PI * u)); pts.push([x, y]); }
  return pts;
}
// جدار بفتحات أقواس (مسقط أمامي) — يرجع ExtrudeGeometry
function arcadeWall(len, h, thick, n, w, spring, peak, x0 = -len / 2, gapL = 0) {
  const s = new THREE.Shape([new THREE.Vector2(x0, 0), new THREE.Vector2(x0 + len, 0), new THREE.Vector2(x0 + len, h), new THREE.Vector2(x0, h)]);
  const pitch = (len - gapL) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + pitch * (i + 0.5);
    const p = [new THREE.Vector2(cx - w / 2, 0), ...archPts(cx, w, spring, peak).map(([x, y]) => new THREE.Vector2(x, y)), new THREE.Vector2(cx + w / 2, 0)];
    s.holes.push(new THREE.Path(p.reverse()));
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -thick / 2);
  return { g, pitch };
}

function ribbedDome(R, H, ribs) {
  const pts = [];
  for (let i = 0; i <= 32; i++) { const f = i / 32, ph = (f * Math.PI) / 2; pts.push(new THREE.Vector2(Math.max(0.001, R * Math.cos(ph) * (1 - 0.12 * Math.pow(f, 2.5))), H * Math.sin(ph) + 0.6 * Math.pow(f, 8))); }
  const g = new THREE.LatheGeometry(pts, ribs * 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = 1 + 0.035 * Math.pow(Math.abs(Math.cos((a * ribs) / 2)), 0.6) * (1 - y / (H + 0.6)); p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals(); return g;
}

function minaret(grp, m, stone, white, brass) {
  const { x, z, h, r } = m, y0 = m.y0 ?? NURI.H;
  const shaftH = h - y0 - 5.2;
  const parts = [];
  const add = (geo, mat) => { const mesh = new THREE.Mesh(geo, mat); grp.add(mesh); return mesh; };
  add(new THREE.CylinderGeometry(r * 1.25, r * 1.25, 1.2, 12).translate(x, y0 + 0.6, z), stone);                // قاعدة مثمنة على السطح
  add(new THREE.CylinderGeometry(r * 0.94, r, shaftH, 28).translate(x, y0 + 1.2 + shaftH / 2, z), stone);
  for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(r * (1.1 + k * 0.14), r * (1.0 + k * 0.14), 0.22, 28).translate(x, y0 + 1.2 + shaftH - 0.5 + k * 0.22, z), stone); // مقرنص مبسّط
  const by = y0 + 1.2 + shaftH + 0.2;
  add(new THREE.CylinderGeometry(r * 1.6, r * 1.55, 0.25, 32).translate(x, by, z), white);
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; parts.push(new THREE.BoxGeometry(0.05, 1.0, 0.05).translate(x + Math.cos(a) * r * 1.55, by + 0.55, z + Math.sin(a) * r * 1.55).toNonIndexed()); }
  const tr = new THREE.TorusGeometry(r * 1.55, 0.04, 6, 40); tr.rotateX(Math.PI / 2); tr.translate(x, by + 1.05, z); parts.push(tr.toNonIndexed());
  add(mergeGeometries(parts), white);
  add(new THREE.CylinderGeometry(r * 0.78, r * 0.8, 2.6, 24).translate(x, by + 1.4, z), stone);
  const pts = []; for (let i = 0; i <= 16; i++) { const f = i / 16, ph = (f * Math.PI) / 2; pts.push(new THREE.Vector2(Math.max(0.001, r * 0.86 * Math.cos(ph)), r * 1.15 * Math.sin(ph) + 0.25 * Math.pow(f, 5))); }
  add(new THREE.LatheGeometry(pts, 24).translate(x, by + 2.7, z), stone);
  add(new THREE.CylinderGeometry(0.03, 0.05, 1.3, 6).translate(x, by + 2.7 + r * 1.15 + 0.8, z), brass);
  add(new THREE.TorusGeometry(0.2, 0.04, 6, 16, Math.PI * 1.45).rotateZ(Math.PI * 0.78).translate(x, by + 2.7 + r * 1.15 + 1.55, z), brass);
  return [x, by + 1.1, z];
}

export function buildNuriHall() {
  const N = NURI, grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const as = ashlar();
  const stone = new THREE.MeshStandardMaterial({ map: as.map, bumpMap: as.bump, bumpScale: 0.6, roughness: 0.9 });
  as.map.repeat.set(1 / 4, 1 / 4); as.bump.repeat.set(1 / 4, 1 / 4);       // UV بالمتر → صورة كل 4م
  const white = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd7a94b, roughness: 0.3, metalness: 0.9, emissive: 0x3a2508, emissiveIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.8 });
  const L = N.L, D = N.D, H = N.H;
  const box = (w, h, d, x, y, z, mat = stone) => { const g = new THREE.BoxGeometry(w, h, d); const u = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < u.count; i++) { const ax = Math.abs(n.getX(i)) > 0.5 ? 2 : 0; const a = ax ? p.getZ(i) : p.getX(i); u.setXY(i, a + x, p.getY(i) + y); }
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); inner.add(m); return m; };
  // ---- الكتلة الرئيسية (خلف الرواق) ----
  const hallD = D - N.porch, mainL = L - N.eastBlock;
  box(mainL, H, hallD, -N.eastBlock / 2, H / 2, N.porch / 2);
  // الكتلة الشرقية الأعلى
  box(N.eastBlock, N.eastH, D, L / 2 - N.eastBlock / 2, N.eastH / 2, 0);
  // كورنيش أبيض
  box(mainL + 0.3, 0.45, hallD + 0.3, -N.eastBlock / 2, H + 0.1, N.porch / 2, white);
  box(N.eastBlock + 0.3, 0.45, D + 0.3, L / 2 - N.eastBlock / 2, N.eastH + 0.1, 0, white);
  // ---- الرواق الشمالي: سقف + جدار أقواس + أعمدة ----
  const porchL = mainL;
  box(porchL, 0.6, N.porch, -N.eastBlock / 2, H - 0.3, -D / 2 + N.porch / 2);
  box(porchL + 0.3, 0.45, N.porch + 0.3, -N.eastBlock / 2, H + 0.1, -D / 2 + N.porch / 2, white);
  const { g: aw, pitch } = arcadeWall(porchL, H - 0.6, 0.7, N.arches, 3.5, 4.4, 6.6, -L / 2);
  const awm = new THREE.Mesh(aw, stone); awm.position.set(0, 0, -D / 2 + 0.35); inner.add(awm);
  const marble = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.35 });
  const cols = [];
  for (let i = 0; i <= N.arches; i++) { const x = -L / 2 + pitch * i; for (const dz of [0, 0.0]) { const c = new THREE.CylinderGeometry(0.28, 0.32, 4.4, 14); c.translate(x, 2.2, -D / 2 + 0.35 + dz); cols.push(c.toNonIndexed()); } }
  inner.add(new THREE.Mesh(mergeGeometries(cols), marble));
  // ظلمة داخل الرواق + أبواب المصلى الثلاثة
  const back = new THREE.Mesh(new THREE.PlaneGeometry(porchL, H - 0.6), new THREE.MeshStandardMaterial({ color: 0x6f6553, roughness: 0.9 })); back.position.set(-N.eastBlock / 2, (H - 0.6) / 2, -D / 2 + N.porch - 0.01); back.rotation.y = Math.PI; inner.add(back);
  for (const x of [-N.eastBlock / 2 - 9, -N.eastBlock / 2, -N.eastBlock / 2 + 9]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), dark); d.position.set(x, 1.8, -D / 2 + N.porch - 0.03); d.rotation.y = Math.PI; inner.add(d); }
  // ---- شبابيك مقوّسة بمشبكات على الجدران الخارجية + دعامات جدارية ----
  const [wc, wg] = cv(64, 128); wg.fillStyle = "#151311"; wg.fillRect(0, 0, 64, 128); wg.strokeStyle = "#5a5246"; wg.lineWidth = 3;
  for (let y = 8; y < 128; y += 10) { wg.beginPath(); wg.moveTo(0, y); wg.lineTo(64, y); wg.stroke(); } for (let x = 6; x < 64; x += 10) { wg.beginPath(); wg.moveTo(x, 0); wg.lineTo(x, 128); wg.stroke(); }
  const winT = T(wc); winT.wrapS = winT.wrapT = THREE.ClampToEdgeWrapping;
  const winM = new THREE.MeshStandardMaterial({ map: winT, roughness: 0.7, emissive: 0xffb060, emissiveIntensity: 0.0 });
  const winShape = () => { const s = new THREE.Shape(); s.moveTo(-0.55, 0); s.lineTo(0.55, 0); s.lineTo(0.55, 1.7); s.absarc(0, 1.7, 0.55, 0, Math.PI, false); s.lineTo(-0.55, 0); return new THREE.ShapeGeometry(s, 8); };
  const wins = [], piers = [];
  const addWin = (x, y, z, ry) => { const g = winShape(); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + 0.55) / 1.1, p.getY(i) / 2.25); g.rotateY(ry); g.translate(x, y, z); wins.push(g); };
  for (let x = -L / 2 + 3; x < L / 2 - 2; x += 4.8) { addWin(x, 3.2, D / 2 + 0.03, 0); piers.push(new THREE.BoxGeometry(0.6, H, 0.3).translate(x + 2.4, H / 2, D / 2 + 0.15).toNonIndexed()); }
  for (let z = -D / 2 + 3; z < D / 2 - 2; z += 4.6) { addWin(-L / 2 - 0.03, 3.2, z, -Math.PI / 2); addWin(L / 2 + 0.03, 3.2, z, Math.PI / 2); }
  addWin(L / 2 - N.eastBlock / 2, 3.6, -D / 2 - 0.03, Math.PI);
  inner.add(new THREE.Mesh(mergeGeometries(wins), winM));
  inner.add(new THREE.Mesh(mergeGeometries(piers), stone));
  // ---- القبة الخضراء ----
  const d = N.dome, yb = H + 0.35;
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(d.r + 0.5, d.r + 0.7, 1.0, 8).translate(d.x, yb + 0.5, d.z), white));
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(d.r + 0.15, d.r + 0.25, d.drumH, 40).translate(d.x, yb + 1 + d.drumH / 2, d.z), white));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const w = winShape(); w.scale(0.7, 0.55, 1); w.rotateY(-a + Math.PI / 2); w.translate(d.x + Math.cos(a) * (d.r + 0.27), yb + 1.35, d.z + Math.sin(a) * (d.r + 0.27)); inner.add(new THREE.Mesh(w, winM)); }
  const green = new THREE.MeshStandardMaterial({ color: 0x2f6f52, roughness: 0.45, metalness: 0.3 });   // أخضر نحاسي غامق (صور 2025-2026)
  const dy0 = yb + 1 + d.drumH;
  inner.add(new THREE.Mesh(ribbedDome(d.r, d.h, d.ribs).translate(d.x, dy0, d.z), green));
  const ribs = [];
  for (let i = 0; i < d.ribs; i++) { const a = (i / d.ribs) * Math.PI * 2; const pts = []; for (let k = 0; k <= 20; k++) { const f = k / 20, ph = (f * Math.PI) / 2; const rr = d.r * Math.cos(ph) * (1 - 0.12 * Math.pow(f, 2.5)) * 1.035 + 0.02; pts.push(new THREE.Vector3(d.x + Math.cos(a) * rr, dy0 + d.h * Math.sin(ph) + 0.6 * Math.pow(f, 8), d.z + Math.sin(a) * rr)); }
    ribs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.05, 4).toNonIndexed()); }
  inner.add(new THREE.Mesh(mergeGeometries(ribs), brass));
  const top = dy0 + d.h + 0.6;
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.2, 8).translate(d.x, top + 1.1, d.z), brass));
  for (const [yy, r] of [[0.4, 0.28], [0.95, 0.2]]) inner.add(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10).translate(d.x, top + yy, d.z), brass));
  inner.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 20, Math.PI * 1.45).rotateZ(Math.PI * 0.78).translate(d.x, top + 2.5, d.z), brass));
  // ---- المئذنتان ----
  // بدن المنائر: طابوق أصفر بنقشة معيّنات (هزارباف) مثل الصور
  const [mc, mg] = cv(128, 256); mg.fillStyle = "#b89c6c"; mg.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 6) for (let x = -(y / 6 % 2) * 10; x < 128; x += 20) { const v = rnd(-8, 8); mg.fillStyle = `rgb(${212 + v},${190 + v},${142 + v})`; mg.fillRect(x + 1, y + 1, 18, 4); }
  mg.strokeStyle = "rgba(120,92,58,0.75)"; mg.lineWidth = 4;
  for (let k = -256; k < 384; k += 32) { mg.beginPath(); mg.moveTo(k, 0); mg.lineTo(k + 128, 256); mg.stroke(); mg.beginPath(); mg.moveTo(k + 128, 0); mg.lineTo(k, 256); mg.stroke(); }
  const mT = T(mc); mT.repeat.set(3, 6);
  const mStone = new THREE.MeshStandardMaterial({ map: mT, roughness: 0.85 });
  // المنارة الكبيرة تطلع من برج مربع فوق السطح (صورة الواجهة الجنوبية الشرقية)
  { const m = N.minarets[0]; box(m.r * 2.6, 3.2, m.r * 2.6, m.x, (m.y0 ?? N.H) + 1.6, m.z); box(m.r * 2.8, 0.35, m.r * 2.8, m.x, (m.y0 ?? N.H) + 3.3, m.z, white); m.y0 = (m.y0 ?? N.H) + 3.2; }
  const balconies = N.minarets.map((m) => minaret(inner, m, mStone, white, brass));
  inner.scale.setScalar(1 / 8);
  const S = 1 / 8, V3 = (x, y, z) => new THREE.Vector3(x * S, y * S, z * S);
  const perches = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; perches.push({ o: grp, p: V3(d.x + Math.cos(a) * d.r * 0.9, dy0 + 0.8, d.z + Math.sin(a) * d.r * 0.9), yaw: -a }); }
  for (let i = 0; i < 10; i++) perches.push({ o: grp, p: V3(-L / 2 + rnd(2, L - 2), H + 0.35, -D / 2 - 0.1), yaw: rnd(0, 6.28) });
  for (const [x, y, z] of balconies) perches.push({ o: grp, p: V3(x + 1.4, y, z), yaw: 0 });
  grp.userData = { perches, top: V3(d.x, top + 2.5, d.z), focus: V3(0, 6, 0), size: [L * S, D * S] };
  return grp;
}

// الصحن: بلاط مرمر أبيض غرباً، وحديقة شرقاً، ورواق الأقواس الغربي حتى المنارة
// يُبنى بإحداثيات المصلى المحلية (x شرق المحور، z جنوب)، zN = حد الصحن الشمالي
export function buildNuriCourt({ x0, x1, zN }) {
  const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const zS = -NURI.D / 2, W = x1 - x0, Dz = zS - zN;
  const tile = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.4 });
  const lawn = new THREE.MeshStandardMaterial({ color: 0x4f7a34, roughness: 0.95 });
  const mid = x0 + W * 0.45;
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(mid - x0, Dz), tile); pave.rotation.x = -Math.PI / 2; pave.position.set((x0 + mid) / 2, 0.05, (zN + zS) / 2); inner.add(pave);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(x1 - mid, Dz), lawn); gr.rotation.x = -Math.PI / 2; gr.position.set((mid + x1) / 2, 0.05, (zN + zS) / 2); inner.add(gr);
  // ممرات بيضاء بحافة طابوق أحمر داخل الحديقة
  const path = new THREE.MeshStandardMaterial({ color: 0xdedad2, roughness: 0.5 }), edge = new THREE.MeshStandardMaterial({ color: 0x8a3d2a, roughness: 0.8 });
  for (const [w, d, x, z] of [[x1 - mid, 2.4, (mid + x1) / 2, zN + Dz * 0.5], [2.4, Dz, mid + (x1 - mid) * 0.5, (zN + zS) / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), path); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.07, z); inner.add(p);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, d + 0.5), edge); e.rotation.x = -Math.PI / 2; e.position.set(x, 0.06, z); inner.add(e);
  }
  // شجيرات وأشجار صغيرة
  const bush = new THREE.IcosahedronGeometry(0.9, 1), bm = new THREE.MeshStandardMaterial({ color: 0x3d6328, roughness: 0.95, flatShading: true });
  const n = 46, inst = new THREE.InstancedMesh(bush, bm, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < n; i++) { const x = rnd(mid + 2, x1 - 2), z = rnd(zN + 2, zS - 2), sc = rnd(0.6, 1.5); m4.compose(new THREE.Vector3(x, sc * 0.8, z), q, s.set(sc, sc * (i % 4 ? 1 : 2.4), sc)); inst.setMatrixAt(i, m4); }
  inner.add(inst);
  // رواق الأقواس الغربي (أقواس نصف دائرية تقريباً على دعامات مربعة)
  const as = ashlar(); as.map.repeat.set(1 / 4, 1 / 4);
  const stone = new THREE.MeshStandardMaterial({ map: as.map, roughness: 0.9 });
  const len = Dz - 6, n2 = 14, pitch = len / n2;
  const s2 = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, 6.2), new THREE.Vector2(0, 6.2)]);
  for (let i = 0; i < n2; i++) { const cx = pitch * (i + 0.5), w = pitch * 0.62; const h = new THREE.Path(); h.moveTo(cx - w / 2, 0); h.lineTo(cx - w / 2, 3.4); h.absarc(cx, 3.4, w / 2, Math.PI, 0, true); h.lineTo(cx + w / 2, 0); s2.holes.push(h); }
  const ag = new THREE.ExtrudeGeometry(s2, { depth: 0.8, bevelEnabled: false, curveSegments: 6 });
  const am = new THREE.Mesh(ag, stone); am.rotation.y = -Math.PI / 2; am.position.set(x0 + 4.2, 0, zN + 3); inner.add(am);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, len), stone); roof.position.set(x0 + 2.1, 6.2, zN + 3 + len / 2); inner.add(roof);
  inner.scale.setScalar(1 / 8);
  return grp;
}
