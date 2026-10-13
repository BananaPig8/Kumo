// Plano «title»: Nubaria al atardecer, en calma. El sol se pone a la derecha
// detrás del mar de nubes; los cúmulos de los lados se encienden de rosa y
// naranja con sombras lilas, y la isla del árbol queda a contraluz suave a la
// izquierda. El centro del cielo queda limpio y algo más oscuro para el
// título (texto HTML). Empieza desde blanco y acaba fundiendo a negro.

import { place, sunUV } from '../../engine/stage.js';
import { mulberry32, paintSky, cumulusMass, drawMass, cloudSeaBillows, painterly, applyPaper, makeCanvas, fillBlob, glow, css, mix } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { TITLE, DURATION } from '../../timeline.js';
import { lerp, smooth, smoother, invLerp } from '../../lib/util.js';
import { paintIsle } from '../meadow/brushes.js';
import { makeFlock, drawFlock } from './birds.js';

const CX = 960, CY = 400;
const P = PAL.sunset;
const HORIZON = 540;
const SUN = [1490, 540];
// Mar de nubes con menos contraste que los cúmulos: cimas melocotón, valles lila.
const SEA_SUNSET = { hi: '#ffe0c2', lit: '#f4c2a8', mid: '#d8a4ae', shade: '#ae92bc', deep: '#9480b0', rim: '#ffcf9a' };
const SKYC = { top: '#28326a', mid: '#9a76a0', bottom: '#ffbf8a' };
const LEAF_SUNSET = { deep: '#262c44', shade: '#3a4552', mid: '#5f6448', lit: '#b9844f', hi: '#f0b974', trunk: '#3a2930', trunkLit: '#8f5644' };
const ROCK_SUNSET = { deep: '#463c5e', shade: '#6a5873', mid: '#9c737c', lit: '#d79e7e', hi: '#f4c99a' };
const CAP_SUNSET = { far: '#c6a86a', mid: '#8e8a52', near: '#5c6646', dark: '#3a4040', lit: '#eebc78', hi: '#ffd59a' };
const LIP_SUNSET = { top: '#c6a86a', mid: '#8e8a52', dark: '#3c4440' };

