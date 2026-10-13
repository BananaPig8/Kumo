// Pinceles propios del mundo «meadow»: flores gordas como las de la
// referencia, franjas de hierba alta que ondulan con el viento, pétalos y
// hojas al vuelo, e islas lejanas pintadas como masas.

import { makeCanvas, fillBlob, blade, dab, stroke, mix, css, vary, renderMass, makeRamp, leafRamp, drawMass, bez } from '../../engine/paint.js';
import { clamp, lerp, smooth, noise3 } from '../../lib/util.js';

// ─── Flores ─────────────────────────────────────────────────────────────────
// [pétalo, sombra del pétalo, corazón, peso]. Colores de la referencia:
// amarillas, blancas, celestes y melocotón.
export const FLOWERS = [
  ['#fbe64a', '#e2b52a', '#f29a2e', 0.4],
  ['#fbfaee', '#d6dccb', '#f2c63a', 0.28],
  ['#a9dcef', '#78b5d4', '#f6f1c8', 0.16],
  ['#f9b07c', '#e2875a', '#fbe08a', 0.16],
];

// Flores en manchas (a la deriva, como en la referencia): pequeñas al fondo,
// gordas y blandas delante. size(t) da el radio según la profundidad t (0..1).
// mask(x, y) opcional: solo pinta donde devuelve true.
export function paintFlowers(g, rng, x0, y0, w, h, { n = 400, near = 12, far = 1.2, colors = FLOWERS, mask = null, seed = 1, patch = 0.7, light = [-0.6, -0.8] } = {}) {
  const pick = (x, y) => {
    // El color depende de una mancha de ruido: las flores crecen en grupos.
    const nz = noise3(x * 0.004, y * 0.012, seed);
    let r = patch * nz + (1 - patch) * rng();
    for (const f of colors) { if ((r -= f[3]) <= 0) return f; }
    return colors[0];
  };
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rng(), 0.7);
    const y = y0 + t * h, x = x0 + rng() * w;
    // Densidad modulada: claros sin flores y racimos.
    if (noise3(x * 0.006, y * 0.02, seed + 5) < 0.38) continue;
    if (mask && !mask(x, y)) continue;
    const s = lerp(far, near, t * t) * (0.7 + rng() * 0.6);
    const [petal, sh, heart] = pick(x, y);
    if (s < 2.6) {
      g.fillStyle = css(petal, 0.95);
      g.beginPath(); g.ellipse(x, y, s, s * 0.7, 0, 0, Math.PI * 2); g.fill();
      continue;
    }
    // Sombra suave bajo la flor (se asienta en la hierba).
    fillBlob(g, x + s * 0.2, y + s * 0.35, s * 1.1, s * 0.55, '#2f7a22', 0.25, { wobble: 0.2, n: 10, seed: i });
    const np = 5;
    const rot = rng() * 6.28;
    for (let k = 0; k < np; k++) {
      const a = rot + (k / np) * Math.PI * 2;
      const px = x + Math.cos(a) * s * 0.55, py = y + Math.sin(a) * s * 0.4;
      // Pétalos del lado de la luz más claros.
      const lit = Math.cos(a) * light[0] + Math.sin(a) * light[1];
      fillBlob(g, px, py, s * 0.55, s * 0.42, lit > 0 ? petal : mix(petal, sh, 0.55), 1, { wobble: 0.15, n: 10, rot: a, seed: k + i });
    }
    fillBlob(g, x, y, s * 0.3, s * 0.26, heart, 1, { wobble: 0.15, n: 9, seed: i * 2 });
    if (s > 5) fillBlob(g, x + light[0] * s * 0.45, y + light[1] * s * 0.3, s * 0.32, s * 0.2, mix(petal, '#ffffff', 0.6), 0.7, { wobble: 0.2, n: 8, seed: i * 3 });
  }
}

