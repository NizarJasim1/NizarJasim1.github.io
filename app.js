// =============================================================
//  NJ BLACK CROW — v4
//  درون يطير فوق الموصل الحقيقية (إحداثيات حقيقية، 1 وحدة = 8م)
//  كل قسم بالصفحة = محطة عند معلم، والانتقال بينهم سريع ومن فوق
//  الغراب الأساسي يطير ويه الدرون دائماً، وغربان قريبة وبعيدة وواكفة على المعالم
//  عدّل البيانات من هنا فقط ↓
// =============================================================
import * as THREE from "./vendor/three.module.js?v=69";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js?v=69";
import { EffectComposer } from "./vendor/addons/postprocessing/EffectComposer.js?v=69";
import { RenderPass } from "./vendor/addons/postprocessing/RenderPass.js?v=69";
import { UnrealBloomPass } from "./vendor/addons/postprocessing/UnrealBloomPass.js?v=69";
import { OutputPass } from "./vendor/addons/postprocessing/OutputPass.js?v=69";
import { Crow } from "./js/crow.js?v=69";
import { Flock } from "./js/flock.js?v=69";
import { Sky } from "./js/sky.js?v=69";
import { City, parseCity } from "./js/city.js?v=69";
import { Murder } from "./js/murder.js?v=69";
import { buildYunus } from "./js/yunus.js?v=69";
import { buildPlatform } from "./js/platform.js?v=69";
import { buildGrand } from "./js/grand.js?v=69";
import { GRAND_PLAN } from "./js/grand_plan.js?v=69";
import { buildHadba } from "./js/hadba.js?v=69";
import { buildNuriHall, buildNuriCourt, NURI } from "./js/nuri.js?v=69";
import { buildOldBridge, buildNewBridge } from "./js/bridge.js?v=69";
import { PLACES, M_PER_U, WATER_Y, ll, terrain, setDEM, addFlat } from "./js/geo.js?v=69";
import { Feathers } from "./js/feathers.js?v=69";
import { Dust } from "./js/dust.js?v=69";
import { cursorRope, scramble } from "./js/ui.js?v=69";

// state: "live" = in production · "repo" = public on GitHub
// repo: clicking the project opens it · link: the live site (optional)
const GH = "https://github.com/NizarJasim1";
const PROJECTS = [
  { name: "ONYX", tag: "AUTHORIZATION ENGINE · PYTHON", repo: `${GH}/Onyx`, state: "repo",
    desc: "A black-box engine for authorization bugs in web APIs: IDOR/BOLA, mass assignment, broken function-level access, plus their business-logic cousins like price tampering, skipped workflow steps and coupon replay. It reports a finding only after reading the state back and showing that data actually changed or leaked across users. Standard library only, 780+ tests." },
  { name: "IOLITE", tag: "RECON ENGINE · PYTHON", repo: `${GH}/iolite`, state: "repo",
    desc: "The discovery half of the pipeline. It maps an app's authorization surface from legal sources only (your own captures, served JS and sourcemaps, GraphQL and OpenAPI docs, archived frontends), finds ghost endpoints the UI no longer calls, ranks every route by risk, and writes a ready-to-run spec for ONYX. Runs offline, 380+ tests." },
  { name: "Diamond Sword", tag: "CAPTURE ORCHESTRATOR · PYTHON", repo: `${GH}/diamond-sword`, state: "repo",
    desc: "Turns an authorized session into evidence. You log in as each test account; it explores the app, collapses millions of URLs into a few hundred page templates, creates paired objects for cross-account tests, and records everything as multi-account HAR, staying inside program scope at every request. Strict typing, 260+ tests." },
  { name: "AMP", tag: "LLM EVALUATION · PYTHON", repo: `${GH}/amp`, state: "repo",
    desc: "A pre-registered study of how much of a model generation is reachable by method alone: how much of the Opus 4.8 → Opus 5.5 gap a fixed protocol and tool library recover, with every result checked by external verifiers instead of the model grading itself. Hypotheses and scoring are fixed before any run." },
  { name: "Nabd", tag: "WEB APP · LIVE", repo: `${GH}/Nabd`, link: "https://nabdnet.netlify.app", state: "live",
    desc: "An Arabic internet speed test in one self-contained page. Beyond raw Mbps it measures latency under load, estimates capacity from three independent methods and cross-checks them, and separates the local edge from the real international path. Installable PWA, strict CSP, no tracking." },
];
const CHANNEL = "https://t.me/Nj777777X";

// =============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isTouch = matchMedia("(pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = innerWidth < 760;
const lowEnd = mobile && ((navigator.deviceMemory || 4) <= 3 || (navigator.hardwareConcurrency || 4) <= 4);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rnd = (a, b) => a + Math.random() * (b - a);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const TEST = new URLSearchParams(location.search).has("test");

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin, ...(window.ScrambleTextPlugin ? [ScrambleTextPlugin] : []));

// ---------------- المؤشر ----------------
const cursor = $("#cursor");
if (isTouch) { document.body.classList.add("no-cursor"); cursor.style.display = "none"; }
const cx = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3" });
const cy = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3" });
const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, active: false };
addEventListener("pointermove", (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.nx = (e.clientX / innerWidth) * 2 - 1; pointer.ny = -(e.clientY / innerHeight) * 2 + 1;
  pointer.active = true;
  if (!isTouch) { cx(e.clientX); cy(e.clientY); }
});
const release = () => (pointer.active = false);
addEventListener("pointerleave", release);
addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") release(); });
addEventListener("pointercancel", release);
document.addEventListener("pointerover", (e) => { if (e.target.closest("[data-hover],.prow,.sk,.node")) cursor.classList.add("ring"); });
document.addEventListener("pointerout", (e) => { if (e.target.closest("[data-hover],.prow,.sk,.node")) cursor.classList.remove("ring"); });

