// =============================================================
//  الجسر العتيق (جسر الملك غازي 1934) + الجسر الموازي الجديد جنوبه
//  الأرقام: بيت الموصل / الگاردينيا (الأشغال العامة 1932–1934):
//   8 فضاءات × 120 قدم (36.58م)، 7 دعامات كل وحدة اسطوانتين حديد قطر 9 أقدام (2.74م)،
//   شارع 18 قدم (5.49م) + رصيف 5 أقدام (1.52م)
//  الشكل من الصور (2019–2025):
//   • القديم: جملون علوي مستطيل (أعمدة أطراف عمودية)، بكل لوح قائم + صليب X، أعضاء مشبّكة،
//     لون رمادي فاتح مزرّق، رصيف المشاة برّا الجملون (الجهة الشمالية) بسياج شبك، بوابة بلافتة "جسر الموصل القديم"
//   • الجديد (FERMAK): وارن بقوائم، أعمدة أطراف مايلة، تكتيف علوي X، رمادي أغمق، رصيفه بالجهة الجنوبية
//   • الدعامات: أزواج اسطوانات، بعضها بتكتيف X
//  المنسوب: نهايات الجسر ~219م (DEM) ↔ ماي ~209.5م → البلاط ~9.5م فوق الماي
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { mergeGeometries } from "../vendor/addons/utils/BufferGeometryUtils.js?v=69";

export const BRIDGE = { spans: 8, spanL: 36.58, roadW: 5.49, walkW: 1.52, pierD: 2.74, deck: 9.5 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function members(list, mat) {
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
  const up = V(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4(), s = new THREE.Vector3();
  list.forEach(([a, b, w, h], i) => { const d = b.clone().sub(a), L = d.length(); q.setFromUnitVectors(up, d.normalize()); m.compose(a.clone().add(b).multiplyScalar(0.5), q, s.set(w, L, h)); inst.setMatrixAt(i, m); });
  return inst;
}

// بلاط + رصيف + سياج + دعامات مشتركة
function deckAndPiers(inner, B, L, tz, walkSide, steel, pierMat) {
  const dy = B.deck;
  const asph = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.92 });
  const walkM = new THREE.MeshStandardMaterial({ color: 0x8a857c, roughness: 0.95 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(L + 2, 0.45, B.roadW + 0.6), asph); deck.position.set(0, dy - 0.05, 0); inner.add(deck);
  const wz = walkSide * (tz + 0.35 + B.walkW / 2);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(L + 2, 0.3, B.walkW + 0.2), walkM); walk.position.set(0, dy + 0.05, wz); inner.add(walk);
  // سياج شبك خارجي + حاجز الشارع (guardrail)
  const fz = walkSide * (tz + 0.4 + B.walkW + 0.1), parts = [];
  for (const yy of [0.25, 1.15]) { const r = new THREE.BoxGeometry(L + 2, 0.06, 0.06); r.translate(0, dy + yy, fz); parts.push(r.toNonIndexed()); }
  for (let x = -L / 2 - 1; x <= L / 2 + 1; x += 2.4) { const p = new THREE.BoxGeometry(0.07, 1.2, 0.07); p.translate(x, dy + 0.65, fz); parts.push(p.toNonIndexed()); }
  inner.add(new THREE.Mesh(mergeGeometries(parts), steel));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L + 2, 0.9), new THREE.MeshStandardMaterial({ color: 0x9aa0a4, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  mesh.position.set(0, dy + 0.7, fz); inner.add(mesh);
  // دعامات: زوج اسطوانات تحت الجملونين + عارضة + تكتيف X بالتناوب
  const pp = [];
  for (let s = 1; s < B.spans; s++) {
    const x = -L / 2 + s * B.spanL;
    for (const z of [-tz, tz]) { const c = new THREE.CylinderGeometry(B.pierD / 2, B.pierD / 2, dy + 5, 24); c.translate(x, (dy - 5) / 2 - 0.4, z); pp.push(c.toNonIndexed()); }
    const cap = new THREE.BoxGeometry(1.6, 0.8, tz * 2 + B.pierD); cap.translate(x, dy - 0.7, 0); pp.push(cap.toNonIndexed());
    if (s % 2) for (const sg of [1, -1]) { const d = new THREE.BoxGeometry(0.35, Math.hypot(tz * 2, dy * 0.7), 0.35); d.rotateX(sg * Math.atan2(tz * 2, dy * 0.7)); d.translate(x, dy * 0.4, 0); pp.push(d.toNonIndexed()); }
  }
  inner.add(new THREE.Mesh(mergeGeometries(pp), pierMat));
  // أكتاف
  const stone = new THREE.MeshStandardMaterial({ color: 0x8c8274, roughness: 0.95 });
  for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(8, dy + 5, tz * 2 + B.walkW * 2 + 3), stone); a.position.set(sx * (L / 2 + 3.5), (dy - 5) / 2 - 0.2, 0); inner.add(a); }
}

