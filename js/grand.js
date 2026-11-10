// =============================================================
//  جامع الموصل الكبير (جامع صدام الكبير سابقاً) — حي الزراعي، قيد الإنجاز
//  المسقط: أجزاء OSM ثلاثية الأبعاد (way 34032971 والأجزاء 2478129012…2478182470):
//    قبة مركزية Ø30.6م + حلقة داخلية 8 أبراج بقباب Ø15م (نصف قطر 28.5م) + حلقة خارجية 8 أبراج (37م)
//  الساحة والمنارتان والنافورتان: مقاسة من صورة القمر الصناعي (Esri/Google)
//  الارتفاعات: من نسب الصور (عرض القبة المعروف ← الارتفاع)؛ ارتفاعات OSM "تقديرية" وطلعت أوطى بـ 1.3 مرة
//  الحالة الحالية (صور روداو 2025 + Google): القبة الكبيرة مكسوّة بلون ذهبي-مغرة، القباب الباقية حجر رمادي-بيج
//  مضلّع، المنارتان مغلّفتان بالسقالات
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { GRAND_PLAN as P } from "./grand_plan.js?v=69";
import { ashlarTex, bayTex, cylBays, cylM, boxM, extrudeXZ, flatXZ, ribbedDome, domeTex, finial, mergeAdd, cv, tex, srnd } from "./arch.js?v=69";

const D2R = Math.PI / 180;
export const GRAND = {
  pod: 6.5, base: 15.6,
  inner: { R: 28.5, angs: [10.5, 54.3, 100.6, 146.9, 193.9, 239.6, 285.1, 328.1], r: 7.6, low: 19, drumR: 7.0, drumTop: 24.6, domeR: 7.3, rise: 7.9 },
  outer: { R: 37.0, angs: [32.5, 77.4, 123.9, 170.4, 216.8, 262.6, 306.1, 349.4], r: 7.7, low: 15.5, drumR: 7.0, drumTop: 21.0, domeR: 7.3, rise: 7.6 },
  central: { baseR: 20.7, baseTop: 22, drumR: 15.4, drumTop: 36.5, domeR: 15.5, rise: 15.5 },
  minaret: { H: 66, base: 13.5, baseH: 9, r: 4.0, shaftTop: 52 },
};

