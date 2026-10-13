// Caja de pinceles: todo lo que pinta fondos al estilo de gouache sobre papel.
// Las funciones reciben un contexto 2D y un generador aleatorio con semilla
// (mulberry32) para que cada fondo salga idéntico en cada render.

import { mulberry32, noise3, fbm3, clamp, lerp, smooth } from '../lib/util.js';

export { mulberry32 };

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// ─── Color ──────────────────────────────────────────────────────────────────
export function rgb(hex) {
  if (Array.isArray(hex)) return hex;
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function mix(a, b, t) {
  a = rgb(a); b = rgb(b);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
export function css(c, a = 1) {
  c = rgb(c);
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
// Variación ligera de valor y temperatura (las pinceladas nunca son de un solo color).
export function vary(c, rng, amt = 0.06, warm = 0) {
  c = rgb(c);
  const k = 1 + (rng() - 0.5) * 2 * amt;
  const w = (rng() - 0.5) * 2 * amt * 40 + warm;
  return [clamp(c[0] * k + w, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k - w, 0, 255)];
}
export function shade(c, k) { c = rgb(c); return [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)]; }

// ─── Formas ─────────────────────────────────────────────────────────────────
// Elipse irregular (borde de pincel) como Path2D, cerrada con curvas suaves.
export function blobPath(cx, cy, rx, ry, { wobble = 0.1, n = 22, rot = 0, seed = 0, freq = 1.3 } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const k = 1 + (noise3(ca * freq + seed, sa * freq - seed, seed * 0.37) - 0.5) * 2 * wobble;
    let x = ca * rx * k, y = sa * ry * k;
    const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
    pts.push([cx + xr, cy + yr]);
  }
  return smoothClosed(pts);
}

export function smoothClosed(pts) {
  const p = new Path2D();
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const m = mid(a, b);
    p.quadraticCurveTo(a[0], a[1], m[0], m[1]);
  }
  p.closePath();
  return p;
}

export function smoothOpen(pts) {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  const l = pts[pts.length - 1];
  p.lineTo(l[0], l[1]);
  return p;
}

export function fillBlob(g, cx, cy, rx, ry, color, alpha = 1, opts = {}) {
  g.fillStyle = css(color, alpha);
  g.fill(blobPath(cx, cy, rx, ry, opts));
}

// Puntos de una curva cuadrática o cúbica.
export function bez(p0, p1, p2, p3, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    if (p3) out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    else out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

// ─── Pinceladas ─────────────────────────────────────────────────────────────
// Trazo afilado a lo largo de una polilínea: ancho que crece y se afila, borde
// ligeramente irregular y, opcionalmente, cerdas (líneas finas dentro del trazo).
export function stroke(g, pts, { width = 4, color = '#000', alpha = 1, taper = [0.15, 0.55], wobble = 0.15, seed = 0, bristles = 0, bristleAlpha = 0.35, rng = null } = {}) {
  const n = pts.length;
  if (n < 2) return;
  const left = [], right = [];
  let total = 0;
  const seg = [0];
  for (let i = 1; i < n; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(total); }
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const s = total > 0 ? seg[i] / total : 0;
    const prof = smooth(s / Math.max(1e-3, taper[0])) * (1 - smooth((s - (1 - taper[1])) / Math.max(1e-3, taper[1])) * 0.92);
    const w = width * 0.5 * Math.max(0.04, prof) * (1 + (noise3(s * 6 + seed, seed, 0.5) - 0.5) * 2 * wobble);
    left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    right.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const p = new Path2D();
  p.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) p.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  g.fillStyle = css(color, alpha);
  g.fill(p);
  if (bristles > 0 && rng) {
    g.save();
    g.clip(p);
    g.lineCap = 'round';
    for (let k = 0; k < bristles; k++) {
      const off = (rng() - 0.5) * width * 0.9;
      const c = vary(color, rng, 0.18);
      g.strokeStyle = css(c, bristleAlpha * alpha);
      g.lineWidth = Math.max(0.6, width * (0.05 + rng() * 0.08));
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const x = pts[i][0] - dy * off, y = pts[i][1] + dx * off;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
  return p;
}

// Pincelada corta (un toque de pincel plano) centrada en x,y con ángulo.
export function dab(g, x, y, len, width, angle, color, alpha = 1, seed = 0, curve = 0.15) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const pts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5 - 0.5;
    const bend = (t * t - 0.25) * curve * len;
    pts.push([x + ca * t * len - sa * bend, y + sa * t * len + ca * bend]);
  }
  stroke(g, pts, { width, color, alpha, taper: [0.3, 0.5], wobble: 0.25, seed });
}

// Brizna de hierba: trazo fino que sube y se curva con el viento.
export function blade(g, x, y, h, w, lean, color, alpha = 1, seed = 0) {
  const pts = bez([x, y], [x + lean * 0.2, y - h * 0.45], [x + lean * 0.7, y - h * 0.8], [x + lean, y - h], 5);
  stroke(g, pts, { width: w, color, alpha, taper: [0.02, 0.85], wobble: 0.1, seed });
}