// ─── Hierba alta que ondula ─────────────────────────────────────────────────
// Franja de briznas pintada una vez. base(x) da la y (en el lienzo) donde
// nacen las briznas en cada columna; luego drawWaving la deforma por columnas
// verticales con una cizalla que sigue una ola que avanza (el viento).
export function grassStrip(rng, w, h, base, { pal, count = 1200, hMin = 20, hMax = 90, lean = 0.12, fill = true, tuft = 4, flowers = 0, flowerColors = FLOWERS, xMask = null, scale = null, rootJitter = 0.3, flowerSize = [3, 8] } = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  // Masa de fondo bajo las briznas (para que la franja tape lo de detrás).
  if (fill) {
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, base(x) - hMin * 0.25);
    g.lineTo(w, h); g.closePath();
    g.fillStyle = css(pal.near); g.fill();
  }
  const N = count;
  for (let i = 0; i < N; i++) {
    const p = i / N;
    const x = rng() * w;
    if (xMask && !xMask(x)) continue;
    const sc = scale ? scale(x) : 1;
    const by = base(x) + rng() * hMin * rootJitter * sc;
    const k = 2 + Math.floor(rng() * tuft);
    const ht = lerp(hMin, hMax, Math.pow(rng(), 0.8)) * sc;
    // De atrás (oscuro) hacia delante (claro), y puntas iluminadas.
    const r = rng();
    const col = p < 0.35 ? mix(pal.dark, pal.near, r * 0.6) : r < 0.45 ? vary(pal.near, rng, 0.08) : r < 0.85 ? mix(pal.near, pal.lit, 0.4 + rng() * 0.5) : pal.hi;
    for (let j = 0; j < k; j++) {
      const hh = ht * (0.6 + rng() * 0.5);
      const ln = (lean + (j / (k - 1 || 1) - 0.5) * 0.5 + (rng() - 0.5) * 0.2) * hh;
      blade(g, x + (rng() - 0.5) * 6, by, hh, Math.max(1.2, hh * 0.055), ln, j === k - 1 && r > 0.5 ? mix(col, pal.hi, 0.35) : col, 1, i + j * 0.3);
    }
  }
  if (flowers > 0) {
    for (let i = 0; i < flowers; i++) {
      const x = rng() * w;
      if (xMask && !xMask(x)) continue;
      const sc = scale ? scale(x) : 1;
      const by = base(x);
      const y = by - (0.3 + rng() * 0.5) * hMax * sc;
      const f = flowerColors[Math.floor(rng() * flowerColors.length)];
      const s = lerp(flowerSize[0], flowerSize[1], rng()) * sc;
      stroke(g, [[x, by], [x + 2, (by + y) / 2], [x + 1, y]], { width: Math.max(1.6, s * 0.18), color: pal.dark, taper: [0.1, 0.6] });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        fillBlob(g, x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.45, s * 0.5, s * 0.38, k < 2 ? f[0] : mix(f[0], f[1], 0.5), 1, { wobble: 0.12, n: 9, rot: a, seed: k + i });
      }
      fillBlob(g, x, y, s * 0.28, s * 0.24, f[2], 1, { n: 8 });
    }
  }
  return { canvas: c, base, w, h, ...columnBounds(c) };
}

// Límites verticales de lo pintado en cada columna de 4 px: así cada fotograma
// solo copia la parte con hierba y no la transparencia.
function columnBounds(c) {
  const w = c.width, h = c.height;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const n = Math.ceil(w / 4);
  const top = new Int16Array(n).fill(h), bot = new Int16Array(n).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 4) {
        const i = x >> 2;
        if (y < top[i]) top[i] = y;
        if (y + 1 > bot[i]) bot[i] = y + 1;
      }
    }
  }
  return { top, bot };
}

