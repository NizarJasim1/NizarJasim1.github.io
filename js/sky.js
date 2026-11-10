// =============================================================
//  Sky — قبة سما حقيقية (مثبتة بالعالم مو بالشاشة)
//  حتى الدرون من يلف تتحرك السما صح، وانعكاس دجلة يطلع صحيح
//  قمر أحمر باتجاه ثابت، غيوم fbm، نجوم، برق، وهج أضوية المدينة بالأفق
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";

const vert = /* glsl */`
varying vec3 vDir;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDir = normalize(w.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w * 0.9999;
}`;

const frag = /* glsl */`
precision highp float;
varying vec3 vDir;
uniform float uTime, uHeat, uDawn, uFlash, uMoonR, uOct;
uniform vec3 uMoonDir;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 6; i++){ if (float(i) >= uOct) break; v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }

void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  // تدرج: سواد فوق، أحمر غامق خافت بالأفق (ضوء المدينة)
  vec3 top = vec3(0.004, 0.0035, 0.005);
  vec3 hor = mix(vec3(0.022, 0.003, 0.005), vec3(0.13, 0.022, 0.018), uDawn);
  vec3 col = mix(hor, top, smoothstep(-0.02, 0.45, h));

  // القمر
  float ca = dot(d, normalize(uMoonDir));
  float ang = acos(clamp(ca, -1., 1.));
  float r = uMoonR;
  float disc = smoothstep(r, r * 0.97, ang);
  vec3 mu = normalize(cross(uMoonDir, vec3(0., 1., 0.))), mv = cross(mu, normalize(uMoonDir));
  vec2 mq = vec2(dot(d, mu), dot(d, mv)) / r;
  float crater = fbm(mq * 2.4 + 3.1) * 0.6 + fbm(mq * 6.5) * 0.4;
  float limb = sqrt(max(0., 1. - dot(mq, mq)));
  vec3 moonCol = mix(vec3(0.42, 0.03, 0.025), vec3(0.85, 0.24, 0.15), smoothstep(0.35, 0.75, crater)) * (0.5 + 0.55 * limb);
  float halo = exp(-max(ang - r, 0.) * (9.0 / (0.5 + r * 5.))) * 0.4 + exp(-max(ang - r, 0.) * 30.) * 0.35;

  // غيوم على قبة (إسقاط يخلي الغيوم أكبر قرب الأفق)
  vec2 q = d.xz / (h + 0.18) * 0.9 + vec2(uTime * 0.008, uTime * 0.003);
  float c1 = fbm(q * 0.9);
  float c2 = fbm(q * 2.3 - vec2(uTime * 0.015, 0.) + c1 * 1.3);
  float clouds = smoothstep(0.46, 0.9, c1 * 0.62 + c2 * 0.52) * smoothstep(-0.02, 0.2, h);
  float lit = clamp(halo * 1.4 + 0.02 + uHeat * 0.15, 0., 1.);
  vec3 cloudCol = mix(vec3(0.006, 0.002, 0.003), vec3(0.2, 0.022, 0.026), lit);
  cloudCol += vec3(0.85, 0.28, 0.24) * uFlash * (0.35 + c2);

  // نجوم
  vec3 sp = d * 260.;
  vec3 cell = floor(sp);
  float sh = hash3(cell);
  float star = step(0.9965, sh) * smoothstep(0.45, 0.0, length(fract(sp) - .5)) * (0.55 + 0.45 * sin(uTime * (1.5 + sh * 3.) + sh * 50.));
  col += vec3(1., 0.88, 0.85) * star * smoothstep(0.08, 0.5, h) * (1. - clouds) * (1. - clamp(halo * 2., 0., 1.)) * 0.8;

  col += vec3(0.55, 0.05, 0.045) * halo * (0.3 + uHeat * 0.5);
  col = mix(col, moonCol, disc * (1. - clouds * 0.75));
  col = mix(col, cloudCol, clouds * 0.9);
  col += vec3(0.1, 0.008, 0.014) * uHeat * smoothstep(0.9, 0.0, ang);
  col += vec3(0.05, 0.006, 0.01) * smoothstep(0.22, -0.02, h) * (0.45 + uDawn * 1.1);
  col += vec3(0.15, 0.04, 0.045) * uFlash * smoothstep(0.0, 0.6, h);
  if (h < 0.0) col = hor + vec3(0.05, 0.006, 0.01) * (0.45 + uDawn * 1.1); // تحت الأفق = نفس لون الضباب
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor({ quality = "high" } = {}) {
    const az = -0.22, el = 0.24;
    this.uniforms = {
      uTime: { value: 0 }, uHeat: { value: 0 }, uDawn: { value: 0 }, uFlash: { value: 0 }, uMoonR: { value: 0.07 },
      uOct: { value: quality === "high" ? 5 : 3 },
      uMoonDir: { value: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize() },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
    this.flash = 0; this.nextFlash = 7 + Math.random() * 8; this.flashSeq = [];
    this.target = { heat: 0, dawn: 0, moonR: 0.07 };
  }
  get moonDir() { return this.uniforms.uMoonDir.value; }
  strike(power = 1) { this.flashSeq = [[0, power], [0.09, power * 0.35], [0.16, power * 0.9], [0.5, 0]]; this.flashT = 0; }
  update(dt, t, camPos) {
    const u = this.uniforms, k = 1 - Math.exp(-dt * 2), T = this.target;
    this.mesh.position.copy(camPos);
    u.uTime.value = t;
    u.uHeat.value += (T.heat - u.uHeat.value) * k;
    u.uDawn.value += (T.dawn - u.uDawn.value) * k;
    u.uMoonR.value += (T.moonR - u.uMoonR.value) * k;
    this.nextFlash -= dt;
    if (this.nextFlash < 0) { this.strike(0.5 + Math.random() * 0.5); this.nextFlash = 10 + Math.random() * 15; }
    if (this.flashSeq.length) {
      this.flashT += dt; let v = 0;
      for (let i = 0; i < this.flashSeq.length - 1; i++) { const [a, va] = this.flashSeq[i], [b] = this.flashSeq[i + 1]; if (this.flashT >= a && this.flashT < b) v = va * (1 - (this.flashT - a) / (b - a)) ** 2; }
      if (this.flashT > this.flashSeq[this.flashSeq.length - 1][0]) this.flashSeq = [];
      this.flash = v;
    } else this.flash *= 0.9;
    u.uFlash.value = this.flash;
  }
}