// =============================================================
//  السكرول → محطات
// =============================================================
const SECS = ["hero", "about", "arsenal", "chain", "works", "finale"];
let B = [];
function measure() { B = SECS.map((id) => { const e = document.getElementById(id); return [e.offsetTop, e.offsetHeight]; }); }
// يرجع: k = المحطة، tr<1 = انتقال من k-1 الى k، s = التقدم داخل المحطة
function track(y) {
  const vh = innerHeight;
  for (let k = B.length - 1; k >= 1; k--) {
    const top = B[k][0], a = top - vh, b = top + 0.35 * vh;
    if (y >= a) {
      if (y < b) return { k, tr: (y - a) / (b - a), s: 0 };
      const end = top + B[k][1] - vh;
      return { k, tr: 1, s: clamp((y - b) / Math.max(1, end - b), 0, 1) };
    }
  }
  return { k: 0, tr: 1, s: clamp(y / Math.max(1, B[1][0] - vh), 0, 1) };
}
// شفافية لوحة القسم k حسب السكرول
function panelOp(k, y) {
  const vh = innerHeight, [top, h] = B[k];
  if (k === 0) return 1 - sstep(0.12 * vh, 0.6 * vh, y);
  const inn = sstep(top + 0.3 * vh, top + 0.5 * vh, y);
  const out = k === B.length - 1 ? 0 : sstep(top + h - vh - 0.3 * vh, top + h - vh - 0.02 * vh, y);
  return inn * (1 - out);
}
const S = { y: scrollY, vel: 0, lastY: scrollY };
let panels = null, shown = SECS.map(() => false), opC = SECS.map(() => -1);
function drivePanels(y, tr) {
  panels ||= SECS.map((id) => document.querySelector(`#${id} .pin`));
  for (let i = 0; i < SECS.length; i++) {
    const o = panelOp(i, y);
    if (Math.abs(o - opC[i]) > 0.003) {
      opC[i] = o;
      const el = panels[i];
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0,${((1 - o) * 26).toFixed(1)}px,0)`;
      el.style.visibility = o < 0.01 ? "hidden" : "visible";
    }
    if (o > 0.55 && !shown[i]) { shown[i] = true; onShow(i); }
  }
  if (shown[1]) aboutWords(clamp(tr.k === 1 ? tr.s * 1.6 : tr.k > 1 ? 1 : 0, 0, 1));
}
// بدون 3D (WebGL فشل/انقطع على الهاتف): النصوص تشتغل بالسكرول عادي
let flatOn = false;
function flatMode() {
  if (flatOn) return; flatOn = true;
  document.body.classList.add("no3d");
  const c = document.getElementById("stage"); if (c) c.style.display = "none";
  measure(); opC.fill(-1);
  gsap.ticker.add(() => { S.y += (scrollY - S.y) * 0.25; drivePanels(S.y, track(S.y)); });
}

// =============================================================
//  العالم 3D
// =============================================================
let world = null;

function addRim(mat, col = [0.6, 0.05, 0.07], k = 0.6) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(${col.join(",")}) * pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6) * ${k.toFixed(2)};`);
  };
  mat.needsUpdate = true;
}

