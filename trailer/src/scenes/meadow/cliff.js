// Plano «cliff»: la exploradora de pie, de espaldas, en la punta de un
// acantilado de hierba alta. Debajo, el mar de nubes; a lo lejos, el
// archipiélago con el gran árbol. Cielo, cúmulos y prado calibrados con
// docs/estilo.png (la referencia del cliente).

import { place } from '../../engine/stage.js';
import { mulberry32, paintSky, cumulusMass, drawMass, cloudSeaMass, paintMeadow, painterly, bokehFlowers, paintStreaks, applyPaper, paintWaterfall, makeCanvas, fillBlob, css, mix, blade, SKY_DAY, MEADOW_DAY, CLOUD_DAY } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { drawGirlStandingBack } from '../../characters/girl.js';
import { clamp, lerp, smooth, smoother, invLerp } from '../../lib/util.js';
import { paintFlowers, grassStrip, litCopy, drawWaving, makeBlades, drawBlades, makePetals, drawPetals, paintIsle } from './brushes.js';

const CX = 960, CY = 400;
const P = PAL.day;
const L = [-0.5, -0.85, 0.3];
// Viento hacia la derecha: olas que avanzan en +x.
const WIND = { amp: 0.17, bias: 0.45, k: 0.0105, speed: 3.0 };

// Perfil del prado (coordenadas de pantalla en reposo): borde lejano que baja
// de izquierda a derecha hasta la punta, y labio del acantilado que se acerca
// a cámara por la derecha.
const farEdge = (x) => 438 + 140 * Math.pow(clamp((x + 220) / 1510), 1.25) + 5 * Math.sin(x * 0.008 + 1) + 3 * Math.sin(x * 0.031);
const TIPX = 1292;
const TIPY = farEdge(TIPX);
const LIP = [[TIPX, TIPY], [1345, TIPY + 13], [1425, TIPY + 55], [1520, TIPY + 122], [1610, TIPY + 196], [1690, TIPY + 290]];
function lipY(x) {
  for (let i = 1; i < LIP.length; i++) {
    if (x <= LIP[i][0]) { const [x0, y0] = LIP[i - 1], [x1, y1] = LIP[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); }
  }
  return LIP[LIP.length - 1][1] + (x - LIP[LIP.length - 1][0]) * 1.2;
}
const edgeY = (x) => (x <= TIPX ? farEdge(x) : lipY(x));
const GIRL_X = 1212;
const GIRL_Y = farEdge(GIRL_X) + 7;

