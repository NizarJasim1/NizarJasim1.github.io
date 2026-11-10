// =============================================================
//  منصة الاحتفالات (ساحة الاحتفالات) — الموصل، طريق نينوى/المنصة قرب بوابة أدد
//  المقاسات من صورة القمر الصناعي (Google، مقاسة بالمتر من نقطة OSM 4774573644 "منصة الاحتفالات"):
//   • المدرّجات شمال الشارع: شبه منحرف ~180م على امتداد الشارع × ~65م عمق، درجات كل ~2.4م، سور خلفي
//   • محور بالنص: نافورة علوية مفصّصة (~20م) + شلّال/قناة ماء نازلة على الدرج + كشك بالنص + حوض سفلي
//   • أحواض زرع بنقشة رقم 7 (شيفرون) مع شجر، وأعمدة إنارة
//   • جنوب الشارع: المنصة الرسمية (مقصورة الضيوف) بسقف ومدرج كراسي وجدار حجر بشرفات آشورية (صور مهرجان الربيع 2026)
//  الإحداثيات: متر، x شرق، z جنوب، الأصل = نقطة OSM
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { ashlarTex, boxM, extrudeXZ, flatXZ, mergeAdd, cv, tex, srnd, mergeGeometries } from "./arch.js?v=69";

// أركان المدرّجات (x شرق، y شمال) من الصورة
const ST = { fl: [-50, -50], bl: [-51, -20], bm: [-10, 40], br: [98, 78], rb: [120, 32] };
const ROAD = 64.4 * Math.PI / 180;                  // اتجاه الشارع (bearing)
const U = [Math.sin(ROAD), Math.cos(ROAD)];          // على امتداد الشارع (شرق-شمال)
const N = [-Math.cos(ROAD), Math.sin(ROAD)];         // عمودي نحو المدرّجات (شمال-غرب)
const AX = { top: [16.2, 36.9], mid: [27.2, 16.9], bot: [35.2, 1.9] };

