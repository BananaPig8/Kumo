// El gato negro del tejado: compacto, orejas grandes, ojos amarillos y cola
// que se mece. Se dibuja mirando a la derecha y se refleja con `facing`.
// Espacio: 1000 unidades = altura del gato (de las patas a la punta de las orejas).

import { CAT, INK } from '../engine/style.js';
import { mix } from '../engine/paint.js';
import { TAU, lerp, clamp, sstep, curve, ell, toner, lightDir, fill, line, inked, crescent, clipped, taper, ribbon, cel, blinkAt } from './ink.js';

const FUR_HI = '#555872';
const EAR_IN = '#5b4552';

// Giro rápido de una oreja de vez en cuando.
function twitch(t, seed) {
  const P = 2.9;
  const k = Math.floor(t / P);
  const h = Math.abs(Math.sin((k + seed) * 78.233) * 43758.5453) % 1;
  const u = (t - k * P - 0.5 - h * 1.8) / 0.35;
  return u > 0 && u < 1 ? Math.sin(u * Math.PI) * (h > 0.5 ? 1 : -0.6) : 0;
}

export function drawCatImpl(g, t, { x, y, size, facing = 1, look = 0, tint = null, light = null, rim = null }) {
  const k = size / 1000;
  const C = toner(tint);
  const f = facing >= 0 ? 1 : -1;
  const L0 = lightDir(light);
  const L = [L0[0] * f, L0[1]];
  const lw = Math.max(16, 1.2 / k), lw2 = Math.max(9, 0.7 / k);
  look = clamp(look);
  const fur = C(CAT.fur), furSh = C(CAT.furShade), furHi = C(FUR_HI);
  const br = Math.sin(t * TAU / 2.6) * 0.012;
  g.save();
  g.translate(x, y);
  g.scale(k * f, k);
  g.lineJoin = 'round'; g.lineCap = 'round';

  // Cola: sale de atrás, sube y se riza; se mece con ondas lentas.
  const n = 26, len = 640;
  const tail = [[-200, -40]];
  let px = -200, py = -40;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const th = Math.PI + (Math.PI / 2) * Math.min(1, u * 1.5) + 1.1 * sstep(0.62, 1, u) + 0.45 * u * Math.sin(TAU * (u * 0.7 - t * 0.42)) + 0.12 * Math.sin(t * 1.3);
    px += Math.cos(th) * (len / n); py += Math.sin(th) * (len / n);
    tail.push([px, py]);
  }
  ribbon(g, tail, (u) => lerp(92, 62, u), () => 0, fur, fur, lw2 * 1.3, C(INK));
  inked(g, ell(px, py, 31, 31), fur, 0);
  const tipArc = new Path2D();
  const last = tail[n - 1];
  const ang = Math.atan2(py - last[1], px - last[0]);
  tipArc.arc(px, py, 31, ang - Math.PI / 2, ang + Math.PI / 2);
  line(g, tipArc, lw2 * 1.3, C(INK));
  // Brillo azulado a lo largo de la cola (lado de la luz).
  taper(g, tail.slice(4, n - 2).map(([a, b]) => [a - L[0] * 18, b - L[1] * 18]), 12, C(FUR_HI, 0.9), { a: 0.3, b: 0.7, w0: 0.05, w1: 0.05, steps: 2 });

  // Cuerpo con el muslo de atrás y el pecho delante (respira).
  g.save();
  g.scale(1, 1 + br);
  const body = curve([[-10, -610], [96, -590], [164, -510], [196, -390], [204, -260], [228, -130], [238, -30], [204, 0, 1], [-246, 0, 1], [-282, -60], [-286, -170], [-246, -320], [-176, -472], [-100, -570]]);
  cel(g, body, fur, furSh, L, 50, lw, C(INK), furHi, 22);
  taper(g, [[-50, -8], [-150, -60], [-214, -170], [-206, -270], [-160, -330]], lw2, C('#0f0e14'), { a: 0.2, b: 0.6 });
  // Patas delanteras.
  for (const [x0, w] of [[50, 58], [134, 62]]) {
    const leg = curve([[x0, -300], [x0 + w, -296], [x0 + w + 4, -40], [x0 + w + 12, -4, 1], [x0 - 8, -2, 1], [x0 - 2, -40]]);
    cel(g, leg, fur, furSh, L, 16, lw2, C(INK), furHi, 8);
    taper(g, [[x0 + 14, -8], [x0 + 16, -26]], lw2 * 0.7, C('#0f0e14'), { a: 0.3, b: 0.6 });
    taper(g, [[x0 + w - 10, -8], [x0 + w - 12, -26]], lw2 * 0.7, C('#0f0e14'), { a: 0.3, b: 0.6 });
  }
  if (rim) crescent(g, body, -L[0] * 18, -L[1] * 18, C(rim));
  g.restore();

  // Cabeza: se inclina hacia atrás al mirar arriba.
  g.save();
  g.translate(70, -690 - br * 600);
  g.rotate(-0.22 * look);
  g.translate(-70, 690);
  const tw1 = twitch(t, 1), tw2 = twitch(t + 1.3, 5);
  const ear = (bx0, by0, bx1, by1, tx, ty, rot, piv) => {
    g.save();
    g.translate(piv[0], piv[1]); g.rotate(rot); g.translate(-piv[0], -piv[1]);
    const out = curve([[bx0, by0], [lerp(bx0, tx, 0.55) - 10, lerp(by0, ty, 0.55)], [tx, ty, 1], [lerp(tx, bx1, 0.45) + 14, lerp(ty, by1, 0.45)], [bx1, by1]]);
    cel(g, out, fur, furSh, L, 26, lw, C(INK), furHi, 14);
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
    const inn = curve([[lerp(cx, bx0, 0.6), lerp(cy, by0, 0.6) - 8], [lerp(tx, cx, 0.25), lerp(ty, cy, 0.25), 1], [lerp(cx, bx1, 0.6), lerp(cy, by1, 0.6) - 8], [cx, cy - 26]]);
    fill(g, inn, C(EAR_IN));
    crescent(g, inn, L[0] * 14, L[1] * 14, C(mix(EAR_IN, '#000000', 0.35)));
    for (const s of [0.3, 0.5]) taper(g, [[lerp(cx, bx0, s), cy - 10], [lerp(tx, cx, 0.4) - 6, lerp(ty, cy, 0.4)]], lw2 * 0.6, C('#8c8494', 0.8), { a: 0.3, b: 0.5 });
    g.restore();
  };
  ear(-120, -790, 4, -862, -104, -1000, tw2 * 0.3, [-60, -830]);
  ear(118, -846, 252, -772, 262, -992, tw1 * 0.35, [190, -810]);
  const head = curve([[70, -880], [176, -858], [254, -786], [282, -694], [266, -606], [214, -556], [140, -540, 1], [96, -522], [40, -536, 1], [-40, -548], [-104, -598], [-136, -686], [-114, -778], [-38, -852]]);
  cel(g, head, fur, furSh, L, 44, lw, C(INK), furHi, 20);
  // Ojos amarillos grandes (parpadeo lento de gato).
  const bl = blinkAt(t * 0.8, 3);
  const eyeY = -712 - 10 * look;
  for (const [ex, rx, ry] of [[160, 52, 60], [-6, 44, 56]]) {
    const ey = eyeY;
    if (bl > 0.85) {
      taper(g, [[ex - rx, ey + 4], [ex, ey + 18], [ex + rx, ey + 2]], lw2 * 1.4, C(INK), { a: 0.3, b: 0.7 });
      continue;
    }
    const eye = ell(ex, ey, rx, ry * (1 - bl * 0.8), -0.12);
    fill(g, eye, C(CAT.eye));
    clipped(g, eye, () => {
      crescent(g, eye, 0, 30, C(mix(CAT.eye, '#c27a18', 0.6)));
      fill(g, ell(ex + 6 - look * 4, ey - 6 - look * 14, 13, 40), C('#16131a'));
      fill(g, ell(ex - rx * 0.35, ey - ry * 0.35, 11, 13), '#ffffff');
      fill(g, ell(ex + rx * 0.35, ey + ry * 0.4, 5, 5), 'rgba(255,255,255,0.8)');
    });
    line(g, eye, lw2 * 1.1, C(INK));
    taper(g, [[ex - rx - 6, ey - 8], [ex - rx * 0.2, ey - ry - 10], [ex + rx + 8, ey - ry * 0.4]], lw2 * 1.4, C(INK), { a: 0.3, b: 0.7, w0: 0.2, w1: 0.1 });
  }
  // Nariz, boca y bigotes.
  inked(g, curve([[78, -632, 1], [110, -636, 1], [96, -612, 1]]), C(CAT.nose), lw2 * 0.6);
  taper(g, [[96, -612], [96, -598], [78, -588]], lw2 * 0.8, C('#0d0c11'), { a: 0.3, b: 0.6 });
  taper(g, [[96, -598], [114, -588]], lw2 * 0.8, C('#0d0c11'), { a: 0.3, b: 0.6 });
  for (const [x0, y0, x1, y1] of [[170, -620, 330, -650], [172, -606, 336, -606], [168, -594, 316, -560], [0, -620, -150, -650], [-2, -606, -160, -604]]) {
    taper(g, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 6], [x1, y1]], lw2 * 0.55, C('#b9bccb', 0.7), { a: 0.1, b: 0.4, w0: 0.6, w1: 0.05 });
  }
  if (rim) crescent(g, head, -L[0] * 16, -L[1] * 16, C(rim));
  g.restore();
  g.restore();
}
