// Plano «shrine»: un santuario de piedra en ruinas sobre un islote, con luz
// suave de mañana. En el centro, bajo un arco roto, flota la llave dorada
// que gira despacio dentro de un haz de luz con motas de polvo. Travelling
// lento hacia la llave; al final, dos siluetas de llave tenues en el cielo
// insinúan que son tres.

import { place, sunUV } from '../../engine/stage.js';
import { mulberry32, paintSky, drawMass, painterly, paintStreaks, applyPaper, makeCanvas, fillBlob, blade, css, mix, vary, vgrad, glow } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { clamp, lerp, smooth, smoother, invLerp } from '../../lib/util.js';
import { drawWaving, makePetals, drawPetals, paintIsle, paintCapMeadow, grassStrip, litCopy } from './brushes.js';
import { MEADOW_DAY } from '../../engine/paint.js';
import { STONE, column, arch, steps, block, drum, moss, tuft, vine } from './stone.js';
import { makeKey, drawKey, drawKeyGlow } from './key.js';

const CX = 960, CY = 400;
const P = PAL.morning;
const L = [-0.5, -0.85, 0.35];
const WIND = { amp: 0.12, bias: 0.4, k: 0.009, speed: 2.2, seed: 1.3 };
// La llave (coordenadas de pantalla en reposo).
const KX = 960, KY = 338;

// ─── El islote con las ruinas ──────────────────────────────────────────────
// Se pinta a 1,25× porque la cámara se acerca hasta 1,24×.
const RES = 1.25;
const OX = 300, OY = 70, OW = 1320, OH = 760;
const CAPX = 960, CAPY = 560, CAPRX = 612, CAPRY = 66;
export const SHRINE_LAYER = { RES, OX, OY, OW, OH };

