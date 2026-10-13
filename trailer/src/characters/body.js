// La protagonista de cuerpo entero, de espaldas: sentada en el tejado con el
// chubasquero y de pie con la ropa de exploradora y la bufanda al viento.
// Espacio de dibujo: 1000 unidades = altura de pie; y negativa hacia arriba.

import { GIRL, INK } from '../engine/style.js';
import { mix, shade } from '../engine/paint.js';
import { celShadow } from '../engine/style.js';
import {
  TAU, lerp, clamp, sstep, curve, sample, ell, mirror, moved, toner, lightDir,
  fill, line, inked, crescent, clipped, castShadow, taper, ribbon, cel, hash,
} from './ink.js';

const HAIR_INK = '#1d1311';
const sh = (c, k = 0.78) => celShadow(c, k);

// Grosor de línea en unidades con un mínimo en píxeles de pantalla.
const widths = (k, a = 5, b = 3) => [Math.max(a, 1.25 / k), Math.max(b, 0.75 / k)];

// ─── Sentada de espaldas ────────────────────────────────────────────────────
export function drawSitting(g, t, { x, y, size, look = 0, hood = true, tint = null, light = null, rim = null }) {
  const k = size / 1000;
  const C = toner(tint);
  const L = lightDir(light);
  const sxL = L[0] <= 0 ? 1 : -1;
  const [lw, lw2] = widths(k, 5.5, 3);
  look = clamp(look);
  const br = Math.sin(t * TAU / 3.6) * 0.012;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const coat = C(GIRL.coat), coatSh = C(GIRL.coatShade), coatLine = C(GIRL.coatLine);

  // Botas rojas asomando a los lados (pies en la otra vertiente).
  for (const m of [-1, 1]) {
    const boot = curve([[m * 128, -10], [m * 170, -16], [m * 196, 4], [m * 186, 26, 1], [m * 120, 24, 1]]);
    cel(g, boot, C(GIRL.boots), C(sh(GIRL.boots)), L, 8, lw2);
  }
  // Cuerpo: espalda encorvada con los codos abiertos (respira).
  g.save();
  g.scale(1, 1 + br);
  const by = (v) => v;
  const body = curve([[0, -262], [70, -258], [118, -236], [140, -196], [158, -150], [176, -112], [170, -82], [160, -60], [170, -20], [186, 14, 1], [90, 22], [0, 26], [-90, 22], [-186, 14, 1], [-170, -20], [-160, -60], [-170, -82], [-176, -112], [-158, -150], [-140, -196], [-118, -236], [-70, -258]].map(([a, b, c]) => [a, by(b), c]));
  cel(g, body, coat, coatSh, L, 40, lw);
  // Codos: pliegues del brazo que abraza las rodillas.
  for (const m of [-1, 1]) {
    taper(g, [[m * 132, -200], [m * 152, -150], [m * 166, -104]], lw2, coatLine, { a: 0.2, b: 0.6 });
    taper(g, [[m * 150, -122], [m * 136, -96], [m * 140, -70]], lw2 * 0.9, coatLine, { a: 0.3, b: 0.6 });
  }
  // Canesú, costura central y abertura trasera.
  taper(g, [[-118, -214], [-60, -196], [0, -192], [60, -196], [118, -214]], lw2, coatLine, { a: 0.1, b: 0.9 });
  taper(g, [[0, -192], [3, -100], [0, -20]], lw2 * 0.9, coatLine, { a: 0.1, b: 0.8 });
  taper(g, [[0, 24], [2, -20]], lw2, C(INK), { a: 0.2, b: 0.8 });
  // Tensión de la tela en la espalda encorvada.
  for (const m of [-1, 1]) taper(g, [[m * 40, -150], [m * 76, -118], [m * 96, -70]], lw2 * 0.8, C(GIRL.coatLine, 0.7), { a: 0.3, b: 0.5 });
  // Reflejos de plástico mojado en el lado de la luz.
  clipped(g, body, () => {
    taper(g, [[-sxL * 112, -226], [-sxL * 136, -186], [-sxL * 150, -140]], 12, 'rgba(255,255,240,0.9)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
    taper(g, [[-sxL * 60, -246], [-sxL * 92, -238]], 8, 'rgba(255,255,240,0.85)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
  });
  if (rim) crescent(g, body, -L[0] * 10, -L[1] * 10, C(rim));
  g.restore();

  // Cabeza: capucha (o pelo) que se inclina hacia atrás al mirar arriba.
  const hy = -326 + look * 26 - br * 300;
  const hsy = 1 - look * 0.12;
  g.save();
  g.translate(0, hy);
  g.rotate(-0.04 * look * sxL);
  g.scale(1, hsy);
  if (hood) {
    // Borde delantero de la capucha que asoma al levantar la cara.
    if (look > 0.05) {
      const rimP = curve([[-92, -70], [-50, -112 - 14 * look], [0, -120 - 18 * look], [50, -112 - 14 * look], [92, -70], [60, -96], [0, -104], [-60, -96]]);
      cel(g, rimP, coat, coatSh, L, 10, lw2);
    }
    const hoodP = curve([[0, -112], [62, -104], [104, -66], [118, -10], [112, 40], [92, 74], [52, 92], [0, 98], [-52, 92], [-92, 74], [-112, 40], [-118, -10], [-104, -66], [-62, -104]]);
    cel(g, hoodP, coat, coatSh, L, 30, lw);
    // Costura central y fruncido en la nuca.
    taper(g, [[0, -112], [2, -40], [0, 40], [0, 96]], lw2, coatLine, { a: 0.1, b: 0.9 });
    for (const m of [-1, 1]) taper(g, [[m * 30, 96], [m * 44, 72], [m * 48, 52]], lw2 * 0.9, coatLine, { a: 0.3, b: 0.6 });
    clipped(g, hoodP, () => {
      taper(g, [[-sxL * 28, -96], [-sxL * 72, -76], [-sxL * 96, -36]], 13, 'rgba(255,255,240,0.92)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
      taper(g, [[-sxL * 100, -10], [-sxL * 102, 14]], 7, 'rgba(255,255,240,0.8)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
    });
    for (const [dx, dy, r] of [[34, -60, 6], [-58, 10, 5], [70, 30, 6], [-20, 50, 4.5]]) drawDropSmall(g, C, dx, dy, r, L);
    if (rim) crescent(g, hoodP, -L[0] * 8, -L[1] * 8, C(rim));
  } else {
    const hair = curve([[0, -104], [70, -94], [108, -50], [114, 10], [104, 64], [92, 96, 1], [64, 80], [44, 104, 1], [18, 84], [-6, 106, 1], [-30, 84], [-54, 104, 1], [-76, 82], [-96, 96, 1], [-108, 50], [-114, -10], [-104, -60], [-66, -96]]);
    cel(g, hair, C(GIRL.hair), C(GIRL.hairShade), L, 26, lw, C(HAIR_INK));
    for (const xx of [-60, -20, 24, 64]) taper(g, [[xx * 0.4, -80], [xx * 0.8, 0], [xx, 80]], lw2, C(HAIR_INK), { a: 0.2, b: 0.5 });
  }
  g.restore();
  // Unas gotas en la espalda.
  for (const [dx, dy, r] of [[-60, -180, 5], [96, -120, 6], [-110, -60, 5], [40, -60, 4]]) drawDropSmall(g, C, dx, dy, r, L);
  g.restore();
}

function drawDropSmall(g, C, x, y, r, L) {
  const p = ell(x, y, r, r * 1.15);
  fill(g, p, C(mix(GIRL.coat, GIRL.coatShade, 0.6)));
  crescent(g, p, L[0] * r * 0.4, L[1] * r * 0.4, C(GIRL.coatLine, 0.8));
  fill(g, ell(x + L[0] * r * 0.35, y + L[1] * r * 0.35, r * 0.32), '#ffffff');
}

// ─── De pie, de espaldas, exploradora ───────────────────────────────────────
// Bufanda: dos colas que salen del nudo y ondean hacia windDir con ondas que
// avanzan a lo largo de la tela.
function scarfTail(x0, y0, len, t, wind, dir, phase, n = 44) {
  const pts = [[x0, y0]];
  const ds = len / n;
  const base = dir > 0 ? lerp(Math.PI / 2, -0.12, wind) : lerp(Math.PI / 2, Math.PI + 0.12, wind);
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const s = i * ds, u = s / len;
    const amp = (0.08 + 0.38 * u) * (0.35 + 0.65 * wind);
    const wav = Math.sin(TAU * (s / 430 - t * 1.5) + phase) * amp + Math.sin(TAU * (s / 190 - t * 2.6) + phase * 2) * amp * 0.3;
    const sag = (1 - wind) * 0.4 * u;
    const th = base + dir * wav + (dir > 0 ? sag : -sag);
    px += Math.cos(th) * ds; py += Math.sin(th) * ds;
    pts.push([px, py]);
  }
  return pts;
}

export function drawStanding(g, t, { x, y, size, wind = 1, windDir = 1, tint = null, light = null, rim = null, face = 1 }) {
  const k = size / 1000;
  const C = toner(tint);
  const L = lightDir(light);
  const sxL = L[0] <= 0 ? 1 : -1;
  const [lw, lw2] = widths(k, 5, 2.8);
  const W = clamp(wind), D = windDir >= 0 ? 1 : -1;
  const fl = (i, a = 1) => D * W * a * (Math.sin(t * 9.1 + i * 1.7) * 0.6 + Math.sin(t * 5.3 + i * 0.9) * 0.4);
  const br = Math.sin(t * TAU / 3.4) * 2;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const skin = C(GIRL.skin), skinSh = C(GIRL.skinShade);

  // Cola corta de la bufanda (por detrás del cuerpo).
  const knot = [D * 58, -796 + br];
  const tail2 = scarfTail(knot[0], knot[1] + 8, 820, t + 0.37, W, D, 2.1);
  ribbon(g, tail2, (u) => lerp(62, 50, u), (u) => 0.6 + 1.4 * Math.sin(TAU * (u * 1.1 - t * 0.7) + 1), C(GIRL.scarf), C(GIRL.scarfShade), lw2 * 1.1, C(INK), { fringe: 22 });

  // Piernas, calcetines altos y botas.
  const legs = [];
  for (const m of [-1, 1]) {
    const leg = curve([[-98, -486], [-90, -400], [-80, -332], [-86, -246], [-76, -150], [-64, -82], [-36, -82], [-30, -160], [-28, -250], [-34, -332], [-40, -400], [-40, -486]].map((p) => [p[0] * (m < 0 ? 1 : -1) + (m > 0 ? 4 : 0), p[1]]));
    legs.push(leg);
    cel(g, leg, skin, skinSh, L, 16, lw2);
    clipped(g, leg, () => {
      const sock = new Path2D(); sock.rect(-200, -326, 400, 300);
      fill(g, sock, C(GIRL.socks));
      crescent(g, leg, L[0] * 16, L[1] * 16, C(sh(GIRL.socks, 0.84)));
      const band = new Path2D(); band.rect(-200, -326, 400, 26);
      fill(g, band, C(mix(GIRL.socks, '#ffffff', 0.3)));
      line(g, curve([[-200, -300], [200, -300]], false), lw2 * 0.8, C(INK));
      line(g, curve([[-200, -326], [200, -326]], false), lw2, C(INK));
    });
    line(g, leg, lw2);
    const bx = m * 52;
    const boot = curve([[bx - 30, -112], [bx + 30, -112], [bx + 38, -60], [bx + 40, -14], [bx + 36, 2, 1], [bx - 36, 2, 1], [bx - 40, -14], [bx - 38, -60]]);
    cel(g, boot, C(GIRL.shoes), C(sh(GIRL.shoes)), L, 14, lw);
    fill(g, curve([[bx - 37, -16, 1], [bx + 38, -16, 1], [bx + 36, 2, 1], [bx - 36, 2, 1]]), C(shade(GIRL.shoes, 0.6)));
    line(g, curve([[bx - 34, -96], [bx, -90], [bx + 34, -96]], false), lw2, C(INK));
    line(g, curve([[bx - 37, -16], [bx + 38, -16]], false), lw2 * 0.8, C(INK));
  }

  // Pantalón corto (aletea un poco) con la sombra del chaleco.
  const shorts = curve([[-96, -566], [96, -566], [110, -500], [124 + fl(1, 3), -430, 1], [72, -422], [14, -440, 1], [0, -454], [-14, -440, 1], [-72, -422], [-124 + fl(2, 3), -430, 1], [-110, -500]]);
  cel(g, shorts, C(GIRL.shorts), C(sh(GIRL.shorts)), L, 22, lw);
  for (const leg of legs) castShadow(g, moved(shorts, 0, 34), leg, C('#cdb9c0'));
  taper(g, [[0, -520], [0, -456]], lw2, C(INK), { a: 0.2, b: 0.8 });

  // Brazos: mangas remangadas, antebrazos y manos.
  const sw = Math.sin(t * 1.9) * 3;
  for (const m of [-1, 1]) {
    const M = (p) => [p[0] * m, p[1], p[2]];
    const fore = curve([[150, -640], [168, -572], [170, -508], [148, -504], [138, -566], [128, -630]].map(M).map(([a, b]) => [a + sw * m * 0.3, b]));
    cel(g, fore, skin, skinSh, L, 10, lw2);
    const hand = curve([[136, -512], [172, -514], [176, -478], [166, -452], [148, -446], [134, -470]].map(M).map(([a, b]) => [a + sw * m * 0.3, b]));
    cel(g, hand, skin, skinSh, L, 8, lw2);
    taper(g, [[150, -478], [158, -456]].map(M), lw2 * 0.7, C(INK), { a: 0.3, b: 0.6 });
    const sleeve = curve([[104, -804], [146, -786], [166, -720], [178 + fl(3 + m, 3), -650], [126, -626], [116, -700], [100, -760]].map(M));
    cel(g, sleeve, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 18, lw);
    const cuff = curve([[180 + fl(3 + m, 3), -664], [182 + fl(3 + m, 3), -640], [124, -620], [124, -646]].map(M));
    cel(g, cuff, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 8, lw2);
    taper(g, [[132, -740], [150, -700], [154, -668]].map(M), lw2 * 0.8, C(INK), { a: 0.3, b: 0.6 });
  }

  // Camisa (cuerpo) y chaleco por encima, con el bajo aleteando.
  const shirt = curve([[-110, -800], [0, -818], [110, -800], [122, -700], [112, -600], [108, -512, 1], [-108, -512, 1], [-112, -600], [-122, -700]]);
  cel(g, shirt, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 20, lw);
  const vest = curve([[-96, -796], [-40, -810], [0, -812], [40, -810], [96, -796], [108, -700], [100, -610], [104, -540], [112 + fl(5, 6), -512, 1], [56, -506 + fl(6, 3)], [0, -500], [-56, -506 + fl(7, 3)], [-112 + fl(8, 6), -512, 1], [-104, -540], [-100, -610], [-108, -700]]);
  cel(g, vest, C(GIRL.vest), C(sh(GIRL.vest)), L, 30, lw);
  taper(g, [[0, -810], [2, -700], [0, -502]], lw2, C(INK), { a: 0.1, b: 0.9 });
  // Trabilla trasera con dos botones.
  const belt = curve([[-74, -598, 1], [74, -598, 1], [74, -574, 1], [-74, -574, 1]]);
  cel(g, belt, C(GIRL.vest), C(sh(GIRL.vest)), L, 6, lw2);
  for (const m of [-1, 1]) inked(g, ell(m * 56, -586, 7), C(GIRL.brass), lw2 * 0.7);
  for (const m of [-1, 1]) taper(g, [[m * 70, -760], [m * 84, -690], [m * 80, -630]], lw2 * 0.8, C(INK, 0.8), { a: 0.3, b: 0.5 });

  // Cartera en bandolera: correa diagonal y bolsa en la cadera izquierda.
  const strap = curve([[64, -808, 1], [88, -800, 1], [-120, -556, 1], [-142, -568, 1]]);
  cel(g, strap, C(GIRL.bag), C(sh(GIRL.bag)), L, 5, lw2);
  const bag = curve([[-202, -600], [-96, -606], [-88, -540], [-92, -486, 1], [-196, -480, 1], [-206, -540]].map(([a, b, c]) => [a + fl(9, 2), b, c]));
  cel(g, bag, C(GIRL.bag), C(sh(GIRL.bag)), L, 18, lw);
  const flap = curve([[-204, -600], [-94, -606], [-96, -560], [-146, -546], [-200, -556]].map(([a, b]) => [a + fl(9, 2), b]));
  cel(g, flap, C(mix(GIRL.bag, '#c08850', 0.25)), C(sh(GIRL.bag)), L, 8, lw2);
  inked(g, curve([[-156, -562, 1], [-138, -562, 1], [-138, -540, 1], [-156, -540, 1]].map(([a, b, c]) => [a + fl(9, 2), b, c])), C(GIRL.brass), lw2 * 0.8);
  castShadow(g, moved(bag, 6, 10), shorts, C('#cdb9c0'));

  // Bufanda enrollada al cuello y nudo.
  const wrap = curve([[-82, -836], [0, -852], [82, -836], [96, -804], [64, -774], [0, -768], [-64, -774], [-96, -804]].map(([a, b]) => [a, b + br]));
  cel(g, wrap, C(GIRL.scarf), C(GIRL.scarfShade), L, 14, lw);
  for (const xx of [-50, -10, 30]) taper(g, [[xx, -840 + br], [xx + 12, -808 + br], [xx + 6, -776 + br]], lw2 * 0.8, C(INK), { a: 0.3, b: 0.5 });

  // Cabeza de espaldas: mejilla asomando, gafas en la cabeza y media melena.
  const hx = face * 6;
  if (face) {
    const cheek = curve([[face * 92, -906], [face * 120, -872], [face * 116, -838], [face * 96, -826]]);
    cel(g, cheek, skin, skinSh, L, 6, lw2);
  }
  // Copas de las gafas (asoman por encima de la coronilla) y antena.
  for (const m of [-1, 1]) {
    const cup = ell(hx + m * 42, -994, 40, 20);
    cel(g, cup, C(GIRL.copper), C(sh(GIRL.copper, 0.7)), L, 6, lw2);
  }
  const sway = Math.sin(t * 3.1) * 0.08 * (0.4 + W) - D * W * 0.12;
  const ax0 = hx + 70, ay0 = -1004;
  const atx = ax0 + Math.sin(0.35 + sway) * 120, aty = ay0 - Math.cos(0.35 + sway) * 120;
  taper(g, [[ax0, ay0], [lerp(ax0, atx, 0.5) - 3, lerp(ay0, aty, 0.5)], [atx, aty]], Math.max(4, 1.6 / k), C(INK), { w0: 1, w1: 0.7 });
  inked(g, ell(atx, aty, 9), C(GIRL.antennaTip), lw2);
  fill(g, ell(atx - 3, aty - 3, 3), '#ffffff');
  const hairPts = [[0, -1004], [70, -994], [110, -948], [120, -884], [116, -836], [104, -802, 1], [82, -822], [62, -796, 1], [38, -820], [12, -792, 1], [-14, -818], [-40, -796, 1], [-62, -822], [-86, -800, 1], [-106, -834], [-118, -884], [-112, -948], [-72, -994]]
    .map(([a, b, c], i) => [hx + a + (b > -860 ? fl(i, 10 + (b + 860) * -0.3) : 0), b, c]);
  const hair = curve(hairPts);
  cel(g, hair, C(GIRL.hair), C(GIRL.hairShade), L, 26, lw, C(HAIR_INK));
  for (const [x0, x1] of [[-70, -92], [-24, -40], [22, 30], [66, 84]]) taper(g, [[hx + x0 * 0.5, -985], [hx + x0, -920], [hx + x1 + fl(x0, 8), -830]], lw2, C(HAIR_INK), { a: 0.2, b: 0.5 });
  // Brillo del pelo.
  clipped(g, hair, () => {
    for (let i = 0; i < 4; i++) {
      const a0 = -2.6 + i * 0.28, a1 = a0 + 0.2;
      const pt = (a) => [hx + Math.cos(a) * 92 * sxL, -905 + Math.sin(a) * 80];
      taper(g, [pt(a0), pt((a0 + a1) / 2), pt(a1)], 10 * (1 - i * 0.18), C(GIRL.hairHi, 0.9), { a: 0.45, b: 0.55, w0: 0.05, w1: 0.05 });
    }
  });
  // Correa de las gafas alrededor de la cabeza y cajita de pilas.
  const band = curve([[hx - 120, -922], [hx, -944], [hx + 122, -922], [hx + 120, -900], [hx, -920], [hx - 118, -900]]);
  g.save(); g.clip(hair);
  cel(g, band, C(GIRL.strap), C(sh(GIRL.strap, 0.7)), L, 6, lw2);
  g.save(); g.setLineDash([8, 7]); line(g, curve([[hx - 116, -911], [hx, -932], [hx + 118, -911]], false), Math.max(1.5, 0.5 / k), C('#c79a6a', 0.9)); g.restore();
  g.restore();
  inked(g, curve([[hx - 132, -940, 1], [hx - 104, -944, 1], [hx - 102, -900, 1], [hx - 130, -896, 1]]), C(mix(GIRL.brass, '#6d5a3a', 0.35)), lw2);
  // Mechones sueltos al viento.
  if (W > 0.05) {
    for (let i = 0; i < 3; i++) {
      const y0 = -880 + i * 26, x0 = hx + D * 100;
      const len = (60 + i * 18) * W;
      const wv = Math.sin(t * 8 + i * 2) * 10 * W;
      const lock = curve([[x0, y0 - 10], [x0 + D * len * 0.5, y0 - 6 + wv * 0.5], [x0 + D * len, y0 + 4 + wv, 1], [x0 + D * len * 0.45, y0 + 10 + wv * 0.4], [x0 - D * 4, y0 + 16]]);
      cel(g, lock, C(GIRL.hair), null, L, 0, lw2, C(HAIR_INK));
    }
  }

  // Cola larga de la bufanda (por delante).
  const tail1 = scarfTail(knot[0], knot[1], 1350, t, W, D, 0);
  ribbon(g, tail1, (u) => lerp(72, 56, u), (u) => 0.4 + 1.5 * Math.sin(TAU * (u * 1.25 - t * 0.6)), C(GIRL.scarf), C(GIRL.scarfShade), lw2 * 1.15, C(INK), { fringe: 26 });
  const knotP = ell(knot[0], knot[1], 30, 24, 0.3 * D);
  cel(g, knotP, C(GIRL.scarf), C(GIRL.scarfShade), L, 8, lw);
  if (rim) {
    for (const p of [hair, vest, shirt, shorts]) crescent(g, p, -L[0] * 8, -L[1] * 8, C(rim));
  }
  g.restore();
}
