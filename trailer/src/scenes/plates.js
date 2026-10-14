// Mundo «plates»: cada plano usa como fondo la ilustración del cliente (su versión
// Ghibli del fotograma). Lo que se mueve va recortado en capas (islas, planeador,
// ballena, llave, bufanda, hierba) y encima se anima por código: cámara, lluvia,
// luces, cascadas, pájaros, hojas, estelas y destellos. Todo depende solo del tiempo.

import { PLATES } from './plates/meta.js';
import { glow, css, paintRain, makeCanvas } from '../engine/paint.js';
import { mulberry32, clamp, lerp, invLerp, smooth, smoother, easeIn, easeOut, easeInOut, env } from '../lib/util.js';
import { TITLE, DURATION } from '../timeline.js';

const W = 1920, H = 800;
const TAU = Math.PI * 2;

function load(name) {
  const im = new Image();
  im.src = new URL(`../../assets/plates/${name}.webp`, import.meta.url).href;
  return im.decode().then(() => im, () => { throw new Error(`No se pudo cargar el fondo ${name}`); });
}

// ─── Cámara sobre la ilustración ────────────────────────────────────────────
// s = 1 es exactamente el encuadre del cliente; s > 1 acerca hacia (fx, fy),
// un punto en píxeles de la imagen que se queda quieto en pantalla.
function view(p, s = 1, fx = p.w / 2, fy = p.h / 2, dx = 0, dy = 0) {
  const k0 = Math.max(W / p.w, H / p.h);
  const S = k0 * s;
  const tx = clamp(fx * k0 - fx * S + dx, W - p.w * S, 0);
  const ty = clamp(fy * k0 - fy * S + dy, H - p.h * S, 0);
  return { S, tx, ty, X: (x) => tx + x * S, Y: (y) => ty + y * S };
}
const inImage = (g, v) => g.setTransform(v.S, 0, 0, v.S, v.tx, v.ty);

function drawPlate(g, im, v) {
  g.save();
  inImage(g, v);
  g.drawImage(im, 0, 0);
  g.restore();
}

// Capa recortada: se mueve (dx, dy), gira y escala alrededor de su centro (o de cx, cy).
function drawLayer(g, im, b, v, o = {}) {
  const cx = o.cx ?? b.x + b.w / 2, cy = o.cy ?? b.y + b.h / 2;
  const s = o.sc ?? 1;
  g.save();
  inImage(g, v);
  g.globalAlpha = o.alpha ?? 1;
  g.translate(cx + (o.dx ?? 0), cy + (o.dy ?? 0));
  if (o.rot) g.rotate(o.rot);
  g.scale(s * (o.sx ?? 1), s);
  g.drawImage(im, b.x - cx, b.y - cy);
  g.restore();
}

// Post neutro: la ilustración ya trae su color; solo un toque de grano y viñeta.
function neutral(f, o = {}) {
  const p = f.post;
  Object.assign(p, { exposure: 1, sat: 1, contrast: 1, lift: [0, 0, 0], gain: [1, 1, 1], bloom: 0.12, threshold: 0.93, vignette: 0.28, grain: 0.022 }, o);
  f.stage.setGlowGain(1);
}

// ─── Pequeños efectos ───────────────────────────────────────────────────────
function makeSpecks(seed, n, x0, y0, x1, y1) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => ({ x: lerp(x0, x1, r()), y: lerp(y0, y1, r()), w: 0.8 + r() * 2.4, ph: r() * TAU, s: 0.6 + r() * 1.2 }));
}

// Pájaro lejano: una «v» que aletea.
function bird(g, x, y, s, phase, color = '#2c3346', alpha = 0.85) {
  const f = Math.sin(phase);
  g.strokeStyle = css(color, alpha);
  g.lineWidth = Math.max(1, s * 0.16);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - s, y - s * 0.25 - f * s * 0.45);
  g.quadraticCurveTo(x - s * 0.45, y - s * 0.35 - f * s * 0.2, x, y);
  g.quadraticCurveTo(x + s * 0.45, y - s * 0.35 - f * s * 0.2, x + s, y - s * 0.25 - f * s * 0.45);
  g.stroke();
}
function flock(g, t, list) {
  for (const b of list) {
    const x = b.x0 + b.vx * t + Math.sin(t * 0.7 + b.ph) * 6;
    const y = b.y0 + b.vy * t + Math.sin(t * 1.1 + b.ph) * 4;
    bird(g, x, y, b.s, t * b.flap + b.ph, b.color, b.a);
  }
}
function makeFlock(seed, n, x0, y0, spread, vx, vy, s, color, a = 0.85) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => ({ x0: x0 + (r() - 0.5) * spread, y0: y0 + (r() - 0.5) * spread * 0.4 + i * 3, vx: vx * (0.9 + r() * 0.2), vy, s: s * (0.7 + r() * 0.5), flap: 9 + r() * 4, ph: r() * TAU, color, a }));
}