export function buildGrand() {
  const G = GRAND, grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const STONE = [194, 182, 162];
  const as = ashlarTex(STONE, { size: 6, course: 0.6 });
  const stone = new THREE.MeshStandardMaterial({ map: as.map, bumpMap: as.bump, bumpScale: 0.5, roughness: 0.92 });
  const paveT = ashlarTex([176, 172, 164], { size: 8, course: 1.0, jitter: 6 });
  const pave = new THREE.MeshStandardMaterial({ map: paveT.map, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1816, roughness: 0.9 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.35, metalness: 0.85 });

  // ---- أنسجة الأبراج (فتحة واحدة لكل نسيج؛ تتكرر حول الأسطوانة) ----
  const mk = (o) => { const t = bayTex(o); return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.8, roughness: 0.9 }); };
  const innerLow = mk({ bayW: (2 * Math.PI * G.inner.r) / 10, H: G.inner.low, rows: [{ y0: 8.0, h: 5.4, w: 1.35 }, { y0: 14.6, h: 2.9, w: 1.0 }], bands: [{ y: 13.6, h: 0.45 }, { y: 18.2, h: 0.8, v: 16 }], base: STONE });
  const outerLow = mk({ bayW: (2 * Math.PI * G.outer.r) / 10, H: G.outer.low, rows: [{ y0: 7.8, h: 5.0, w: 1.35 }], bands: [{ y: 13.4, h: 0.45 }, { y: 14.7, h: 0.8, v: 16 }], base: STONE });
  const drumM = (h) => mk({ bayW: (2 * Math.PI * 7.0) / 12, H: h, rows: [{ y0: 0.9, h: 2.9, w: 0.85 }], bands: [{ y: h - 1.25, h: 1.25, arches: 3, v: 8 }], base: STONE });
  const innerDrum = drumM(G.inner.drumTop - G.inner.low), outerDrum = drumM(G.outer.drumTop - G.outer.low);
  const cenBase = mk({ bayW: (2 * Math.PI * G.central.baseR) / 24, H: G.central.baseTop, rows: [{ y0: 15.6, h: 4.2, w: 1.5 }], bands: [{ y: 21.2, h: 0.8, v: 16 }], base: STONE });
  const cenDrum = mk({ bayW: (2 * Math.PI * G.central.drumR) / 24, H: G.central.drumTop - G.central.baseTop, rows: [{ y0: 4.0, h: 6.2, w: 1.55 }], bands: [{ y: 2.6, h: 0.5 }, { y: 11.2, h: 0.5 }, { y: 11.9, h: 2.6, arches: 4, v: 6 }], base: STONE });

  const greyDome = new THREE.MeshStandardMaterial({ map: domeTex({ base: [178, 170, 155], rib: [128, 120, 106], ribs: 16, scale: true }), roughness: 0.85 });
  const goldDome = new THREE.MeshStandardMaterial({ map: domeTex({ base: [200, 150, 66], rib: [140, 98, 38], ribs: 32, scale: true, w: 2048 }), roughness: 0.45, metalness: 0.35 });

  const geo = { stone: [], pave: [], dark: [] };
  const V = (a, R) => [R * Math.cos(a * D2R), -R * Math.sin(a * D2R)];

  // ---- القاعدة: مضلّعات OSM ----
  geo.stone.push(extrudeXZ(P.outline[0], 0, G.pod, P.outline.slice(1)));
  geo.stone.push(extrudeXZ(P.north, 0, 7.8), extrudeXZ(P.sideW, 0, 7.8), extrudeXZ(P.sideE, 0, 7.8));
  geo.stone.push(extrudeXZ(P.fanW, 0, 5.2), extrudeXZ(P.fanE, 0, 5.2));
  geo.stone.push(extrudeXZ(P.base, G.pod, G.base));
  // الساحة (مبلّطة) + حافة
  geo.pave.push(flatXZ(P.plaza, 0.25));
  { const r = P.plaza, n = r.length; for (let i = 0; i < n; i++) { const [ax, az] = r[i], [bx, bz] = r[(i + 1) % n], L = Math.hypot(bx - ax, bz - az); const b = boxM(L, 0.6, 0.5); b.rotateY(-Math.atan2(bz - az, bx - ax)); b.translate((ax + bx) / 2, 0.3, (az + bz) / 2); geo.pave.push(b); } }

  const meshes = [];
  const add = (g, m) => { const mm = new THREE.Mesh(g, m); inner.add(mm); meshes.push(mm); return mm; };
  const perches = [];
  // ---- برج بقبة ----
  const unit = (U, x, z, lowMat, drumMat) => {
    add(cylBays(U.r, 0, U.low, 10, 56).translate(x, 0, z), lowMat);
    geo.stone.push(cylM(U.r + 0.35, U.low - 0.1, U.low + 0.55, 56, true).translate(x, 0, z));          // كورنيش
    add(cylBays(U.drumR, U.low + 0.55, U.drumTop, 12, 48).translate(x, 0, z), drumMat);
    geo.stone.push(cylM(U.drumR + 0.3, U.drumTop - 0.05, U.drumTop + 0.35, 48, true).translate(x, 0, z));
    add(ribbedDome(U.domeR, U.rise, 16, { rib: 0.035, point: 0.08 }).translate(x, U.drumTop + 0.3, z), greyDome);
    const top = U.drumTop + 0.3 + U.rise;
    inner.add(finial(top - 0.1, 0.9, brass).translateX(x).translateZ(z));
    perches.push([x, top + 0.3, z], [x + U.drumR * 0.7, U.drumTop + 0.4, z]);
  };
  for (const a of G.outer.angs) { const [x, z] = V(a, G.outer.R); unit(G.outer, x, z, outerLow, outerDrum); }
  for (const a of G.inner.angs) { const [x, z] = V(a, G.inner.R); unit(G.inner, x, z, innerLow, innerDrum); }

  // ---- القبة المركزية ----
  const C = G.central;
  add(cylBays(C.baseR, G.base - 1, C.baseTop, 24, 96), cenBase);
  geo.stone.push(cylM(C.baseR + 0.4, C.baseTop - 0.2, C.baseTop + 0.4, 96, true));
  { const g = new THREE.CylinderGeometry(C.drumR + 0.6, C.baseR + 0.2, 2.6, 96, 1, true); g.translate(0, C.baseTop + 1.7, 0); geo.stone.push(g); }
  add(cylBays(C.drumR, C.baseTop, C.drumTop, 24, 96), cenDrum);
  geo.stone.push(cylM(C.drumR + 0.55, C.drumTop - 0.1, C.drumTop + 0.7, 96, true));
  add(ribbedDome(C.domeR, C.rise, 32, { rib: 0.025, point: 0.06, seg: 36 }).translate(0, C.drumTop + 0.6, 0), goldDome);
  const apex = C.drumTop + 0.6 + C.rise;
  inner.add(finial(apex - 0.2, 1.9, brass));
  perches.push([0, apex + 0.5, 0]);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; perches.push([Math.cos(a) * C.drumR, C.drumTop + 0.8, Math.sin(a) * C.drumR]); }

  // ---- النافورتان (الجناحان الشماليان): قاعدة دائرية بحافة مائلة + رقبة + قبة زرقاء مشبّكة ----
  const blueT = (() => { const [c, g] = cv(1024, 512); g.fillStyle = "#8fb7c8"; g.fillRect(0, 0, 1024, 512); g.strokeStyle = "#e9f1f2"; g.lineWidth = 5;
    for (let i = 0; i < 24; i++) { const x = (i / 24) * 1024; g.beginPath(); for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y / 40) * 14, y); g.stroke(); }
    for (let y = 30; y < 512; y += 46) { g.beginPath(); for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x / 21.3) * 12); g.stroke(); }
    const t = tex(c); return t; })();
  const blue = new THREE.MeshStandardMaterial({ map: blueT, roughness: 0.4, metalness: 0.1 });
  for (const [fx, fz] of P.fountains) {
    geo.stone.push(cylM(14, 0, 2.2, 64, true, 14.6).translate(fx, 0, fz));
    { const g = new THREE.CylinderGeometry(11.5, 14, 2.4, 64, 1, true); g.translate(fx, 3.4, fz); geo.stone.push(g); }
    geo.stone.push(flatXZ(Array.from({ length: 48 }, (_, i) => [fx + 11.5 * Math.cos(i / 48 * 6.283), fz + 11.5 * Math.sin(i / 48 * 6.283)]), 4.6));
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; geo.stone.push(boxM(0.4, 0.9, 0.4, fx + Math.cos(a) * 11.1, 5.05, fz + Math.sin(a) * 11.1)); }
    add(cylBays(6.4, 4.6, 7.4, 12, 48).translate(fx, 0, fz), drumM(2.8));
    add(ribbedDome(4.9, 4.6, 12, { rib: 0.0, point: 0.05 }).translate(fx, 7.4, fz), blue);
    inner.add(finial(12, 0.7, brass).translateX(fx).translateZ(fz));
    perches.push([fx, 12.4, fz], [fx + 11, 5.2, fz]);
  }
  // الجناح الشمالي: كشك مربع بقبة صغيرة
  { const [x, z] = P.northPav; geo.stone.push(boxM(8, 5, 8, x, 2.5, z)); add(ribbedDome(3.3, 3.2, 12, { rib: 0 }).translate(x, 5, z), greyDome); }

  // ---- المنارتان: قاعدة مربعة بأقواس على منصة دائرية، بدن مضلّع بفتحات، شرفة، مقصورة أقواس، قبيبة ----
  const M = G.minaret;
  const shaftMat = mk({ bayW: (2 * Math.PI * M.r) / 8, H: M.shaftTop - M.baseH, rows: [6, 13, 20, 27, 34].map((y) => ({ y0: y, h: 3.2, w: 0.7 })), bands: [{ y: 11.8, h: 0.35 }, { y: 25.8, h: 0.35 }, { y: 39.8, h: 0.4 }], base: STONE });
  const galMat = mk({ bayW: (2 * Math.PI * M.r) / 8, H: 5.6, rows: [{ y0: 0.6, h: 4.3, w: 2.0, kind: "round" }], bands: [], base: STONE });
  const baseMat = mk({ bayW: M.base / 3, H: M.baseH, rows: [{ y0: 0, h: 5.4, w: 2.3 }], bands: [{ y: 7.6, h: 0.6, v: 14 }], base: STONE });
  // سقالات: شبكة حديد (نسيج شفاف)
  const scafT = (() => { const [c, g] = cv(128, 256); g.fillStyle = "#000"; g.fillRect(0, 0, 128, 256); g.strokeStyle = "#fff"; g.lineWidth = 4;
    for (let x = 2; x < 128; x += 42) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let y = 2; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    g.lineWidth = 2.5; for (let y = 0; y < 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + 64); g.stroke(); }
    return tex(c, false); })();
  const scaf = new THREE.MeshStandardMaterial({ alphaMap: scafT, transparent: false, alphaTest: 0.4, color: 0x4a443e, roughness: 0.8, metalness: 0.4, side: THREE.DoubleSide });
  for (const [mx, mz] of P.minarets) {
    geo.pave.push(cylM(15, 0, 1.0, 64, true).translate(mx, 0, mz));
    // القاعدة المربعة (4 واجهات بأقواس)
    for (let s = 0; s < 4; s++) {
      const g = new THREE.PlaneGeometry(M.base, M.baseH); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 3);
      g.translate(0, M.baseH / 2 + 1, M.base / 2); g.rotateY(s * Math.PI / 2); g.translate(mx, 0, mz); add(g, baseMat);
    }
    geo.stone.push(boxM(M.base + 0.8, 0.8, M.base + 0.8, mx, M.baseH + 1.4, mz), boxM(M.base - 1.5, 2.5, M.base - 1.5, mx, M.baseH + 2.3, mz));
    const y0 = M.baseH + 1;
    add(cylBays(M.r, y0, M.shaftTop, 8, 24).translate(mx, 0, mz), shaftMat);
    // مقرنص مبسّط + شرفة + درابزين
    for (let k = 0; k < 4; k++) geo.stone.push(cylM(M.r + 0.25 + k * 0.28, M.shaftTop - 1.6 + k * 0.4, M.shaftTop - 1.2 + k * 0.4, 24, true).translate(mx, 0, mz));
    geo.stone.push(cylM(M.r + 1.35, M.shaftTop, M.shaftTop + 0.5, 32, true).translate(mx, 0, mz));
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; geo.stone.push(boxM(0.22, 1.0, 0.22, mx + Math.cos(a) * (M.r + 1.2), M.shaftTop + 1.0, mz + Math.sin(a) * (M.r + 1.2))); }
    add(cylBays(M.r, M.shaftTop + 0.5, M.shaftTop + 6.1, 8, 24).translate(mx, 0, mz), galMat);
    geo.stone.push(cylM(M.r + 0.45, M.shaftTop + 6.1, M.shaftTop + 6.9, 24, true).translate(mx, 0, mz));
    add(ribbedDome(M.r - 0.1, 4.6, 8, { rib: 0, point: 0.12 }).translate(mx, M.shaftTop + 6.9, mz), stone);
    inner.add(finial(M.shaftTop + 11.3, 0.9, brass).translateX(mx).translateZ(mz));
    // السقالات على البدن والقاعدة
    { const g = new THREE.CylinderGeometry(M.r + 1.4, M.r + 1.4, M.shaftTop - 2 - y0, 8, 1, true); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * (M.shaftTop - 2 - y0) / 6); g.translate(mx, (M.shaftTop - 2 + y0) / 2, mz); add(g, scaf); }
    perches.push([mx + M.r + 1.2, M.shaftTop + 1.6, mz], [mx, M.shaftTop + 11.9, mz]);
  }

  mergeAdd(inner, geo.stone, stone); mergeAdd(inner, geo.pave, pave);
  inner.scale.setScalar(1 / 8);
  const S = 1 / 8, V3 = (x, y, z) => new THREE.Vector3(x * S, y * S, z * S);
  grp.userData = { perches: perches.map(([x, y, z]) => ({ o: grp, p: V3(x, y, z), yaw: Math.random() * 6.28 })), top: V3(0, apex + 4, 0), focus: V3(0, 20, -12), height: apex * S };
  return grp;
}