// ─── Luz y texturas ─────────────────────────────────────────────────────────
export function glow(g, x, y, r, color, alpha = 1, inner = 0) {
  const gr = g.createRadialGradient(x, y, r * inner, x, y, r);
  gr.addColorStop(0, css(color, alpha));
  gr.addColorStop(0.35, css(color, alpha * 0.45));
  gr.addColorStop(1, css(color, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

export function vgrad(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c, a = 1] of stops) gr.addColorStop(t, css(c, a));
  return gr;
}

// Textura de papel: grano fino + fibras. Se aplica en modo 'multiply' u 'overlay'.
export function paperTexture(w, h, seed = 1) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  const rng = mulberry32(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = noise3(x * 0.012, y * 0.012, seed) * 0.5 + noise3(x * 0.07, y * 0.05, seed + 3) * 0.3 + rng() * 0.2;
      const v = 200 + n * 55;
      d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 7; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.05;
  g.strokeStyle = '#6b5a48';
  for (let k = 0; k < (w * h) / 900; k++) {
    const x = rng() * w, y = rng() * h, a = rng() * Math.PI, l = 4 + rng() * 14;
    g.lineWidth = 0.5 + rng() * 0.6;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rng() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

// Aplica la textura de papel sobre lo pintado en g (suave, para que se note el soporte).
export function applyPaper(g, paper, strength = 0.35, x = 0, y = 0, w = g.canvas.width, h = g.canvas.height) {
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = strength;
  const pat = g.createPattern(paper, 'repeat');
  g.fillStyle = pat;
  g.fillRect(x, y, w, h);
  g.restore();
}

// Lavado con oscurecimiento en el borde, típico de la acuarela/gouache.
export function wash(g, path, color, { edge = 0.12, edgeWidth = 10, alpha = 1 } = {}) {
  g.save();
  g.fillStyle = css(color, alpha);
  g.fill(path);
  g.clip(path);
  g.strokeStyle = css(shade(color, 0.82), edge * alpha);
  g.lineWidth = edgeWidth;
  g.stroke(path);
  g.restore();
}

// ─── Cielo ──────────────────────────────────────────────────────────────────
// Degradado vertical con barridos horizontales de pincel ancho (el cielo pintado).
export function paintSky(g, w, h, { top = '#3a74c4', mid = '#7fb0e0', bottom = '#d6e8f2', horizonY = 0.85, seed = 1, streaks = 0.5 } = {}) {
  const rng = mulberry32(seed);
  g.fillStyle = vgrad(g, 0, 0, 0, h, [[0, top], [horizonY * 0.55, mid], [horizonY, bottom], [1, bottom]]);
  g.fillRect(0, 0, w, h);
  const n = Math.round((w * h) / 9000 * streaks);
  for (let i = 0; i < n; i++) {
    const y = rng() * h;
    const t = clamp(y / (h * horizonY));
    const base = t < 0.55 ? mix(top, mid, t / 0.55) : mix(mid, bottom, (t - 0.55) / 0.45);
    const c = vary(base, rng, 0.05);
    const x = rng() * w, len = 60 + rng() * 260, wd = 8 + rng() * 24;
    dab(g, x, y, len, wd, (rng() - 0.5) * 0.06, c, 0.25 + rng() * 0.25, i, 0.05);
  }
}

// Cirros: trazos largos y finos, muy altos en el cielo.
export function paintCirrus(g, rng, x, y, w, color = '#ffffff', alpha = 0.55, n = 14) {
  for (let i = 0; i < n; i++) {
    const yy = y + (rng() - 0.5) * w * 0.08;
    const xx = x + (rng() - 0.5) * w;
    const len = w * (0.15 + rng() * 0.35);
    const pts = bez([xx - len / 2, yy], [xx - len / 6, yy - len * 0.04], [xx + len / 6, yy + len * 0.03], [xx + len / 2, yy - len * 0.02], 12);
    stroke(g, pts, { width: 3 + rng() * 9, color: vary(color, rng, 0.03), alpha: alpha * (0.4 + rng() * 0.6), taper: [0.4, 0.5], wobble: 0.35, seed: i * 3.1 });
  }
}

// ─── Cúmulos ────────────────────────────────────────────────────────────────
// Nube de algodón pintada: lóbulos de atrás hacia delante, cada uno con su
// medialuna de sombra lavanda en el lado contrario a la luz, cima blanca cálida
// y base plana más oscura. light = [dx, dy] hacia la luz en pantalla (y hacia abajo +).
// Calibrada con la referencia del cliente: blanco casi puro en la luz y grises
// claros neutros (algo azulados abajo) en la sombra.
export const CLOUD_DAY = { hi: '#ffffff', lit: '#f9fafb', mid: '#e3e7ea', shade: '#c2cad1', deep: '#9badba', rim: '#ffffff' };
export const SKY_DAY = { top: '#2585b1', mid: '#3a99c1', bottom: '#a3d8e5' };

export function cumulusPuffs(rng, w, h, { base = 0.55, tower = 1 } = {}) {
  const puffs = [];
  const nb = Math.max(3, Math.round(w / (h * 0.34)));
  for (let i = 0; i < nb; i++) {
    const t = (i + 0.5) / nb;
    const r = h * (0.17 + rng() * 0.1) * (1 - Math.abs(t - 0.5) * 0.6);
    puffs.push({ x: (t - 0.5) * w * 0.92 + (rng() - 0.5) * r * 0.5, y: -r * base, r, layer: 0 });
  }
  const nu = Math.round(nb * 1.6 * tower);
  for (let i = 0; i < nu; i++) {
    const yf = Math.pow(rng(), 0.75);
    const spread = Math.pow(1 - yf, 0.8) * (0.45 + 0.1 * rng());
    const r = h * lerp(0.22, 0.12, yf) * (0.8 + rng() * 0.45);
    puffs.push({ x: (rng() - 0.5) * 2 * w * spread, y: -(r * 0.6 + yf * (h - r * 1.6)), r, layer: 1 + yf });
  }
  // De atrás (arriba, al centro) hacia delante (abajo, a los lados).
  puffs.sort((a, b) => (a.y - b.y) || (Math.abs(a.x) - Math.abs(b.x)));
  return puffs;
}

export function paintCumulus(g, rng, x, y, w, h, { light = [0.45, -0.9], pal = CLOUD_DAY, puffs = null, tower = 1, haze = 0, hazeColor = '#d6e8f2', texture = 1, flatBottom = true } = {}) {
  const L = Math.hypot(light[0], light[1]) || 1;
  const lx = light[0] / L, ly = light[1] / L;
  puffs = puffs || cumulusPuffs(rng, w, h, { tower });
  g.save();
  g.translate(x, y);
  if (flatBottom) { g.beginPath(); g.rect(-w * 2, -h * 3, w * 4, h * 3 + h * 0.02); g.clip(); }
  const union = new Path2D();
  for (const p of puffs) union.addPath(blobPath(p.x, p.y, p.r, p.r * 0.96, { wobble: 0.06, n: 26, seed: p.x * 0.01 + p.y * 0.013 }));
  for (const [i, p] of puffs.entries()) {
    const seed = i * 1.37 + p.r * 0.01;
    const top = clamp(-p.y / h);
    fillBlob(g, p.x, p.y, p.r, p.r * 0.96, mix(pal.shade, pal.deep, (1 - top) * 0.35), 1, { wobble: 0.06, n: 26, seed });
    fillBlob(g, p.x + lx * p.r * 0.1, p.y + ly * p.r * 0.1, p.r * 0.93, p.r * 0.9, pal.mid, 1, { wobble: 0.08, n: 24, seed: seed + 1 });
    fillBlob(g, p.x + lx * p.r * 0.22, p.y + ly * p.r * 0.22, p.r * 0.8, p.r * 0.76, mix(pal.mid, pal.lit, 0.55), 1, { wobble: 0.09, n: 24, seed: seed + 2 });
    fillBlob(g, p.x + lx * p.r * 0.3, p.y + ly * p.r * 0.3, p.r * 0.68, p.r * 0.64, pal.lit, 1, { wobble: 0.1, n: 24, seed: seed + 3 });
    if (top > 0.25) fillBlob(g, p.x + lx * p.r * 0.42, p.y + ly * p.r * 0.42, p.r * 0.38, p.r * 0.34, pal.hi, 0.75, { wobble: 0.14, n: 20, seed: seed + 4 });
    if (texture > 0) {
      // Toques de pincel siguiendo el lóbulo.
      for (let k = 0; k < 5 * texture; k++) {
        const a = Math.atan2(ly, lx) + (rng() - 0.5) * 2.2;
        const rr = p.r * (0.55 + rng() * 0.35);
        const cx = p.x + Math.cos(a) * rr * 0.8, cy = p.y + Math.sin(a) * rr * 0.8;
        const lit = Math.cos(a - Math.atan2(ly, lx)) > 0.2;
        dab(g, cx, cy, p.r * (0.3 + rng() * 0.3), p.r * 0.07, a + Math.PI / 2, lit ? pal.hi : pal.shade, 0.22, k + seed, 0.5);
      }
    }
  }
  // Base plana y en sombra.
  g.save();
  g.clip(union);
  g.fillStyle = vgrad(g, 0, -h * 0.32, 0, 0, [[0, pal.deep, 0], [0.75, pal.deep, 0.45], [1, pal.deep, 0.75]]);
  g.fillRect(-w, -h * 0.32, w * 2, h * 0.34);
  if (haze > 0) { g.fillStyle = css(hazeColor, haze); g.fillRect(-w * 2, -h * 3, w * 4, h * 3.1); }
  g.restore();
  g.restore();
  return union;
}

// Banco de nubes bajo (mar de nubes visto desde arriba): filas de lóbulos
// aplastados, más pequeños y brumosos hacia el horizonte.
export function paintCloudSea(g, rng, x0, y0, w, h, { light = [0.4, -1], pal = CLOUD_DAY, haze = '#d6e8f2', rows = 9, seed = 0 } = {}) {
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const yy = y0 + Math.pow(t, 1.6) * h;
    const size = lerp(h * 0.05, h * 0.42, Math.pow(t, 1.4));
    const n = Math.ceil(w / (size * 1.4)) + 2;
    for (let i = 0; i < n; i++) {
      const xx = x0 + (i / (n - 1)) * w + (rng() - 0.5) * size;
      const cw = size * (1.8 + rng() * 1.6), ch = size * (0.55 + rng() * 0.45);
      paintCumulus(g, rng, xx, yy + ch * 0.25, cw, ch, { light, pal, tower: 0.5, haze: (1 - t) * 0.55, hazeColor: haze, texture: t > 0.4 ? 1 : 0, flatBottom: false });
    }
  }
}

// ─── Vegetación ─────────────────────────────────────────────────────────────
export const LEAF = { deep: '#2f5a3a', shade: '#3f7346', mid: '#5f9a4a', lit: '#8fbf55', hi: '#c6dc7a', trunk: '#5b3f2e', trunkLit: '#8a6544' };

// Copa de árbol en racimos: masa oscura, racimos medios hacia la luz y toques claros.
export function paintCanopy(g, rng, cx, cy, rx, ry, { light = [0.5, -0.8], pal = LEAF, clumps = 9, leafy = 1 } = {}) {
  const L = Math.hypot(light[0], light[1]) || 1;
  const lx = light[0] / L, ly = light[1] / L;
  const cl = [];
  for (let i = 0; i < clumps; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 0.62;
    cl.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, r: Math.min(rx, ry) * (0.36 + rng() * 0.22) });
  }
  cl.sort((a, b) => a.y - b.y);
  // Silueta con borde de hojas.
  for (const c of cl) {
    fillBlob(g, c.x, c.y, c.r * 1.05, c.r, pal.deep, 1, { wobble: 0.16, n: 20, seed: c.x * 0.03 });
    const nl = Math.round(10 * leafy);
    for (let k = 0; k < nl; k++) {
      const a = rng() * Math.PI * 2;
      dab(g, c.x + Math.cos(a) * c.r * 0.95, c.y + Math.sin(a) * c.r * 0.92, c.r * 0.28, c.r * 0.16, a + Math.PI / 2 + (rng() - 0.5), pal.deep, 1, k, 0.4);
    }
  }
  for (const c of cl) {
    fillBlob(g, c.x + lx * c.r * 0.15, c.y + ly * c.r * 0.15, c.r * 0.85, c.r * 0.8, pal.shade, 1, { wobble: 0.18, n: 18, seed: c.y * 0.05 });
    fillBlob(g, c.x + lx * c.r * 0.3, c.y + ly * c.r * 0.3, c.r * 0.62, c.r * 0.56, pal.mid, 1, { wobble: 0.2, n: 18, seed: c.y * 0.07 + 1 });
    for (let k = 0; k < 8 * leafy; k++) {
      const a = Math.atan2(ly, lx) + (rng() - 0.5) * 1.8;
      const d = c.r * (0.25 + rng() * 0.45);
      dab(g, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, c.r * 0.22, c.r * 0.13, a + (rng() - 0.5), rng() < 0.6 ? pal.lit : pal.hi, 0.9, k * 7, 0.4);
    }
  }
}

