// Primer plano de la protagonista: cara de frente con capucha amarilla y las
// gafas de chatarra (subidas, bajando o encendidas). Todo vectorial: se dibuja
// en un espacio de 1000 unidades (= size) con el origen entre los ojos.

import { GIRL, INK, INK_SOFT, celShadow } from '../engine/style.js';
import { mix, shade } from '../engine/paint.js';
import {
  TAU, lerp, clamp, sstep, curve, sample, ell, sym, mirror, moved, toner, lightDir,
  fill, line, inked, crescent, clipped, castShadow, taper, gleam, blinkAt,
} from './ink.js';

const HAIR_INK = '#1d1311';

// ─── Geometría fija (se construye una vez) ──────────────────────────────────
const HALF = {
  face: [[0, -470], [182, -455], [296, -378], [344, -236], [354, -90], [344, 40], [316, 150], [268, 256], [200, 342], [112, 404], [0, 428]],
  hoodOut: [[0, -782], [250, -758], [452, -650], [586, -466], [650, -230], [664, 20], [650, 250], [640, 430], [620, 560], [420, 640], [0, 680]],
  hoodIn: [[0, -650], [208, -630], [354, -550], [440, -392], [470, -190], [472, 30], [452, 240], [410, 390], [330, 480], [170, 520], [0, 528]],
  backHair: [[0, -604], [236, -576], [388, -462], [452, -270], [466, -50], [460, 170], [440, 350], [410, 480, 1], [336, 432], [276, 516, 1], [170, 456], [0, 476]],
  coat: [[0, 520], [160, 502], [340, 504], [520, 560], [660, 680], [740, 860], [770, 1080, 1], [0, 1080, 1]],
};
const LOCK_R = [[226, -352], [322, -270], [368, -116], [372, 46], [356, 206], [328, 344], [298, 470, 1], [276, 378], [282, 246], [290, 108], [286, -32], [266, -172], [222, -290]];
const LOCK_R2 = [[300, -300], [352, -210], [384, -60], [388, 90], [380, 230], [362, 330, 1], [350, 230], [346, 90], [334, -60], [312, -190]];
const NECK = [[-92, 300], [-90, 460], [-100, 560, 1], [100, 560, 1], [90, 460], [92, 300]];

// Flequillo recto a mechones: puntas (x, y) y muescas entre ellas.
const TIPS = [[-300, -178], [-212, -150], [-126, -164], [-40, -130], [46, -158], [132, -140], [216, -160], [302, -184]];
const NOTCH = [-222, -212, -230, -206, -224, -210, -220];

function offsetPts(pts, d) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dy / l) * d, p[1] - (dx / l) * d, p[2]];
  });
}

function bangsPts() {
  const pts = [[352, -232], [338, -390], [262, -510], [128, -572], [0, -588], [-128, -572], [-262, -510], [-338, -390], [-352, -232]];
  // De izquierda a derecha por abajo: punta, muesca, punta…
  for (let i = 0; i < TIPS.length; i++) {
    const [tx, ty] = TIPS[i];
    const lean = -tx * 0.06;
    const nl = i === 0 ? [-352, -232] : [(TIPS[i - 1][0] + tx) / 2, NOTCH[i - 1]];
    const nr = i === TIPS.length - 1 ? [352, -232] : [(TIPS[i + 1][0] + tx) / 2, NOTCH[i]];
    const tip = [tx + lean, ty];
    if (i > 0) pts.push([nl[0], nl[1], 1]);
    pts.push([lerp(nl[0], tip[0], 0.55) - 7, lerp(nl[1], tip[1], 0.55)]);
    pts.push([tip[0], tip[1], 1]);
    pts.push([lerp(tip[0], nr[0], 0.45) + 7, lerp(tip[1], nr[1], 0.45)]);
  }
  return pts;
}

let GEO = null;
function geo() {
  if (GEO) return GEO;
  const face = sym(HALF.face), hoodIn = sym(HALF.hoodIn);
  const rimOut = offsetPts(hoodIn, 50);
  const P = {
    face: curve(face), hoodOut: curve(sym(HALF.hoodOut)), hoodIn: curve(hoodIn), rimOut: curve(rimOut),
    rimMid: curve(offsetPts(hoodIn, 26)), backHair: curve(sym(HALF.backHair)), coat: curve(sym(HALF.coat)),
    neck: curve(NECK), lockR: curve(LOCK_R), lockL: curve(mirror(LOCK_R)), lock2R: curve(LOCK_R2), lock2L: curve(mirror(LOCK_R2)),
    bangs: curve(bangsPts()),
  };
  P.rim = new Path2D(); P.rim.addPath(P.rimOut); P.rim.addPath(P.hoodIn);
  P.locks = new Path2D(); for (const k of ['lockR', 'lockL', 'lock2R', 'lock2L']) P.locks.addPath(P[k]);
  P.hair = new Path2D(); P.hair.addPath(P.bangs); P.hair.addPath(P.locks);
  GEO = P;
  return P;
}

