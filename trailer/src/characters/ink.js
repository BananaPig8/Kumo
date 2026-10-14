// Herramientas de acetato para los personajes: caminos suaves con esquinas,
// trazos de tinta afilados, sombras duras en media luna, tinte por la luz del
// plano y cintas (bufanda) con ondas.

import { INK } from '../engine/style.js';
import { rgb } from '../engine/paint.js';

export const TAU = Math.PI * 2;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ─── Caminos ────────────────────────────────────────────────────────────────
// Segmentos de Bézier por Catmull-Rom. Un tercer valor verdadero en un punto
// lo convierte en esquina (punta de mechón, pico de pliegue).
function segs(pts, closed) {
  const n = pts.length, out = [];
  const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = p1[2] ? [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3] : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? [p2[0] - (p2[0] - p1[0]) / 3, p2[1] - (p2[1] - p1[1]) / 3] : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out.push([p1, c1, c2, p2]);
  }
  return out;
}

// Path2D suave por los puntos (añade a `p` si se pasa).
export function curve(pts, closed = true, p = new Path2D()) {
  if (pts.length < 2) return p;
  p.moveTo(pts[0][0], pts[0][1]);
  for (const [, c1, c2, b] of segs(pts, closed)) p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1]);
  if (closed) p.closePath();
  return p;
}

// Puntos muestreados de la misma curva (para trazos afilados).
export function sample(pts, closed = false, steps = 8) {
  const out = [];
  const S = segs(pts, closed);
  S.forEach(([a, c1, c2, b], si) => {
    for (let i = si === 0 ? 0 : 1; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      out.push([u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]);
    }
  });
  return out;
}

export function ell(x, y, rx, ry = rx, rot = 0, p = new Path2D()) {
  p.moveTo(x + Math.cos(rot) * Math.max(0.1, rx), y + Math.sin(rot) * Math.max(0.1, rx));
  p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  p.closePath();
  return p;
}

// Media figura (de arriba al eje de abajo, x ≥ 0) → figura simétrica cerrada.
export function sym(half) {
  const back = half.slice(1, -1).reverse().map(([x, y, c]) => [-x, y, c]);
  return [...half, ...back];
}
export const mirror = (pts, m = -1) => pts.map(([x, y, c]) => [x * m, y, c]);
export const shift = (pts, dx, dy, s = 1) => pts.map(([x, y, c]) => [x * s + dx, y * s + dy, c]);
export function moved(path, dx, dy, sx = 1, sy = 1) {
  const p = new Path2D();
  p.addPath(path, new DOMMatrix([sx, 0, 0, sy, dx, dy]));
  return p;
}

// ─── Color ──────────────────────────────────────────────────────────────────
// Tinte por la luz del plano: multiplica cada color por `tint` (mezclado con
// `amt`). Sin tinte devuelve el color tal cual.
export function toner(tint = null, amt = 1) {
  const cache = new Map();
  const T = tint ? rgb(tint) : null;
  return (c, a = 1) => {
    const key = (Array.isArray(c) ? c.join(',') : c) + '|' + a;
    let v = cache.get(key);
    if (v) return v;
    let [r, g, b] = rgb(c);
    if (T) { r = lerp(r, (r * T[0]) / 255, amt); g = lerp(g, (g * T[1]) / 255, amt); b = lerp(b, (b * T[2]) / 255, amt); }
    v = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
    cache.set(key, v);
    return v;
  };
}

// Dirección de la luz normalizada (por defecto arriba a la izquierda).
export function lightDir(light) {
  const l = light || [-0.5, -0.85];
  const n = Math.hypot(l[0], l[1]) || 1;
  return [l[0] / n, l[1] / n];
}

// ─── Tinta ──────────────────────────────────────────────────────────────────
export function fill(g, path, color) { g.fillStyle = color; g.fill(path); }
export function line(g, path, w, color = INK) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = color; g.lineWidth = w; g.stroke(path);
}
export function inked(g, path, color, w, ink = INK) { fill(g, path, color); if (w > 0) line(g, path, w, ink); }

// Media luna: la figura menos la misma figura desplazada (dx, dy). Desplazada
// hacia la luz deja la sombra; alejada de la luz, el brillo o el contraluz.
export function crescent(g, path, dx, dy, color) {
  const q = new Path2D();
  q.addPath(path);
  q.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
  g.save();
  g.clip(path);
  g.fillStyle = color;
  g.fill(q, 'evenodd');
  g.restore();
}

// Pinta `fn` recortado a la figura.
export function clipped(g, path, fn) { g.save(); g.clip(path); fn(); g.restore(); }

// Sombra arrojada: multiplica lo que ya hay con un gris violáceo (sirve sobre
// piel, pelo o tela por igual).
export const SHADOW_MUL = '#d8c3cc';
export function castShadow(g, path, clip = null, color = SHADOW_MUL, alpha = 1) {
  g.save();
  if (clip) g.clip(clip);
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha *= alpha;
  g.fillStyle = color;
  g.fill(path);
  g.restore();
}