export function paintShrineIsle(rng) {
  const isle = makeCanvas(OW * RES, OH * RES);
  const ig = isle.getContext('2d');
  const toLayer = (g) => g.setTransform(RES, 0, 0, RES, -OX * RES, -OY * RES);
  // Panza de roca, labio colgante y lianas: el mismo pincel que las islas
  // lejanas (para que todo el cielo hable igual), con muchos más lóbulos y
  // detalles finos porque esta se ve de cerca.
  const base = paintIsle(rng, CAPRX * 2 * RES, 340 * RES, {
    light: L, ry: CAPRY * RES, wobble: 0.03, facets: 26,
    topPad: 30 * RES, padK: 0.04, seed: 23, fine: 0.3, hangK: 0.75, hangLen: 0.5,
  });
  const dx = Math.round((CAPX - OX) * RES - base.anchor[0]), dy = Math.round((CAPY - OY) * RES - base.anchor[1]);
  ig.drawImage(base, dx, dy);
  // Tapa de prado recortada con el mismo contorno.
  ig.save();
  ig.setTransform(1, 0, 0, 1, dx, dy);
  ig.clip(base.cap.path);
  toLayer(ig);
  paintCapMeadow(ig, rng, CAPX, CAPY, CAPRX, CAPRY, { light: L });
  ig.restore();
  toLayer(ig);
  // Sombras de las ruinas sobre la hierba (la luz viene de delante a la izquierda).
  for (const [x, y, w] of [[600, 548, 90], [1312, 548, 95], [1465, 590, 70], [458, 590, 60]]) fillBlob(ig, x + w * 0.45, y - 4, w, 12, '#2f6d22', 0.35, { wobble: 0.2, seed: x });
  // Losas del suelo alrededor del estrado.
  for (let i = 0; i < 26; i++) {
    const x = lerp(640, 1280, rng()), y = lerp(536, 600, rng());
    fillBlob(ig, x, y, 18 + rng() * 22, 5 + rng() * 4, mix(STONE.lit, STONE.mid, rng()), 0.9, { wobble: 0.15, n: 10, seed: i });
  }
  // Fila de atrás: columna rota a la izquierda y columna con capitel y
  // arquitrabe a la derecha.
  column(ig, rng, 600, 548, 300, 28, { broken: 0.6, vines: 2 });
  column(ig, rng, 1312, 548, 330, 29, { lintel: -1, vines: 1 });
  // Estrado.
  block(ig, rng, 700, 522, 520, 76, 30, { joints: 6, mossTop: 2, skew: [0.9, -0.9] });
  // Arco sobre el estrado (le faltan dovelas arriba a la derecha).
  arch(ig, rng, 960, 330, 157, 48, 182, { gap: [0.38, 1.12], vines: 5 });
  // Altar: pedestal bajo con una losa encima.
  column(ig, rng, 960, 512, 64, 21, { mossK: 0.6 });
  // Escalinata hasta el estrado.
  steps(ig, rng, 960, 612, 5, 300, 250, 18, 9);
  // Fila de delante: tocón a la izquierda y columna inclinada a la derecha.
  column(ig, rng, 458, 592, 120, 27, { broken: 1.0, lean: -0.04, mossK: 1.3 });
  column(ig, rng, 1465, 592, 190, 27, { broken: -0.8, lean: 0.07, vines: 1, mossK: 1.2 });
  drum(ig, rng, 1150, 612, 92, 22, { dir: 1 });
  block(ig, rng, 690, 612, 66, 26, 12, { mossTop: 1 });
  block(ig, rng, 752, 618, 40, 20, 10, { mossTop: 0.6 });
  // Matas al pie de las piedras y en el canto.
  for (const [x, y, n] of [[600, 550, 6], [1312, 550, 6], [458, 594, 5], [1465, 594, 5], [700, 600, 4], [1220, 600, 4], [1150, 616, 4], [690, 614, 3]]) {
    for (let i = 0; i < n; i++) tuft(ig, rng, x + (rng() - 0.5) * 70, y + rng() * 4, 8 + rng() * 12);
  }
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * (0.04 + rng() * 0.92);
    const k = base.cap.rimK(a) * 0.97;
    tuft(ig, rng, CAPX + Math.cos(a) * CAPRX * k, CAPY + Math.sin(a) * CAPRY * k + 2, 7 + rng() * 11);
  }
  ig.setTransform(1, 0, 0, 1, 0, 0);
  painterly(isle, { seed: 31, size: 5 * RES, alpha: 0.3, stretch: 1.8, soften: 0.6, density: 0.55 });
  return isle;
}

