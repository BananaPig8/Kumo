// El planeador: ala blanca en flecha con puntas rojas y quilla gris, con la
// chica tumbada encima agarrada a las asas. El ala se proyecta desde un modelo
// 3D sencillo (X envergadura, Y arriba, Z morro) para que cada vista tenga su
// grosor y su escorzo; la chica se dibuja a mano en cada vista.
// Espacio: 1000 unidades = envergadura; origen en el centro del ala.

import { GIRL, GLIDER, INK, celShadow } from '../engine/style.js';
import { mix, shade } from '../engine/paint.js';
import { TAU, lerp, clamp, sstep, curve, sample, ell, toner, lightDir, fill, line, inked, crescent, clipped, castShadow, taper, ribbon, cel } from './ink.js';

const HAIR_INK = '#1d1311';
const sh = (c, k = 0.78) => celShadow(c, k);

// Media planta del ala (X ≥ 0, Z hacia el morro), del morro a la cola.
const HALF = [[0, 172], [92, 142, 0], [250, 72], [420, -8], [498, -48, 1], [506, -78], [488, -100, 1], [380, -74], [250, -54], [132, -72], [62, -104, 1], [0, -94, 1]];
const TIP_X = 418;
const KEEL = [[176, -2], [150, -36], [70, -60], [-50, -58], [-104, -24, 1], [-100, 2, 1]];

function proj(view) {
  if (view === 'back') { const c = Math.cos(0.4), s = Math.sin(0.4); return (X, Y, Z) => [X, -Y * c - Z * s]; }
  if (view === 'front') { const c = Math.cos(0.26), s = Math.sin(0.26); return (X, Y, Z) => [-X, -Y * c + Z * s]; }
  if (view === 'side') { const c = Math.cos(0.2), s = Math.sin(0.2); return (X, Y, Z) => [Z, -Y * c - X * s]; }
  return (X, Y, Z) => [X, -Z * 0.92 - Y * 0.2];
}

// Altura de las superficies: diedro suave, más grueso en la raíz.
const thick = (X) => lerp(30, 8, Math.min(1, Math.abs(X) / 500));
const ySurf = (X, top) => Math.abs(X) * 0.07 + (top ? thick(X) / 2 : -thick(X) / 2);

function outline() {
  const right = HALF.map(([x, z, c]) => [x, z, c]);
  const left = HALF.slice(1, -1).reverse().map(([x, z, c]) => [-x, z, c]);
  return [...right, ...left];
}
function tipPts(m) {
  // Recorte de la punta (|X| ≥ TIP_X).
  const le = HALF[3], le2 = HALF[4];
  const zl = lerp(le[1], le2[1], (TIP_X - le[0]) / (le2[0] - le[0]));
  const te = HALF[6], te2 = HALF[7];
  const zt = lerp(te[1], te2[1], (te[0] - TIP_X) / (te[0] - te2[0]));
  return [[TIP_X, zl, 1], [498, -48, 1], [506, -78], [488, -100, 1], [TIP_X, zt, 1]].map(([x, z, c]) => [x * m, z, c]);
}