// Hoja que vuela con el viento.
function leaves(g, t, list) {
  for (const l of list) {
    const u = ((l.u0 + t * l.v) % 1 + 1) % 1;
    const x = lerp(l.x0, l.x1, u), y = lerp(l.y0, l.y1, u) + Math.sin(t * l.wf + l.ph) * l.wa;
    const a = Math.sin(u * Math.PI);
    g.save();
    g.translate(x, y);
    g.rotate(t * l.spin + l.ph);
    g.scale(1, 0.45 + 0.4 * Math.sin(t * l.spin * 1.7 + l.ph));
    g.fillStyle = css(l.c, 0.9 * a);
    g.beginPath(); g.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, TAU); g.fill();
    g.restore();
  }
}
function makeLeaves(seed, n, box, colors) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const y0 = lerp(box[1], box[3], r());
    return { u0: r(), v: 0.12 + r() * 0.12, x0: box[0] - 80, x1: box[2] + 80, y0, y1: y0 + (r() - 0.6) * 260, wf: 1.5 + r() * 2, wa: 8 + r() * 18, ph: r() * TAU, spin: 1.5 + r() * 3, s: 4 + r() * 6, c: colors[Math.floor(r() * colors.length)] };
  });
}

// Estelas de velocidad que salen de un punto (vuelo hacia delante).
function streaks(g, t, cx, cy, list, { speed = 1, color = '#fffaf0', alpha = 0.6 } = {}) {
  g.lineCap = 'round';
  for (const s of list) {
    const u = ((s.u0 + t * s.v * speed) % 1 + 1) % 1;
    const r0 = lerp(s.r0, s.r1, u * u), r1 = r0 + s.len * (0.3 + u);
    const a = alpha * Math.sin(u * Math.PI);
    g.strokeStyle = css(s.c ?? color, a);
    g.lineWidth = s.w * (0.5 + u);
    g.beginPath();
    g.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0 * 0.7);
    g.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1 * 0.7);
    g.stroke();
  }
}
function makeStreaks(seed, n, { r0 = 80, r1 = 1300, len = 160, w = 2, colors = null } = {}) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => ({ a: r() * TAU, u0: r(), v: 0.5 + r() * 0.6, r0: r0 * (0.5 + r()), r1, len: len * (0.5 + r()), w: w * (0.5 + r()), c: colors ? colors[Math.floor(r() * colors.length)] : null }));
}

// Cascada viva: hilos de agua que bajan sobre la cascada pintada y bruma al pie.
function waterfall(g, t, x, y0, y1, w, seed) {
  const r = mulberry32(seed);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const xx = x + (r() - 0.5) * w;
    const sp = 260 + r() * 160;
    g.setLineDash([18 + r() * 30, 22 + r() * 40]);
    g.lineDashOffset = -t * sp - r() * 200;
    g.strokeStyle = css('#ffffff', 0.32 + r() * 0.25);
    g.lineWidth = 1.2 + r() * 1.8;
    g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx + (r() - 0.5) * 3, y1); g.stroke();
  }
  g.setLineDash([]);
  g.restore();
}

// Haz del faro (en la capa de luz): gira sobre sí mismo, así que visto de lado
// se alarga y se acorta sobre el mar, y destella cuando apunta a la cámara.
function lighthouse(gl, x, y, t, { len = 900, spread = 0.045, speed = 1.1, alpha = 0.2, color = '#fff1c8' } = {}) {
  const c = Math.cos(t * speed);
  const ang = Math.PI - 0.05 + Math.sin(t * speed * 0.5) * 0.06;
  const L = len * (0.35 + 0.65 * Math.abs(Math.sin(t * speed)));
  const k = c < 0 ? 1 : 0.35; // de espaldas el haz se ve poco
  gl.save();
  gl.globalCompositeOperation = 'lighter';
  for (const [sp, a] of [[spread * 2.4, 0.35], [spread, 1]]) {
    const gr = gl.createRadialGradient(x, y, 0, x, y, L);
    gr.addColorStop(0, css(color, alpha * a * k)); gr.addColorStop(0.5, css(color, alpha * a * k * 0.3)); gr.addColorStop(1, css(color, 0));
    gl.fillStyle = gr;
    gl.beginPath(); gl.moveTo(x, y); gl.arc(x, y, L, ang - sp, ang + sp); gl.closePath(); gl.fill();
  }
  gl.restore();
  glow(gl, x, y, 22 + 30 * Math.max(0, c) ** 4, color, 0.6 + 0.35 * Math.max(0, c) ** 4);
}