export async function buildCliff(env) {
  const rng = mulberry32(2307);
  let __t = performance.now();
  const TT = (name, c) => { if (c) c.getContext('2d').getImageData(0, 0, 1, 1); const n = performance.now(); console.warn('T', name, Math.round(n - __t)); __t = n; };

  // ─── Cielo y cúmulos (profundidad 8) ──────────────────────────────────────
  const SKX = -40, SKY = -40;
  const sky = makeCanvas(2000, 880);
  {
    const g = sky.getContext('2d');
    paintSky(g, 2000, 880, { ...SKY_DAY, horizonY: (440 - SKY) / 880, seed: 4, streaks: 0.35 });
    // Estelas finas en diagonal, arriba a la izquierda (como en la referencia).
    paintStreaks(g, mulberry32(5), 120 - SKX, 150 - SKY, 900, 0.27, { n: 2, alpha: 0.5, width: 3 });
    paintStreaks(g, mulberry32(6), 40 - SKX, 300 - SKY, 700, 0.21, { n: 2, alpha: 0.35, width: 2.5 });
    painterly(sky, { seed: 9, size: 18, alpha: 0.25, stretch: 3, soften: 1.5, angle: () => 0.1 });
    const cl = (w, h, o, x, y) => drawMass(g, cumulusMass(rng, w, h, { light: L, pal: CLOUD_DAY, ...o }), x - SKX, y - SKY);
    cl(440, 290, { tower: 0.8, seed: 9 }, 230, 452);
    cl(300, 150, { tower: 0.5, seed: 14, haze: 0.22, hazeColor: P.haze }, 760, 446);
    cl(560, 220, { tower: 0.5, seed: 6 }, 1850, 462);
    cl(880, 470, { tower: 1.5, seed: 31 }, 1420, 474);
    // Bruma del horizonte: funde las bases de los cúmulos.
    const hz = g.createLinearGradient(0, 380 - SKY, 0, 470 - SKY);
    hz.addColorStop(0, css(SKY_DAY.bottom, 0)); hz.addColorStop(1, css(SKY_DAY.bottom, 0.85));
    g.fillStyle = hz; g.fillRect(0, 380 - SKY, 2000, 880);
  }

  TT('sky', sky);
  // ─── Mar de nubes (profundidad 4) ─────────────────────────────────────────
  const SEX = -40, SEY = 428;
  const sea = cloudSeaMass(rng, 2000, 380, { pal: CLOUD_DAY, light: [-0.5, -0.8, 0.4], haze: P.haze, hazeTop: 0.9, clusters: 300, seed: 7, horizon: 0.0 });

  TT('sea', sea);
  // ─── Archipiélago (profundidad 3,2) ───────────────────────────────────────
  const isles = [
    { c: paintIsle(rng, 100, 80, { trees: [{ x: -0.1, dy: 0, h: 46 }], haze: 0.45, hazeColor: P.haze, seed: 3 }), x: 470, y: 356 },
    { c: paintIsle(rng, 70, 56, { trees: [{ x: 0.1, dy: 0, h: 32 }], haze: 0.52, hazeColor: P.haze, seed: 4 }), x: 905, y: 380 },
    { c: paintIsle(rng, 130, 100, { trees: [{ x: -0.35, dy: -0.2, h: 56 }, { x: 0.3, dy: 0.3, h: 42 }], haze: 0.38, hazeColor: P.haze, seed: 5 }), x: 1860, y: 322 },
    { c: paintIsle(rng, 230, 170, { trees: [{ x: -0.72, dy: 0.25, h: 44 }, { x: 0.05, dy: -0.1, h: 250, big: true }, { x: 0.72, dy: 0.2, h: 50 }], haze: 0.18, hazeColor: P.haze, seed: 6, roots: 8 }), x: 1575, y: 412 },
  ];

  for (const i of isles) i.c.getContext('2d').getImageData(0,0,1,1); TT('isles');
  // ─── Nubes cercanas bajo el acantilado (profundidad 2) ────────────────────
  const near = [
    { c: cumulusMass(rng, 420, 170, { light: L, pal: CLOUD_DAY, tower: 0.4, seed: 42, haze: 0.15, hazeColor: P.haze }), x: 1440, y: 790 },
    { c: cumulusMass(rng, 760, 260, { light: L, pal: CLOUD_DAY, tower: 0.5, seed: 41 }), x: 1830, y: 820 },
  ];

  for (const i of near) i.c.getContext('2d').getImageData(0,0,1,1); TT('near');
  // ─── Prado de la isla (profundidad 1) ─────────────────────────────────────
  const MX = -230, MY = 400, MW = 1960, MH = 520;
  const meadowPath = new Path2D();
  meadowPath.moveTo(MX - MX, farEdge(MX) - MY);
  for (let x = MX; x <= TIPX; x += 8) meadowPath.lineTo(x - MX, farEdge(x) - MY);
  for (const [x, y] of LIP) meadowPath.lineTo(x - MX, y - MY);
  meadowPath.lineTo(1700 - MX, MH); meadowPath.lineTo(0, MH); meadowPath.closePath();
  const meadow = makeCanvas(MW, MH);
  const inMeadow = (x, y) => y > edgeY(x + MX) - MY && x + MX < 1700;
  {
    const g = meadow.getContext('2d');
    // Se pinta sin recorte (recortar cada pincelada es carísimo) y se enmascara al final.
    paintMeadow(g, rng, 0, 30, MW, MH - 30, { pal: MEADOW_DAY, density: 1.15, lean: 0.18, flowers: 2.5 });
    paintFlowers(g, rng, 0, 40, MW, MH - 40, { n: 2600, near: 13, far: 1.3, seed: 3, mask: inMeadow });
    // Esquina de primer término en sombra verde (como en la referencia).
    const gr = g.createRadialGradient(-MX + 40, MH - 20, 20, -MX + 40, MH - 20, 620);
    gr.addColorStop(0, 'rgba(12,60,22,0.78)'); gr.addColorStop(0.55, 'rgba(18,80,28,0.35)'); gr.addColorStop(1, 'rgba(18,80,28,0)');
    g.fillStyle = gr; g.fillRect(0, 0, MW, MH);
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = '#000'; g.fill(meadowPath);
    g.globalCompositeOperation = 'source-over';
    const fr = [];
    for (let x = MX; x <= TIPX; x += 12) fr.push([x - MX, farEdge(x) - MY]);
    paintMeadow(g, rng, 0, 0, 0, 0, { fringe: fr, pal: MEADOW_DAY, lean: 0.3 });
    TT('meadow-paint', meadow);
    painterly(meadow, { seed: 4, size: 6, alpha: 0.35, stretch: 1.8, soften: 0.5, density: 0.7 });
  }
  TT('meadow-painterly', meadow);

  // ─── Franjas de hierba alta (ondulan) ─────────────────────────────────────
  // Borde: briznas con la raíz sobre el perfil, más altas cuanto más cerca.
  const EX = 640, EW = 1120, ETOP = 330;
  const edgeBase = (x) => edgeY(x + EX) - ETOP;
  const edgeScale = (x) => clamp((edgeY(x + EX) - 380) / 210, 0.45, 2.4);
  const edge = grassStrip(rng, EW, 620, edgeBase, { pal: MEADOW_DAY, count: 520, hMin: 16, hMax: 52, lean: 0.25, fill: false, tuft: 4, scale: edgeScale, flowers: 30, rootJitter: 0.4 });
  TT('edge', edge.canvas);
  const edgeLit = litCopy(edge);
  // Delante de los pies de la chica.
  const FEX = 1110;
  const feet = grassStrip(rng, 230, 620, (x) => edgeY(x + FEX) - ETOP + 10, { pal: MEADOW_DAY, count: 40, hMin: 18, hMax: 46, lean: 0.25, fill: false, tuft: 3, scale: (x) => edgeScale(x + FEX - EX) });
  // Primer término (profundidad 0,8): matas y flores sobre el borde inferior.
  const FX = -260, FW = 2000, FTOP = 520;
  const fBase = (x) => 330 + Math.sin(x * 0.004) * 14;
  const fg = grassStrip(rng, FW, 400, fBase, { pal: { ...MEADOW_DAY, near: mix(MEADOW_DAY.near, MEADOW_DAY.dark, 0.25) }, count: 900, hMin: 40, hMax: 150, lean: 0.25, fill: true, tuft: 5, flowers: 90, flowerSize: [7, 17], xMask: (x) => x + FX < 1560 });
  {
    // Sombra de la esquina izquierda sobre la franja.
    const g = fg.canvas.getContext('2d');
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createRadialGradient(240, 400, 30, 240, 400, 760);
    gr.addColorStop(0, 'rgba(10,52,20,0.7)'); gr.addColorStop(0.6, 'rgba(14,66,24,0.25)'); gr.addColorStop(1, 'rgba(14,66,24,0)');
    g.fillStyle = gr; g.fillRect(0, 0, FW, 400);
  }
  TT('fg', fg.canvas);
  const fgLit = litCopy(fg, '#e8ff9a', 0.35);
  const blades = makeBlades(rng, 160, FX + 40, 1500, (x) => FTOP + fBase(x - FX) + 30, { hMin: 70, hMax: 210, pal: MEADOW_DAY });
  const lipBlades = makeBlades(rng, 70, 1300, 1660, (x) => lipY(x) + 6, { hMin: 24, hMax: 70, pal: MEADOW_DAY });
  for (const b of lipBlades) b.h *= clamp((b.y - 380) / 210, 0.6, 2.2);
  // Flores grandes desenfocadas (profundidad 0,6), pintadas una vez.
  const bokeh = makeCanvas(820, 560);
  bokehFlowers(bokeh.getContext('2d'), mulberry32(8), 120, 200, 270, 7);
  TT('bokeh', bokeh);
  const petals = makePetals(rng, 70, { y0: 120, y1: 760, sMin: 3, sMax: 13 });
  const farPetals = makePetals(rng, 50, { y0: 260, y1: 620, sMin: 1.5, sMax: 4 });

  // Ráfagas: manchas de luz que barren el prado con el viento.
  const gusts = [];
  for (let i = 0; i < 6; i++) gusts.push({ x: rng() * 2400 - 300, y: lerp(500, 760, rng()), r: lerp(220, 420, rng()), v: lerp(220, 320, rng()) });

  return function cliff(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.35; post.threshold = 0.8; post.vignette = 0.38;
    // La cámara se acerca despacio a la chica.
    const e = smoother(u);
    const zoom = lerp(1.0, 1.11, e);
    const gx = GIRL_X - CX, gy = GIRL_Y - 180 - CY;
    const cam = { x: gx * (1 - 1 / zoom) * 0.85 + lerp(-12, 12, e), y: gy * (1 - 1 / zoom) * 0.6 + lerp(6, -6, e), zoom };
    // Coloca la capa de profundidad d con coordenadas de pantalla en reposo.
    const at = (d) => { place(g, cam, d); g.translate(-CX, -CY); };

    g.imageSmoothingQuality = 'low';
    let __f = performance.now();
    const FT = (n) => { g.getImageData(0, 0, 1, 1); const q = performance.now(); console.warn('F', n, Math.round(q - __f)); __f = q; };
    at(8); g.drawImage(sky, SKX, SKY); FT('sky');
    at(4); g.drawImage(sea, SEX, SEY); FT('sea');
    at(3.2);
    for (const is of isles) drawMass(g, is.c, is.x, is.y);
    paintWaterfall(g, 1640, 418, 6, 110, t, { seed: 4, alpha: 0.7 });
    paintWaterfall(g, 1840, 326, 4, 56, t, { seed: 5, alpha: 0.55 });
    FT('isles'); at(2);
    for (const n of near) drawMass(g, n.c, n.x + Math.sin(t * 0.3) * 4, n.y);

    at(1);
    FT('near'); g.drawImage(meadow, MX, MY); FT('meadow');
    // Ráfagas de luz sobre el prado.
    g.save();
    g.translate(MX, MY);
    g.clip(meadowPath);
    g.globalCompositeOperation = 'screen';
    for (const q of gusts) {
      const x = ((q.x + q.v * t + 300) % 2400) - 300 - MX;
      g.save();
      g.translate(x, q.y - MY); g.scale(1, 0.16 + (q.y - 480) / 1400);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, q.r);
      gr.addColorStop(0, 'rgba(230,255,150,0.2)'); gr.addColorStop(1, 'rgba(230,255,150,0)');
      g.fillStyle = gr; g.fillRect(-q.r, -q.r, q.r * 2, q.r * 2);
      g.restore();
    }
    g.restore();
    FT('gusts'); drawPetals(g, farPetals, t, { alpha: 0.85 });
    drawWaving(g, edge, EX, ETOP, t, WIND, edgeLit, { cw: 6 }); FT('edge');
    // Sombra de la chica sobre la hierba (luz delante a la izquierda).
    fillBlob(g, GIRL_X + 30, GIRL_Y - 2, 46, 9, '#1f6d22', 0.35, { wobble: 0.2, seed: 2 });
    drawGirlStandingBack(g, t, { x: GIRL_X, y: GIRL_Y, size: 370, wind: 1, windDir: 1 });
    drawWaving(g, feet, FEX, ETOP, t, WIND, null, { cw: 6 });
    drawBlades(g, lipBlades, t, WIND); FT('girl+feet+lip');

    at(0.8);
    drawWaving(g, fg, FX, FTOP, t, WIND, fgLit, { cw: 8 }); FT('fg');
    drawBlades(g, blades, t, WIND);
    FT('blades'); drawPetals(g, petals, t); FT('petals');
    at(0.6);
    g.drawImage(bokeh, -150, 520);
    g.setTransform(1, 0, 0, 1, 0, 0);
    FT('bokeh'); applyPaper(g, env.paper, 0.1); FT('paper');
  };
}