// Tronco y ramas que se abren hacia la copa.
export function paintTrunk(g, rng, x, y, h, w, { pal = LEAF, branches = 4, lean = 0, light = [0.5, -0.8] } = {}) {
  const top = [x + lean * h, y - h];
  const pts = bez([x, y], [x + lean * h * 0.2, y - h * 0.4], [x + lean * h * 0.7, y - h * 0.75], top, 10);
  stroke(g, pts, { width: w, color: pal.trunk, taper: [0.0, 0.7], wobble: 0.1 });
  const lit = pts.map(([px, py]) => [px + w * 0.18 * Math.sign(light[0] || 1), py]);
  stroke(g, lit, { width: w * 0.35, color: pal.trunkLit, alpha: 0.8, taper: [0.05, 0.7], wobble: 0.2 });
  // Raíces.
  for (const s of [-1, 1]) stroke(g, bez([x + s * w * 0.2, y - h * 0.08], [x + s * w * 0.7, y - h * 0.02], [x + s * w * 1.1, y + 1], null, 6), { width: w * 0.45, color: pal.trunk, taper: [0.0, 0.9] });
  for (let i = 0; i < branches; i++) {
    const t = 0.45 + rng() * 0.45;
    const bx = lerp(x, top[0], t), by = lerp(y, top[1], t);
    const s = i % 2 ? 1 : -1;
    const len = h * (0.25 + rng() * 0.25);
    stroke(g, bez([bx, by], [bx + s * len * 0.4, by - len * 0.25], [bx + s * len, by - len * 0.6], null, 8), { width: w * 0.4, color: pal.trunk, taper: [0.0, 0.85] });
  }
  return top;
}

export function paintTree(g, rng, x, y, h, opts = {}) {
  const w = h * (opts.trunkW ?? 0.07);
  const top = paintTrunk(g, rng, x, y, h * 0.62, w, opts);
  const rx = h * (opts.spread ?? 0.36), ry = h * 0.3;
  if (opts.vector) { paintCanopy(g, rng, top[0], top[1] - h * 0.08, rx, ry, opts); return; }
  const L = opts.light || [0.5, -0.8];
  const m = canopyMass(rng, rx, ry, { pal: opts.pal || LEAF, light: [L[0], L[1], 0.6], clumps: opts.clumps ?? Math.round(14 + rx / 6), seed: rng() * 100, haze: opts.haze ?? 0, hazeColor: opts.hazeColor });
  drawMass(g, m, top[0], top[1] - h * 0.1);
}

// Pino / ciprés: capas de pinceladas en punta.
export function paintConifer(g, rng, x, y, h, { pal = LEAF, light = [0.5, -0.8] } = {}) {
  stroke(g, [[x, y], [x, y - h * 0.3]], { width: h * 0.05, color: pal.trunk, taper: [0, 0.5] });
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const yy = y - h * (0.18 + t * 0.78);
    const ww = h * 0.26 * (1 - t * 0.85);
    const p = new Path2D();
    p.moveTo(x - ww, yy + h * 0.06);
    p.quadraticCurveTo(x - ww * 0.3, yy - h * 0.02, x, yy - h * 0.13);
    p.quadraticCurveTo(x + ww * 0.3, yy - h * 0.02, x + ww, yy + h * 0.06);
    p.closePath();
    g.fillStyle = css(i % 2 ? pal.deep : pal.shade); g.fill(p);
    const s = Math.sign(light[0] || 1);
    dab(g, x + s * ww * 0.35, yy + h * 0.01, ww * 0.7, h * 0.03, -s * 0.35, pal.mid, 0.8, i);
  }
}