// ---------------- القديم ----------------
export function buildOldBridge(opt = {}) {
  const B = { ...BRIDGE, ...opt };
  const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const L = B.spans * B.spanL, panels = 10, pl = B.spanL / panels, Ht = 5.0, tz = B.roadW / 2 + 0.3, dy = B.deck;
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9c2c8, roughness: 0.45, metalness: 0.5 });
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.6, metalness: 0.4 });
  const list = [];
  for (let s = 0; s < B.spans; s++) {
    const sx = -L / 2 + s * B.spanL;
    for (const z of [-tz, tz]) {
      const b = (k) => V(sx + k * pl, dy, z), t = (k) => V(sx + k * pl, dy + Ht, z);
      list.push([b(0), b(panels), 0.42, 0.55], [t(0), t(panels), 0.5, 0.42]);           // وتران
      for (let k = 0; k <= panels; k++) list.push([b(k), t(k), k === 0 || k === panels ? 0.55 : 0.32, 0.32]); // قوائم (الأطراف أثخن)
      for (let k = 0; k < panels; k++) { list.push([b(k), t(k + 1), 0.2, 0.2], [t(k), b(k + 1), 0.2, 0.2]); } // صليب X بكل لوح
    }
    for (let k = 0; k <= panels; k++) {
      const x = sx + k * pl;
      list.push([V(x, dy + Ht, -tz), V(x, dy + Ht, tz), 0.25, 0.3]);                            // عوارض علوية
      list.push([V(x, dy - 0.35, -tz - 0.3), V(x, dy - 0.35, tz + 0.3), 0.3, 0.5]);             // عوارض أرضية
      if (k < panels) { list.push([V(x, dy + Ht, -tz), V(x + pl, dy + Ht, tz), 0.1, 0.1], [V(x, dy + Ht, tz), V(x + pl, dy + Ht, -tz), 0.1, 0.1]); }
    }
    // بوابات الأطراف (portal) بزوايا
    for (const xe of [sx, sx + B.spanL]) for (const z of [-tz, tz]) list.push([V(xe, dy + Ht - 1.4, z), V(xe, dy + Ht, z - Math.sign(z) * 1.2), 0.18, 0.18]);
  }
  inner.add(members(list, steel));
  deckAndPiers(inner, B, L, tz, -1, steel, pierMat);   // الرصيف بالجهة الشمالية (−z محلياً بعد التدوير)
  // لافتة البوابة الغربية "جسر الموصل القديم" + إطار حروف مضيء
  const [c, g] = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 128; return [c, c.getContext("2d")]; })();
  g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, 512, 128); g.strokeStyle = "#222"; g.lineWidth = 6; g.strokeRect(4, 4, 504, 120);
  g.fillStyle = "#111"; g.font = "bold 46px 'IBM Plex Sans Arabic', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = "ltr"; g.fillText("MOSUL OLD BRIDGE", 256, 68);
  const signT = new THREE.CanvasTexture(c); signT.colorSpace = THREE.SRGBColorSpace;
  for (const sx of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.6, emissive: 0xffffff, emissiveMap: signT, emissiveIntensity: 0.25 }));
    sign.position.set(sx * (L / 2 + 0.3), dy + Ht + 0.7, 0); sign.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; inner.add(sign);
  }
  return finish(grp, inner, B, L, dy, Ht, tz, -1);
}