// Copia iluminada de una franja (la cara de las briznas que el viento vuelve
// hacia la luz): se mezcla por columnas en la cresta de la ola.
export function litCopy(strip, color = '#efffa0', alpha = 0.45) {
  const c = makeCanvas(strip.w, strip.h);
  const g = c.getContext('2d');
  g.drawImage(strip.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = css(color, alpha);
  g.fillRect(0, 0, strip.w, strip.h);
  return c;
}

// Ola de viento: cizalla (px por px de altura) en la columna x en el instante t.
export function windShear(x, t, { amp = 0.16, bias = 0.5, k = 0.011, speed = 3.2, seed = 0 } = {}) {
  const ph = x * k - t * speed + seed;
  const s = Math.sin(ph) * 0.7 + Math.sin(ph * 0.43 + 1.3 + seed) * 0.3;
  return amp * (bias + (1 - bias) * s);
}
export function windCrest(x, t, o = {}) {
  const amp = o.amp ?? 0.16, bias = o.bias ?? 0.5;
  return clamp((windShear(x, t, o) / amp - bias) / (1 - bias));
}

// Dibuja la franja en (ox, oy) deformada por columnas de cw px.
export function drawWaving(g, strip, ox, oy, t, wind = {}, lit = null, { cw = 8, litAlpha = 0.9 } = {}) {
  const { canvas, base, w, top, bot } = strip;
  for (let x = 0; x < w; x += cw) {
    // Rango vertical con hierba en esta columna.
    let y0 = 1e9, y1 = 0;
    for (let i = x >> 2; i <= Math.min(top.length - 1, (x + cw) >> 2); i++) { if (top[i] < y0) y0 = top[i]; if (bot[i] > y1) y1 = bot[i]; }
    if (y1 <= y0) continue;
    const xm = x + cw * 0.5;
    const k = windShear(ox + xm, t, wind);
    const B = oy + base(xm);
    g.save();
    g.transform(1, 0, -k, 1, k * B, 0);
    const sw = Math.min(cw + 1, w - x), sh = y1 - y0;
    g.drawImage(canvas, x, y0, sw, sh, ox + x, oy + y0, sw, sh);
    if (lit) {
      const cr = windCrest(ox + xm, t, wind);
      if (cr > 0.4) {
        g.globalAlpha = smooth((cr - 0.4) / 0.6) * litAlpha;
        g.drawImage(lit, x, y0, sw, sh, ox + x, oy + y0, sw, sh);
      }
    }
    g.restore();
  }
}

// Briznas sueltas animadas por encima (unas cientos): se pintan cada fotograma.
export function makeBlades(rng, n, x0, x1, base, { hMin = 40, hMax = 140, pal }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, rng());
    const r = rng();
    out.push({
      x, y: base(x) + rng() * 10, h: lerp(hMin, hMax, Math.pow(rng(), 1.3)), lean: (rng() - 0.3) * 0.25,
      col: r < 0.3 ? mix(pal.near, pal.dark, 0.3) : r < 0.75 ? mix(pal.near, pal.lit, 0.5 + rng() * 0.4) : pal.hi,
      ph: rng() * 6.28, seed: i * 0.7,
    });
  }
  return out;
}
export function drawBlades(g, blades, t, wind = {}) {
  for (const b of blades) {
    const k = windShear(b.x, t, wind) + Math.sin(t * 5.3 + b.ph) * 0.03;
    blade(g, b.x, b.y, b.h, Math.max(1.3, b.h * 0.045), (b.lean + k * 1.6) * b.h, b.col, 1, b.seed);
  }
}