// Prado: base en degradado, manchas de luz/sombra, matas de hierba a
// pinceladas (más grandes delante), briznas sueltas y florecillas en racimos.
// rect en px; la parte de arriba del rect es el fondo del prado.
export const MEADOW_DAY = { far: '#a6d84e', near: '#4fa61c', dark: '#1f6d22', lit: '#b8ee5a', hi: '#e4f78a' };
export function paintMeadow(g, rng, x0, y0, w, h, { pal = MEADOW_DAY, density = 1, lean = 0.25, flowers = 1, light = [0.5, -0.8], fringe = null, flowerColors = null } = {}) {
  g.save();
  g.fillStyle = vgrad(g, 0, y0, 0, y0 + h, [[0, pal.far], [1, pal.near]]);
  g.fillRect(x0, y0, w, h);
  // Manchas grandes (ondulación del terreno, sombras de nubes).
  for (let i = 0; i < 90; i++) {
    const t = rng();
    const yy = y0 + Math.pow(t, 1.2) * h;
    const s = lerp(0.03, 0.22, t) * h;
    fillBlob(g, x0 + rng() * w, yy, s * (2 + rng() * 3), s * 0.35, rng() < 0.55 ? pal.dark : pal.lit, 0.12, { wobble: 0.45, seed: i, freq: 2.2 });
  }
  // Matas: pinceladas cortas en abanico que dan textura de hierba espesa.
  const nm = Math.round((w * h) / 260 * density);
  for (let i = 0; i < nm; i++) {
    const t = Math.pow(rng(), 0.75);
    const yy = y0 + t * h, xx = x0 + rng() * w;
    const size = lerp(2.5, 48, Math.pow(t, 1.9));
    const base = mix(pal.far, pal.near, t);
    const r = rng();
    const c = r < 0.3 ? mix(base, pal.dark, 0.55) : r < 0.75 ? vary(base, rng, 0.07) : mix(base, pal.lit, 0.55 + rng() * 0.3);
    const k = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < k; j++) {
      const a = -Math.PI / 2 + (j / (k - 1 || 1) - 0.5) * 0.9 + lean * 0.5 + (rng() - 0.5) * 0.2;
      const L = size * (0.7 + rng() * 0.6);
      stroke(g, [[xx, yy], [xx + Math.cos(a) * L * 0.5, yy + Math.sin(a) * L * 0.5], [xx + Math.cos(a + lean * 0.4) * L, yy + Math.sin(a) * L]], { width: Math.max(1, size * 0.16), color: c, alpha: 0.95, taper: [0.02, 0.85], wobble: 0.1, seed: i + j });
    }
  }
  // Briznas sueltas más claras por encima (luz en las puntas).
  const n = Math.round((w * h) / 520 * density);
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rng(), 0.8);
    const yy = y0 + t * h, xx = x0 + rng() * w;
    const size = lerp(3, 46, Math.pow(t, 1.8));
    const c = rng() < 0.6 ? mix(mix(pal.far, pal.near, t), pal.lit, 0.6) : pal.hi;
    blade(g, xx, yy + size * 0.2, size, Math.max(1, size * 0.07), (lean + (rng() - 0.5) * 0.35) * size, c, 0.85, i * 0.1);
  }
  // Flores en racimos (colores de la referencia: blancas, amarillas, celestes y melocotón).
  const FL = flowerColors || [['#fbfaf0', '#f2c63a', 0.4], ['#f6dc45', '#e8a52c', 0.36], ['#a9dbee', '#f4efc8', 0.12], ['#f5a882', '#f7d26a', 0.12]];
  const pickFlower = () => { let r = rng(); for (const f of FL) { if ((r -= f[2]) <= 0) return f; } return FL[0]; };
  const nc = Math.round((w * h) / 9000 * flowers);
  for (let i = 0; i < nc; i++) {
    const t = Math.pow(rng(), 0.65);
    const cy = y0 + t * h, cx = x0 + rng() * w;
    const spread = lerp(6, 120, t);
    const [petal, heart] = pickFlower();
    const m = 3 + Math.floor(rng() * 7);
    for (let j = 0; j < m; j++) {
      const xx = cx + (rng() - 0.5) * spread * 2, yy = cy + (rng() - 0.5) * spread * 0.5;
      const tt = clamp((yy - y0) / h);
      const s = lerp(1.2, 9, tt * tt) * (0.7 + rng() * 0.6);
      if (s > 4) {
        const petals = 5 + Math.floor(rng() * 2);
        for (let k = 0; k < petals; k++) {
          const a = (k / petals) * Math.PI * 2 + rng();
          fillBlob(g, xx + Math.cos(a) * s * 0.55, yy + Math.sin(a) * s * 0.35, s * 0.45, s * 0.25, petal, 1, { wobble: 0.1, n: 8, rot: a, seed: k });
        }
        fillBlob(g, xx, yy, s * 0.28, s * 0.22, heart, 1, { wobble: 0.1, n: 8 });
      } else {
        fillBlob(g, xx, yy, s, s * 0.75, petal, 0.95, { wobble: 0.2, n: 8, seed: j });
      }
    }
  }
  g.restore();
  // Flequillo de hierba sobre la línea del horizonte del prado.
  if (fringe) {
    for (let i = 0; i < fringe.length * 3; i++) {
      const p = fringe[Math.floor(rng() * fringe.length)];
      const sz = 3 + rng() * 7;
      blade(g, p[0] + (rng() - 0.5) * 8, p[1] + 2, sz, 1.4, (lean + (rng() - 0.5) * 0.6) * sz, rng() < 0.5 ? pal.far : mix(pal.far, pal.lit, 0.5), 1, i);
    }
  }
}

// ─── Roca ───────────────────────────────────────────────────────────────────
export const ROCK = { base: '#b99572', light: '#dcbf92', dark: '#7d5f4a', deep: '#54423a', moss: '#6f9447' };

// Rellena un Path2D con roca: estratos inclinados, caras de luz verticales y grietas.
export function paintRock(g, rng, path, bounds, { pal = ROCK, light = [0.6, -0.7] } = {}) {
  const [bx, by, bw, bh] = bounds;
  g.save();
  g.clip(path);
  g.fillStyle = vgrad(g, 0, by, 0, by + bh, [[0, pal.light], [0.25, pal.base], [1, pal.deep]]);
  g.fillRect(bx, by, bw, bh);
  // Estratos.
  const bands = Math.round(bh / 14);
  for (let i = 0; i < bands; i++) {
    const yy = by + (i / bands) * bh + (rng() - 0.5) * 6;
    const c = rng() < 0.5 ? pal.dark : pal.light;
    stroke(g, [[bx - 10, yy], [bx + bw * 0.3, yy + (rng() - 0.5) * 8], [bx + bw * 0.7, yy + (rng() - 0.5) * 8], [bx + bw + 10, yy + (rng() - 0.5) * 6]], { width: 3 + rng() * 6, color: c, alpha: 0.25 + rng() * 0.2, taper: [0.1, 0.2], wobble: 0.4, seed: i });
  }
  // Caras iluminadas y en sombra (pinceladas verticales).
  const s = Math.sign(light[0] || 1);
  const nv = Math.round(bw / 9);
  for (let i = 0; i < nv; i++) {
    const xx = bx + rng() * bw;
    const side = (xx - bx) / bw;
    const litSide = s > 0 ? side : 1 - side;
    const yy = by + rng() * bh * 0.8;
    const len = bh * (0.15 + rng() * 0.4);
    const c = rng() < litSide * 0.9 ? pal.light : pal.dark;
    stroke(g, [[xx, yy], [xx + (rng() - 0.5) * 8, yy + len * 0.5], [xx + (rng() - 0.5) * 12, yy + len]], { width: 4 + rng() * 10, color: c, alpha: 0.35, taper: [0.2, 0.6], wobble: 0.3, seed: i * 2 });
  }
  // Sombra del lado contrario a la luz.
  g.fillStyle = vgrad(g, s > 0 ? bx : bx + bw, 0, s > 0 ? bx + bw : bx, 0, [[0, pal.deep, 0.45], [0.55, pal.deep, 0.05], [1, pal.deep, 0]]);
  g.fillRect(bx, by, bw, bh);
  // Grietas.
  for (let i = 0; i < nv * 0.3; i++) {
    const xx = bx + rng() * bw, yy = by + rng() * bh * 0.7;
    stroke(g, [[xx, yy], [xx + (rng() - 0.5) * 10, yy + 12 + rng() * 30], [xx + (rng() - 0.5) * 16, yy + 30 + rng() * 40]], { width: 1.5 + rng() * 2, color: pal.deep, alpha: 0.55, taper: [0.1, 0.6], seed: i * 5 });
  }
  g.restore();
}

