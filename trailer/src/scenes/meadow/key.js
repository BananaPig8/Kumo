// La llave dorada antigua (diseño propio): el ojo es una nube de tres
// lóbulos con dos alitas y una gema azul engastada; caña con anillos y un
// paletón escalonado como una nube. Estilo acetato: línea marrón, color
// plano, UNA sombra dura y un brillo. Se pinta una vez y cada fotograma solo
// se escala en x con cos(ángulo) para que gire sobre su eje.

import { makeCanvas, css } from '../../engine/paint.js';

const GOLD = { hi: '#fff4bf', base: '#f2c14e', shade: '#c98a2e', deep: '#9a6220', line: '#5a3714' };
const GEM = { base: '#33a9e6', shade: '#1d5fa3', hi: '#e9fbff' };

// Silueta de la llave en unidades u (largo total ≈ 100u, centro en 0,0).
function keyShape(u) {
  const p = new Path2D();
  const circ = (x, y, r) => { p.moveTo(x * u + r * u, y * u); p.arc(x * u, y * u, r * u, 0, Math.PI * 2); };
  // Ojo en nube.
  circ(-12, -35, 10); circ(0, -40, 12); circ(12, -35, 10); circ(-18, -26, 8); circ(18, -26, 8);
  p.rect(-19 * u, -30 * u, 38 * u, 12 * u);
  // Alitas: tres plumas escalonadas a cada lado.
  for (const s of [-1, 1]) {
    p.moveTo(s * 20 * u, -33 * u);
    p.quadraticCurveTo(s * 34 * u, -48 * u, s * 44 * u, -46 * u);
    p.quadraticCurveTo(s * 41 * u, -40 * u, s * 42 * u, -38 * u);
    p.quadraticCurveTo(s * 36 * u, -37 * u, s * 38 * u, -31 * u);
    p.quadraticCurveTo(s * 31 * u, -31 * u, s * 32 * u, -25 * u);
    p.quadraticCurveTo(s * 26 * u, -24 * u, s * 20 * u, -21 * u);
    p.closePath();
  }
  // Cuello, caña y anillos.
  p.rect(-7 * u, -19 * u, 14 * u, 5 * u);
  circ(0, -12, 4.2);
  p.rect(-3.2 * u, -12 * u, 6.4 * u, 58 * u);
  p.rect(-5.5 * u, 4 * u, 11 * u, 3.5 * u);
  p.rect(-5 * u, 22 * u, 10 * u, 3 * u);
  circ(0, 47, 4);
  // Paletón escalonado (como una nube vista de lado).
  p.moveTo(2 * u, 27 * u);
  p.lineTo(14 * u, 27 * u); p.lineTo(14 * u, 31 * u); p.lineTo(19 * u, 31 * u); p.lineTo(19 * u, 37 * u);
  p.lineTo(13 * u, 37 * u); p.lineTo(13 * u, 40 * u); p.lineTo(18 * u, 40 * u); p.lineTo(18 * u, 45 * u);
  p.lineTo(2 * u, 45 * u); p.closePath();
  return p;
}

