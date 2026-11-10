// =============================================================
//  Feathers — ريش يطيح بفيزياء "ورقة الشجر"
//  جاذبية + مقاومة هوا + رفرفة جانبية + ريح من حركة الماوس
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { featherGeo } from "./crow.js?v=69";

export class Feathers {
  constructor(max = 60) {
    this.max = max;
    const g = featherGeo(0.34, 0.1);
    g.translate(-0.17, 0, 0); // مركز الريشة بالنص حتى تدور حول نفسها
    this.mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.55, metalness: 0.1, flatShading: true, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, this.mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.P = new Float32Array(max * 3); this.V = new Float32Array(max * 3);
    this.ph = new Float32Array(max); this.fq = new Float32Array(max); this.life = new Float32Array(max); this.sc = new Float32Array(max); this.yaw = new Float32Array(max);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.cursor = 0;
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, this._m.makeScale(0, 0, 0));
  }

  spawn(pos, n = 1, vel = null, scale = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      this.P[i * 3] = pos.x + (Math.random() - 0.5) * 0.3; this.P[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2; this.P[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.3;
      this.V[i * 3] = (vel ? vel.x : 0) + (Math.random() - 0.5) * 0.8;
      this.V[i * 3 + 1] = (vel ? vel.y : 0) + Math.random() * 0.6;
      this.V[i * 3 + 2] = (vel ? vel.z : 0) + (Math.random() - 0.5) * 0.4;
      this.ph[i] = Math.random() * 6.28; this.fq[i] = 2.2 + Math.random() * 1.8; this.life[i] = 14; this.sc[i] = scale * (0.7 + Math.random() * 0.6); this.yaw[i] = Math.random() * 6.28;
    }
  }

  // ray: شعاع الماوس بالعالم، rv: سرعة الماوس بالعالم
  update(dt, t, ray, rv) {
    const { P, V } = this, d = Math.min(dt, 0.05);
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= d; this.ph[i] += this.fq[i] * d;
      const i3 = i * 3, s = Math.sin(this.ph[i]), c = Math.cos(this.ph[i]);
      // جاذبية + مقاومة + انزلاق جانبي متأرجح (ورقة شجر)
      V[i3 + 1] += (-1.1 + Math.abs(s) * 0.85) * d;
      V[i3] += c * 1.6 * d + Math.sin(t * 0.25) * 0.15 * d;
      V[i3 + 2] += Math.sin(this.ph[i] * 0.5) * 0.3 * d;
      const drag = Math.exp(-2.4 * d);
      V[i3] *= drag; V[i3 + 1] *= drag; V[i3 + 2] *= drag;
      // ريح من الماوس
      if (ray) {
        this._p.set(P[i3], P[i3 + 1], P[i3 + 2]);
        const dist = ray.distanceToPoint(this._p);
        if (dist < 1.1) { const f = (1 - dist / 1.1) * 3.5 * d; V[i3] += rv.x * f; V[i3 + 1] += rv.y * f + 0.4 * f; V[i3 + 2] += 0.2 * f; }
      }
      P[i3] += V[i3] * d; P[i3 + 1] += V[i3 + 1] * d; P[i3 + 2] += V[i3 + 2] * d;
      if (P[i3 + 1] < -5) this.life[i] = 0;
      const fade = Math.min(1, this.life[i] / 1.5) * this.sc[i];
      this._e.set(c * 0.5 + 0.3, this.yaw[i] + t * 0.15, s * 0.9);
      this._q.setFromEuler(this._e);
      this._m.compose(this._p.set(P[i3], P[i3 + 1], P[i3 + 2]), this._q, this._s.setScalar(this.life[i] > 0 ? fade : 0));
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.visible = any;
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
