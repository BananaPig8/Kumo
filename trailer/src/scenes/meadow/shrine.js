// Plano «shrine»: un santuario de piedra en ruinas sobre un islote, con luz
// suave de mañana. En el centro, bajo un arco roto, flota la llave dorada
// que gira despacio dentro de un haz de luz con motas de polvo. Travelling
// lento hacia la llave; al final, dos siluetas de llave tenues en el cielo
// insinúan que son tres.

import { place, sunUV } from '../../engine/stage.js';
import { mulberry32, paintSky, drawMass, paintMeadow, painterly, paintStreaks, applyPaper, renderMass, makeRamp, makeCanvas, fillBlob, css, mix, glow, MEADOW_DAY } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { clamp, lerp, smooth, smoother, invLerp } from '../../lib/util.js';
import { paintFlowers, drawWaving, makePetals, drawPetals, ROCK_DAY } from './brushes.js';
import { STONE, column, arch, steps, block, drum, moss, tuft, vine } from './stone.js';
import { makeKey, drawKey, drawKeyGlow } from './key.js';

const CX = 960, CY = 400;
const P = PAL.morning;
const L = [-0.5, -0.85, 0.35];
const WIND = { amp: 0.12, bias: 0.4, k: 0.009, speed: 2.2, seed: 1.3 };
// La llave (coordenadas de pantalla en reposo).
const KX = 960, KY = 338;

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
  const RES = 1.25;
  const OX = 300, OY = 70, OW = 1320, OH = 760;
  const isle = makeCanvas(OW * RES, OH * RES);
  const ig = isle.getContext('2d');
  const toLayer = (g) => g.setTransform(RES, 0, 0, RES, -OX * RES, -OY * RES);
  // Panza de roca: masa ancha que se estrecha hacia abajo.
  {
    const bw = 1240, bh = 330, bx = 960, by = 570;
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const width = bw * 0.5 * Math.pow(1 - t, 0.8);
      const k = Math.max(1, Math.round(9 * (1 - t)) + 1);
      for (let j = 0; j < k; j++) {
        const f = k === 1 ? 0 : (j / (k - 1) - 0.5) * 2;
        const r = Math.max(6, width * (0.2 + rng() * 0.1));
        puffs.push({ x: bx + f * width * 0.85 - OX, y: by + t * bh - OY, rx: r * 0.9, ry: r * 1.3, z: (1 - Math.abs(f)) * r * 0.4 + (1 - t) * 30 });
      }
    }
    const ramp = makeRamp([[0, ROCK_DAY.deep], [0.3, ROCK_DAY.shade], [0.52, ROCK_DAY.mid], [0.72, ROCK_DAY.lit], [0.9, ROCK_DAY.hi]], 2.0);
    const belly = renderMass(OW, OH, puffs, {
      light: L, ramp, sharpK: 0.08, edgeAmp: 0.16, edgeFreq: 0.03, brushAmp: 0.15, brushFreq: 0.035, brushStretch: 6,
      ao: 0.6, aoRadius: 10, aoRange: 16, bump: 1.3, wrap: 0.3, seed: 5, vertical: { top: by - OY, bottom: by + bh - OY, amount: 0.35 },
    });
    ig.drawImage(belly, 0, 0, OW * RES, OH * RES);
  }
  toLayer(ig);
  // Tapa de hierba (elipse) con prado fino: se pinta a escala reducida para
  // que las matas salgan pequeñas, y se recorta con la elipse.
  const CAPX = 960, CAPY = 560, CAPRX = 612, CAPRY = 66;
  {
    const cw = CAPRX * 2, ch = CAPRY * 2 + 30;
    const cap = makeCanvas(cw * RES, ch * RES);
    const g = cap.getContext('2d');
    const k = 0.42 * RES;
    g.scale(k, k);
    paintMeadow(g, rng, 0, 0, cw * RES / k, ch * RES / k, { pal: { ...MEADOW_DAY, far: '#b4e05c', near: '#6dbb2e' }, density: 0.55, lean: 0.12, flowers: 1.2 });
    g.setTransform(RES, 0, 0, RES, 0, 0);
    paintFlowers(g, rng, 0, 10, cw, ch - 10, { n: 900, near: 4.5, far: 1.2, seed: 8 });
    // Sombra en la parte delantera de la tapa (el canto se curva hacia abajo).
    const gr = g.createLinearGradient(0, ch * 0.55, 0, ch);
    gr.addColorStop(0, 'rgba(30,90,30,0)'); gr.addColorStop(1, 'rgba(30,90,30,0.45)');
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath(); g.ellipse(CAPRX, CAPRY + 6, CAPRX, CAPRY, 0, 0, Math.PI * 2); g.fill();
    // Labio colgante bajo la tapa.
    ig.fillStyle = '#3f7f2c';
    ig.beginPath(); ig.ellipse(CAPX, CAPY + 14, CAPRX + 4, CAPRY + 6, 0, 0, Math.PI * 2); ig.fill();
    ig.drawImage(cap, CAPX - CAPRX, CAPY - CAPRY - 6, cw, ch);
  }
  // Briznas colgantes y lianas en el canto delantero.
  for (let i = 0; i < 240; i++) {
    const a = Math.PI * (0.03 + rng() * 0.94);
    const x = CAPX + Math.cos(a) * CAPRX * 1.0, y = CAPY + 14 + Math.sin(a) * (CAPRY + 6);
    tuft(ig, rng, x, y + 4, -(6 + rng() * 10), { a: '#2f6a25', b: '#3f7f2c', c: '#5c9a38' });
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.1 + rng() * 0.8);
    vine(ig, rng, CAPX + Math.cos(a) * CAPRX * 0.98, CAPY + 16 + Math.sin(a) * CAPRY, 40 + rng() * 110, { sway: (rng() - 0.5) * 20, leaves: 0.7 });
  }
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
  for (let i = 0; i < 40; i++) {
    const a = Math.PI * (0.05 + rng() * 0.9);
    tuft(ig, rng, CAPX + Math.cos(a) * CAPRX * 0.95, CAPY + Math.sin(a) * CAPRY * 0.9, 10 + rng() * 16);
  }
  ig.setTransform(1, 0, 0, 1, 0, 0);
  painterly(isle, { seed: 31, size: 5 * RES, alpha: 0.3, stretch: 1.8, soften: 0.6, density: 0.55 });

  // ─── La llave ─────────────────────────────────────────────────────────────
  const key = makeKey(340);
  const motes = [];
  for (let i = 0; i < 70; i++) motes.push({ x: rng(), y: rng(), s: 1 + rng() * 2.6, v: 8 + rng() * 20, ph: rng() * 6.28, tw: 1 + rng() * 3 });
  const petals = makePetals(rng, 26, { y0: 120, y1: 700, sMin: 3, sMax: 9 });
  const bokeh = shared.bokeh;

  return function shrine(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    g.imageSmoothingQuality = 'low';
    Object.assign(post, P.post);
    post.bloom = 0.42; post.threshold = 0.74; post.vignette = 0.42;
    // Travelling lento hacia la llave.
    const e = smoother(u);
    const zoom = lerp(1.0, 1.24, e);
    const cam = { x: lerp(-14, 6, e), y: (KY - CY) * (1 - 1 / zoom) + lerp(10, 0, e), zoom };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };

    at(8); g.drawImage(sky, SKX, SKY);
    // Dos siluetas de llave tenues que aparecen en el cielo al final.
    const ghost = smooth(invLerp(0.68, 0.95, u));
    if (ghost > 0) {
      for (const [x, y, k, a0] of [[420, 170, 0.32, 0.4], [1530, 128, 0.28, 2.1]]) {
        const ang = a0 + t * 0.5;
        drawKey(g, key, x, y + Math.sin(t * 1.1 + a0) * 4, ang, k * 0.5, { alpha: ghost * 0.35 });
        at(8, f.glow);
        drawKeyGlow(f.glow, key, x, y, ang, k * 0.5, ghost * 0.5);
        glow(f.glow, x, y, 70, '#ffd27a', ghost * 0.25);
      }
    }
    // El mar compartido tiene su horizonte a 0,22 × 360 px de su borde superior.
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
    g.save();
    g.globalCompositeOperation = 'screen';
    glow(g, KX, ky, 240, '#ffd98a', 0.28 * pulse);
    g.restore();
    drawKey(g, key, KX, ky, ang, 0.5);
    glow(f.glow, KX, ky, 200, '#ffcf6a', 0.32 * pulse);
    drawKeyGlow(f.glow, key, KX, ky, ang, 0.5, 0.55 * pulse);
    // Destello que recorre la llave al girar.
    const flash = Math.pow(Math.max(0, Math.cos(ang * 2)), 24);
    if (flash > 0.02) glow(f.glow, KX - 18, ky - 50, 60, '#ffffff', flash * 0.7);

    // Primer término: la hierba del acantilado vecino.
    at(0.65);
    drawWaving(g, shared.fg, -260, 488, t + 3, WIND, shared.fgLit, { cw: 10 });
    drawPetals(g, petals, t * 0.6, { alpha: 0.9 });
    at(0.5);
    g.save(); g.translate(2080, 0); g.scale(-1, 1); g.drawImage(bokeh, -40, 470); g.restore();

    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.1);
    // Rayos de sol desde lo alto del haz.
    post.rays = 0.32; post.sun = sunUV(950, 30); post.raysDecay = 0.955; post.raysDensity = 0.9;
    g.imageSmoothingQuality = 'high';
  };
}