// Pinta la llave en un lienzo. size = largo total en px. Devuelve
// { img, glow, sil, ax, ay } (ancla = centro de la llave en el lienzo).
export function makeKey(size) {
  const u = size / 100;
  const w = Math.ceil(100 * u + 24), h = Math.ceil(112 * u + 24);
  const ax = w / 2, ay = h / 2 + 3 * u;
  const shape = keyShape(u);
  const lw = Math.max(1.5, u * 0.9);
  const at = (g) => { g.setTransform(1, 0, 0, 1, ax, ay); };

  // Capa de color: brillo, base, sombra dura (abajo a la derecha).
  const col = makeCanvas(w, h);
  {
    const g = col.getContext('2d');
    at(g);
    g.fillStyle = GOLD.hi; g.fill(shape);
    g.globalCompositeOperation = 'source-atop';
    g.save(); g.translate(u * 1.6, u * 1.6); g.fillStyle = GOLD.base; g.fill(shape); g.restore();
    // Sombra: todo lo que no queda dentro de la silueta desplazada hacia la luz.
    const sh = makeCanvas(w, h);
    const s = sh.getContext('2d');
    s.fillStyle = GOLD.shade; s.fillRect(0, 0, w, h);
    s.globalCompositeOperation = 'destination-out';
    at(s); s.translate(-u * 3.2, -u * 3.2); s.fill(shape);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(sh, 0, 0);
    at(g);
    // Grabados: espirales de nube en los lóbulos y nervios de las plumas.
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = css(GOLD.deep, 0.8); g.lineWidth = lw * 0.8; g.lineCap = 'round';
    for (const [x, y, r] of [[-12, -37, 5], [12, -37, 5], [0, -43, 6]]) {
      g.beginPath(); g.arc(x * u, y * u, r * u, Math.PI * 0.9, Math.PI * 2.3); g.stroke();
      g.beginPath(); g.arc(x * u + r * u * 0.25, y * u, r * u * 0.5, Math.PI * 1.1, Math.PI * 2.2); g.stroke();
    }
    for (const sd of [-1, 1]) {
      for (const [x0, y0, x1, y1] of [[22, -30, 38, -42], [22, -28, 34, -34], [22, -26, 29, -28]]) {
        g.beginPath(); g.moveTo(sd * x0 * u, y0 * u); g.quadraticCurveTo(sd * (x0 + x1) * 0.5 * u, (y0 + y1) * 0.5 * u - 2 * u, sd * x1 * u, y1 * u); g.stroke();
      }
    }
    // Anillos de la caña (líneas).
    for (const yy of [4, 7.5, 22, 25]) { g.beginPath(); g.moveTo(-5 * u, yy * u); g.lineTo(5 * u, yy * u); g.stroke(); }
    // Engaste y gema azul.
    g.fillStyle = GOLD.deep; g.beginPath(); g.arc(0, -31 * u, 8.3 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = GOLD.hi; g.beginPath(); g.arc(-0.6 * u, -31.6 * u, 7.2 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = GOLD.base; g.beginPath(); g.arc(0, -31 * u, 7.2 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = GEM.shade; g.beginPath(); g.arc(0, -31 * u, 5.8 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = GEM.base; g.beginPath(); g.arc(-1 * u, -32 * u, 4.6 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = GEM.hi; g.beginPath(); g.ellipse(-2.2 * u, -33.8 * u, 1.7 * u, 1.2 * u, -0.6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = css(GOLD.line); g.lineWidth = lw;
    g.beginPath(); g.arc(0, -31 * u, 5.8 * u, 0, Math.PI * 2); g.stroke();
    // Brillos de acetato a lo largo de la caña.
    g.strokeStyle = css('#ffffff', 0.85); g.lineWidth = lw * 1.2;
    g.beginPath(); g.moveTo(-1.6 * u, -8 * u); g.lineTo(-1.6 * u, 18 * u); g.stroke();
    g.beginPath(); g.arc(0, -40 * u, 9 * u, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
  }
  // Silueta (para la línea exterior y los reflejos).
  const sil = makeCanvas(w, h);
  { const g = sil.getContext('2d'); at(g); g.fillStyle = '#fff'; g.fill(shape); }
  // Línea de tinta exterior: silueta dilatada en color tinta bajo el color.
  const img = makeCanvas(w, h);
  {
    const g = img.getContext('2d');
    const ink = makeCanvas(w, h);
    const k = ink.getContext('2d');
    k.drawImage(sil, 0, 0);
    k.globalCompositeOperation = 'source-in';
    k.fillStyle = GOLD.line; k.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.drawImage(ink, Math.cos(a) * lw, Math.sin(a) * lw);
    }
    g.drawImage(col, 0, 0);
  }
  // Versión en sombra (para cuando gira de canto).
  const dark = makeCanvas(w, h);
  {
    const g = dark.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = css(GOLD.deep, 0.85); g.fillRect(0, 0, w, h);
  }
  // Halo: silueta dorada desenfocada para la capa de luz.
  const glow = makeCanvas(w + 120, h + 120);
  {
    const g = glow.getContext('2d');
    g.filter = `blur(${Math.round(6 * u)}px)`;
    const tint = makeCanvas(w, h);
    const k = tint.getContext('2d');
    k.drawImage(sil, 0, 0);
    k.globalCompositeOperation = 'source-in';
    k.fillStyle = '#ffc95a'; k.fillRect(0, 0, w, h);
    g.drawImage(tint, 60, 60);
    g.drawImage(tint, 60, 60);
  }
  return { img, dark, glow, sil, ax, ay, w, h };
}

// Dibuja la llave girando: ang = ángulo de giro sobre su eje vertical;
// k = escala. De canto se oscurece (la cara se aparta de la luz).
export function drawKey(g, key, x, y, ang, k = 1, { alpha = 1 } = {}) {
  const c = Math.cos(ang);
  const sx = Math.sign(c || 1) * Math.max(0.07, Math.abs(c));
  g.save();
  g.translate(x, y);
  g.scale(sx * k, k);
  g.globalAlpha = alpha;
  g.drawImage(key.img, -key.ax, -key.ay);
  const d = (1 - Math.abs(c)) * 0.55;
  if (d > 0.01) { g.globalAlpha = alpha * d; g.drawImage(key.dark, -key.ax, -key.ay); }
  g.restore();
}

// Luz de la llave en la capa emisiva (modo 'lighter').
export function drawKeyGlow(glowG, key, x, y, ang, k = 1, power = 1) {
  const c = Math.cos(ang);
  const sx = Math.max(0.25, Math.abs(c));
  glowG.save();
  glowG.globalCompositeOperation = 'lighter';
  glowG.globalAlpha = power;
  glowG.translate(x, y);
  glowG.scale(sx * k, k);
  glowG.drawImage(key.glow, -key.ax - 60, -key.ay - 60);
  glowG.restore();
}
