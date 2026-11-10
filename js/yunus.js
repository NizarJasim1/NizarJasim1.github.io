// =============================================================
//  جامع النبي يونس — تل التوبة، نينوى (أُعيد بناؤه وافتُتح نيسان 2026)
//  المصادر: صور الافتتاح (الجزيرة 5/4/2026، شفق نيوز، ويكيميديا 9/4/2026) + صورة Google الحديثة (0.12م/بكسل)
//  من تقرير الجزيرة: الصحن يرتفع ~18م عن الشارع بستة مدرّجات، المئذنة ~40م فوق الصحن، المصلى الجامع 800م²
//  التكوين (من الصور الجوية):
//   • كتلة المصلى العالية: حجر حلان كريمي، رواق أقواس مدببة بدرابزين، صف شبابيك صغيرة مقوّسة، إفريز كتابات
//   • برج مربع بسقف هرمي مثمّن مدبّب (فوق ضريح النبي يونس) + قبتان حجر (كبيرة وصغيرة) + مئذنة أسطوانية بشرفتين مقرنصتين وقمة مخروطية
//   • جناح غربي طويل بأقواس وألواح كتابات ومناور (3×3) على السطح، بوابة بإيوان مدبّب وشريط خط، كشكان بقبة بيضاء بصلية
//   • ستة مدرّجات منحنية على المنحدر الغربي/الجنوبي بأحواض زرع ونخيل
//  الإحداثيات: متر، x شرق، z جنوب، الأصل = نقطة OSM 12919557661. المحور الطويل للمجمّع باتجاه 150° (شمال-شمال-غرب ← جنوب-جنوب-شرق)
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { ashlarTex, bayTex, cylBays, cylM, boxM, extrudeXZ, flatXZ, ribbedDome, finial, mergeAdd, srnd, cv, tex } from "./arch.js?v=69";

const BRG = 150 * Math.PI / 180;
const A = [Math.sin(BRG), Math.cos(BRG)];              // المحور الطويل (شرق، شمال) → جنوب-جنوب-شرق
const B = [Math.sin(BRG - Math.PI / 2), Math.cos(BRG - Math.PI / 2)];   // العمودي → شرق-شمال-شرق
const HALL = [44, 44];                                  // مركز المصلى (شرق، شمال)
// نقطة بإطار المجمّع (a على المحور، b عمودي) → (x, z) المشهد المحلي
const P = (a, b) => { const e = HALL[0] + A[0] * a + B[0] * b, n = HALL[1] + A[1] * a + B[1] * b; return [e, -n]; };
const YAW = Math.atan2(A[1], A[0]);                      // دوران عناصر الإطار حول y بحيث محور x المحلي = A
export const YUNUS = { court: 18, hallH: 20, coneTop: 33, minaret: 40 };