// ─── Pétalos y hojas al vuelo ───────────────────────────────────────────────
const PETALS = ['#fbfaee', '#fbe64a', '#f9c09a', '#ffffff', '#f7d6e0', '#b9e07a', '#7fbf4a'];
export function makePetals(rng, n, { x0 = -100, x1 = 2020, y0 = 0, y1 = 800, sMin = 3, sMax = 12 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = rng();
    out.push({
      x: lerp(x0, x1, rng()), y: lerp(y0, y1, rng()), d,
      s: lerp(sMin, sMax, d * d) * (0.7 + rng() * 0.5),
      v: lerp(70, 260, d) * (0.8 + rng() * 0.4), rise: (rng() - 0.65) * 40,
      ph: rng() * 6.28, fl: 2 + rng() * 4, rot: (rng() - 0.5) * 4,
      col: PETALS[Math.floor(rng() * PETALS.length)], leaf: rng() < 0.28,
    });
  }
  return out;
}
export function drawPetals(g, petals, t, { x0 = -100, x1 = 2020, alpha = 1 } = {}) {
  const span = x1 - x0;
  for (const p of petals) {
    let x = p.x + p.v * t;
    x = x0 + (((x - x0) % span) + span) % span;
    const y = p.y + p.rise * t + Math.sin(t * 1.3 + p.ph) * 18 * (0.5 + p.d) + Math.sin(x * 0.01 + p.ph) * 10;
    const a = t * p.rot + p.ph;
    const flip = Math.abs(Math.cos(t * p.fl + p.ph));
    const rx = p.s * (p.leaf ? 1.3 : 1), ry = p.s * (p.leaf ? 0.45 : 0.6) * (0.2 + 0.8 * flip);
    const col = p.leaf ? (flip > 0.5 ? '#9ccf4f' : '#5d9a3a') : (flip > 0.5 ? p.col : mix(p.col, '#c9b8a8', 0.3));
    g.fillStyle = css(col, alpha * (0.75 + 0.25 * p.d));
    g.beginPath();
    g.ellipse(x, y, rx, Math.max(0.6, ry), a, 0, Math.PI * 2);
    g.fill();
  }
}

// ─── Copas de árbol ─────────────────────────────────────────────────────────
// Como canopyMass del motor, pero con elevación siempre positiva: con z
// negativo la suma de cúpulas puede bajar de -1 y renderMass da NaN (manchas
// rectangulares claras en la base de las copas grandes).
export function leafMass(rng, rx, ry, { pal, light = [-0.5, -0.85, 0.45], clumps = 26, seed = 1, haze = 0, hazeColor = '#d0e3ef', flatBase = 0.35 } = {}) {
  const pad = Math.round(Math.max(rx, ry) * 0.3);
  const cw = Math.ceil(rx * 2 + pad * 2), ch = Math.ceil(ry * 2 + pad * 2);
  const puffs = [];
  for (let i = 0; i < clumps; i++) {
    const a = rng() * Math.PI * 2, d = Math.pow(rng(), 0.6) * 0.8;
    const s = Math.min(rx, ry) * (0.22 + rng() * 0.22);
    let yy = Math.sin(a) * ry * d;
    // Base de la copa algo aplanada (como se pintan los árboles de los fondos).
    if (yy > 0) yy *= 1 - flatBase;
    puffs.push({ x: cw / 2 + Math.cos(a) * rx * d, y: ch / 2 + yy, rx: s * 1.15, ry: s, z: (ry - yy) * 0.35 + rng() * s * 0.3 });
  }
  const c = renderMass(cw, ch, puffs, {
    light, ramp: leafRamp(pal), sharpK: 9 / Math.max(10, ry * 0.4), edgeAmp: 0.12, edgeFreq: 3 / Math.max(10, ry * 0.4),
    leafy: 0.22, brushAmp: 0.12, brushFreq: 2.2 / Math.max(10, ry * 0.25), brushStretch: 2.5,
    ao: 0.7, aoRadius: ry * 0.12, aoRange: ry * 0.12, bump: 1.2, wrap: 0.25, seed,
    haze: haze > 0 ? { color: hazeColor, amount: haze } : null,
  });
  c.anchor = [cw / 2, ch / 2];
  return c;
}

// ─── Islas lejanas ──────────────────────────────────────────────────────────
// Verde de día más saturado que LEAF (como el prado de la referencia).
export const LEAF_DAY = { deep: '#1d5328', shade: '#2e7330', mid: '#57a239', lit: '#97cf48', hi: '#d4ef80', trunk: '#5d4232', trunkLit: '#9a7652' };
// Arenisca cálida con sombras gris azuladas (nada de malva).
export const ROCK_DAY = { deep: '#6a7181', shade: '#9a9893', mid: '#c2a37c', lit: '#e1c393', hi: '#f5e4bb' };

