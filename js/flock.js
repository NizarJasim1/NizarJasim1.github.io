// =============================================================
//  Flock — سرب غربان على الـ GPU
//  مبني على مثال three.js الرسمي webgl_gpgpu_birds (MIT)
//  التعديلات: شكل غراب (ذيل + جناح بمفصلين)، ألوان أسود/أحمر،
//  الماوس = مفترس، شفافية للدخول والخروج، تحويل لإحداثيات مشهدنا
// =============================================================
import * as THREE from "../vendor/three.module.js?v=69";
import { GPUComputationRenderer } from "../vendor/addons/misc/GPUComputationRenderer.js?v=69";

const BOUNDS = 800, BOUNDS_HALF = BOUNDS / 2;

const positionShader = /* glsl */`
uniform float time; uniform float delta;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 tmpPos = texture2D(texturePosition, uv);
  vec3 position = tmpPos.xyz;
  vec3 velocity = texture2D(textureVelocity, uv).xyz;
  float phase = tmpPos.w;
  phase = mod(phase + delta + length(velocity.xz) * delta * 3. + max(velocity.y, 0.0) * delta * 6., 62.83);
  gl_FragColor = vec4(position + velocity * delta * 15., phase);
}`;

const velocityShader = /* glsl */`
uniform float time; uniform float delta;
uniform float separationDistance; uniform float alignmentDistance; uniform float cohesionDistance;
uniform vec3 predator;
const float width = resolution.x; const float height = resolution.y;
const float PI = 3.141592653589793; const float PI_2 = PI * 2.0;
float zoneRadius = 40.0; float zoneRadiusSquared = 1600.0;
float separationThresh = 0.45; float alignmentThresh = 0.65;
const float UPPER_BOUNDS = BOUNDS; const float LOWER_BOUNDS = -UPPER_BOUNDS;
const float SPEED_LIMIT = 9.0;
void main(){
  zoneRadius = separationDistance + alignmentDistance + cohesionDistance;
  separationThresh = separationDistance / zoneRadius;
  alignmentThresh = (separationDistance + alignmentDistance) / zoneRadius;
  zoneRadiusSquared = zoneRadius * zoneRadius;
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 birdPosition, birdVelocity;
  vec3 selfPosition = texture2D(texturePosition, uv).xyz;
  vec3 selfVelocity = texture2D(textureVelocity, uv).xyz;
  float dist; vec3 dir; float distSquared; float f; float percent;
  vec3 velocity = selfVelocity;
  float limit = SPEED_LIMIT;
  dir = predator * UPPER_BOUNDS - selfPosition; dir.z = 0.;
  dist = length(dir); distSquared = dist * dist;
  float preyRadius = 150.0; float preyRadiusSq = preyRadius * preyRadius;
  if (dist < preyRadius) { f = (distSquared / preyRadiusSq - 1.0) * delta * 100.; velocity += normalize(dir) * f; limit += 5.0; }
  vec3 central = vec3(0., 0., 0.);
  dir = selfPosition - central; dist = length(dir);
  dir.y *= 2.5;
  velocity -= normalize(dir) * delta * 5.;
  for (float y = 0.0; y < height; y++) {
    for (float x = 0.0; x < width; x++) {
      vec2 ref = vec2(x + 0.5, y + 0.5) / resolution.xy;
      birdPosition = texture2D(texturePosition, ref).xyz;
      dir = birdPosition - selfPosition; dist = length(dir);
      if (dist < 0.0001) continue;
      distSquared = dist * dist;
      if (distSquared > zoneRadiusSquared) continue;
      percent = distSquared / zoneRadiusSquared;
      if (percent < separationThresh) {
        f = (separationThresh / percent - 1.0) * delta; velocity -= normalize(dir) * f;
      } else if (percent < alignmentThresh) {
        float threshDelta = alignmentThresh - separationThresh;
        float adjustedPercent = (percent - separationThresh) / threshDelta;
        birdVelocity = texture2D(textureVelocity, ref).xyz;
        f = (0.5 - cos(adjustedPercent * PI_2) * 0.5 + 0.5) * delta; velocity += normalize(birdVelocity) * f;
      } else {
        float threshDelta = 1.0 - alignmentThresh; float adjustedPercent;
        if (threshDelta == 0.) adjustedPercent = 1.; else adjustedPercent = (percent - alignmentThresh) / threshDelta;
        f = (0.5 - (cos(adjustedPercent * PI_2) * -0.5 + 0.5)) * delta; velocity += normalize(dir) * f;
      }
    }
  }
  if (length(velocity) > limit) velocity = normalize(velocity) * limit;
  gl_FragColor = vec4(velocity, 1.0);
}`;

