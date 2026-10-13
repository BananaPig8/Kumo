// Pinceles del pueblo gris: casas vistas desde lo alto de la colina (el
// tejado manda), postes de teléfono con cables combados y el faro del cabo.
// Todo mojado: tejados que reflejan el cielo, paredes con churretes, ventanas
// cálidas que se pintan también en un lienzo de luz aparte.

import { fillBlob, dab, stroke, mix, css, vary, glow } from '../../engine/paint.js';
import { lerp } from '../../lib/util.js';

export const WALLS = ['#cfc5b2', '#bdb8aa', '#d6c6a6', '#aeb4b0', '#c4ad97', '#d9d0bf', '#b3a596'];
export const ROOFS = ['#56606c', '#6c4e47', '#4d6767', '#7a5b4a', '#535d6b', '#6d6a72', '#5e4a4c'];
const WIN_LIT = '#ffc46e';
const WIN_DARK = '#3d4752';

// Casa con la fachada hacia cámara. (x, y) = centro de la base de la fachada;
// w = ancho de fachada. side: -1/1 enseña la pared lateral a ese lado.
// sky: color que reflejan los tejados mojados. light: lienzo emisivo (ctx)
// donde se pintan las ventanas encendidas. lit: probabilidad de ventana encendida.
export function paintHouse(g, rng, x, y, w, { floors = 2, side = 0, roof = null, wall = null, sky = '#9aa3aa', light = null, lit = 0.35, haze = 0, hazeColor = '#8c959d', chimney = 0.6 } = {}) {
  const fh = w * (0.3 + rng() * 0.06);
  const H = fh * floors;
  const rh = w * (0.42 + rng() * 0.12);
  const sd = side ? w * (0.3 + rng() * 0.12) : 0;
  const rise = sd * 0.35;
  // Al anochecer y con lluvia las fachadas se apagan hacia el gris azulado.
  const wallC = mix(wall || WALLS[Math.floor(rng() * WALLS.length)], '#69727e', 0.3);
  const roofC = roof || ROOFS[Math.floor(rng() * ROOFS.length)];
  const hz = (c) => (haze > 0 ? mix(c, hazeColor, haze) : c);
  const x0 = x - w / 2, x1 = x + w / 2, top = y - H;
  // Esta casa tapa la luz de las ventanas de detrás.
  if (light) {
    light.save();
    light.globalCompositeOperation = 'destination-out';
    light.fillStyle = '#000';
    light.fillRect(Math.min(x0, x0 - (side < 0 ? sd : 0)) - w * 0.08, top - rh - rise, w + sd + w * 0.16, H + rh + rise);
    light.restore();
  }
  // Pared lateral (en sombra) y hastial.
  if (side) {
    const sx = side > 0 ? x1 : x0;
    const p = new Path2D();
    p.moveTo(sx, y); p.lineTo(sx + side * sd, y - rise); p.lineTo(sx + side * sd, top - rise); p.lineTo(sx, top); p.closePath();
    g.fillStyle = css(hz(mix(wallC, '#4a5260', 0.4))); g.fill(p);
    // Ventana lateral.
    if (rng() < 0.6) {
      const wx = sx + side * sd * 0.5, wy = top + fh * 0.35 - rise * 0.5;
      win(g, rng, wx - sd * 0.14, wy, sd * 0.28, fh * 0.34, hz, light, lit * 0.7, 0.85);
    }
  }
  // Fachada con churretes de lluvia.
  g.fillStyle = css(hz(wallC)); g.fillRect(x0, top, w, H);
  const sh = g.createLinearGradient(0, top, 0, y);
  sh.addColorStop(0, css('#3a4250', 0.32)); sh.addColorStop(0.25, css('#3a4250', 0.06)); sh.addColorStop(1, css('#3a4250', 0.2));
  g.fillStyle = sh; g.fillRect(x0, top, w, H);
  for (let i = 0; i < w / 6; i++) {
    const sx = x0 + rng() * w, sy = top + rng() * H * 0.3;
    stroke(g, [[sx, sy], [sx + (rng() - 0.5) * 2, sy + H * (0.2 + rng() * 0.5)]], { width: Math.max(0.8, w * 0.012), color: hz(mix(wallC, '#59606a', 0.35)), alpha: 0.3, taper: [0.1, 0.8], seed: i });
  }
  // Ventanas por piso y puerta.
  const nw = Math.max(1, Math.round(w / (fh * 0.95)));
  for (let f = 0; f < floors; f++) {
    const wy = top + f * fh + fh * 0.28;
    for (let i = 0; i < nw; i++) {
      const cx = x0 + (i + 0.5) * (w / nw);
      if (f === floors - 1 && i === Math.floor(nw / 2) && rng() < 0.7) {
        // Puerta con su farolito.
        const dw = Math.min(w / nw * 0.42, fh * 0.42);
        g.fillStyle = css(hz(mix(roofC, '#2b2f38', 0.4))); g.fillRect(cx - dw / 2, y - fh * 0.66, dw, fh * 0.66);
        if (light && rng() < 0.6) { glow(light, cx + dw * 0.8, y - fh * 0.72, fh * 0.5, '#ffb35c', 0.2); g.fillStyle = css('#ffe0a0'); g.fillRect(cx + dw * 0.7, y - fh * 0.76, Math.max(1.5, dw * 0.18), Math.max(1.5, dw * 0.22)); }
        continue;
      }
      const ww = Math.min(w / nw * 0.46, fh * 0.42), wh = fh * 0.46;
      win(g, rng, cx - ww / 2, wy, ww, wh, hz, light, lit, 1);
    }
  }
  // Tejado: faldón que vemos desde arriba, con alero, tejas en hileras y el
  // reflejo frío del cielo (mojado).
  const ov = w * 0.07;
  const ry0 = top + w * 0.02, ry1 = top - rh;
  // Esquinas del faldón: alero (cerca, lejos) y caballete (cerca, lejos).
  let e0, e1, r0, r1;
  if (side) {
    const far = side > 0 ? x1 + sd + ov : x0 - sd - ov;
    const near = side > 0 ? x0 - ov : x1 + ov;
    e0 = [near, ry0]; e1 = [far, ry0 - rise]; r0 = [near + side * ov * 0.5, ry1]; r1 = [far - side * ov * 0.5, ry1 - rise];
  } else {
    e0 = [x0 - ov, ry0]; e1 = [x1 + ov, ry0]; r0 = [x0 + ov * 0.4, ry1]; r1 = [x1 - ov * 0.4, ry1];
  }
  const rp = new Path2D();
  rp.moveTo(...e0); rp.lineTo(...e1); rp.lineTo(...r1); rp.lineTo(...r0); rp.closePath();
  g.save();
  g.clip(rp);
  const bx0 = Math.min(e0[0], e1[0]) - ov, bw = Math.abs(e1[0] - e0[0]) + ov * 2;
  const rg = g.createLinearGradient(0, ry1 - rise, 0, ry0);
  rg.addColorStop(0, css(hz(mix(roofC, sky, 0.45)))); rg.addColorStop(0.45, css(hz(roofC))); rg.addColorStop(1, css(hz(mix(roofC, '#262b33', 0.35))));
  g.fillStyle = rg; g.fillRect(bx0, ry1 - rise - 4, bw, rh + rise + 8);
  // Hileras de tejas, paralelas al alero.
  const rows = Math.max(3, Math.round(rh / Math.max(3, w * 0.07)));
  g.strokeStyle = css(hz(mix(roofC, '#20242c', 0.45)), 0.5);
  g.lineWidth = Math.max(0.7, w * 0.008);
  for (let r = 1; r < rows; r++) {
    const k = r / rows;
    g.beginPath(); g.moveTo(lerp(r0[0], e0[0], k), lerp(r0[1], e0[1], k)); g.lineTo(lerp(r1[0], e1[0], k), lerp(r1[1], e1[1], k)); g.stroke();
  }
  // Brillos de agua: rayas claras a lo largo de las hileras.
  const ang = Math.atan2(e1[1] - e0[1], e1[0] - e0[0]);
  for (let i = 0; i < 3 + w / 30; i++) {
    const k = rng(), u = 0.1 + rng() * 0.8;
    const sx = lerp(lerp(r0[0], e0[0], k), lerp(r1[0], e1[0], k), u), sy = lerp(lerp(r0[1], e0[1], k), lerp(r1[1], e1[1], k), u);
    dab(g, sx, sy, w * (0.08 + rng() * 0.15), Math.max(1, w * 0.015), ang, hz(mix(sky, '#ffffff', 0.25)), 0.35, i, 0.05);
  }
  g.restore();
  // Canto del alero (oscuro) y caballete (claro, refleja el cielo).
  g.lineCap = 'round';
  g.strokeStyle = css(hz(mix(roofC, '#1e2229', 0.5))); g.lineWidth = Math.max(1, w * 0.02);
  g.beginPath(); g.moveTo(...e0); g.lineTo(...e1); g.stroke();
  g.strokeStyle = css(hz(mix(sky, '#ffffff', 0.2)), 0.6); g.lineWidth = Math.max(1, w * 0.012);
  g.beginPath(); g.moveTo(...r0); g.lineTo(...r1); g.stroke();
  // Chimenea.
  if (rng() < chimney) {
    const cx = lerp(x0 + w * 0.2, x1 - w * 0.2, rng()), cw = w * 0.1, ch = rh * (0.5 + rng() * 0.3);
    const cy = lerp(ry0, ry1, 0.65);
    g.fillStyle = css(hz(mix(wallC, '#5b5560', 0.35))); g.fillRect(cx - cw / 2, cy - ch, cw, ch);
    g.fillStyle = css(hz(mix(wallC, '#3d4048', 0.5))); g.fillRect(cx, cy - ch, cw / 2, ch);
    g.fillStyle = css(hz('#3a3e46')); g.fillRect(cx - cw * 0.65, cy - ch - cw * 0.25, cw * 1.3, cw * 0.3);
  }
  // Antena de televisión en algunos tejados.
  if (rng() < 0.3) {
    const ax = lerp(r0[0], r1[0], 0.3 + rng() * 0.4), ay = lerp(r0[1], r1[1], 0.5);
    const ah = w * (0.35 + rng() * 0.2);
    g.strokeStyle = css(hz('#3a3f47')); g.lineWidth = Math.max(0.8, w * 0.01);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - ah);
    for (let k = 0; k < 3; k++) { const yy = ay - ah * (0.6 + k * 0.15), l = w * (0.16 - k * 0.04); g.moveTo(ax - l, yy); g.lineTo(ax + l, yy); }
    g.stroke();
  }
  return { top: ry1 - rise, left: x0 - (side < 0 ? sd : 0) - ov, right: x1 + (side > 0 ? sd : 0) + ov };
}

