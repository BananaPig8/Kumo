// Bandadas de pájaros pequeños: una «m» de dos trazos que aletea. Color de
// cielo apagado (nunca negro); los lejanos, más claros y quietos.

import { css, mix } from '../../engine/paint.js';

export function makeFlock(rng, n, { spread = [260, 90], size = [9, 15] } = {}) {
  const birds = [];
  for (let i = 0; i < n; i++) {
    birds.push({
      dx: (rng() - 0.5) * spread[0], dy: (rng() - 0.5) * spread[1],
      s: size[0] + rng() * (size[1] - size[0]), ph: rng() * Math.PI * 2, f: 7 + rng() * 3,
      glide: rng() < 0.35, bob: rng() * Math.PI * 2,
    });
  }
  return birds;
}

// Dibuja la bandada con su centro en (x, y). dir = 1 vuela hacia la derecha.
export function drawFlock(g, birds, x, y, t, { color = '#3e5568', haze = '#a3d8e5', far = 0, dir = 1, alpha = 1 } = {}) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const b of birds) {
    // Algunos planean un rato y vuelven a batir.
    const flapK = b.glide ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.9 + b.ph)) : 1;
    const w = Math.sin(t * b.f + b.ph) * flapK;
    const bx = x + b.dx + Math.sin(t * 0.7 + b.bob) * 6, by = y + b.dy + Math.sin(t * 1.3 + b.bob) * 4 - w * b.s * 0.12;
    const s = b.s;
    const tipY = by - w * s * 0.55;
    const midY = by - Math.abs(w) * s * 0.1 - s * 0.12;
    g.strokeStyle = css(mix(color, haze, far), alpha);
    g.lineWidth = Math.max(1, s * 0.16);
    g.beginPath();
    g.moveTo(bx - s, tipY);
    g.quadraticCurveTo(bx - s * 0.45, midY - s * 0.2 * (1 - Math.abs(w)), bx, by);
    g.quadraticCurveTo(bx + s * 0.45, midY - s * 0.2 * (1 - Math.abs(w)), bx + s, tipY);
    g.stroke();
    // Cuerpo: un toque corto en la dirección de vuelo.
    g.lineWidth = Math.max(1.2, s * 0.22);
    g.beginPath(); g.moveTo(bx - dir * s * 0.12, by + 0.5); g.lineTo(bx + dir * s * 0.22, by - 0.5); g.stroke();
  }
  g.restore();
}