// Isla flotante pintada: panza de roca como masa (cono invertido de lóbulos
// alargados, tierra cálida arriba y roca fría abajo), tapa de hierba, labio
// colgante, raíces y lianas, y árboles hojosos.
// Devuelve un lienzo con anchor en el centro del borde superior de la tapa.
export function paintIsle(rng, w, h, { light = [-0.5, -0.85, 0.45], trees = [], haze = 0, hazeColor = '#bfe3ee', leaf = LEAF_DAY, rock = ROCK_DAY, grass = { top: '#b6e05a', mid: '#86c43e', dark: '#3f7f2c' }, seed = 1, roots = 0 } = {}) {
  const treeH = trees.reduce((m, t) => Math.max(m, t.h * (t.big ? 1.05 : 1)), 0);
  const big = trees.find((t) => t.big);
  const pad = Math.round(w * (big ? 0.4 : 0.15));
  const top = Math.round(treeH + w * 0.15);
  const cw = Math.ceil(w + pad * 2), ch = Math.ceil(top + h * 1.25 + w * 0.1);
  const cx = cw / 2, cy = top;
  const c = makeCanvas(cw, ch);
  const g = c.getContext('2d');
  const ry = w * 0.09;
  // Panza: lóbulos alargados que se estrechan hacia la punta, y alguna estalactita.
  const puffs = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const width = w * 0.5 * Math.pow(1 - t, 0.85);
    const k = Math.max(1, Math.round(5 * (1 - t)) + 1);
    for (let j = 0; j < k; j++) {
      const f = k === 1 ? 0 : (j / (k - 1) - 0.5) * 2;
      const r = Math.max(3, width * (0.32 + rng() * 0.16));
      puffs.push({ x: cx + f * width * 0.78 + (rng() - 0.5) * r * 0.5 + Math.sin(t * 3 + seed) * w * 0.03 * t, y: cy + ry * 0.6 + t * h * 0.85, rx: r * 0.85, ry: r * 1.35, z: (1 - Math.abs(f)) * r * 0.4 + (1 - t) * w * 0.05 });
    }
  }
  for (let s2 = 0; s2 < 3; s2++) {
    const x0 = cx + (rng() - 0.5) * w * 0.5;
    const len = h * (0.22 + rng() * 0.22);
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const r = Math.max(2, w * 0.07 * (1 - t * 0.75));
      puffs.push({ x: x0 + (x0 - cx) * t * 0.3, y: cy + h * 0.3 + t * len, rx: r * 0.8, ry: r * 1.5, z: w * 0.02 });
    }
  }
  const ramp = makeRamp([[0, rock.deep], [0.3, rock.shade], [0.52, rock.mid], [0.72, rock.lit], [0.9, rock.hi]], 2.0);
  const belly = renderMass(cw, ch, puffs, {
    light, ramp, sharpK: 0.16, edgeAmp: 0.18, edgeFreq: 0.06, brushAmp: 0.16, brushFreq: 0.06, brushStretch: 6,
    ao: 0.45, aoRadius: Math.max(3, w * 0.02), aoRange: Math.max(4, w * 0.03), bump: 1.3, wrap: 0.4, seed, toneBias: 0.1,
    vertical: { top: cy, bottom: cy + h, amount: 0.32 },
  });
  g.drawImage(belly, 0, 0);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(0, 0, cw, cy);
  g.restore();
  // Franja de tierra bajo la tapa.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = vgradient(g, cy, cy + h * 0.25, '#6b4f3a', 0.55);
  g.fillRect(0, cy, cw, h * 0.25);
  g.restore();
  // Raíces y lianas que cuelgan de la panza.
  const hang = (xx, yy, len, col, wd) => stroke(g, bez([xx, yy], [xx + (rng() - 0.5) * len * 0.25, yy + len * 0.4], [xx + (rng() - 0.5) * len * 0.35, yy + len * 0.8], [xx + (rng() - 0.5) * len * 0.3, yy + len], 9), { width: wd, color: col, taper: [0.05, 0.9], wobble: 0.25, seed: xx });
  for (let i = 0; i < Math.round(w / 8); i++) {
    const t = rng();
    const xx = cx + (t - 0.5) * w * 0.92;
    const yy = cy + ry * 0.7 + Math.sin(t * Math.PI) * ry * 0.3;
    const len = h * (0.08 + Math.pow(rng(), 2) * 0.5) * (1.2 - Math.abs(t - 0.5));
    const vine = rng() < 0.65;
    hang(xx, yy, len, vine ? mix(leaf.shade, leaf.deep, rng()) : '#6a4c38', Math.max(1, w * 0.006) * (1 + rng()));
    if (vine) for (let k = 0; k < 3; k++) dab(g, xx + (rng() - 0.5) * 5, yy + len * rng(), w * 0.014, w * 0.009, rng() * 3, leaf.mid, 0.9, k);
  }
  // Raíces del gran árbol: gruesas, saltan el borde y cuelgan muy abajo.
  for (let i = 0; i < roots; i++) {
    const t = (i + rng()) / roots;
    const xx = cx + (t - 0.5) * w * 0.8;
    hang(xx, cy + ry * 0.4, h * (0.3 + rng() * 0.45), mix(leaf.trunk, leaf.trunkLit, rng() * 0.5), Math.max(1, w * (0.004 + rng() * 0.005)));
  }
  // Labio colgante de hierba en sombra.
  fillBlob(g, cx, cy + ry * 0.45, w * 0.515, ry * 1.05, grass.dark, 1, { wobble: 0.05, n: 40, seed: seed + 2 });
  for (let i = 0; i < w / 3; i++) {
    const a = Math.PI * rng();
    const xx = cx + Math.cos(a) * w * 0.51, yy = cy + ry * 0.45 + Math.sin(a) * ry * 1.0;
    blade(g, xx, yy - 2, -(w * 0.01 + rng() * w * 0.03), Math.max(1, w * 0.007), (rng() - 0.5) * 4, rng() < 0.5 ? grass.dark : mix(grass.dark, '#1f4a22', 0.5), 1, i);
  }
  // Tapa de hierba con manchas de luz.
  const capP = new Path2D();
  capP.ellipse(cx, cy, w * 0.5, ry, 0, 0, Math.PI * 2);
  g.save();
  g.clip(capP);
  const gr = g.createLinearGradient(cx - w * 0.5, 0, cx + w * 0.5, 0);
  gr.addColorStop(0, grass.top); gr.addColorStop(0.55, grass.mid); gr.addColorStop(1, css(mix(grass.mid, grass.dark, 0.45)));
  g.fillStyle = gr; g.fillRect(cx - w * 0.5, cy - ry, w, ry * 2);
  for (let i = 0; i < w * 0.6; i++) {
    const xx = cx + (rng() - 0.5) * w, yy = cy + (rng() - 0.5) * ry * 2;
    dab(g, xx, yy, w * (0.015 + rng() * 0.03), Math.max(1, w * 0.008), (rng() - 0.5) * 0.4, rng() < 0.5 ? grass.top : mix(grass.mid, grass.dark, 0.35), 0.5, i, 0.2);
  }
  g.restore();
  for (let i = 0; i < w / 2.5; i++) {
    const a = Math.PI + Math.PI * rng();
    blade(g, cx + Math.cos(a) * w * 0.495, cy + Math.sin(a) * ry * 0.97 + 1.5, Math.max(2, w * 0.006 + rng() * w * 0.016), Math.max(1, w * 0.005), (rng() - 0.3) * 3, rng() < 0.5 ? grass.top : grass.mid, 1, i * 3);
  }
  // Árboles (de atrás adelante).
  for (const tr of [...trees].sort((a, b) => a.dy - b.dy)) {
    const tx = cx + tr.x * w * 0.5, ty = cy + tr.dy * ry;
    if (tr.big) paintGreatTree(g, rng, tx, ty, tr.h, { leaf, light, seed: seed + 3 });
    else paintLeafyTree(g, rng, tx, ty, tr.h, { leaf, light, seed: seed + tr.x * 10 });
  }
  if (haze > 0) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = css(hazeColor, haze);
    g.fillRect(0, 0, cw, ch);
    g.restore();
  }
  c.anchor = [cx, cy];
  return c;
}