function initWorld(bufs) {
  if (!bufs) return null;
  setDEM(bufs[1]);
  // الجامع الكبير: الساحة مستوية (نصف قطر ~145م من القبة)
  addFlat(PLACES.grand.x, PLACES.grand.z - 4, 19, 5);
  // منصة الاحتفالات: المدرّجات + الشارع + المنصة الرسمية على أرض مستوية
  addFlat(PLACES.platform.x + 45 / 8, PLACES.platform.z + 10 / 8, 13.5, 5);
  // النبي يونس: المدرّجات والمنصة العلوية مبنية كمجسم، فالأرض تحتها على مستوى الشارع
  addFlat(PLACES.yunus.x + 37 / 8, PLACES.yunus.z - 5 / 8, 15, 4);
  const cityData = parseCity(bufs[0]);
  const canvas = $("#stage");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" }); }
  catch (e) { canvas.style.display = "none"; return null; }
  const hi = !mobile;
  const weak = location.hash === "#lite";   // اختياري: وضع الجهاز الضعيف (يقلل الدقة). الافتراضي = جودة كاملة
  window.__weakGPU = weak;
  renderer.setPixelRatio(weak ? 0.5 : Math.min(devicePixelRatio, lowEnd ? 1 : mobile ? 1.25 : 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 40, innerWidth / innerHeight, 0.15, 1700);
  camera.layers.enable(1); camera.layers.enable(2);
  scene.add(camera);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;

  // ---------- السما + الإضاءة (خافتة حتى تبين ليلة حقيقية) ----------
  const sky = new Sky({ quality: hi ? "high" : "low" });
  scene.add(sky.mesh);
  const moonL = new THREE.DirectionalLight(0xff8a78, 0.55);
  moonL.position.copy(sky.moonDir).multiplyScalar(300);
  scene.add(moonL, new THREE.HemisphereLight(0x3a1c20, 0x080605, 0.55));
  const rig = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffa868, 0, 28, 2); scene.add(l); return l; });
  scene.fog = new THREE.Fog(0x000000, 60, 400);

  // ---------- المعالم بمواقعها الحقيقية (من OSM) ----------
  const W = (g, x, y, z) => g.localToWorld(V3(x, y, z));
  const put = (g, x, y, z, yaw = 0) => { g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g); g.updateMatrixWorld(true); return g; };
  const P2 = (lat, lon) => ll(lat, lon);
  // يحط مجموعة محورها المحلي +x على الخط a→b (lat,lon)
  const alongAxis = (g, a, b, y = 0) => { const A = P2(...a), Bp = P2(...b), dx = Bp.x - A.x, dz = Bp.z - A.z; return put(g, (A.x + Bp.x) / 2, y, (A.z + Bp.z) / 2, Math.atan2(-dz, dx)); };
  // منارة الحدباء: مركز قاعدتها
  const hadba = put(buildHadba(), PLACES.hadba.x, terrain(PLACES.hadba.x, PLACES.hadba.z), PLACES.hadba.z, 0);
  // مصلى النوري: من مضلّع OSM (الضلع الجنوبي = المحور)
  const R = PLACES.nuriHall.ring.map(([la, lo]) => P2(la, lo));
  const hc = R.reduce((s, p) => ({ x: s.x + p.x / 4, z: s.z + p.z / 4 }), { x: 0, z: 0 });
  const hdx = R[1].x - R[0].x + (R[2].x - R[3].x), hdz = R[1].z - R[0].z + (R[2].z - R[3].z), hyaw = Math.atan2(-hdz, hdx);
  const hallY = terrain(hc.x, hc.z);
  const nuri = put(buildNuriHall(), hc.x, hallY, hc.z, hyaw);
  // الصحن: من الواجهة الشمالية للمصلى لحد المنارة
  { const hl = nuri.worldToLocal(V3(PLACES.hadba.x, hallY, PLACES.hadba.z)).multiplyScalar(8);
    put(buildNuriCourt({ x0: hl.x - 6, x1: NURI.L / 2 + 6, zN: hl.z - 6 }), hc.x, hallY, hc.z, hyaw); }
  // الجسران: محور كل واحد من الـ way بتاعه بـ OSM، y = سطح الماي
  const bridge = alongAxis(buildOldBridge(), PLACES.bridge.a, PLACES.bridge.b, WATER_Y);
  const bridge2 = alongAxis(buildNewBridge(), PLACES.bridgeNew.a, PLACES.bridgeNew.b, WATER_Y);
  const grand = put(buildGrand(), PLACES.grand.x, terrain(PLACES.grand.x, PLACES.grand.z), PLACES.grand.z, 0);
  const platform = put(buildPlatform(), PLACES.platform.x, terrain(PLACES.platform.x, PLACES.platform.z), PLACES.platform.z, 0);
  const yunus = put(buildYunus(), PLACES.yunus.x, terrain(PLACES.yunus.x, PLACES.yunus.z), PLACES.yunus.z, 0);
  const yunusExt = yunus.userData.extent.map(([x, z]) => [PLACES.yunus.x + x, PLACES.yunus.z + z]);

  // ---------- المدينة الحقيقية (OSM) ----------
  const nuriZone = [P2(36.3437, 43.1258), P2(36.3423, 43.1276)];
  const inBox = (x, z, a, b) => x > Math.min(a.x, b.x) && x < Math.max(a.x, b.x) && z > Math.min(a.z, b.z) && z < Math.max(a.z, b.z);
  const bc = P2(PLACES.bridge.lat, PLACES.bridge.lon);
  // ساحة الجامع الكبير (متر محلي → وحدات المشهد) — أي بناية مركزها داخلها تنشال (المبنى نفسه موجود بـ Overture)
  const grandPlaza = GRAND_PLAN.plaza.map(([x, z]) => [PLACES.grand.x + x / 8, PLACES.grand.z + z / 8]);
  // منصة الاحتفالات: مضلع المدرّجات + المنصة الرسمية (متر من نقطة OSM: x شرق، y شمال)
  const platStands = [[-50, -50], [-51, -20], [-10, 40], [98, 78], [120, 32]].map(([x, y]) => [PLACES.platform.x + x / 8, PLACES.platform.z - y / 8]);
  const platVip = [PLACES.platform.x + 66.3 / 8, PLACES.platform.z + 58.3 / 8];
  const inPoly = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const exclude = (x, z, kind) => {
    if (kind === "bridge") return Math.hypot(x - bc.x, z - bc.z) < 22;
    if (inBox(x, z, ...nuriZone)) return true;
    if (inPoly(x, z, grandPlaza)) return true;
    if (kind !== "tree" && (inPoly(x, z, platStands) || Math.hypot(x - platVip[0], z - platVip[1]) < 3.2)) return true;
    if (inPoly(x, z, yunusExt)) return true;
    return false;
  };
  const city = new City({ data: cityData, quality: hi ? "high" : "low", minArea: lowEnd ? 90 : 40, treeCap: lowEnd ? 4000 : 9000, exclude, moonDir: sky.moonDir });
  scene.add(city.group);
  // ذاكرة الهاتف: بعد ما تنرفع هندسة المدينة للـ GPU نحذف نسختها من ذاكرة JS (المدينة ثابتة ما تتعدل)
  if (mobile) city.group.traverse((o) => {
    const g = o.geometry; if (!g || o.isInstancedMesh) return;
    g.computeBoundingSphere(); g.computeBoundingBox?.();
    for (const a of Object.values(g.attributes)) a.onUpload(function () { this.array = new this.array.constructor(1); });
    g.index?.onUpload(function () { this.array = new this.array.constructor(1); });
  });
  // فوانيس وسيارات المعالم
  const lamps = [];
  for (const g of [bridge, bridge2]) { const a = g.userData.lampPts || []; for (let i = 0; i < a.length; i += 3) { const p = W(g, a[i], a[i + 1], a[i + 2]); lamps.push(p.x, p.y, p.z); } }
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lamps, 3));
  const lmLamps = new THREE.Points(lg, city.lampMat); lmLamps.frustumCulled = false; scene.add(lmLamps);
  city.addCars([bridge, bridge2].flatMap((g) => (g.userData.lanes || []).map(([ax, az, bx, bz, side, y]) => { const a = W(g, ax, y, az), b = W(g, bx, y, bz); return [a.x, a.z, b.x, b.z, side, a.y]; })));
  city.buildCars(hi);
  if ((mobile || weak) && city.water) { const ob = city.water.onBeforeRender; let fc = 0; const mk = weak ? 3 : 1; city.water.onBeforeRender = function (...a) { if ((fc++ & mk) === 0) ob.apply(this, a); }; }

  // ---------- غربان المعالم (رسمة وحدة للكل) ----------
  const murder = new Murder(128);
  murder.mesh.layers.set(1);
  scene.add(murder.mesh);
  const yawOf = (o) => new THREE.Euler().setFromQuaternion(o.getWorldQuaternion(new THREE.Quaternion()), "YXZ").y;
  function populate(group, lm, { n = 15, scale = 0.18, fly = 0.35, orbitN = 6, r = [6, 14], h = [1.5, 5], disturbR = 20 } = {}) {
    const top = lm.localToWorld(lm.userData.top.clone()), centerF = (o) => o.copy(top);
    const P = lm.userData.perches.slice().sort(() => Math.random() - 0.5).slice(0, n);
    for (const pp of P) {
      const w = pp.o.localToWorld(pp.p.clone()), yw = pp.yaw + yawOf(pp.o), flies = Math.random() < fly, rr = rnd(r[0], r[1]);
      murder.add({ perch: (o) => o.copy(w), yaw: yw, scale: scale * rnd(0.9, 1.12), group, disturbR: flies ? disturbR : 0,
        orbit: flies ? { center: centerF, r: rr, h: rnd(h[0], h[1]), speed: (Math.random() < 0.5 ? -1 : 1) * rnd(1.6, 2.4) / rr, squash: rnd(0.7, 1) } : null });
    }
    for (let i = 0; i < orbitN; i++) { const rr = rnd(r[0], r[1] * 1.4); murder.add({ perch: centerF, always: true, scale: scale * rnd(0.9, 1.1), group, orbit: { center: centerF, r: rr, h: rnd(h[0], h[1] * 1.3), speed: (i % 2 ? -1 : 1) * rnd(1.6, 2.6) / rr, squash: rnd(0.6, 1) } }); }
  }
  populate("bridge", bridge, { n: 16, scale: 0.2, r: [5, 14], h: [1, 4], disturbR: 21 });
  populate("nuri", hadba, { n: 12, scale: 0.15, r: [2.5, 7], h: [1, 4], disturbR: 14 });
  populate("nuri", nuri, { n: 8, scale: 0.15, r: [3, 8], h: [1, 4], disturbR: 14 });
  populate("grand", grand, { n: 16, scale: 0.2, r: [7, 15], h: [2, 7], disturbR: 30 });
  populate("platform", platform, { n: 15, scale: 0.2, r: [6, 16], h: [2, 6], disturbR: 30 });
  populate("yunus", yunus, { n: 15, scale: 0.21, r: [6, 13], h: [2, 6], disturbR: 44 });
  // غربان قريبة تعبر قدام الكاميرا
  const nearC = V3(), nearF = (o) => o.copy(nearC);
  for (let i = 0; i < (mobile ? 5 : 8); i++) { const rr = rnd(3.5, 7.5); murder.add({ perch: nearF, always: true, scale: rnd(0.16, 0.22), group: "near", orbit: { center: nearF, r: rr, h: rnd(-1.2, 1.4), speed: (i % 2 ? -1 : 1) * rnd(1.8, 2.6) / rr, squash: rnd(0.5, 0.9) } }); }

  // ---------- المحطات ----------
  const F = (g) => g.localToWorld(g.userData.focus.clone());
  const hadbaP = hadba.localToWorld(V3(0.15, 3.2, 0));
  // مدار حول هدف: A زوايا (راديان، 0 = شرق، موجب = جنوب)، R نصف قطر، H ارتفاع فوق الهدف
  const orbit = (T, R, H, A) => (s, P, L) => { const e = sstep(0, 1, s), a = lerp(A[0], A[1], e); P.set(T.x + Math.cos(a) * lerp(R[0], R[1], e), T.y + lerp(H[0], H[1], e), T.z + Math.sin(a) * lerp(R[0], R[1], e)); L.copy(T); };
  const m = mobile ? 1 : 0;
  const BW = bridge.localToWorld(V3(0, bridge.userData.deckY + 0.3, 0.6));
  const ST = [
    { key: "hero", group: null, name: "Mosul Skyline", sub: "Tigris River · Old City · Nineveh", ll: [36.345, 43.137], fog: [160, 900], sky: [0, 0, 0.065],
      pose: (s, P, L) => { const e = sstep(0, 1, s); P.set(lerp(m ? 150 : 170, m ? 120 : 130, e), lerp(m ? 95 : 80, m ? 75 : 62, e), lerp(m ? 260 : 230, m ? 210 : 180, e)); L.set(lerp(-40, -50, e), lerp(4, 2, e), lerp(-120, -90, e)); }, frame: [0, m ? 0.12 : 0] },
    { key: "bridge", group: "bridge", lm: bridge, name: "The Old Bridge", sub: "1934 · 8 iron spans · 293 m", ll: [PLACES.bridge.lat, PLACES.bridge.lon], fog: [35, 300], sky: [0, 0, 0.07],
      pose: orbit(BW, m ? [24, 18] : [22, 16], m ? [4.5, 3] : [4, 2.6], m ? [1.2, 1.7] : [1.35, 1.95]), frame: [m ? 0 : -0.17, m ? 0.2 : 0],
      lights: [[-14, 1.5, 3], [10, 1.5, -3], [2, 3, 4]], li: 12 },
    { key: "grand", group: "grand", lm: grand, name: "Great Mosque of Mosul", sub: "Al-Zira’i District · 17 domes · under construction", ll: [PLACES.grand.lat, PLACES.grand.lon], fog: [50, 380], sky: [0.08, 0, 0.06],
      pose: orbit(F(grand), m ? [34, 27] : [29, 22], m ? [9, 6] : [8, 5.2], [-0.95, -1.75]), frame: [m ? 0 : -0.17, m ? 0.2 : 0],
      lights: [[0, 4.5, -9], [-7, 2.2, -11], [7, 2.2, -11]], li: 10 },
    { key: "platform", group: "platform", lm: platform, name: "Celebrations Platform", sub: "Stands · Waterfall · Official podium", ll: [PLACES.platform.lat, PLACES.platform.lon], fog: [45, 330], sky: [0.2, 0, 0.07],
      pose: orbit(F(platform), m ? [21, 16] : [18, 13.5], m ? [5.5, 3.6] : [4.8, 3], m ? [1.55, 2.05] : [1.5, 2.15]), frame: [m ? 0 : -0.17, m ? 0.2 : 0],
      lights: [[3.4, 3.6, -0.2], [8.3, 2.6, 5.0], [6.5, 3.2, -4.5]], li: 6 },
    { key: "yunus", group: "yunus", lm: yunus, name: "Prophet Yunus Mosque", sub: "Tell al-Tawba · Nineveh · opened 2026", ll: [PLACES.yunus.lat, PLACES.yunus.lon], fog: [55, 420], sky: [0.6, 0, 0.11],
      pose: orbit(F(yunus).add(V3(0, 1, 0)), m ? [36, 29] : [30, 24], m ? [7, 5] : [6.5, 4.5], [2.3, 2.9]), frame: [m ? 0 : -0.17, m ? 0.2 : 0],
      lights: yunus.userData.lightPts, li: 10 },
    { key: "hadba", group: "nuri", lm: hadba, name: "Al-Hadba Minaret", sub: "Al-Nuri Mosque · 1172 · rebuilt 2024", ll: [PLACES.hadba.lat, PLACES.hadba.lon], fog: [30, 280], sky: [0.15, 1, 0.09],
      pose: orbit(hadbaP, m ? [19, 15] : [16, 12.5], m ? [2.4, 1.6] : [2.2, 1.5], [0.55, 1.05]), frame: [m ? 0 : -0.17, m ? 0.2 : 0],
      lights: [[2.5, 0.4, 2.5], [-2.5, 0.4, 2.5], [2.5, 0.4, -2.5]], li: 9 },
  ];
  ST.forEach((s) => { if (s.lights) s.lightW = s.lights.map(([x, y, z]) => W(s.lm, x, y, z)); });
  camera.rotation.order = "YXZ";

  // ---------- الغراب الأساسي: يطير دائماً ويه الدرون ----------
  const guide = new Crow({ quality: hi ? "high" : "low" });
  guide.fly = 1; guide.flapSpeed = 8;
  guide.root.traverse((o) => o.layers.set(1));
  scene.add(guide.root);
  for (const mat of guide.materials) if (mat !== guide.eyeMat) addRim(mat, [0.5, 0.05, 0.06], 0.24);
  const G = { pos: V3(), prev: V3(), vel: V3(), pvel: V3(), acc: V3(), fwd: V3(1, 0, 0), bank: 0, gT: 0, amp: 1, init: false, loc: V3() };
  // مكانه بالشاشة (إحداثيات الكاميرا): بالبداية قريب، بالمحطات فوق المعلم بالمساحة الفاضية
  const GA = [
    mobile ? { d: 3.8, x: 0.05, y: 0.75, ax: 0.42, ay: 0.2, az: 0.6, sc: 0.32 } : { d: 3.6, x: 1.15, y: 0.62, ax: 0.9, ay: 0.24, az: 0.6, sc: 0.36 },
    mobile ? { d: 4.8, x: -0.68, y: 0.3, ax: 0.2, ay: 0.14, az: 0.5, sc: 0.26 } : { d: 4.8, x: 1.35, y: 1.1, ax: 0.6, ay: 0.22, az: 0.8, sc: 0.32 },
  ];
  const ga = { ...GA[0] };
  const gq = new THREE.Quaternion(), gqr = new THREE.Quaternion(), gm = new THREE.Matrix4(), gx = V3(1, 0, 0), gy = V3(), gz = V3(), upW = V3(0, 1, 0);

  // ---------- شرار النعيق + ريش + رماد ----------
  const EM = 120, emPos = new Float32Array(EM * 3), emVel = new Float32Array(EM * 3), emLife = new Float32Array(EM);
  const emGeo = new THREE.BufferGeometry(); emGeo.setAttribute("position", new THREE.BufferAttribute(emPos, 3).setUsage(THREE.DynamicDrawUsage));
  const embers = new THREE.Points(emGeo, new THREE.PointsMaterial({ color: 0xff3a1a, size: 0.04, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  embers.frustumCulled = false; embers.layers.set(1); scene.add(embers);
  for (let i = 0; i < EM; i++) emPos[i * 3 + 1] = -999;
  const beakTip = V3(), beakDir = V3();
  function burstEmbers() {
    guide.upper.updateWorldMatrix(true, false);
    beakTip.set(0.3, -0.05, 0).applyMatrix4(guide.upper.matrixWorld);
    beakDir.set(1, 0.2, 0).transformDirection(guide.upper.matrixWorld);
    const sc = guide.root.scale.x;
    for (let i = 0; i < EM; i++) {
      emPos.set([beakTip.x, beakTip.y, beakTip.z], i * 3);
      const sp = (0.015 + Math.random() * 0.05) * sc * 1.6;
      emVel[i * 3] = beakDir.x * sp + (Math.random() - 0.5) * 0.03 * sc; emVel[i * 3 + 1] = beakDir.y * sp + (Math.random() - 0.3) * 0.03 * sc; emVel[i * 3 + 2] = beakDir.z * sp + (Math.random() - 0.5) * 0.03 * sc;
      emLife[i] = 0.5 + Math.random() * 0.7;
    }
  }
  const feathers = new Feathers(mobile ? 30 : 56); feathers.mesh.layers.set(1); scene.add(feathers.mesh);
  const dust = new Dust(mobile ? 300 : 700); dust.points.layers.set(1); dust.uniforms.uOpacity.value = 0.45; camera.add(dust.points);

  // ---------- سرب كبير فوق النبي يونس (GPU) ----------
  let flock = null;
  if (renderer.capabilities.isWebGL2 && renderer.extensions.has("EXT_color_buffer_float")) try {
    flock = new Flock(renderer, { width: mobile ? 16 : 32, worldScale: 0.04 });
    flock.haze.visible = false; flock.mesh.layers.set(1);
    flock.uniforms.uCenter.value.copy(yunus.localToWorld(yunus.userData.top.clone())).add(V3(0, 12, 0));
    scene.add(flock.group);
  } catch (e) { console.warn("flock off", e); }

  // ---------- Bloom (ديسكتوب، خفيف) ----------
  let composer = null, bloom = null;
  if (!mobile && !reduce && !weak && !new URLSearchParams(location.search).has("nobloom")) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.32, 0.5, 0.72);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- حالة الكاميرا ----------
  const P = V3(), L = V3(), Pa = V3(), La = V3(), Pb = V3(), Lb = V3(), c1 = V3(), c2 = V3(), tmp = V3(), right = V3(), upC = V3(), fwdC = V3();
  const camPrev = V3(), camVel = V3();
  let time = 0, last = performance.now(), roll = 0, lastYaw = null, fo = [0, 0], cur = -1, lastK = -1, ambientT = 2, fogNear = 60, fogFar = 400;
  const fogCol = new THREE.Color(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), pRay = new THREE.Ray(), pRayL = new THREE.Ray(), predW = V3(), fplane = new THREE.Plane();
  const rv = V3(), lastP = { x: pointer.x, y: pointer.y };
  const placeName = $("#placeName"), placeCoord = $("#placeCoord"), altNum = $("#altNum"), dots = $$("#route li");
  const bez = (a, b, c, d, t, out) => { const u = 1 - t; return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t); };
  measure();
  addEventListener("resize", measure);
  ScrollTrigger.addEventListener("refresh", measure);

  function setStation(i) {
    cur = i;
    const s = ST[i];
    placeName.textContent = s.name;
    placeCoord.textContent = `‎${s.ll[0].toFixed(4)}°N ${s.ll[1].toFixed(4)}°E · ${s.sub}`;
    scramble(placeCoord);
    dots.forEach((d, j) => d.classList.toggle("on", j === i));
  }

  function simulate(dt) {
    time += dt;
    // ---------- السكرول ----------
    S.y += (scrollY - S.y) * (1 - Math.exp(-dt * (reduce ? 30 : 5.5)));
    S.vel = (scrollY - S.lastY) / Math.max(dt, 1e-3); S.lastY = scrollY;
    const tr = track(S.y), k = tr.k;
    // ---------- مسار الدرون ----------
    let wB = 1, from = k, to = k;
    if (tr.tr < 1) {
      from = k - 1; to = k;
      const t = tr.tr, e = easeIO(t);
      ST[from].pose(1, Pa, La); ST[to].pose(0, Pb, Lb);
      const d = Pa.distanceTo(Pb), dy = Math.abs(Pa.y - Pb.y), hump = d * 0.14 * (1 - clamp(dy / (0.3 * d), 0, 1));
      c1.lerpVectors(Pa, Pb, 0.25); c1.y = Math.max(Pa.y, lerp(Pa.y, Pb.y, 0.3) + hump);
      c2.lerpVectors(Pa, Pb, 0.75); c2.y = Math.max(Pb.y, lerp(Pa.y, Pb.y, 0.7) + hump);
      bez(Pa, c1, c2, Pb, e, P);
      L.lerpVectors(La, Lb, sstep(0.04, 0.72, t));
      wB = sstep(0.25, 0.85, t);
    } else ST[k].pose(tr.s, P, L);
    const near = tr.tr < 1 ? (tr.tr < 0.5 ? from : to) : k;
    if (near !== cur) setStation(near);
    // تحليق: اهتزاز درون خفيف + parallax مع الماوس
    const dist = P.distanceTo(L);
    if (!reduce) P.add(tmp.set(Math.sin(time * 0.53) * 0.12, Math.sin(time * 0.71 + 1) * 0.08, Math.cos(time * 0.47) * 0.12).multiplyScalar(clamp(dist / 14, 0.5, 3)));
    camera.position.copy(P);
    camera.lookAt(L);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0); upC.setFromMatrixColumn(camera.matrixWorld, 1);
    if (pointer.active && !reduce) { L.addScaledVector(right, pointer.nx * dist * 0.035).addScaledVector(upC, pointer.ny * dist * 0.022); camera.lookAt(L); }
    // ميلان حسب سرعة الالتفات (إحساس درون)
    const yaw = camera.rotation.y;
    if (lastYaw !== null && dt > 0) { let dyaw = yaw - lastYaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); roll += (clamp(-dyaw / dt * 0.1, -0.16, 0.16) - roll) * (1 - Math.exp(-dt * 3)); }
    lastYaw = yaw;
    camera.rotation.z += roll;
    camera.updateMatrixWorld();
    camVel.copy(camera.position).sub(camPrev).divideScalar(Math.max(dt, 1e-3)); camPrev.copy(camera.position);
    fwdC.set(0, 0, -1).transformDirection(camera.matrixWorld);
    // إطار الصورة: نزيح المعلم بعيد عن لوحة النص
    const fA = ST[from].frame, fB = ST[to].frame, kf = 1 - Math.exp(-dt * 6);
    fo[0] += (lerp(fA[0], fB[0], wB) - fo[0]) * kf; fo[1] += (lerp(fA[1], fB[1], wB) - fo[1]) * kf;
    camera.setViewOffset(innerWidth, innerHeight, fo[0] * innerWidth, fo[1] * innerHeight, innerWidth, innerHeight);

    // ---------- السما والضباب ----------
    const sA = ST[from].sky, sB = ST[to].sky;
    Object.assign(sky.target, { heat: lerp(sA[0], sB[0], wB), dawn: lerp(sA[1], sB[1], wB), moonR: lerp(sA[2], sB[2], wB) });
    sky.update(dt, time, camera.position);
    const dawn = sky.uniforms.uDawn.value;
    fogCol.setRGB(lerp(0.0445, 0.185, dawn), lerp(0.0057, 0.0285, dawn), lerp(0.0095, 0.029, dawn)); // = لون الأفق بالسما
    const nf = lerp(ST[from].fog[0], ST[to].fog[0], wB), ff = lerp(ST[from].fog[1], ST[to].fog[1], wB);
    fogNear += (nf - fogNear) * kf; fogFar += (ff - fogFar) * kf;
    scene.fog.color.copy(fogCol); scene.fog.near = fogNear; scene.fog.far = fogFar;
    city.update(dt, time, sky.flash, fogCol, fogNear, fogFar, camera.position);
    if (k !== lastK) { if (ST[k].key === "yunus") sky.strike(1); else if (ST[k].key === "hadba" && lastK >= 0) sky.strike(0.5); lastK = k; }

    // ---------- أضوية كاشفة على المعلم الحالي ----------
    const stL = ST[near], fade = tr.tr < 1 ? Math.abs(Math.cos(Math.PI * tr.tr)) : 1;
    rig.forEach((l, i) => { if (stL.lightW) { l.position.copy(stL.lightW[i]); l.intensity = stL.li * fade; } else l.intensity = 0; });

    // ---------- الغربان ----------
    nearC.set(0, 0.6, -9).applyMatrix4(camera.matrixWorld);
    murder.setGroup("near", true);
    ST.forEach((st, i) => { if (st.group) murder.setGroup(st.group, i === from || i === to); });
    murder.update(dt, time, camera.position, camera.position);
    // الغراب الأساسي
    const gT = ST[near].key === "hero" ? 0 : 1, kk = 1 - Math.exp(-dt * 2.5);
    for (const key of Object.keys(ga)) ga[key] += (GA[gT][key] - ga[key]) * kk;
    const w = time * 0.5;
    G.loc.set(ga.x + Math.sin(w) * ga.ax, ga.y + Math.sin(w * 1.63 + 1.1) * ga.ay, -ga.d + Math.sin(w * 0.77 + 2) * ga.az);
    G.prev.copy(G.pos);
    G.pos.copy(G.loc).applyMatrix4(camera.matrixWorld);
    if (!G.init) { G.prev.copy(G.pos); G.init = true; }
    tmp.copy(G.pos).sub(G.prev).divideScalar(Math.max(dt, 1e-3));
    G.pvel.copy(G.vel); G.vel.lerp(tmp, 1 - Math.exp(-dt * 7));
    G.acc.lerp(tmp.copy(G.vel).sub(G.pvel).divideScalar(Math.max(dt, 1e-3)), 1 - Math.exp(-dt * 4));
    const sp = G.vel.length();
    if (sp > 0.05) { tmp.copy(G.vel).divideScalar(sp); tmp.y = clamp(tmp.y, -0.45, 0.45); tmp.normalize(); G.fwd.lerp(tmp, 1 - Math.exp(-dt * 5)).normalize(); }
    gz.crossVectors(G.fwd, upW).normalize(); gy.crossVectors(gz, G.fwd);
    gm.makeBasis(G.fwd, gy, gz); gq.setFromRotationMatrix(gm);
    G.bank += (clamp(G.acc.dot(gz) * 0.3, -0.75, 0.75) - G.bank) * (1 - Math.exp(-dt * 4));
    gq.multiply(gqr.setFromAxisAngle(gx, G.bank));
    guide.root.position.copy(G.pos); guide.root.quaternion.copy(gq); guide.root.scale.setScalar(ga.sc);
    // رفرفة ثم انزلاق مثل الغراب الحقيقي؛ وبالانتقال السريع يرفرف أقوى
    G.gT += dt;
    const fast = camVel.length() > 25, glide = !fast && (G.gT % 4.4) > 2.8 && G.vel.y < 0.3;
    G.amp += ((glide ? 0.07 : 1) - G.amp) * (1 - Math.exp(-dt * 3));
    guide.flapAmp = G.amp; guide.flapSpeed = lerp(guide.flapSpeed, fast ? 11.5 : 8.5, 1 - Math.exp(-dt * 2));
    guide.lookTarget = camera.position;
    guide.update(dt, time);

    // ---------- السرب ----------
    if (flock) {
      flock.target = ST[near].key === "yunus" ? 1 : 0;
      ndc.set(pointer.nx, pointer.ny); ray.setFromCamera(ndc, camera);
      fplane.setFromNormalAndCoplanarPoint(fwdC, flock.uniforms.uCenter.value);
      const hit = pointer.active ? ray.ray.intersectPlane(fplane, predW) : null;
      try { flock.update(dt, time, hit); } catch (e) { console.warn("flock off", e); flock.group.visible = false; flock = null; }
    }

    // ---------- شرار، ريش، رماد ----------
    let alive = false;
    for (let i = 0; i < EM; i++) {
      if (emLife[i] <= 0) continue;
      alive = true; emLife[i] -= dt;
      emVel[i * 3 + 1] -= 0.0004;
      emPos[i * 3] += emVel[i * 3]; emPos[i * 3 + 1] += emVel[i * 3 + 1]; emPos[i * 3 + 2] += emVel[i * 3 + 2];
      emVel[i * 3] *= 0.96; emVel[i * 3 + 1] *= 0.96; emVel[i * 3 + 2] *= 0.96;
      if (emLife[i] <= 0) emPos[i * 3 + 1] = -999;
    }
    embers.visible = alive;
    if (alive) emGeo.attributes.position.needsUpdate = true;
    ndc.set(pointer.nx, pointer.ny); ray.setFromCamera(ndc, camera); pRay.copy(ray.ray);
    const fr = dt > 0 ? 1 / (dt * 60) : 1;
    rv.set((pointer.x - lastP.x) * fr, -(pointer.y - lastP.y) * fr, 0).multiplyScalar(0.06).applyQuaternion(camera.quaternion); lastP.x = pointer.x; lastP.y = pointer.y;
    ambientT -= dt;
    if (ambientT < 0) { ambientT = 3 + Math.random() * 4; feathers.spawn(tmp.set(rnd(-2.5, 2.5), 2.6, rnd(-6, -3)).applyMatrix4(camera.matrixWorld), 1, null, 0.45); }
    feathers.update(dt, time, pointer.active ? pRay : null, rv);
    pRayL.copy(pRay).applyMatrix4(camera.matrixWorldInverse);
    dust.update(dt, time, Math.max(0, camVel.dot(fwdC)) * dt * 0.25, pointer.active ? pRayL : null, S.vel / 1000);

    // ---------- اللوحات والـ HUD ----------
    drivePanels(S.y, tr);
    altNum.textContent = Math.max(0, Math.round((camera.position.y - terrain(camera.position.x, camera.position.z)) * M_PER_U));
  }

  function frame() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (document.hidden) return;
    try { simulate(dt); composer ? composer.render() : renderer.render(scene, camera); }
    catch (e) { console.error(e); gsap.ticker.remove(frame); flatMode(); return; }
  }
  if (TEST) {
    gsap.ticker.lagSmoothing(0);
    window.__info = () => { renderer.info.autoReset = false; renderer.info.reset(); composer ? composer.render() : renderer.render(scene, camera); const r = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, station: ST[cur]?.key, cam: camera.position.toArray().map((v) => +v.toFixed(1)), buildings: city.count, crows: murder.agents.length }; renderer.info.autoReset = true; return r; };
    window.__meshes = () => { const out = []; scene.traverse((o) => { if (!o.geometry || !o.visible) return; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); out.push([o.name || o.type + (o.parent?.name ? "@" + o.parent.name : ""), Math.round(n)]); }); out.sort((a, b) => b[1] - a[1]); const agg = {}; for (const [k, n] of out) agg[k] = (agg[k] || 0) + n; return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 14); };
    window.__warp = (sec) => { for (let i = 0; i < sec * 30; i++) simulate(1 / 30); composer ? composer.render() : renderer.render(scene, camera); };
    window.__goto = (k, s = 0.5) => { measure(); const vh = innerHeight; let y; if (k < 0) { const top = B[-k][0]; y = top - vh + s * 1.35 * vh; } else { const top = B[k][0]; y = k === 0 ? s * (B[1][0] - vh) : top + 0.35 * vh + s * (top + B[k][1] - vh - (top + 0.35 * vh)); } scrollTo(0, y); S.y = y; };
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault(); gsap.ticker.remove(frame);
    let n = 0; try { n = +sessionStorage.getItem("njbc_gl") || 0; sessionStorage.setItem("njbc_gl", n + 1); } catch {}
    if (n >= 2) return flatMode();
    sessionStorage.setItem?.("njbc_y", String(scrollY));
    const back = () => { if (!document.hidden) location.reload(); };
    document.hidden ? document.addEventListener("visibilitychange", back) : back();
  });
  // أداء متكيّف: اذا الهاتف ما يلحق، نخفض الدقة تدريجياً بدل ما يعلّق
  let fpsT = 0, fpsN = 0, pr = renderer.getPixelRatio();
  gsap.ticker.add(() => {
    if (!mobile || document.hidden) return;
    fpsT += gsap.ticker.deltaRatio(60) / 60; fpsN++;
    if (fpsN >= 90) { const fps = fpsN / fpsT; fpsT = fpsN = 0;
      if (fps < 26 && pr > 0.7) { pr = Math.max(0.7, pr - 0.15); renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); } }
  });
  let rw = innerWidth, rh = innerHeight;
  function resize() {
    // شريط عنوان الهاتف يغيّر الارتفاع أثناء السكرول: لا تعيد بناء الـ canvas عليه (يسبب ارتجاف وتعليق)
    if (isTouch && innerWidth === rw && Math.abs(innerHeight - rh) < 200) return;
    rw = innerWidth; rh = innerHeight;
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (composer) { composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth / 2, innerHeight / 2); }
  }
  addEventListener("resize", resize);
  gsap.ticker.add(frame);

  const proj = V3();
  return {
    caw() {
      guide.caw(); burstEmbers();
      feathers.spawn(guide.root.position, 1 + ((Math.random() * 2) | 0), V3(0, 0.6, 0), 0.45);
      const st = ST[cur]; if (st?.group) murder.cawAll(st.group);
      murder.cawAll("near");
      if (Math.random() < 0.3) sky.strike(0.45);
    },
    hitCrow(x, y) { proj.copy(guide.root.position).project(camera); const sx = (proj.x * 0.5 + 0.5) * innerWidth, sy = (-proj.y * 0.5 + 0.5) * innerHeight; return Math.hypot(sx - x, sy - y) < (mobile ? 70 : 90); },
  };
}

