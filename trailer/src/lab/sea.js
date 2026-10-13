// Laboratorio: el mar de nubes aislado sobre fondo oscuro (para ver sus bordes).
import { mulberry32, cloudSeaBillows, CLOUD_DAY, SKY_DAY } from '../engine/paint.js';
import { PAL } from '../engine/style.js';

export async function build() {
  const sea = cloudSeaBillows(mulberry32(1), 2000, 360, { pal: CLOUD_DAY, light: [-0.5, -0.85, 0.3], haze: PAL.day.haze, sky: SKY_DAY.bottom, horizon: 0.22, rows: 9, seed: 7, nearScale: 0.7 });
  return { draw({ g }) { g.fillStyle = '#802040'; g.fillRect(0, 0, 1920, 800); g.drawImage(sea, 0, 200); } };
}
