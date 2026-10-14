// Laboratorio: el mar de nubes de la revelación sobre su cielo (T < 10) o
// sobre rojo para ver los bordes (T ≥ 10).
import { mulberry32, cloudSeaBillows, paintSky, CLOUD_DAY, SKY_DAY } from '../engine/paint.js';
import { PAL } from '../engine/style.js';

export async function build() {
  const sea = cloudSeaBillows(mulberry32(1), 2400, 460, { pal: CLOUD_DAY, light: [0.5, -0.85, 0.32], haze: PAL.day.haze, sky: SKY_DAY.bottom, horizon: 0.2, rows: 9, seed: 11, nearScale: 0.75 });
  return {
    draw({ g, T }) {
      if (T >= 10) { g.fillStyle = '#802040'; g.fillRect(0, 0, 1920, 800); }
      else paintSky(g, 1920, 800, { ...SKY_DAY, horizonY: 468 / 800, seed: 2 });
      g.drawImage(sea, -240, 376);
    },
  };
}