function vgradient(g, y0, y1, color, a) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, css(color, a)); gr.addColorStop(1, css(color, 0));
  return gr;
}

function trunkStroke(g, pts, tw, leaf, light, seed) {
  const s = Math.sign(light[0] || -1);
  stroke(g, pts, { width: tw, color: leaf.trunk, taper: [0, 0.8], wobble: 0.15, seed });
  stroke(g, pts.map(([px, py]) => [px + s * tw * 0.22, py]), { width: tw * 0.38, color: leaf.trunkLit, alpha: 0.85, taper: [0.05, 0.8], wobble: 0.3, seed: seed + 1 });
}

// Árbol hojoso pequeño: tronco con raíces y una copa en masa.
export function paintLeafyTree(g, rng, x, y, h, { leaf = LEAF_DAY, light = [-0.5, -0.85, 0.45], seed = 1 } = {}) {
  const tw = h * 0.06, th = h * 0.5;
  const lean = (rng() - 0.5) * 0.15 * h;
  const pts = bez([x, y], [x - lean * 0.3, y - th * 0.4], [x + lean * 0.6, y - th * 0.75], [x + lean, y - th], 10);
  trunkStroke(g, pts, tw, leaf, light, seed);
  const top = pts[pts.length - 1];
  const m = leafMass(rng, h * 0.3, h * 0.26, { pal: leaf, light, clumps: Math.round(12 + h * 0.06), seed });
  drawMass(g, m, top[0], y - h * 0.7);
}

