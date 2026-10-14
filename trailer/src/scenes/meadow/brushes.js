// Pinceles propios del mundo «meadow»: flores gordas como las de la
// referencia, franjas de hierba alta que ondulan con el viento, pétalos y
// hojas al vuelo, e islas lejanas pintadas como masas.

import { makeCanvas, fillBlob, blade, dab, stroke, mix, css, vary, renderMass, makeRamp, leafRamp, drawMass, bez, smoothClosed, crownMass } from '../../engine/paint.js';
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
// Opciones para islas grandes vistas de cerca: ry (semieje de la tapa),
// wobble (borde irregular de la tapa y del labio), rows/cols/lobe (cuántos
// lóbulos de roca y de qué tamaño), spikes (estalactitas), topPad (margen
// sobre la tapa). c.cap = { path, cx, cy, rx, ry, rimK(a) } para pintar
// encima del prado con el mismo contorno.
export function paintIsle(rng, w, h, { light = [-0.5, -0.85, 0.45], trees = [], haze = 0, hazeColor = '#bfe3ee', leaf = LEAF_DAY, rock = ROCK_DAY, grass = { top: '#b6e05a', mid: '#86c43e', dark: '#3f7f2c' }, seed = 1, roots = 0, ry: capRy = null, wobble = 0, rows = 18, cols = 5, lobe = [0.32, 0.16], spikes = 3, topPad = null, padK = null, fine = 1, hangK = 1, hangLen = 1, massK = 1, lobeY = 1.35, strata = 0, facets = 0, meadow = 0, capGrass = undefined, bellyOpts = {} } = {}) {
  // fine: escala de los detalles (briznas, lianas) respecto al tamaño de la isla.
  const wf = w * fine;
  const treeH = trees.reduce((m, t) => Math.max(m, t.h * (t.big ? 1.05 : 1)), 0);
  const big = trees.find((t) => t.big);
  const pad = Math.round(w * (padK ?? (big ? 0.4 : 0.15)));
  const top = Math.round(topPad ?? (treeH + w * 0.15));
  const cw = Math.ceil(w + pad * 2), ch = Math.ceil(top + h * 1.25 + w * 0.1);
  const cx = cw / 2, cy = top;
  const c = makeCanvas(cw, ch);
  const g = c.getContext('2d');
  const ry = capRy ?? w * 0.09;
  // Contorno de la tapa: elipse con un ruido suave (el mismo para el labio).
  const rimK = (a) => wobble > 0 ? 1 + (noise3(Math.cos(a) * 2.5 + seed, Math.sin(a) * 2.5 - seed, seed * 0.37) - 0.5) * 2 * wobble : 1;
  const rimPath = (x0, y0, rx, ryy) => {
    if (wobble <= 0) { const p = new Path2D(); p.ellipse(x0, y0, rx, ryy, 0, 0, Math.PI * 2); return p; }
    const pts = [];
    for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2, k = rimK(a); pts.push([x0 + Math.cos(a) * rx * k, y0 + Math.sin(a) * ryy * k]); }
    return smoothClosed(pts);
  };
  // Panza: lóbulos alargados que se estrechan hacia la punta, y alguna estalactita.
  const puffs = [];
  const n = rows;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const width = w * 0.5 * Math.pow(1 - t, 0.85);
    const k = Math.max(1, Math.round(cols * (1 - t)) + 1);
    for (let j = 0; j < k; j++) {
      const f = k === 1 ? 0 : (j / (k - 1) - 0.5) * 2;
      const r = Math.max(3, width * (lobe[0] + rng() * lobe[1]));
      puffs.push({ x: cx + f * width * 0.78 + (rng() - 0.5) * r * 0.5 + Math.sin(t * 3 + seed) * w * 0.03 * t, y: cy + ry * 0.6 + t * h * 0.85, rx: r * 0.85, ry: r * lobeY, z: (1 - Math.abs(f)) * r * 0.4 + (1 - t) * w * 0.05 });
    }
  }
  for (let s2 = 0; s2 < spikes; s2++) {
    const x0 = cx + (rng() - 0.5) * w * 0.5;
    const len = h * (0.22 + rng() * 0.22);
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const r = Math.max(2, w * 0.07 * (1 - t * 0.75));
      puffs.push({ x: x0 + (x0 - cx) * t * 0.3, y: cy + h * 0.3 + t * len, rx: r * 0.8, ry: r * 1.5, z: w * 0.02 });
    }
  }
  const ramp = makeRamp([[0, rock.deep], [0.3, rock.shade], [0.52, rock.mid], [0.72, rock.lit], [0.9, rock.hi]], 2.0);
  if (facets) paintFacetBelly(g, rng, cx, cy + ry * 0.55, w * 0.5, h * 0.95, { rock, light, n: facets, fine, ...bellyOpts });
  const belly = facets ? makeCanvas(1, 1) : renderMass(cw, ch, puffs, {
    light, ramp, sharpK: 0.16 / massK, edgeAmp: 0.18, edgeFreq: 0.06 / massK, brushAmp: 0.16, brushFreq: 0.06 / massK, brushStretch: 6,
    ao: 0.45, aoRadius: Math.max(3, w * 0.02), aoRange: Math.max(4, w * 0.03), bump: 1.3, wrap: 0.4, seed, toneBias: 0.1,
    vertical: { top: cy, bottom: cy + h, amount: 0.32 },
  });
  g.drawImage(belly, 0, 0);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(0, 0, cw, cy);
  g.restore();
  // Islas vistas de cerca: estratos (pinceladas largas casi horizontales,
  // cálidas en la cara de luz y frías en la de sombra) y grietas verticales.
  if (strata > 0) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const ls = Math.sign(light[0] || -1);
    const ns = Math.round(w / 14 * strata);
    for (let i = 0; i < ns; i++) {
      const t = Math.pow(rng(), 1.2);
      const yy = cy + ry * 0.8 + t * h * 0.8;
      const hw = w * 0.5 * Math.pow(1 - t, 0.85);
      const xx = cx + (rng() * 2 - 1) * hw;
      const side = (xx - cx) / Math.max(1, hw) * ls;
      const lit = rng() < 0.5 + side * 0.4;
      const len = wf * (0.03 + rng() * 0.12);
      const tilt = (rng() - 0.5) * len * 0.12;
      stroke(g, [[xx - len / 2, yy - tilt], [xx, yy + (rng() - 0.5) * wf * 0.004], [xx + len / 2, yy + tilt]], { width: wf * (0.003 + rng() * 0.008), color: lit ? (rng() < 0.4 ? rock.hi : rock.lit) : (rng() < 0.5 ? rock.deep : rock.shade), alpha: lit ? 0.3 + rng() * 0.2 : 0.22 + rng() * 0.18, taper: [0.2, 0.3], wobble: 0.3, seed: i });
    }
    for (let i = 0; i < ns * 0.25; i++) {
      const t = Math.pow(rng(), 1.1);
      const yy = cy + ry * 0.8 + t * h * 0.7;
      const hw = w * 0.45 * Math.pow(1 - t, 0.85);
      const xx = cx + (rng() * 2 - 1) * hw;
      const len = wf * (0.02 + rng() * 0.06);
      const pts = [[xx, yy]];
      for (let k = 0; k < 4; k++) { const q = pts[pts.length - 1]; pts.push([q[0] + (rng() - 0.5) * len * 0.3, q[1] + len / 4]); }
      stroke(g, pts, { width: wf * (0.002 + rng() * 0.003), color: rock.deep, alpha: 0.5, taper: [0.1, 0.7], wobble: 0.3, seed: i * 7 });
      stroke(g, pts.map(([a, b]) => [a + ls * wf * 0.003, b]), { width: wf * 0.0025, color: rock.hi, alpha: 0.35, taper: [0.1, 0.7], seed: i * 7 + 1 });
    }
    g.restore();
  }
  // Franja de tierra bajo la tapa.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = vgradient(g, cy, cy + h * 0.25, '#6b4f3a', 0.55);
  g.fillRect(0, cy, cw, h * 0.25);
  g.restore();
  // Raíces y lianas que cuelgan de la panza.
  const hang = (xx, yy, len, col, wd) => stroke(g, bez([xx, yy], [xx + (rng() - 0.5) * len * 0.25, yy + len * 0.4], [xx + (rng() - 0.5) * len * 0.35, yy + len * 0.8], [xx + (rng() - 0.5) * len * 0.3, yy + len], 9), { width: wd, color: col, taper: [0.05, 0.9], wobble: 0.25, seed: xx });
  for (let i = 0; i < Math.round(w / 8 * hangK); i++) {
    const t = rng();
    const xx = cx + (t - 0.5) * w * 0.92;
    const yy = cy + ry * 0.7 + Math.sin(t * Math.PI) * ry * 0.3;
    const len = h * hangLen * (0.08 + Math.pow(rng(), 2) * 0.5) * (1.2 - Math.abs(t - 0.5));
    const vine = rng() < 0.65;
    hang(xx, yy, len, vine ? mix(leaf.shade, leaf.deep, rng()) : '#6a4c38', Math.max(1, wf * 0.006) * (1 + rng()));
    if (vine) for (let k = 0; k < 3; k++) dab(g, xx + (rng() - 0.5) * 5, yy + len * rng(), wf * 0.014, wf * 0.009, rng() * 3, leaf.mid, 0.9, k);
  }
  // Raíces del gran árbol: gruesas, saltan el borde y cuelgan muy abajo.
  for (let i = 0; i < roots; i++) {
    const t = (i + rng()) / roots;
    const xx = cx + (t - 0.5) * w * 0.8;
    hang(xx, cy + ry * 0.4, h * (0.3 + rng() * 0.45), mix(leaf.trunk, leaf.trunkLit, rng() * 0.5), Math.max(1, w * (0.004 + rng() * 0.005)));
  }
  // Labio colgante de hierba en sombra.
  if (wobble > 0) { g.fillStyle = css(grass.dark); g.fill(rimPath(cx, cy + ry * 0.45, w * 0.515, ry * 1.05)); }
  else fillBlob(g, cx, cy + ry * 0.45, w * 0.515, ry * 1.05, grass.dark, 1, { wobble: 0.05, n: 40, seed: seed + 2 });
  for (let i = 0; i < w / 3 / fine; i++) {
    const a = Math.PI * rng();
    const xx = cx + Math.cos(a) * w * 0.51 * rimK(a), yy = cy + ry * 0.45 + Math.sin(a) * ry * 1.0 * rimK(a);
    blade(g, xx, yy - 2, -(wf * 0.01 + rng() * wf * 0.03), Math.max(1, wf * 0.007), (rng() - 0.5) * 4, rng() < 0.5 ? grass.dark : mix(grass.dark, '#1f4a22', 0.5), 1, i);
  }
  // Tapa de hierba con manchas de luz.
  const capP = rimPath(cx, cy, w * 0.5, ry);
  g.save();
  g.clip(capP);
  const gr = g.createLinearGradient(cx - w * 0.5, 0, cx + w * 0.5, 0);
  gr.addColorStop(0, grass.top); gr.addColorStop(0.55, grass.mid); gr.addColorStop(1, css(mix(grass.mid, grass.dark, 0.45)));
  g.fillStyle = gr; g.fillRect(cx - w * 0.5, cy - ry, w, ry * 2);
  if (meadow) paintCapMeadow(g, rng, cx, cy, w * 0.5, ry, { light, k: meadow, grass: capGrass });
  else for (let i = 0; i < w * 0.6; i++) {
    const xx = cx + (rng() - 0.5) * w, yy = cy + (rng() - 0.5) * ry * 2;
    dab(g, xx, yy, wf * (0.015 + rng() * 0.03), Math.max(1, wf * 0.008), (rng() - 0.5) * 0.4, rng() < 0.5 ? grass.top : mix(grass.mid, grass.dark, 0.35), 0.5, i, 0.2);
  }
  g.restore();
  for (let i = 0; i < w / 2.5 / fine; i++) {
    const a = Math.PI + Math.PI * rng();
    blade(g, cx + Math.cos(a) * w * 0.495 * rimK(a), cy + Math.sin(a) * ry * 0.97 * rimK(a) + 1.5, Math.max(2, wf * 0.006 + rng() * wf * 0.016), Math.max(1, wf * 0.005), (rng() - 0.3) * 3, rng() < 0.5 ? grass.top : grass.mid, 1, i * 3);
  }
  // Árboles (de atrás adelante).
  for (const tr of [...trees].sort((a, b) => a.dy - b.dy)) {
    const tx = cx + tr.x * w * 0.5, ty = cy + tr.dy * ry;
    if (tr.big) paintGreatTree(g, rng, tx, ty, tr.h, { leaf, light, seed: seed + 3, ground: capP });
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
  c.cap = { path: capP, cx, cy, rx: w * 0.5, ry, rimK };
  return c;
}