// ─── Lluvia ─────────────────────────────────────────────────────────────────
// Trazos de lluvia animados (deterministas en t). Se pinta cada fotograma.
export function paintRain(g, w, h, t, { count = 900, speed = 1400, len = 46, angle = 0.12, color = '#dfe6ee', alpha = 0.35, seed = 5, width = 1.2 } = {}) {
  const rng = mulberry32(seed);
  g.save();
  g.strokeStyle = css(color, alpha);
  g.lineCap = 'round';
  const dx = Math.sin(angle), dy = Math.cos(angle);
  g.beginPath();
  for (let i = 0; i < count; i++) {
    const depth = 0.4 + rng() * 0.6;
    const x0 = rng() * (w + 200), y0 = rng() * (h + 200);
    const d = (y0 + speed * depth * t) % (h + 200);
    const y = d - 100;
    let x = (x0 + (dx / dy) * d) % (w + 200);
    if (x < 0) x += w + 200;
    x -= 100;
    const L = len * depth;
    g.moveTo(x, y);
    g.lineTo(x - dx * L, y - dy * L);
  }
  g.lineWidth = width;
  g.stroke();
  g.restore();
}

// ─── Islas flotantes ────────────────────────────────────────────────────────
// Isla vista de lado y un poco desde arriba: tapa de hierba (elipse
// abombada), panza de roca en punta, labio de hierba que cuelga, raíces y
// árboles. (x, y) = centro del borde superior; w = ancho; h = alto de la roca.
export function paintIsland(g, rng, x, y, w, h, { light = [0.55, -0.85], rock = ROCK, leaf = LEAF, grass = { top: '#9cc65a', mid: '#7fb04b', dark: '#4f8640' }, trees = 3, conifers = 1, topH = 0.16, tipShift = 0, vines = 1, haze = 0, hazeColor = '#d0e3ef' } = {}) {
  const L = Math.hypot(light[0], light[1]) || 1;
  const lx = light[0] / L;
  const rx = w / 2, ry = w * topH * 0.5;
  // Panza de roca.
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI * t;
    const edge = Math.cos(a);
    const prof = Math.pow(Math.sin(a), 0.75);
    const ridge = (noise3(t * 7, x * 0.01, 1) - 0.5) * 0.25;
    pts.push([x + edge * rx * (0.98 - 0.05 * prof) + tipShift * prof * prof * w * 0.15, y + ry * 0.2 + prof * h * (0.85 + ridge)]);
  }
  pts[n] = [x - rx * 0.98, y + ry * 0.2];
  const belly = new Path2D();
  belly.moveTo(x + rx, y);
  for (const p of pts) belly.lineTo(p[0], p[1]);
  belly.closePath();
  paintRock(g, rng, belly, [x - rx, y - 5, w, h + ry + 10], { pal: rock, light });
  // Raíces y lianas.
  for (let i = 0; i < Math.round(w / 18 * vines); i++) {
    const t = rng();
    const xx = x + (t - 0.5) * w * 0.92;
    const yy = y + ry * 0.3 + Math.sin(t * Math.PI) * ry * 0.4;
    const len = h * (0.08 + Math.pow(rng(), 2) * 0.45);
    const vine = rng() < 0.6;
    const c = vine ? (rng() < 0.5 ? '#4f7d3c' : '#3c6634') : '#5b4434';
    stroke(g, bez([xx, yy], [xx + (rng() - 0.5) * 10, yy + len * 0.4], [xx + (rng() - 0.5) * 16, yy + len * 0.8], [xx + (rng() - 0.5) * 10, yy + len], 10), { width: 1.5 + rng() * 2.5, color: c, taper: [0.05, 0.9], wobble: 0.2, seed: i });
    if (vine) for (let k = 0; k < 4; k++) dab(g, xx + (rng() - 0.5) * 8, yy + len * rng(), 5, 3, rng() * 3, '#5d8f45', 0.9, k);
  }
  // Labio de hierba colgante (lado en sombra debajo).
  const lip = blobPath(x, y + ry * 0.35, rx * 1.02, ry * 1.05, { wobble: 0.04, n: 40, seed: x * 0.01 });
  g.fillStyle = css(grass.dark); g.fill(lip);
  for (let i = 0; i < w / 6; i++) {
    const t = rng();
    const a = Math.PI * t;
    const xx = x + Math.cos(a) * rx * 1.0, yy = y + ry * 0.35 + Math.sin(a) * ry * 1.0;
    blade(g, xx, yy - 2, -(4 + rng() * 9), 2 + rng() * 2, (rng() - 0.5) * 6, rng() < 0.5 ? grass.dark : '#3f6e36', 1, i);
  }
  // Tapa de hierba.
  const topP = blobPath(x, y, rx, ry, { wobble: 0.035, n: 40, seed: x * 0.02 + 3 });
  g.save();
  g.clip(topP);
  g.fillStyle = vgrad(g, 0, y - ry, 0, y + ry, [[0, grass.top], [1, grass.mid]]);
  g.fillRect(x - rx, y - ry, w, ry * 2);
  for (let i = 0; i < w * ry / 30; i++) {
    const xx = x + (rng() - 0.5) * w, yy = y + (rng() - 0.5) * ry * 2;
    dab(g, xx, yy, 6 + rng() * 10, 2 + rng() * 3, (rng() - 0.5) * 0.4, rng() < 0.5 ? grass.top : mix(grass.mid, grass.dark, 0.4), 0.5, i, 0.2);
  }
  g.fillStyle = vgrad(g, x - rx * lx, 0, x + rx * lx, 0, [[0, grass.dark, 0.35], [0.6, grass.dark, 0], [1, '#ffffff', 0.08]]);
  g.fillRect(x - rx, y - ry, w, ry * 2);
  g.restore();
  // Borde de hierba recortado (briznas sobre el perfil).
  for (let i = 0; i < w / 4; i++) {
    const a = Math.PI + Math.PI * rng();
    const xx = x + Math.cos(a) * rx * 0.99, yy = y + Math.sin(a) * ry * 0.99;
    blade(g, xx, yy + 2, 3 + rng() * 6, 1.6, (rng() - 0.5) * 4, rng() < 0.5 ? grass.top : grass.mid, 1, i * 3);
  }
  // Árboles encima.
  const spots = [];
  for (let i = 0; i < trees + conifers; i++) {
    const t = (i + 0.5) / (trees + conifers) + (rng() - 0.5) * 0.15;
    spots.push([x + (t - 0.5) * w * 0.7, y + (rng() - 0.6) * ry * 0.9, i < trees]);
  }
  spots.sort((a, b) => a[1] - b[1]);
  for (const [xx, yy, round] of spots) {
    const th = w * (0.16 + rng() * 0.12);
    if (round) paintTree(g, rng, xx, yy, th, { light, pal: leaf, branches: 2 });
    else paintConifer(g, rng, xx, yy, th * 1.1, { light, pal: leaf });
  }
  if (haze > 0) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = css(hazeColor, haze);
    g.fillRect(x - rx - 10, y - h, w + 20, h * 2.2);
    g.restore();
  }
  return { topY: y, rx, ry };
}

// Cascada animada: vetas blancas que caen desde (x, y) y se deshacen en bruma.
export function paintWaterfall(g, x, y, w, h, t, { color = '#e8f6fb', alpha = 0.85, seed = 3 } = {}) {
  const rng = mulberry32(seed);
  g.save();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, css('#bfe3ee', alpha * 0.85));
  gr.addColorStop(0.7, css('#dff1f6', alpha * 0.5));
  gr.addColorStop(1, css('#ffffff', 0));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - w * 0.5, y);
  g.lineTo(x + w * 0.5, y);
  g.lineTo(x + w * 0.9, y + h);
  g.lineTo(x - w * 0.9, y + h);
  g.closePath();
  g.fill();
  const n = Math.round(w * 1.2);
  for (let i = 0; i < n; i++) {
    const fx = rng() - 0.5;
    const ph = rng();
    const speed = 0.55 + rng() * 0.4;
    const s = (ph + t * speed) % 1;
    const yy = y + s * s * h;
    const spread = 1 + s * 0.8;
    const len = h * (0.08 + rng() * 0.12) * (0.4 + s);
    const a = alpha * (1 - smooth((s - 0.55) / 0.45));
    stroke(g, [[x + fx * w * spread, yy], [x + fx * w * (spread + 0.05), yy + len]], { width: 1.5 + rng() * w * 0.12, color, alpha: a, taper: [0.2, 0.5], wobble: 0.2, seed: i });
  }
  // Bruma abajo.
  for (let i = 0; i < 6; i++) fillBlob(g, x + (rng() - 0.5) * w * 1.6, y + h * (0.85 + rng() * 0.1), w * (0.6 + rng() * 0.5), w * 0.3, '#ffffff', 0.18, { wobble: 0.2, seed: i + t * 0.2 });
  g.restore();
}