export function drawGliderImpl(g, t, { x, y, size, view = 'back', bank = 0, dir = 1, glow = null, tint = null, light = null, rim = null }) {
  const k = size / 1000;
  const C = toner(tint);
  const D = dir >= 0 ? 1 : -1;
  const L0 = lightDir(light);
  const mirrorX = view === 'side' ? D : 1;
  const L = [L0[0] * mirrorX, L0[1]];
  const lw = Math.max(3.2, 1.2 / k), lw2 = Math.max(2, 0.7 / k);
  const P = proj(view);
  const bob = Math.sin(t * 2.2) * 3;
  g.save();
  g.translate(x, y);
  g.rotate(bank);
  g.scale(k * mirrorX, k);
  g.translate(0, bob);
  g.lineJoin = 'round'; g.lineCap = 'round';

  const below = view === 'below';
  // La planta se suaviza antes de proyectar y se cierra con tramos rectos
  // (proyectada, la curva podría hacer lazos en las vistas de perfil).
  const surf = (pts, top) => polyP(sample(pts, true, 5).map(([X, Z]) => P(X, ySurf(X, top), Z)));
  const out = outline();
  const wingTop = surf(out, true), wingBot = surf(out, false);
  const keel = curve(KEEL.map(([Z, Y, c]) => { const [a, b] = P(0, Y, Z); return [a, b, c]; }));
  const white = C(GLIDER.wing), under = C(GLIDER.wingShade), red = C(GLIDER.tip), keelC = C(GLIDER.keel);

  const drawKeel = () => {
    cel(g, keel, keelC, C(sh(GLIDER.keel, 0.75)), L, 10, lw);
    taper(g, [[176, -6], [60, -40], [-80, -30]].map(([Z, Y]) => P(0, Y, Z)), lw2 * 0.8, C(INK, 0.7), { a: 0.2, b: 0.8 });
  };
  const drawSurface = (top) => {
    const w = top ? wingTop : wingBot;
    fill(g, w, top ? white : under);
    clipped(g, w, () => {
      for (const m of [-1, 1]) fill(g, surf(tipPts(m), top), top ? red : C(sh(GLIDER.tip, 0.75)));
      if (top) {
        // Sombra suave hacia el borde de salida y costillas de la tela.
        castShadow(g, moved3(P, out, top, 0, 0, -26), null, C('#e4e0ec'));
        for (const xs of [-300, -150, 150, 300]) {
          const z0 = zLE(xs), z1 = zTE(xs);
          taper(g, [P(xs, ySurf(xs, true), z0 - 4), P(xs, ySurf(xs, true), z1 + 4)], lw2 * 0.7, C(GLIDER.wingShade, 0.9), { a: 0.1, b: 0.9 });
        }
      } else {
        // Por debajo: borde claro por la luz del cielo.
        crescent(g, w, 0, below ? 18 : -14, C(mix(GLIDER.wingShade, '#ffffff', 0.45)));
        for (const xs of [-300, -150, 150, 300]) {
          const z0 = zLE(xs), z1 = zTE(xs);
          taper(g, [P(xs, ySurf(xs, false), z0 - 4), P(xs, ySurf(xs, false), z1 + 4)], lw2 * 0.7, C(sh(GLIDER.wingShade, 0.85)), { a: 0.1, b: 0.9 });
        }
      }
    });
    line(g, w, lw);
  };

  if (below) {
    drawRiderBelow(g, C, t, P, L, lw, lw2);
    drawSurface(true);
    drawSurface(false);
    drawKeel();
  } else {
    drawKeel();
    drawSurface(false);
    drawSurface(true);
    // Lomo central y asas.
    const spine = curve([[-22, 150], [22, 150], [26, -80], [-26, -80]].map(([X, Z]) => P(X, ySurf(0, true) + 4, Z)));
    cel(g, spine, C(mix(GLIDER.keel, '#ffffff', 0.4)), C(GLIDER.keel), L, 4, lw2);
    for (const m of [-1, 1]) {
      const a = P(m * 46, ySurf(0, true), 118), b = P(m * 46, ySurf(0, true) + 22, 124), c2 = P(m * 30, ySurf(0, true) + 22, 124);
      taper(g, [a, b], lw * 1.2, C(INK), { w0: 1, w1: 1 });
      taper(g, [b, c2], lw * 1.4, C(INK), { w0: 1, w1: 1 });
    }
    if (view === 'back') drawRiderBack(g, C, t, P, L, lw, lw2);
    else if (view === 'side') drawRiderSide(g, C, t, P, L, lw, lw2);
    else drawRiderFront(g, C, t, P, L, lw, lw2);
  }
  if (rim) crescent(g, below ? wingBot : wingTop, -L[0] * 8, -L[1] * 8, C(rim));
  g.restore();
}

function zLE(X) {
  const a = Math.abs(X);
  for (let i = 0; i < 4; i++) { const p = HALF[i], q = HALF[i + 1]; if (a <= q[0]) return lerp(p[1], q[1], (a - p[0]) / (q[0] - p[0])); }
  return HALF[4][1];
}
function zTE(X) {
  const a = Math.abs(X);
  const te = HALF.slice(6).reverse();
  for (let i = 0; i < te.length - 1; i++) { const p = te[i], q = te[i + 1]; if (a <= q[0]) return lerp(p[1], q[1], (a - p[0]) / (q[0] - p[0])); }
  return te[te.length - 1][1];
}
function moved3(P, pts, top, dx, dy, dz) {
  return polyP(sample(pts, true, 5).map(([X, Z]) => P(X + dx, ySurf(X, top) + dy, Z + dz)));
}
function polyP(pts) {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
  return p;
}