// Panza de roca en facetas, para islas grandes vistas de cerca: prismas que
// cuelgan del labio, cada uno con una cara de luz y otra de sombra, estratos
// y grietas; más fríos y oscuros hacia la punta, con el rebote azulado del mar
// de nubes en los cantos de abajo. (cx, cy) = centro del borde de arriba.
export function paintFacetBelly(g, rng, cx, cy, hw, depth, { rock = ROCK_DAY, light = [-0.5, -0.85], n = 24, fine = 1, bounce = '#cfe4ee', haze = '#8f9fb4' } = {}) {
  const ls = Math.sign(light[0] || -1);
  const prof = (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 1.8)), 0.7);
  const prisms = [];
  for (const layer of [0, 1]) {
    const m = layer ? n : Math.round(n * 0.75);
    for (let i = 0; i < m; i++) {
      const u = clamp((i + 0.5 + (rng() - 0.5) * 0.8) / m * 2 - 1, -0.99, 0.99);
      const L = depth * prof(u) * (layer ? 0.45 + rng() * 0.55 : 0.85 + rng() * 0.15) * (0.35 + 0.65 * prof(u * 0.6));
      // Losas de anchos muy distintos: unas estrechas, otras el doble.
      const wd = (2 * hw / m) * (layer ? 1.0 + Math.pow(rng(), 2) * 1.6 : 1.7 + rng() * 0.6);
      prisms.push({ x: cx + u * hw * (layer ? 0.96 : 0.9), L: Math.max(depth * 0.06, L), wd, layer, u, rid: (rng() - 0.5) * 0.5 - ls * 0.12, notch: rng(), taper: 0.5 + rng() * 0.45 });
    }
  }
  // Unas pocas agujas largas cerca del centro (la punta de la isla).
  for (let i = 0; i < 4; i++) {
    const u = (rng() - 0.5) * 0.5;
    prisms.push({ x: cx + u * hw, L: depth * (0.85 + rng() * 0.3) * prof(u), wd: (2 * hw / n) * (0.8 + rng() * 0.6), layer: 1, u: u * 0.2, rid: (rng() - 0.5) * 0.4 - ls * 0.12, notch: 1, taper: 0.95 });
  }
  prisms.sort((a, b) => a.layer - b.layer || Math.abs(b.u) - Math.abs(a.u));
  const lw = Math.max(1, hw * 0.004 * fine * 3);
  for (const p of prisms) {
    const { x, L, wd } = p;
    const y0 = cy - 2;
    // Contorno: lados que se estrechan hacia una punta (a veces con muesca).
    const left = [], right = [];
    for (let k = 0; k <= 5; k++) {
      const sN = k / 5;
      const half = wd / 2 * (1 - Math.pow(sN, 1.5) * p.taper);
      const yy = y0 + sN * L;
      left.push([x - half + (rng() - 0.5) * wd * 0.12, yy]);
      right.push([x + half + (rng() - 0.5) * wd * 0.12, yy]);
    }
    const tip = [x + (rng() - 0.5) * wd * 0.2, y0 + L * (1.02 + rng() * 0.06)];
    const ridgeTop = [x + p.rid * wd, y0];
    const shape = new Path2D();
    shape.moveTo(left[0][0], left[0][1]);
    for (const q of left) shape.lineTo(q[0], q[1]);
    if (p.notch < 0.35) { shape.lineTo(tip[0] - wd * 0.08, tip[1] - L * 0.05); shape.lineTo(tip[0], tip[1] - L * 0.12); }
    shape.lineTo(tip[0], tip[1]);
    for (let k = right.length - 1; k >= 0; k--) shape.lineTo(right[k][0], right[k][1]);
    shape.closePath();
    // Cara de luz (del lado de la luz) y cara de sombra, separadas por la arista.
    const litFace = new Path2D();
    const side = ls < 0 ? left : right;
    litFace.moveTo(ridgeTop[0], ridgeTop[1]);
    for (const q of side) litFace.lineTo(q[0], q[1]);
    litFace.lineTo(tip[0], tip[1]);
    litFace.closePath();
    const back = p.layer === 0 ? 0.3 : 0;
    // Las del borde del lado de la luz reciben más sol; las del otro, menos.
    const sun = clamp(0.55 - p.u * ls * 0.45);
    const grad = (stops) => {
      const gr = g.createLinearGradient(0, y0, 0, y0 + L);
      for (const [t, c] of stops) gr.addColorStop(t, css(mix(c, haze, back)));
      return gr;
    };
    g.save();
    g.clip(shape);
    g.fillStyle = grad([[0, mix(rock.shade, rock.mid, 0.3)], [0.5, mix(rock.shade, rock.deep, 0.35)], [1, rock.deep]]);
    g.fillRect(x - wd, y0, wd * 2, L * 1.2);
    g.fillStyle = grad([[0, mix(rock.mid, rock.lit, sun)], [0.35, mix(rock.mid, rock.lit, sun * 0.5)], [0.75, mix(rock.mid, rock.shade, 0.55)], [1, mix(rock.shade, rock.deep, 0.3)]]);
    g.fill(litFace);
    // Estratos: toques cortos casi horizontales; grietas en vertical.
    const ns = Math.round(L * wd / 900 / fine);
    for (let i = 0; i < ns; i++) {
      const yy = y0 + Math.pow(rng(), 1.3) * L, xx = x + (rng() - 0.5) * wd;
      const onLit = (xx - (x + p.rid * wd)) * ls > 0;
      const c = rng() < 0.5 ? (onLit ? rock.hi : rock.mid) : (onLit ? rock.shade : rock.deep);
      dab(g, xx, yy, wd * (0.12 + rng() * 0.3), Math.max(1, lw * (0.6 + rng())), (rng() - 0.5) * 0.15, mix(c, haze, back), 0.22 + rng() * 0.2, i, 0.08);
    }
    for (let i = 0; i < 1 + rng() * 2; i++) {
      const xx = x + (rng() - 0.5) * wd * 0.5, yy = y0 + rng() * L * 0.4;
      const len = L * (0.2 + rng() * 0.4);
      const pts = [[xx, yy]];
      for (let k = 0; k < 4; k++) { const q = pts[pts.length - 1]; pts.push([q[0] + (rng() - 0.5) * wd * 0.15, q[1] + len / 4]); }
      stroke(g, pts, { width: lw * 0.9, color: mix(rock.deep, haze, back), alpha: 0.55, taper: [0.1, 0.7], wobble: 0.3, seed: xx });
    }
    // Cornisas: cada prisma se parte en bloques con un canto de luz arriba
    // y una franja de sombra debajo (rompe la verticalidad).
    for (let k = 0; k < 1 + Math.floor(rng() * 2.5); k++) {
      const yy = y0 + L * (0.18 + rng() * 0.55);
      const tilt = (rng() - 0.5) * wd * 0.25;
      const lp = [[x - wd * 0.6, yy - tilt], [x, yy + (rng() - 0.5) * wd * 0.08], [x + wd * 0.6, yy + tilt]];
      stroke(g, lp.map(([a, b]) => [a, b + wd * 0.07]), { width: wd * 0.16, color: mix(rock.deep, haze, back), alpha: 0.4, taper: [0.1, 0.1], wobble: 0.3, seed: yy });
      stroke(g, lp, { width: Math.max(1.2, wd * 0.05), color: mix(rock.hi, haze, back), alpha: 0.5 * (0.4 + sun), taper: [0.15, 0.3], wobble: 0.3, seed: yy + 1 });
    }
    // Rebote frío del mar de nubes en la parte de abajo.
    const bg = g.createLinearGradient(0, y0 + L * 0.55, 0, y0 + L);
    bg.addColorStop(0, css(bounce, 0)); bg.addColorStop(1, css(bounce, 0.26 * (1 - back)));
    g.fillStyle = bg; g.fillRect(x - wd, y0 + L * 0.55, wd * 2, L * 0.6);
    g.restore();
    // Arista: luz fina en el canto de la cara iluminada y línea de sombra al otro lado.
    stroke(g, [ridgeTop, [lerp(ridgeTop[0], tip[0], 0.5), lerp(ridgeTop[1], tip[1], 0.5)], tip], { width: lw * 0.8, color: mix(rock.hi, haze, back), alpha: 0.35 * sun, taper: [0.2, 0.8], wobble: 0.2, seed: x * 0.3 });
    const far = ls < 0 ? right : left;
    stroke(g, [...far, tip], { width: lw * 1.2, color: mix(rock.deep, haze, back * 0.5), alpha: 0.4, taper: [0.1, 0.8], wobble: 0.2, seed: x * 0.7 });
  }
  // La mitad de abajo queda de espaldas al sol: sombra fría general.
  const cool = g.createLinearGradient(0, cy + depth * 0.3, 0, cy + depth);
  cool.addColorStop(0, 'rgba(78,92,124,0)'); cool.addColorStop(0.6, 'rgba(78,92,124,0.28)'); cool.addColorStop(1, 'rgba(78,92,124,0.4)');
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = cool; g.fillRect(cx - hw * 1.1, cy, hw * 2.2, depth * 1.1); g.restore();
  // Sombra que proyecta el labio sobre lo alto de la panza.
  const sh = g.createLinearGradient(0, cy, 0, cy + depth * 0.16);
  sh.addColorStop(0, 'rgba(52,50,66,0.55)'); sh.addColorStop(1, 'rgba(52,50,66,0)');
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = sh; g.fillRect(cx - hw * 1.1, cy - 4, hw * 2.2, depth * 0.17); g.restore();
}

