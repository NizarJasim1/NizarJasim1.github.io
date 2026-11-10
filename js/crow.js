// =============================================================
//  Crow — غراب 3D مبني بالكود بالكامل (بدون موديلات خارجية)
//  ستايل: low-poly مضلّع، ريش أسود لامع بلمعة قزحية، عين حمرة
//  وضعيات: perched (واكف) ↔ flight (يطير)، caw (ينعب)، تتبّع الماوس
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

// ---------- loft: جسم من مقاطع بيضوية على عمود فقري ----------
// sections: [x, y, ry, rz, (dy = إزاحة المركز للأسفل)]
function loft(sections, radial = 9, capStart = true, capEnd = true) {
  const pos = [], idx = [];
  const n = sections.length;
  for (let i = 0; i < n; i++) {
    const [x, y, ry, rz, dy = 0] = sections[i];
    const a = sections[Math.max(0, i - 1)], b = sections[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx; // normal in the xy plane
    for (let k = 0; k < radial; k++) {
      const t = (k / radial) * TAU;
      const c = Math.cos(t), s = Math.sin(t);
      pos.push(x + nx * (ry * c - dy), y + ny * (ry * c - dy), rz * s);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + ((k + 1) % radial);
      const c = (i + 1) * radial + k, d = (i + 1) * radial + ((k + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  const addCap = (ring, flip) => {
    const [x, y, , , dy = 0] = sections[ring];
    const ci = pos.length / 3; pos.push(x, y - dy * 0.5, 0);
    for (let k = 0; k < radial; k++) {
      const a = ring * radial + k, b = ring * radial + ((k + 1) % radial);
      flip ? idx.push(ci, a, b) : idx.push(ci, b, a);
    }
  };
  if (capStart) addCap(0, false);
  if (capEnd) addCap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- ريشة: شكل مدبب مسطّح، طولها على +x ----------
export function featherGeo(len, wid, notch = 0.0) {
  const s = new THREE.Shape();
  s.moveTo(0, -wid * 0.5);
  s.lineTo(len * 0.55, -wid * 0.52);
  s.lineTo(len * 0.9, -wid * 0.32);
  s.lineTo(len, notch);
  s.lineTo(len * 0.9, wid * 0.3);
  s.lineTo(len * 0.55, wid * 0.5);
  s.lineTo(0, wid * 0.45);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 1);
  // انحناء بسيط على طول الريشة حتى ما تكون ورقة مسطحة
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -Math.sin((x / len) * Math.PI) * len * 0.05); }
  g.computeVertexNormals();
  return g;
}

function panelGeo(points) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(s);
  g.computeVertexNormals();
  return g;
}

export class Crow {
  constructor({ quality = "high", detail = "full" } = {}) {
    this.full = detail === "full";
    this.root = new THREE.Group();     // يتحرك بالمشهد
    this.body = new THREE.Group();     // يتمايل/يتنفس
    this.root.add(this.body);

    const hi = quality === "high";
    this.mat = hi
      ? new THREE.MeshPhysicalMaterial({ color: 0x0b0b0f, roughness: 0.34, metalness: 0.12, clearcoat: 0.25, clearcoatRoughness: 0.4, iridescence: 0.55, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520], flatShading: true, side: THREE.DoubleSide, transparent: true })
      : new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.4, metalness: 0.15, flatShading: true, side: THREE.DoubleSide, transparent: true });
    this.featherMat = hi
      ? new THREE.MeshPhysicalMaterial({ color: 0x09090c, roughness: 0.62, metalness: 0.06, iridescence: 0.15, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 480], flatShading: true, side: THREE.DoubleSide, transparent: true })
      : new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.55, metalness: 0.1, flatShading: true, side: THREE.DoubleSide, transparent: true });
    this.dullMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.95, metalness: 0, flatShading: true, side: THREE.DoubleSide, transparent: true });
    this.beakMat = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.25, metalness: 0.35, flatShading: true, transparent: true });
    this.legMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.6, metalness: 0.2, flatShading: true, transparent: true });
    this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff0a0a, emissiveIntensity: 1.5, roughness: 0.2, transparent: true });
    this.materials = [this.mat, this.featherMat, this.dullMat, this.beakMat, this.legMat, this.eyeMat];

    this._buildBody();
    this._buildHead();
    this._buildWings();
    this._buildTail();
    this._buildLegs();

    if (this.full) this._buildDetails();
    // الشفافية + الوجهين بالعادة ترسم مرتين؛ مرة وحدة تكفي ونص عدد الرسمات
    for (const m of this.materials) m.forceSinglePass = true;

    // حالة الحركة
    this.act = null; this.actT = 1.5 + Math.random() * 3;   // سلوكيات وهو واكف
    this.fly = 0;          // 0 واكف → 1 يطير
    this.flapSpeed = 9;
    this.flapAmp = 1;
    this.phase = 0;
    this.cawT = 0;         // مؤقت النعيق
    this.look = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, next: 0, tilt: 0, tTilt: 0 };
    this.lookTarget = null; // Vector3 بالعالم
    this.blinkT = 2;
    this.opacity = 1;

    // وضعية الجناح المطوي: الامتداد لورا وشوية لجوة، الحافة الأمامية لفوق
    const fold = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0));
    this.qFold = new THREE.Quaternion().setFromRotationMatrix(fold);
    this.qFold.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.3));   // ميلان لتحت باتجاه الذيل
    this.qFold.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.08));  // يبعد شوية عن الجسم من ورا
    this._q = new THREE.Quaternion(); this._qf = new THREE.Quaternion(); this._ax = new THREE.Vector3(1, 0, 0);
  }

  _mesh(geo, mat, parent) { const m = new THREE.Mesh(geo, mat); m.castShadow = false; parent.add(m); return m; }

  _buildBody() {
    // من قاعدة الذيل (الخلف) إلى الرقبة — الجسم مايل لفوق بزاوية الوقفة
    const g = loft([
      [-0.86, 0.03, 0.04, 0.06],
      [-0.68, 0.05, 0.13, 0.15, 0.02],
      [-0.46, 0.07, 0.21, 0.21, 0.04],
      [-0.2, 0.1, 0.265, 0.245, 0.06],
      [0.06, 0.18, 0.275, 0.24, 0.05],
      [0.26, 0.32, 0.235, 0.205, 0.03],
      [0.39, 0.47, 0.19, 0.175],
      [0.45, 0.60, 0.145, 0.145],
    ], this.full ? 13 : 9, true, false);
    this.bodyMesh = this._mesh(g, this.mat, this.body);
    // ريش الصدر المنفوش (hackles) — شظايا صغيرة تحت المنقار
    this.hackles = new THREE.Group();
    this.body.add(this.hackles);
    for (let i = 0; i < (this.full ? 7 : 0); i++) {
      const f = this._mesh(featherGeo(0.18, 0.08), this.dullMat, this.hackles);
      const a = (i / 6 - 0.5) * 1.6;
      f.position.set(0.36, 0.42, Math.sin(a) * 0.11);
      f.rotation.set(0, -a * 0.6, -2.15);
    }
  }

  _buildHead() {
    this.neck = new THREE.Group();
    this.neck.position.set(0.42, 0.56, 0);
    this.body.add(this.neck);
    this.head = new THREE.Group();
    this.neck.add(this.head);
    const g = loft([
      [-0.08, 0.0, 0.12, 0.125],
      [0.0, 0.08, 0.155, 0.148, 0.02],
      [0.11, 0.12, 0.152, 0.14, 0.03],
      [0.21, 0.115, 0.122, 0.112, 0.02],
      [0.29, 0.1, 0.08, 0.075],
    ], 10);
    this.headMesh = this._mesh(g, this.mat, this.head);

    // المنقار: فك علوي + فك سفلي، محورهم عند قاعدة المنقار
    this.beakPivot = new THREE.Group();
    this.beakPivot.position.set(0.27, 0.095, 0);
    this.head.add(this.beakPivot);
    this.upper = this._mesh(loft([
      [0.0, 0.024, 0.062, 0.072],
      [0.1, 0.02, 0.048, 0.052],
      [0.2, 0.0, 0.026, 0.028],
      [0.27, -0.03, 0.012, 0.012],
      [0.31, -0.055, 0.002, 0.002],
    ], 7), this.beakMat, this.beakPivot);
    this.lowerPivot = new THREE.Group();
    this.beakPivot.add(this.lowerPivot);
    this.lower = this._mesh(loft([
      [0.0, -0.03, 0.042, 0.062],
      [0.1, -0.034, 0.03, 0.044],
      [0.2, -0.04, 0.015, 0.022],
      [0.26, -0.05, 0.002, 0.002],
    ], 7), this.beakMat, this.lowerPivot);

    // العيون
    const eg = new THREE.IcosahedronGeometry(0.03, 1);
    this.eyes = [-1, 1].map((s) => { const e = this._mesh(eg, this.eyeMat, this.head); e.position.set(0.17, 0.155, s * 0.118); return e; });
  }

  _buildWings() {
    this.wings = [];
    for (const s of [1, -1]) {
      const side = new THREE.Group();
      side.scale.z = s;                    // مرآة للجناح الثاني
      side.position.set(0.16, 0.36, 0);
      this.body.add(side);
      const root = new THREE.Group();      // الكتف
      root.rotation.order = "YXZ";
      root.position.z = 0.2;
      side.add(root);

      // الذراع: لوحة الريش الصغير (coverts) بمستوى XZ، الامتداد على +z
      const arm = new THREE.Group();
      root.add(arm);
      const armPanel = this._mesh(panelGeo([[0.08, 0], [0.06, 0.2], [0.02, 0.46], [-0.16, 0.47], [-0.24, 0.2], [-0.2, 0]]), this.featherMat, arm);
      armPanel.rotation.x = Math.PI / 2;    // XY → XZ
      const secondaries = [];
      const NS = this.full ? 8 : 5;
      for (let i = 0; i < NS; i++) {
        const t = i / (NS - 1);
        const f = this._mesh(featherGeo(0.4 + Math.sin(t * Math.PI) * 0.04, 0.12), this.featherMat, arm);
        f.position.set(-0.12, 0.004 * i, 0.03 + t * 0.42);
        f.rotation.set(Math.PI / 2, 0, Math.PI + 0.12 - t * 0.25);
        f.userData.off = 0.12 - t * 0.25; f.userData.t = t;
        secondaries.push(f);
      }

      // اليد: الأصابع الطويلة (primaries) — أوضح علامة للغراب
      const hand = new THREE.Group();
      hand.position.z = 0.46;
      arm.add(hand);
      const handPanel = this._mesh(panelGeo([[0.06, 0], [0.02, 0.2], [-0.08, 0.26], [-0.18, 0.1], [-0.16, 0]]), this.featherMat, hand);
      handPanel.rotation.x = Math.PI / 2;
      const primaries = [];
      const NP = this.full ? 7 : 5;
      for (let i = 0; i < NP; i++) {
        const t = i / (NP - 1);
        const f = this._mesh(featherGeo(0.48 + t * 0.14, 0.09, 0.0), this.featherMat, hand);
        f.position.set(-0.07 + t * 0.05, 0.003 * i, 0.04 + t * 0.2);
        f.rotation.set(Math.PI / 2, 0, 0);
        f.userData.spread = -0.4 - t * 1.12;   // الداخلية لورا، الخارجية للخارج
        f.userData.t = t;
        primaries.push(f);
      }
      this.wings.push({ s, side, root, arm, hand, primaries, secondaries, extra: 0 });
    }
  }

  _buildTail() {
    this.tail = new THREE.Group();
    this.tail.position.set(-0.8, 0.04, 0);
    this.body.add(this.tail);
    this.tailFeathers = [];
    const NT = this.full ? 9 : 6;
    for (let i = 0; i < NT; i++) {
      const t = i / (NT - 1) - 0.5;
      const f = this._mesh(featherGeo(0.6 - Math.abs(t) * 0.1, 0.16), this.featherMat, this.tail);
      f.rotation.set(Math.PI / 2, 0, Math.PI);   // تأشر لورا (-x) وبمستوى أفقي
      f.position.set(0.02, 0.003 * Math.abs(i - 4), t * 0.05);
      f.userData.t = t;
      this.tailFeathers.push(f);
    }
  }

  _buildLegs() {
    this.legs = [];
    const lg = new THREE.CylinderGeometry(0.022, 0.03, 0.3, 5);
    lg.translate(0, -0.15, 0);
    const tg = new THREE.CylinderGeometry(0.008, 0.012, 0.15, 4);
    tg.rotateZ(Math.PI / 2); tg.translate(0.075, 0, 0);
    for (const s of [1, -1]) {
      const hip = new THREE.Group();
      hip.position.set(-0.02, -0.16, s * 0.08);
      this.body.add(hip);
      this._mesh(lg, this.legMat, hip);
      const foot = new THREE.Group(); foot.position.y = -0.3; hip.add(foot);
      for (const a of this.full ? [-0.35, 0, 0.35] : [-0.2, 0.2]) { const toe = this._mesh(tg, this.legMat, foot); toe.rotation.y = a; }
      const back = this._mesh(tg, this.legMat, foot); back.rotation.y = Math.PI;
      this.legs.push({ hip, foot });
    }
  }

  // ---------- تفاصيل إضافية للغراب الرئيسي ----------
  _buildDetails() {
    const top = [[-0.46, 0.07, 0.21], [-0.2, 0.1, 0.265], [0.06, 0.18, 0.275], [0.26, 0.32, 0.235]];
    const spine = (x) => { for (let i = 0; i < top.length - 1; i++) { const [x0, y0, r0] = top[i], [x1, y1, r1] = top[i + 1]; if (x >= x0 && x <= x1) { const u = (x - x0) / (x1 - x0); return [y0 + (y1 - y0) * u, r0 + (r1 - r0) * u, Math.atan2(y1 - y0, x1 - x0)]; } } return [top[0][1], top[0][2], 0.2]; };
    // ريش الظهر (mantle): صفوف متراكبة مثل الحراشف
    this.mantle = new THREE.Group(); this.body.add(this.mantle);
    for (const x of [0.22, 0.08, -0.06, -0.2, -0.34]) {
      const [y, r, slope] = spine(x);
      for (const z of [-0.09, 0, 0.09]) {
        const f = this._mesh(featherGeo(0.24, 0.13), this.featherMat, this.mantle);
        f.position.set(x, y + r * 0.86 - Math.abs(z) * 0.3, z);
        f.rotation.set(Math.PI / 2 + z * 1.8, 0, Math.PI + slope - 0.04);
      }
    }
    // ريش الصدر المنفوش
    this.breast = new THREE.Group(); this.body.add(this.breast);
    for (const [x, y] of [[0.3, 0.16], [0.2, 0.02], [0.08, -0.08], [-0.06, -0.14]])
      for (const z of [-0.1, 0, 0.1]) {
        const f = this._mesh(featherGeo(0.17, 0.11), this.dullMat, this.breast);
        f.position.set(x, y, z); f.rotation.set(0, -z * 2.2, -2.3 + x * 0.6);
      }
    // ريش الغطاء على الجناح (coverts) + الإبهام (alula)
    for (const w of this.wings) {
      for (let i = 0; i < 7; i++) { const t = i / 6; const f = this._mesh(featherGeo(0.24, 0.11), this.featherMat, w.arm); f.position.set(-0.02, 0.012, 0.04 + t * 0.4); f.rotation.set(Math.PI / 2, 0, Math.PI + 0.05); }
      for (let i = 0; i < 6; i++) { const t = i / 5; const f = this._mesh(featherGeo(0.13, 0.09), this.featherMat, w.arm); f.position.set(0.06, 0.02, 0.05 + t * 0.38); f.rotation.set(Math.PI / 2, 0, Math.PI); }
      const al = this._mesh(featherGeo(0.14, 0.05), this.featherMat, w.hand); al.position.set(0.05, 0.02, 0.0); al.rotation.set(Math.PI / 2, 0, 0.5);
    }
    // شعيرات فوق المنقار
    for (const z of [-0.035, 0, 0.035]) { const f = this._mesh(featherGeo(0.11, 0.05), this.mat, this.beakPivot); f.position.set(-0.03, 0.05, z); f.rotation.set(0, 0, -0.2); }
    // لمعة بالعين (تعطيها حياة)
    const hg = new THREE.SphereGeometry(0.009, 6, 4), hm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    this.materials.push(hm);
    for (const e of this.eyes) { const h = new THREE.Mesh(hg, hm); h.position.set(0.012, 0.012, Math.sign(e.position.z) * 0.024); e.add(h); }
    // مخالب
    const cg = new THREE.ConeGeometry(0.008, 0.04, 4); cg.rotateZ(-Math.PI / 2 - 0.5); cg.translate(0.16, -0.012, 0);
    for (const l of this.legs) for (const a of [-0.35, 0, 0.35, Math.PI]) { const c = this._mesh(cg, this.legMat, l.foot); c.rotation.y = a; }
  }

  // سلوكيات: preen (يحك ريشه)، ruffle (ينفض)، hop (يگفز)، stretch (يمد جناحه)، flick (يهز ذيله)
  doAct(name, side = Math.random() < 0.5 ? 1 : -1) {
    const d = { preen: 1.7, ruffle: 0.75, hop: 0.45, stretch: 1.2, flick: 0.35 }[name] || 0.5;
    this.act = { name, t: 0, d, side };
  }

  // ارتفاع قدم الغراب عن مركزه (حتى نوكفه على السلك)
  get footY() { return -0.16 - 0.3; }

  caw() { this.cawT = 0.55; }

  setOpacity(o) {
    this.opacity = o;
    for (const m of this.materials) { m.opacity = o; m.depthWrite = o > 0.98; }
    this.root.visible = o > 0.01;
  }

  // ---------- التحديث كل فريم ----------
  update(dt, t, camera) {
    const F = smooth(clamp(this.fly, 0, 1));
    const P = 1 - F; // perched factor

    // الرفرفة: سريعة بالإقلاع، هادية وقت الانزلاق
    this.phase += dt * lerp(0, this.flapSpeed, F);
    const amp = this.flapAmp ?? 1;  // 1 رفرفة كاملة، قريب 0 = انزلاق والجناح مفتوح
    const flap = Math.sin(this.phase) * 0.95 * F * amp;
    const flapLag = Math.sin(this.phase - 0.9) * 0.7 * F * amp;

    // تنفّس ووضعية الجسم
    const breathe = Math.sin(t * 2.1) * 0.012 * P;
    this.body.position.y = breathe + Math.sin(this.phase) * -0.05 * F;
    this.body.rotation.z = lerp(0.0, -0.42, F);         // بالطيران الجسم يصير أفقي
    this.body.scale.setScalar(1 + breathe * 0.6);

    // ---------- السلوكيات (بس وهو واكف) ----------
    let preen = 0, ruffle = 0, hop = 0, flick = 0, stretch = 0, side = 1;
    if (P > 0.95 && this.cawT <= 0) {
      if (!this.act) { this.actT -= dt; if (this.actT <= 0) this.doAct(["preen", "ruffle", "hop", "stretch", "flick", "flick", "hop"][(Math.random() * 7) | 0]); }
    }
    if (this.act) {
      const A = this.act; A.t += dt;
      const u = clamp(A.t / A.d, 0, 1), e = Math.sin(u * Math.PI);
      side = A.side;
      if (A.name === "preen") preen = smooth(clamp(Math.min(u * 3, (1 - u) * 3), 0, 1));
      else if (A.name === "ruffle") ruffle = e;
      else if (A.name === "hop") hop = u;
      else if (A.name === "stretch") stretch = e;
      else flick = e;
      if (u >= 1 || P < 0.95) { this.act = null; this.actT = 2 + Math.random() * 4.5; }
    }
    const cawE = this.cawT > 0 ? Math.sin(clamp(1 - this.cawT / 0.55, 0, 1) * Math.PI) : 0;
    this.body.position.y += hop > 0 ? Math.sin(hop * Math.PI) * 0.09 : 0;
    this.body.rotation.z += -0.24 * cawE - 0.05 * Math.sin(hop * Math.PI);
    this.body.rotation.x = Math.sin(t * 46) * 0.1 * ruffle;
    this.body.rotation.y = side * 0.25 * Math.sin(hop * Math.PI);
    if (this.mantle) { const sc = 1 + ruffle * 0.28 + cawE * 0.1; this.mantle.scale.set(1, sc, sc); this.breast.scale.setScalar(1 + ruffle * 0.25 + cawE * 0.2); }

    for (const w of this.wings) {
      // folded → spread (+ رفرفة حول محور الجسم)
      const ex = Math.max(stretch * (w.s === side ? 0.5 : 0), cawE * 0.12, flick * 0.06, ruffle * 0.08);
      const Fw = Math.max(F, ex);
      this._qf.setFromAxisAngle(this._ax, -flap);
      w.root.quaternion.slerpQuaternions(this.qFold, this._qf, Fw);
      w.root.position.set(lerp(0.02, 0, F), lerp(0.04, 0, F), lerp(0.2, 0.2, F));
      w.hand.rotation.set(lerp(0.0, -flapLag * 0.8, F), lerp(0.0, 0.18, F), 0);
      w.primaries.forEach((f) => { f.rotation.z = Math.PI + lerp(-1.5 + f.userData.t * 0.08, f.userData.spread, F); f.rotation.y = Math.sin(this.phase - 0.4) * 0.1 * F; });
      w.secondaries.forEach((f) => { f.rotation.z = Math.PI + lerp(-1.42 + f.userData.t * 0.12, f.userData.off, F); });
    }

    // الذيل: نازل ومسكّر وهو واكف، مفتوح وأفقي بالطيران
    this.tail.rotation.z = lerp(0.62, -0.32, F) + Math.sin(t * 1.3) * 0.02 * P - 0.32 * cawE - 0.4 * flick;
    this.tail.rotation.y = Math.sin(t * 38) * 0.14 * ruffle;
    this.tailFeathers.forEach((f) => { f.rotation.y = f.userData.t * lerp(0.22, 1.15, F); });

    // الرجلين: تنطوي بالطيران
    for (const l of this.legs) { l.hip.rotation.z = lerp(0.12, 1.25, F) - (l.hip.position.z * side > 0 ? stretch * 0.55 : 0) + Math.sin(hop * Math.PI) * 0.35; l.hip.scale.y = lerp(1, 0.7, F); }

    // ---------- الراس: حركات الغراب المقطّعة (snap) باتجاه الهدف ----------
    const L = this.look;
    L.next -= dt;
    if (L.next <= 0) {
      L.next = 0.25 + Math.random() * 0.75;
      if (this.lookTarget) {
        const local = this.neck.worldToLocal(this.lookTarget.clone());
        L.tYaw = clamp(Math.atan2(-local.z, local.x), -1.0, 1.0);
        L.tPitch = clamp(Math.atan2(local.y - 0.1, Math.hypot(local.x, local.z)), -0.55, 0.5);
      } else { L.tYaw = (Math.random() - 0.5) * 0.9; L.tPitch = (Math.random() - 0.5) * 0.4; }
      L.tTilt = (Math.random() - 0.5) * 0.5; // ميلة الراس الفضولية
    }
    const k = 1 - Math.pow(0.0005, dt); // snap سريع
    L.yaw = lerp(L.yaw, L.tYaw * P, k); L.pitch = lerp(L.pitch, L.tPitch * P, k); L.tilt = lerp(L.tilt, L.tTilt * P, k * 0.6);
    this.neck.rotation.set(L.tilt + preen * 0.3 * side, lerp(L.yaw, side * 1.9, preen), L.pitch + lerp(0, 0.38, F) - preen * 0.45);

    // النعيق
    if (this.cawT > 0) {
      this.cawT -= dt;
      const c = Math.sin(clamp(1 - this.cawT / 0.55, 0, 1) * Math.PI);
      this.lowerPivot.rotation.z = -0.55 * c;
      this.upper.rotation.z = 0.12 * c;
      this.head.position.set(0.06 * c, 0.03 * c, 0);
      this.neck.rotation.z += 0.25 * c;
      this.hackles.scale.setScalar(1 + c * 0.5);
      this.body.rotation.z += 0.08 * c;
    } else {
      // وهو يحك ريشه المنقار يفتح ويسد بسرعة
      this.lowerPivot.rotation.z = preen > 0.5 ? -Math.abs(Math.sin(t * 22)) * 0.18 : 0;
      this.upper.rotation.z = 0; this.head.position.set(0, 0, 0); this.hackles.scale.setScalar(1 + ruffle * 0.3);
    }

    // رمشة
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12 ? 0.15 : 1;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    for (const e of this.eyes) e.scale.y = blink;
  }

  // ---------- عيّنات من سطح الغراب (للتفتت لجزيئات) ----------
  sample(count) {
    this.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    const tris = [];
    let total = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const g = o.geometry, p = g.attributes.position, ix = g.index;
      const n = ix ? ix.count : p.count;
      for (let i = 0; i < n; i += 3) {
        const i0 = ix ? ix.getX(i) : i, i1 = ix ? ix.getX(i + 1) : i + 1, i2 = ix ? ix.getX(i + 2) : i + 2;
        a.fromBufferAttribute(p, i0).applyMatrix4(m); b.fromBufferAttribute(p, i1).applyMatrix4(m); c.fromBufferAttribute(p, i2).applyMatrix4(m);
        const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() * 0.5;
        if (area <= 0) continue;
        total += area;
        tris.push([a.clone(), b.clone(), c.clone(), total, o === this.eyes[0] || o === this.eyes[1]]);
      }
    });
    const out = new Float32Array(count * 3), eye = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * total;
      let lo = 0, hi = tris.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; tris[mid][3] < r ? (lo = mid + 1) : (hi = mid); }
      const [A, B, C, , isEye] = tris[lo];
      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      out[i * 3] = A.x + (B.x - A.x) * u + (C.x - A.x) * v;
      out[i * 3 + 1] = A.y + (B.y - A.y) * u + (C.y - A.y) * v;
      out[i * 3 + 2] = A.z + (B.z - A.z) * u + (C.z - A.z) * v;
      eye[i] = isEye ? 1 : 0;
    }
    return { points: out, eye };
  }
}
