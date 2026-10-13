import * as THREE from 'three';
import { Post } from '../post.js';
import { makeCanvas } from './paint.js';
import { W, H } from './style.js';

// Escenario 2D: cada fotograma se pinta en dos lienzos de 1920×800
//  · g    → la imagen (fondos pintados, personajes, efectos)
//  · glow → solo luz emisiva (LEDs, sol, ventanas); se suma con ganancia HDR
//           para que el bloom de la pasada WebGL la haga brillar.
// Después se sube a WebGL y pasa por el postprocesado (bloom, rayos de sol,
// etalonaje, viñeta, grano, fundidos).

export class Stage {
  constructor(renderer) {
    this.renderer = renderer;
    this.canvas = makeCanvas(W, H);
    this.g = this.canvas.getContext('2d');
    this.glowCanvas = makeCanvas(W, H);
    this.glow = this.glowCanvas.getContext('2d');
    for (const c of [this.g, this.glow]) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; }
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.gtex = new THREE.CanvasTexture(this.glowCanvas);
    for (const t of [this.tex, this.gtex]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
    }
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tBase: { value: this.tex }, tGlow: { value: this.gtex }, uGlowGain: { value: 3.0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tBase, tGlow; uniform float uGlowGain; varying vec2 vUv;
        // El lienzo de luz llega sin premultiplicar: rgb × a es la luz real (si
        // no, un halo suave se vería como un disco sólido de su color).
        void main(){ vec4 l = texture2D(tGlow, vUv); vec3 c = texture2D(tBase, vUv).rgb + l.rgb * l.a * uGlowGain; gl_FragColor = vec4(c, 1.0); }`,
      depthTest: false, depthWrite: false,
    });
    this.scene = new THREE.Scene();
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    q.frustumCulled = false;
    this.scene.add(q);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.post = new Post(renderer, W, H);
  }

  begin() {
    for (const c of [this.g, this.glow]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.filter = 'none';
    }
    this.g.fillStyle = '#000';
    this.g.fillRect(0, 0, W, H);
    this.glow.clearRect(0, 0, W, H);
    this.post.settings = Post.defaults();
    this.mat.uniforms.uGlowGain.value = 3.0;
    return this.post.settings;
  }

  end(T) {
    for (const c of [this.g, this.glow]) c.setTransform(1, 0, 0, 1, 0, 0);
    this.tex.needsUpdate = true;
    this.gtex.needsUpdate = true;
    this.post.render(this.scene, this.camera, T);
  }

  setGlowGain(k) { this.mat.uniforms.uGlowGain.value = k; }
}

// ─── Cámara multiplano ──────────────────────────────────────────────────────
// cam = { x, y, zoom, rot }: desplazamiento en píxeles del plano de referencia
// (profundidad 1), acercamiento y giro. Un plano a profundidad d se mueve
// 1/d veces lo que se mueve la cámara (paralaje), y el zoom le afecta igual.
// Dentro de place() el origen (0,0) es el centro del fotograma en reposo.
export function place(g, cam = {}, depth = 1) {
  const x = cam.x ?? 0, y = cam.y ?? 0, zoom = cam.zoom ?? 1, rot = cam.rot ?? 0;
  const s = 1 + (zoom - 1) / depth;
  const c = Math.cos(rot / depth), sn = Math.sin(rot / depth);
  g.setTransform(s * c, s * sn, -s * sn, s * c, W / 2, H / 2);
  g.translate(-x / depth, -y / depth);
}

// Dibuja un lienzo pintado centrado en (cx, cy) del espacio actual con escala k.
export function blit(g, img, cx = 0, cy = 0, k = 1, alpha = 1) {
  if (alpha <= 0) return;
  const pa = g.globalAlpha;
  g.globalAlpha = pa * alpha;
  g.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
  g.globalAlpha = pa;
}

// Ayuda para pintar una capa una vez y guardarla.
export function painted(w, h, fn) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  fn(g, c.width, c.height);
  return c;
}

// Posición del sol en coordenadas de textura (0..1, y hacia arriba) para los
// rayos de luz del postprocesado, a partir de píxeles de pantalla.
export function sunUV(px, py) {
  return [px / W, 1 - py / H];
}