export function buildPlatform() {
  const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const conc = ashlarTex([170, 166, 158], { size: 6, course: 2.4, jitter: 5 });
  const concrete = new THREE.MeshStandardMaterial({ map: conc.map, roughness: 0.95 });
  const lime = ashlarTex([206, 186, 140], { size: 4, course: 0.5 });
  const limestone = new THREE.MeshStandardMaterial({ map: lime.map, bumpMap: lime.bump, bumpScale: 0.5, roughness: 0.9 });
  const wallM = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.9 });
  const green = new THREE.MeshStandardMaterial({ color: 0x2f4a22, roughness: 1 });
  const waterM = new THREE.MeshStandardMaterial({ color: 0x5aa8c8, roughness: 0.15, metalness: 0.2, emissive: 0x0b2a38, emissiveIntensity: 0.6 });
  const tileB = new THREE.MeshStandardMaterial({ color: 0x2e6f9a, roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x5b5d60, roughness: 0.5, metalness: 0.7 });
  const xz = ([x, y]) => [x, -y];
  const geo = { conc: [], conc2: [], lime: [], wall: [], green: [], water: [], tile: [], white: [], steel: [] };

  // ---- المدرّجات: شرائح متتالية موازية للشارع، كل وحدة 2.4م عمق و0.22م ارتفاع ----
  const ring = [ST.fl, ST.bl, ST.bm, ST.br, ST.rb];
  const front = (p) => (p[0] - ST.fl[0]) * N[0] + (p[1] - ST.fl[1]) * N[1];     // البعد عن خط الواجهة
  const depth = Math.max(...ring.map(front)), step = 2.4, rise = 0.22, nSteps = Math.ceil(depth / step);
  // قص المضلع بين خطين موازيين للشارع
  const clipBand = (d0, d1) => {
    let pts = ring.map((p) => [...p]);
    for (const [lim, keepAbove] of [[d0, true], [d1, false]]) {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], fa = front(a) - lim, fb = front(b) - lim;
        const ina = keepAbove ? fa >= 0 : fa <= 0, inb = keepAbove ? fb >= 0 : fb <= 0;
        if (inb) { if (!ina) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } out.push(b); }
        else if (ina) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      pts = out; if (pts.length < 3) return null;
    }
    return pts;
  };
  for (let i = 0; i < nSteps; i++) {
    const band = clipBand(i * step, (i + 1) * step); if (!band) continue;
    (i % 2 ? geo.conc : geo.conc2).push(extrudeXZ(band.map(xz), 0, 0.3 + i * rise));
  }
  const backH = 0.3 + nSteps * rise;
  // السور الخلفي والجانبي (الخط الغامق بالصورة)
  const wallAlong = (a, b, h, t = 0.6, y0 = 0) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = boxM(L, h, t); g.rotateY(Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, y0 + h / 2, -(a[1] + b[1]) / 2); return g; };
  geo.wall.push(wallAlong(ST.fl, ST.bl, backH * 0.5 + 1.5), wallAlong(ST.bl, ST.bm, backH + 1.6), wallAlong(ST.bm, ST.br, backH + 1.8), wallAlong(ST.br, ST.rb, backH + 1.6));
  // درابزين حديد على الواجهة (صور 13_05/13_07)
  { const a = ST.fl, b = ST.rb, L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s <= L; s += 2.5) { const p = [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L]; geo.steel.push(boxM(0.08, 1.1, 0.08, p[0] - N[0] * 0.4, 0.85, -(p[1] - N[1] * 0.4))); }
    for (const hh of [0.75, 1.35]) { const g = wallAlong([a[0] - N[0] * 0.4, a[1] - N[1] * 0.4], [b[0] - N[0] * 0.4, b[1] - N[1] * 0.4], 0.06, 0.06, hh); geo.steel.push(g); } }

  // ---- المحور: نافورة علوية مفصّصة + شلّال + كشك + حوض سفلي ----
  const yAt = (p) => 0.3 + Math.min(nSteps, Math.max(0, front(p) / step)) * rise;
  const scallop = (c, R, lobes, y, h, mat, inset = 0) => { const pts = []; for (let i = 0; i < lobes * 8; i++) { const a = (i / (lobes * 8)) * Math.PI * 2, r = R * (0.86 + 0.14 * Math.abs(Math.cos(a * lobes / 2))) - inset; pts.push([c[0] + Math.cos(a) * r, -(c[1] + Math.sin(a) * r)]); } geo[mat].push(extrudeXZ(pts, y, y + h)); };
  { const yt = yAt(AX.top); scallop(AX.top, 10.5, 8, yt - 0.2, 0.9, "white"); scallop(AX.top, 10.5, 8, yt + 0.55, 0.12, "water", 1.0);
    geo.white.push(new THREE.CylinderGeometry(1.2, 1.6, 2.2, 16).translate(AX.top[0], yt + 1.6, -AX.top[1])); }
  { const yb = yAt(AX.bot); scallop(AX.bot, 5.2, 6, yb - 0.2, 0.7, "white"); scallop(AX.bot, 5.2, 6, yb + 0.35, 0.1, "water", 0.8); }
  // القناة النازلة (شرائح متدرجة مع الدرج)
  { const a = AX.top, b = AX.bot, L = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = 24;
    for (let i = 0; i < n; i++) { const t0 = 9 + (i / n) * (L - 13), t1 = 9 + ((i + 1) / n) * (L - 13); const p0 = [a[0] + dir[0] * t0, a[1] + dir[1] * t0], p1 = [a[0] + dir[0] * t1, a[1] + dir[1] * t1], pm = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      const y = yAt(pm), len = t1 - t0, ang = Math.atan2(dir[1], dir[0]);
      const side = (o, w, h, mat, yy) => { const g = boxM(len + 0.05, h, w); g.rotateY(ang); g.translate(pm[0] - dir[1] * o, yy, -(pm[1] + dir[0] * o)); geo[mat].push(g); };
      side(0, 3.6, 0.5, "tile", y + 0.05); side(0, 2.8, 0.08, "water", y + 0.33); side(2.0, 0.4, 0.8, "white", y + 0.3); side(-2.0, 0.4, 0.8, "white", y + 0.3); } }
  // الكشك الوسطي (سقف أخضر)
  { const y = yAt(AX.mid), [x, yy] = AX.mid; geo.lime.push(boxM(4.6, 3.2, 4.6, x, y + 1.6, -yy)); geo.green.push(boxM(5.6, 0.4, 5.6, x, y + 3.4, -yy)); }

  // ---- أحواض الزرع بنقشة شيفرون (3 على كل جانب) + شجر ----
  const axisD = [AX.bot[0] - AX.top[0], AX.bot[1] - AX.top[1]], aL = Math.hypot(...axisD), aDir = [axisD[0] / aL, axisD[1] / aL];
  const trees = [];
  for (let row = 0; row < 3; row++) {
    const apex = [AX.bot[0] - aDir[0] * (10 + row * 14), AX.bot[1] - aDir[1] * (10 + row * 14)];
    for (const sgn of [-1, 1]) {
      const arm = [U[0] * sgn * 0.84 - aDir[0] * 0.55, U[1] * sgn * 0.84 - aDir[1] * 0.55], al = Math.hypot(...arm), ad = [arm[0] / al, arm[1] / al];
      for (let s = 4; s < 34 + row * 8; s += 3) {
        const p = [apex[0] + ad[0] * s, apex[1] + ad[1] * s]; if (front(p) < 1 || front(p) > depth - 2) continue;
        const y = yAt(p); const g = boxM(3.2, 0.7, 1.4); g.rotateY(Math.atan2(ad[1], ad[0])); g.translate(p[0], y + 0.35, -p[1]); geo.lime.push(g);
        const q = boxM(2.9, 0.12, 1.1); q.rotateY(Math.atan2(ad[1], ad[0])); q.translate(p[0], y + 0.72, -p[1]); geo.green.push(q);
        if (s % 9 === 1) trees.push([p[0], y + 0.7, -p[1]]);
      }
    }
  }
  // أعمدة إنارة على طول السور الخلفي والواجهة
  const lamps = [];
  for (const [a, b, off] of [[ST.bm, ST.br, 3], [ST.fl, ST.rb, -1.5]]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 6; s < L; s += 18) { const p = [a[0] + (b[0] - a[0]) * s / L + N[0] * off, a[1] + (b[1] - a[1]) * s / L + N[1] * off], y = yAt(p); geo.steel.push(new THREE.CylinderGeometry(0.09, 0.13, 7, 6).translate(p[0], y + 3.5, -p[1])); geo.white.push(new THREE.BoxGeometry(0.9, 0.18, 0.4).translate(p[0], y + 7, -p[1])); lamps.push([p[0], y + 6.9, -p[1]]); } }

  // ---- المنصة الرسمية جنوب الشارع: مدرج كراسي + جدار حجر بشرفات آشورية + سقف ----
  const VIP = { c: [66.3, -58.3], len: 30, dep: 14 };
  {
    const g = new THREE.Group(); g.position.set(VIP.c[0], 0, -VIP.c[1]); g.rotation.y = Math.PI / 2 - ROAD;   // الواجهة (−z المحلي) نحو الشارع (شمال-غرب)
    const vg = { lime: [], conc: [], white: [], steel: [], wall: [] };
    // مدرج 6 صفوف (z+ = للخلف بعيد عن الشارع)
    for (let i = 0; i < 6; i++) vg.conc.push(boxM(VIP.len, 0.6 + i * 0.45, 1.6, 0, (0.6 + i * 0.45) / 2, -VIP.dep / 2 + 3 + i * 1.6));
    vg.lime.push(boxM(VIP.len + 2, 1.1, 1.0, 0, 0.55, -VIP.dep / 2 + 1.8));                       // دكة أمامية
    // جدار الخلف + شرفات (مثلثات مدرّجة) وأبراج جانبية
    vg.lime.push(boxM(VIP.len + 2, 7.5, 1.2, 0, 3.75, VIP.dep / 2));
    for (let x = -VIP.len / 2 - 0.5; x <= VIP.len / 2 + 0.5; x += 1.6) { vg.lime.push(boxM(0.9, 0.6, 1.2, x, 7.8, VIP.dep / 2), boxM(0.5, 0.5, 1.2, x, 8.35, VIP.dep / 2)); }
    for (const sx of [-1, 1]) { vg.lime.push(boxM(3, 9.5, 3, sx * (VIP.len / 2 + 1.5), 4.75, VIP.dep / 2 - 0.5)); for (let k = -1; k <= 1; k++) vg.lime.push(boxM(0.7, 0.7, 3, sx * (VIP.len / 2 + 1.5) + k * 1.0, 9.85, VIP.dep / 2 - 0.5)); }
    // سقف مظلة على أعمدة حديد
    vg.steel.push(boxM(VIP.len + 4, 0.35, VIP.dep + 1, 0, 8.6, 0.3));
    for (const x of [-VIP.len / 2, -VIP.len / 6, VIP.len / 6, VIP.len / 2]) vg.steel.push(new THREE.CylinderGeometry(0.18, 0.18, 8.4, 8).translate(x, 4.2, -VIP.dep / 2 + 0.6));
    // كراسي بيضاء
    for (let i = 0; i < 6; i++) for (let x = -VIP.len / 2 + 1; x < VIP.len / 2; x += 0.9) vg.white.push(boxM(0.5, 0.9, 0.5, x, 0.6 + i * 0.45 + 0.45, -VIP.dep / 2 + 3 + i * 1.6));
    mergeAdd(g, vg.lime, limestone); mergeAdd(g, vg.conc, concrete); mergeAdd(g, vg.white, white); mergeAdd(g, vg.steel, steel);
    inner.add(g);
  }

  mergeAdd(inner, geo.conc, concrete); mergeAdd(inner, geo.conc2, new THREE.MeshStandardMaterial({ map: conc.map, color: 0xb9bcc2, roughness: 0.95 })); mergeAdd(inner, geo.lime, limestone); mergeAdd(inner, geo.wall, wallM); mergeAdd(inner, geo.green, green);
  mergeAdd(inner, geo.water, waterM); mergeAdd(inner, geo.tile, tileB); mergeAdd(inner, geo.white, white); mergeAdd(inner, geo.steel, steel);
  // شجر
  if (trees.length) { const tg = new THREE.IcosahedronGeometry(1.6, 1); tg.translate(0, 3.2, 0); const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x35522a, roughness: 1, flatShading: true }), trees.length); const m = new THREE.Matrix4(); trees.forEach(([x, y, z], i) => { const s = srnd(0.8, 1.2); m.makeScale(s, s * srnd(0.9, 1.3), s); m.setPosition(x, y, z); tm.setMatrixAt(i, m); }); inner.add(tm);
    const trunk = new THREE.CylinderGeometry(0.12, 0.18, 2.4, 6); trunk.translate(0, 1.2, 0); const tt = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x4a3a2a }), trees.length); trees.forEach(([x, y, z], i) => { tt.setMatrixAt(i, new THREE.Matrix4().setPosition(x, y, z)); }); inner.add(tt); }

  inner.scale.setScalar(1 / 8);
  const S = 1 / 8, V3 = (x, y, z) => new THREE.Vector3(x * S, y * S, z * S);
  const perches = [];
  for (const [x, y, z] of lamps) perches.push({ o: grp, p: V3(x, y + 0.3, z), yaw: srnd(0, 6.28) });
  for (let i = 0; i < 8; i++) perches.push({ o: grp, p: V3(VIP.c[0] + srnd(-14, 14), 8.9, -VIP.c[1] + srnd(-5, 5)), yaw: srnd(0, 6.28) });
  // نقطة التركيز: نص المدرّجات (فوق الشلال)
  const fc = [(AX.top[0] + AX.bot[0]) / 2, (AX.top[1] + AX.bot[1]) / 2];
  grp.userData = { perches, top: V3(AX.top[0], backH + 6, -AX.top[1]), focus: V3(35, 4, -14), lampPts: lamps.flatMap(([x, y, z]) => [x * S, y * S, z * S]), height: (backH + 2) * S };
  return grp;
}
