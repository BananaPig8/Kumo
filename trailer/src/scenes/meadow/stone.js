// Piedra pintada para el santuario en ruinas: columnas estriadas rotas, un
// arco de dovelas, escalones, estrado, altar y cascotes, todo con musgo y
// lianas. Luz de mañana de arriba a la izquierda: caras de luz cálidas y
// sombras frías y claras (nunca negras).

import { fillBlob, blade, dab, stroke, mix, css, vary, bez } from '../../engine/paint.js';
import { clamp, lerp } from '../../lib/util.js';

export const STONE = {
  hi: '#fbf3e2', lit: '#ead9bb', mid: '#c7b8a1', shade: '#9496a8', deep: '#6b6f86', line: '#585a70',
  moss: '#7fa843', mossLit: '#b0d25e', mossDark: '#4c7a35', vine: '#3f7034', leaf: '#6aa443',
};

// Degradado horizontal de cilindro con la luz a la izquierda.
function cylGrad(g, x0, x1, pal) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, css(mix(pal.lit, pal.mid, 0.4)));
  gr.addColorStop(0.18, css(pal.hi));
  gr.addColorStop(0.42, css(pal.lit));
  gr.addColorStop(0.68, css(pal.mid));
  gr.addColorStop(0.88, css(pal.shade));
  gr.addColorStop(1, css(mix(pal.shade, pal.mid, 0.35)));
  return gr;
}

// Textura de piedra dentro de la forma recortada: toques de tono, poros y grietas.
function weather(g, rng, x0, y0, w, h, pal, k = 1) {
  const n = Math.round(w * h / 160 * k);
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * w, y = y0 + rng() * h;
    const r = rng();
    const c = r < 0.35 ? pal.shade : r < 0.7 ? vary(pal.mid, rng, 0.08) : pal.hi;
    dab(g, x, y, 4 + rng() * 12, 2 + rng() * 4, (rng() - 0.5) * 0.6, c, 0.16 + rng() * 0.14, i, 0.2);
  }
  for (let i = 0; i < n * 0.08; i++) {
    const x = x0 + rng() * w, y = y0 + rng() * h;
    fillBlob(g, x, y, 1 + rng() * 2, 0.8 + rng() * 1.5, pal.deep, 0.35, { n: 7, seed: i });
  }
}
function crack(g, rng, x, y, len, pal) {
  const pts = [[x, y]];
  for (let i = 0; i < 5; i++) { const p = pts[pts.length - 1]; pts.push([p[0] + (rng() - 0.5) * len * 0.35, p[1] + len / 5]); }
  stroke(g, pts, { width: 1.6 + rng(), color: pal.deep, alpha: 0.6, taper: [0.1, 0.7], wobble: 0.3, seed: x });
  stroke(g, pts.map(([a, b]) => [a - 1.5, b + 0.5]), { width: 1, color: pal.hi, alpha: 0.4, taper: [0.1, 0.7], seed: y });
}

