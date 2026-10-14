// Laboratorio: el islote del santuario solo, sobre el cielo. T < 10 lo enseña
// entero (1:1, como en el plano); T ≥ 10 amplía ×2 el canto delantero.
import { mulberry32, paintSky, SKY_DAY } from '../engine/paint.js';
import { paintShrineIsle, SHRINE_LAYER as S } from '../scenes/meadow/shrine.js';

export async function build() {
  const isle = paintShrineIsle(mulberry32(3011));
  return {
    draw({ g, W, H, T }) {
      paintSky(g, W, H, { ...SKY_DAY, horizonY: 0.9, seed: 2 });
      g.save();
      if (T >= 10) { const k = 2; g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-(T >= 20 ? 560 : 960), -600); }
      g.drawImage(isle, S.OX, S.OY, S.OW, S.OH);
      g.restore();
    },
  };
}