// ─── Tapa de prado de una isla ──────────────────────────────────────────────
// Prado visto desde poco más arriba: matas finas que crecen hacia delante,
// ondulaciones de luz, florecillas a la deriva y el canto delantero que se
// curva hacia la sombra. (cx, cy, rx, ry) = elipse de la tapa; rimK(a) su
// contorno irregular; k escala el tamaño de las matas.
export const CAP_GRASS = { far: '#c2e66c', mid: '#97ce48', near: '#62ad30', dark: '#2f7428', lit: '#d9f27e', hi: '#f0fba6' };
export function paintCapMeadow(g, rng, cx, cy, rx, ry, { grass = CAP_GRASS, light = [-0.5, -0.85], k = 1, flowers = 1 } = {}) {
  const ls = Math.sign(light[0] || -1);
  const x0 = cx - rx - 20 * k, y0 = cy - ry - 12 * k, w = rx * 2 + 40 * k, h = ry * 2 + 24 * k;
  const depth = (y) => clamp((y - (cy - ry)) / (ry * 2));
  let gr = g.createLinearGradient(0, y0, 0, y0 + h);
  gr.addColorStop(0, css(grass.far)); gr.addColorStop(0.5, css(grass.mid)); gr.addColorStop(1, css(grass.near));
  g.fillStyle = gr; g.fillRect(x0, y0, w, h);
  // Luz del lado del sol y sombra al otro (la isla es una cúpula muy plana).
  gr = g.createLinearGradient(ls < 0 ? x0 : x0 + w, 0, ls < 0 ? x0 + w : x0, 0);
  gr.addColorStop(0, css(grass.hi, 0.3)); gr.addColorStop(0.35, css(grass.hi, 0.06)); gr.addColorStop(0.62, css(grass.dark, 0)); gr.addColorStop(1, css(grass.dark, 0.32));
  g.fillStyle = gr; g.fillRect(x0, y0, w, h);
  // Ondulaciones del terreno: manchas largas y planas de luz y sombra.
  const nb = Math.round(70 * w / 1264);
  for (let i = 0; i < nb; i++) {
    const x = x0 + rng() * w, y = y0 + rng() * h, d = depth(y);
    fillBlob(g, x, y, lerp(30, 110, d) * k * (0.6 + rng()), lerp(3, 9, d) * k, rng() < 0.5 ? grass.dark : grass.lit, 0.13, { wobble: 0.4, seed: i, freq: 2.2 });
  }
  // Matas: abanicos de briznas, diminutas al fondo y algo mayores delante.
  const nm = Math.round(w * h / 26 / (k * k));
  for (let i = 0; i < nm; i++) {
    const y = y0 + rng() * h, x = x0 + rng() * w, d = depth(y);
    const size = lerp(2.2, 7.5, d * d) * k * (0.7 + rng() * 0.6);
    const base = d < 0.5 ? mix(grass.far, grass.mid, d * 2) : mix(grass.mid, grass.near, d * 2 - 1);
    const r = rng();
    const c = r < 0.3 ? mix(base, grass.dark, 0.5) : r < 0.72 ? vary(base, rng, 0.06) : mix(base, grass.lit, 0.5 + rng() * 0.4);
    const n = 2 + Math.floor(rng() * 3);
    for (let j = 0; j < n; j++) blade(g, x + (j - n / 2) * size * 0.25, y, size * (0.7 + rng() * 0.6), Math.max(0.7, size * 0.18), (j / n - 0.45) * size * 0.9 + size * 0.15, c, 0.9, i + j);
  }
  for (let i = 0; i < nm * 0.25; i++) {
    const y = y0 + rng() * h, x = x0 + rng() * w, d = depth(y);
    const size = lerp(2, 6, d * d) * k;
    blade(g, x, y, size, Math.max(0.6, size * 0.14), (rng() - 0.3) * size * 0.6, rng() < 0.6 ? grass.lit : grass.hi, 0.8, i * 0.3);
  }
  // Florecillas a la deriva (blancas, amarillas, celestes y melocotón).
  const FL = [['#fbfaf0', 0.36], ['#f6dc45', 0.34], ['#a9dbee', 0.15], ['#f5a882', 0.15]];
  const nf = Math.round(150 * w * h / (1264 * 156) * flowers);
  for (let i = 0; i < nf; i++) {
    let r = rng(), col = FL[0][0];
    for (const [c, wgt] of FL) { if ((r -= wgt) <= 0) { col = c; break; } }
    const fx = x0 + rng() * w, fy = y0 + rng() * h, d = depth(fy);
    const spread = lerp(10, 40, d) * k;
    const m = 3 + Math.floor(rng() * 8);
    for (let j = 0; j < m; j++) {
      const sz = lerp(0.9, 2.4, d) * k * (0.7 + rng() * 0.6);
      fillBlob(g, fx + (rng() - 0.5) * spread * 2, fy + (rng() - 0.5) * spread * 0.3, sz, sz * 0.7, col, 0.95, { wobble: 0.2, n: 7, seed: j });
    }
  }
  // El canto delantero se curva hacia abajo: franja en sombra fría.
  gr = g.createLinearGradient(0, cy + ry * 0.35, 0, cy + ry);
  gr.addColorStop(0, 'rgba(42,106,58,0)'); gr.addColorStop(0.7, 'rgba(42,106,58,0.22)'); gr.addColorStop(1, 'rgba(36,86,58,0.42)');
  g.fillStyle = gr; g.fillRect(x0, cy, w, ry + 12 * k);
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

// Árbol hojoso pequeño: tronco corto que se abre en dos o tres ramas y una
// copa en grumos (las pequeñitas, de un solo grumo).
export function paintLeafyTree(g, rng, x, y, h, { leaf = LEAF_DAY, light = [-0.5, -0.85, 0.45], seed = 1, haze = 0, hazeColor = '#bfe3ee' } = {}) {
  if (h < 46) {
    const tw = h * 0.06, th = h * 0.5;
    const lean = (rng() - 0.5) * 0.15 * h;
    const pts = bez([x, y], [x - lean * 0.3, y - th * 0.4], [x + lean * 0.6, y - th * 0.75], [x + lean, y - th], 10);
    trunkStroke(g, pts, tw, leaf, light, seed);
    const top = pts[pts.length - 1];
    const m = leafMass(rng, h * 0.3, h * 0.26, { pal: leaf, light, clumps: Math.round(12 + h * 0.06), seed });
    drawMass(g, m, top[0], y - h * 0.7);
    return;
  }
  const tw = h * 0.075, th = h * 0.42;
  const lean = (rng() - 0.5) * 0.12 * h;
  const pts = bez([x, y], [x - lean * 0.3, y - th * 0.4], [x + lean * 0.6, y - th * 0.75], [x + lean, y - th], 10);
  const top = pts[pts.length - 1];
  const clumps = [[0, -0.6, 0.66, 0.36], [-0.26, -0.5, 0.4, 0.22], [0.27, -0.52, 0.42, 0.22]];
  // Ramas hacia los grumos laterales.
  for (const [dx, dy] of clumps.slice(1)) {
    trunkStroke(g, bez(top, [top[0] + dx * h * 0.3, top[1] - h * 0.05], [x + dx * h * 0.8, y + dy * h + h * 0.05], [x + dx * h, y + dy * h + h * 0.02], 6), tw * 0.45, leaf, light, seed + dx);
  }
  trunkStroke(g, pts, tw, leaf, light, seed);
  for (const [i, [dx, dy, cw, ch]] of clumps.entries()) {
    const m = crownMass(rng, h * cw, h * ch, { pal: leaf, light, seed: seed * 7 + i, tower: 0.4, levels: h > 120 ? 3 : 2, haze, hazeColor });
    drawMass(g, m, x + dx * h + lean, y + dy * h);
  }
}

// El gran árbol antiguo (el de la isla principal): tronco grueso y corto que
// se abre en cuatro brazos que suben y se meten en la copa, raíces que nacen
// del pie y se agarran a la hierba, corteza con vetas, y una copa en parasol
// hecha de grumos, más ancha que alta, con los de atrás azulados por el aire.
// La madera se pinta aparte para poder sombrearla entera bajo la copa.
// ground: Path2D opcional (la tapa) que recorta la sombra en el suelo.
export function paintGreatTree(g, rng, x, y, h, { leaf = LEAF_DAY, light = [-0.5, -0.85, 0.45], seed = 1, ground = null } = {}) {
  const ls = Math.sign(light[0] || -1);
  const tw = h * 0.18, th = h * 0.38;
  const lean = (rng() - 0.5) * tw * 0.4;
  const bark = { dark: mix(leaf.trunk, '#2c2433', 0.45), mid: leaf.trunk, lit: leaf.trunkLit, hi: mix(leaf.trunkLit, '#f2dcb0', 0.4) };
  // Sombra de la copa en el suelo, del lado contrario a la luz y dentro de la tapa.
  g.save();
  if (ground) g.clip(ground);
  fillBlob(g, x - ls * h * 0.1, y + h * 0.01, h * 0.55, h * 0.045, mix(leaf.deep, '#16301e', 0.3), 0.4, { wobble: 0.25, seed: seed + 1, freq: 2 });
  g.restore();
  // Copa de atrás (más fría y apagada).
  const back = [[-0.64, -0.5, 0.56, 0.24], [0.66, -0.52, 0.54, 0.24], [-0.1, -0.8, 0.86, 0.3], [0.34, -0.76, 0.6, 0.26]];
  for (const [i, [dx, dy, cw, ch]] of back.entries()) {
    const m = crownMass(rng, h * cw, h * ch, { pal: leaf, light, seed: seed * 11 + i, tower: 0.5, haze: 0.3, hazeColor: '#5f8f86', under: 0.5 });
    drawMass(g, m, x + dx * h, y + dy * h);
  }
  const front = [[-0.5, -0.5, 0.62, 0.27], [0.5, -0.53, 0.62, 0.27], [-0.24, -0.66, 0.72, 0.31], [0.25, -0.69, 0.72, 0.31], [0.0, -0.8, 0.62, 0.29]];

  // ─── Madera en su propio lienzo ───────────────────────────────────────────
  const ox = Math.round(x - h * 1.1), oy = Math.round(y - h * 1.0);
  const wood = makeCanvas(Math.ceil(h * 2.2), Math.ceil(h * 1.12));
  const wg = wood.getContext('2d');
  wg.translate(-ox, -oy);
  // Raíces: nacen anchas bajo el tronco y se afilan sobre la hierba.
  for (const k of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const kk = k * (0.55 + i * 0.5 + rng() * 0.2);
      const sx = x + kk * tw * 0.32, ex = x + kk * tw * (1.05 + rng() * 0.35);
      limb(wg, rng, bez([sx, y - th * 0.22], [sx + kk * tw * 0.15, y - th * 0.06], [ex - kk * tw * 0.3, y + tw * 0.02], [ex, y + tw * 0.07], 12), tw * (0.5 - i * 0.08), tw * 0.04, bark, ls, seed + kk * 9);
    }
  }
  // Tronco: se estrecha un poco y vuelve a abrirse arriba; acaba redondeado
  // dentro de los brazos.
  const top = [x + lean, y - th];
  limb(wg, rng, bez([x, y + tw * 0.04], [x, y - th * 0.4], [x + lean * 0.6, y - th * 0.75], [top[0], top[1] + tw * 0.2], 14), tw * 1.12, tw * 0.98, bark, ls, seed, { flare: 0.35, veins: 26 });
  // Brazos: arrancan con todo su grosor dentro del tronco, suben y se abren
  // hacia los grumos de delante, y acaban dentro de la copa.
  const arms = [[-0.5, -0.5], [0.5, -0.53], [-0.24, -0.66], [0.25, -0.69]];
  for (const [i, [dx, dy]] of arms.entries()) {
    const f = (i % 2 ? 1 : -1) * (i < 2 ? 0.32 : 0.12);
    const sx = top[0] + f * tw * 0.8, sy = top[1] + th * 0.4;
    const ex = x + dx * h * 0.82, ey = y + dy * h - h * 0.09;
    const pts = bez([sx, sy], [sx + f * tw * 0.3, sy - th * 0.3], [ex - dx * h * 0.25, ey + h * 0.06], [ex, ey], 14);
    limb(wg, rng, pts, tw * (i < 2 ? 0.52 : 0.46), tw * 0.15, bark, ls, seed + i * 7, { veins: 10 });
    // Ramas secundarias que suben hacia los grumos.
    const q = pts[9];
    const a = -Math.PI / 2 + dx * 1.4 + (rng() - 0.5) * 0.4;
    const len = h * (0.12 + rng() * 0.06);
    limb(wg, rng, bez(q, [q[0] + Math.cos(a) * len * 0.3, q[1] + Math.sin(a) * len * 0.4], [q[0] + Math.cos(a) * len * 0.7, q[1] + Math.sin(a) * len * 0.8], [q[0] + Math.cos(a) * len, q[1] + Math.sin(a) * len], 8), tw * 0.14, tw * 0.05, bark, ls, seed + i * 7 + 3, { veins: 2 });
  }
  // Sombra de la copa sobre la madera: arriba casi negra azulada, y bajando
  // por el tronco hasta media altura.
  wg.setTransform(1, 0, 0, 1, 0, 0);
  wg.globalCompositeOperation = 'source-atop';
  const sh = wg.createLinearGradient(0, (y - h * 0.62) - oy, 0, (y - th * 0.35) - oy);
  sh.addColorStop(0, 'rgba(22,36,44,0.82)'); sh.addColorStop(0.45, 'rgba(26,40,48,0.5)'); sh.addColorStop(1, 'rgba(26,40,48,0)');
  wg.fillStyle = sh; wg.fillRect(0, 0, wood.width, wood.height);
  // Manchas de sol que se cuelan entre las hojas.
  for (let i = 0; i < 7; i++) {
    const yy = y - th * (0.15 + rng() * 0.6) - oy, xx = x + ls * tw * (0.1 + rng() * 0.45) - ox;
    fillBlob(wg, xx, yy, tw * (0.08 + rng() * 0.1), tw * (0.05 + rng() * 0.06), bark.hi, 0.35, { wobble: 0.3, seed: i + seed });
  }
  wg.globalCompositeOperation = 'source-over';
  g.drawImage(wood, ox, oy);
  // Copa de delante.
  for (const [i, [dx, dy, cw, ch]] of front.entries()) {
    const m = crownMass(rng, h * cw, h * ch, { pal: leaf, light, seed: seed * 17 + i, tower: 0.55, under: 0.4 });
    drawMass(g, m, x + dx * h, y + dy * h);
  }
}