// Bufanda y pelo al viento en el espacio del dibujo: cinta que sale de (x0, y0)
// hacia el ángulo `th0` con ondas que avanzan.
function streamer(x0, y0, len, th0, t, amp, phase, n = 36) {
  const pts = [[x0, y0]];
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const u = i / n, s = u * len;
    const th = th0 + Math.sin(TAU * (s / (len * 0.45) - t * 2.2) + phase) * amp * (0.2 + u) + Math.sin(TAU * (s / (len * 0.2) - t * 3.4) + phase) * amp * 0.25 * u;
    px += Math.cos(th) * (len / n); py += Math.sin(th) * (len / n);
    pts.push([px, py]);
  }
  return pts;
}
const twist = (t, f = 1) => (u) => 0.3 + 1.4 * Math.sin(TAU * (u * 1.2 * f - t * 0.9));

// ─── Vista de perfil (morro a la derecha) ───────────────────────────────────
function drawRiderSide(g, C, t, P, L, lw, lw2) {
  const top = -ySurf(0, true) * Math.cos(0.2) - 4;
  const o = (x, y) => [x, top + y];
  const skin = C(GIRL.skin);
  // Bufanda larguísima hacia atrás (detrás de todo el cuerpo).
  const sc = streamer(...o(96, -66), 900, Math.PI - 0.05, t, 0.22, 0.4);
  ribbon(g, sc, (u) => lerp(26, 20, u), twist(t), C(GIRL.scarf), C(GIRL.scarfShade), lw2, C(INK), { fringe: 10 });
  const sc2 = streamer(...o(92, -60), 560, Math.PI + 0.06, t + 0.3, 0.26, 2.2);
  ribbon(g, sc2, (u) => lerp(22, 18, u), twist(t + 0.5), C(GIRL.scarf), C(GIRL.scarfShade), lw2, C(INK), { fringe: 8 });
  // Piernas estiradas hacia atrás con las rodillas un poco dobladas.
  const kick = Math.sin(t * 3.1) * 4;
  for (const [dy, far] of [[-6, true], [0, false]]) {
    const c = far ? 0.88 : 1;
    const leg = curve([[-40, -50], [-120, -44 + dy], [-186, -58 + dy + kick], [-196, -46 + dy + kick], [-122, -28 + dy], [-40, -28]].map(([a, b]) => o(a, b)));
    cel(g, leg, C(shade(GIRL.skin, c)), C(GIRL.skinShade), L, 5, lw2);
    clipped(g, leg, () => { const s = new Path2D(); s.rect(-240, top - 120, 104, 200); fill(g, s, C(shade(GIRL.socks, c))); });
    line(g, leg, lw2);
    const boot = curve([[-182, -66 + dy + kick], [-210, -64 + dy + kick], [-222, -50 + dy + kick], [-214, -36 + dy + kick, 1], [-186, -40 + dy + kick, 1]].map(([a, b, cc]) => [...o(a, b), cc]));
    cel(g, boot, C(shade(GIRL.shoes, c)), C(sh(GIRL.shoes)), L, 4, lw2);
  }
  // Pantalón, cuerpo (chaleco) y cabeza levantada.
  const shorts = curve([[-12, -62], [-58, -58], [-70, -46], [-62, -26], [-10, -26]].map(([a, b]) => o(a, b)));
  cel(g, shorts, C(GIRL.shorts), C(sh(GIRL.shorts)), L, 6, lw2);
  const torso = curve([[84, -68], [40, -72], [-6, -66], [-18, -46], [-6, -28], [60, -28], [92, -40]].map(([a, b]) => o(a, b)));
  cel(g, torso, C(GIRL.vest), C(sh(GIRL.vest)), L, 7, lw);
  taper(g, [o(-14, -60), o(30, -68), o(76, -64)], lw2 * 0.8, C(INK), { a: 0.2, b: 0.8 });
  // Cartera rebotando en la cadera.
  const bag = curve([[-6, -76], [24, -78], [26, -60, 1], [-4, -58, 1]].map(([a, b, c]) => [...o(a, b + Math.sin(t * 4) * 2), c]));
  cel(g, bag, C(GIRL.bag), C(sh(GIRL.bag)), L, 3, lw2);
  // Brazo: hombro → asa.
  const arm = curve([[70, -64], [104, -50], [140, -44], [150, -36], [140, -28], [100, -36], [64, -48]].map(([a, b]) => o(a, b)));
  cel(g, arm, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 5, lw2);
  const hand = ell(...o(146, -38), 9, 8);
  cel(g, hand, skin, C(GIRL.skinShade), L, 3, lw2);
  // Cabeza de perfil con las gafas puestas y el pelo hacia atrás.
  const hx = 120, hy = -84;
  const hairBack = curve([[hx + 6, hy - 26], [hx - 30, hy - 24], [hx - 64 + Math.sin(t * 9) * 3, hy - 16, 1], [hx - 40, hy - 6], [hx - 70 + Math.sin(t * 8 + 1) * 4, hy + 4, 1], [hx - 34, hy + 10], [hx - 52 + Math.sin(t * 10) * 3, hy + 20, 1], [hx - 10, hy + 22]].map(([a, b, c]) => [...o(a, b), c]));
  cel(g, hairBack, C(GIRL.hair), C(GIRL.hairShade), L, 6, lw2, C(HAIR_INK));
  const face = curve([[hx + 4, hy - 24], [hx + 22, hy - 16], [hx + 28, hy - 4], [hx + 34, hy + 2, 1], [hx + 28, hy + 8], [hx + 26, hy + 16], [hx + 16, hy + 24], [hx, hy + 22], [hx - 6, hy]].map(([a, b, c]) => [...o(a, b), c]));
  cel(g, face, skin, C(GIRL.skinShade), L, 6, lw2);
  fill(g, ell(...o(hx + 14, hy + 8), 6, 3), C(GIRL.blush, 0.6));
  const hairTop = curve([[hx + 18, hy - 22], [hx + 4, hy - 30], [hx - 26, hy - 26], [hx - 20, hy - 10], [hx + 4, hy - 12], [hx + 14, hy - 8, 1]].map(([a, b, c]) => [...o(a, b), c]));
  cel(g, hairTop, C(GIRL.hair), C(GIRL.hairShade), L, 4, lw2, C(HAIR_INK));
  // Gafas: copa de perfil con la correa.
  taper(g, [o(hx + 18, hy - 6), o(hx - 6, hy - 10), o(hx - 26, hy - 6)], 7, C(GIRL.strap), { w0: 1, w1: 1 });
  const cup = curve([[hx + 14, hy - 14], [hx + 30, hy - 14], [hx + 32, hy + 2], [hx + 14, hy + 2]].map(([a, b]) => o(a, b)));
  cel(g, cup, C(GIRL.copper), C(sh(GIRL.copper, 0.7)), L, 3, lw2);
  line(g, curve([o(hx + 31, hy - 13), o(hx + 33, hy - 6), o(hx + 31, hy + 1)], false), lw2 * 1.6, C(GIRL.lensOff));
  const atx = hx - 30 + Math.sin(t * 6) * 2, aty = hy - 44;
  taper(g, [o(hx + 4, hy - 16), o(hx - 12, hy - 34), o(atx - hx + hx, aty - hy + hy)], Math.max(2, lw2 * 0.9), C(INK), { w0: 1, w1: 0.6 });
  inked(g, ell(...o(atx, aty), 4.5), C(GIRL.antennaTip), lw2 * 0.8);
}

