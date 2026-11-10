// =============================================================
//  Murder — "سرب" غربان كامل برسمة وحدة على الـ GPU
//  نخبز الغراب بوضعيتين (واكف + طاير) ونخلّي الشيدر يمزج بيناتهم،
//  ويدوّر الراس والمنقار والذيل والأجنحة لكل غراب لحاله.
//  كل غراب عنده "عقل" صغير: يتلفت، ينعب، يهز ذيله، يگفز،
//  يطير لما الدرون يقرّب منه ويلف حول المَعلم، ويرجع يوكف.
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { Crow } from "./crow.js?v=69";

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

function bakeCrow() {
  const crow = new Crow({ quality: "low", detail: "lite" });
  crow.look.next = 1e9; crow.blinkT = 1e9; crow.actT = 1e9;
  const parts = (o) => {
    for (let p = o; p && p !== crow.root; p = p.parent) {
      if (p === crow.eyes[0] || p === crow.eyes[1]) return 6;
      if (p === crow.lowerPivot) return 2;
      if (p === crow.head) return 1;
      if (p === crow.wings[0].side) return 3;   // جهة +z
      if (p === crow.wings[1].side) return 4;   // جهة -z
      if (p === crow.tail) return 5;
    }
    return 0;
  };
  const snap = () => {
    crow.root.updateMatrixWorld(true);
    const out = [];
    crow.root.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const pos = g.attributes.position.clone().applyMatrix4(o.matrixWorld);
      out.push({ pos, part: parts(o) });
    });
    return out;
  };
  crow.fly = 0; crow.phase = 0; crow.update(0, 0);
  const perched = snap();
  const neck = crow.neck.getWorldPosition(new THREE.Vector3());
  const beak = crow.beakPivot.getWorldPosition(new THREE.Vector3());
  const tail = crow.tail.getWorldPosition(new THREE.Vector3());
  crow.fly = 1; crow.phase = 0; crow.update(0, 0);
  const flight = snap();
  const shR = crow.wings[0].root.getWorldPosition(new THREE.Vector3());
  const shL = crow.wings[1].root.getWorldPosition(new THREE.Vector3());
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(crow.body.getWorldQuaternion(new THREE.Quaternion())).normalize();

  const total = perched.reduce((s, m) => s + m.pos.count, 0);
  const P = new Float32Array(total * 3), P2 = new Float32Array(total * 3), PART = new Float32Array(total);
  let o = 0;
  perched.forEach((m, i) => {
    P.set(m.pos.array, o * 3); P2.set(flight[i].pos.array, o * 3); PART.fill(m.part, o, o + m.pos.count); o += m.pos.count;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
  geo.setAttribute("aPos2", new THREE.BufferAttribute(P2, 3));
  geo.setAttribute("aPart", new THREE.BufferAttribute(PART, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere(); geo.boundingSphere.radius *= 2;
  return { geo, neck, beak, tail, shR, shL, axis, footY: crow.footY };
}

export class Murder {
  constructor(max = 48) {
    const B = (this.bake = bakeCrow());
    this.max = max;
    this.A = new Float32Array(max * 4); this.Bv = new Float32Array(max * 4);
    B.geo.setAttribute("aA", new THREE.InstancedBufferAttribute(this.A, 4).setUsage(THREE.DynamicDrawUsage));
    B.geo.setAttribute("aB", new THREE.InstancedBufferAttribute(this.Bv, 4).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.MeshStandardMaterial({ color: 0x0d0d11, roughness: 0.5, metalness: 0.18, flatShading: true, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uNeck: { value: B.neck }, uBeak: { value: B.beak }, uTail: { value: B.tail }, uShR: { value: B.shR }, uShL: { value: B.shL }, uAxis: { value: B.axis } });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
        attribute vec3 aPos2; attribute float aPart; attribute vec4 aA; attribute vec4 aB;
        uniform vec3 uNeck, uBeak, uTail, uShR, uShL, uAxis;
        varying float vEye;
        vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
        vec3 rotZ(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z); }
        vec3 rotAx(vec3 p, vec3 k, float a){ float c = cos(a), s = sin(a); return p*c + cross(k, p)*s + k*dot(k, p)*(1.0 - c); }
      `).replace("#include <begin_vertex>", `
        vec3 p0 = position; vec3 p1 = aPos2; float part = aPart;
        if (abs(part - 2.0) < 0.1) p0 = rotZ(p0 - uBeak, -aB.x * 0.6) + uBeak;
        if ((part > 0.9 && part < 2.1) || abs(part - 6.0) < 0.1) { vec3 q = p0 - uNeck; q = rotZ(q, aA.w); q = rotY(q, aA.z); p0 = q + uNeck; }
        if (abs(part - 5.0) < 0.1) p0 = rotZ(p0 - uTail, aB.y) + uTail;
        if (abs(part - 3.0) < 0.1) p1 = rotAx(p1 - uShR, uAxis, -aA.y) + uShR;
        if (abs(part - 4.0) < 0.1) p1 = rotAx(p1 - uShL, uAxis, aA.y) + uShL;
        vec3 transformed = mix(p0, p1, aA.x);
        transformed.y += aB.z;
        vEye = abs(part - 6.0) < 0.1 ? 1.0 : 0.0;
      `);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vEye;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(1.0, 0.06, 0.04) * vEye * 2.4;
          // حافة حمرة خفيفة حتى الغراب الأسود يبين على خلفية الليل
          float rimF = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
          totalEmissiveRadiance += vec3(0.5, 0.05, 0.06) * rimF * 0.3;`);
    };
    this.mesh = new THREE.InstancedMesh(B.geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.agents = [];
    this.groups = {};
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, "YXZ"); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._v = new THREE.Vector3();
    this.footY = B.footY;
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, this._m.makeScale(0, 0, 0));
  }

  // perch: دالة ترجع مكان القدم بالعالم. group: اسم المجموعة (للإظهار/الإخفاء)
  add({ perch, yaw = 0, scale = 0.32, group = "main", orbit = null, always = false, disturbR = 4.2 }) {
    if (this.agents.length >= this.max) return null;
    const a = {
      i: this.agents.length, perch, yaw, scale, group, orbit, always, disturbR,
      k: always ? 1 : 0, flap: Math.random() * 6, look: { y: 0, p: 0, ty: 0, tp: 0, next: Math.random() }, caw: 0, cawNext: 3 + Math.random() * 12,
      flick: 0, flickNext: 2 + Math.random() * 8, hop: 0, hopNext: 4 + Math.random() * 14, balance: 0, phase: Math.random() * 6.28, dirYaw: yaw,
      pos: new THREE.Vector3(), home: new THREE.Vector3(),
    };
    this.agents.push(a);
    this.groups[group] ??= { on: 0, target: 0 };
    return a;
  }
  setGroup(name, on) { if (this.groups[name]) this.groups[name].target = on ? 1 : 0; }
  cawAll(group) { for (const a of this.agents) if (a.group === group && Math.random() < 0.6) a.caw = 0.45 + Math.random() * 0.2; }

  update(dt, t, camPos, lookAt) {
    const A = this.A, B = this.Bv, d = Math.min(dt, 0.05);
    for (const g of Object.values(this.groups)) g.on += (g.target - g.on) * (1 - Math.exp(-d * 3));
    for (const a of this.agents) {
      const g = this.groups[a.group], i = a.i;
      if (g.on < 0.02) { this.mesh.setMatrixAt(i, this._m.makeScale(0, 0, 0)); continue; }
      a.perch(a.home);
      // الدرون قريب؟ يطير ويلف حول المعلم
      const dist = camPos.distanceTo(a.home);
      const air = a.always || (a.orbit && dist < a.disturbR) ? 1 : (a.orbit && dist > a.disturbR + 2.5 ? 0 : a.k > 0.5 ? 1 : 0);
      a.k += (air - a.k) * (1 - Math.exp(-d * (air ? 2.6 : 1.1)));
      const k = sstep(0, 1, a.k);
      let px = a.home.x, py = a.home.y - this.footY * a.scale, pz = a.home.z, yaw = a.yaw, bank = 0, F = 0, flap = 0;
      if (a.orbit && k > 0.001) {
        const o = a.orbit, c = o.center(this._v);
        const ang = a.phase + t * o.speed;
        const ox = c.x + Math.cos(ang) * o.r, oy = c.y + o.h + Math.sin(t * 0.8 + a.phase) * 0.35, oz = c.z + Math.sin(ang) * o.r * (o.squash || 1);
        // الاقلاع: قوس صغير لفوق قبل الالتحاق بالدوران
        const lift = Math.sin(k * Math.PI) * 0.8;
        px = lerp(px, ox, k); py = lerp(py, oy, k) + lift; pz = lerp(pz, oz, k);
        const tYaw = Math.atan2(-(Math.cos(ang) * o.r * (o.squash || 1)) * Math.sign(o.speed), -Math.sin(ang) * o.r * Math.sign(o.speed));
        yaw = angLerp(a.yaw, tYaw, k);
        bank = -0.35 * Math.sign(o.speed) * k;
        F = clamp(k * 1.6, 0, 1);
        a.flap += d * 10; flap = Math.sin(a.flap) * 0.95 * F;
      }
      // ---------- سلوك وهو واكف ----------
      const P = 1 - F;
      if (P > 0.5) {
        a.cawNext -= d; if (a.cawNext < 0) { a.caw = 0.5; a.cawNext = 6 + Math.random() * 14; }
        a.flickNext -= d; if (a.flickNext < 0) { a.flick = 0.35; a.flickNext = 3 + Math.random() * 9; }
        a.hopNext -= d; if (a.hopNext < 0) { a.hop = 0.42; a.hopNext = 8 + Math.random() * 16; a.balance = 0.6; }
        // الراس: يتلفت بحركات مقطعة، أحياناً يباوع للكاميرا
        a.look.next -= d;
        if (a.look.next < 0) {
          a.look.next = 0.3 + Math.random() * 1.4;
          if (lookAt && Math.random() < 0.55) {
            const dx = lookAt.x - px, dz = lookAt.z - pz, cy = Math.cos(yaw), sy = Math.sin(yaw);
            const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
            a.look.ty = clamp(Math.atan2(-lz, lx), -1.1, 1.1); a.look.tp = clamp(Math.atan2(lookAt.y - py, Math.hypot(dx, dz)), -0.5, 0.5);
          } else { a.look.ty = (Math.random() - 0.5) * 1.8; a.look.tp = (Math.random() - 0.5) * 0.6; }
        }
      }
      const kk = 1 - Math.pow(0.0004, d);
      a.look.y = lerp(a.look.y, a.look.ty * P, kk); a.look.p = lerp(a.look.p, a.look.tp * P, kk);
      a.caw = Math.max(0, a.caw - d); a.flick = Math.max(0, a.flick - d); a.hop = Math.max(0, a.hop - d);
      a.balance *= Math.exp(-d * 2.2);
      const cawE = a.caw > 0 ? Math.sin((1 - a.caw / 0.5) * Math.PI) : 0;
      const flickE = a.flick > 0 ? Math.sin((1 - a.flick / 0.35) * Math.PI) : 0;
      const hopE = a.hop > 0 ? Math.sin((1 - a.hop / 0.42) * Math.PI) : 0;
      // توازن: رفرفة خفيفة بعد الگفزة
      if (F < 0.3 && a.balance > 0.05) { a.flap += d * 12; F = Math.max(F, a.balance * 0.3); flap = Math.sin(a.flap) * 0.8 * F; }

      A[i * 4] = F; A[i * 4 + 1] = flap; A[i * 4 + 2] = a.look.y; A[i * 4 + 3] = a.look.p + cawE * 0.25;
      B[i * 4] = cawE; B[i * 4 + 1] = -0.35 * cawE - 0.45 * flickE; B[i * 4 + 2] = hopE * 0.1 + Math.sin(t * 2 + a.phase) * 0.006; B[i * 4 + 3] = 0;

      a.pos.set(px, py, pz);
      this._e.set(0, yaw, bank - cawE * 0.22 * P);
      this._q.setFromEuler(this._e);
      this._m.compose(this._p.set(px, py, pz), this._q, this._s.setScalar(a.scale * clamp(g.on * 1.2, 0, 1)));
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.geometry.attributes.aA.needsUpdate = true;
    this.mesh.geometry.attributes.aB.needsUpdate = true;
  }
}