// =============================================================
//  المحتوى
// =============================================================
function buildProjects() {
  const STATE = { live: "● LIVE", repo: "● PUBLIC ON GITHUB" };
  $("#projects").innerHTML = PROJECTS.map((p, i) => `
    <li class="prow ${p.state}${p.repo ? " has-repo" : ""}"${p.repo ? ` data-repo="${p.repo}" role="link" tabindex="0" aria-label="${p.name} on GitHub"` : ""}>
      <span class="pi">${String(i + 1).padStart(2, "0")}</span>
      <div class="pm">
        <h3>${p.name}</h3>
        <span class="tag">${p.tag}</span>
        <p>${p.desc}</p>
      </div>
      <div class="pe">
        <span class="state">${STATE[p.state]}</span>
        ${p.repo ? `<a class="gh-link" href="${p.repo}" target="_blank" rel="noopener" data-hover>GITHUB ↗</a>` : ""}
        ${p.link ? `<a href="${p.link}" target="_blank" rel="noopener" data-hover>VISIT ↗</a>` : ""}
      </div>
    </li>`).join("");
  const openRepo = (r) => r.querySelector("a.gh-link")?.click();
  $$("#projects .prow").forEach((r) => {
    r.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      if (r.dataset.repo) openRepo(r); else r.classList.toggle("open");
    });
    if (r.dataset.repo) r.addEventListener("keydown", (e) => { if (e.key === "Enter") openRepo(r); });
  });
  $("#about [data-k=projects]").dataset.count = PROJECTS.length;
}