// ─── Vista desde atrás ──────────────────────────────────────────────────────
function drawRiderBack(g, C, t, P, L, lw, lw2) {
  const Y0 = ySurf(0, true) + 6;
  const at = (X, dy, Z) => P(X, Y0 + dy, Z);
  const kick = Math.sin(t * 3.1) * 3;
  // Piernas y botas (lo más cercano a la cámara).
  for (const m of [-1, 1]) {
    const leg = curve([[m * 14, 8, -70], [m * 32, 8, -80], [m * 34, 12, -210], [m * 18, 12, -210]].map(([X, dy, Z]) => at(X, dy, Z)));
    cel(g, leg, C(GIRL.skin), C(GIRL.skinShade), L, 4, lw2);
    clipped(g, leg, () => fill(g, curve([[m * 0, 0, -150], [m * 60, 0, -150], [m * 60, 30, -230], [m * 0, 30, -230]].map(([X, dy, Z]) => at(X, dy, Z))), C(GIRL.socks)));
    line(g, leg, lw2);
    const [bx, by] = at(m * 26, 22 + kick * m, -222);
    const boot = ell(bx, by, 15, 19);
    cel(g, boot, C(GIRL.shoes), C(sh(GIRL.shoes)), L, 5, lw2);
    fill(g, ell(bx, by + 5, 10, 11), C(shade(GIRL.shoes, 0.6)));
  }
  const shorts = curve([[-36, 14, -40], [36, 14, -40], [34, 12, -84], [-34, 12, -84]].map(([X, dy, Z]) => at(X, dy, Z)));
  cel(g, shorts, C(GIRL.shorts), C(sh(GIRL.shorts)), L, 6, lw2);
  // Brazos hacia las asas, codos abiertos.
  for (const m of [-1, 1]) {
    const arm = curve([[m * 34, 26, 48], [m * 70, 26, 70], [m * 52, 18, 122], [m * 40, 14, 118], [m * 52, 20, 78], [m * 26, 20, 40]].map(([X, dy, Z]) => at(X, dy, Z)));
    cel(g, arm, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 5, lw2);
  }
  const back = curve([[-40, 26, 50], [0, 32, 56], [40, 26, 50], [40, 18, -44], [0, 22, -48], [-40, 18, -44]].map(([X, dy, Z]) => at(X, dy, Z)));
  cel(g, back, C(GIRL.vest), C(sh(GIRL.vest)), L, 8, lw);
  taper(g, [at(0, 32, 50), at(0, 22, -40)], lw2 * 0.8, C(INK), { a: 0.1, b: 0.9 });
  const strap = curve([[22, 30, 46], [32, 30, 40], [-26, 22, -30], [-36, 22, -24]].map(([X, dy, Z]) => at(X, dy, Z)));
  cel(g, strap, C(GIRL.bag), null, L, 0, lw2);
  // Cabeza (de espaldas) con la correa de las gafas y el pelo agitado.
  const [hx, hy] = at(0, 40, 82);
  const hair = curve([[hx, hy - 28], [hx + 24, hy - 22], [hx + 30, hy - 2], [hx + 30 + Math.sin(t * 9) * 3, hy + 14, 1], [hx + 14, hy + 8], [hx + 6 + Math.sin(t * 8) * 3, hy + 22, 1], [hx - 8, hy + 10], [hx - 20 + Math.sin(t * 10) * 3, hy + 20, 1], [hx - 28, hy + 4], [hx - 28, hy - 14]]);
  cel(g, hair, C(GIRL.hair), C(GIRL.hairShade), L, 8, lw2, C(HAIR_INK));
  taper(g, [[hx - 28, hy - 6], [hx, hy - 12], [hx + 29, hy - 6]], 8, C(GIRL.strap), { w0: 1, w1: 1 });
  const ax = hx + 18 + Math.sin(t * 5) * 2;
  taper(g, [[hx + 16, hy - 20], [hx + 22, hy - 40], [ax, hy - 54]], Math.max(2, lw2), C(INK), { w0: 1, w1: 0.6 });
  inked(g, ell(ax, hy - 56, 5), C(GIRL.antennaTip), lw2 * 0.8);
  // Bufanda hacia atrás (viene hacia la cámara y cae por un lado).
  const sc = streamer(hx + 8, hy + 14, 380, Math.PI / 2 - 0.5, t, 0.35, 0.3);
  ribbon(g, sc, (u) => lerp(24, 30, u), twist(t), C(GIRL.scarf), C(GIRL.scarfShade), lw2, C(INK), { fringe: 10 });
}