// Copia solo de las luces cálidas de la ilustración (ventanas, farolas) para hacerlas respirar.
function warmLights(im, p) {
  const c = makeCanvas(p.w, p.h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, p.w, p.h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], gg = a[i + 1], b = a[i + 2];
    const k = clamp((r - 170) / 60) * clamp((gg - 120) / 60) * clamp((r - b - 60) / 60);
    a[i + 3] = Math.round(255 * k);
  }
  g.putImageData(d, 0, 0);
  const out = makeCanvas(p.w, p.h);
  const o = out.getContext('2d');
  o.filter = 'blur(3px)';
  o.drawImage(c, 0, 0);
  o.filter = 'none';
  o.drawImage(c, 0, 0);
  return out;
}

// Nube suelta recortada de la propia ilustración (para pasar rozando delante).
function cloudSprite(im, x, y, w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.drawImage(im, x, y, w, h, 0, 0, w, h);
  // Máscara elíptica suave: un círculo de radio w/2 aplastado a la altura del recorte.
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, h / w, 0, 0);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, w);
  return c;
}
function wisps(g, t, list, cx, cy) {
  for (const s of list) {
    const u = ((s.u0 + t * s.v) % 1 + 1) % 1;
    const d = lerp(0.15, 1.6, u * u);
    const x = cx + Math.cos(s.a) * d * 900, y = cy + Math.sin(s.a) * d * 420;
    const k = lerp(0.6, 3.2, u * u) * s.k;
    g.globalAlpha = s.alpha * Math.sin(Math.min(1, u * 1.4) * Math.PI) ** 1.5;
    g.drawImage(s.img, x - (s.img.width * k) / 2, y - (s.img.height * k) / 2, s.img.width * k, s.img.height * k);
  }
  g.globalAlpha = 1;
}