// Musgo: manchas blandas con toques claros arriba y oscuros abajo.
export function moss(g, rng, x, y, rx, ry, pal = STONE, k = 1) {
  fillBlob(g, x, y, rx, ry, pal.mossDark, 0.9, { wobble: 0.35, n: 16, seed: x * 0.1 + y, freq: 2 });
  fillBlob(g, x - rx * 0.1, y - ry * 0.2, rx * 0.8, ry * 0.7, pal.moss, 0.95, { wobble: 0.35, n: 14, seed: x * 0.2, freq: 2 });
  for (let i = 0; i < 6 * k; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 0.8;
    dab(g, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d - ry * 0.2, rx * 0.35, ry * 0.3, (rng() - 0.5), rng() < 0.6 ? pal.mossLit : pal.moss, 0.85, i, 0.4);
  }
}
// Musgo que chorrea por una cara vertical.
function mossDrips(g, rng, x0, x1, y, len, pal) {
  const n = Math.round((x1 - x0) / 7);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, rng());
    const l = len * Math.pow(rng(), 1.5);
    stroke(g, [[x, y], [x + (rng() - 0.5) * 3, y + l * 0.5], [x + (rng() - 0.5) * 4, y + l]], { width: 3 + rng() * 5, color: rng() < 0.5 ? pal.moss : pal.mossDark, alpha: 0.75, taper: [0.05, 0.8], wobble: 0.3, seed: i });
  }
}
// Liana que cuelga con hojitas.
export function vine(g, rng, x, y, len, { pal = STONE, sway = 0, leaves = 1 } = {}) {
  const pts = bez([x, y], [x + sway * 0.3 + (rng() - 0.5) * 12, y + len * 0.35], [x + sway * 0.7 + (rng() - 0.5) * 16, y + len * 0.7], [x + sway, y + len], 10);
  stroke(g, pts, { width: 2 + rng() * 1.5, color: pal.vine, taper: [0.05, 0.9], wobble: 0.2, seed: x });
  for (let i = 0; i < pts.length * 1.6 * leaves; i++) {
    const p = pts[Math.floor(rng() * pts.length)];
    const s = 4 + rng() * 5;
    const a = (rng() - 0.5) * 2.4 + Math.PI / 2;
    dab(g, p[0] + Math.cos(a) * s * 0.6, p[1] + Math.sin(a) * s * 0.4, s * 1.4, s * 0.8, a, rng() < 0.55 ? pal.leaf : rng() < 0.5 ? pal.mossLit : pal.mossDark, 0.95, i, 0.5);
  }
}
// Mata de hierba al pie de la piedra.
export function tuft(g, rng, x, y, h, pal = { a: '#4c8c2a', b: '#8fcb45', c: '#c7ea6e' }) {
  const n = 5 + Math.floor(rng() * 6);
  for (let i = 0; i < n; i++) {
    const hh = h * (0.5 + rng() * 0.6);
    blade(g, x + (rng() - 0.5) * h * 0.5, y + rng() * 3, hh, Math.max(1.4, hh * 0.08), (i / n - 0.5) * hh * 0.8 + (rng() - 0.3) * hh * 0.2, rng() < 0.4 ? pal.a : rng() < 0.7 ? pal.b : pal.c, 1, i + x);
  }
}

// Bloque prismático visto de frente con cara superior: front = [x, y, w, h].
export function block(g, rng, x, y, w, h, top, { pal = STONE, joints = 0, mossTop = 0.5, skew = [0.6, 0.25] } = {}) {
  // Cara superior (iluminada) como trapecio.
  const tp = new Path2D();
  tp.moveTo(x, y); tp.lineTo(x + top * skew[0], y - top); tp.lineTo(x + w + top * skew[1], y - top); tp.lineTo(x + w, y); tp.closePath();
  g.fillStyle = css(pal.hi); g.fill(tp);
  g.save(); g.clip(tp); weather(g, rng, x, y - top, w + top, top, pal, 0.6); g.restore();
  const fp = new Path2D();
  fp.rect(x, y, w, h);
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, css(pal.lit)); gr.addColorStop(0.6, css(pal.mid)); gr.addColorStop(1, css(mix(pal.mid, pal.shade, 0.6)));
  g.fillStyle = gr; g.fill(fp);
  g.save(); g.clip(fp);
  weather(g, rng, x, y, w, h, pal);
  // Sombra suave bajo el canto superior y oscurecimiento abajo.
  const sg = g.createLinearGradient(0, y, 0, y + h);
  sg.addColorStop(0, css(pal.shade, 0.0)); sg.addColorStop(0.7, css(pal.shade, 0.15)); sg.addColorStop(1, css(pal.deep, 0.35));
  g.fillStyle = sg; g.fillRect(x, y, w, h);
  for (let i = 1; i < joints; i++) {
    const jx = x + (i / joints) * w + (rng() - 0.5) * w * 0.08;
    stroke(g, [[jx, y], [jx + (rng() - 0.5) * 2, y + h]], { width: 2, color: pal.line, alpha: 0.55, taper: [0.05, 0.1], seed: i });
    stroke(g, [[jx + 2, y], [jx + 2, y + h]], { width: 1.2, color: pal.hi, alpha: 0.45, taper: [0.05, 0.1], seed: i + 1 });
  }
  g.restore();
  g.strokeStyle = css(pal.line, 0.5); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.stroke();
  if (mossTop > 0) for (let i = 0; i < 3 * mossTop; i++) moss(g, rng, x + rng() * w, y - top * 0.3, 8 + rng() * w * 0.08, 4 + rng() * 4, pal, 0.6);
}