// Gotas de lluvia fijas sobre la capucha: [ángulo, posición radial 0..1, radio].
const DROPS = [[-2.2, 0.35, 15], [-1.95, 0.7, 11], [-1.62, 0.45, 13], [-1.35, 0.2, 10], [-1.05, 0.6, 14], [-0.7, 0.3, 12], [-0.35, 0.65, 15], [0.1, 0.4, 11],
  [0.55, 0.55, 13], [2.6, 0.5, 12], [3.0, 0.3, 14], [-2.75, 0.62, 11], [-2.5, 0.15, 9], [0.9, 0.25, 10]];

// ─── Ojo ────────────────────────────────────────────────────────────────────
// m = 1 ojo de la derecha de la imagen, -1 el de la izquierda (exterior hacia m).
const EYE_OPEN = [[-60, 24], [-52, -36], [-16, -70], [36, -66], [68, -30], [74, 8], [62, 50], [30, 78], [-10, 80], [-44, 60]];
const EYE_LASH = [[-70, 28], [-58, -34], [-16, -76], [38, -72], [76, -34], [88, -10], [96, 0]];
function drawEye(g, C, ex, ey, m, look, b, L) {
  const X = (p) => [ex + m * p[0], ey + p[1], p[2]];
  // Párpado: con b → 1 la línea baja hasta una curva cerrada.
  const lash = EYE_LASH.map(([x, y]) => [x, lerp(y, 50 - 26 * ((x - 14) / 90) ** 2, b)]);
  if (b < 0.92) {
    const open = curve(EYE_OPEN.map(X));
    const below = new Path2D();
    const ls = lash.map(X);
    below.moveTo(ls[0][0], 200 + ey);
    for (const p of ls) below.lineTo(p[0], p[1]);
    below.lineTo(ls[ls.length - 1][0], 200 + ey);
    below.closePath();
    g.save();
    g.clip(open); g.clip(below);
    fill(g, open, C('#fbf7f2'));
    const ix = ex + look * 22 + m * 2, iy = ey + 12;
    const iris = ell(ix, iy, 52, 72);
    fill(g, iris, C(GIRL.eye));
    fill(g, ell(ix, iy + 28, 38, 34), C(mix(GIRL.eye, '#a8603c', 0.3)));
    fill(g, ell(ix, iy - 2, 22, 30), C('#1a0f0c'));
    line(g, iris, 3, C(HAIR_INK));
    // Sombra del párpado sobre el ojo.
    crescent(g, open, 0, 24, C('#b7a8bd', 0.55));
    // Brillos.
    fill(g, ell(ix - 18 * (L[0] <= 0 ? 1 : -1), iy - 26, 15, 19, -0.35), '#ffffff');
    fill(g, ell(ix + 21 * (L[0] <= 0 ? 1 : -1), iy + 30, 7, 7), 'rgba(255,255,255,0.9)');
    g.restore();
    // Pestaña inferior y pliegue del párpado.
    if (b < 0.5) {
      taper(g, [[16, 86], [46, 74], [68, 52]].map(X), 6, C(INK), { a: 0.4, b: 0.6, w0: 0.1, w1: 0.2 });
      taper(g, [[-34, -98], [12, -112], [58, -96]].map(X), 5, C(INK, 0.6), { a: 0.4, b: 0.6 });
    }
  }
  taper(g, lash.map(X), lerp(15, 12, b), C(INK), { a: 0.25, b: 0.8, w0: 0.25, w1: 0.1 });
  // Rabillo de pestañas hacia fuera.
  const fy = lerp(0, 50, b);
  taper(g, [[76, -26 + fy * 0.7], [90, -34 + fy * 0.9], [100, -36 + fy]].map(X), 6, C(INK), { a: 0.2, b: 0.4, w0: 0.9, w1: 0.05 });
}

