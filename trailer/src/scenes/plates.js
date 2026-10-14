// Mundo «plates»: cada plano usa como fondo la ilustración del cliente (su versión
// Ghibli del fotograma), separada en capas rígidas como en la animación clásica
// (fondo, plano medio, primer plano): la cámara se mueve sobre ellas y cada capa se
// desplaza un poco distinto, sin deformar nunca la pintura. Encima se anima por
// código lo que vive: islas que flotan, planeador, ballena, llave, bufanda, hierba,
// lluvia, faro, ventanas, cascadas, pájaros, hojas, estelas y destellos.
// Todo depende solo del tiempo.

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

// ─── Cámara ─────────────────────────────────────────────────────────────────
// zoom 1 = encuadre del cliente. (fx, fy): punto de la ilustración hacia el que se
// acerca, que se queda quieto en pantalla; pan desplaza el encuadre (px de pantalla);
// roll gira. Si el encuadre dejara ver el borde de la imagen, acerca un poco más.
function cam(p, o = {}) {
  const k0 = Math.max(W / p.w, H / p.h);
  const fx = o.fx ?? p.w / 2, fy = o.fy ?? p.h / 2, roll = o.roll ?? 0;
  const c = { F: [fx, fy], A: [fx * k0 + (o.pan?.[0] ?? 0), fy * k0 + (o.pan?.[1] ?? 0)], c: Math.cos(roll), s: Math.sin(roll), S: k0 * (o.zoom ?? 1) };
  for (let i = 0; i < 40 && !covers(c, p); i++) c.S *= 1.01;
  return c;
}
function covers(c, p) {
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const dx = x - c.A[0], dy = y - c.A[1];
    const qx = c.F[0] + (c.c * dx + c.s * dy) / c.S, qy = c.F[1] + (-c.s * dx + c.c * dy) / c.S;
    if (qx < 0 || qy < 0 || qx > p.w || qy > p.h) return false;
  }
  return true;
}
// Variante para una capa: algo más de zoom (está más cerca) y su propio desplazamiento.
function sub(c, zoom = 1, pan = [0, 0]) {
  return { ...c, S: c.S * zoom, A: [c.A[0] + pan[0], c.A[1] + pan[1]] };
}
// Coloca el contexto en coordenadas de la ilustración.
function place(g, c) {
  const a = c.S * c.c, b = c.S * c.s;
  g.setTransform(a, b, -b, a, c.A[0] - (a * c.F[0] - b * c.F[1]), c.A[1] - (b * c.F[0] + a * c.F[1]));
}
// Punto de la ilustración en pantalla.
function scr(c, x, y) {
  const vx = x - c.F[0], vy = y - c.F[1];
  return [c.A[0] + c.S * (c.c * vx - c.s * vy), c.A[1] + c.S * (c.s * vx + c.c * vy), c.S];
}

function drawImg(g, c, im, x = 0, y = 0) {
  g.save(); place(g, c); g.drawImage(im, x, y); g.restore();
}
// Capa recortada: se mueve (dx, dy), gira y escala alrededor de su centro (o de cx, cy).
function layer(g, c, im, b, o = {}) {
  const cx = o.cx ?? b.x + b.w / 2, cy = o.cy ?? b.y + b.h / 2;
  const s = o.sc ?? 1;
  g.save();
  place(g, c);
  g.globalAlpha = o.alpha ?? 1;
  g.translate(cx + (o.dx ?? 0), cy + (o.dy ?? 0));
  if (o.rot) g.rotate(o.rot);
  g.scale(s * (o.sx ?? 1), s);
  g.drawImage(im, b.x - cx, b.y - cy);
  g.restore();
}

// Post neutro: la ilustración ya trae su color; solo un toque de grano y viñeta.
function neutral(f, o = {}) {
  Object.assign(f.post, { exposure: 1, sat: 1, contrast: 1, lift: [0, 0, 0], gain: [1, 1, 1], bloom: 0.14, threshold: 0.92, vignette: 0.3, grain: 0.022 }, o);
  f.stage.setGlowGain(1);
}

// ─── Pequeños efectos ───────────────────────────────────────────────────────
function makeSpecks(seed, n, x0, y0, x1, y1) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => ({ x: lerp(x0, x1, r()), y: lerp(y0, y1, r()), w: 0.8 + r() * 2.4, ph: r() * TAU, s: 0.6 + r() * 1.2 }));
}

// Pájaro: una «v» que aletea.
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