// Columna estriada. (x, y) = centro de la base; h = altura total; r = radio.
// broken: 0 = entera con capitel; >0 rotura dentada (inclinación de la rotura).
export function column(g, rng, x, y, h, r, { pal = STONE, broken = 0, lean = 0, mossK = 1, vines = 0, lintel = 0 } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(lean);
  // Basa: dos losas.
  block(g, rng, -r * 1.6, -r * 0.5, r * 3.2, r * 0.5, r * 0.28, { pal, mossTop: 0.6 * mossK });
  block(g, rng, -r * 1.3, -r * 0.85, r * 2.6, r * 0.35, r * 0.22, { pal, mossTop: 0 });
  const y0 = -r * 0.85, y1 = -h + (broken ? 0 : r * 0.9);
  // Fuste con éntasis y rotura dentada.
  const top = [];
  if (broken) {
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      top.push([lerp(r * 0.9, -r * 0.9, f), y1 + (f - 0.5) * broken * r * 2 + (i % 2 ? -1 : 1) * r * (0.1 + rng() * 0.25)]);
    }
  }
  const shaft = new Path2D();
  shaft.moveTo(-r, y0);
  shaft.quadraticCurveTo(-r * 1.04, (y0 + y1) / 2, -r * 0.9, y1);
  if (broken) for (let i = top.length - 1; i >= 0; i--) shaft.lineTo(top[i][0], top[i][1]);
  else shaft.lineTo(r * 0.9, y1);
  shaft.quadraticCurveTo(r * 1.04, (y0 + y1) / 2, r, y0);
  shaft.closePath();
  g.fillStyle = cylGrad(g, -r, r, pal);
  g.fill(shaft);
  g.save();
  g.clip(shaft);
  // Estrías: más juntas hacia los bordes (es un cilindro).
  for (let k = 1; k < 10; k++) {
    const th = -Math.PI / 2 + (k / 10) * Math.PI;
    const fx = Math.sin(th) * r * 0.95;
    const wd = Math.max(1, Math.cos(th) * r * 0.12);
    stroke(g, [[fx, y0], [fx, y1 - r]], { width: wd, color: pal.shade, alpha: 0.35 + 0.25 * (fx / r), taper: [0.02, 0.05], wobble: 0.15, seed: k });
    stroke(g, [[fx - wd * 0.7, y0], [fx - wd * 0.7, y1 - r]], { width: Math.max(0.8, wd * 0.4), color: pal.hi, alpha: 0.35 * (1 - fx / r), taper: [0.02, 0.05], seed: k + 9 });
  }
  // Tambores.
  for (let yy = y0 - r * 1.8; yy > y1; yy -= r * (1.6 + rng() * 0.5)) {
    g.strokeStyle = css(pal.line, 0.5); g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-r, yy); g.quadraticCurveTo(0, yy + r * 0.12, r, yy); g.stroke();
    g.strokeStyle = css(pal.hi, 0.35); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-r, yy + 2); g.quadraticCurveTo(0, yy + r * 0.12 + 2, r * 0.3, yy + 2); g.stroke();
  }
  weather(g, rng, -r, y1 - r, r * 2, y0 - y1 + r, pal);
  // Sombra fría en la mitad derecha y abajo.
  const sg = g.createLinearGradient(0, y1, 0, y0);
  sg.addColorStop(0, css(pal.shade, 0)); sg.addColorStop(1, css(pal.shade, 0.25));
  g.fillStyle = sg; g.fillRect(-r, y1 - r, r * 2, y0 - y1 + r);
  for (let i = 0; i < 3; i++) crack(g, rng, (rng() - 0.5) * r * 1.4, lerp(y1, y0, rng() * 0.7), r * (1 + rng() * 2), pal);
  g.restore();
  if (broken) {
    // Cara de la rotura (clara) y musgo encima.
    const face = new Path2D();
    face.moveTo(top[0][0], top[0][1]);
    for (const p of top) face.lineTo(p[0], p[1]);
    for (let i = top.length - 1; i >= 0; i--) face.lineTo(top[i][0] + r * 0.05, top[i][1] - r * 0.22 + (i % 3) * 2);
    face.closePath();
    g.fillStyle = css(pal.hi); g.fill(face);
    for (let i = 0; i < 3; i++) moss(g, rng, lerp(-r * 0.7, r * 0.7, rng()), y1 + (rng() - 0.6) * r * 0.5 * broken, r * (0.3 + rng() * 0.3), r * 0.18, pal, mossK);
    mossDrips(g, rng, -r * 0.8, r * 0.6, y1, r * 1.6 * mossK, pal);
  } else {
    // Capitel: equino redondeado y ábaco.
    const ey = y1;
    const ech = new Path2D();
    ech.moveTo(-r * 0.92, ey + 2);
    ech.quadraticCurveTo(-r * 1.4, ey - r * 0.1, -r * 1.35, ey - r * 0.45);
    ech.lineTo(r * 1.35, ey - r * 0.45);
    ech.quadraticCurveTo(r * 1.4, ey - r * 0.1, r * 0.92, ey + 2);
    ech.closePath();
    g.fillStyle = cylGrad(g, -r * 1.4, r * 1.4, pal); g.fill(ech);
    block(g, rng, -r * 1.55, ey - r * 0.85, r * 3.1, r * 0.4, r * 0.25, { pal, mossTop: mossK });
    if (lintel) {
      // Trozo de arquitrabe roto encima, hacia un lado.
      const lw = r * 4.2, lx = lintel > 0 ? -r * 1.4 : -lw + r * 1.4;
      block(g, rng, lx, ey - r * 2.1, lw, r * 1.2, r * 0.35, { pal, joints: 2, mossTop: 1.5 * mossK });
      mossDrips(g, rng, lx, lx + lw, ey - r * 0.9, r * 1.2, pal);
    }
    mossDrips(g, rng, -r * 1.3, r * 1.3, ey - r * 0.45, r * 1.4 * mossK, pal);
  }
  // Musgo y matas en la basa.
  mossDrips(g, rng, -r, r, y0 - r * 0.3, r * 0.6, pal);
  for (let i = 0; i < vines; i++) vine(g, rng, lerp(-r * 0.8, r * 0.8, rng()), y1 + r * 0.2, (y0 - y1) * (0.35 + rng() * 0.45), { pal, sway: (rng() - 0.5) * 16 });
  for (let i = 0; i < 4; i++) tuft(g, rng, lerp(-r * 1.7, r * 1.7, rng()), 2, r * (0.5 + rng() * 0.6));
  g.restore();
}