// ─── Vista de frente ────────────────────────────────────────────────────────
function drawRiderFront(g, C, t, P, L, lw, lw2) {
  const Y0 = ySurf(0, true) + 6;
  const at = (X, dy, Z) => P(X, Y0 + dy, Z);
  // Bufanda: ondea hacia atrás y arriba por detrás.
  const [nx, ny] = at(6, 30, 60);
  const sc = streamer(nx, ny, 420, -Math.PI / 2 - 0.6, t, 0.32, 1.2);
  ribbon(g, sc, (u) => lerp(24, 20, u), twist(t), C(GIRL.scarf), C(GIRL.scarfShade), lw2, C(INK), { fringe: 10 });
  // Suelas y piernas (lejos), espalda y brazos.
  for (const m of [-1, 1]) {
    const [bx, by] = at(m * 22, 30, -210);
    cel(g, ell(bx, by, 12, 8), C(GIRL.shoes), C(sh(GIRL.shoes)), L, 3, lw2);
  }
  const back = curve([[-38, 30, 40], [38, 30, 40], [30, 20, -200], [-30, 20, -200]].map(([X, dy, Z]) => at(X, dy, Z)));
  cel(g, back, C(GIRL.vest), C(sh(GIRL.vest)), L, 6, lw);
  for (const m of [-1, 1]) {
    const arm = curve([[m * 30, 30, 62], [m * 62, 24, 84], [m * 50, 20, 124], [m * 38, 18, 122], [m * 46, 22, 90], [m * 20, 26, 70]].map(([X, dy, Z]) => at(X, dy, Z)));
    cel(g, arm, C(GIRL.shirt), C(sh(GIRL.shirt, 0.84)), L, 5, lw2);
    const [hx2, hy2] = at(m * 44, 22, 124);
    cel(g, ell(hx2, hy2, 9, 8), C(GIRL.skin), C(GIRL.skinShade), L, 3, lw2);
  }
  // Cara de frente con las gafas bajadas y el pelo hacia atrás.
  const [hx, hy] = at(0, 40, 92);
  const hairBack = curve([[hx - 30, hy], [hx - 36 + Math.sin(t * 9) * 3, hy - 34, 1], [hx - 16, hy - 28], [hx - 8 + Math.sin(t * 8) * 3, hy - 46, 1], [hx + 6, hy - 30], [hx + 22 + Math.sin(t * 10) * 3, hy - 44, 1], [hx + 24, hy - 26], [hx + 38 + Math.sin(t * 7) * 3, hy - 30, 1], [hx + 30, hy]]);
  cel(g, hairBack, C(GIRL.hair), C(GIRL.hairShade), L, 6, lw2, C(HAIR_INK));
  const face = curve([[hx - 24, hy - 12], [hx, hy - 20], [hx + 24, hy - 12], [hx + 22, hy + 10], [hx + 10, hy + 22], [hx, hy + 25], [hx - 10, hy + 22], [hx - 22, hy + 10]]);
  cel(g, face, C(GIRL.skin), C(GIRL.skinShade), L, 6, lw2);
  const bangs = curve([[hx - 26, hy - 4], [hx - 26, hy - 20], [hx, hy - 28], [hx + 26, hy - 20], [hx + 26, hy - 4], [hx + 18, hy - 10, 1], [hx + 10, hy - 4], [hx + 2, hy - 12, 1], [hx - 8, hy - 4], [hx - 16, hy - 10, 1]]);
  cel(g, bangs, C(GIRL.hair), C(GIRL.hairShade), L, 4, lw2, C(HAIR_INK));
  taper(g, [[hx - 30, hy + 1], [hx + 30, hy + 1]], 6, C(GIRL.strap), { w0: 1, w1: 1 });
  for (const m of [-1, 1]) {
    const lens = ell(hx + m * 11, hy + 1, 9, 9);
    cel(g, lens, C(GIRL.copper), null, L, 0, lw2);
    fill(g, ell(hx + m * 11, hy + 1, 5.5, 5.5), C(GIRL.lensOff));
    fill(g, ell(hx + m * 11 - 2, hy - 1, 1.8, 1.8), '#ffffff');
  }
  fill(g, ell(hx, hy + 17, 4, 2.6), C('#9a3f3f'));
  for (const m of [-1, 1]) fill(g, ell(hx + m * 15, hy + 12, 4.5, 2.2), C(GIRL.blush, 0.6));
}