function win(g, rng, x, y, w, h, hz, light, lit, k) {
  const on = rng() < lit;
  g.fillStyle = css(hz('#4c4f58')); g.fillRect(x - w * 0.1, y - h * 0.08, w * 1.2, h * 1.16);
  if (on) {
    const c = rng() < 0.3 ? '#ffd690' : WIN_LIT;
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, css(mix(c, '#ffffff', 0.25))); gr.addColorStop(1, css(mix(c, '#e08a3a', 0.3)));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    // Cortina o silueta en algunas.
    if (rng() < 0.35) { g.fillStyle = css('#c77c3c', 0.55); g.fillRect(x, y, w * 0.35, h); }
    if (light) { glow(light, x + w / 2, y + h / 2, Math.max(w, h) * 1.3, c, 0.14 * k); light.fillStyle = css(c, 0.3 * k); light.fillRect(x, y, w, h); }
  } else {
    g.fillStyle = css(hz(WIN_DARK)); g.fillRect(x, y, w, h);
    g.fillStyle = css(hz('#9aa6b2'), 0.35); g.fillRect(x, y, w, h * 0.3);
  }
  // Cruceta.
  g.fillStyle = css(hz('#5d6068'), 0.9);
  g.fillRect(x + w / 2 - Math.max(0.5, w * 0.05), y, Math.max(1, w * 0.1), h);
  g.fillRect(x, y + h * 0.45, w, Math.max(1, h * 0.07));
}