// Arco de dovelas sobre dos pilares. (cx, y) = centro de la línea de
// arranque; R = radio interior; th = grosor; pierH = altura de los pilares
// (bajan desde y). gap = [a0, a1] ángulos (0 = derecha, PI = izquierda) sin dovelas.
export function arch(g, rng, cx, y, R, th, pierH, { pal = STONE, gap = null, n = 15, vines = 4 } = {}) {
  const L = [-0.5, -0.85];
  // Pilares con hiladas.
  for (const s of [-1, 1]) {
    const px = cx + s * (R + th / 2) - th * 0.55;
    const pw = th * 1.1;
    const fp = new Path2D(); fp.rect(px, y, pw, pierH);
    const gr = g.createLinearGradient(px, 0, px + pw, 0);
    gr.addColorStop(0, css(s < 0 ? pal.hi : pal.lit)); gr.addColorStop(0.35, css(pal.lit)); gr.addColorStop(1, css(s < 0 ? pal.mid : mix(pal.mid, pal.shade, 0.5)));
    g.fillStyle = gr; g.fill(fp);
    g.save(); g.clip(fp);
    weather(g, rng, px, y, pw, pierH, pal);
    for (let yy = y + th * 0.6, k = 0; yy < y + pierH; yy += th * 0.6, k++) {
      g.strokeStyle = css(pal.line, 0.5); g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(px, yy); g.lineTo(px + pw, yy); g.stroke();
      const jx = px + pw * (k % 2 ? 0.35 : 0.65);
      g.beginPath(); g.moveTo(jx, yy); g.lineTo(jx, yy + th * 0.6); g.stroke();
    }
    const sg = g.createLinearGradient(0, y, 0, y + pierH);
    sg.addColorStop(0, css(pal.shade, 0)); sg.addColorStop(1, css(pal.deep, 0.3));
    g.fillStyle = sg; g.fillRect(px, y, pw, pierH);
    g.restore();
    // Imposta: losa saliente bajo el arranque.
    block(g, rng, px - th * 0.12, y - th * 0.02, pw + th * 0.24, th * 0.22, th * 0.12, { pal, mossTop: 0.5 });
    mossDrips(g, rng, px, px + pw, y + th * 0.2, pierH * 0.25, pal);
  }
  // Intradós: banda en sombra que se ve bajo las dovelas.
  const ring = (a0, a1, r0, r1) => {
    const p = new Path2D();
    p.arc(cx, y, r1, -a0, -a1, false);
    p.arc(cx, y, r0, -a1, -a0, true);
    p.closePath();
    return p;
  };
  const skip = (a) => gap && a > gap[0] && a < gap[1];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - (i / n) * Math.PI, a1 = Math.PI - ((i + 1) / n) * Math.PI;
    const am = (a0 + a1) / 2;
    if (skip(am)) continue;
    const key = i === Math.floor(n / 2);
    const ex = key ? th * 0.18 : 0;
    const v = ring(a0 - 0.004, a1 + 0.004, R, R + th + ex);
    // Iluminación según la orientación de la cara exterior.
    const nx = Math.cos(am), ny = -Math.sin(am);
    const lit = clamp((nx * L[0] + ny * L[1]) * 0.6 + 0.45);
    const base = mix(mix(pal.shade, pal.mid, 0.5), pal.hi, lit);
    g.fillStyle = css(vary(base, rng, 0.04)); g.fill(v);
    g.save(); g.clip(v);
    const bx = cx + Math.cos(am) * (R + th / 2), by = y - Math.sin(am) * (R + th / 2);
    weather(g, rng, bx - th, by - th, th * 2, th * 2, pal, 0.8);
    // Intradós en sombra.
    g.fillStyle = css(pal.shade, 0.55); g.fill(ring(a0, a1, R - 1, R + th * 0.2));
    g.restore();
    g.strokeStyle = css(pal.line, 0.6); g.lineWidth = 2; g.stroke(v);
  }
  // Extradós: musgo y hierba encima de las dovelas que quedan.
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * (0.08 + rng() * 0.84);
    if (skip(a)) continue;
    const mx = cx + Math.cos(a) * (R + th * 0.95), my = y - Math.sin(a) * (R + th * 0.95);
    moss(g, rng, mx, my, 10 + rng() * 12, 5 + rng() * 4, pal, 0.8);
    if (rng() < 0.5) tuft(g, rng, mx, my, 10 + rng() * 10);
  }
  for (let i = 0; i < vines; i++) {
    let a = Math.PI * (0.15 + rng() * 0.7);
    if (skip(a)) a = Math.PI * 0.7;
    const vx = cx + Math.cos(a) * (R + th * 0.4), vy = y - Math.sin(a) * (R + th * 0.4);
    vine(g, rng, vx, vy, 60 + rng() * 120, { pal, sway: (rng() - 0.5) * 20 });
  }
}