// ─── Masas pintadas píxel a píxel ───────────────────────────────────────────
// Para nubes, copas de árboles y matorrales: un conjunto de elipses se funde
// en un solo volumen (máximo suave de cúpulas), se ilumina como un cuerpo
// redondeado y se pinta con una rampa corta de tonos de gouache. El ruido
// orientado según la forma imita la dirección del pincel; los huecos entre
// lóbulos se oscurecen. Devuelve un lienzo con transparencia.
//
// puffs: [{ x, y, rx, ry, z = 0 }] en píxeles del lienzo (z eleva un lóbulo
// para que tape a los de detrás). ramp: [[t, color], ...] de oscuro (0) a claro (1).
function rampColor(ramp, t, out) {
  if (t <= ramp[0][0]) { const c = ramp[0][1]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [t0, c0] = ramp[i - 1], [t1, c1] = ramp[i];
      // Transición corta entre tonos (bordes de pincel, no degradado de aerógrafo).
      let k = (t - t0) / (t1 - t0);
      k = smooth((k - 0.5) * ramp.sharp + 0.5);
      out[0] = c0[0] + (c1[0] - c0[0]) * k; out[1] = c0[1] + (c1[1] - c0[1]) * k; out[2] = c0[2] + (c1[2] - c0[2]) * k;
      return out;
    }
  }
  const c = ramp[ramp.length - 1][1]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out;
}

export function makeRamp(stops, sharp = 2.2) {
  const r = stops.map(([t, c]) => [t, rgb(c)]);
  r.sharp = sharp;
  return r;
}

export function renderMass(w, h, puffs, {
  light = [0.5, -0.8, 0.55], ramp, sharpK = 0.06, edgeAmp = 0.08, edgeFreq = 0.035, leafy = 0,
  brushAmp = 0.1, brushFreq = 0.03, brushStretch = 5, ao = 0.5, aoRadius = 14, aoRange = 30,
  bump = 1.6, bottom = null, bottomDark = 0.25, bottomRange = 0.25, wrap = 0.35, seed = 1,
  haze = null, rim = 0, rimColor = '#ffffff', alphaEdge = 1.2, toneBias = 0,
  alphaNoise = 0, alphaNoiseFreq = 0.05, edgeLift = 0, alphaEdgeLit = 0, vertical = null,
} = {}) {
  w = Math.ceil(w); h = Math.ceil(h);
  const N = w * h;
  const acc = new Float32Array(N);
  const cov = new Float32Array(N);
  // Ruido de borde (silueta irregular u hojosa).
  const en = new Float32Array(N);
  if (edgeAmp > 0 || leafy > 0) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = (noise3(x * edgeFreq, y * edgeFreq, seed) - 0.5) * 2 * edgeAmp;
      if (leafy > 0) n += (noise3(x * edgeFreq * 6, y * edgeFreq * 6, seed + 7) - 0.5) * 2 * leafy;
      en[y * w + x] = n;
    }
  }
  for (const p of puffs) {
    const z = p.z ?? 0;
    const x0 = Math.max(0, Math.floor(p.x - p.rx * 1.2)), x1 = Math.min(w - 1, Math.ceil(p.x + p.rx * 1.2));
    const y0 = Math.max(0, Math.floor(p.y - p.ry * 1.2)), y1 = Math.min(h - 1, Math.ceil(p.y + p.ry * 1.2));
    const irx = 1 / p.rx, iry = 1 / p.ry;
    for (let y = y0; y <= y1; y++) {
      const dy = (y - p.y) * iry;
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        const dx = (x - p.x) * irx;
        const d2 = (dx * dx + dy * dy) * (1 + en[i]);
        if (d2 >= 1) continue;
        const hh = Math.sqrt(1 - d2) * p.ry + z * Math.pow(1 - d2, 0.15);
        acc[i] += Math.exp(Math.min(80, hh * sharpK)) - 1;
        const c = (1 - Math.sqrt(d2)) * p.ry * alphaEdge;
        if (c > cov[i]) cov[i] = c;
      }
    }
  }
  const H = new Float32Array(N);
  let minH = Infinity;
  for (let i = 0; i < N; i++) { if (cov[i] > 0) { H[i] = Math.log(1 + acc[i]) / sharpK; if (H[i] < minH) minH = H[i]; } }
  if (!isFinite(minH)) minH = 0;
  const outside = minH - 20;
  for (let i = 0; i < N; i++) if (cov[i] <= 0) H[i] = outside;
  // Oclusión: altura media alrededor (caja separable) frente a la propia.
  const blur = new Float32Array(N), tmp = new Float32Array(N);
  const R = Math.max(1, Math.round(aoRadius));
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -R; x <= R; x++) s += H[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / (2 * R + 1);
      s += H[y * w + Math.min(w - 1, x + R + 1)] - H[y * w + Math.max(0, x - R)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -R; y <= R; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      blur[y * w + x] = s / (2 * R + 1);
      s += tmp[Math.min(h - 1, y + R + 1) * w + x] - tmp[Math.max(0, y - R) * w + x];
    }
  }
  let lx = light[0], ly = light[1], lz = light[2] ?? 0.55;
  const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
  const img = new ImageData(w, h);
  const d = img.data;
  const col = [0, 0, 0];
  const hz = haze ? rgb(haze.color) : null;
  const rc = rgb(rimColor);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (cov[i] <= 0) continue;
      const hl = H[y * w + Math.max(0, x - 1)], hr = H[y * w + Math.min(w - 1, x + 1)];
      const hu = H[Math.max(0, y - 1) * w + x], hd = H[Math.min(h - 1, y + 1) * w + x];
      let nx = (hl - hr) * 0.5, ny = (hu - hd) * 0.5, nz = 1 / bump;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      // y de pantalla hacia abajo: la luz con ly<0 viene de arriba.
      const ndl = nx * lx + ny * ly + nz * lz;
      // Alfa: fundido más largo en el lado de sombra que en el iluminado.
      const ae = alphaEdgeLit > 0 ? alphaEdge + (alphaEdgeLit - alphaEdge) * smooth(ndl * 1.5 + 0.2) : alphaEdge;
      let a = Math.min(1, cov[i] * ae / alphaEdge);
      if (alphaNoise > 0 && a < 1) {
        const nn = noise3(x * alphaNoiseFreq, y * alphaNoiseFreq, seed + 11) * 0.65 + noise3(x * alphaNoiseFreq * 3.1, y * alphaNoiseFreq * 3.1, seed + 13) * 0.35;
        a = Math.max(0, Math.min(1, a * (1 + alphaNoise) - (1 - nn) * alphaNoise));
      }
      if (a <= 0) continue;
      let t = (ndl + wrap) / (1 + wrap);
      const occ = Math.min(1, Math.max(0, (blur[i] - H[i]) / aoRange));
      t -= occ * ao;
      if (bottom !== null) t -= bottomDark * (1 - smooth((bottom - y) / (bottomRange * h)));
      // Cima iluminada y mitad baja en sombra, como se pintan los cúmulos.
      if (vertical) t -= vertical.amount * smooth((y - vertical.top) / (vertical.bottom - vertical.top) * 1.15 - 0.2);
      // Pincel: ruido estirado a lo largo del contorno.
      const tx = -ny, ty = nx;
      const u = (x * tx + y * ty) * brushFreq, v = (x * nx + y * ny) * brushFreq * brushStretch;
      t += (noise3(u, v, seed + 3) - 0.5) * 2 * brushAmp + toneBias;
      // Los bordes finos (poco espesor) dejan pasar la luz: más claros.
      if (edgeLift > 0) t += edgeLift * (1 - Math.min(1, cov[i]));
      rampColor(ramp, t, col);
      if (rim > 0) {
        const edge = Math.max(0, 1 - nz * 1.4);
        const back = Math.max(0, nx * lx + ny * ly);
        const rk = rim * edge * (0.3 + back);
        col[0] += (rc[0] - col[0]) * Math.min(1, rk); col[1] += (rc[1] - col[1]) * Math.min(1, rk); col[2] += (rc[2] - col[2]) * Math.min(1, rk);
      }
      if (hz) {
        const k = typeof haze.fn === 'function' ? haze.fn(x, y) : haze.amount;
        col[0] += (hz[0] - col[0]) * k; col[1] += (hz[1] - col[1]) * k; col[2] += (hz[2] - col[2]) * k;
      }
      const o = i * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a * 255;
    }
  }
  const c = makeCanvas(w, h);
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