// ---------------- الموازي الجديد ----------------
export function buildNewBridge(opt = {}) {
  const B = { ...BRIDGE, ...opt };
  const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const L = B.spans * B.spanL, panels = 8, pl = B.spanL / panels, Ht = 6.0, tz = B.roadW / 2 + 0.35, dy = B.deck;
  const steel = new THREE.MeshStandardMaterial({ color: 0x6d7074, roughness: 0.5, metalness: 0.5 });
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.6, metalness: 0.4 });
  const list = [];
  for (let s = 0; s < B.spans; s++) {
    const sx = -L / 2 + s * B.spanL;
    for (const z of [-tz, tz]) {
      const b = (k) => V(sx + k * pl, dy, z), t = (k) => V(sx + k * pl, dy + Ht, z);
      list.push([b(0), b(panels), 0.5, 0.6], [t(1), t(panels - 1), 0.55, 0.5]);
      list.push([b(0), t(1), 0.55, 0.5], [b(panels), t(panels - 1), 0.55, 0.5]);         // أعمدة أطراف مايلة
      for (let k = 1; k < panels - 1; k++) list.push(k % 2 ? [t(k), b(k + 1), 0.3, 0.3] : [b(k), t(k + 1), 0.3, 0.3]);
      for (let k = 1; k < panels; k++) list.push([b(k), t(k), 0.24, 0.24]);
    }
    for (let k = 1; k < panels; k++) {
      const x = sx + k * pl;
      list.push([V(x, dy + Ht, -tz), V(x, dy + Ht, tz), 0.3, 0.35]);
      if (k < panels - 1) list.push([V(x, dy + Ht, -tz), V(x + pl, dy + Ht, tz), 0.14, 0.14], [V(x, dy + Ht, tz), V(x + pl, dy + Ht, -tz), 0.14, 0.14]);
    }
    for (let k = 0; k <= panels; k++) { const x = sx + k * pl; list.push([V(x, dy - 0.35, -tz - 0.3), V(x, dy - 0.35, tz + 0.3), 0.3, 0.5]); }
    for (const xe of [sx + pl * 0.6, sx + B.spanL - pl * 0.6]) list.push([V(xe, dy + Ht * 0.82, -tz), V(xe, dy + Ht * 0.82, tz), 0.5, 0.2]);
  }
  inner.add(members(list, steel));
  deckAndPiers(inner, B, L, tz, 1, steel, pierMat);
  return finish(grp, inner, B, L, dy, Ht, tz, 1);
}

function finish(grp, inner, B, L, dy, Ht, tz, walkSide) {
  // أعمدة إنارة على الرصيف
  const lampPts = [], poles = [], S = 1 / 8;
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.5, metalness: 0.5 });
  for (let s = 0; s <= B.spans * 2; s++) {
    const x = -L / 2 + (s * B.spanL) / 2, z = walkSide * (tz + 0.4 + B.walkW);
    const p = new THREE.CylinderGeometry(0.06, 0.09, 7, 8); p.translate(x, dy + 3.6, z); poles.push(p.toNonIndexed());
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.2); arm.translate(x, dy + 7.0, z - walkSide * 0.55); poles.push(arm.toNonIndexed());
    lampPts.push(x * S, (dy + 6.9) * S, (z - walkSide * 1.1) * S);
  }
  inner.add(new THREE.Mesh(mergeGeometries(poles), steel));
  inner.scale.setScalar(S);
  const perches = [];
  for (let s = 0; s < B.spans; s++) for (let k = 1; k < 8; k++) for (const z of [-tz, tz]) if (Math.random() < 0.45) perches.push({ o: grp, p: V((-L / 2 + s * B.spanL + k * B.spanL / 8) * S, (dy + Ht + 0.3) * S, z * S), yaw: Math.random() < 0.5 ? 0 : Math.PI });
  perches.sort(() => Math.random() - 0.5);
  grp.userData = {
    L: L * S, deckY: dy * S, perches: perches.slice(0, 20), lampPts,
    lanes: [[-L / 2 * S - 3, 0, L / 2 * S + 3, 0, walkSide, (dy + 0.4) * S]],
    focus: V(0, (dy + Ht / 2) * S, 0), top: V(0, (dy + Ht + 4) * S, 0),
  };
  return grp;
}