// Escalinata de frente: n peldaños desde (cx, y) (pie del primero) hacia
// arriba; w0 ancho abajo, w1 arriba; rise = contrahuella; tread = huella vista.
export function steps(g, rng, cx, y, n, w0, w1, rise, tread, { pal = STONE } = {}) {
  for (let i = n - 1; i >= 0; i--) {
    const w = lerp(w0, w1, i / Math.max(1, n - 1));
    const yt = y - (i + 1) * rise;
    const x = cx - w / 2 + (rng() - 0.5) * 6;
    // Huella (clara), contrahuella (sombra suave).
    const tp = new Path2D();
    tp.moveTo(x + 3, yt); tp.lineTo(x + 8, yt - tread); tp.lineTo(x + w - 8, yt - tread); tp.lineTo(x + w - 3, yt); tp.closePath();
    g.fillStyle = css(vary(pal.hi, rng, 0.03)); g.fill(tp);
    g.save(); g.clip(tp); weather(g, rng, x, yt - tread, w, tread, pal, 0.5); g.restore();
    const fp = new Path2D();
    // Canto algo roto.
    fp.moveTo(x, yt); fp.lineTo(x + w, yt);
    fp.lineTo(x + w + (rng() - 0.5) * 4, yt + rise); fp.lineTo(x + (rng() - 0.5) * 4, yt + rise); fp.closePath();
    const gr = g.createLinearGradient(0, yt, 0, yt + rise);
    gr.addColorStop(0, css(pal.mid)); gr.addColorStop(1, css(mix(pal.mid, pal.shade, 0.7)));
    g.fillStyle = gr; g.fill(fp);
    g.save(); g.clip(fp);
    weather(g, rng, x, yt, w, rise, pal, 0.8);
    for (let k = 1; k < 4; k++) {
      const jx = x + (k / 4 + (rng() - 0.5) * 0.08) * w;
      g.strokeStyle = css(pal.line, 0.5); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(jx, yt); g.lineTo(jx, yt + rise); g.stroke();
    }
    g.restore();
    // Musgo y hierba en las juntas y los lados.
    for (let k = 0; k < 2; k++) moss(g, rng, x + (k ? w - 6 : 6) + (rng() - 0.5) * 10, yt - tread * 0.3, 10 + rng() * 10, 4 + rng() * 3, pal, 0.6);
    if (rng() < 0.7) moss(g, rng, x + rng() * w, yt - 1, 8 + rng() * 14, 3, pal, 0.5);
    if (rng() < 0.6) tuft(g, rng, x + rng() * w, yt, 8 + rng() * 8);
  }
}

