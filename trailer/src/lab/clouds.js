// Laboratorio: pruebas de nubes (solo desarrollo; ?capture&lab=clouds).
import { mulberry32, paintSky, cumulusMass, drawMass, cloudSeaMass, applyPaper } from '../engine/paint.js';
import { PAL } from '../engine/style.js';

export async function build(env) {
  const P = PAL.morning;
  const rng = mulberry32(3);
  const t0 = performance.now();
  const big = cumulusMass(rng, 900, 620, { pal: P.cloud, light: [0.7, -0.6, 0.3], tower: 1.4, seed: 4 });
  const mid = cumulusMass(rng, 520, 300, { pal: P.cloud, light: [0.7, -0.6, 0.3], tower: 0.8, seed: 8 });
  const sea = cloudSeaMass(rng, 1920, 330, { pal: P.cloud, light: [0.7, -0.6, 0.3], haze: P.haze, rows: 10 });
  console.warn('lab clouds ms', Math.round(performance.now() - t0));
  return {
    draw({ g, W, H }) {
      paintSky(g, W, H, { ...P.sky, horizonY: 0.6, seed: 2 });
      drawMass(g, big, 560, 520);
      drawMass(g, mid, 1450, 470);
      g.drawImage(sea, 0, H - 330);
      applyPaper(g, env.paper, 0.25);
    },
  };
}