// Trazo de tinta afilado: polígono que engorda y adelgaza a lo largo de la
// curva. w0/w1 = grosor relativo en los extremos.
export function taper(g, pts, w, color = INK, { a = 0.3, b = 0.7, w0 = 0.1, w1 = 0.1, steps = 8, closed = false } = {}) {
  const s = pts.length > 2 || closed ? sample(pts, closed, steps) : pts;
  const n = s.length;
  if (n < 2) return;
  const acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const L = acc[n - 1] || 1;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = s[Math.max(0, i - 1)], q = s[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const u = acc[i] / L;
    let k = 1;
    if (u < a) k = lerp(w0, 1, Math.sin((u / a) * Math.PI / 2));
    else if (u > b) k = lerp(1, w1, 1 - Math.cos(((u - b) / (1 - b)) * Math.PI / 2));
    const hw = (w * k) / 2;
    left.push([s[i][0] - dy * hw, s[i][1] + dx * hw]);
    right.push([s[i][0] + dy * hw, s[i][1] - dx * hw]);
  }
  const p = new Path2D();
  p.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) p.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  g.fillStyle = color;
  g.fill(p);
}

// Brillo de tinta blanca: gota alargada con punta (pelo mojado, plástico).
export function gleam(g, x0, y0, x1, y1, w, color, bow = 0) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
  taper(g, [[x0, y0], [mx - (dy / l) * bow, my + (dx / l) * bow], [x1, y1]], w, color, { a: 0.45, b: 0.55, w0: 0.05, w1: 0.05 });
}

// Parpadeo determinista: 0 abierto … 1 cerrado. Un parpadeo cada 2,5–5 s.
export function blinkAt(t, seed = 0) {
  const P = 3.4;
  let b = 0;
  for (const k of [Math.floor(t / P) - 1, Math.floor(t / P)]) {
    const h = Math.abs(Math.sin((k + seed * 7.13) * 91.7 + 3.1) * 43758.5453) % 1;
    const s0 = k * P + 0.4 + h * 2.4;
    const u = (t - s0) / 0.2;
    if (u >= 0 && u <= 1) b = Math.max(b, Math.min(1, Math.sin(u * Math.PI) * 1.5));
  }
  return b;
}

// Pseudoaleatorio estable a partir de un entero (para detalles fijos).
export function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ─── Cinta (bufanda) ────────────────────────────────────────────────────────
// Cinta a lo largo de una línea central `pts` (polilínea densa), con anchura
// `wAt(u)` y giro `twAt(u)` (cos < 0 enseña el revés). Cada tramo se colorea
// por su cara y se perfila con tinta por los dos bordes.
export function ribbon(g, pts, wAt, twAt, front, back, lw, ink = INK, { fringe = 0 } = {}) {
  const n = pts.length;
  const A = [], B = [], face = [];
  for (let i = 0; i < n; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const u = i / (n - 1);
    const c = Math.cos(twAt(u));
    const hw = (wAt(u) / 2) * (0.18 + 0.82 * Math.abs(c)) * Math.sign(c || 1);
    A.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]);
    B.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
    face.push(c >= 0);
  }
  // Relleno por tramos de la misma cara (cara o revés), sin costuras.
  let i0 = 0;
  for (let i = 1; i < n; i++) {
    const f0 = face[i0] && face[Math.min(n - 1, i0 + 1)];
    const fi = i < n - 1 ? face[i] && face[i + 1] : !f0;
    if (fi === f0 && i < n - 1) continue;
    const q = new Path2D();
    q.moveTo(A[i0][0], A[i0][1]);
    for (let j = i0 + 1; j <= i; j++) q.lineTo(A[j][0], A[j][1]);
    for (let j = i; j >= i0; j--) q.lineTo(B[j][0], B[j][1]);
    q.closePath();
    g.fillStyle = f0 ? front : back;
    g.fill(q);
    i0 = i;
  }
  const ea = new Path2D(), eb = new Path2D();
  ea.moveTo(A[0][0], A[0][1]); eb.moveTo(B[0][0], B[0][1]);
  for (let i = 1; i < n; i++) { ea.lineTo(A[i][0], A[i][1]); eb.lineTo(B[i][0], B[i][1]); }
  ea.lineTo(B[n - 1][0], B[n - 1][1]);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = ink; g.lineWidth = lw;
  g.stroke(ea); g.stroke(eb);
  // Flecos en la punta.
  if (fringe > 0) {
    const e0 = A[n - 1], e1 = B[n - 1], d = [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]];
    const dl = Math.hypot(d[0], d[1]) || 1;
    g.lineWidth = lw * 0.9;
    g.strokeStyle = front;
    for (let k = 0; k <= 4; k++) {
      const u = k / 4, x = lerp(e0[0], e1[0], u), y = lerp(e0[1], e1[1], u);
      const L = fringe * (0.7 + 0.3 * Math.sin(k * 2.3));
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (d[0] / dl) * L, y + (d[1] / dl) * L); g.stroke();
    }
  }
  return { A, B };
}

// Pieza de acetato: color plano, sombra dura en media luna (d hacia la luz),
// brillo opcional y perfil de tinta.
export function cel(g, path, base, sh, L, d, lw, ink = INK, hi = null, hd = 0) {
  fill(g, path, base);
  if (sh && d) crescent(g, path, L[0] * d, L[1] * d, sh);
  if (hi && hd) crescent(g, path, -L[0] * hd, -L[1] * hd, hi);
  if (lw > 0) line(g, path, lw, ink);
}