// Columna caída tumbada (tambor visto de lado con la cara circular delante).
export function drum(g, rng, x, y, len, r, { pal = STONE, dir = 1 } = {}) {
  const body = new Path2D();
  body.moveTo(x, y - r); body.lineTo(x + dir * len, y - r * 0.92); body.lineTo(x + dir * len, y + r * 0.92); body.lineTo(x, y + r); body.closePath();
  const gr = g.createLinearGradient(0, y - r, 0, y + r);
  gr.addColorStop(0, css(pal.hi)); gr.addColorStop(0.35, css(pal.lit)); gr.addColorStop(0.75, css(pal.mid)); gr.addColorStop(1, css(pal.shade));
  g.fillStyle = gr; g.fill(body);
  g.save(); g.clip(body);
  for (let k = 1; k < 7; k++) {
    const fy = y - r + (k / 7) * r * 2;
    stroke(g, [[x, fy], [x + dir * len, fy]], { width: 2, color: pal.shade, alpha: 0.35, taper: [0.02, 0.05], seed: k });
  }
  weather(g, rng, Math.min(x, x + dir * len), y - r, len, r * 2, pal);
  g.restore();
  // Cara circular (la sección).
  fillBlob(g, x, y, r * 0.42, r, mix(pal.lit, pal.mid, 0.3), 1, { wobble: 0.05, n: 20, seed: x });
  fillBlob(g, x - dir * 2, y - 2, r * 0.32, r * 0.85, pal.hi, 0.6, { wobble: 0.08, n: 18, seed: y });
  moss(g, rng, x + dir * len * 0.5, y - r * 0.9, len * 0.3, r * 0.25, pal);
  for (let i = 0; i < 3; i++) tuft(g, rng, x + dir * len * rng(), y + r, r * (0.6 + rng() * 0.6));
}