export async function buildShrine(env, shared) {
  const rng = mulberry32(3011);

  // ─── Cielo de mañana con los mismos cúmulos (profundidad 8) ───────────────
  const SKX = -40, SKY = -40;
  const sky = makeCanvas(2000, 880);
  {
    const g = sky.getContext('2d');
    paintSky(g, 2000, 880, { ...P.sky, horizonY: (486 - SKY) / 880, seed: 12, streaks: 0.35 });
    paintStreaks(g, mulberry32(15), 1180 - SKX, 90 - SKY, 760, 0.3, { n: 2, alpha: 0.45, width: 3 });
    paintStreaks(g, mulberry32(16), 1300 - SKX, 210 - SKY, 520, 0.24, { n: 2, alpha: 0.3, width: 2.5 });
    painterly(sky, { seed: 19, size: 18, alpha: 0.25, stretch: 3, soften: 1.5, angle: () => 0.1 });
    const c = shared.clouds;
    drawMass(g, c.big, 300 - SKX, 500 - SKY, 0.95);
    drawMass(g, shared.near[1].c, 1700 - SKX, 500 - SKY, 1.05);
    drawMass(g, c.left, 1240 - SKX, 492 - SKY, 0.8);
    drawMass(g, c.small, 760 - SKX, 486 - SKY, 0.9);
    const hz = g.createLinearGradient(0, 400 - SKY, 0, 492 - SKY);
    hz.addColorStop(0, css(P.sky.bottom, 0)); hz.addColorStop(1, css(P.sky.bottom, 0.85));
    g.fillStyle = hz; g.fillRect(0, 400 - SKY, 2000, 880);
  }

  // ─── Islas lejanas (profundidad 3,4), más brumosas ────────────────────────
  const FIX = 0, FIY = 160;
  const far = makeCanvas(1920, 420);
  {
    const g = far.getContext('2d');
    const is = shared.isles;
    drawMass(g, is[3].c, 250 - FIX, 405 - FIY, 0.62);
    drawMass(g, is[2].c, 1790 - FIX, 330 - FIY, 0.85);
    drawMass(g, is[0].c, 1560 - FIX, 420 - FIY, 0.9);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = css(P.haze, 0.3); g.fillRect(0, 0, 1920, 420);
  }

  // ─── El islote con las ruinas (profundidad 1, pintado a 1,25×) ────────────
  const isle = paintShrineIsle(rng);

  // ─── La llave ─────────────────────────────────────────────────────────────
  const key = makeKey(340);
  const motes = [];
  for (let i = 0; i < 70; i++) motes.push({ x: rng(), y: rng(), s: 1 + rng() * 2.6, v: 8 + rng() * 20, ph: rng() * 6.28, tw: 1 + rng() * 3 });
  const petals = makePetals(rng, 26, { y0: 120, y1: 700, sMin: 3, sMax: 9 });
  // Primer término: hierba alta de lado a lado (la del acantilado acaba en el borde).
  const fBase = (x) => 330 + Math.sin(x * 0.004) * 14 + Math.sin(x * 0.011 + 1) * 6;
  const fg = grassStrip(rng, 2400, 420, fBase, { pal: { ...MEADOW_DAY, near: mix(MEADOW_DAY.near, MEADOW_DAY.dark, 0.25) }, count: 1100, hMin: 40, hMax: 150, lean: 0.25, fill: true, tuft: 5, flowers: 110, flowerSize: [7, 17] });
  {
    const g = fg.canvas.getContext('2d');
    g.globalCompositeOperation = 'source-atop';
    for (const [x, a] of [[300, 0.55], [2100, 0.45]]) {
      const gr = g.createRadialGradient(x, 420, 30, x, 420, 700);
      gr.addColorStop(0, `rgba(10,52,20,${a})`); gr.addColorStop(0.6, `rgba(14,66,24,${a * 0.35})`); gr.addColorStop(1, 'rgba(14,66,24,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 2400, 420);
    }
  }
  const fgLit = litCopy(fg, '#e8ff9a', 0.35);
  const bokeh = shared.bokeh;

  return function shrine(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    g.imageSmoothingQuality = 'low';
    Object.assign(post, P.post);
    post.bloom = 0.3; post.threshold = 0.9; post.vignette = 0.42;
    f.stage.setGlowGain(1.15);
    // Travelling lento hacia la llave.
    const e = smoother(u);
    const zoom = lerp(1.0, 1.24, e);
    const cam = { x: lerp(-14, 6, e), y: (KY - CY) * (1 - 1 / zoom) + lerp(10, 0, e), zoom };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };

    at(8); g.drawImage(sky, SKX, SKY);
    // Dos siluetas de llave tenues que aparecen en el cielo al final.
    const ghost = smooth(invLerp(0.68, 0.95, u));
    if (ghost > 0) {
      for (const [x, y, k, a0] of [[420, 170, 0.62, 0.4], [1530, 128, 0.56, 2.1]]) {
        const ang = a0 + t * 0.5;
        const yy = y + Math.sin(t * 1.1 + a0) * 4;
        drawKey(g, key, x, yy, ang, k * 0.5, { alpha: ghost * 0.5 });
        at(8, f.glow);
        drawKeyGlow(f.glow, key, x, yy, ang, k * 0.5, ghost * 0.35);
        at(8);
      }
    }
    at(4); g.drawImage(shared.sea, -40, 486 - 79);
    at(3.4); g.drawImage(far, FIX, FIY);
    at(1); g.drawImage(isle, OX, OY, OW, OH);

    // Haz de luz desde arriba sobre la llave.
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.7);
    g.save();
    g.globalCompositeOperation = 'screen';
    const beam = new Path2D();
    beam.moveTo(880, -120); beam.lineTo(1030, -120); beam.lineTo(1110, 540); beam.lineTo(820, 540); beam.closePath();
    const bg = g.createLinearGradient(0, -120, 0, 540);
    bg.addColorStop(0, 'rgba(255,246,214,0.0)'); bg.addColorStop(0.25, `rgba(255,244,205,${0.3 * pulse})`); bg.addColorStop(0.75, `rgba(255,236,180,${0.22 * pulse})`); bg.addColorStop(1, 'rgba(255,230,170,0)');
    g.fillStyle = bg; g.fill(beam);
    // Vetas dentro del haz.
    for (let i = 0; i < 5; i++) {
      const x0 = 900 + i * 28 + Math.sin(t * 0.6 + i) * 6;
      const vb = new Path2D();
      vb.moveTo(x0, -120); vb.lineTo(x0 + 14, -120); vb.lineTo(x0 + 14 + (x0 - 955) * 0.45 + 30, 540); vb.lineTo(x0 + (x0 - 955) * 0.45 + 22, 540); vb.closePath();
      g.fillStyle = `rgba(255,248,220,${0.07 + 0.05 * Math.sin(t * 1.3 + i * 2)})`;
      g.fill(vb);
    }
    // Charco de luz cálida en el estrado.
    g.translate(KX, 515); g.scale(1, 0.22);
    const pg = g.createRadialGradient(0, 0, 0, 0, 0, 260);
    pg.addColorStop(0, `rgba(255,226,150,${0.45 * pulse})`); pg.addColorStop(1, 'rgba(255,226,150,0)');
    g.fillStyle = pg; g.fillRect(-260, -260, 520, 520);
    g.restore();

    // Motas de polvo luminosas en el haz.
    at(1, f.glow);
    for (const m of motes) {
      const yy = ((m.y * 560 - m.v * t) % 560 + 560) % 560 - 20;
      const wd = lerp(70, 140, yy / 540);
      const xx = 955 + (m.x - 0.5) * 2 * wd + Math.sin(t * 0.8 + m.ph) * 10;
      const tw = 0.5 + 0.5 * Math.sin(t * m.tw + m.ph);
      const a = tw * smooth(invLerp(-20, 60, yy)) * (1 - smooth(invLerp(480, 540, yy)));
      g.fillStyle = `rgba(255,250,225,${0.75 * a})`;
      g.beginPath(); g.arc(xx, yy, m.s, 0, Math.PI * 2); g.fill();
      f.glow.fillStyle = `rgba(255,220,140,${0.5 * a})`;
      f.glow.beginPath(); f.glow.arc(xx, yy, m.s * 1.6, 0, Math.PI * 2); f.glow.fill();
    }
    // La llave: gira despacio (escala x con cos), sube y baja, y brilla.
    const ky = KY + Math.sin(t * 1.4) * 9;
    const ang = 0.5 + t * 0.62;
    // Solo el resplandor que sigue la silueta (sin halo redondo).
    drawKey(g, key, KX, ky, ang, 0.5);
    drawKeyGlow(f.glow, key, KX, ky, ang, 0.5, 0.2 * pulse);
    // Destello que recorre la llave al girar.
    const flash = Math.pow(Math.max(0, Math.cos(ang * 2)), 24);
    if (flash > 0.02) glow(f.glow, KX - 18, ky - 50, 40, '#ffffff', flash * 0.35);

    // Primer término: la hierba del acantilado vecino.
    at(0.75);
    drawWaving(g, fg, -240, 470, t + 3, WIND, fgLit, { cw: 10 });
    drawPetals(g, petals, t * 0.6, { alpha: 0.9 });
    at(0.5);
    g.save(); g.translate(2080, 0); g.scale(-1, 1); g.drawImage(bokeh, -40, 470); g.restore();

    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.1);
    // Rayos de sol desde lo alto del haz.
    post.rays = 0.22; post.sun = sunUV(950, 30); post.raysDecay = 0.955; post.raysDensity = 0.9;
    g.imageSmoothingQuality = 'high';
  };
}