let hitOnce = false;
// ---------------- المهارات ----------------
const SKILL_GROUPS = ["Languages", "Web", "Security", "Engineering", "AI"];
const SKILLS = [
  ["Languages", "Python", "ONYX · IOLITE · Diamond Sword"],
  ["Languages", "JavaScript", "Nabd · this portfolio"],
  ["Languages", "PHP", "Web backends"],
  ["Languages", "Bash", "Tooling & CI scripts"],
  ["Web", "HTML & CSS", "Responsive · RTL"],
  ["Web", "Three.js & GSAP", "3D, scroll-driven motion"],
  ["Web", "PWA", "Installable, offline-ready"],
  ["Security", "Web & API Security", "REST · GraphQL"],
  ["Security", "Access Control", "BOLA/IDOR · BFLA"],
  ["Security", "Attack-Surface Recon", "Endpoint discovery"],
  ["Security", "Traffic Analysis", "Multi-account HAR"],
  ["Engineering", "Linux", "Servers & tooling"],
  ["Engineering", "Git & GitHub Actions", "CI on every repo"],
  ["Engineering", "pytest & mypy", "1,400+ tests · strict typing"],
  ["AI", "Prompt Engineering", "AI-assisted research"],
];
function buildSkills() {
  const tabs = $("#skTabs"), grid = $("#skills"), bar = $(".sk-bar", tabs);
  tabs.insertAdjacentHTML("beforeend", ["All", ...SKILL_GROUPS].map((g, i) =>
    `<button type="button" role="tab" class="sk-tab${i ? "" : " on"}" data-g="${g}" aria-selected="${!i}">${g}</button>`).join(""));
  grid.innerHTML = SKILLS.map(([g, n, u]) => `<li class="sk" data-g="${g}"><b>${n}</b><small>${u}</small></li>`).join("");
  const seen = new Set();
  const moveBar = (t) => { bar.style.width = t.offsetWidth + "px"; bar.style.transform = `translateX(${t.offsetLeft}px)`; };
  const pick = (t) => {
    const g = t.dataset.g;
    $$(".sk-tab", tabs).forEach((x) => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    $$(".sk", grid).forEach((el) => el.classList.toggle("dim", g !== "All" && el.dataset.g !== g));
    moveBar(t);
    if (g !== "All") { seen.add(g); if (seen.size === SKILL_GROUPS.length) flag("throw", "You explored every corner of the stack. 🪶 NJBC{crows_never_drop_loot}"); }
  };
  tabs.addEventListener("click", (e) => { const t = e.target.closest(".sk-tab"); if (t) pick(t); });
  requestAnimationFrame(() => moveBar($(".sk-tab.on", tabs)));
  addEventListener("resize", () => moveBar($(".sk-tab.on", tabs)));
  grid.addEventListener("pointermove", (e) => {
    const el = e.target.closest(".sk"); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`); el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
}

// ---------------- الأعلام المخفية ----------------
const found = new Set(store.get("njbc_flags") || []);
const toastEl = $("#toast");
function updateFlags() { $("#flags").textContent = `🪶 ${found.size}/3`; }
function toast(html) {
  toastEl.innerHTML = html; toastEl.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("show"), 4200);
}
function flag(id, msg) {
  if (found.has(id)) return;
  found.add(id); store.set("njbc_flags", [...found]); updateFlags();
  toast(`${msg}<br><small>Hidden flags found: <b>${found.size}/3</b> — send them through the channel</small>`);
}
console.log("%cNJ", "color:#e01122;font:900 28px sans-serif");
console.log("%cThe crow is watching 👁  Type “crow” anywhere on the page.", "color:#9a9aa2;font:13px monospace");
let typed = "";
addEventListener("keydown", (e) => {
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-4);
  if (typed === "crow") { flag("type", "You called the crow — and it answered. 🪶 NJBC{you_called_the_crow}"); world?.caw(); }
});
let logoClicks = 0;
$(".brandmark").addEventListener("click", () => { if (++logoClicks === 5) flag("logo", "Five knocks on the logo. 🪶 NJBC{five_knocks}"); });

// =============================================================
//  حركات النص (كل قسم يشتغل أول ما تبين لوحته)
// =============================================================
let words = [];
function aboutWords(p) {
  const n = words.length;
  for (let i = 0; i < n; i++) { const o = clamp(p * (n + 4) - i, 0.14, 1); if (words[i]._o !== o) { words[i].style.opacity = o; words[i]._o = o; } }
}
function onShow(i) {
  const pin = $(`#${SECS[i]} .pin`);
  scramble($(".eyebrow", pin));
  if (reduce) return;
  if (i === 1) $$("#about [data-count]").forEach((el) => { const o = { v: 0 }; gsap.to(o, { v: +el.dataset.count, duration: 1.4, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString("en-US")) }); });
  if (i === 2) gsap.from("#projects .prow", { opacity: 0, x: -24, stagger: 0.07, duration: 0.8, ease: "expo.out" });
  if (i === 3) gsap.from("#chain .node", { opacity: 0, y: 24, stagger: 0.18, duration: 0.9, ease: "expo.out" });
  if (i === 4) gsap.from("#skills .sk", { opacity: 0, y: 14, stagger: 0.035, duration: 0.7, ease: "expo.out", clearProps: "opacity,transform" });
  if (i === 5) {
    const fin = SplitText.create("#finale h2", { type: "words", mask: "words" });
    gsap.from(fin.words, { yPercent: 110, stagger: 0.15, duration: 1, ease: "expo.out" });
    gsap.from(["#finale p", "#cta", ".qr"], { opacity: 0, y: 24, stagger: 0.12, duration: 0.8, delay: 0.2 });
  }
}

function story() {
  gsap.to("#bar", { width: "100%", ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 } });
  words = SplitText.create("#aboutText", { type: "words", wordsClass: "w" }).words;
  if (reduce) { words.forEach((w) => (w.style.opacity = 1)); return; }
  const h1 = SplitText.create("#hero h1 span", { type: "words", mask: "words" });
  gsap.timeline({ delay: 0.1 })
    .from(h1.words, { yPercent: 110, stagger: 0.12, duration: 1.1, ease: "expo.out" })
    .from(".kicker", { opacity: 0, duration: 0.6 }, "-=0.7")
    .from(".hero-sub", { opacity: 0, y: 20, duration: 0.8 }, "-=0.5");
  const cta = $("#cta");
  if (!isTouch) {
    cta.addEventListener("pointermove", (e) => { const r = cta.getBoundingClientRect(); gsap.to(cta, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4 }); });
    cta.addEventListener("pointerleave", () => gsap.to(cta, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1,.4)" }));
  }
}

// التنقل: يوديك للمحطة بعد ما يوصل الدرون
function goSection(id) {
  const k = SECS.indexOf(id); if (k < 0) return;
  measure();
  const y = k === 0 ? 0 : B[k][0] + 0.42 * innerHeight;
  scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='#'],[data-go]");
  if (!a) return;
  e.preventDefault();
  goSection(a.dataset.go || a.getAttribute("href").slice(1));
});

