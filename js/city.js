// =============================================================
//  City — الموصل من بيانات OpenStreetMap الحقيقية (data/mosul.bin)
//  • كل بناية = مضلّعها الحقيقي من الـ GPS، مرفوع بارتفاعها (من الوسم، أو تقدير حسب المساحة)
//  • كل شارع = خطه الحقيقي بعرض حسب صنفه
//  • دجلة والحدائق والمقابر والغابات = مضلّعاتها الحقيقية
//  • الجسور من البيانات، وسور نينوى، وسكة القطار
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { Water } from "../vendor/addons/objects/Water.js?v=69";
import { M_PER_U, WATER_Y, terrain, getDEM, ll } from "./geo.js?v=69";

const Q = 0.25;
const ROAD_CLS = ["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "service", "pedestrian", "track", "footway", "path", "steps", "cycleway", "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link", "road", "corridor"];
const MAJOR = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"]);
const MINOR_FOOT = new Set(["footway", "path", "steps", "cycleway", "corridor", "track"]);

// ---------------- قراءة الملف ----------------
export function parseCity(buf) {
  const dv = new DataView(buf); let o = 0;
  const u8 = () => dv.getUint8(o++), u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; }, i16 = () => { const v = dv.getInt16(o, true); o += 2; return v; }, u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; }, i8 = () => dv.getInt8(o++);
  const magic = String.fromCharCode(u8(), u8(), u8(), u8()); u32();
  if (magic !== "MOSL") throw new Error("bad city file");
  // كل الاحداثيات تتحول: x شرق (م) → x/8 ، y شمال (م) → z = -y/8
  const ring = (n) => { const a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = (i16() * Q) / M_PER_U; a[i * 2 + 1] = -(i16() * Q) / M_PER_U; } return a; };
  const buildings = []; let n = u32();
  for (let i = 0; i < n; i++) { const nv = u16(), nh = u8(), H = u16() / 10, kind = u8(); const r = ring(nv); const holes = []; for (let k = 0; k < nh; k++) holes.push(ring(u16())); buildings.push({ r, holes, H, kind }); }
  const roads = []; n = u32();
  for (let i = 0; i < n; i++) { const nv = u16(), c = u8(), w = u8() / 4, fl = u8(), lay = i8(); roads.push({ p: ring(nv), cls: ROAD_CLS[c], w, bridge: !!(fl & 1), tunnel: !!(fl & 2), layer: lay }); }
  const areas = []; n = u32();
  for (let i = 0; i < n; i++) { const nv = u16(), k = u8(), nh = u8(); const r = ring(nv); const holes = []; for (let j = 0; j < nh; j++) holes.push(ring(u16())); areas.push({ k, r, holes }); }
  const lines = []; n = u32();
  for (let i = 0; i < n; i++) { const nv = u16(), k = u8(); lines.push({ k, p: ring(nv) }); }
  const points = []; n = u32();
  for (let i = 0; i < n; i++) { const k = u8(), x = (i16() * Q) / M_PER_U, z = -(i16() * Q) / M_PER_U; points.push({ k, x, z }); }
  return { buildings, roads, areas, lines, points };
}

const rng = (a, b) => a + Math.random() * (b - a);
const litChunk = /* glsl */`
uniform vec3 uMoonDir; uniform vec3 uFog; uniform float uFogNear, uFogFar, uTime, uFlash;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 shade(vec3 base, vec3 n){
  float dif = max(dot(n, normalize(uMoonDir)), 0.0);
  float amb = 0.35 + 0.25 * n.y;
  return base * (vec3(0.55, 0.16, 0.14) * dif * 0.9 + vec3(0.09, 0.07, 0.08) * amb) + base * uFlash * 0.25;
}
vec3 fogIt(vec3 c, vec3 w){ return mix(c, uFog, smoothstep(uFogNear, uFogFar, length(w - cameraPosition))); }
`;

