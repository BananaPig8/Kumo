// Plano «reveal»: sale del blanco por encima de las nubes y aparece Nubaria.
// Mar de nubes hasta el horizonte, torres de cúmulo, archipiélago con
// cascadas y la isla grande con el árbol antiguo, más ancho que la isla.
// Sol arriba a la derecha (la luz viene de ahí en este plano). La cámara
// sube saliendo de un banco de nubes y avanza despacio.

import { place, sunUV } from '../../engine/stage.js';
import { mulberry32, paintSky, cumulusMass, drawMass, cloudSeaBillows, painterly, paintStreaks, applyPaper, paintWaterfall, makeCanvas, fillBlob, glow, css, SKY_DAY, CLOUD_DAY } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { lerp, smooth, smoother, easeOut, invLerp } from '../../lib/util.js';
import { paintIsle, LEAF_DAY } from '../meadow/brushes.js';
import { makeFlock, drawFlock } from './birds.js';

const CX = 960, CY = 400;
const P = PAL.day;
const L = [0.5, -0.85, 0.32];
const HORIZON = 468;
const SUN = [1600, 92];

export async function buildReveal(env) {
  const rng = mulberry32(5101);

  // ─── Cielo, sol y torres de cúmulo (profundidad 10) ───────────────────────
  const SKX = -140, SKY = -90;
  const sky = makeCanvas(2200, 980);
  {
    const g = sky.getContext('2d');
    paintSky(g, 2200, 980, { ...SKY_DAY, horizonY: (HORIZON - SKY) / 980, seed: 21, streaks: 0.35 });
    // Halo del sol: blanco cálido que aclara el azul alrededor.
    const sx = SUN[0] - SKX, sy = SUN[1] - SKY;
    glow(g, sx, sy, 480, '#e4f4ef', 0.3);
    glow(g, sx, sy, 110, '#fffbea', 0.5);
    glow(g, sx, sy, 26, '#ffffff', 1);
    paintStreaks(g, mulberry32(22), 80 - SKX, 120 - SKY, 820, -0.22, { n: 2, alpha: 0.4, width: 3 });
    paintStreaks(g, mulberry32(23), 260 - SKX, 250 - SKY, 560, -0.17, { n: 2, alpha: 0.28, width: 2.5 });
    painterly(sky, { seed: 24, size: 18, alpha: 0.25, stretch: 3, soften: 1.5, angle: () => -0.1 });
    const cl = (w, h, o, x, y) => drawMass(g, cumulusMass(rng, w, h, { light: L, pal: CLOUD_DAY, ...o }), x - SKX, y - SKY);
    cl(1040, 600, { tower: 1.6, seed: 51 }, 170, HORIZON + 12);
    cl(520, 210, { tower: 0.55, seed: 52, haze: 0.28, hazeColor: P.haze }, 760, HORIZON + 6);
    cl(860, 380, { tower: 1.0, seed: 53, haze: 0.08, hazeColor: P.haze }, 1430, HORIZON + 14);
    cl(640, 300, { tower: 0.8, seed: 54, haze: 0.2, hazeColor: P.haze }, 2000, HORIZON + 8);
    const hz = g.createLinearGradient(0, HORIZON - 80 - SKY, 0, HORIZON + 10 - SKY);
    hz.addColorStop(0, css(SKY_DAY.bottom, 0)); hz.addColorStop(1, css(SKY_DAY.bottom, 0.85));
    g.fillStyle = hz; g.fillRect(0, HORIZON - 80 - SKY, 2200, 980);
  }

  // ─── Mar de nubes (profundidad 5) ─────────────────────────────────────────
  const SEX = -240, SEH = 460, SEY = HORIZON - SEH * 0.2;
  const sea = cloudSeaBillows(rng, 2400, SEH, { pal: CLOUD_DAY, light: L, haze: P.haze, sky: SKY_DAY.bottom, horizon: 0.2, rows: 10, seed: 11, nearScale: 0.5 });

  // ─── Archipiélago lejano (profundidad 4) ──────────────────────────────────
  const FIX = -60, FIY = 120;
  const far = makeCanvas(2080, 520);
  const farFalls = [];
  {
    const g = far.getContext('2d');
    const put = (w, h, trees, haze, seed, x, y, fall) => {
      const c = paintIsle(rng, w, h, { trees, haze, hazeColor: P.haze, seed, light: L });
      drawMass(g, c, x - FIX, y - FIY);
      if (fall) farFalls.push({ x: x + fall[0] * w * 0.5, y: y + 4, w: fall[1], h: fall[2], seed });
    };
    put(90, 70, [{ x: 0.1, dy: 0, h: 40 }], 0.55, 31, 300, 318, null);
    put(120, 92, [{ x: -0.3, dy: -0.1, h: 52 }, { x: 0.35, dy: 0.2, h: 38 }], 0.48, 32, 560, 372, [0.55, 4, 70]);
    put(70, 56, [{ x: 0.1, dy: 0, h: 30 }], 0.55, 33, 860, 404, null);
    put(150, 110, [{ x: -0.2, dy: -0.15, h: 62 }, { x: 0.4, dy: 0.2, h: 44 }], 0.45, 34, 1870, 344, [-0.5, 5, 90]);
    put(80, 60, [{ x: 0, dy: 0, h: 34 }], 0.58, 35, 1580, 300, null);
  }

  // ─── Islas medianas (profundidad 2,6) ─────────────────────────────────────
  const mid = [
    { c: paintIsle(rng, 300, 230, { trees: [{ x: -0.55, dy: 0.1, h: 92 }, { x: 0.1, dy: -0.2, h: 130 }, { x: 0.6, dy: 0.25, h: 70 }], haze: 0.22, hazeColor: P.haze, seed: 41, light: L, roots: 4, meadow: 0.7 }), x: 300, y: 336, fall: [-0.62, 9, 230] },
    { c: paintIsle(rng, 220, 180, { trees: [{ x: -0.2, dy: -0.1, h: 96 }, { x: 0.45, dy: 0.2, h: 60 }], haze: 0.26, hazeColor: P.haze, seed: 42, light: L, meadow: 0.6 }), x: 1780, y: 236, fall: null },
  ];

  // ─── La isla del árbol antiguo (profundidad 1,9) ──────────────────────────
  const MAINX = 1090, MAINY = 492;
  const main = paintIsle(rng, 560, 360, {
    trees: [{ x: -0.72, dy: 0.25, h: 92 }, { x: 0.02, dy: -0.15, h: 372, big: true }, { x: 0.74, dy: 0.2, h: 80 }],
    haze: 0.06, hazeColor: P.haze, seed: 43, light: L, roots: 7, facets: 15, wobble: 0.025, fine: 0.55, meadow: 1, hangK: 0.4, hangLen: 0.7,
    leaf: LEAF_DAY,
  });

  // ─── Cúmulos del mar de nubes, de cerca ───────────────────────────────────
  // El mar lejano da el horizonte; delante, montañas de nube grandes con la
  // cima al sol y valles azulados entre ellas (las bases quedan bajo el borde).
  const mound = (w, h, seed, haze = 0) => cumulusMass(rng, w, h, { light: L, pal: CLOUD_DAY, tower: 0.55, seed, haze, hazeColor: P.haze });
  const back = [
    { c: mound(700, 300, 71, 0.16), x: -60, y: 880 }, { c: mound(620, 260, 72, 0.18), x: 470, y: 860 },
    { c: mound(760, 320, 73, 0.14), x: 1500, y: 880 }, { c: mound(680, 290, 74, 0.16), x: 2020, y: 860 },
    { c: mound(560, 240, 75, 0.2), x: 1000, y: 850 },
  ];
  const near = [
    { c: mound(980, 400, 61), x: 60, y: 1060 },
    { c: mound(1040, 420, 63), x: 1900, y: 1070 },
  ];
  const wisps = [];
  for (let i = 0; i < 9; i++) wisps.push({ x: lerp(-200, 2100, i / 8) + (rng() - 0.5) * 160, y: 760 + rng() * 260, rx: 360 + rng() * 260, ry: 150 + rng() * 90 });

  const flock = makeFlock(rng, 11, { spread: [300, 110], size: [8, 15] });
  const flock2 = makeFlock(rng, 6, { spread: [160, 50], size: [4, 7] });

  return function reveal(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.26; post.threshold = 0.9; post.vignette = 0.36;
    // Sube saliendo del banco de nubes (rápido al principio) y avanza.
    const rise = easeOut(invLerp(0, 0.85, u));
    const cam = { x: lerp(-30, 30, smoother(u)), y: lerp(170, -16, rise), zoom: lerp(1.0, 1.09, smoother(u)) };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };
    g.imageSmoothingQuality = 'low';

    at(10); g.drawImage(sky, SKX, SKY);
    at(10, f.glow); glow(f.glow, SUN[0], SUN[1], 50, '#fff2c8', 0.35);
    at(5); g.drawImage(sea, SEX, SEY);
    at(4);
    g.drawImage(far, FIX, FIY);
    for (const w of farFalls) paintWaterfall(g, w.x, w.y, w.w, w.h, t, { seed: w.seed, alpha: 0.45 });
    drawFlock(g, flock2, lerp(1250, 1420, u), 250, t + 2, { far: 0.55, dir: 1 });
    at(2.6);
    for (const m of mid) {
      drawMass(g, m.c, m.x, m.y);
      if (m.fall) paintWaterfall(g, m.x + m.fall[0] * 150, m.y + 8, m.fall[1], m.fall[2], t, { seed: 7, alpha: 0.7 });
    }
    // Valle azulado bajo las montañas de nube de atrás.
    at(2.3);
    for (const n of back) drawMass(g, n.c, n.x + Math.sin(t * 0.2 + n.x) * 5, n.y);
    at(1.9);
    drawMass(g, main, MAINX, MAINY);
    paintWaterfall(g, MAINX - 228, MAINY + 22, 24, 360, t, { seed: 9, alpha: 0.95 });
    paintWaterfall(g, MAINX + 205, MAINY + 26, 8, 190, t * 1.1, { seed: 10, alpha: 0.6 });
    // Bandada que cruza por delante del árbol.
    at(1.5);
    drawFlock(g, flock, lerp(380, 820, u), lerp(330, 270, u), t, { dir: 1 });
    at(1.15);
    for (const n of near) drawMass(g, n.c, n.x + Math.sin(t * 0.25 + n.x) * 6, n.y);
    // Jirones del banco de nubes del que sale la cámara.
    const wa = 1 - smooth(invLerp(0.05, 0.4, u));
    if (wa > 0) {
      at(0.6);
      // Jirones blandos (degradado radial aplastado, sin borde).
      for (const w of wisps) {
        g.save();
        g.translate(w.x, w.y - t * 30); g.scale(1, w.ry / w.rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, w.rx);
        gr.addColorStop(0, css('#f6fafb', 0.75 * wa)); gr.addColorStop(0.55, css('#f6fafb', 0.45 * wa)); gr.addColorStop(1, css('#f6fafb', 0));
        g.fillStyle = gr; g.fillRect(-w.rx, -w.rx, w.rx * 2, w.rx * 2);
        g.restore();
      }
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.1);
    // Rayos desde el sol (su posición en pantalla sigue a la cámara).
    const s = 1 + (cam.zoom - 1) / 10;
    post.rays = 0.32; post.sun = sunUV(960 + s * (SUN[0] - CX - cam.x / 10), 400 + s * (SUN[1] - CY - cam.y / 10)); post.raysDecay = 0.958; post.raysDensity = 0.9;
    post.flash = 1 - smooth(invLerp(0, 1.6, lt));
    g.imageSmoothingQuality = 'high';
  };
}
