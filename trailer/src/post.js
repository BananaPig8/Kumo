import * as THREE from 'three';

// Postprocesado propio: bloom de filtrado dual, rayos de sol, desenfoque radial,
// FXAA, curva tonal suave, etalonaje por plano, viñeta, grano y fundidos.

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const PREFILTER = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold, uKnee;
varying vec2 vUv;
vec3 pick(vec2 uv){ return texture2D(tSrc, uv).rgb; }
void main(){
  vec3 c = (pick(vUv + uTexel * vec2(-1.0,-1.0)) + pick(vUv + uTexel * vec2(1.0,-1.0)) + pick(vUv + uTexel * vec2(-1.0,1.0)) + pick(vUv + uTexel * vec2(1.0,1.0))) * 0.25;
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  c = min(c, vec3(32.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * contrib, 1.0);
}`;

const DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb * 4.0;
  s += texture2D(tSrc, vUv - uTexel).rgb;
  s += texture2D(tSrc, vUv + uTexel).rgb;
  s += texture2D(tSrc, vUv + vec2(uTexel.x, -uTexel.y)).rgb;
  s += texture2D(tSrc, vUv - vec2(uTexel.x, -uTexel.y)).rgb;
  gl_FragColor = vec4(s / 8.0, 1.0);
}`;

const UP = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec2 h = uTexel * 0.5;
  vec3 s = texture2D(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb * 2.0;
  s += texture2D(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb * 2.0;
  s += texture2D(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb * 2.0;
  s += texture2D(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb;
  s += texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  gl_FragColor = vec4(s / 12.0 + texture2D(tAdd, vUv).rgb, 1.0);
}`;

const RAYS = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uSun; uniform float uDecay, uDensity; varying vec2 vUv;
void main(){
  vec2 d = (vUv - uSun) * uDensity / 40.0;
  vec2 uv = vUv; float w = 1.0; vec3 acc = vec3(0.0);
  for (int i = 0; i < 40; i++){ uv -= d; acc += texture2D(tSrc, uv).rgb * w; w *= uDecay; }
  gl_FragColor = vec4(acc / 40.0, 1.0);
}`;

const FINAL = /* glsl */`
uniform sampler2D tScene, tBloom, tRays;
uniform vec2 uTexel, uRes;
uniform float uBloom, uRays, uExposure, uSat, uContrast, uVignette, uGrain, uFade, uFlash, uTime;
uniform vec3 uLift, uGain, uFlashColor;
uniform float uZoom; uniform vec2 uZoomCenter;
uniform float uFxaa;
varying vec2 vUv;
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 fxaa(vec2 uv){
  vec3 rgbM = texture2D(tScene, uv).rgb;
  if (uFxaa < 0.5) return rgbM;
  vec3 rgbNW = texture2D(tScene, uv + vec2(-1.0,-1.0) * uTexel).rgb;
  vec3 rgbNE = texture2D(tScene, uv + vec2( 1.0,-1.0) * uTexel).rgb;
  vec3 rgbSW = texture2D(tScene, uv + vec2(-1.0, 1.0) * uTexel).rgb;
  vec3 rgbSE = texture2D(tScene, uv + vec2( 1.0, 1.0) * uTexel).rgb;
  float lNW = luma(min(rgbNW, 1.5)), lNE = luma(min(rgbNE, 1.5)), lSW = luma(min(rgbSW, 1.5)), lSE = luma(min(rgbSE, 1.5)), lM = luma(min(rgbM, 1.5));
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, -8.0, 8.0) * uTexel;
  vec3 a = 0.5 * (texture2D(tScene, uv + dir * (1.0/3.0 - 0.5)).rgb + texture2D(tScene, uv + dir * (2.0/3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tScene, uv + dir * -0.5).rgb + texture2D(tScene, uv + dir * 0.5).rgb);
  float lB = luma(min(b, 1.5));
  return (lB < lMin || lB > lMax) ? a : b;
}
vec3 shoulder(vec3 x){
  const float a = 0.72;
  vec3 hi = a + (1.0 - a) * (1.0 - exp(-(x - a) / (1.0 - a)));
  return mix(x, hi, step(a, x));
}
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 c;
  if (uZoom > 0.001) {
    vec2 d = (vUv - uZoomCenter);
    c = vec3(0.0);
    for (int i = 0; i < 12; i++){ float k = float(i) / 11.0; c += texture2D(tScene, uZoomCenter + d * (1.0 - uZoom * k)).rgb; }
    c /= 12.0;
  } else {
    c = fxaa(vUv);
  }
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c += texture2D(tRays, vUv).rgb * uRays;
  c *= uExposure;
  c = shoulder(c);
  // Etalonaje: lift/gain por canal, contraste en torno a 0.45 y saturación.
  c = c * uGain + uLift * (1.0 - c);
  vec3 g = pow(max(c, 0.0), vec3(1.0 / 2.2));
  g = (g - 0.45) * uContrast + 0.45;
  float l = luma(g);
  g = mix(vec3(l), g, uSat);
  // Viñeta suave y algo ovalada.
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 0.62;
  g *= mix(1.0, smoothstep(0.95, 0.15, length(q)), uVignette);
  g = mix(g, uFlashColor, uFlash);
  g *= 1.0 - uFade;
  float n = hash(vUv * uRes + fract(uTime * 7.13) * 917.0) - 0.5;
  g += n * uGrain * (0.6 + 0.4 * (1.0 - l));
  gl_FragColor = vec4(clamp(g, 0.0, 1.0), 1.0);
}`;

function pass(frag, uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
}

export class Post {
  constructor(renderer, w, h) {
    this.r = renderer;
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.settings = Post.defaults();
    this.mPre = pass(PREFILTER, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.9 }, uKnee: { value: 0.3 } });
    this.mDown = pass(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = pass(UP, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mRays = pass(RAYS, { tSrc: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uDecay: { value: 0.96 }, uDensity: { value: 0.9 } });
    this.mFinal = pass(FINAL, {
      tScene: { value: null }, tBloom: { value: null }, tRays: { value: null },
      uTexel: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2() },
      uBloom: { value: 0.6 }, uRays: { value: 0 }, uExposure: { value: 1 }, uSat: { value: 1 }, uContrast: { value: 1 },
      uVignette: { value: 0.4 }, uGrain: { value: 0.03 }, uFade: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 },
      uLift: { value: new THREE.Vector3() }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uFlashColor: { value: new THREE.Vector3(1, 1, 1) },
      uZoom: { value: 0 }, uZoomCenter: { value: new THREE.Vector2(0.5, 0.5) }, uFxaa: { value: 1 },
    });
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.black.needsUpdate = true;
    this.setSize(w, h);
  }

  static defaults() {
    return {
      bloom: 0.32, threshold: 1.0, knee: 0.4,
      rays: 0, sun: [0.5, 0.5], raysDecay: 0.965, raysDensity: 0.95,
      exposure: 1, sat: 1, contrast: 1, lift: [0, 0, 0], gain: [1, 1, 1],
      vignette: 0.45, grain: 0.035, fade: 0, flash: 0, flashColor: [1, 1, 1],
      zoom: 0, zoomCenter: [0.5, 0.5],
    };
  }

  setSize(w, h) {
    this.w = w; this.h = h;
    const opt = { type: THREE.HalfFloatType, depthBuffer: false };
    this.rtScene?.dispose();
    this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true });
    this.mips?.forEach((m) => m.dispose());
    this.ups?.forEach((m) => m.dispose());
    this.mips = []; this.ups = [];
    let mw = Math.max(1, w >> 1), mh = Math.max(1, h >> 1);
    for (let i = 0; i < 5; i++) {
      this.mips.push(new THREE.WebGLRenderTarget(mw, mh, opt));
      this.ups.push(new THREE.WebGLRenderTarget(mw, mh, opt));
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
    }
    this.rtRays?.dispose();
    this.rtRays = new THREE.WebGLRenderTarget(Math.max(1, w >> 2), Math.max(1, h >> 2), opt);
  }

  _run(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.quadScene, this.quadCam);
  }

  render(scene, camera, time) {
    const s = this.settings;
    const r = this.r;
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(scene, camera);

    // Bloom (filtrado dual).
    this.mPre.uniforms.tSrc.value = this.rtScene.texture;
    this.mPre.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.mPre.uniforms.uThreshold.value = s.threshold;
    this.mPre.uniforms.uKnee.value = s.knee;
    this._run(this.mPre, this.mips[0]);
    for (let i = 1; i < this.mips.length; i++) {
      this.mDown.uniforms.tSrc.value = this.mips[i - 1].texture;
      this.mDown.uniforms.uTexel.value.set(1 / this.mips[i - 1].width, 1 / this.mips[i - 1].height);
      this._run(this.mDown, this.mips[i]);
    }
    let src = this.mips[this.mips.length - 1];
    for (let i = this.mips.length - 2; i >= 0; i--) {
      this.mUp.uniforms.tSrc.value = src.texture;
      this.mUp.uniforms.tAdd.value = this.mips[i].texture;
      this.mUp.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this._run(this.mUp, this.ups[i]);
      src = this.ups[i];
    }

    // Rayos de sol a partir de la pasada de brillo.
    let raysTex = this.black;
    if (s.rays > 0.001) {
      this.mRays.uniforms.tSrc.value = this.mips[1].texture;
      this.mRays.uniforms.uSun.value.set(s.sun[0], s.sun[1]);
      this.mRays.uniforms.uDecay.value = s.raysDecay;
      this.mRays.uniforms.uDensity.value = s.raysDensity;
      this._run(this.mRays, this.rtRays);
      raysTex = this.rtRays.texture;
    }

    const u = this.mFinal.uniforms;
    u.tScene.value = this.rtScene.texture;
    u.tBloom.value = this.ups[0].texture;
    u.tRays.value = raysTex;
    u.uTexel.value.set(1 / this.w, 1 / this.h);
    u.uRes.value.set(this.w, this.h);
    u.uBloom.value = s.bloom; u.uRays.value = s.rays; u.uExposure.value = s.exposure;
    u.uSat.value = s.sat; u.uContrast.value = s.contrast; u.uVignette.value = s.vignette;
    u.uGrain.value = s.grain; u.uFade.value = s.fade; u.uFlash.value = s.flash; u.uTime.value = time;
    u.uLift.value.fromArray(s.lift); u.uGain.value.fromArray(s.gain); u.uFlashColor.value.fromArray(s.flashColor);
    u.uZoom.value = s.zoom; u.uZoomCenter.value.fromArray(s.zoomCenter);
    this._run(this.mFinal, null);
  }
}