// Rampa de nube a partir de una paleta { hi, lit, mid, shade, deep }.
export function cloudRamp(pal, sharp = 1.0) {
  return makeRamp([[0.0, pal.deep], [0.28, pal.shade], [0.5, pal.mid], [0.68, pal.lit], [0.85, pal.hi]], sharp);
}
export function leafRamp(pal = LEAF, sharp = 2.6) {
  return makeRamp([[0.0, mix(pal.deep, '#1c2e2a', 0.4)], [0.25, pal.deep], [0.45, pal.shade], [0.62, pal.mid], [0.8, pal.lit], [0.95, pal.hi]], sharp);
}

// Lóbulos fractales tipo coliflor: cuerpos grandes, lóbulos medianos sobre su
// contorno superior y bultitos pequeños sobre estos. Coordenadas con la base en
// y=0 y hacia arriba negativo.
export function fractalPuffs(rng, w, h, { tower = 1, levels = 3, flatten = 1 } = {}) {
  const out = [];
  // Raíces en pisos que se estrechan hacia arriba (silueta de pirámide, como
  // los cúmulos de verano): base ancha, cuerpo y, si tower > 0,6, una torre.
  const roots = [];
  const tiers = tower > 1.1 ? 3 : tower > 0.6 ? 2 : 1;
  const tierH = h / (tiers + 0.35);
  for (let t = 0; t < tiers; t++) {
    const tw = w * (1 - t * 0.3) * (t === 0 ? 1 : 0.9);
    const r = Math.min(tierH * (0.62 - t * 0.04), tw * 0.32) * (0.9 + rng() * 0.2);
    const n = Math.max(1, Math.round(tw / (r * 1.25)));
    const cx = (rng() - 0.5) * w * 0.08 * t;
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      const edge = 1 - Math.abs(f - 0.5) * 2;
      const rr = r * (0.8 + 0.3 * edge) * (0.9 + rng() * 0.2);
      roots.push({ x: cx + (f - 0.5) * (tw - rr * 1.4), y: -(t * tierH + rr * (0.75 + 0.2 * edge)), r: rr, z: rr * 0.25 * edge });
    }
  }
  out.push(...roots);
  let parents = roots;
  for (let lv = 1; lv < levels; lv++) {
    const kids = [];
    for (const p of parents) {
      const n = lv === 1 ? 6 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        // Ángulos sobre la mitad superior (y laterales), nunca hacia la base.
        const a = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 1.25;
        const rr = p.r * (lv === 1 ? 0.36 + rng() * 0.16 : 0.34 + rng() * 0.14);
        const d = p.r * (0.78 + rng() * 0.12);
        const c = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * flatten, r: rr, z: p.z + p.r * 0.35 * (0.6 + 0.4 * Math.cos(a + Math.PI / 2)) };
        if (c.y > -c.r * 0.45) continue;
        kids.push(c);
      }
    }
    out.push(...kids);
    parents = kids;
  }
  return out;
}

// Cúmulo pintado como masa: devuelve un lienzo (anclado abajo al centro).
export function cumulusMass(rng, w, h, { pal = CLOUD_DAY, light = [-0.5, -0.85, 0.3], tower = 1, haze = 0, hazeColor = '#bfe3ee', seed = 1, flat = true, levels = 3, soft = true } = {}) {
  const pad = Math.round(Math.max(w, h) * 0.12);
  const cw = Math.ceil(w + pad * 2), ch = Math.ceil(h + pad * 2);
  const base = ch - pad;
  const puffs = fractalPuffs(rng, w, h, { tower, levels }).map((p) => ({ x: cw / 2 + p.x, y: base + p.y, rx: p.r * 1.08, ry: p.r, z: p.z * 0.6 }));
  const c = renderMass(cw, ch, puffs, {
    light, ramp: cloudRamp(pal, 2.0), sharpK: 3.4 / Math.max(10, h * 0.12), edgeAmp: 0.13, edgeFreq: 9 / Math.max(40, h),
    brushAmp: 0.05, brushFreq: 1.4 / Math.max(10, h * 0.1), brushStretch: 2, ao: 0.2, aoRadius: h * 0.06, aoRange: h * 0.08,
    bump: 0.85, bottom: flat ? base : null, bottomDark: 0.2, bottomRange: 0.3, wrap: 0.25, seed,
    rim: 0.2, rimColor: pal.rim, haze: haze > 0 ? { color: hazeColor, amount: haze } : null,
    vertical: { top: base - h, bottom: base, amount: 0.38 },
    alphaEdge: soft ? 1 / Math.max(3, h * 0.02) : 1.2, alphaEdgeLit: soft ? 1 / 1.6 : 0, alphaNoise: soft ? 0.5 : 0, alphaNoiseFreq: 10 / Math.max(40, h), edgeLift: soft ? 0.15 : 0,
  });
  if (soft) painterly(c, { seed, size: Math.max(3, h * 0.016), alpha: 0.35, stretch: 2.2, soften: Math.max(0.6, h * 0.0015), density: 1 });
  if (flat) {
    // Base plana pero con el borde inferior fundido, no cortado a cuchillo.
    const g = c.getContext('2d');
    g.save();
    g.globalCompositeOperation = 'destination-out';
    const fade = soft ? h * 0.08 : 2;
    g.fillStyle = vgrad(g, 0, base - fade, 0, base + 1, [[0, '#000', 0], [1, '#000', 1]]);
    g.fillRect(0, base - fade, cw, fade + 1);
    g.fillStyle = '#000';
    g.fillRect(0, base + 1, cw, ch);
    g.restore();
  }
  c.anchor = [cw / 2, base];
  return c;
}

export function drawMass(g, m, x, y, k = 1) {
  const [ax, ay] = m.anchor || [m.width / 2, m.height / 2];
  g.drawImage(m, x - ax * k, y - ay * k, m.width * k, m.height * k);
}