// ─── Vista desde abajo ──────────────────────────────────────────────────────
// Solo asoman las piernas por detrás del ala y la bufanda.
function drawRiderBelow(g, C, t, P, L, lw, lw2) {
  const Y0 = ySurf(0, true) + 6;
  const at = (X, dy, Z) => P(X, Y0 + dy, Z);
  const [nx, ny] = at(0, 20, -60);
  const sc = streamer(nx + 8, ny, 520, Math.PI / 2 + 0.1, t, 0.3, 0.8);
  ribbon(g, sc, (u) => lerp(26, 22, u), twist(t), C(GIRL.scarfShade), C(shade(GIRL.scarfShade, 0.8)), lw2, C(INK), { fringe: 10 });
  const kick = Math.sin(t * 3.1) * 4;
  for (const m of [-1, 1]) {
    const leg = curve([[m * 10, 0, -40], [m * 32, 0, -40], [m * 30, 0, -205 - kick * m], [m * 14, 0, -205 - kick * m]].map(([X, dy, Z]) => at(X, dy, Z)));
    cel(g, leg, C(shade(GIRL.skin, 0.8)), null, L, 0, lw2);
    clipped(g, leg, () => fill(g, curve([[m * 0, 0, -140], [m * 60, 0, -140], [m * 60, 0, -230], [m * 0, 0, -230]].map(([X, dy, Z]) => at(X, dy, Z))), C(shade(GIRL.socks, 0.8))));
    line(g, leg, lw2);
    const [bx, by] = at(m * 22, 0, -214 - kick * m);
    cel(g, ell(bx, by, 13, 16), C(shade(GIRL.shoes, 0.8)), null, L, 0, lw2);
  }
}
