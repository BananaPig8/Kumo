// Piezas comunes de los planos de vuelo: cielo de día con torres de cúmulo,
// mar de nubes, islas sueltas (sprites) y nubecillas que pasan rozando.
// Todo se pinta una vez al construir el mundo.

import { mulberry32, paintSky, cumulusMass, drawMass, cloudSeaBillows, painterly, paintStreaks, makeCanvas, css, SKY_DAY, CLOUD_DAY } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { paintIsle } from '../meadow/brushes.js';

export const L = [-0.5, -0.85, 0.3];
export const P = PAL.day;
export const HORIZON = 470;

export function buildKit() {
  const rng = mulberry32(7101);
  // Cielo ancho (para barridos de cámara) con torres de cúmulo en el horizonte.
  const SKX = -500, SKY = -120;
  const sky = makeCanvas(2900, 900);
  {
    const g = sky.getContext('2d');
    paintSky(g, 2900, 900, { ...SKY_DAY, horizonY: (HORIZON - SKY) / 900, seed: 41, streaks: 0.35 });
    paintStreaks(g, mulberry32(42), 600, 80, 1100, 0.2, { n: 2, alpha: 0.4, width: 3 });
    painterly(sky, { seed: 43, size: 18, alpha: 0.25, stretch: 3, soften: 1.5, angle: () => 0.1 });
    const cl = (w, h, o, x) => drawMass(g, cumulusMass(rng, w, h, { light: L, pal: CLOUD_DAY, ...o }), x - SKX, HORIZON + 10 - SKY);
    cl(900, 520, { tower: 1.5, seed: 1 }, -200);
    cl(560, 240, { tower: 0.6, seed: 2, haze: 0.25, hazeColor: P.haze }, 420);
    cl(1000, 560, { tower: 1.6, seed: 3 }, 1100);
    cl(620, 280, { tower: 0.7, seed: 4, haze: 0.2, hazeColor: P.haze }, 1750);
    cl(860, 460, { tower: 1.3, seed: 5 }, 2250);
    const hz = g.createLinearGradient(0, HORIZON - 70 - SKY, 0, HORIZON + 10 - SKY);
    hz.addColorStop(0, css(SKY_DAY.bottom, 0)); hz.addColorStop(1, css(SKY_DAY.bottom, 0.85));
    g.fillStyle = hz; g.fillRect(0, HORIZON - 70 - SKY, 2900, 900);
  }
  const SEH = 420;
  const sea = cloudSeaBillows(rng, 2900, SEH, { pal: CLOUD_DAY, light: L, haze: P.haze, sky: SKY_DAY.bottom, horizon: 0.2, rows: 10, seed: 21, nearScale: 0.5 });
  const SEX = -500, SEY = HORIZON - SEH * 0.2;
  // Islas sueltas de distintos tamaños (las grandes con prado de detalle).
  const isles = [
    paintIsle(rng, 260, 200, { trees: [{ x: -0.5, dy: 0.1, h: 90 }, { x: 0.2, dy: -0.2, h: 120 }, { x: 0.65, dy: 0.25, h: 70 }], seed: 31, light: L, roots: 4, meadow: 0.7, wobble: 0.03 }),
    paintIsle(rng, 200, 170, { trees: [{ x: -0.2, dy: -0.1, h: 96 }, { x: 0.45, dy: 0.2, h: 60 }], seed: 32, light: L, meadow: 0.6, wobble: 0.03 }),
    paintIsle(rng, 340, 260, { trees: [{ x: -0.6, dy: 0.15, h: 80 }, { x: -0.1, dy: -0.15, h: 150 }, { x: 0.5, dy: 0.1, h: 110 }], seed: 33, light: L, roots: 6, meadow: 0.8, wobble: 0.03, facets: 12, fine: 0.6 }),
    paintIsle(rng, 140, 120, { trees: [{ x: 0, dy: 0, h: 70 }], seed: 34, light: L, meadow: 0.5 }),
  ];
  // Nubecillas que pasan rozando (sin base plana).
  const puffs = [];
  for (let i = 0; i < 5; i++) puffs.push(fadeEdges(cumulusMass(rng, 420 + rng() * 300, 200 + rng() * 120, { light: L, pal: CLOUD_DAY, tower: 0.45, seed: 50 + i, flat: false })));
  return { sky, SKX, SKY, sea, SEX, SEY, isles, puffs };
}

// Garantiza bordes transparentes en un sprite (el pincel puede dejar restos
// semitransparentes junto al marco, que se verían como un rectángulo).
function fadeEdges(c) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height, m = Math.min(w, h) * 0.08;
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(m / w, 'rgba(0,0,0,1)'); gx.addColorStop(1 - m / w, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(m / h, 'rgba(0,0,0,1)'); gy.addColorStop(1 - m / h, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h);
  g.restore();
  return c;
}