// Hojas y pétalos que cruzan con el viento (en pantalla).
function leaves(g, t, list) {
  for (const l of list) {
    const u = ((l.u0 + t * l.v) % 1 + 1) % 1;
    const x = lerp(l.x0, l.x1, u), y = lerp(l.y0, l.y1, u) + Math.sin(t * l.wf + l.ph) * l.wa;
    const a = Math.sin(u * Math.PI);
    g.save();
    g.translate(x, y);
    g.rotate(t * l.spin + l.ph);
    g.scale(1, 0.45 + 0.4 * Math.sin(t * l.spin * 1.7 + l.ph));
    if (l.blur) g.filter = `blur(${l.blur}px)`;
    g.fillStyle = css(l.c, 0.92 * a);
    g.beginPath(); g.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, TAU); g.fill();
    g.restore();
  }
}
function makeLeaves(seed, n, box, colors, { v = [0.12, 0.24], s = [4, 10], blur = 0 } = {}) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const y0 = lerp(box[1], box[3], r());
    return { u0: r(), v: lerp(v[0], v[1], r()), x0: box[0] - 80, x1: box[2] + 80, y0, y1: y0 + (r() - 0.6) * 260, wf: 1.5 + r() * 2, wa: 8 + r() * 18, ph: r() * TAU, spin: 1.5 + r() * 3, s: lerp(s[0], s[1], r()), c: colors[Math.floor(r() * colors.length)], blur };
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

// Cascada viva: hilos de agua que bajan sobre la cascada pintada.
function waterfall(g, t, x, y0, y1, w, seed) {
  const r = mulberry32(seed);
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const xx = x + (r() - 0.5) * w;
    const sp = 280 + r() * 180;
    g.setLineDash([18 + r() * 30, 22 + r() * 40]);
    g.lineDashOffset = -t * sp - r() * 200;
    g.strokeStyle = css('#ffffff', 0.32 + r() * 0.28);
    g.lineWidth = 1.4 + r() * 2;
    g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx + (r() - 0.5) * 3, y1); g.stroke();
  }
  g.setLineDash([]);
  g.restore();
}

