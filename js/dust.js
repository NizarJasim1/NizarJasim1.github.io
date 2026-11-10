// =============================================================
//  Dust — رماد وجمر يطفي بالعمق
//  يطير باتجاه الكاميرا ويه السكرول (إحساس سفر)، يتبعثر من الماوس،
//  والقريب يصير "bokeh" ناعم مثل عدسة سينما
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";

const X = 14, Y0 = -5, Y1 = 7, Z0 = -28, Z1 = 6.5;

export class Dust {
  constructor(N = 1400) {
    this.N = N;
    const pos = (this.pos = new Float32Array(N * 3)), vel = (this.vel = new Float32Array(N * 3));
    const seed = new Float32Array(N), kind = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * X; pos[i * 3 + 1] = Y0 + Math.random() * (Y1 - Y0); pos[i * 3 + 2] = Z0 + Math.random() * (Z1 - Z0);
      seed[i] = Math.random(); kind[i] = Math.random() < 0.28 ? 1 : 0; // 1 = جمرة حمرة، 0 = رماد
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
    this.uniforms = { uTime: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 2) }, uVel: { value: 0 }, uOpacity: { value: 1 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.uniforms,
      vertexShader: /* glsl */`
        attribute float aSeed, aKind; uniform float uTime, uPx, uVel; varying float vA; varying float vK; varying float vNear;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float z = -mv.z;
          vNear = smoothstep(4.0, 1.2, z);                    // قريب = bokeh
          float tw = 0.6 + 0.4 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 40.0);
          vA = tw * smoothstep(34.0, 18.0, z) * smoothstep(0.25, 1.0, z) * (aKind > 0.5 ? 1.0 : 0.45);
          vK = aKind;
          float sz = (aKind > 0.5 ? 2.2 : 1.5) * (1.0 + vNear * 5.0) * (1.0 + min(abs(uVel), 3.0) * 0.25);
          gl_PointSize = sz * 28.0 * uPx / z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uOpacity; varying float vA; varying float vK; varying float vNear;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.3, 0.45, d);   // حافة bokeh
          float a = mix(core, core * 0.35 + ring * 0.6, vNear);
          vec3 c = vK > 0.5 ? vec3(1.0, 0.22, 0.08) : vec3(0.55, 0.32, 0.3);
          gl_FragColor = vec4(c * a * vA * (1.0 - vNear * 0.55) * uOpacity, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    this.points.frustumCulled = false;
    this._p = new THREE.Vector3();
  }

  // dz: كم تقدمنا بالسفر هالفريم، ray: شعاع الماوس
  update(dt, t, dz, ray, vel) {
    const { pos, vel: v, N } = this, d = Math.min(dt, 0.05);
    this.uniforms.uTime.value = t;
    this.uniforms.uVel.value += (vel - this.uniforms.uVel.value) * 0.1;
    const fwd = dz * 0.9 + 0.25 * d;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const x = pos[i3], y = pos[i3 + 1], z = pos[i3 + 2];
      // ريح ناعمة (شبه curl noise)
      v[i3] += Math.sin(y * 0.45 + t * 0.35 + i) * 0.006 * d;
      v[i3 + 1] += (Math.cos(x * 0.4 + t * 0.3) * 0.004 + 0.0025) * d;
      if (ray && z > -6 && z < 5) {
        this._p.set(x, y, z);
        const dist = ray.distanceToPoint(this._p);
        if (dist < 1.4) {
          ray.closestPointToPoint(this._p, this._p);
          const f = (1 - dist / 1.4) * 2.5 * d;
          v[i3] += (x - this._p.x) * f; v[i3 + 1] += (y - this._p.y) * f;
        }
      }
      v[i3] *= 0.97; v[i3 + 1] *= 0.97;
      const k = d * 60; pos[i3] += v[i3] * k; pos[i3 + 1] += v[i3 + 1] * k; pos[i3 + 2] += fwd;
      if (pos[i3 + 2] > Z1) { pos[i3 + 2] -= Z1 - Z0; pos[i3] = (Math.random() * 2 - 1) * X; pos[i3 + 1] = Y0 + Math.random() * (Y1 - Y0); }
      if (pos[i3 + 2] < Z0) pos[i3 + 2] += Z1 - Z0;
      if (pos[i3 + 1] > Y1) pos[i3 + 1] = Y0; else if (pos[i3 + 1] < Y0) pos[i3 + 1] = Y1;
      if (pos[i3] > X) pos[i3] = -X; else if (pos[i3] < -X) pos[i3] = X;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