// Copa de árbol como masa hojosa.
export function canopyMass(rng, rx, ry, { pal = LEAF, light = [0.5, -0.8, 0.6], clumps = 26, seed = 1, haze = 0, hazeColor = '#d0e3ef' } = {}) {
  const pad = Math.round(Math.max(rx, ry) * 0.3);
  const cw = Math.ceil(rx * 2 + pad * 2), ch = Math.ceil(ry * 2 + pad * 2);
  const puffs = [];
  for (let i = 0; i < clumps; i++) {
    const a = rng() * Math.PI * 2, d = Math.pow(rng(), 0.6) * 0.78;
    const s = Math.min(rx, ry) * (0.22 + rng() * 0.2);
    const yy = Math.sin(a) * ry * d;
    puffs.push({ x: cw / 2 + Math.cos(a) * rx * d, y: ch / 2 + yy, rx: s * 1.1, ry: s, z: -yy * 0.4 + rng() * s * 0.3 });
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

// Mar de nubes como una sola masa vista en perspectiva rasante: racimos de
// cúmulos bajos repartidos sin orden, pequeños y brumosos al fondo y grandes
// delante, con valles en sombra entre ellos.
export function cloudSeaMass(rng, w, h, { pal = CLOUD_DAY, light = [0.6, -0.7, 0.35], clusters = 340, haze = '#d6e8f2', hazeTop = 0.8, seed = 1, horizon = 0.06 } = {}) {
  const puffs = [];
  for (let i = 0; i < clusters; i++) {
    const t = Math.pow((i + rng()) / clusters, 0.9);
    const yy = h * horizon + Math.pow(t, 1.5) * h * (1 - horizon) * 1.05;
    const size = lerp(h * 0.06, h * 0.5, Math.pow(t, 1.25)) * (0.7 + rng() * 0.8);
    const xx = rng() * (w + size * 2) - size;
    for (const p of fractalPuffs(rng, size * (1.6 + rng() * 1.4), size * (0.5 + rng() * 0.45), { tower: 0.3, levels: t > 0.3 ? 3 : 2, flatten: 0.75 })) {
      puffs.push({ x: xx + p.x, y: yy + p.y * 0.8 + size * 0.3, rx: p.r * 1.3, ry: p.r * 0.78, z: t * h * 0.9 + p.z * 0.5 });
    }
  }
  const mass = renderMass(w, h, puffs, {
    light, ramp: cloudRamp(pal), sharpK: 0.07, edgeAmp: 0.12, edgeFreq: 0.025, brushAmp: 0.06, brushFreq: 0.04, brushStretch: 3,
    ao: 0.5, aoRadius: 9, aoRange: 14, bump: 1.25, wrap: 0.2, seed, rim: 0.2, rimColor: pal.rim,
    haze: { color: haze, fn: (x, y) => hazeTop * Math.pow(1 - Math.min(1, y / (h * 0.7)), 1.5) },
  });
  // Fondo del manto: sombra lavanda difusa que asoma entre los racimos.
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = vgrad(g, 0, 0, 0, h, [[0, haze], [0.25, mix(pal.mid, haze, 0.5)], [1, pal.shade]]);
  g.fillRect(0, h * horizon, w, h);
  g.drawImage(mass, 0, 0);
  return c;
}

// ─── Filtro de pincel ───────────────────────────────────────────────────────
// Repinta un lienzo ya pintado con miles de pinceladas que toman el color de
// debajo y siguen las formas (perpendiculares al gradiente de luz). Primero lo
// funde un poco (como pintura húmeda) y después deja la huella del pincel.
// Respeta la transparencia del lienzo (las pinceladas no se salen).
export function painterly(canvas, { seed = 1, density = 1, size = 9, alpha = 0.55, stretch = 2.6, soften = 1.2, jitter = 0.04, edgeKeep = true, angle = null } = {}) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (soften > 0) {
    const tmp = makeCanvas(w, h);
    const t = tmp.getContext('2d');
    t.filter = `blur(${soften}px)`;
    t.drawImage(canvas, 0, 0);
    g.save();
    g.globalCompositeOperation = edgeKeep ? 'source-atop' : 'source-over';
    g.drawImage(tmp, 0, 0);
    g.restore();
  }
  const src = g.getImageData(0, 0, w, h).data;
  const lum = (x, y) => {
    x = Math.max(0, Math.min(w - 1, x | 0)); y = Math.max(0, Math.min(h - 1, y | 0));
    const o = (y * w + x) * 4;
    return src[o] * 0.3 + src[o + 1] * 0.59 + src[o + 2] * 0.11;
  };
  const rng = mulberry32(seed);
  const n = Math.round((w * h) / (size * size * stretch) * 1.4 * density);
  g.save();
  g.globalCompositeOperation = edgeKeep ? 'source-atop' : 'source-over';
  for (let i = 0; i < n; i++) {
    const x = rng() * w, y = rng() * h;
    const o = ((y | 0) * w + (x | 0)) * 4;
    const a = src[o + 3];
    if (a < 40) continue;
    const s = size * (0.6 + rng() * 0.8);
    let ang;
    if (angle) ang = angle(x, y);
    else {
      const k = Math.max(2, s * 0.8);
      const gx = lum(x + k, y) - lum(x - k, y), gy = lum(x, y + k) - lum(x, y - k);
      ang = Math.abs(gx) + Math.abs(gy) < 3 ? noise3(x * 0.004, y * 0.004, seed) * Math.PI * 2 : Math.atan2(gy, gx) + Math.PI / 2;
    }
    const k = 1 + (rng() - 0.5) * 2 * jitter;
    g.fillStyle = `rgba(${Math.min(255, src[o] * k) | 0},${Math.min(255, src[o + 1] * k) | 0},${Math.min(255, src[o + 2] * k) | 0},${alpha * (a / 255) * (0.6 + rng() * 0.4)})`;
    g.beginPath();
    g.ellipse(x, y, s * stretch * 0.5, s * 0.5, ang, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  return canvas;
}

// Flores grandes desenfocadas de primer término (como en la referencia): pétalos
// verde muy pálido o blanco con corazón amarillo, desenfocados.
export function bokehFlowers(g, rng, x, y, size, n = 5, { petal = '#eef6e4', heart = '#f2c847', blur = 0.05 } = {}) {
  const pad = size * 0.6;
  const c = makeCanvas(size * 2.4 + pad * 2, size * 1.6 + pad * 2);
  const t = c.getContext('2d');
  for (let i = 0; i < n; i++) {
    const cx = pad + rng() * size * 2.2, cy = pad + rng() * size * 1.3;
    const s = size * (0.25 + rng() * 0.3);
    const np = 5;
    for (let k = 0; k < np; k++) {
      const a = (k / np) * Math.PI * 2 + rng() * 0.4;
      fillBlob(t, cx + Math.cos(a) * s * 0.6, cy + Math.sin(a) * s * 0.6, s * 0.6, s * 0.42, mix(petal, '#ffffff', rng() * 0.4), 0.95, { wobble: 0.12, n: 12, rot: a, seed: k + i });
    }
    fillBlob(t, cx, cy, s * 0.3, s * 0.26, heart, 1, { wobble: 0.1, n: 10 });
    stroke(t, [[cx, cy + s * 0.3], [cx + (rng() - 0.5) * s, cy + s * 2]], { width: s * 0.12, color: '#2f7a2a', taper: [0.1, 0.5] });
  }
  g.save();
  g.filter = `blur(${Math.max(1, size * blur)}px)`;
  g.drawImage(c, x - pad, y - pad);
  g.restore();
}

// Estelas finas y rectas cruzando el cielo en diagonal.
export function paintStreaks(g, rng, x, y, len, angle, { n = 3, color = '#ffffff', alpha = 0.45, width = 2.5 } = {}) {
  for (let i = 0; i < n; i++) {
    const ox = (rng() - 0.5) * len * 0.15, oy = i * width * 6 + (rng() - 0.5) * 6;
    const L = len * (0.6 + rng() * 0.4);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const pts = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([x + ox + ca * L * t, y + oy + sa * L * t]); }
    stroke(g, pts, { width: width * (0.6 + rng() * 0.8), color, alpha: alpha * (0.5 + rng() * 0.5), taper: [0.3, 0.6], wobble: 0.3, seed: i });
  }
}