// Haz del faro (capa de luz): gira sobre sí mismo, así que visto de lado se alarga y
// se acorta sobre el mar, y destella cuando apunta a la cámara.
function lighthouse(gl, x, y, t, { len = 900, spread = 0.045, speed = 1.1, alpha = 0.22, color = '#fff1c8' } = {}) {
  const c = Math.cos(t * speed);
  const ang = Math.PI - 0.05 + Math.sin(t * speed * 0.5) * 0.06;
  const L = len * (0.35 + 0.65 * Math.abs(Math.sin(t * speed)));
  const k = c < 0 ? 1 : 0.35;
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

// Solo las luces cálidas (ventanas, farolas) de una imagen, para hacerlas respirar.
function warmLights(im) {
  const w = im.width, h = im.height;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const k = clamp((a[i] - 170) / 60) * clamp((a[i + 1] - 120) / 60) * clamp((a[i] - a[i + 2] - 60) / 60);
    a[i + 3] = Math.round(a[i + 3] * k);
  }
  g.putImageData(d, 0, 0);
  const out = makeCanvas(w, h);
  const o = out.getContext('2d');
  o.filter = 'blur(3px)'; o.drawImage(c, 0, 0); o.filter = 'none'; o.drawImage(c, 0, 0);
  return out;
}
// Las ventanas respiran a ritmos distintos por franjas (en la capa de luz).
function breathe(gl, c, lights, t, x0 = 0, y0 = 0, amp = 0.22) {
  gl.save(); place(gl, c);
  const n = 7, bw = lights.width / n;
  for (let i = 0; i < n; i++) {
    gl.save();
    gl.beginPath(); gl.rect(x0 + i * bw, y0, bw + 1, lights.height); gl.clip();
    gl.globalAlpha = amp * (0.6 + 0.4 * Math.sin(t * (1.1 + i * 0.23) + i * 1.9));
    gl.drawImage(lights, x0, y0);
    gl.restore();
  }
  gl.restore();
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
// Jirones que salen del centro hacia los bordes, creciendo: vuelo hacia delante.
function wisps(g, t, list, cx, cy, speed = 1) {
  for (const s of list) {
    const u = ((s.u0 + t * s.v * speed) % 1 + 1) % 1;
    const d = lerp(0.2, 1.7, u * u);
    const x = cx + Math.cos(s.a) * d * 900, y = cy + Math.sin(s.a) * d * 420;
    const k = lerp(0.7, 3.2, u * u) * s.k;
    g.globalAlpha = s.alpha * Math.sin(Math.min(1, u * 1.4) * Math.PI) ** 1.5;
    g.drawImage(s.img, x - (s.img.width * k) / 2, y - (s.img.height * k) / 2, s.img.width * k, s.img.height * k);
  }
  g.globalAlpha = 1;
}
// Bancos de nube delante que cruzan despacio de lado (dan profundidad sin tocar la pintura).
function drift(g, t, list) {
  for (const w of list) {
    const x = w.x0 + w.vx * t;
    g.globalAlpha = w.alpha;
    g.drawImage(w.img, x - (w.img.width * w.k) / 2, w.y - (w.img.height * w.k) / 2, w.img.width * w.k, w.img.height * w.k);
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
  const L = (shot, name) => [img[`${shot}-${name}`], P[shot].layers[name]];

  // Materiales precalculados.
  const lights = {
    town: warmLights(img.town), townFront: warmLights(img['town-front']),
    roof: warmLights(img.roof), roofNear: warmLights(img['roof-near']),
  };
  const seaSpecks = makeSpecks(11, 90, 780, 318, 980, 400);
  const roofSpecks = makeSpecks(12, 160, 0, 600, 1942, 809);
  const bokehR = mulberry32(13);
  const bokeh = Array.from({ length: 22 }, () => ({ x: bokehR() * 1920, y: bokehR() * 900, r: 18 + bokehR() * 46, c: bokehR() < 0.75 ? '#f2b45a' : '#7fb6d8', ph: bokehR() * TAU, v: 12 + bokehR() * 22 }));
  const tunnelStreaks = makeStreaks(21, 110, { r0: 60, r1: 1300, len: 170, w: 2.6, colors: ['#ffd98a', '#ffe9b0', '#bfe4ff', '#ffffff'] });
  const revealBirds = makeFlock(31, 7, 260, 300, 160, 40, -4, 9, '#33405a', 0.8);
  const revealBirds2 = makeFlock(32, 5, 1250, 190, 120, -34, 3, 7, '#3a4660', 0.7);
  const revealLeaves = makeLeaves(33, 8, [0, 80, 1920, 700], ['#7fbf4a', '#a7d65a', '#5ea33a'], { v: [0.14, 0.24] });
  const revealDrift = [[0, 610, 640, 199], [1250, 600, 660, 209]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.reveal, x, y, w, h), x0: [-260, 2150][i], vx: [34, -30][i], y: [760, 770][i], k: [1.9, 2.0][i], alpha: 0.85 }));
  const cliffLeaves = makeLeaves(41, 18, [0, 40, 1920, 600], ['#7fbf4a', '#5ea33a', '#a7d65a', '#4f8f35'], { v: [0.14, 0.26] });
  const cliffPetals = makeLeaves(42, 22, [0, 480, 1920, 800], ['#ffffff', '#fbe64a', '#f7d6e0'], { v: [0.12, 0.22], s: [3, 7] });
  const cliffNear = makeLeaves(43, 4, [0, 0, 1920, 800], ['#6aa83e', '#8cc94e'], { v: [0.34, 0.46], s: [14, 22], blur: 3 });
  const shrinePetals = makeLeaves(44, 14, [0, 100, 1920, 760], ['#ffffff', '#fbe64a', '#d9f0ff', '#a7d65a'], { v: [0.1, 0.2], s: [3, 7] });
  const motes = makeSpecks(51, 54, 880, 40, 1100, 470);
  const flybyWisps = [[0, 590, 520, 210], [700, 600, 560, 200], [1350, 610, 560, 190], [200, 470, 420, 150], [1500, 480, 420, 150]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.flyby, x, y, w, h), a: [2.6, 1.9, 0.6, 3.4, 5.9][i], u0: i * 0.21, v: 0.34, k: 0.85, alpha: 0.75 }));
  const chaseWisps = [[0, 620, 520, 180], [760, 640, 520, 160], [1380, 600, 540, 190], [300, 690, 480, 119], [1500, 500, 420, 150]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.chase, x, y, w, h), a: [2.5, 1.7, 0.5, 2.9, 5.8][i], u0: i * 0.23 + 0.1, v: 0.38, k: 0.85, alpha: 0.75 }));
  const whaleDrift = [[0, 640, 560, 169], [1250, 660, 600, 149], [600, 700, 520, 109]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.whale, x, y, w, h), x0: [-300, 2200, 1000][i], vx: [150, -170, -120][i], y: [740, 700, 790][i], k: [1.6, 1.7, 2.1][i], alpha: 0.7 }));
  const whaleBirds = makeFlock(61, 8, 600, 60, 260, 34, -5, 7, '#22304a', 0.75);
  const diveStreaks = makeStreaks(71, 70, { r0: 120, r1: 1500, len: 260, w: 3, colors: ['#ffffff', '#fffaf0', '#eaf6ff'] });
  const diveWisps = [[0, 560, 560, 200], [1300, 520, 600, 220], [500, 650, 600, 159]].map(([x, y, w, h], i) => ({ img: cloudSprite(img.dive, x, y, w, h), a: [2.7, 0.4, 1.8][i], u0: i * 0.33, v: 0.45, k: 0.9, alpha: 0.75 }));
  const airshipEmbers = makeSpecks(81, 50, 100, 40, 1850, 420);
  const titleBirds = makeFlock(91, 6, 1120, 300, 160, 26, -3, 8, '#3a2f45', 0.8);
  const titlePetals = makeLeaves(92, 8, [0, 200, 1920, 700], ['#ffd8a8', '#fff1d6', '#f7c6b0'], { v: [0.07, 0.14], s: [3, 6] });

  const shots = {
    // ── Pueblo bajo la lluvia: la cámara se acerca de lado; el poste y las casas de delante corren más ──
    town(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { vignette: 0.38 });
      const e = easeInOut(u);
      const c = cam(P.town, { zoom: lerp(1.06, 1.16, e), fx: 985, fy: lerp(300, 336, e), pan: [lerp(26, -26, e), 0] });
      const cFront = sub(c, 1, [lerp(12, -12, e), 0]);
      const cPole = sub(c, 1, [lerp(20, -20, e), 0]);
      drawImg(g, c, img.town);
      breathe(gl, c, lights.town, t);
      g.save(); place(g, c);
      for (const s of seaSpecks) {
        const a = Math.max(0, Math.sin(t * 2.6 * s.s + s.ph)) ** 6;
        if (a < 0.02) continue;
        g.fillStyle = css('#fff3cf', a * 0.95);
        g.fillRect(s.x - s.w, s.y, s.w * 2.4, 1.6);
      }
      g.restore();
      const [lx, ly] = scr(c, 1687, 222);
      lighthouse(gl, lx, ly, t + 0.6, { len: 1100 });
      const [fi, fb] = L('town', 'front');
      layer(g, cFront, fi, fb);
      breathe(gl, cFront, lights.townFront, t + 3, fb.x, fb.y);
      const [pi, pb] = L('town', 'pole');
      layer(g, cPole, pi, pb);
      // Relámpago lejano entre las nubes.
      const flashA = env(t, 3.9, 3.95, 4.0, 4.12) * 0.8 + env(t, 4.2, 4.24, 4.3, 4.5) * 0.5;
      if (flashA > 0) {
        const gr = gl.createLinearGradient(0, 0, 0, 420);
        gr.addColorStop(0, css('#d8e2ff', 0.4 * flashA)); gr.addColorStop(1, css('#d8e2ff', 0));
        gl.fillStyle = gr; gl.fillRect(0, 0, W, 420);
      }
      paintRain(g, W, H, t, { count: 650, speed: 1600, len: 40, angle: 0.12, color: '#d6dfeb', alpha: 0.22, seed: 5, width: 1.1 });
      paintRain(g, W, H, t, { count: 120, speed: 2300, len: 80, angle: 0.12, color: '#e7edf5', alpha: 0.3, seed: 6, width: 1.7 });
      f.post.fade = 1 - smooth(invLerp(0, 1.4, t));
    },

    // ── En el tejado: de cerca a ella y al gato, la cámara retrocede hasta el horizonte ──
    roof(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { vignette: 0.38 });
      const e = easeOut(u);
      const c = cam(P.roof, { zoom: lerp(1.3, 1.04, e), fx: lerp(880, 971, e), fy: lerp(478, 404, e) });
      const cNear = sub(c, 1 + 0.008 * (1 - e));
      drawImg(g, c, img.roof);
      breathe(gl, c, lights.roof, t);
      // El claro dorado del horizonte se abre mientras ella mira.
      const open = smooth(invLerp(0.15, 1, u));
      const [hx, hy, hs] = scr(c, 990, 305);
      gl.save(); gl.translate(hx, hy); gl.scale(1, 0.13);
      glow(gl, 0, 0, 720 * hs, '#ffd890', 0.1 + 0.24 * open);
      gl.restore();
      const [lx, ly] = scr(c, 1697, 214);
      lighthouse(gl, lx, ly, t + 2.2, { len: 800, alpha: 0.2 });
      const [ni, nb] = L('roof', 'near');
      layer(g, cNear, ni, nb);
      breathe(gl, cNear, lights.roofNear, t + 1, nb.x, nb.y, 0.15);
      // Brillos del agua sobre las tejas.
      g.save(); place(g, cNear);
      for (const sp of roofSpecks) {
        const a = Math.max(0, Math.sin(t * 2.4 * sp.s + sp.ph)) ** 8;
        if (a < 0.03) continue;
        g.fillStyle = css('#ffe2a8', a * 0.6);
        g.fillRect(sp.x, sp.y, sp.w * 3, 1.5);
      }
      g.restore();
      paintRain(g, W, H, t, { count: 580, speed: 1550, len: 38, angle: 0.1, color: '#d6dfeb', alpha: 0.22, seed: 7, width: 1.1 });
      paintRain(g, W, H, t, { count: 100, speed: 2200, len: 74, angle: 0.1, color: '#e7edf5', alpha: 0.28, seed: 8, width: 1.6 });
    },

    // ── Primer plano: las gafas se encienden ──
    goggles(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { vignette: 0.42, bloom: 0.25, threshold: 0.85 });
      const e = smoother(u);
      const c = cam(P.goggles, { zoom: lerp(1.05, 1.15, e), fx: 965, fy: 400 });
      const cFace = sub(c, 1 + 0.02 * e);
      drawImg(g, c, img.goggles);
      // Bokeh que sube despacio detrás de ella.
      gl.save(); gl.globalCompositeOperation = 'lighter';
      for (const b of bokeh) {
        const y = ((b.y - t * b.v) % 900 + 900) % 900 - 50;
        glow(gl, b.x + Math.sin(t * 0.6 + b.ph) * 14, y, b.r, b.c, 0.1 + 0.05 * Math.sin(t * 1.3 + b.ph));
      }
      gl.restore();
      const [fi, fb] = L('goggles', 'face');
      const sway = Math.sin(t * 0.9) * 0.004;
      layer(g, cFace, fi, fb, { rot: sway, cx: 965, cy: 700 });
      // LEDs rojos que laten (siguen a la cara).
      const beat = 0.55 + 0.45 * Math.sin(t * 5.2);
      const rotP = (x, y) => { const dx = x - 965, dy = y - 700, cs = Math.cos(sway), sn = Math.sin(sway); return scr(cFace, 965 + dx * cs - dy * sn, 700 + dx * sn + dy * cs); };
      const [l1x, l1y, s1] = rotP(713, 355);
      const [l2x, l2y] = rotP(1225, 108);
      glow(gl, l1x, l1y, 36 * s1, '#ff4a32', 0.6 * beat);
      glow(gl, l2x, l2y, 30 * s1, '#ff4a32', 0.55 * (0.6 + 0.4 * Math.sin(t * 4.1 + 1)));
      // Las lentes se encienden: un brillo cruza el cristal y crece la luz.
      const on = smooth(invLerp(0.35, 0.75, u));
      for (const [cx, cy, r] of [[840, 381, 85], [1090, 383, 88]]) {
        gl.save(); place(gl, cFace);
        gl.translate(965, 700); gl.rotate(sway); gl.translate(-965, -700);
        gl.beginPath(); gl.arc(cx, cy, r, 0, TAU); gl.clip();
        gl.globalCompositeOperation = 'lighter';
        const sweep = lerp(-150, 150, smooth(invLerp(0.28, 0.6, u)));
        const gr = gl.createLinearGradient(cx + sweep - 30, cy - 30, cx + sweep + 30, cy + 30);
        gr.addColorStop(0, css('#ffffff', 0)); gr.addColorStop(0.5, css('#fff6dc', 0.4 * env(u, 0.28, 0.38, 0.52, 0.62))); gr.addColorStop(1, css('#ffffff', 0));
        gl.fillStyle = gr; gl.fillRect(cx - r, cy - r, r * 2, r * 2);
        glow(gl, cx, cy, r * 1.1, '#ffd890', 0.3 * on * (0.85 + 0.15 * Math.sin(t * 7)));
        gl.restore();
      }
      paintRain(g, W, H, t, { count: 320, speed: 1400, len: 44, angle: 0.06, color: '#c9d6e6', alpha: 0.15, seed: 9, width: 1.2 });
      f.post.flash = smooth(invLerp(dur - 0.55, dur, t)); f.post.flashColor = [1, 0.97, 0.88];
    },

    // ── Túnel: atraviesa el anillo de nubes hacia el cielo ──
    tunnel(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { bloom: 0.3, threshold: 0.85, vignette: 0.3 });
      const k = easeIn(u) * 0.5 + u * 0.5;
      const c = cam(P.tunnel, { zoom: lerp(1.06, 1.6, k), fx: 971, fy: 420, roll: lerp(0, 0.16, k) });
      drawImg(g, c, img.tunnel);
      const [cx, cy] = scr(c, 971, 420);
      gl.save(); gl.globalCompositeOperation = 'lighter';
      streaks(gl, t, cx, cy, tunnelStreaks, { speed: lerp(1, 1.7, u), alpha: 0.8 });
      gl.restore();
      f.post.zoom = 0.03 + 0.04 * u; f.post.zoomCenter = [cx / W, 1 - cy / H];
      f.post.flash = Math.max(1 - smooth(invLerp(0, 0.45, t)), smooth(invLerp(dur - 0.35, dur, t)));
      f.post.flashColor = [1, 0.98, 0.92];
    },

    // ── Nubaria: la cámara se abre y aparece el mundo; las islas flotan ──
    reveal(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { bloom: 0.18, threshold: 0.9 });
      const e = easeInOut(u);
      const c = cam(P.reveal, { zoom: lerp(1.24, 1.04, e), fx: 1110, fy: lerp(360, 330, e) });
      drawImg(g, c, img.reveal);
      const [sx, sy, ss] = scr(c, 1645, 95);
      glow(gl, sx, sy, 150 * ss, '#fff6d8', 0.24 + 0.06 * Math.sin(t * 1.3));
      g.save(); place(g, c); flock(g, t, revealBirds); flock(g, t, revealBirds2); g.restore();
      const [li, lb] = L('reveal', 'left');
      const cLeft = sub(c, 1, [lerp(-5, 5, e), 0]);
      const ldy = Math.sin(t * 0.8 + 1.3) * 5;
      layer(g, cLeft, li, lb, { dy: ldy });
      g.save(); place(g, cLeft); g.translate(0, ldy); waterfall(g, t, 182, 365, 560, 10, 3); g.restore();
      const [mi, mb] = L('reveal', 'isle');
      const cIsle = sub(c, 1 + 0.01 * (1 - e), [lerp(-6, 6, e), 0]);
      const mdy = Math.sin(t * 0.9) * 5;
      layer(g, cIsle, mi, mb, { dy: mdy });
      g.save(); place(g, cIsle); g.translate(0, mdy);
      waterfall(g, t, 876, 545, 809, 14, 1);
      waterfall(g, t + 0.4, 1366, 550, 809, 12, 2);
      g.restore();
      drift(g, t, revealDrift);
      leaves(g, t, revealLeaves);
      f.post.flash = 1 - smooth(invLerp(0, 0.7, t)); f.post.flashColor = [1, 0.98, 0.92];
      f.post.rays = 0.14; f.post.sun = [sx / W, 1 - sy / H]; f.post.raysDecay = 0.95; f.post.raysDensity = 0.8;
    },

    // ── Acantilado: la cámara se desliza de lado; el prado y ella corren más que el cielo ──
    cliff(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const e = smoother(u);
      const c = cam(P.cliff, { zoom: lerp(1.06, 1.12, e), fx: 1240, fy: 400, pan: [lerp(24, -24, e), 0] });
      const cIsle = sub(c, 1, [lerp(-5, 5, e), 0]);
      const cFront = sub(c, 1, [lerp(10, -10, e), 0]);
      drawImg(g, c, img.cliff);
      const [ii, ib] = L('cliff', 'isle');
      layer(g, cIsle, ii, ib, { dy: Math.sin(t * 0.8) * 4 });
      const [fi, fb] = L('cliff', 'front');
      layer(g, cFront, fi, fb);
      // Bufanda al viento: tiras verticales con una onda que crece hacia la punta.
      const [si, sb] = L('cliff', 'scarf');
      g.save(); place(g, cFront);
      const x0 = 1262, x1 = sb.x + sb.w;
      for (let sx = 0; sx < sb.w; sx += 2) {
        const x = sb.x + sx;
        const k = clamp((x - x0) / (x1 - x0));
        const a = 16 * k ** 1.2;
        const dy = a * Math.sin(x * 0.017 - t * 6.2) + a * 0.4 * Math.sin(x * 0.043 - t * 9.7 + 1);
        g.drawImage(si, sx, 0, 2, sb.h, x, sb.y + dy, 2, sb.h);
      }
      g.restore();
      leaves(g, t, cliffLeaves); leaves(g, t * 0.8, cliffPetals); leaves(g, t, cliffNear);
    },

    // ── El santuario: la cámara avanza hacia la llave ──
    shrine(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { bloom: 0.25, threshold: 0.86 });
      const e = smoother(u);
      const c = cam(P.shrine, { zoom: lerp(1.04, 1.2, e), fx: 988, fy: 330 });
      const cPlat = sub(c, 1 + 0.01 * e);
      const cFg = sub(c, 1 + 0.008 * e);
      drawImg(g, c, img.shrine);
      const [pi, pb] = L('shrine', 'platform');
      layer(g, cPlat, pi, pb);
      // Haz de luz que tiembla y motas doradas que suben.
      gl.save(); place(gl, cPlat); gl.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = 912 + i * 30 + Math.sin(t * 1.1 + i * 1.7) * 12;
        const a = 0.05 + 0.045 * Math.sin(t * 1.8 + i * 2.1);
        const gr = gl.createLinearGradient(0, -40, 0, 430);
        gr.addColorStop(0, css('#fff4c8', a)); gr.addColorStop(1, css('#fff4c8', 0));
        gl.fillStyle = gr; gl.fillRect(x - 12, -40, 24, 470);
      }
      for (const m of motes) {
        const y = m.y - ((t * 30 * m.s + m.ph * 60) % 420);
        const yy = y < 30 ? y + 420 : y;
        const a = 0.5 + 0.5 * Math.sin(t * 3 * m.s + m.ph);
        glow(gl, m.x + Math.sin(t * 0.8 + m.ph) * 12, yy, 4 + m.w * 2, '#ffe39a', 0.38 * a);
      }
      gl.restore();
      // La llave flota y gira despacio sobre su pedestal.
      const [ki, kb] = L('shrine', 'key');
      const kdy = Math.sin(t * 1.5) * 6;
      const turn = Math.cos(t * 1.2);
      layer(g, cPlat, ki, kb, { dy: kdy, sx: 0.82 + 0.18 * turn });
      const [kx, ky, ks] = scr(cPlat, 988, 300 + kdy);
      glow(gl, kx, ky, 180 * ks, '#ffe08a', 0.16 + 0.07 * Math.sin(t * 2.3));
      // Las otras dos llaves, como fantasmas, al final.
      const ghost = smooth(invLerp(dur - 1.8, dur - 0.5, t));
      if (ghost > 0) {
        for (const [dx, ph] of [[-560, 1], [560, 2]]) {
          layer(g, cPlat, ki, kb, { dx, dy: -30 + Math.sin(t * 1.3 + ph) * 8, sc: 0.7, sx: 0.82 + 0.18 * Math.cos(t * 1.2 + ph), alpha: 0.38 * ghost });
          const [gx, gy, gs] = scr(cPlat, 988 + dx, 270);
          glow(gl, gx, gy, 130 * gs, '#ffe08a', 0.2 * ghost);
        }
      }
      // Hierba delantera, mecida por el viento (tiras horizontales).
      const [fi, fb] = L('shrine', 'fg');
      g.save(); place(g, cFg);
      for (let sy = 0; sy < fb.h; sy += 3) {
        const k = 1 - sy / fb.h;
        const dx = Math.sin(t * 1.9 + sy * 0.05) * 4 * k * k + Math.sin(t * 1.1) * 3 * k;
        g.drawImage(fi, 0, sy, fb.w, 3, fb.x + dx, fb.y + sy, fb.w, 3);
      }
      g.restore();
      leaves(g, t, shrinePetals);
      const [rx, ry] = scr(cPlat, 988, 40);
      f.post.rays = 0.2; f.post.sun = [rx / W, 1 - ry / H]; f.post.raysDecay = 0.96; f.post.raysDensity = 0.9;
    },

    // ── Pasada: el planeador entra desde abajo y se aleja hacia el horizonte ──
    flyby(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const c = cam(P.flyby, { zoom: lerp(1.05, 1.13, u), fx: 970, fy: 470, roll: Math.sin(t * 0.8) * 0.01 });
      drawImg(g, c, img.flyby);
      for (const [n, ph] of [['isleA', 0], ['isleB', 1.7], ['isleC', 3.1]]) {
        const [ii, ib] = L('flyby', n);
        layer(g, c, ii, ib, { dy: Math.sin(t * 0.9 + ph) * 6 });
      }
      const [gi, gb] = L('flyby', 'glider');
      const k = easeOut(u);
      layer(g, c, gi, gb, { dx: lerp(280, -20, k), dy: lerp(210, -6, k), sc: lerp(1.4, 0.9, k), rot: lerp(0.1, -0.02, k) + Math.sin(t * 1.4) * 0.04 });
      wisps(g, t, flybyWisps, W / 2, 520);
    },

    // ── Persecución entre islas: la cámara se inclina con el planeador ──
    chase(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const roll = lerp(-0.025, 0.03, smoother(u)) + Math.sin(t * 1.6) * 0.004;
      const c = cam(P.chase, { zoom: lerp(1.08, 1.16, u), fx: 990, fy: 540, roll });
      drawImg(g, c, img.chase);
      const [ii, ib] = L('chase', 'isleL');
      layer(g, c, ii, ib, { dy: Math.sin(t * 0.9 + 1) * 6 });
      const [gi, gb] = L('chase', 'glider');
      layer(g, c, gi, gb, { dx: Math.sin(t * 1.1) * 6, dy: Math.sin(t * 1.6) * 6, rot: Math.sin(t * 1.2) * 0.012 });
      wisps(g, t, chaseWisps, W / 2, 560);
    },

    // ── La ballena del cielo: la cámara la acompaña de lado ──
    whale(f) {
      const { g, lt: t, u } = f;
      neutral(f);
      const e = smoother(u);
      const c = cam(P.whale, { zoom: lerp(1.12, 1.05, e), fx: 950, fy: 380, pan: [lerp(30, -30, e), 0] });
      drawImg(g, c, img.whale);
      const [wi, wb] = L('whale', 'whale');
      layer(g, c, wi, wb, { dx: lerp(5, -5, u), dy: lerp(4, -5, e) + Math.sin(t * 0.9) * 2, rot: Math.sin(t * 0.6) * 0.002 });
      g.save(); place(g, c); flock(g, t, whaleBirds); g.restore();
      const [gi, gb] = L('whale', 'glider');
      layer(g, c, gi, gb, { dx: lerp(8, -10, u), dy: Math.sin(t * 1.5) * 4, rot: Math.sin(t * 1.1) * 0.03 });
      drift(g, t, whaleDrift);
    },

    // ── La sombra del dirigible: la cámara sube bajo el casco ──
    airship(f) {
      const { g, glow: gl, lt: t, u } = f;
      neutral(f, { vignette: 0.4, bloom: 0.22, threshold: 0.85 });
      const e = smoother(u);
      const c = cam(P.airship, { zoom: lerp(1.14, 1.04, e), fx: 970, fy: lerp(380, 300, e) });
      drawImg(g, c, img.airship);
      for (const [x, y, r, ph] of [[87, 113, 90, 0], [1853, 113, 90, 1.7], [963, 417, 70, 0.6], [583, 342, 40, 2.4]]) {
        const [px, py, ps] = scr(c, x, y);
        glow(gl, px, py, r * ps, '#ff7a3a', 0.35 + 0.25 * Math.sin(t * 3.1 + ph));
      }
      gl.save(); place(gl, c);
      gl.globalAlpha = 0.25 + 0.12 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
      gl.fillStyle = '#ffb060'; gl.fillRect(850, 328, 226, 32);
      // Haces de los reflectores que barren las nubes.
      gl.globalAlpha = 1;
      gl.globalCompositeOperation = 'lighter';
      for (const [x, ph] of [[700, 0], [1240, 1.9], [963, 3.1]]) {
        const a = Math.sin(t * 0.9 + ph) * 0.4;
        gl.save(); gl.translate(x, 395); gl.rotate(a);
        const gr = gl.createLinearGradient(0, 0, 0, 560);
        gr.addColorStop(0, css('#fff0d0', 0.16)); gr.addColorStop(1, css('#fff0d0', 0));
        gl.fillStyle = gr;
        gl.beginPath(); gl.moveTo(-8, 0); gl.lineTo(8, 0); gl.lineTo(100, 560); gl.lineTo(-100, 560); gl.closePath(); gl.fill();
        gl.restore();
      }
      gl.restore();
      // Chispas que caen junto al casco.
      g.save(); place(g, c);
      for (const em of airshipEmbers) {
        const y = em.y + ((t * 70 * em.s + em.ph * 50) % 300);
        g.fillStyle = css('#ffb070', 0.35 + 0.3 * Math.sin(t * 4 + em.ph));
        g.fillRect(em.x + Math.sin(t + em.ph) * 6, y, 1.5, 7 + em.w * 3);
      }
      g.restore();
      const [gi, gb] = L('airship', 'glider');
      layer(g, c, gi, gb, { dx: lerp(-8, 12, u), dy: lerp(4, -5, u) + Math.sin(t * 1.4) * 3, rot: Math.sin(t * 1.2) * 0.04 });
    },

    // ── Picado hacia el sol ──
    dive(f) {
      const { g, glow: gl, lt: t, u, dur } = f;
      neutral(f, { bloom: 0.35, threshold: 0.82 });
      const SUN = [1067, 317];
      const k = easeIn(u) * 0.6 + u * 0.4;
      const c = cam(P.dive, { zoom: lerp(1.06, 1.55, k), fx: SUN[0], fy: SUN[1], roll: lerp(0, 0.1, easeIn(u)) });
      drawImg(g, c, img.dive);
      const [cx, cy] = scr(c, SUN[0], SUN[1]);
      gl.save(); gl.globalCompositeOperation = 'lighter';
      streaks(gl, t, cx, cy, diveStreaks, { speed: lerp(0.9, 1.8, u), alpha: 0.7 });
      gl.restore();
      glow(gl, cx, cy, (200 + 220 * easeIn(u)) * c.S, '#fff6d8', 0.24 + 0.3 * easeIn(u));
      wisps(g, t, diveWisps, cx, cy, lerp(1, 1.5, u));
      const [gi, gb] = L('dive', 'glider');
      const kg = easeIn(u);
      layer(g, c, gi, gb, { dx: lerp(0, SUN[0] - 1015, kg), dy: lerp(0, SUN[1] + 60 - 633, kg), sc: lerp(1, 0.24, kg), rot: Math.sin(t * 2.2) * 0.06 - 0.15 * kg });
      f.post.rays = 0.25 + 0.3 * u; f.post.sun = [cx / W, 1 - cy / H]; f.post.raysDecay = 0.96; f.post.raysDensity = 0.95;
      f.post.zoom = 0.02 + 0.035 * easeIn(u); f.post.zoomCenter = f.post.sun;
      f.post.flash = smooth(invLerp(dur - 0.45, dur, t));
    },

    // ── Título al atardecer ──
    title(f) {
      const { g, glow: gl, lt: t, u, T } = f;
      neutral(f, { bloom: 0.2, threshold: 0.88, vignette: 0.32 });
      const e = smoother(u);
      const c = cam(P.title, { zoom: lerp(1.05, 1.12, e), fx: 980, fy: 380, pan: [lerp(18, -18, e), 0] });
      drawImg(g, c, img.title);
      const [sx, sy, ss] = scr(c, 1513, 517);
      glow(gl, sx, sy, 190 * ss, '#ffd7a0', 0.24 + 0.07 * Math.sin(t * 1.2));
      g.save(); place(g, c); flock(g, t, titleBirds); g.restore();
      const [ii, ib] = L('title', 'isle');
      layer(g, sub(c, 1, [lerp(-5, 5, e), 0]), ii, ib, { dy: Math.sin(t * 0.75) * 6 });
      leaves(g, t, titlePetals);
      f.post.rays = 0.12; f.post.sun = [sx / W, 1 - sy / H]; f.post.raysDecay = 0.95; f.post.raysDensity = 0.8;
      f.post.flash = 1 - smooth(invLerp(0, 1.0, t));
      f.post.fade = smooth(invLerp(TITLE.out, DURATION, T));
    },
  };
  return { shots };
}