const birdVS = /* glsl */`
attribute vec2 reference; attribute float flapW; attribute float shade;
uniform sampler2D texturePosition; uniform sampler2D textureVelocity;
uniform float uWorldScale; uniform vec3 uCenter;
varying float vShade; varying float vFlap; varying float vDepth;
void main(){
  vec4 tmpPos = texture2D(texturePosition, reference);
  vec3 pos = tmpPos.xyz;
  vec3 velocity = normalize(texture2D(textureVelocity, reference).xyz);
  vec3 newPosition = position;
  float s = sin(tmpPos.w);
  newPosition.y += s * 5.0 * flapW + sin(tmpPos.w - 0.8) * 2.5 * step(0.01, flapW) * (1.0 - flapW);
  newPosition = mat3(modelMatrix) * newPosition;
  velocity.z *= -1.;
  float xz = length(velocity.xz); float x = sqrt(1. - velocity.y * velocity.y);
  float cosry = velocity.x / xz; float sinry = velocity.z / xz;
  float cosrz = x; float sinrz = velocity.y;
  mat3 maty = mat3(cosry, 0, -sinry, 0, 1, 0, sinry, 0, cosry);
  mat3 matz = mat3(cosrz, sinrz, 0, -sinrz, cosrz, 0, 0, 0, 1);
  newPosition = maty * matz * newPosition;
  newPosition = (newPosition + pos) * uWorldScale + uCenter;
  vShade = shade; vFlap = flapW * max(s, 0.0); vDepth = pos.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(newPosition, 1.0);
}`;