export function buildYunus() {
  const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner);
  const Y0 = YUNUS.court;
  const STONE = [214, 196, 160];
  const as = ashlarTex(STONE, { size: 4, course: 0.5 });
  const stone = new THREE.MeshStandardMaterial({ map: as.map, bumpMap: as.bump, bumpScale: 0.5, roughness: 0.9 });
  const tas = ashlarTex([200, 186, 156], { size: 5, course: 0.6, jitter: 12 });
  const terr = new THREE.MeshStandardMaterial({ map: tas.map, bumpMap: tas.bump, bumpScale: 0.6, roughness: 0.95 });
  const pave = new THREE.MeshStandardMaterial({ map: ashlarTex([206, 198, 182], { size: 6, course: 1.2, jitter: 6 }).map, roughness: 0.9 });
  const green = new THREE.MeshStandardMaterial({ color: 0x3e5a2c, roughness: 1 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.35, metalness: 0.85 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9a5a52, roughness: 0.9 });
  const geo = { stone: [], terr: [], pave: [], green: [], white: [], red: [] };
  const mk = (o) => { const t = bayTex({ base: STONE, ...o }); return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.8, roughness: 0.9 }); };
  // صندوق بإطار المجمّع
  const fbox = (a, b, la, lb, h, y0, list = geo.stone) => { const g = boxM(la, h, lb); g.rotateY(YAW); const [x, z] = P(a, b); g.translate(x, y0 + h / 2, z); list.push(g); return g; };
  // واجهة مستوية بنسيج فتحات: مركز (a,b)، باتجاه (normal) ، عرض w، ارتفاع h
  const facade = (a, b, w, h, y0, ang, mat, bays) => { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * bays); g.rotateY(ang); const [x, z] = P(a, b); g.translate(x, y0 + h / 2, z); inner.add(new THREE.Mesh(g, mat)); };
  const perches = [], palms = [];

  // ================= المنصة العلوية + المدرّجات الستة =================
  const topPoly = [P(-26, -22), P(-26, 18), P(10, 20), P(26, 17), P(32, 8), P(88, -30), P(92, -50), P(80, -72), P(-30, -72), P(-34, -50)];
  // إزاحة مضلع محدّب للخارج
  const offset = (poly, d) => { const n = poly.length, out = []; const area = poly.reduce((s, p, i) => { const q = poly[(i + 1) % n]; return s + p[0] * q[1] - q[0] * p[1]; }, 0), sg = area > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) { const p0 = poly[(i + n - 1) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
      const e1 = [p1[0] - p0[0], p1[1] - p0[1]], e2 = [p2[0] - p1[0], p2[1] - p1[1]], l1 = Math.hypot(...e1), l2 = Math.hypot(...e2);
      const n1 = [sg * e1[1] / l1, -sg * e1[0] / l1], n2 = [sg * e2[1] / l2, -sg * e2[0] / l2];
      if (d < 0.01) { out.push([p1[0], p1[1]]); continue; }
      // وصلة دائرية (المدرّجات منحنية بالصورة)
      let a1 = Math.atan2(n1[1], n1[0]), a2 = Math.atan2(n2[1], n2[0]), da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const k = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 14)));
      for (let j = 0; j <= k; j++) { const a = a1 + (da * j) / k; out.push([p1[0] + Math.cos(a) * d, p1[1] + Math.sin(a) * d]); } }
    return out; };
  // تأكد إنه المضلع محدّب بالترتيب (غلاف)
  const hull = (pts) => { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  const top = hull(topPoly);
  const NT = 6, tw = 8, th = Y0 / NT;
  const levels = [];
  for (let k = NT; k >= 1; k--) {                  // من الأوسع (الأوطى) للأضيق
    const ring = offset(top, k * tw), y1 = (NT - k + 1) * th;
    levels.push({ ring, y1 });
    geo.terr.push(extrudeXZ(ring, -6, y1));
    // حوض زرع على حافة كل مدرّج (شريط أخضر) + نخيل متفرق
    const inner2 = offset(top, (k - 1) * tw + tw * 0.62);
    const n = ring.length;
    for (let i = 0; i < n; i++) { const a = offset(top, k * tw - 1.6)[i], b = offset(top, k * tw - 1.6)[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = boxM(L, 0.5, 2.2); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, y1 + 0.25, (a[1] + b[1]) / 2); geo.green.push(g);
      for (let s = 5 + srnd(0, 10); s < L; s += 26 + srnd(0, 14)) if ((k + i) % 2 === 0) palms.push([a[0] + (b[0] - a[0]) * s / L, y1, a[1] + (b[1] - a[1]) * s / L]); }
    void inner2;
  }
  geo.pave.push(extrudeXZ(top, -6, Y0 + 0.3));
  // الدرج الكبير من البوابة نزولاً (جنوب-جنوب-شرق) — من صورة Google: عرض ~6م
  for (let i = 0; i < 36; i++) { const a = 80 + i * 1.3, topY = Y0 + 0.3 - i * 0.5; if (topY <= 0.2) break; fbox(a, -44, 1.3, 7, topY + 6, -6, geo.pave); }
  for (const sb of [-1, 1]) for (let i = 0; i < 9; i++) { const a = 81 + i * 5.2; fbox(a, -44 + sb * 4, 5.2, 0.6, 1.1, Math.max(0, Y0 - (i + 1) * 2.0), geo.terr); }

  // ================= المصلى =================
  const HL = 44, HW = 30, H = YUNUS.hallH;
  fbox(0, 0, HL, HW, H, Y0);
  fbox(0, 0, HL + 0.8, HW + 0.8, 0.8, Y0 + H);                       // كورنيش
  // الواجهات بنسيج: 3 طبقات (شبابيك سفلية، رواق أقواس، شبابيك عليا + إفريز)
  const hallFacade = mk({ bayW: 4.4, H, rows: [{ y0: 1.5, h: 3.2, w: 1.1 }, { y0: 7.5, h: 5.2, w: 3.0, kind: "pointed", dark: [60, 50, 42] }, { y0: 15.0, h: 2.4, w: 0.9 }], bands: [{ y: 7.0, h: 0.5 }, { y: 12.9, h: 0.5 }, { y: 13.4, h: 1.2, v: -6 }, { y: 18.6, h: 0.6, v: 14 }] });
  // زاوية دوران مستوي الواجهة حسب الجهة: −B (غرب-جنوب-غرب)، +B، +A، −A
  const F_mB = YAW, F_pB = YAW + Math.PI, F_pA = YAW + Math.PI / 2, F_mA = YAW - Math.PI / 2;
  facade(0, -HW / 2 - 0.02, HL, H, Y0, F_mB, hallFacade, 10);      // الواجهة الغرب-جنوب-غربية (تشوفها الكاميرا)
  facade(0, HW / 2 + 0.02, HL, H, Y0, F_pB, hallFacade, 10);
  facade(HL / 2 + 0.02, 0, HW, H, Y0, F_pA, hallFacade, 7);
  facade(-HL / 2 - 0.02, 0, HW, H, Y0, F_mA, hallFacade, 7);
  // درابزين الرواق (شريط أبيض بارز)
  fbox(0, -HW / 2 - 0.5, HL - 2, 1.0, 1.0, Y0 + 7.4, geo.white);
  // البرج المربع بالسقف الهرمي المثمّن (فوق الضريح) — الطرف الشمالي-الشمالي-الغربي
  { const [x, z] = P(-HL / 2 + 6, -HW / 2 + 6); const tb = fbox(-HL / 2 + 6, -HW / 2 + 6, 10, 10, 3.2, Y0 + H); void tb;
    fbox(-HL / 2 + 6, -HW / 2 + 6, 10.6, 10.6, 0.5, Y0 + H + 3.2);
    const ch = YUNUS.coneTop - H - 3.7, g = new THREE.ConeGeometry(5.6, ch, 8, 1); g.rotateY(Math.PI / 8 + YAW); g.translate(x, Y0 + H + 3.7 + ch / 2, z); geo.stone.push(g);
    inner.add(finial(Y0 + YUNUS.coneTop - 0.2, 1.0, brass).translateX(x).translateZ(z)); perches.push([x, Y0 + YUNUS.coneTop + 0.4, z]); }
  // القبتان: رقبة قصيرة + قبة حجر مدببة قليلاً
  for (const [a, r, rise] of [[-2, 7.0, 7.4], [11, 5.4, 5.8]]) {
    const [x, z] = P(a, 0); geo.stone.push(cylM(r + 0.6, Y0 + H, Y0 + H + 1.6, 40, true).translate(x, 0, z));
    inner.add(new THREE.Mesh(ribbedDome(r, rise, 24, { rib: 0, point: 0.18 }).translate(x, Y0 + H + 1.6, z), stone));
    inner.add(finial(Y0 + H + 1.6 + rise * 1.05, 0.8, brass).translateX(x).translateZ(z));
    perches.push([x, Y0 + H + 1.9 + rise, z], [x + r * 0.8, Y0 + H + 1.7, z]);
  }
  // المئذنة: الطرف الجنوبي-الجنوبي-الشرقي من الجهة الشرقية
  { const [x, z] = P(HL / 2 - 3, HW / 2 - 3), R = 1.9, base = Y0 + H;
    const sh = mk({ bayW: (2 * Math.PI * R) / 6, H: 26, rows: [{ y0: 4, h: 1.8, w: 0.45 }, { y0: 14, h: 1.8, w: 0.45 }], bands: [{ y: 9, h: 0.25 }, { y: 19, h: 0.25 }] });
    inner.add(new THREE.Mesh(cylBays(R, Y0 + 6, base + 7, 6, 28).translate(x, 0, z), sh));
    const muq = (y) => { for (let k = 0; k < 4; k++) geo.stone.push(cylM(R + 0.15 + k * 0.22, y + k * 0.32, y + k * 0.32 + 0.34, 28, true).translate(x, 0, z)); geo.stone.push(cylM(R + 1.05, y + 1.28, y + 1.6, 28, true).translate(x, 0, z)); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; geo.white.push(boxM(0.12, 0.9, 0.12, x + Math.cos(a) * (R + 0.95), y + 2.05, z + Math.sin(a) * (R + 0.95))); } };
    const yb1 = Y0 + 26.5, yb2 = Y0 + 33.5;
    inner.add(new THREE.Mesh(cylBays(R, base + 7, yb1, 6, 28).translate(x, 0, z), sh)); muq(yb1);
    geo.stone.push(cylM(R * 0.86, yb1 + 1.6, yb2, 28).translate(x, 0, z)); muq(yb2);
    geo.stone.push(cylM(R * 0.72, yb2 + 1.6, Y0 + 36.6, 24).translate(x, 0, z));
    const cone = new THREE.ConeGeometry(R * 0.85, YUNUS.minaret - 36.6, 16); cone.translate(x, Y0 + 36.6 + (YUNUS.minaret - 36.6) / 2, z); geo.stone.push(cone);
    inner.add(finial(Y0 + YUNUS.minaret - 0.1, 0.7, brass).translateX(x).translateZ(z));
    perches.push([x + R + 0.9, yb1 + 1.7, z], [x, Y0 + YUNUS.minaret + 1.8, z]);
    grp.userData.minaretTop = [x, Y0 + YUNUS.minaret, z];
  }

  // ================= الجناح الغربي الطويل (أروقة + مناور) =================
  { const a0 = -18, a1 = 52, b = -60, w = 12, h = 9;
    fbox((a0 + a1) / 2, b, a1 - a0, w, h, Y0);
    const wf = mk({ bayW: 4.2, H: h, rows: [{ y0: 0.6, h: 5.2, w: 2.6, dark: [70, 58, 46] }], bands: [{ y: 6.6, h: 1.4, v: -4 }, { y: 8.4, h: 0.6, v: 14 }] });
    facade((a0 + a1) / 2, b - w / 2 - 0.02, a1 - a0, h, Y0, F_mB, wf, 17);
    facade((a0 + a1) / 2, b + w / 2 + 0.02, a1 - a0, h, Y0, F_pB, wf, 17);
    for (const a of [-6, 14, 34]) { fbox(a, b, 7, 7, 1.2, Y0 + h, geo.stone); fbox(a, b, 6, 6, 0.15, Y0 + h + 1.2, geo.white); }
  }
  // الصحن (بلاط) + الجناح الشرقي القصير + البوابة
  { fbox(38, -39, 46, 26, 0.35, Y0, geo.pave);
    fbox(38, -22, 40, 6, 6, Y0);
    const gf = mk({ bayW: 4.0, H: 6, rows: [{ y0: 0.4, h: 4.2, w: 2.4, dark: [64, 54, 44] }], bands: [{ y: 5.3, h: 0.7, v: 14 }] });
    facade(38, -25.02, 40, 6, Y0, F_mB, gf, 10);
    // البوابة: إيوان مدبّب بإطار وشريط كتابات
    fbox(70, -40, 8, 16, 11, Y0); fbox(70, -40, 8.6, 16.6, 0.8, Y0 + 11, geo.stone);
    const pf = mk({ bayW: 16, H: 11, rows: [{ y0: 0.3, h: 8.2, w: 6.2, dark: [52, 44, 36] }], bands: [{ y: 9.0, h: 1.3, v: -30 }] });
    facade(74.02, -40, 16, 11, Y0, F_pA, pf, 1);
    facade(65.98, -40, 16, 11, Y0, F_mA, pf, 1);
  }
  // الكشكان بالقباب البيضاء البصلية (قاعدة مثمّنة + درابزين)
  for (const [a, b, s] of [[-3, -35, 1], [40, -38, 0.62]]) {
    const [x, z] = P(a, b), y = Y0 + 0.3;
    const oct = new THREE.CylinderGeometry(6.2 * s, 6.6 * s, 2.0 * s, 8); oct.rotateY(Math.PI / 8 + YAW); oct.translate(x, y + 1.0 * s, z); geo.stone.push(oct);
    for (let i = 0; i < 24; i++) { const ang = i / 24 * 6.283; geo.white.push(boxM(0.18 * s + 0.05, 0.9, 0.18 * s + 0.05, x + Math.cos(ang) * 5.8 * s, y + 2.0 * s + 0.45, z + Math.sin(ang) * 5.8 * s)); }
    const d8 = new THREE.CylinderGeometry(3.4 * s, 3.4 * s, 2.6 * s, 8); d8.rotateY(Math.PI / 8 + YAW); d8.translate(x, y + 2.0 * s + 1.3 * s, z); geo.white.push(d8);
    inner.add(new THREE.Mesh(ribbedDome(3.3 * s, 4.6 * s, 16, { rib: 0, point: 0.32, onion: 0.25 }).translate(x, y + 4.6 * s, z), white));
    inner.add(finial(y + 9.1 * s, 0.6 * s + 0.2, brass).translateX(x).translateZ(z));
    perches.push([x, y + 9.6 * s, z]);
  }
  // سارية العلم الكبيرة (صورة 06_05) — شرق المصلى
  { const [x, z] = P(4, 24); geo.white.push(new THREE.CylinderGeometry(0.18, 0.35, 34, 10).translate(x, Y0 + 17, z));
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.6), (() => { const [c, g] = cv(96, 64); g.fillStyle = "#ce1126"; g.fillRect(0, 0, 96, 21); g.fillStyle = "#fff"; g.fillRect(0, 21, 96, 22); g.fillStyle = "#000"; g.fillRect(0, 43, 96, 21); g.fillStyle = "#007a3d"; g.font = "bold 14px sans-serif"; g.textAlign = "center"; g.fillText("الله أكبر", 48, 37); return new THREE.MeshStandardMaterial({ map: tex(c), side: THREE.DoubleSide, roughness: 0.8 }); })());
    fl.position.set(x + 3.6, Y0 + 31.5, z); inner.add(fl); }

  // نخيل المدرّجات
  if (palms.length) {
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 7, 6); trunk.translate(0, 3.5, 0);
    const crown = new THREE.ConeGeometry(2.6, 2.2, 7, 1, true); crown.rotateX(Math.PI); crown.translate(0, 7.6, 0);
    const tm = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 1 }), palms.length);
    const cm = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0x3f5f2a, roughness: 1, side: THREE.DoubleSide, flatShading: true }), palms.length);
    const m = new THREE.Matrix4();
    palms.forEach(([x, y, z], i) => { const s = srnd(0.8, 1.15); m.makeScale(s, s, s); m.setPosition(x, y, z); tm.setMatrixAt(i, m); cm.setMatrixAt(i, m); });
    inner.add(tm, cm);
  }

  mergeAdd(inner, geo.stone, stone); mergeAdd(inner, geo.terr, terr); mergeAdd(inner, geo.pave, pave); mergeAdd(inner, geo.green, green); mergeAdd(inner, geo.white, white); mergeAdd(inner, geo.red, red);
  inner.scale.setScalar(1 / 8);
  const S = 1 / 8, V3 = (x, y, z) => new THREE.Vector3(x * S, y * S, z * S);
  const [hx, hz] = P(0, 0);
  // أضواء المحطة: على الواجهات الغربية-الجنوبية الغربية (اللي تشوفها الكاميرا) — بالوحدات
  const lightPts = [P(0, -30), P(30, -75), P(-20, -40)].map(([x, z], i) => [x * S, (Y0 + (i ? 6 : 10)) * S, z * S]);
  grp.userData = { ...grp.userData, lightPts, perches: perches.map(([x, y, z]) => ({ o: grp, p: V3(x, y, z), yaw: srnd(0, 6.28) })), top: V3(hx, Y0 + 34, hz), focus: V3(hx - 10, Y0 + 6, hz + 18), height: (Y0 + YUNUS.minaret) * S, extent: offset(top, NT * tw).map(([x, z]) => [x * S, z * S]) };
  return grp;
}