// ─── Gafas ──────────────────────────────────────────────────────────────────
// Dibujadas en su propio espacio (origen entre las lentes), ya escalado.
function drawGoggles(g, C, t, power, L, gl) {
  const sxL = L[0] <= 0 ? 1 : -1;
  const sh = [L[0] * 16, L[1] * 16];
  const brassSh = C(celShadow(GIRL.brass, 0.7));
  // Puente de cuero entre las lentes.
  const bridge = curve([[-60, -26], [0, -40], [60, -26], [60, 24, 1], [0, 8], [-60, 24, 1]]);
  inked(g, bridge, C(GIRL.strap), 5, C(INK));
  crescent(g, bridge, sh[0], sh[1], C(celShadow(GIRL.strap, 0.7)));
  line(g, curve([[-50, -16], [0, -28], [50, -16]], false), 2.5, C('#b48a5e', 0.8));
  for (const m of [-1, 1]) {
    const cx = m * 165;
    // Copa de latón (detrás del aro).
    const cup = ell(cx + m * 7, 3, 160, 158);
    inked(g, cup, C(GIRL.brass), 6, C(INK));
    crescent(g, cup, sh[0] * 1.4, sh[1] * 1.4, brassSh);
    crescent(g, cup, -L[0] * 8, -L[1] * 8, C(mix(GIRL.brass, '#fff1c8', 0.5)));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.3;
      const rx = cx + m * 7 + Math.cos(a) * 149, ry = 3 + Math.sin(a) * 147;
      inked(g, ell(rx, ry, 6.5), C(mix(GIRL.brass, '#fff1c8', 0.25)), 2, C(INK));
      fill(g, ell(rx - 2, ry - 2, 2.2), C('#fffbe8', 0.9));
    }
    // Soporte lateral donde se engancha la correa.
    const tab = curve([[m * 312, -40, 1], [m * 344, -36, 1], [m * 344, 36, 1], [m * 312, 40, 1]]);
    inked(g, tab, C(GIRL.copper), 5, C(INK));
    inked(g, ell(m * 330, 0, 7), C(mix(GIRL.brass, '#fff', 0.3)), 2, C(INK));
    // Aro de cobre.
    const ring = ell(cx, 0, 140, 140);
    inked(g, ring, C(GIRL.copper), 6, C(INK));
    crescent(g, ring, sh[0], sh[1], C(celShadow(GIRL.copper, 0.74)));
    const hiArc = new Path2D();
    hiArc.arc(cx, 0, 130, Math.PI * (sxL > 0 ? 1.05 : 1.75), Math.PI * (sxL > 0 ? 1.45 : 2.0));
    line(g, hiArc, 7, C('#f4bb84'));
    line(g, ell(cx, 0, 112, 112), 4, C(INK));
    // Lente.
    const on = sstep(0.6, 1, power);
    const lens = ell(cx, 0, 108, 108);
    fill(g, lens, C(mix(GIRL.lensOff, '#46c6da', on)));
    clipped(g, lens, () => {
      // Sombra del aro en el cristal y reflejo curvo.
      crescent(g, lens, 0, 30, C(mix(GIRL.lensOff, '#0c1d24', 0.6), 0.7 * (1 - on * 0.7)));
      if (on > 0) {
        g.save();
        g.globalAlpha = on;
        fill(g, ell(cx, 0, 74), C('#c9fbff', 0.45));
        line(g, ell(cx, 0, 74), 3, C('#ffffff', 0.7));
        line(g, ell(cx, 0, 40), 2.5, C('#ffffff', 0.6));
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + Math.PI / 4 + t * 0.6 * m;
          const p = new Path2D(); p.moveTo(cx + Math.cos(a) * 82, Math.sin(a) * 82); p.lineTo(cx + Math.cos(a) * 98, Math.sin(a) * 98);
          line(g, p, 3, '#ffffff');
        }
        g.restore();
      }
      const ref = new Path2D();
      ref.arc(cx, 0, 84, Math.PI * 1.08, Math.PI * 1.42);
      ref.arc(cx, 0, 66, Math.PI * 1.38, Math.PI * 1.12, true);
      ref.closePath();
      fill(g, sxL > 0 ? ref : moved(ref, 2 * cx, 0, -1, 1), 'rgba(255,255,255,0.85)');
      fill(g, ell(cx - sxL * 22, -62, 9, 9), 'rgba(255,255,255,0.9)');
      fill(g, ell(cx + sxL * 56, 58, 18, 6, -0.7 * sxL), 'rgba(255,255,255,0.35)');
    });
    // Anillo de 8 LEDs (se encienden uno a uno).
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + m * i * (TAU / 8);
      const lx = cx + Math.cos(a) * 125, ly = Math.sin(a) * 125;
      const lit = clamp((power - i * 0.075) / 0.06);
      inked(g, ell(lx, ly, 11), C('#3a2a22'), 2.5, C(INK));
      fill(g, ell(lx, ly, 7.5), C(mix('#2b4448', GIRL.led, lit)));
      fill(g, ell(lx - 2.5, ly - 2.5, 2.6), lit > 0.5 ? '#ffffff' : C('#9fc7c9', 0.8));
      if (gl && lit > 0) {
        gl.fillStyle = `rgba(127,246,255,${0.5 * lit})`; gl.fill(ell(lx, ly, 8));
        const gr = gl.createRadialGradient(lx, ly, 0, lx, ly, 34);
        gr.addColorStop(0, `rgba(127,246,255,${0.22 * lit})`); gr.addColorStop(1, 'rgba(127,246,255,0)');
        gl.fillStyle = gr; gl.fillRect(lx - 34, ly - 34, 68, 68);
      }
    }
    if (gl && on > 0) {
      gl.fillStyle = `rgba(143,243,255,${0.1 * on})`; gl.fill(lens);
      const gr = gl.createRadialGradient(cx, 0, 60, cx, 0, 210);
      gr.addColorStop(0, `rgba(143,243,255,${0.05 * on})`); gr.addColorStop(1, 'rgba(143,243,255,0)');
      gl.fillStyle = gr; gl.fillRect(cx - 210, -210, 420, 420);
    }
  }
  // Antena fina con punta roja (derecha de la imagen) y un muelle en la base.
  const sway = 0.05 * Math.sin(t * 2.3) + 0.025 * Math.sin(t * 5.1 + 1);
  const bx = 165 + 7 + Math.cos(-0.9) * 158, by = 3 + Math.sin(-0.9) * 158;
  const base = curve([[bx - 16, by + 10, 1], [bx - 8, by - 26, 1], [bx + 16, by - 20, 1], [bx + 16, by + 14, 1]]);
  inked(g, base, C(GIRL.brass), 4, C(INK));
  crescent(g, base, sh[0] * 0.6, sh[1] * 0.6, brassSh);
  const ang = -1.25 + sway;
  const tipX = bx + 4 + Math.cos(ang) * 250, tipY = by - 24 + Math.sin(ang) * 250;
  const midX = bx + 4 + Math.cos(ang + 0.06) * 130, midY = by - 24 + Math.sin(ang + 0.06) * 130;
  taper(g, [[bx + 4, by - 22], [midX, midY], [tipX, tipY]], 10, C(INK), { a: 0.1, b: 0.9, w0: 1, w1: 0.6 });
  taper(g, [[bx + 4, by - 22], [midX, midY], [tipX, tipY]], 4.5, C('#a9a39a'), { a: 0.1, b: 0.9, w0: 1, w1: 0.6 });
  for (let k = 0; k < 4; k++) {
    const u = 0.06 + k * 0.045;
    const px = lerp(bx + 4, tipX, u), py = lerp(by - 24, tipY, u);
    line(g, ell(px, py, 10, 4, ang + Math.PI / 2), 3, C(INK));
  }
  const tip = ell(tipX, tipY, 15);
  inked(g, tip, C(GIRL.antennaTip), 4, C(INK));
  crescent(g, tip, sh[0] * 0.5, sh[1] * 0.5, C(celShadow(GIRL.antennaTip, 0.7)));
  fill(g, ell(tipX - 5, tipY - 5, 4.5), '#ffffff');
  if (gl && power > 0.02) {
    const blink = 0.55 + 0.45 * (Math.sin(t * 6.5) > 0 ? 1 : 0.2);
    const gr = gl.createRadialGradient(tipX, tipY, 0, tipX, tipY, 46);
    gr.addColorStop(0, `rgba(255,90,60,${0.4 * blink})`); gr.addColorStop(1, 'rgba(255,90,60,0)');
    gl.fillStyle = gr; gl.fillRect(tipX - 46, tipY - 46, 92, 92);
  }
  // Cajita de pilas (izquierda de la imagen) con un cable rizado al aro.
  const box = curve([[-372, -96, 1], [-300, -104, 1], [-292, 18, 1], [-366, 26, 1]]);
  const wire = curve([[-330, 26], [-338, 70], [-310, 92], [-290, 70], [-298, 50], [-270, 92], [-230, 112]], false);
  line(g, wire, 9, C(INK));
  line(g, wire, 4.5, C('#b9372f'));
  inked(g, box, C(mix(GIRL.brass, '#6d5a3a', 0.35)), 5, C(INK));
  crescent(g, box, sh[0] * 0.8, sh[1] * 0.8, brassSh);
  line(g, curve([[-366, -66, 1], [-298, -72, 1]], false), 3, C(INK, 0.8));
  for (const [sx, sy] of [[-356, -84], [-310, -88], [-350, 8], [-306, 4]]) {
    inked(g, ell(sx, sy, 5.5), C(mix(GIRL.brass, '#fff', 0.35)), 1.8, C(INK));
    line(g, curve([[sx - 3.5, sy - 1], [sx + 3.5, sy + 1]], false), 1.5, C(INK));
  }
  const bl = sstep(0.0, 0.08, power);
  inked(g, ell(-332, -30, 10), C(mix('#4a2a22', '#ff6a4a', bl)), 2.5, C(INK));
  if (gl && bl > 0) {
    const gr = gl.createRadialGradient(-332, -30, 0, -332, -30, 30);
    gr.addColorStop(0, `rgba(255,120,80,${0.7 * bl})`); gr.addColorStop(1, 'rgba(255,120,80,0)');
    gl.fillStyle = gr; gl.fillRect(-362, -60, 60, 60);
  }
}