// El gran árbol antiguo: tronco grueso y retorcido con contrafuertes, ramas
// que se abren y una copa ancha en parasol, más ancha que alta.
export function paintGreatTree(g, rng, x, y, h, { leaf = LEAF_DAY, light = [-0.5, -0.85, 0.45], seed = 1 } = {}) {
  const tw = h * 0.13, th = h * 0.42;
  const pts = bez([x, y], [x - tw * 0.4, y - th * 0.35], [x + tw * 0.5, y - th * 0.7], [x + tw * 0.1, y - th], 12);
  // Contrafuertes que se abren sobre la tapa.
  for (const k of [-1.9, -1.2, -0.6, 0.6, 1.3, 2]) {
    stroke(g, bez([x + k * tw * 0.12, y - th * 0.3], [x + k * tw * 0.35, y - th * 0.05], [x + k * tw * 0.9, y + 1], [x + k * tw * 1.25, y + tw * 0.12], 8), { width: tw * 0.5, color: mix(leaf.trunk, '#3d2c24', 0.2), taper: [0, 0.9], seed: k * 3 });
  }
  trunkStroke(g, pts, tw, leaf, light, seed);
  const top = pts[pts.length - 1];
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? 1 : -1;
    const t = 0.6 + rng() * 0.35;
    const bx = lerp(x, top[0], t), by = lerp(y, top[1], t);
    const len = h * (0.24 + rng() * 0.16);
    const p2 = bez([bx, by], [bx + dir * len * 0.35, by - len * 0.35], [bx + dir * len * 0.8, by - len * 0.5], [bx + dir * len, by - len * 0.48], 8);
    trunkStroke(g, p2, tw * 0.42, leaf, light, seed + i);
  }
  // Copa en parasol: masas laterales más bajas y una gran cúpula encima.
  const crowns = [[-0.5, -0.5, 0.3, 0.16], [0.52, -0.48, 0.3, 0.16], [-0.26, -0.63, 0.36, 0.22], [0.28, -0.64, 0.36, 0.22], [0, -0.76, 0.46, 0.25]];
  for (const [dx, dy, rx, ry] of crowns) {
    const m = leafMass(rng, h * rx, h * ry, { pal: leaf, light, clumps: Math.round(18 + h * rx / 4), seed: seed + dx * 7 + dy * 3, flatBase: 0.5 });
    drawMass(g, m, top[0] + dx * h, y + dy * h);
  }
}
