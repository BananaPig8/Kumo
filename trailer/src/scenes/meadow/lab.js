// Laboratorio del mundo «meadow» (solo desarrollo): piezas sueltas ampliadas.
import { mulberry32, paintSky, SKY_DAY, drawMass } from '../../engine/paint.js';
import { paintIsle } from './brushes.js';

export async function build() {
  const rng = mulberry32(5);
  const a = paintIsle(rng, 260, 190, { trees: [{ x: -0.7, dy: 0.25, h: 50 }, { x: 0.05, dy: -0.1, h: 300, big: true }, { x: 0.7, dy: 0.2, h: 56 }], haze: 0.16, seed: 6, roots: 9 });
  const b = paintIsle(rng, 150, 120, { trees: [{ x: -0.35, dy: -0.2, h: 66 }, { x: 0.3, dy: 0.3, h: 50 }], haze: 0.0, seed: 5 });
  return {
    draw({ g, W, H }) {
      paintSky(g, W, H, { ...SKY_DAY, horizonY: 0.9, seed: 2 });
      g.save(); g.scale(1.6, 1.6); drawMass(g, a, 300, 280); g.restore();
      g.save(); g.scale(2.4, 2.4); drawMass(g, b, 600, 160); g.restore();
    },
  };
}