// Árbol de pueblo mojado: copa oscura y redonda con algún brillo.
export function paintTownTree(g, rng, x, y, r, { haze = 0, hazeColor = '#8c959d' } = {}) {
  const hz = (c) => (haze > 0 ? mix(c, hazeColor, haze) : c);
  stroke(g, [[x, y], [x + (rng() - 0.5) * r * 0.2, y - r * 0.8]], { width: r * 0.16, color: hz('#3b3632'), taper: [0, 0.8] });
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, d = rng() * r * 0.45;
    fillBlob(g, x + Math.cos(a) * d, y - r * 1.1 + Math.sin(a) * d * 0.7, r * (0.4 + rng() * 0.25), r * (0.35 + rng() * 0.2), hz(vary('#3f5248', rng, 0.08)), 1, { wobble: 0.25, seed: i + x });
  }
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2, d = r * (0.3 + rng() * 0.35);
    dab(g, x + Math.cos(a) * d, y - r * 1.15 + Math.sin(a) * d * 0.7, r * 0.3, r * 0.14, rng(), hz('#6f8378'), 0.6, i);
  }
}

// Poste de teléfono de madera con travesaño y aisladores. (x, y) = pie.
const line = (a, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
export function paintPole(g, x, y, h, { w = 14, color = '#2e2a2a' } = {}) {
  stroke(g, line([x, y], [x + w * 0.1, y - h]), { width: w, color, taper: [0.001, 0.01], wobble: 0.05 });
  stroke(g, line([x - w * 0.25, y], [x - w * 0.15, y - h]), { width: w * 0.25, color: '#5a5654', alpha: 0.5, taper: [0.001, 0.01] });
  const ty = y - h * 0.94;
  stroke(g, line([x - w * 4.2, ty], [x + w * 4.4, ty - w * 0.15]), { width: w * 0.55, color, taper: [0.01, 0.01] });
  const ins = [];
  for (const k of [-3.6, -1.5, 1.6, 3.8]) {
    const ix = x + w * k, iy = ty - w * 0.5;
    g.fillStyle = css('#56606a'); g.fillRect(ix - w * 0.18, iy - w * 0.25, w * 0.36, w * 0.6);
    ins.push([ix, iy - w * 0.2]);
  }
  return ins;
}

// Cable combado entre dos puntos (catenaria aproximada) con gotitas.
export function wirePath(a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40;
    pts.push([lerp(a[0], b[0], s), lerp(a[1], b[1], s) + sag * 4 * s * (1 - s)]);
  }
  return pts;
}