// Rama o tronco como volumen: ancho w0 en la base y w1 en la punta (sin
// pellizco en la base), con la cara de luz, la de sombra, un filo de luz y
// vetas de corteza que siguen la curva. flare ensancha el pie.
function limb(g, rng, pts, w0, w1, bark, ls, seed, { flare = 0, veins = 6 } = {}) {
  const n = pts.length;
  const nrm = [], wd = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    nrm.push([-dy, dx]);
    const s = i / (n - 1);
    wd.push((lerp(w0, w1, Math.pow(s, 0.85)) * (1 + flare * Math.pow(1 - s, 6)) * (1 + (noise3(s * 5 + seed, seed, 1.3) - 0.5) * 0.12)) / 2);
  }
  // Lado de la luz: el normal que apunta hacia la luz (de arriba, del lado ls).
  const lx = ls * 0.5, ly = -0.85;
  const band = (o0, o1) => {
    const p = new Path2D();
    for (let i = 0; i < n; i++) { const [nx, ny] = nrm[i]; const sg = Math.sign(nx * lx + ny * ly || 1); const k = o0 * wd[i] * sg; i ? p.lineTo(pts[i][0] + nx * k, pts[i][1] + ny * k) : p.moveTo(pts[i][0] + nx * k, pts[i][1] + ny * k); }
    for (let i = n - 1; i >= 0; i--) { const [nx, ny] = nrm[i]; const sg = Math.sign(nx * lx + ny * ly || 1); const k = o1 * wd[i] * sg; p.lineTo(pts[i][0] + nx * k, pts[i][1] + ny * k); }
    p.closePath();
    return p;
  };
  g.fillStyle = css(bark.mid); g.fill(band(-1, 1));
  g.fillStyle = css(bark.dark, 0.85); g.fill(band(-1, -0.25));
  g.fillStyle = css(mix(bark.dark, '#4b5a72', 0.35), 0.5); g.fill(band(-1, -0.75));
  g.fillStyle = css(bark.lit, 0.95); g.fill(band(0.2, 0.92));
  g.fillStyle = css(bark.hi, 0.55); g.fill(band(0.55, 0.85));
  // Vetas: trozos de línea paralelos a la rama.
  g.lineCap = 'round';
  for (let v = 0; v < veins; v++) {
    const off = (rng() * 2 - 1) * 0.85;
    const s0 = rng() * 0.8, s1 = Math.min(1, s0 + 0.12 + rng() * 0.35);
    const i0 = Math.floor(s0 * (n - 1)), i1 = Math.max(i0 + 1, Math.floor(s1 * (n - 1)));
    const lit = off * 1 > 0.3 && rng() < 0.6;
    g.strokeStyle = css(lit ? bark.hi : bark.dark, lit ? 0.45 : 0.5);
    g.lineWidth = Math.max(0.8, w0 * (0.02 + rng() * 0.025));
    g.beginPath();
    for (let i = i0; i <= i1; i++) {
      const [nx, ny] = nrm[i]; const sg = Math.sign(nx * lx + ny * ly || 1);
      const k = off * wd[i] * sg + (noise3(i * 0.4, v, seed) - 0.5) * wd[i] * 0.15;
      const px = pts[i][0] + nx * k, py = pts[i][1] + ny * k;
      i === i0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.stroke();
  }
}