export async function buildTitle(env) {
  const rng = mulberry32(6101);
  const isleOpts = (o) => ({ leaf: LEAF_SUNSET, rock: ROCK_SUNSET, grass: LIP_SUNSET, capGrass: CAP_SUNSET, hazeColor: '#b48aa8', bellyOpts: { bounce: '#e3a9a8', haze: '#7a6a8c' }, ...o });

  // ─── Cielo, sol, estratos encendidos y torres (profundidad 10) ────────────
  const SKX = -90, SKY = -80;
  const sky = makeCanvas(2100, 960);
  {
    const g = sky.getContext('2d');
    paintSky(g, 2100, 960, { ...SKYC, horizonY: (HORIZON - SKY) / 960, seed: 31, streaks: 0.25 });
    const sx = SUN[0] - SKX, sy = SUN[1] - SKY;
    glow(g, sx, sy, 900, '#ffb877', 0.42);
    glow(g, sx, sy, 240, '#ffd29a', 0.55);
    glow(g, sx, sy, 60, '#ffe6bf', 0.9);
    glow(g, sx, sy, 24, '#fff2dc', 1);
    painterly(sky, { seed: 32, size: 18, alpha: 0.25, stretch: 3, soften: 1.5, angle: () => 0.04 });
    // Estratos largos y finos sobre el horizonte, con el canto de abajo encendido.
    for (let i = 0; i < 11; i++) {
      const x = rng() * 2100, y = 300 + rng() * 200 - SKY;
      const rx = 180 + rng() * 380, ry = 5 + rng() * 9;
      const near = 1 - Math.min(1, Math.abs(x - sx) / 1100);
      fillBlob(g, x, y, rx, ry, mix('#9b7aa8', '#c98aa0', near), 0.55, { wobble: 0.3, seed: i, freq: 2.5 });
      fillBlob(g, x + 10, y + ry * 0.45, rx * 0.85, ry * 0.45, mix('#f2a98e', '#ffd2a0', near), 0.75, { wobble: 0.3, seed: i + 50, freq: 2.5 });
    }
    // Torres de cúmulo a los lados (el centro queda libre para el título).
    const cl = (w, h, light, o, x, y) => drawMass(g, cumulusMass(rng, w, h, { light, pal: P.cloud, ...o }), x - SKX, y - SKY);
    cl(940, 620, [0.85, -0.35, 0.3], { tower: 1.6, seed: 81 }, 150, HORIZON + 14);
    cl(520, 260, [0.85, -0.35, 0.3], { tower: 0.7, seed: 82, haze: 0.25, hazeColor: '#c995a8' }, 640, HORIZON + 8);
    cl(780, 480, [-0.85, -0.35, 0.3], { tower: 1.3, seed: 83 }, 1880, HORIZON + 12);
    const hz = g.createLinearGradient(0, HORIZON - 70 - SKY, 0, HORIZON + 10 - SKY);
    hz.addColorStop(0, css('#ffbf8a', 0)); hz.addColorStop(1, css('#ffc896', 0.85));
    g.fillStyle = hz; g.fillRect(0, HORIZON - 70 - SKY, 2100, 960);
  }
  const stars = [];
  for (let i = 0; i < 70; i++) stars.push({ x: rng() * 2000 - 40, y: rng() * 210 - 40, r: 0.6 + rng() * 1.3, ph: rng() * 6.28, a: 0.25 + rng() * 0.55 });

  // ─── Mar de nubes al atardecer (profundidad 5) ────────────────────────────
  const SEX = -200, SEH = 340, SEY = HORIZON - SEH * 0.2;
  const sea = cloudSeaBillows(rng, 2300, SEH, { pal: SEA_SUNSET, light: [0.7, -0.5, 0.3], haze: P.haze, sky: '#ffc08e', horizon: 0.2, rows: 10, seed: 13, nearScale: 0.5 });

  // ─── Islas lejanas (profundidad 3,6) ──────────────────────────────────────
  const FIX = -40, FIY = 220;
  const far = makeCanvas(2000, 420);
  {
    const g = far.getContext('2d');
    const put = (w, h, trees, haze, seed, x, y) => drawMass(g, paintIsle(rng, w, h, isleOpts({ trees, haze, seed, light: [0.85, -0.4, 0.4] })), x - FIX, y - FIY);
    put(80, 64, [{ x: 0, dy: 0, h: 34 }], 0.5, 51, 800, 470);
    put(120, 90, [{ x: -0.3, dy: -0.1, h: 50 }, { x: 0.35, dy: 0.2, h: 36 }], 0.42, 52, 1180, 440);
    put(150, 110, [{ x: 0.1, dy: -0.1, h: 60 }], 0.48, 53, 1700, 410);
    put(60, 46, [{ x: 0, dy: 0, h: 26 }], 0.55, 54, 1010, 500);
  }

  // ─── La isla del árbol, a la izquierda (profundidad 2,6) ──────────────────
  const TREEX = 400, TREEY = 452;
  const main = paintIsle(rng, 330, 240, isleOpts({
    trees: [{ x: -0.68, dy: 0.25, h: 64 }, { x: 0.04, dy: -0.12, h: 236, big: true }, { x: 0.72, dy: 0.2, h: 56 }],
    haze: 0.14, seed: 55, light: [0.85, -0.4, 0.4], roots: 5, facets: 13, wobble: 0.025, fine: 0.5, meadow: 0.8, hangK: 0.5, hangLen: 0.7,
  }));

  // ─── Cúmulos cercanos de los lados (profundidad 1,4) ──────────────────────
  const near = [
    { c: cumulusMass(rng, 900, 360, { light: [0.85, -0.35, 0.3], pal: P.cloud, tower: 0.6, seed: 91 }), x: 40, y: 1010 },
    { c: cumulusMass(rng, 980, 380, { light: [-0.7, -0.45, 0.3], pal: P.cloud, tower: 0.6, seed: 92 }), x: 1900, y: 1020 },
  ];
  const flock = makeFlock(rng, 8, { spread: [180, 60], size: [6, 10] });

  return function title(f) {
    const { g, lt, u, post, T } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.3; post.threshold = 0.9; post.vignette = 0.5;
    const e = smoother(u);
    const cam = { x: lerp(-24, 24, e), y: lerp(12, -8, e), zoom: lerp(1.0, 1.05, e) };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };
    g.imageSmoothingQuality = 'low';

    at(10); g.drawImage(sky, SKX, SKY);
    // Primeras estrellas arriba, que titilan.
    for (const s of stars) {
      const a = s.a * (0.6 + 0.4 * Math.sin(t * 1.7 + s.ph)) * smooth(invLerp(0, 3, t));
      g.fillStyle = css('#fff6e8', a);
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
    }
    at(10, f.glow); glow(f.glow, SUN[0], SUN[1], 46, '#ffc884', 0.32);
    at(5);
    g.drawImage(sea, SEX, SEY);
    // Reflejo del sol en el mar de nubes.
    g.save();
    g.globalCompositeOperation = 'screen';
    g.translate(SUN[0], HORIZON + 40); g.scale(1, 0.22);
    const rf = g.createRadialGradient(0, 0, 0, 0, 0, 520);
    rf.addColorStop(0, 'rgba(255,196,130,0.5)'); rf.addColorStop(1, 'rgba(255,196,130,0)');
    g.fillStyle = rf; g.fillRect(-520, -520, 1040, 1040);
    g.restore();
    at(3.6); g.drawImage(far, FIX, FIY);
    at(2.2); drawFlock(g, flock, lerp(820, 1240, u), lerp(300, 270, u), t, { color: '#3f3550', haze: '#ffbf8a', far: 0.15, dir: 1 });
    at(2.6); drawMass(g, main, TREEX, TREEY);
    at(1.4); for (const n of near) drawMass(g, n.c, n.x + Math.sin(t * 0.2 + n.x) * 5, n.y);

    // Velo oscuro detrás del título (sin borde): el texto se lee siempre.
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.save();
    g.translate(960, 330); g.scale(1, 0.42);
    const vg = g.createRadialGradient(0, 0, 0, 0, 0, 760);
    vg.addColorStop(0, 'rgba(30,24,60,0.3)'); vg.addColorStop(0.6, 'rgba(30,24,60,0.14)'); vg.addColorStop(1, 'rgba(30,24,60,0)');
    g.fillStyle = vg; g.fillRect(-760, -760, 1520, 1520);
    g.restore();
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.1);
    const s = 1 + (cam.zoom - 1) / 10;
    post.rays = 0.2; post.sun = sunUV(960 + s * (SUN[0] - CX - cam.x / 10), 400 + s * (SUN[1] - CY - cam.y / 10)); post.raysDecay = 0.95; post.raysDensity = 0.85;
    post.flash = 1 - smooth(invLerp(0, 1.0, lt));
    post.fade = smooth(invLerp(TITLE.out, DURATION, T));
    g.imageSmoothingQuality = 'high';
  };
}