// ---------- البنايات: جدار (u,v بالمتر) + سقف ----------
const bVS = /* glsl */`
attribute vec2 aWall; attribute float aSeed; attribute float aKind;
varying vec3 vW; varying vec2 vWall; varying float vSeed; varying float vKind; varying vec3 vN;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vWall = aWall; vSeed = aSeed; vKind = aKind; vN = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const bFS = /* glsl */`
${litChunk}
varying vec3 vW; varying vec2 vWall; varying float vSeed; varying float vKind; varying vec3 vN;
void main(){
  vec3 n = normalize(vN);
  // حجر وجص موصلي (رمادي-بيج) وبيوت المدينة القديمة أدفى شوية
  vec3 stone = mix(vec3(0.46, 0.42, 0.36), vec3(0.33, 0.32, 0.30), hash(vec2(vSeed * 13.0, 1.0)));
  if (vKind > 1.5 && vKind < 2.5) stone = mix(vec3(0.50, 0.44, 0.35), vec3(0.40, 0.35, 0.28), hash(vec2(vSeed * 7.0, 3.0)));
  vec3 col = shade(stone * 0.55, n);
  if (abs(n.y) < 0.5) {
    vec2 f = vWall;                                  // متر على الجدار
    vec2 g = vec2(f.x / 3.2, (f.y - 0.6) / 3.3);
    vec2 cell = floor(g), q = fract(g);
    float win = step(0.3, q.x) * step(q.x, 0.7) * step(0.38, q.y) * step(q.y, 0.78) * step(0.0, f.y - 1.2);
    win *= step(0.35, hash(cell + vSeed));            // مو كل خلية بيها شباك
    col *= 1.0 - win * 0.55;
    float rnd = hash(cell + vSeed * 31.0);
    float on = step(0.9, rnd);
    float flick = 0.85 + 0.15 * sin(uTime * (0.5 + rnd * 2.0) + rnd * 30.0);
    vec3 warm = mix(vec3(1.0, 0.55, 0.25), vec3(1.0, 0.35, 0.15), hash(cell + 2.0));
    if (rnd > 0.985) warm = vec3(0.35, 0.45, 0.9) * (0.7 + 0.3 * sin(uTime * 7.0 + rnd * 40.0));
    col += warm * win * on * flick * 0.55;
    col *= 0.85 + 0.15 * smoothstep(0.0, 1.5, f.y);   // أغمق قرب الأرض
  } else if (n.y > 0.5) {
    col *= 0.9 + 0.2 * hash(floor(vW.xz * 6.0));
  }
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------- الأرض والمناطق والشوارع (لون لكل رأس) ----------
const fVS = /* glsl */`
attribute vec3 color; attribute float aGlow;
varying vec3 vW; varying vec3 vC; varying float vGlow;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vC = color; vGlow = aGlow; gl_Position = projectionMatrix * viewMatrix * w; }`;
const fFS = /* glsl */`
${litChunk}
varying vec3 vW; varying vec3 vC; varying float vGlow;
void main(){
  vec3 col = shade(vC, vec3(0.0, 1.0, 0.0));
  col *= 0.85 + 0.3 * hash(floor(vW.xz * 3.0));
  col += vec3(1.0, 0.46, 0.17) * vGlow;                // توهج إنارة الشوارع على الإسفلت
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// تثليث مضلع (حلقة Float32 x,z) + ثقوب
function tri(r, holes = []) {
  const toV = (a) => { const v = []; for (let i = 0; i < a.length; i += 2) v.push(new THREE.Vector2(a[i], a[i + 1])); return v; };
  const c = toV(r), hs = holes.map(toV);
  let idx;
  try { idx = THREE.ShapeUtils.triangulateShape(c, hs); } catch (e) { return null; }
  const pts = [...c]; for (const h of hs) pts.push(...h);
  return { pts, idx };
}

// قصّ مضلع على مستطيل (Sutherland–Hodgman)
function clipRect(r, x0, z0, x1, z1) {
  let pts = []; for (let i = 0; i < r.length; i += 2) pts.push([r[i], r[i + 1]]);
  const edges = [[(p) => p[0] >= x0, (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[0] <= x1, (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[1] >= z0, (a, b) => { const t = (z0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), z0]; }],
    [(p) => p[1] <= z1, (a, b) => { const t = (z1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), z1]; }]];
  for (const [inside, cut] of edges) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[i];
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b));
    }
    pts = out; if (pts.length < 3) return null;
  }
  const f = new Float32Array(pts.length * 2); pts.forEach((p, i) => { f[i * 2] = p[0]; f[i * 2 + 1] = p[1]; });
  return f;
}
// ترتيب المثلث حتى يواجه الأعلى (y+) بالمشهد، ويواجه +Z لشبكة Water قبل التدوير
function upTri(pts, f, base, out) {
  const a = pts[f[0]], b = pts[f[1]], c = pts[f[2]];
  const cr = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (cr > 0) out.push(base + f[0], base + f[2], base + f[1]); else out.push(base + f[0], base + f[1], base + f[2]);
}

// يقسّم شبكة مفهرسة لبلاطات حسب مركز كل مثلث (حتى نخفي البعيد)
function splitTiles(V, C, G, I, T) {
  const tiles = new Map();
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const cx = (V[a * 3] + V[b * 3] + V[c * 3]) / 3, cz = (V[a * 3 + 2] + V[b * 3 + 2] + V[c * 3 + 2]) / 3;
    const key = Math.floor(cx / T) + "," + Math.floor(cz / T);
    let tl = tiles.get(key); if (!tl) { tl = { map: new Map(), v: [], c: [], g: [], i: [] }; tiles.set(key, tl); }
    for (const o of [a, b, c]) {
      let n = tl.map.get(o);
      if (n === undefined) { n = tl.v.length / 3; tl.map.set(o, n); tl.v.push(V[o * 3], V[o * 3 + 1], V[o * 3 + 2]); tl.c.push(C[o * 3], C[o * 3 + 1], C[o * 3 + 2]); tl.g.push(G[o]); }
      tl.i.push(n);
    }
  }
  return [...tiles.values()].map((tl) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(tl.v, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(tl.c, 3));
    g.setAttribute("aGlow", new THREE.Float32BufferAttribute(tl.g, 1)); g.setIndex(tl.i); g.computeBoundingSphere();
    return g;
  });
}
const centroid = (r) => { let x = 0, z = 0; const n = r.length / 2; for (let i = 0; i < r.length; i += 2) { x += r[i]; z += r[i + 1]; } return [x / n, z / n]; };

export class City {
  constructor({ data, quality = "high", minArea = 40, treeCap = 9000, exclude = () => false, detail = [], moonDir, bridgeH = () => null }) {
    const hi = quality === "high";
    this.group = new THREE.Group();
    this.U = { uMoonDir: { value: moonDir.clone() }, uFog: { value: new THREE.Color(0.03, 0.004, 0.007) }, uFogNear: { value: 40 }, uFogFar: { value: 260 }, uTime: { value: 0 }, uFlash: { value: 0 } };
    const U = this.U;
    // حدود البيانات
    let X0 = 1e9, X1 = -1e9, Z0 = 1e9, Z1 = -1e9;
    for (const b of data.buildings) for (let i = 0; i < b.r.length; i += 2) { X0 = Math.min(X0, b.r[i]); X1 = Math.max(X1, b.r[i]); Z0 = Math.min(Z0, b.r[i + 1]); Z1 = Math.max(Z1, b.r[i + 1]); }
    this.bounds = { X0, X1, Z0, Z1 };

    // ---------------- الأرض: مستطيل مثقوب بمضلعات الماي ----------------
    const water = data.areas.filter((a) => a.k === 1).map((a) => ({ r: clipRect(a.r, X0 - 40, Z0 - 40, X1 + 40, Z1 + 40), holes: a.holes })).filter((a) => a.r);
    this.water = null;
    {
      // المضلعات المائية: شبكة واحدة لـ Water (انعكاسات)
      const verts = [], idx = []; let base = 0;
      for (const w of water) {
        const t = tri(w.r, w.holes); if (!t) continue;
        for (const p of t.pts) verts.push(p.x, -p.y, 0);   // XY ثم ندوّر −90° حول X → z = p.y
        for (const f of t.idx) upTri(t.pts, f, base, idx);
        base += t.pts.length;
      }
      if (verts.length) {
        const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); wg.setIndex(idx); wg.computeVertexNormals();
        const normals = new THREE.TextureLoader().load("tex/waternormals.jpg", (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
        this.water = new Water(wg, { textureWidth: (hi && !window.__weakGPU) ? 768 : 320, textureHeight: (hi && !window.__weakGPU) ? 768 : 320, waterNormals: normals, sunDirection: moonDir.clone(), sunColor: 0x6a1410, waterColor: 0x020103, distortionScale: 1.6, fog: true, alpha: 1 });
        this.water.material.uniforms.size.value = 3.2;
        this.water.rotation.x = -Math.PI / 2; this.water.position.y = WATER_Y;
        this.group.add(this.water);
      }
    }
    // الأرض: شبكة نموذج الارتفاعات الحقيقي (Copernicus 30م) — مجرى دجلة محفور تحت سطح الماي
    const flatV = [], flatC = [], flatG = [], flatI = [];
    // يقسم المثلثات الكبيرة حتى تلتصق بالتضاريس
    const MAXE = 4.5;
    const pushPoly = (t, y, col, glow = 0) => {
      const tris = [];
      for (const f of t.idx) tris.push([t.pts[f[0]], t.pts[f[1]], t.pts[f[2]]]);
      const out = [];
      while (tris.length) {
        const [A, B, C] = tris.pop();
        const ab = A.distanceTo(B), bc = B.distanceTo(C), ca = C.distanceTo(A), m = Math.max(ab, bc, ca);
        if (m <= MAXE || out.length > 400000) { out.push([A, B, C]); continue; }
        if (m === ab) { const M = A.clone().add(B).multiplyScalar(0.5); tris.push([A, M, C], [M, B, C]); }
        else if (m === bc) { const M = B.clone().add(C).multiplyScalar(0.5); tris.push([A, B, M], [A, M, C]); }
        else { const M = C.clone().add(A).multiplyScalar(0.5); tris.push([A, B, M], [M, B, C]); }
      }
      for (const [A, B, C] of out) {
        const k = flatV.length / 3;
        for (const p of [A, B, C]) { flatV.push(p.x, terrain(p.x, p.y) + y, p.y); flatC.push(col.r, col.g, col.b); flatG.push(glow); }
        const cr = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
        if (cr > 0) flatI.push(k, k + 2, k + 1); else flatI.push(k, k + 1, k + 2);
      }
    };
    const D = getDEM();
    if (D) {
      const gv = [], gc = [], gi = [], base = new THREE.Color(0.075, 0.068, 0.062);
      for (let r = 0; r < D.nr; r++) for (let c = 0; c < D.nc; c++) {
        const p = ll(D.lat0 - r * D.dlat, D.lon0 + c * D.dlon), h = terrain(p.x, p.z);
        gv.push(p.x, h, p.z);
        const v = 0.85 + 0.3 * Math.min(1, Math.max(0, h / 6));          // الأعالي أفتح شوية
        gc.push(base.r * v, base.g * v, base.b * v);
        if (r < D.nr - 1 && c < D.nc - 1) { const k = r * D.nc + c; gi.push(k, k + D.nc, k + 1, k + 1, k + D.nc, k + D.nc + 1); }
      }
      const tMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: fVS, fragmentShader: fFS });
      this.cull = this.cull || [];
      for (const gg of splitTiles(gv, gc, new Float32Array(gv.length / 3), gi, 96)) { const m = new THREE.Mesh(gg, tMat); m.name = "terrain"; this.group.add(m); this.cull.push({ mesh: m, c: gg.boundingSphere.center, r: gg.boundingSphere.radius }); }
    }
    // أرض بعيدة
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050304 }));
    outer.position.y = -1.5; this.group.add(outer);

    // ---------------- المناطق: حدائق، غابات، مقابر، ملاعب ----------------
    const AC = { 2: [0.035, 0.06, 0.03], 3: [0.025, 0.045, 0.022], 4: [0.09, 0.085, 0.075], 5: [0.04, 0.07, 0.035], 7: [0.05, 0.05, 0.052], 10: [0.1, 0.095, 0.09] };
    const AY = { 2: 0.012, 3: 0.012, 4: 0.01, 5: 0.014, 6: 0.006, 7: 0.016, 8: 0.004, 9: 0.008, 10: 0.018 };
    const greens = [];
    for (const a of data.areas) {
      if (!AC[a.k]) continue;
      const t = tri(a.r, a.holes); if (!t) continue;
      const c = AC[a.k]; pushPoly(t, AY[a.k] + 0.03, new THREE.Color(c[0], c[1], c[2]), 0);
      if (a.k === 2 || a.k === 3) greens.push(a);
    }

    // ---------------- الشوارع: شرائط بعرضها الحقيقي ----------------
    const lamps = [], cars = [];
    const ROADC = new THREE.Color(0.026, 0.025, 0.028), FOOTC = new THREE.Color(0.06, 0.055, 0.05);
    const bridgeRoads = [];
    for (const rd of data.roads) {
      if (rd.tunnel) continue;
      if (rd.bridge) { bridgeRoads.push(rd); continue; }
      const p = (() => { const o = [rd.p[0], rd.p[1]]; for (let i = 2; i < rd.p.length; i += 2) { const ax = rd.p[i - 2], az = rd.p[i - 1], bx = rd.p[i], bz = rd.p[i + 1], k = Math.ceil(Math.hypot(bx - ax, bz - az) / 3); for (let j = 1; j <= k; j++) o.push(ax + (bx - ax) * j / k, az + (bz - az) * j / k); } return o; })(), n = p.length / 2;
      const hw = rd.w / M_PER_U / 2, foot = MINOR_FOOT.has(rd.cls), major = MAJOR.has(rd.cls);
      const col = foot ? FOOTC : ROADC;
      const y0 = foot ? 0.06 : major ? 0.08 : 0.07;
      const b = flatV.length / 3;
      for (let i = 0; i < n; i++) {
        const x = p[i * 2], z = p[i * 2 + 1];
        const a = i > 0 ? i - 1 : i, c = i < n - 1 ? i + 1 : i;
        let tx = p[c * 2] - p[a * 2], tz = p[c * 2 + 1] - p[a * 2 + 1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const nx = -tz, nz = tx, h = terrain(x, z) + y0;
        const glow = major ? 0.05 : foot ? 0 : 0.025;
        flatV.push(x + nx * hw, h, z + nz * hw, x - nx * hw, h, z - nz * hw);
        flatC.push(col.r, col.g, col.b, col.r, col.g, col.b); flatG.push(glow, glow);
        if (i < n - 1) { const k = b + i * 2; flatI.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      // إنارة على الشوارع الرئيسية والفرعية (أعمدة كل ~35م)
      if (!foot) {
        const step = (major ? 34 : 46) / M_PER_U;
        let acc = Math.random() * step;
        for (let i = 0; i < n - 1; i++) {
          const ax = p[i * 2], az = p[i * 2 + 1], bx = p[i * 2 + 2], bz = p[i * 2 + 3], L = Math.hypot(bx - ax, bz - az);
          const tx = (bx - ax) / (L || 1), tz = (bz - az) / (L || 1);
          for (let d = acc; d < L; d += step) {
            const x = ax + tx * d, z = az + tz * d;
            for (const s of major ? [-1, 1] : [1]) lamps.push(x - tz * (hw + 0.1) * s, terrain(x, z) + 1.1, z + tx * (hw + 0.1) * s);
          }
          acc = (acc - L) % step; if (acc < 0) acc += step;
          if (major && L > 3 && Math.random() < (hi ? 0.35 : 0.18)) cars.push([ax - tz * hw * 0.4, az + tx * hw * 0.4, bx - tz * hw * 0.4, bz + tx * hw * 0.4, 1, terrain(ax, az) + 0.2]);
        }
      }
    }
    // الجسور من البيانات (عدا اللي نبنيه بالتفصيل): بلاطة مرفوعة + دعامات
    {
      const bv = [], bi = [], piers = [];
      for (const rd of bridgeRoads) {
        if (exclude(...centroid(rd.p), "bridge")) continue;
        const p = rd.p, n = p.length / 2, hw = Math.max(rd.w, 9) / M_PER_U / 2, deck = bridgeH(rd) ?? Math.max(terrain(p[0], p[1]), terrain(p[p.length - 2], p[p.length - 1]), 0.6) + 0.08;
        const b0 = bv.length / 3;
        for (let i = 0; i < n; i++) {
          const x = p[i * 2], z = p[i * 2 + 1], a = i > 0 ? i - 1 : i, c = i < n - 1 ? i + 1 : i;
          let tx = p[c * 2] - p[a * 2], tz = p[c * 2 + 1] - p[a * 2 + 1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
          const nx = -tz, nz = tx;
          bv.push(x + nx * hw, deck, z + nz * hw, x - nx * hw, deck, z - nz * hw, x + nx * hw, deck - 0.22, z + nz * hw, x - nx * hw, deck - 0.22, z - nz * hw);
          if (i < n - 1) { const k = b0 + i * 4; bi.push(k, k + 4, k + 1, k + 1, k + 4, k + 5, k + 2, k + 3, k + 6, k + 3, k + 7, k + 6, k, k + 2, k + 4, k + 2, k + 6, k + 4, k + 1, k + 5, k + 3, k + 3, k + 5, k + 7); }
        }
        // دعامات كل ~40م
        let acc = 0;
        for (let i = 0; i < n - 1; i++) {
          const ax = p[i * 2], az = p[i * 2 + 1], bx = p[i * 2 + 2], bz = p[i * 2 + 3], L = Math.hypot(bx - ax, bz - az);
          for (let d = (5 - acc) / M_PER_U; d < L; d += 40 / M_PER_U) piers.push([ax + (bx - ax) * d / L, az + (bz - az) * d / L, Math.atan2(bx - ax, bz - az), deck]);
          acc = 0;
          for (let s = 0; s < 2; s++) lamps.push(ax + (bx - ax) * (s + 0.5) / 2 - (bz - az) / L * hw, deck + 1.0, az + (bz - az) * (s + 0.5) / 2 + (bx - ax) / L * hw);
          cars.push([ax, az, bx, bz, 1, deck + 0.15]);
        }
      }
      if (bv.length) {
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(bv, 3)); g.setIndex(bi); g.computeVertexNormals();
        this.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4d4944, roughness: 0.95, side: THREE.DoubleSide })));
      }
      if (piers.length) {
        const pg = new THREE.CylinderGeometry(0.22, 0.24, 1, 12); pg.translate(0, 0.5, 0);
        const pm = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x4a4641, roughness: 1 }), piers.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
        piers.forEach(([x, z, a, deck], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); m.compose(v.set(x, WATER_Y - 0.6, z), q, s.set(1, deck - WATER_Y + 0.4, 3.2)); pm.setMatrixAt(i, m); });
        this.group.add(pm);
      }
    }
    // سور نينوى (تل ترابي) + سكة القطار
    {
      const wv = [], wi = [];
      for (const ln of data.lines) {
        if (ln.k !== 4 && ln.k !== 1) continue;
        const p = ln.p, n = p.length / 2;
        const wall = ln.k === 4, hw = wall ? 10 / M_PER_U : 1.6 / M_PER_U, top = wall ? 8 / M_PER_U : 0.03, topW = wall ? 3 / M_PER_U : hw;
        const b0 = wv.length / 3;
        for (let i = 0; i < n; i++) {
          const x = p[i * 2], z = p[i * 2 + 1], a = i > 0 ? i - 1 : i, c = i < n - 1 ? i + 1 : i;
          let tx = p[c * 2] - p[a * 2], tz = p[c * 2 + 1] - p[a * 2 + 1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
          const nx = -tz, nz = tx, h = terrain(x, z);
          wv.push(x + nx * hw, h + 0.01, z + nz * hw, x + nx * topW, h + top, z + nz * topW, x - nx * topW, h + top, z - nz * topW, x - nx * hw, h + 0.01, z - nz * hw);
          if (i < n - 1) { const k = b0 + i * 4; for (let s = 0; s < 3; s++) wi.push(k + s, k + s + 4, k + s + 1, k + s + 1, k + s + 4, k + s + 5); }
        }
      }
      if (wv.length) {
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(wv, 3)); g.setIndex(wi); g.computeVertexNormals();
        this.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 1 })));
      }
    }
    // نبني شبكة الأرض/المناطق/الشوارع
    {
      const gMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: fVS, fragmentShader: fFS });
      this.cull = this.cull || [];
      for (const g of splitTiles(flatV, flatC, flatG, flatI, 48)) { const m = new THREE.Mesh(g, gMat); m.name = "ground"; this.group.add(m); this.cull.push({ mesh: m, c: g.boundingSphere.center, r: g.boundingSphere.radius }); }
    }

    // ---------------- البنايات: مقسّمة بلاطات (حتى تنقص الرسمة البعيدة وتشتغل الـ frustum culling) ----------------
    const T = 48, tiles = new Map();
    let count = 0;
    for (const b of data.buildings) {
      const [cx, cz] = centroid(b.r);
      if (exclude(cx, cz, "building")) continue;
      if (!hi) { let a2 = 0; const r = b.r, n = r.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a2 += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1]; } if (Math.abs(a2) / 2 < minArea / 64) continue; }   // الموبايل: نشيل الغرف الصغيرة (<40م²)
      const t = tri(b.r, b.holes); if (!t) continue;
      const key = Math.floor(cx / T) + "," + Math.floor(cz / T);
      let tl = tiles.get(key); if (!tl) { tl = { list: [], nv: 0, ni: 0 }; tiles.set(key, tl); }
      const ring = b.r.length / 2 + b.holes.reduce((s, h) => s + h.length / 2, 0);
      tl.list.push({ b, t, cx, cz }); tl.nv += ring * 4 + t.pts.length; tl.ni += ring * 6 + t.idx.length * 3;
    }
    const bMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: bVS, fragmentShader: bFS, side: THREE.DoubleSide });
    this.tiles = [];
    for (const [key, tl] of tiles) {
      const nv = tl.nv, ni = tl.ni;
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), wall = new Float32Array(nv * 2), seed = new Float32Array(nv), kind = new Float32Array(nv);
      const index = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let v = 0, k = 0;
      for (const { b, t, cx, cz } of tl.list) {
        const base = terrain(cx, cz) - 0.04, top = base + 0.04 + b.H / M_PER_U, sd = Math.random(), kd = b.kind === 1 ? 2 : b.kind;
        const rings = [b.r, ...b.holes];
        for (const r of rings) {
          const n = r.length / 2; let u = 0, sa = 0;
          for (let i = 0; i < n; i++) { const j = (i + 1) % n; sa += r[i * 2] * r[j * 2 + 1] - r[j * 2] * r[i * 2 + 1]; }
          const sg = sa > 0 ? 1 : -1;
          for (let i = 0; i < n; i++) {
            const ax = r[i * 2], az = r[i * 2 + 1], bx = r[((i + 1) % n) * 2], bz = r[((i + 1) % n) * 2 + 1];
            const L = Math.hypot(bx - ax, bz - az), Lm = L * M_PER_U;
            const nx = sg * (bz - az) / (L || 1), nz = -sg * (bx - ax) / (L || 1);
            const quad = [[ax, base, az, u, 0], [bx, base, bz, u + Lm, 0], [bx, top, bz, u + Lm, b.H], [ax, top, az, u, b.H]];
            for (const [x, y, z, wu, wv] of quad) { pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; nor[v * 3] = nx; nor[v * 3 + 1] = 0; nor[v * 3 + 2] = nz; wall[v * 2] = wu; wall[v * 2 + 1] = wv; seed[v] = sd; kind[v] = kd; v++; }
            const q0 = v - 4;
            index[k++] = q0; index[k++] = q0 + 2; index[k++] = q0 + 1; index[k++] = q0; index[k++] = q0 + 3; index[k++] = q0 + 2;
            u += Lm;
          }
        }
        const r0 = v;
        for (const p of t.pts) { pos[v * 3] = p.x; pos[v * 3 + 1] = top; pos[v * 3 + 2] = p.y; nor[v * 3 + 1] = 1; wall[v * 2] = 0; wall[v * 2 + 1] = 0; seed[v] = sd; kind[v] = kd; v++; }
        { const tmp = []; for (const f of t.idx) upTri(t.pts, f, r0, tmp); for (const q of tmp) index[k++] = q; }
        count++;
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); bg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      bg.setAttribute("aWall", new THREE.BufferAttribute(wall, 2)); bg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)); bg.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
      bg.setIndex(new THREE.BufferAttribute(index, 1)); bg.computeBoundingSphere();
      const mesh = new THREE.Mesh(bg, bMat); mesh.name = 'bld';
      this.group.add(mesh); this.tiles.push({ mesh, c: bg.boundingSphere.center, r: bg.boundingSphere.radius }); (this.cull = this.cull || []).push(this.tiles[this.tiles.length - 1]);
    }
    this.buildings = this.tiles[0]?.mesh;
    this.count = count;

    // ---------------- الأشجار: الحدائق والغابات (داخل مضلعاتها) + أشجار البيانات ----------------
    const trees = [];
    const inPoly = (x, z, r) => { let c = false; for (let i = 0, j = r.length / 2 - 1; i < r.length / 2; j = i++) { const xi = r[i * 2], zi = r[i * 2 + 1], xj = r[j * 2], zj = r[j * 2 + 1]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
    for (const a of greens) {
      let ax0 = 1e9, ax1 = -1e9, az0 = 1e9, az1 = -1e9;
      for (let i = 0; i < a.r.length; i += 2) { ax0 = Math.min(ax0, a.r[i]); ax1 = Math.max(ax1, a.r[i]); az0 = Math.min(az0, a.r[i + 1]); az1 = Math.max(az1, a.r[i + 1]); }
      const st = (a.k === 3 ? 7 : 11) / M_PER_U * (hi ? 1 : 1.5);
      for (let x = ax0; x < ax1; x += st) for (let z = az0; z < az1; z += st) {
        const jx = x + rng(-0.4, 0.4) * st, jz = z + rng(-0.4, 0.4) * st;
        if (inPoly(jx, jz, a.r) && !exclude(jx, jz, "tree")) trees.push([jx, terrain(jx, jz), jz, rng(0.7, 1.2) * (a.k === 3 ? 1.2 : 1)]);
        if (trees.length > (hi ? 26000 : treeCap)) break;
      }
    }
    for (const p of data.points) if (p.k === 1) trees.push([p.x, terrain(p.x, p.z), p.z, rng(0.8, 1.1)]);
    if (trees.length) {
      const tg = new THREE.IcosahedronGeometry(0.45, 0); tg.scale(1, 0.9, 1); tg.translate(0, 0.75, 0);
      const tMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
      const byTile = new Map(), TT = 48;
      for (const tr of trees) { const key = Math.floor(tr[0] / TT) + "," + Math.floor(tr[2] / TT); let a = byTile.get(key); if (!a) byTile.set(key, (a = [])); a.push(tr); }
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
      this.cull = this.cull || [];
      for (const list of byTile.values()) {
        const tm = new THREE.InstancedMesh(tg, tMat, list.length);
        let cx = 0, cz = 0; for (const t of list) { cx += t[0]; cz += t[2]; } cx /= list.length; cz /= list.length;
        let rr = 0; for (const t of list) rr = Math.max(rr, Math.hypot(t[0] - cx, t[2] - cz));
        list.forEach(([x, y, z, sc], i) => { m.compose(p.set(x, y, z), q.setFromAxisAngle(Y, Math.random() * 6.28), s.set(sc, sc * rng(0.85, 1.25), sc)); tm.setMatrixAt(i, m); tm.setColorAt(i, c.setHSL(0.28 + rng(-0.05, 0.05), 0.35, rng(0.05, 0.11))); });
        tm.computeBoundingSphere(); tm.name = "trees"; tm.layers.set(2); this.group.add(tm);
        this.cull.push({ mesh: tm, c: new THREE.Vector3(cx, list[0][1], cz), r: rr + 2, trees: true });
      }
    }

    // ---------------- فوانيس الشوارع ----------------
    for (const p of data.points) if (p.k === 2) lamps.push(p.x, terrain(p.x, p.z) + 1.1, p.z);
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lamps, 3));
    this.lampMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPx: { value: Math.min(devicePixelRatio, 2) }, uFogFar: U.uFogFar },
      vertexShader: `uniform float uPx, uFogFar; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vA = 1.0 - smoothstep(uFogFar * 0.45, uFogFar, -mv.z); gl_PointSize = clamp(50.0 * uPx / -mv.z, 1.7, 14.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1.0, 0.6, 0.3) * smoothstep(.5, .0, d) * vA * 0.95, 1.0); }`,
    });
    this.lamps = new THREE.Points(lg, this.lampMat); this.lamps.frustumCulled = false;
    this.group.add(this.lamps);
    this.addCars = (list) => cars.push(...list);
    this._cars = cars;
  }

  buildCars(hi) {
    const cars = this._cars, N = cars.length * 2;
    const A = new Float32Array(N * 3), B = new Float32Array(N * 3), S = new Float32Array(N), Pp = new Float32Array(N), C = new Float32Array(N);
    let k = 0;
    cars.forEach(([ax, az, bx, bz, side, y = 0.25]) => {
      const L = Math.hypot(bx - ax, bz - az) || 1;
      for (let j = 0; j < 2; j++) {
        const dir = (side > 0) === (j === 0);
        A.set(dir ? [ax, y, az] : [bx, y, bz], k * 3); B.set(dir ? [bx, y, bz] : [ax, y, az], k * 3);
        S[k] = rng(1.2, 2.6) / L * 0.25; Pp[k] = Math.random(); C[k] = j; k++;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(A, 3)); g.setAttribute("aB", new THREE.BufferAttribute(B, 3));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(S, 1)); g.setAttribute("aPhase", new THREE.BufferAttribute(Pp, 1)); g.setAttribute("aCol", new THREE.BufferAttribute(C, 1));
    this.carMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: this.U.uTime, uPx: { value: Math.min(devicePixelRatio, 2) } },
      vertexShader: `attribute vec3 aB; attribute float aSpeed, aPhase, aCol; uniform float uTime, uPx; varying vec3 vC;
        void main(){ float t = fract(uTime * aSpeed + aPhase); vec3 p = mix(position, aB, t);
          vC = aCol > 0.5 ? vec3(1.0, 0.12, 0.08) : vec3(1.0, 0.85, 0.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = clamp(34.0 * uPx / -mv.z, 1.0, 10.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC * smoothstep(.5, .0, d) * 0.8, 1.0); }`,
    });
    const pts = new THREE.Points(g, this.carMat); pts.frustumCulled = false; pts.layers.set(2);
    this.group.add(pts);
  }

  update(dt, t, flash, fogColor, fogNear, fogFar, cam) {
    const U = this.U;
    // البلاطات اللي ورا الضباب ما تنرسم
    if (cam && this.cull) for (const tl of this.cull) tl.mesh.visible = tl.c.distanceTo(cam) - tl.r < fogFar * (tl.trees ? 0.75 : 1.02);
    U.uTime.value = t; U.uFlash.value = flash;
    if (fogColor) U.uFog.value.copy(fogColor);
    U.uFogNear.value = fogNear; U.uFogFar.value = fogFar;
    if (this.water) this.water.material.uniforms.time.value = t * 0.35;
  }
}