// El faro: torre blanca con franja roja, galería y linterna. (x, y) = base.
export function paintLighthouse(g, x, y, h, { haze = 0, hazeColor = '#8c959d' } = {}) {
  const hz = (c) => (haze > 0 ? mix(c, hazeColor, haze) : c);
  const wb = h * 0.2, wt = h * 0.13;
  const tower = new Path2D();
  tower.moveTo(x - wb / 2, y); tower.lineTo(x - wt / 2, y - h); tower.lineTo(x + wt / 2, y - h); tower.lineTo(x + wb / 2, y); tower.closePath();
  g.fillStyle = css(hz('#e6e3dc')); g.fill(tower);
  g.save(); g.clip(tower);
  g.fillStyle = css(hz('#a8423c')); g.fillRect(x - wb, y - h * 0.62, wb * 2, h * 0.16);
  const sg = g.createLinearGradient(x - wb / 2, 0, x + wb / 2, 0);
  sg.addColorStop(0, 'rgba(60,66,80,0)'); sg.addColorStop(0.55, 'rgba(60,66,80,0.05)'); sg.addColorStop(1, 'rgba(60,66,80,0.45)');
  g.fillStyle = sg; g.fillRect(x - wb, y - h, wb * 2, h);
  g.restore();
  // Galería, linterna y cúpula.
  g.fillStyle = css(hz('#3b3f48')); g.fillRect(x - wt * 0.8, y - h - h * 0.02, wt * 1.6, h * 0.035);
  g.fillStyle = css('#fff1c0'); g.fillRect(x - wt * 0.38, y - h - h * 0.12, wt * 0.76, h * 0.1);
  g.fillStyle = css(hz('#a8423c'));
  g.beginPath(); g.moveTo(x - wt * 0.5, y - h - h * 0.12); g.quadraticCurveTo(x, y - h - h * 0.24, x + wt * 0.5, y - h - h * 0.12); g.closePath(); g.fill();
  return [x, y - h - h * 0.07];
}