// ─── Mundo ──────────────────────────────────────────────────────────────────
export async function build() {
  const names = [];
  for (const [shot, p] of Object.entries(PLATES)) {
    names.push(shot);
    for (const l of Object.keys(p.layers)) names.push(`${shot}-${l}`);
  }
  const img = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await load(n)])));
  const P = PLATES;
  const L = (shot, layer) => [img[`${shot}-${layer}`], P[shot].layers[layer]];

  // Materiales precalculados.
  const townLights = warmLights(img.town, P.town);
  const roofLights = warmLights(img.roof, P.roof);
  const seaSpecks = makeSpecks(11, 70, 800, 318, 960, 400);
  const roofSpecks = makeSpecks(12, 120, 0, 600, 1942, 809);
  const bokehR = mulberry32(13);
  const bokeh = Array.from({ length: 18 }, () => ({ x: bokehR() * 1942, y: bokehR() * 809, r: 20 + bokehR() * 46, c: bokehR() < 0.75 ? '#f2b45a' : '#7fb6d8', ph: bokehR() * TAU, v: 6 + bokehR() * 10 }));
  const tunnelStreaks = makeStreaks(21, 90, { r0: 60, r1: 1250, len: 150, w: 2.4, colors: ['#ffd98a', '#ffe9b0', '#bfe4ff', '#ffffff'] });
  const revealBirds = makeFlock(31, 5, 300, 300, 140, 34, -3, 9, '#33405a', 0.8);
  const cliffLeaves = makeLeaves(41, 14, [0, 60, 1942, 560], ['#7fbf4a', '#5ea33a', '#a7d65a', '#4f8f35']);
  const cliffPetals = makeLeaves(42, 16, [0, 520, 1300, 809], ['#ffffff', '#fbe64a', '#f7d6e0']);
  const motes = makeSpecks(51, 46, 900, 40, 1080, 470);
  const flybyWisps = [[0, 590, 520, 210], [700, 600, 560, 200], [1350, 610, 560, 190], [200, 470, 420, 150]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.flyby, x, y, w, h), a: [2.6, 1.9, 0.6, 3.4][i], u0: i * 0.27, v: 0.32, k: 0.8, alpha: 0.75 }));
  const chaseWisps = [[0, 620, 520, 180], [760, 640, 520, 160], [1380, 600, 540, 190], [300, 690, 480, 120]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.chase, x, y, w, h), a: [2.5, 1.7, 0.5, 2.9][i], u0: i * 0.3 + 0.1, v: 0.36, k: 0.8, alpha: 0.75 }));
  const whaleWisps = [[0, 640, 560, 170], [1250, 660, 600, 150]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.whale, x, y, w, h), x0: i ? 2100 : -500, vx: i ? -120 : 110, y: i ? 690 : 720 }));
  const whaleBirds = makeFlock(61, 6, 700, 60, 220, 22, -4, 7, '#22304a', 0.75);
  const diveStreaks = makeStreaks(71, 60, { r0: 120, r1: 1400, len: 260, w: 3, colors: ['#ffffff', '#fffaf0', '#eaf6ff'] });
  const airshipEmbers = makeSpecks(81, 40, 100, 40, 1850, 420);
  const titleBirds = makeFlock(91, 4, 1180, 300, 120, 26, -2, 8, '#3a2f45', 0.8);

  const shots = {
    // ── Pueblo bajo la lluvia, anochecer ──
    town(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { vignette: 0.35 });
      const p = P.town;
      const v = view(p, lerp(1.0, 1.075, smoother(u)), 985, 330);
      drawPlate(g, img.town, v);
      // Las ventanas respiran, cada barrio a su ritmo.
      gl.save();
      inImage(gl, v);
      for (let i = 0; i < 6; i++) {
        const x0 = (i * p.w) / 6;
        gl.save();
        gl.beginPath(); gl.rect(x0, 300, p.w / 6 + 1, p.h); gl.clip();
        gl.globalAlpha = 0.22 + 0.12 * Math.sin(t * (1.1 + i * 0.17) + i * 1.9);
        gl.drawImage(townLights, 0, 0);
        gl.restore();
      }
      gl.restore();
      // Destellos del sol en el mar.
      g.save(); inImage(g, v);
      for (const s of seaSpecks) {
        const a = Math.max(0, Math.sin(t * 2.6 * s.s + s.ph)) ** 6;
        if (a < 0.02) continue;
        g.fillStyle = css('#fff3cf', a * 0.9);
        g.fillRect(s.x - s.w, s.y, s.w * 2.4, 1.6);
      }
      g.restore();
      lighthouse(gl, v.X(1687), v.Y(222), t + 0.6, { len: 1100, alpha: 0.32 });
      paintRain(g, W, H, t, { count: 520, speed: 1500, len: 38, angle: 0.1, color: '#d6dfeb', alpha: 0.2, seed: 5, width: 1.1 });
      paintRain(g, W, H, t, { count: 90, speed: 2100, len: 70, angle: 0.1, color: '#e7edf5', alpha: 0.28, seed: 6, width: 1.6 });
      f.post.fade = 1 - smooth(invLerp(0, 1.6, t));
    },

    // ── En el tejado: de cerca a ella y al gato, y la cámara se abre al horizonte ──
    roof(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { vignette: 0.35 });
      const p = P.roof;
      const s = lerp(1.24, 1.0, easeInOut(u));
      const v = view(p, s, lerp(905, 971, easeInOut(u)), lerp(470, 404, easeInOut(u)));
      drawPlate(g, img.roof, v);
      gl.save(); inImage(gl, v);
      gl.globalAlpha = 0.2 + 0.08 * Math.sin(t * 1.4);
      gl.drawImage(roofLights, 0, 0);
      gl.restore();
      // El claro dorado del horizonte se abre mientras ella mira.
      const open = smooth(invLerp(0.2, 1, u));
      gl.save(); inImage(gl, v);
      gl.translate(990, 300); gl.scale(1, 0.12);
      glow(gl, 0, 0, 720, '#ffd890', 0.12 + 0.22 * open);
      gl.restore();
      // Brillos del agua sobre las tejas.
      g.save(); inImage(g, v);
      for (const sp of roofSpecks) {
        const a = Math.max(0, Math.sin(t * 2.2 * sp.s + sp.ph)) ** 8;
        if (a < 0.03) continue;
        g.fillStyle = css('#ffe2a8', a * 0.55);
        g.fillRect(sp.x, sp.y, sp.w * 3, 1.5);
      }
      g.restore();
      lighthouse(gl, v.X(1697), v.Y(214), t + 2.2, { len: 700, alpha: 0.26 });
      paintRain(g, W, H, t, { count: 480, speed: 1450, len: 36, angle: 0.08, color: '#d6dfeb', alpha: 0.2, seed: 7, width: 1.1 });
      paintRain(g, W, H, t, { count: 70, speed: 2000, len: 64, angle: 0.08, color: '#e7edf5', alpha: 0.26, seed: 8, width: 1.5 });
    },

    // ── Primer plano: las gafas se encienden ──
    goggles(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { vignette: 0.4, bloom: 0.25, threshold: 0.85 });
      const p = P.goggles;
      const v = view(p, lerp(1.0, 1.1, smoother(u)), 1000, 380);
      // Bokeh que flota detrás (se dibuja antes de la cara: va en la capa de luz, muy suave).
      drawPlate(g, img.goggles, v);
      gl.save(); inImage(gl, v);
      gl.globalCompositeOperation = 'lighter';
      for (const b of bokeh) {
        if (b.x > 520 && b.x < 1450) continue; // no sobre la cara
        const y = b.y - t * b.v;
        glow(gl, b.x + Math.sin(t * 0.6 + b.ph) * 8, y, b.r, b.c, 0.1 + 0.05 * Math.sin(t * 1.3 + b.ph));
      }
      gl.restore();
      // LEDs rojos que laten.
      const beat = 0.55 + 0.45 * Math.sin(t * 5.2);
      glow(gl, v.X(713), v.Y(355), 34 * v.S, '#ff4a32', 0.55 * beat);
      glow(gl, v.X(1225), v.Y(108), 30 * v.S, '#ff4a32', 0.5 * (0.6 + 0.4 * Math.sin(t * 4.1 + 1)));
      // Las lentes se encienden: un brillo cruza el cristal y crece la luz.
      const on = smooth(invLerp(0.35, 0.7, u));
      for (const [cx, cy, r] of [[840, 381, 85], [1090, 383, 88]]) {
        gl.save(); inImage(gl, v);
        gl.beginPath(); gl.arc(cx, cy, r, 0, TAU); gl.clip();
        gl.globalCompositeOperation = 'lighter';
        const sweep = lerp(-150, 150, smooth(invLerp(0.3, 0.62, u)));
        const gr = gl.createLinearGradient(cx + sweep - 30, cy - 30, cx + sweep + 30, cy + 30);
        gr.addColorStop(0, css('#ffffff', 0)); gr.addColorStop(0.5, css('#fff6dc', 0.32 * env(u, 0.3, 0.4, 0.55, 0.65))); gr.addColorStop(1, css('#ffffff', 0));
        gl.fillStyle = gr; gl.fillRect(cx - r, cy - r, r * 2, r * 2);
        glow(gl, cx, cy, r * 1.1, '#ffd890', 0.22 * on * (0.85 + 0.15 * Math.sin(t * 7)));
        gl.restore();
      }
      paintRain(g, W, H, t, { count: 260, speed: 1300, len: 40, angle: 0.06, color: '#c9d6e6', alpha: 0.14, seed: 9, width: 1.2 });
      f.post.flash = smooth(invLerp(dur - 0.55, dur, t)); f.post.flashColor = [1, 0.97, 0.88];
    },

    // ── Túnel: atraviesa el anillo de nubes hacia el cielo ──
    tunnel(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { bloom: 0.3, threshold: 0.85, vignette: 0.3 });
      const p = P.tunnel;
      const s = lerp(1.0, 1.75, easeIn(u) * 0.6 + u * 0.4);
      const v = view(p, s, 971, 420);
      drawPlate(g, img.tunnel, v);
      gl.save(); gl.globalCompositeOperation = 'lighter';
      streaks(gl, t, v.X(971), v.Y(420), tunnelStreaks, { speed: 1.2, alpha: 0.75 });
      gl.restore();
      f.post.zoom = 0.025 + 0.04 * u; f.post.zoomCenter = [v.X(971) / W, 1 - v.Y(420) / H];
      f.post.flash = Math.max(1 - smooth(invLerp(0, 0.45, t)), smooth(invLerp(dur - 0.35, dur, t)));
      f.post.flashColor = [1, 0.98, 0.92];
    },

    // ── Nubaria: la cámara se abre y aparece el mundo ──
    reveal(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { bloom: 0.18, threshold: 0.9 });
      const p = P.reveal;
      const s = lerp(1.14, 1.0, easeOut(u * 1.15));
      const v = view(p, s, 1110, 300);
      const vNear = view(p, 1 + (s - 1) * 1.1, 1110, 300);
      drawPlate(g, img.reveal, v);
      glow(gl, v.X(1645), v.Y(95), 150 * v.S, '#fff6d8', 0.22 + 0.05 * Math.sin(t * 1.3));
      // Pájaros lejanos.
      g.save(); inImage(g, v); flock(g, t, revealBirds); g.restore();
      // Islas que flotan (la grande más cerca de la cámara).
      const [li, lb] = L('reveal', 'left');
      const ldy = Math.sin(t * 0.8 + 1.3) * 5;
      drawLayer(g, li, lb, v, { dy: ldy });
      g.save(); inImage(g, v); g.translate(0, ldy); waterfall(g, t, 182, 365, 560, 10, 3); g.restore();
      const [mi, mb] = L('reveal', 'isle');
      const mdy = Math.sin(t * 0.9) * 4;
      drawLayer(g, mi, mb, vNear, { dy: mdy });
      g.save(); inImage(g, vNear); g.translate(0, mdy);
      waterfall(g, t, 876, 545, 809, 14, 1);
      waterfall(g, t + 0.4, 1366, 550, 809, 12, 2);
      g.restore();
      f.post.flash = 1 - smooth(invLerp(0, 0.7, t)); f.post.flashColor = [1, 0.98, 0.92];
      f.post.rays = 0.12; f.post.sun = [v.X(1645) / W, 1 - v.Y(95) / H]; f.post.raysDecay = 0.95; f.post.raysDensity = 0.8;
    },

    // ── Acantilado: el viento mueve la bufanda y las hojas ──
    cliff(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const p = P.cliff;
      const v = view(p, lerp(1.0, 1.06, smoother(u)), 1240, 380);
      drawPlate(g, img.cliff, v);
      // Bufanda al viento: tiras verticales con una onda que crece hacia la punta.
      const [si, sb] = L('cliff', 'scarf');
      g.save(); inImage(g, v);
      const x0 = 1262, x1 = sb.x + sb.w;
      for (let sx = 0; sx < sb.w; sx += 2) {
        const x = sb.x + sx;
        const k = clamp((x - x0) / (x1 - x0));
        const a = 14 * k ** 1.25;
        const dy = a * Math.sin(x * 0.017 - t * 5.4) + a * 0.35 * Math.sin(x * 0.043 - t * 8.7 + 1);
        g.drawImage(si, sx, 0, 2, sb.h, x, sb.y + dy, 2, sb.h);
      }
      g.restore();
      g.save(); inImage(g, v); leaves(g, t, cliffLeaves); leaves(g, t * 0.8, cliffPetals); g.restore();
    },

    // ── El santuario: la cámara se acerca a la llave ──
    shrine(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { bloom: 0.25, threshold: 0.86 });
      const p = P.shrine;
      const s = lerp(1.0, 1.2, smoother(u));
      const v = view(p, s, 988, 330);
      const vNear = view(p, 1 + (s - 1) * 1.15, 988, 330);
      drawPlate(g, img.shrine, v);
      // Haz de luz que tiembla y motas doradas que suben.
      gl.save(); inImage(gl, v); gl.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = 920 + i * 34 + Math.sin(t * 0.9 + i * 1.7) * 10;
        const a = 0.05 + 0.04 * Math.sin(t * 1.6 + i * 2.1);
        const gr = gl.createLinearGradient(0, -20, 0, 430);
        gr.addColorStop(0, css('#fff4c8', a)); gr.addColorStop(1, css('#fff4c8', 0));
        gl.fillStyle = gr; gl.fillRect(x - 12, -20, 24, 450);
      }
      for (const m of motes) {
        const y = m.y - ((t * 26 * m.s + m.ph * 60) % 420);
        const yy = y < 30 ? y + 420 : y;
        const a = 0.5 + 0.5 * Math.sin(t * 3 * m.s + m.ph);
        glow(gl, m.x + Math.sin(t * 0.8 + m.ph) * 9, yy, 4 + m.w * 2, '#ffe39a', 0.35 * a);
      }
      gl.restore();
      // La llave flota y gira despacio.
      const [ki, kb] = L('shrine', 'key');
      const kdy = Math.sin(t * 1.5) * 6;
      const turn = 0.82 + 0.18 * Math.cos(t * 1.1);
      drawLayer(g, ki, kb, v, { dy: kdy, sx: turn });
      glow(gl, v.X(988), v.Y(300 + kdy), 190 * v.S, '#ffe08a', 0.28 + 0.08 * Math.sin(t * 2.3));
      // Las otras dos llaves, como fantasmas, al final.
      const ghost = smooth(invLerp(dur - 1.6, dur - 0.4, t));
      if (ghost > 0) {
        drawLayer(g, ki, kb, v, { dx: -560, dy: -30 + Math.sin(t * 1.3 + 1) * 6, sc: 0.7, alpha: 0.35 * ghost });
        drawLayer(g, ki, kb, v, { dx: 560, dy: -30 + Math.sin(t * 1.4 + 2) * 6, sc: 0.7, alpha: 0.35 * ghost });
        glow(gl, v.X(428), v.Y(270), 120 * v.S, '#ffe08a', 0.18 * ghost);
        glow(gl, v.X(1548), v.Y(270), 120 * v.S, '#ffe08a', 0.18 * ghost);
      }
      // Hierba delantera: más cerca de la cámara y mecida por el viento.
      const [fi, fb] = L('shrine', 'fg');
      g.save(); inImage(g, vNear);
      for (let sy = 0; sy < fb.h; sy += 3) {
        const k = 1 - sy / fb.h;
        const dx = Math.sin(t * 1.7 + sy * 0.05) * 4 * k * k + Math.sin(t * 0.9) * 3 * k;
        g.drawImage(fi, 0, sy, fb.w, 3, fb.x + dx, fb.y + sy, fb.w, 3);
      }
      g.restore();
      f.post.rays = 0.18; f.post.sun = [v.X(988) / W, 1 - v.Y(40) / H]; f.post.raysDecay = 0.96; f.post.raysDensity = 0.9;
    },

    // ── Pasada: el planeador vuela hacia el horizonte ──
    flyby(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const p = P.flyby;
      const v = view(p, lerp(1.02, 1.1, u), 860, 430);
      drawPlate(g, img.flyby, v);
      const [gi, gb] = L('flyby', 'glider');
      drawLayer(g, gi, gb, v, { dx: Math.sin(t * 0.9) * 5, dy: Math.sin(t * 1.3) * 6, rot: Math.sin(t * 0.8) * 0.025 });
      wisps(g, t, flybyWisps, W / 2, 520);
    },

    // ── Persecución entre islas ──
    chase(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const p = P.chase;
      const v = view(p, lerp(1.03, 1.1, u), 990, 560, lerp(14, -14, u), 0);
      drawPlate(g, img.chase, v);
      const [gi, gb] = L('chase', 'glider');
      drawLayer(g, gi, gb, v, { dx: Math.sin(t * 1.1) * 6, dy: Math.sin(t * 1.6) * 7, rot: Math.sin(t * 1.2) * 0.03 });
      wisps(g, t, chaseWisps, W / 2, 560);
    },

    // ── La ballena del cielo ──
    whale(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const p = P.whale;
      const v = view(p, lerp(1.06, 1.0, smoother(u)), 900, 380);
      drawPlate(g, img.whale, v);
      const [wi, wb] = L('whale', 'whale');
      drawLayer(g, wi, wb, v, { dx: lerp(3, -3, u), dy: lerp(3, -4, smooth(u)) + Math.sin(t * 0.9) * 2, rot: Math.sin(t * 0.6) * 0.002 });
      g.save(); inImage(g, v); flock(g, t, whaleBirds); g.restore();
      const [gi, gb] = L('whale', 'glider');
      drawLayer(g, gi, gb, v, { dx: lerp(8, -10, u), dy: Math.sin(t * 1.5) * 4, rot: Math.sin(t * 1.1) * 0.04 });
      // Jirones de nube delante, más rápidos (profundidad).
      g.save(); inImage(g, v);
      for (const w of whaleWisps) {
        g.globalAlpha = 0.55;
        g.drawImage(w.img, w.x0 + w.vx * t - w.img.width / 2, w.y - w.img.height / 2, w.img.width * 1.2, w.img.height * 1.2);
      }
      g.restore();
    },

    // ── La sombra del dirigible ──
    airship(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { vignette: 0.38, bloom: 0.22, threshold: 0.85 });
      const p = P.airship;
      const v = view(p, lerp(1.08, 1.0, smoother(u)), 970, 330);
      drawPlate(g, img.airship, v);
      // Faros que laten y ventanas de la góndola.
      for (const [x, y, r, ph] of [[87, 113, 90, 0], [1853, 113, 90, 1.7], [963, 417, 70, 0.6], [583, 342, 40, 2.4]]) {
        glow(gl, v.X(x), v.Y(y), r * v.S, '#ff7a3a', 0.35 + 0.2 * Math.sin(t * 3.1 + ph));
      }
      gl.save(); inImage(gl, v);
      gl.globalAlpha = 0.25 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
      gl.fillStyle = '#ffb060'; gl.fillRect(850, 328, 226, 32);
      // Haces de los reflectores que barren las nubes.
      gl.globalCompositeOperation = 'lighter';
      for (const [x, ph] of [[700, 0], [1240, 1.9]]) {
        const a = Math.sin(t * 0.7 + ph) * 0.35;
        gl.save(); gl.translate(x, 395); gl.rotate(a);
        const gr = gl.createLinearGradient(0, 0, 0, 520);
        gr.addColorStop(0, css('#fff0d0', 0.16)); gr.addColorStop(1, css('#fff0d0', 0));
        gl.fillStyle = gr;
        gl.beginPath(); gl.moveTo(-8, 0); gl.lineTo(8, 0); gl.lineTo(90, 520); gl.lineTo(-90, 520); gl.closePath(); gl.fill();
        gl.restore();
      }
      gl.restore();
      // Chispas que caen junto al casco.
      g.save(); inImage(g, v);
      for (const e of airshipEmbers) {
        const y = e.y + ((t * 60 * e.s + e.ph * 50) % 260);
        g.fillStyle = css('#ffb070', 0.35 + 0.3 * Math.sin(t * 4 + e.ph));
        g.fillRect(e.x, y, 1.4, 6 + e.w * 3);
      }
      g.restore();
      const [gi, gb] = L('airship', 'glider');
      drawLayer(g, gi, gb, v, { dx: lerp(-6, 8, u), dy: Math.sin(t * 1.4) * 4, rot: Math.sin(t * 1.2) * 0.04 });
    },

    // ── Picado hacia el sol ──
    dive(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { bloom: 0.35, threshold: 0.82 });
      const p = P.dive;
      const SUN = [1067, 317];
      const v = view(p, lerp(1.0, 1.4, easeIn(u) * 0.7 + u * 0.3), SUN[0], SUN[1]);
      drawPlate(g, img.dive, v);
      gl.save(); gl.globalCompositeOperation = 'lighter';
      streaks(gl, t, v.X(SUN[0]), v.Y(SUN[1]), diveStreaks, { speed: lerp(0.8, 1.6, u), alpha: 0.7 });
      gl.restore();
      glow(gl, v.X(SUN[0]), v.Y(SUN[1]), (200 + 200 * easeIn(u)) * v.S, '#fff6d8', 0.24 + 0.3 * easeIn(u));
      const [gi, gb] = L('dive', 'glider');
      const k = easeIn(u);
      drawLayer(g, gi, gb, v, { dx: lerp(0, SUN[0] - 1015, k), dy: lerp(0, SUN[1] + 60 - 633, k), sc: lerp(1, 0.28, k), rot: Math.sin(t * 2.2) * 0.05 });
      f.post.rays = 0.25 + 0.3 * u; f.post.sun = [v.X(SUN[0]) / W, 1 - v.Y(SUN[1]) / H]; f.post.raysDecay = 0.96; f.post.raysDensity = 0.95;
      f.post.zoom = 0.015 + 0.03 * easeIn(u); f.post.zoomCenter = f.post.sun;
      f.post.flash = smooth(invLerp(dur - 0.45, dur, t));
    },

    // ── Título al atardecer ──
    title(f) {
      const { g, glow: gl, lt: t, u, T } = f;
      neutral(f, { bloom: 0.2, threshold: 0.88, vignette: 0.32 });
      const p = P.title;
      const v = view(p, lerp(1.0, 1.06, smoother(u)), 980, 380);
      drawPlate(g, img.title, v);
      glow(gl, v.X(1513), v.Y(517), 180 * v.S, '#ffd7a0', 0.22 + 0.06 * Math.sin(t * 1.2));
      g.save(); inImage(g, v); flock(g, t, titleBirds); g.restore();
      const [ii, ib] = L('title', 'isle');
      drawLayer(g, ii, ib, v, { dy: Math.sin(t * 0.75) * 6 });
      f.post.flash = 1 - smooth(invLerp(0, 1.0, t));
      f.post.fade = smooth(invLerp(TITLE.out, DURATION, T));
    },
  };
  return { shots };
}