// ─── Cara ───────────────────────────────────────────────────────────────────
// Primer plano de la cara, de frente, con la capucha amarilla (hood=true) o sin
// ella. Ancla: punto entre los dos ojos. size: altura de la cara de la
// barbilla a lo alto del pelo (en un primer plano típico, ≈ 600 px).
// goggles: 1 = gafas subidas en la frente, 0 = bajadas sobre los ojos.
// power: 0..1, se encienden los LEDs uno a uno (0–0,6) y después las lentes (0,6–1).
// look: -1..1 desplaza la mirada (si se ven los ojos).
// Opcionales: tint (color que multiplica todo, luz del plano), light ([x, y]
// dirección de la luz), mouth (0 cerrada … 1 abierta de asombro), blink
// (forzar 0..1; por defecto parpadea sola con t).
export function drawFace(g, t, { x, y, size, goggles = 1, power = 0, hood = true, look = 0, glow = null, tint = null, light = null, mouth = 0, blink = null }) {
  const P = geo();
  const C = toner(tint);
  const L = lightDir(light);
  const sxL = L[0] <= 0 ? 1 : -1;
  const k = size / 1000;
  const lw = 7, lw2 = 4;
  const skinSh = C(GIRL.skinShade);
  goggles = clamp(goggles); power = clamp(power);
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const breathe = Math.sin(t * 1.7) * 3;

  // Capucha por detrás: cuerpo, pliegues, brillos mojados y gotas.
  const coat = C(GIRL.coat), coatSh = C(GIRL.coatShade), coatLine = C(GIRL.coatLine);
  if (hood) {
    inked(g, P.hoodOut, coat, lw + 2);
    crescent(g, P.hoodOut, L[0] * 70, L[1] * 70, coatSh);
    // Pliegues: líneas que salen del borde con una cuña de sombra.
    for (const [a, len, s] of [[-2.55, 120, 1], [-2.2, 90, -1], [-0.62, 110, 1], [-0.3, 80, -1], [0.35, 120, 1], [2.75, 100, -1], [0.95, 90, 1]]) {
      const r0x = 528, r0y = 690;
      const x0 = Math.cos(a) * r0x, y0 = -30 + Math.sin(a) * r0y;
      const x1 = Math.cos(a + s * 0.08) * (r0x + len), y1 = -30 + Math.sin(a + s * 0.08) * (r0y + len * 0.6);
      const wedge = curve([[x0, y0, 1], [lerp(x0, x1, 0.5) + s * 14, lerp(y0, y1, 0.5)], [x1, y1, 1], [lerp(x0, x1, 0.5) + s * 30, lerp(y0, y1, 0.5) + 20]]);
      clipped(g, P.hoodOut, () => fill(g, wedge, C(celShadow(GIRL.coat, 0.84), 0.9)));
      taper(g, [[x0, y0], [lerp(x0, x1, 0.5) + s * 14, lerp(y0, y1, 0.5)], [x1, y1]], 5, coatLine, { a: 0.2, b: 0.5, w0: 0.8, w1: 0.05 });
    }
    // Brillo húmedo del plástico (lado de la luz).
    clipped(g, P.hoodOut, () => {
      for (const [a0, a1, rr, w] of [[-2.3, -1.75, 1.02, 26], [-1.68, -1.45, 1.03, 18], [-2.9, -2.55, 1.0, 20], [-3.1, -3.0, 1.0, 10]]) {
        const pt = (a) => [Math.cos(a) * 590 * rr * sxL, -36 + Math.sin(a) * 728 * rr];
        const p0 = pt(a0), p1 = pt((a0 + a1) / 2), p2 = pt(a1);
        taper(g, [p0, p1, p2], w, 'rgba(255,255,240,0.92)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
      }
    });
    // Gotas.
    for (const [a, u, r] of DROPS) {
      const ax = Math.cos(a), ay = Math.sin(a);
      const rx = lerp(528, 640, u) * ax, ry = -26 + lerp(686, 740, u) * ay;
      drawDrop(g, C, rx, ry, r, L);
    }
    // Forro de la capucha (por dentro, en sombra).
    fill(g, P.hoodIn, C(mix(celShadow(GIRL.coatShade, 0.66), '#3b2b3a', 0.2)));
  }

  // Pelo de detrás.
  g.save();
  if (hood) g.clip(P.hoodIn);
  inked(g, P.backHair, C(GIRL.hair), lw, C(HAIR_INK));
  crescent(g, P.backHair, L[0] * 50, L[1] * 50, C(GIRL.hairShade));
  g.restore();

  // Cuello y su sombra bajo la barbilla.
  inked(g, P.neck, C(GIRL.skin), lw2);
  castShadow(g, moved(P.face, 8 * -sxL, 74), P.neck, C('#d9b4ae'));
  crescent(g, P.neck, L[0] * 40, L[1] * 40, skinSh);

  // Ropa: sin capucha, cuello de la camisa y la bufanda.
  if (!hood) drawCollar(g, C, t, L, lw);

  // Cara.
  inked(g, P.face, C(GIRL.skin), lw);
  clipped(g, P.face, () => {
    crescent(g, P.face, L[0] * 46, L[1] * 46, skinSh);
    castShadow(g, moved(P.bangs, -L[0] * 16, 36), null, C('#e3c1bb'));
    castShadow(g, moved(P.lockR, -24, 26), null, C('#e3c1bb'));
    castShadow(g, moved(P.lockL, 24, 26), null, C('#e3c1bb'));
  });

  // Rasgos: rubor, ojos, nariz, boca.
  for (const m of [-1, 1]) {
    const bx = m * 214, by = 146;
    fill(g, ell(bx, by, 70, 30), C(GIRL.blush, 0.5));
    for (const dx of [-30, -2, 26]) taper(g, [[bx + dx + 9, by - 16], [bx + dx - 8, by + 16]], 5, C('#df6f66', 0.9), { a: 0.4, b: 0.6, w0: 0.3, w1: 0.2 });
  }
  let b = blink == null ? blinkAt(t, 1) : blink;
  b = Math.max(b, sstep(0.78, 0.5, goggles));
  for (const m of [-1, 1]) drawEye(g, C, m * 154, 6, m, look, b, L);
  // Nariz insinuada (lado de la sombra) y su sombrita.
  const nm = sxL;
  fill(g, curve([[nm * 4, 150], [nm * 24, 140], [nm * 22, 162], [nm * 6, 166]]), C(GIRL.skinShade, 0.9));
  taper(g, [[nm * 14, 108], [nm * 20, 136], [nm * 8, 156]], 6, C(INK, 0.85), { a: 0.3, b: 0.5, w0: 0.1, w1: 0.6 });
  // Boca.
  const mo = clamp(mouth);
  if (mo > 0.05) {
    const my = 256, h = 46 * mo;
    const mp = curve([[-36, my - 4, 1], [-14, my + 2], [0, my + 3], [14, my + 2], [36, my - 6, 1], [22, my + h * 0.7], [0, my + h], [-22, my + h * 0.7]]);
    inked(g, mp, C('#9a3f3f'), 5);
    clipped(g, mp, () => fill(g, ell(0, my + h + 4, 24, h * 0.45), C('#e8867a')));
    line(g, mp, 5, C(INK));
  } else {
    taper(g, [[-40, 248], [-16, 259], [0, 261], [16, 259], [40, 246]], 7, C(INK), { a: 0.35, b: 0.65, w0: 0.15, w1: 0.15 });
    taper(g, [[-14, 288], [0, 291], [14, 288]], 4, C(INK_SOFT, 0.5), { a: 0.4, b: 0.6 });
  }

  // Mechones laterales y flequillo.
  g.save();
  if (hood) g.clip(P.hoodIn);
  for (const key of ['lock2R', 'lock2L', 'lockR', 'lockL']) {
    inked(g, P[key], C(GIRL.hair), lw2 + 1, C(HAIR_INK));
    crescent(g, P[key], L[0] * 22, L[1] * 22, C(GIRL.hairShade));
  }
  // Línea interior de los mechones.
  for (const m of [-1, 1]) {
    taper(g, mirror([[300, -200], [326, -40], [322, 140], [300, 330]], m), 4, C(HAIR_INK), { a: 0.3, b: 0.6, w0: 0.1, w1: 0.05 });
    if (m === sxL) taper(g, mirror([[312, -150], [334, -20]], -m), 7, C(GIRL.hairHi, 0.9), { a: 0.5, b: 0.5, w0: 0.05, w1: 0.05 });
  }
  inked(g, P.bangs, C(GIRL.hair), lw, C(HAIR_INK));
  crescent(g, P.bangs, L[0] * 30, L[1] * 30, C(GIRL.hairShade));
  // Mechones: trazos desde cada muesca hacia la coronilla.
  for (let i = 0; i < NOTCH.length; i++) {
    const nx = (TIPS[i][0] + TIPS[i + 1][0]) / 2, ny = NOTCH[i];
    taper(g, [[nx, ny], [nx * 0.92, ny - 90], [nx * 0.7, ny - 200]], 5, C(HAIR_INK), { a: 0.05, b: 0.5, w0: 0.9, w1: 0.05 });
  }
  for (let i = 0; i < TIPS.length; i += 2) {
    const [tx, ty] = TIPS[i];
    taper(g, [[tx - tx * 0.06 + 6, ty - 40], [tx * 0.97 + 10, ty - 120]], 3.5, C(HAIR_INK), { a: 0.3, b: 0.4, w0: 0.1, w1: 0.05 });
  }
  // Brillo del pelo: tira de toques claros siguiendo la curva de la cabeza.
  clipped(g, P.bangs, () => {
    for (let i = 0; i < 6; i++) {
      const a0 = lerp(-2.7, -1.05, i / 6) + 0.02, a1 = a0 + 0.2;
      const u = i / 5, fade = sxL > 0 ? lerp(1, 0.45, u) : lerp(0.45, 1, u);
      const pt = (a, r) => [Math.cos(a) * 300 * r * sxL, -120 + Math.sin(a) * 300 * r];
      taper(g, [pt(a0, 1), pt((a0 + a1) / 2, 1.02 + 0.02 * Math.sin(i * 3)), pt(a1, 1)], 22 * fade, C(GIRL.hairHi, 0.9), { a: 0.45, b: 0.55, w0: 0.05, w1: 0.05 });
    }
  });
  g.restore();
  // Cejas finas (por encima del pelo, como en las películas).
  for (const m of [-1, 1]) taper(g, mirror([[96, -134], [150, -158], [210, -154], [246, -134]], m), 7, C(HAIR_INK), { a: 0.2, b: 0.55, w0: 0.5, w1: 0.05 });

  // Sombra de la capucha sobre el pelo y la cara (más ancha arriba).
  if (hood) {
    const out = new Path2D();
    out.rect(-2000, -2000, 4000, 4000);
    out.addPath(moved(P.hoodIn, -L[0] * 30, 44, 0.95, 0.94));
    g.save();
    g.clip(P.hoodIn);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = C('#cdb7c4');
    g.fill(out, 'evenodd');
    g.restore();
  }

  // Gafas: posición entre la frente (1) y los ojos (0); la correa sigue a la cabeza.
  const gp = goggles;
  const gy = lerp(0, -342, gp) + breathe * 0;
  const gs = lerp(1.0, 0.93, gp) + 0.05 * Math.sin(Math.PI * gp);
  const sq = lerp(1.0, 0.8, gp);
  drawStrap(g, C, P, hood, gy, gs, sq, gp, L);

  // Borde de la capucha: un rulo de plástico con pespunte.
  if (hood) {
    g.fillStyle = coat;
    g.fill(P.rim, 'evenodd');
    g.save();
    g.clip(P.rimOut);
    g.fillStyle = coatSh;
    const sh = new Path2D(); sh.addPath(P.rimOut); sh.addPath(moved(P.rimOut, L[0] * 26, L[1] * 26));
    g.fill(sh, 'evenodd');
    g.restore();
    g.save();
    g.setLineDash([16, 12]);
    line(g, P.rimMid, 3, C(GIRL.coatLine, 0.8));
    g.restore();
    line(g, P.rimOut, lw);
    line(g, P.hoodIn, lw);
    clipped(g, P.rimOut, () => {
      for (const [a0, a1] of [[-2.6, -2.05], [-1.95, -1.75], [-3.0, -2.75]]) {
        const pt = (a) => [Math.cos(a) * 492 * sxL, -20 + Math.sin(a) * 662];
        taper(g, [pt(a0), pt((a0 + a1) / 2), pt(a1)], 13, 'rgba(255,255,244,0.95)', { a: 0.4, b: 0.6, w0: 0.05, w1: 0.05 });
      }
      for (const [a, r] of [[-2.25, 9], [-0.9, 10], [0.35, 8], [2.7, 9], [-0.2, 7]]) drawDrop(g, C, Math.cos(a) * 496, -20 + Math.sin(a) * 660, r, L);
    });
    // Gota que resbala por el borde.
    const dt = (t * 0.22) % 1;
    const da = lerp(-2.1, -3.6, dt * dt);
    drawDrop(g, C, Math.cos(da) * 496 * sxL, -20 + Math.sin(da) * 660, 11 * (1 - dt * 0.4), L);
    // Abrigo, botones de presión y cordones de la capucha.
    inked(g, P.coat, coat, lw);
    crescent(g, P.coat, L[0] * 60, L[1] * 60, coatSh);
    castShadow(g, moved(P.hoodIn, 0, 60, 1, 1), P.coat, C('#d8c0b4'));
    taper(g, [[0, 524], [0, 1080]], 6, C(INK), { w0: 1, w1: 1 });
    taper(g, [[22, 526], [22, 1080]], 3, coatLine, { w0: 1, w1: 1 });
    for (const sy of [640, 820]) { inked(g, ell(-30, sy, 18), C('#c9c3b8'), 4); fill(g, ell(-35, sy - 5, 6), '#ffffff'); }
    for (const m of [-1, 1]) {
      const sw = Math.sin(t * 1.3 + m) * 6;
      const cord = curve([[m * 150, 512], [m * 162 + sw * 0.4, 600], [m * 158 + sw, 700]], false);
      line(g, cord, 18, C(INK));
      line(g, cord, 10, C('#f3ead6'));
      const ax = m * 158 + sw, ay = 700;
      const tipP = curve([[ax - 10, ay - 4, 1], [ax + 10, ay - 4, 1], [ax + 9, ay + 40, 1], [ax - 9, ay + 40, 1]]);
      inked(g, tipP, C('#bcb6ad'), 4);
      fill(g, ell(ax - 3, ay + 10, 2.5, 9), '#ffffff');
    }
  }

  // Gafas encima de todo.
  g.save();
  g.translate(0, gy);
  g.scale(gs, gs * sq);
  let gl = null;
  if (glow) {
    gl = glow;
    gl.save();
    gl.setTransform(g.getTransform());
    gl.globalCompositeOperation = 'lighter';
  }
  drawGoggles(g, C, t, power, L, gl);
  if (gl) gl.restore();
  g.restore();

  // Luz cian de las lentes sobre mejillas, nariz y flequillo.
  const on = sstep(0.6, 1, power) * (1 - sstep(0.4, 0.9, goggles));
  if (on > 0) {
    const cyan = (cx, cy, r, a) => {
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgba(110,235,255,${a})`); gr.addColorStop(1, 'rgba(110,235,255,0)');
      return gr;
    };
    g.save();
    g.clip(P.face);
    g.globalCompositeOperation = 'screen';
    for (const m of [-1, 1]) { g.fillStyle = cyan(m * 165, gy + 150, 250, 0.55 * on); g.fillRect(-600, -600, 1200, 1200); }
    g.fillStyle = cyan(0, gy + 130, 130, 0.5 * on); g.fillRect(-600, -600, 1200, 1200);
    g.restore();
    g.save();
    g.clip(P.hair);
    g.globalCompositeOperation = 'screen';
    for (const m of [-1, 1]) { g.fillStyle = cyan(m * 165, gy, 300, 0.4 * on); g.fillRect(-600, -600, 1200, 1200); }
    g.restore();
  }
  g.restore();
}

// Gota de lluvia sobre plástico: cuerpo algo más oscuro, sombra abajo y brillo.
function drawDrop(g, C, x, y, r, L) {
  const p = ell(x, y, r, r * 1.12);
  fill(g, p, C(mix(GIRL.coat, GIRL.coatShade, 0.55), 0.95));
  crescent(g, p, -L[0] * r * 0.35, -L[1] * r * 0.35, C('#fff3b0', 0.9));
  crescent(g, p, L[0] * r * 0.3, L[1] * r * 0.3, C(GIRL.coatLine, 0.75));
  fill(g, ell(x + L[0] * r * 0.38, y + L[1] * r * 0.38, r * 0.28, r * 0.32), '#ffffff');
}

// Correa de cuero con pespunte, de la copa al lateral de la cabeza.
function drawStrap(g, C, P, hood, gy, gs, sq, gp, L) {
  g.save();
  g.clip(hood ? P.hoodIn : P.backHair);
  for (const m of [-1, 1]) {
    const x0 = m * 330 * gs, y0 = gy;
    const x2 = m * 560, y2 = gy + lerp(10, 96, gp);
    const x1 = m * 450, y1 = lerp(y0, y2, 0.4) - 4;
    const ctr = sample([[x0, y0], [x1, y1], [x2, y2]], false, 10);
    const hw = 30 * gs * sq;
    const A = [], B = [];
    ctr.forEach((p, i) => {
      const q = ctr[Math.min(ctr.length - 1, i + 1)], o = ctr[Math.max(0, i - 1)];
      let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      A.push([p[0] - dy * hw, p[1] + dx * hw]); B.push([p[0] + dy * hw, p[1] - dx * hw]);
    });
    const band = new Path2D();
    band.moveTo(A[0][0], A[0][1]); for (const p of A) band.lineTo(p[0], p[1]);
    for (let i = B.length - 1; i >= 0; i--) band.lineTo(B[i][0], B[i][1]);
    band.closePath();
    inked(g, band, C(GIRL.strap), 5);
    crescent(g, band, 0, -14 * m * 0 - 12, C(celShadow(GIRL.strap, 0.72)));
    g.save();
    g.setLineDash([10, 9]);
    for (const s of [0.62, -0.62]) {
      const st = new Path2D();
      ctr.forEach((p, i) => {
        const q = ctr[Math.min(ctr.length - 1, i + 1)], o = ctr[Math.max(0, i - 1)];
        let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const px = p[0] - dy * hw * s, py = p[1] + dx * hw * s;
        if (i === 0) st.moveTo(px, py); else st.lineTo(px, py);
      });
      line(g, st, 2.5, C('#c79a6a', 0.9));
    }
    g.restore();
  }
  g.restore();
}

// Sin capucha: cuello de camisa crema y la bufanda roja enrollada.
function drawCollar(g, C, t, L, lw) {
  const shirt = curve(sym([[0, 560], [160, 540], [330, 580], [520, 680], [640, 860], [680, 1080, 1], [0, 1080, 1]]));
  inked(g, shirt, C(GIRL.shirt), lw);
  crescent(g, shirt, L[0] * 50, L[1] * 50, C(celShadow(GIRL.shirt, 0.86)));
  const scarf = curve([[-250, 520], [-120, 580], [0, 600], [120, 580], [250, 520], [300, 600], [200, 700], [0, 730], [-200, 700], [-300, 600]]);
  inked(g, scarf, C(GIRL.scarf), lw);
  crescent(g, scarf, L[0] * 40, L[1] * 40, C(GIRL.scarfShade));
  for (const xx of [-150, -40, 80, 190]) taper(g, [[xx, 600], [xx + 20, 660], [xx + 10, 712]], 4, C(INK), { a: 0.3, b: 0.5 });
}