const birdFS = /* glsl */`
uniform float uOpacity;
varying float vShade; varying float vFlap; varying float vDepth;
void main(){
  // أسود، والجناح يلمع أحمر لما يرتفع، والبعيد يغرق بالضباب الأحمر
  vec3 black = vec3(0.012, 0.01, 0.012);
  vec3 red = vec3(0.88, 0.05, 0.09);
  float far = clamp((-vDepth + 300.0) / 900.0, 0.0, 1.0);
  vec3 c = mix(black, red * 0.55, vFlap * 0.85 + vShade * 0.12);
  c = mix(c, vec3(0.16, 0.0, 0.02), far * 0.55);
  gl_FragColor = vec4(c, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function crowBirdGeometry(BIRDS, WIDTH) {
  // لكل طير: جسم (2) + ذيل (1) + جناح داخلي وخارجي لكل جهة (4) = 7 مثلثات
  const tri = 7, verts = BIRDS * tri * 3;
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(verts * 3), R = new Float32Array(verts * 2), FW = new Float32Array(verts), SH = new Float32Array(verts);
  let v = 0;
  const push = (x, y, z, fw, sh) => { P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; FW[v] = fw; SH[v] = sh; v++; };
  for (let b = 0; b < BIRDS; b++) {
    const start = v;
    // الجسم: على محور z (الأمام = +z) ثم نلفه بالـ shader
    push(0, 0, 32, 0, 0.2); push(0, 3, -6, 0, 0.2); push(-3, 0, -6, 0, 0.2);
    push(0, 0, 32, 0, 0.2); push(3, 0, -6, 0, 0.2); push(0, 3, -6, 0, 0.2);
    // الذيل: مروحة
    push(0, 1, -6, 0, 0.5); push(-7, 0, -24, 0, 0.5); push(7, 0, -24, 0, 0.5);
    for (const s of [-1, 1]) {
      // داخلي
      push(0, 1, 12, 0, 1); push(s * 14, 0, 6, 0.45, 1); push(0, 1, -4, 0, 1);
      // خارجي (الأصابع)
      push(s * 14, 0, 6, 0.45, 1); push(s * 30, 0, -4, 1, 1); push(s * 12, 0, -6, 0.45, 1);
    }
    const x = (b % WIDTH) / WIDTH, y = Math.floor(b / WIDTH) / WIDTH;
    for (let k = start; k < v; k++) { R[k * 2] = x; R[k * 2 + 1] = y; }
  }
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.setAttribute("reference", new THREE.BufferAttribute(R, 2));
  g.setAttribute("flapW", new THREE.BufferAttribute(FW, 1));
  g.setAttribute("shade", new THREE.BufferAttribute(SH, 1));
  g.scale(0.22, 0.22, 0.22);
  return g;
}

export class Flock {
  constructor(renderer, { width = 32, worldScale = 0.0105 } = {}) {
    this.renderer = renderer;
    this.WIDTH = width; this.BIRDS = width * width;
    this.opacity = 0; this.target = 0;
    this.predator = new THREE.Vector3(9, 9, 0);

    const gpu = (this.gpu = new GPUComputationRenderer(width, width, renderer));
    const dtPos = gpu.createTexture(), dtVel = gpu.createTexture();
    const pa = dtPos.image.data, va = dtVel.image.data;
    for (let k = 0; k < pa.length; k += 4) {
      pa[k] = Math.random() * BOUNDS - BOUNDS_HALF; pa[k + 1] = Math.random() * BOUNDS - BOUNDS_HALF; pa[k + 2] = Math.random() * BOUNDS - BOUNDS_HALF; pa[k + 3] = Math.random() * 62;
      va[k] = (Math.random() - 0.5) * 10; va[k + 1] = (Math.random() - 0.5) * 10; va[k + 2] = (Math.random() - 0.5) * 10; va[k + 3] = 1;
    }
    this.velVar = gpu.addVariable("textureVelocity", velocityShader, dtVel);
    this.posVar = gpu.addVariable("texturePosition", positionShader, dtPos);
    gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
    gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
    this.pu = this.posVar.material.uniforms; this.vu = this.velVar.material.uniforms;
    this.pu.time = { value: 0 }; this.pu.delta = { value: 0 };
    Object.assign(this.vu, { time: { value: 0 }, delta: { value: 0 }, separationDistance: { value: 22 }, alignmentDistance: { value: 26 }, cohesionDistance: { value: 24 }, predator: { value: this.predator } });
    this.velVar.material.defines.BOUNDS = BOUNDS.toFixed(2);
    for (const v of [this.velVar, this.posVar]) { v.wrapS = THREE.RepeatWrapping; v.wrapT = THREE.RepeatWrapping; }
    const err = gpu.init();
    if (err) throw new Error(err);

    this.uniforms = { texturePosition: { value: null }, textureVelocity: { value: null }, uWorldScale: { value: worldScale }, uOpacity: { value: 0 }, uCenter: { value: new THREE.Vector3() } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: birdVS, fragmentShader: birdFS, side: THREE.DoubleSide, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(crowBirdGeometry(this.BIRDS, width), mat);
    this.mesh.rotation.y = Math.PI / 2;
    this.mesh.matrixAutoUpdate = false; this.mesh.updateMatrix();
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;

    // ضباب أحمر خلف السرب حتى الغربان السود تبين
    this.haze = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying vec2 vUv; uniform float uOpacity; uniform float uTime;
        void main(){ vec2 p = (vUv - 0.5) * vec2(1.6, 1.0); float d = length(p + vec2(sin(uTime*0.2)*0.05, 0.04));
          float g = smoothstep(0.55, 0.0, d); vec3 c = mix(vec3(0.25,0.0,0.02), vec3(0.95,0.08,0.06), g*g);
          gl_FragColor = vec4(c * g * 0.5, 1.0) * uOpacity; }`,
    }));
    this.haze.position.z = -4;
    this.haze.renderOrder = 1;
    this.group = new THREE.Group();
    this.group.add(this.haze, this.mesh);
  }

  // predWorld: مكان "المفترس" بالعالم (شعاع الماوس عند السرب) أو null
  update(dt, t, predWorld = null) {
    this.opacity += (this.target - this.opacity) * (1 - Math.exp(-dt * 3));
    const on = this.opacity > 0.005;
    this.group.visible = on;
    if (!on) return;
    const d = Math.min(dt, 1 / 20);
    this.pu.time.value = t; this.pu.delta.value = d;
    this.vu.time.value = t; this.vu.delta.value = d;
    const ws = this.uniforms.uWorldScale.value * BOUNDS, c = this.uniforms.uCenter.value;
    if (predWorld) this.predator.set((predWorld.x - c.x) / ws, (predWorld.y - c.y) / ws, 0);
    else this.predator.set(9, 9, 0);
    this.gpu.compute();
    this.uniforms.texturePosition.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    this.uniforms.textureVelocity.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
    this.uniforms.uOpacity.value = this.opacity;
    this.haze.material.uniforms.uOpacity.value = this.opacity;
    this.haze.material.uniforms.uTime.value = t;
  }
}