// =============================================================
//  التشغيل
// =============================================================
$("#yr").textContent = new Date().getFullYear();
$("#cta").href = CHANNEL;
updateFlags();
buildProjects();

const pct = $("#loader .lpct"), lb = $("#loader .lbar i"), prog = { v: 0 };
const paint = () => { pct.textContent = String(Math.round(prog.v)).padStart(3, "0") + "%"; lb.style.width = prog.v + "%"; };
const loadAnim = gsap.to(prog, { v: 90, duration: 1.6, ease: "power2.out", onUpdate: paint });

const dataP = Promise.all(["data/mosul.bin", "data/dem.bin"].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.arrayBuffer(); }))).catch((e) => { console.error(e); return null; });
Promise.race([Promise.all([document.fonts.load('700 64px "IBM Plex Sans Arabic"'), document.fonts.load('16px "IBM Plex Sans Arabic"')]).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 2500))]).then(() => dataP).then((bufs) => {
  measure();
  try { const y = sessionStorage.getItem("njbc_y"); if (y) { sessionStorage.removeItem("njbc_y"); scrollTo(0, +y); S.y = +y; } } catch {}
  try { world = initWorld(bufs); } catch (e) { console.error(e); world = null; }
  if (!world) flatMode();
  else setTimeout(() => { try { sessionStorage.removeItem("njbc_gl"); } catch {} }, 30000);
  buildSkills();
  addEventListener("click", (e) => {
    if (e.target.closest("a,button,.sk,.prow,.node,input")) return;
    if (!world) return;
    world.caw();
    if (!hitOnce && world.hitCrow(e.clientX, e.clientY)) { hitOnce = true; toast("Nice reflexes — the crow is hard to catch. 🪶"); }
  });
  loadAnim.kill();
  gsap.to(prog, { v: 100, duration: 0.35, onUpdate: paint, onComplete: () => {
    document.body.classList.add("ready"); story();
    if (!isTouch && !reduce) cursorRope(pointer);
    ScrollTrigger.refresh(); measure();
  } });
});
