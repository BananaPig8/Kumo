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
// Tres cuartos de espaldas, girada un poco a la derecha (facing=-1 la refleja):
// espalda encorvada, el brazo que abraza las rodillas, la espinilla y la bota
// asomando por delante, y la capucha con su borde.
export function drawSitting(g, t, { x, y, size, look = 0, hood = true, tint = null, light = null, rim = null, facing = 1 }) {
  const k = size / 1000;
  const C = toner(tint);
  const f = facing >= 0 ? 1 : -1;
  const L0 = lightDir(light);
  const L = [L0[0] * f, L0[1]];
  const sxL = L[0] <= 0 ? 1 : -1;
  const [lw, lw2] = widths(k, 5.5, 3);
  look = clamp(look);
  const br = Math.sin(t * TAU / 3.6) * 0.012;
  g.save();
  g.translate(x, y);
  g.scale(k * f, k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const coat = C(GIRL.coat), coatSh = C(GIRL.coatShade), coatLine = C(GIRL.coatLine);
  const navy = C(GIRL.leggings), navySh = C(sh(GIRL.leggings, 0.7));

  // Pierna de atrás (apenas asoma) y su bota.
  const farLeg = curve([[84, -140], [118, -186], [150, -180], [164, -120], [176, -40], [150, -36], [136, -104], [110, -134]]);
  cel(g, farLeg, C(shade(GIRL.leggings, 0.85)), navySh, L, 12, lw2);
  const farBoot = curve([[142, -54], [180, -58], [192, -22], [222, -4], [224, 14, 1], [140, 16, 1], [138, -20]]);
  cel(g, farBoot, C(shade(GIRL.boots, 0.85)), C(sh(GIRL.boots)), L, 8, lw2);

  // Espalda encorvada (respira).
  g.save();
  g.scale(1, 1 + br);
  const body = curve([[-6, -274], [-80, -258], [-128, -216], [-152, -154], [-162, -84], [-174, -24], [-194, 14, 1], [-60, 26], [70, 22], [136, 10, 1], [134, -40], [124, -120], [116, -190], [88, -246], [42, -270]]);
  cel(g, body, coat, coatSh, L, 40, lw);
  // Canesú, costura central, abertura y pliegues de la espalda encorvada.
  taper(g, [[-124, -210], [-60, -200], [10, -200], [80, -214], [104, -232]], lw2, coatLine, { a: 0.1, b: 0.9 });
  taper(g, [[0, -200], [4, -100], [0, -20]], lw2 * 0.9, coatLine, { a: 0.1, b: 0.8 });
  taper(g, [[-2, 24], [0, -24]], lw2, C(INK), { a: 0.2, b: 0.8 });
  taper(g, [[-150, -150], [-128, -120], [-130, -84]], lw2, coatLine, { a: 0.2, b: 0.6 });
  taper(g, [[-60, -150], [-96, -110], [-104, -60]], lw2 * 0.8, C(GIRL.coatLine, 0.7), { a: 0.3, b: 0.5 });
  taper(g, [[50, -150], [80, -110], [92, -64]], lw2 * 0.8, C(GIRL.coatLine, 0.7), { a: 0.3, b: 0.5 });
  clipped(g, body, () => {
    taper(g, [[-sxL * 30, -258], [-sxL * 86, -236], [-sxL * 122, -196]], 12, 'rgba(255,255,240,0.9)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
    taper(g, [[-sxL * 146, -130], [-sxL * 152, -90]], 8, 'rgba(255,255,240,0.8)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
  });
  for (const [dx, dy, r] of [[-60, -180, 5], [70, -150, 6], [-110, -60, 5], [30, -70, 4], [-30, -236, 4.5]]) drawDropSmall(g, C, dx, dy, r, L);
  if (rim) crescent(g, body, -L[0] * 10, -L[1] * 10, C(rim));

  // Pierna de delante: espinilla y bota roja.
  const leg = curve([[96, -150], [132, -200], [172, -190], [190, -124], [206, -42], [176, -36], [158, -110], [130, -144]]);
  cel(g, leg, navy, navySh, L, 14, lw2);
  const boot = curve([[166, -58], [210, -62], [222, -24], [258, -6], [262, 16, 1], [164, 18, 1], [162, -22]]);
  cel(g, boot, C(GIRL.boots), C(sh(GIRL.boots)), L, 10, lw2);
  fill(g, curve([[164, 6, 1], [262, 6, 1], [262, 16, 1], [164, 18, 1]]), C(shade(GIRL.boots, 0.55)));
  line(g, boot, lw2);
  taper(g, [[168, -50], [190, -44], [210, -52]], lw2 * 0.8, C(INK), { a: 0.3, b: 0.7 });
  // Brazo que abraza las rodillas y la mano sobre la espinilla.
  const sleeve = curve([[66, -240], [114, -228], [148, -186], [176, -150], [212, -136], [218, -110], [184, -98], [140, -110], [100, -150], [62, -196]]);
  cel(g, sleeve, coat, coatSh, L, 22, lw);
  taper(g, [[112, -212], [134, -176], [156, -150]], lw2 * 0.9, coatLine, { a: 0.3, b: 0.6 });
  taper(g, [[176, -144], [182, -120], [176, -102]], lw2, C(INK), { a: 0.2, b: 0.8 });
  const hand = curve([[206, -132], [228, -134], [238, -118], [232, -100], [212, -96], [204, -112]]);
  cel(g, hand, C(GIRL.skin), C(GIRL.skinShade), L, 6, lw2);
  taper(g, [[222, -126], [230, -112]], lw2 * 0.7, C(INK), { a: 0.3, b: 0.6 });
  clipped(g, sleeve, () => taper(g, [[-sxL * 0 + 80, -232], [120, -218], [144, -190]], 9, 'rgba(255,255,240,0.85)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 }));
  g.restore();

  // Cabeza: la capucha se inclina hacia atrás al mirar arriba y su borde
  // (con un poco de pelo dentro) asoma por la derecha.
  const hy = -334 + look * 18 - br * 300;
  g.save();
  g.translate(10, hy + 70);
  g.rotate(-0.55 * look);
  g.translate(0, -70);
  if (hood) {
    const hoodP = curve([[-4, -108], [58, -102], [100, -70], [116, -18], [110, 36], [88, 72], [46, 92], [-6, 96], [-56, 88], [-94, 66], [-114, 28], [-118, -22], [-100, -68], [-60, -100]]);
    cel(g, hoodP, coat, coatSh, L, 28, lw);
    // Borde de la capucha (rulo) y dentro, en sombra, un poco de pelo.
    const inner = curve([[62, -98], [96, -64], [112, -16], [104, 36], [82, 70], [72, 60], [90, 22], [94, -24], [80, -66]]);
    fill(g, inner, C(mix(celShadow(GIRL.coatShade, 0.66), '#3b2b3a', 0.2)));
    const hairIn = curve([[80, -60], [92, -20], [88, 22], [76, 56], [70, 40, 1], [80, 10], [80, -30]]);
    fill(g, hairIn, C(GIRL.hair));
    line(g, inner, lw2);
    const rimP = curve([[50, -104], [72, -100], [104, -66], [120, -16], [114, 40], [90, 76], [76, 66], [98, 30], [102, -18], [88, -62], [62, -94]]);
    cel(g, rimP, coat, coatSh, L, 8, lw2);
    taper(g, [[0, -108], [-6, -40], [-4, 30], [-2, 94]], lw2, coatLine, { a: 0.1, b: 0.9 });
    for (const m of [-1, 1]) taper(g, [[m * 26 - 4, 92], [m * 40 - 4, 70], [m * 44 - 4, 50]], lw2 * 0.9, coatLine, { a: 0.3, b: 0.6 });
    clipped(g, hoodP, () => {
      taper(g, [[-sxL * 20 - 10, -96], [-sxL * 64 - 10, -78], [-sxL * 92 - 10, -40]], 13, 'rgba(255,255,240,0.92)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
      taper(g, [[-sxL * 104 - 6, -8], [-sxL * 106 - 6, 16]], 7, 'rgba(255,255,240,0.8)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
    });
    for (const [dx, dy, r] of [[24, -60, 6], [-58, 10, 5], [50, 30, 6], [-20, 50, 4.5]]) drawDropSmall(g, C, dx, dy, r, L);
    if (rim) crescent(g, hoodP, -L[0] * 8, -L[1] * 8, C(rim));
  } else {
    const hair = curve([[0, -104], [70, -94], [108, -50], [114, 10], [104, 64], [92, 96, 1], [64, 80], [44, 104, 1], [18, 84], [-6, 106, 1], [-30, 84], [-54, 104, 1], [-76, 82], [-96, 96, 1], [-108, 50], [-114, -10], [-104, -60], [-66, -96]]);
    cel(g, hair, C(GIRL.hair), C(GIRL.hairShade), L, 26, lw, C(HAIR_INK));
    for (const xx of [-60, -20, 24, 64]) taper(g, [[xx * 0.4, -80], [xx * 0.8, 0], [xx, 80]], lw2, C(HAIR_INK), { a: 0.2, b: 0.5 });
  }
  g.restore();
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

  // Pantalón corto (aletea un poco) con su sombra en los muslos.
  const shorts = curve([[-96, -566], [96, -566], [110, -500], [124 + fl(1, 3), -430, 1], [72, -422], [14, -440, 1], [0, -454], [-14, -440, 1], [-72, -422], [-124 + fl(2, 3), -430, 1], [-110, -500]]);
  for (const leg of legs) castShadow(g, moved(shorts, 0, 34), leg, C('#cdb9c0'));
  cel(g, shorts, C(GIRL.shorts), C(sh(GIRL.shorts)), L, 22, lw);
  taper(g, [[0, -520], [0, -456]], lw2, C(INK), { a: 0.2, b: 0.8 });

  // Brazos: el izquierdo cuelga; el derecho, doblado, sujeta la correa por
  // delante (el antebrazo queda tapado por el cuerpo).
  const sw = Math.sin(t * 1.9) * 3;
  for (const m of [-1, 1]) {
    const M = (p) => [p[0] * m, p[1], p[2]];
    if (m < 0) {
      const fore = curve([[150, -644], [166, -590], [166, -520], [146, -516], [138, -580], [126, -632]].map(M).map(([a, b]) => [a - sw * 0.3, b]));
      cel(g, fore, skin, skinSh, L, 10, lw2);
      const hand = curve([[140, -524], [166, -526], [172, -500], [168, -474], [156, -460], [142, -466], [136, -490]].map(M).map(([a, b]) => [a - sw * 0.3, b]));
      cel(g, hand, skin, skinSh, L, 8, lw2);
      taper(g, [[160, -500], [164, -476]].map(M).map(([a, b]) => [a - sw * 0.3, b]), lw2 * 0.7, C(INK), { a: 0.3, b: 0.6 });
    } else {
      const fore = curve([[150, -660], [160, -630], [118, -600], [100, -612], [124, -646]]);
      cel(g, fore, skin, skinSh, L, 10, lw2);
    }
    const elbowY = m < 0 ? -650 : -664;
    const sleeve = curve([[104, -804], [146, -786], [166, -720], [176 + fl(3 + m, 3), elbowY], [126, elbowY + 22], [116, -700], [100, -760]].map(M));
    cel(g, sleeve, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 18, lw);
    const cuff = curve([[178 + fl(3 + m, 3), elbowY - 14], [180 + fl(3 + m, 3), elbowY + 10], [124, elbowY + 30], [124, elbowY + 4]].map(M));
    cel(g, cuff, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 8, lw2);
    taper(g, [[132, -740], [150, -700], [154, -672]].map(M), lw2 * 0.8, C(INK), { a: 0.3, b: 0.6 });
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

  // Bufanda enrollada al cuello (el pelo cae por encima).
  const wrap = curve([[-96, -830], [-40, -846], [10, -848], [64, -842], [100, -826], [108, -798], [72, -776], [0, -770], [-72, -776], [-108, -800]].map(([a, b]) => [a, b + br]));
  cel(g, wrap, C(GIRL.scarf), C(GIRL.scarfShade), L, 14, lw);
  taper(g, [[-100, -806 + br], [-30, -812 + br], [40, -810 + br], [102, -804 + br]], lw2 * 0.9, C(INK), { a: 0.3, b: 0.7 });

  // Cabeza de espaldas (algo más pequeña que el cuerpo de dibujo: 1/5,6 de
  // la altura): mejilla asomando, gafas en la cabeza y media melena al viento.
  g.save();
  g.translate(0, -812); g.scale(0.9, 0.9); g.translate(0, 812);
  const hx = face * 6;
  if (face) {
    const cheek = curve([[face * 92, -912], [face * 122, -876], [face * 118, -840], [face * 98, -828]]);
    cel(g, cheek, skin, skinSh, L, 6, lw2);
  }
  const sway = Math.sin(t * 3.1) * 0.08 * (0.4 + W) - D * W * 0.12;
  const ax0 = hx + 62, ay0 = -1000;
  const atx = ax0 + Math.sin(0.3 + sway) * 130, aty = ay0 - Math.cos(0.3 + sway) * 130;
  taper(g, [[ax0, ay0], [lerp(ax0, atx, 0.5) - 3, lerp(ay0, aty, 0.5)], [atx, aty]], Math.max(4, 1.6 / k), C(INK), { w0: 1, w1: 0.7 });
  inked(g, ell(atx, aty, 9), C(GIRL.antennaTip), lw2);
  fill(g, ell(atx - 3, aty - 3, 3), '#ffffff');
  // Media melena: pocos mechones grandes; las puntas se van con el viento.
  const hairPts = [[0, -1006], [68, -998], [110, -958], [124, -898], [122, -846], [114, -804, 1], [90, -822], [64, -812], [40, -800], [14, -820], [-14, -802], [-42, -820], [-70, -806], [-96, -826], [-112, -806, 1], [-122, -850], [-120, -920], [-100, -972], [-60, -998]]
    .map(([a, b, c]) => { const u = clamp((b + 880) / 80); return [hx + a + D * W * u * (6 + 7 * Math.sin(t * 7.3 + a * 0.025)), b - W * u * 4 * Math.sin(t * 6.1 + a * 0.04), c]; });
  const hair = curve(hairPts);
  cel(g, hair, C(GIRL.hair), C(GIRL.hairShade), L, 26, lw, C(HAIR_INK));
  for (const [x0, x1] of [[-62, -96], [-18, -42], [28, 14], [72, 90]]) taper(g, [[hx + x0 * 0.4, -990], [hx + x0, -920], [hx + x1 + D * W * 8, -824]], lw2, C(HAIR_INK), { a: 0.2, b: 0.5 });
  clipped(g, hair, () => {
    for (let i = 0; i < 4; i++) {
      const a0 = -2.6 + i * 0.28, a1 = a0 + 0.2;
      const pt = (a) => [hx + Math.cos(a) * 92 * sxL, -905 + Math.sin(a) * 80];
      taper(g, [pt(a0), pt((a0 + a1) / 2), pt(a1)], 10 * (1 - i * 0.18), C(GIRL.hairHi, 0.9), { a: 0.45, b: 0.55, w0: 0.05, w1: 0.05 });
    }
  });
  // Correa de las gafas alrededor de la cabeza y cajita de pilas.
  const band = curve([[hx - 124, -966], [hx - 70, -944], [hx, -936], [hx + 70, -944], [hx + 126, -966], [hx + 126, -942], [hx + 70, -918], [hx, -910], [hx - 70, -918], [hx - 124, -942]]);
  g.save(); g.clip(hair);
  cel(g, band, C(GIRL.strap), C(sh(GIRL.strap, 0.7)), L, 6, lw2);
  g.save(); g.setLineDash([8, 7]); line(g, curve([[hx - 120, -952], [hx - 66, -930], [hx, -923], [hx + 66, -930], [hx + 122, -952]], false), Math.max(1.5, 0.5 / k), C('#c79a6a', 0.9)); g.restore();
  g.restore();
  inked(g, curve([[hx - 138, -982, 1], [hx - 108, -986, 1], [hx - 106, -944, 1], [hx - 136, -940, 1]]), C(mix(GIRL.brass, '#6d5a3a', 0.35)), lw2);
  // Mechones sueltos al viento por el lado de sotavento.
  if (W > 0.05) {
    for (let i = 0; i < 3; i++) {
      const y0 = -890 + i * 24, x0 = hx + D * 108;
      const len = (40 + i * 14) * W;
      const wv = Math.sin(t * 8 + i * 2) * 8 * W;
      const lock = curve([[x0 - D * 8, y0 - 7], [x0 + D * len * 0.55, y0 - 6 + wv * 0.5], [x0 + D * len, y0 + 2 + wv, 1], [x0 + D * len * 0.5, y0 + 3 + wv * 0.4], [x0 - D * 8, y0 + 6]]);
      cel(g, lock, C(GIRL.hair), null, L, 0, lw2, C(HAIR_INK));
    }
  }
  g.restore();

  // Cola larga de la bufanda (por delante).
  const tail1 = scarfTail(knot[0], knot[1], 1350, t, W, D, 0);
  ribbon(g, tail1, (u) => lerp(72, 56, u), (u) => 0.4 + 1.5 * Math.sin(TAU * (u * 1.25 - t * 0.6)), C(GIRL.scarf), C(GIRL.scarfShade), lw2 * 1.15, C(INK), { fringe: 26 });
  const knotP = curve([[knot[0] - D * 26, knot[1] - 16], [knot[0] + D * 10, knot[1] - 22], [knot[0] + D * 28, knot[1] - 4], [knot[0] + D * 16, knot[1] + 18], [knot[0] - D * 18, knot[1] + 16]]);
  cel(g, knotP, C(GIRL.scarf), C(GIRL.scarfShade), L, 8, lw);
  taper(g, [[knot[0] - D * 14, knot[1] - 8], [knot[0] + D * 6, knot[1] + 2], [knot[0] + D * 10, knot[1] + 14]], lw2 * 0.8, C(INK), { a: 0.3, b: 0.6 });
  if (rim) {
    for (const p of [hair, vest, shirt, shorts]) crescent(g, p, -L[0] * 8, -L[1] * 8, C(rim));
  }
  g.restore();
}
