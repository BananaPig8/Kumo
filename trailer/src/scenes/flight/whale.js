// Plano «whale»: una ballena del cielo colosal y apacible emerge del mar de
// nubes junto al planeador diminuto. Lleva islitas con árboles en el lomo,
// pájaros alrededor y jirones de nube que le caen del vientre. Asombro.

import { place } from '../../engine/stage.js';
import { mulberry32, drawMass, applyPaper, renderMass, makeRamp, makeCanvas, fillBlob, dab, stroke, blade, cumulusMass, glow, css, mix, CLOUD_DAY } from '../../engine/paint.js';
import { lerp, smooth, smoother, invLerp, clamp } from '../../lib/util.js';
import { drawGliderRider } from '../../characters/girl.js';
import { paintLeafyTree, paintCapMeadow, LEAF_DAY } from '../meadow/brushes.js';
import { makeFlock, drawFlock } from '../nubaria/birds.js';
import { L, P } from './kit.js';

const CX = 960, CY = 400;
const SKIN = { deep: '#2b3a55', shade: '#435774', mid: '#6a82a3', lit: '#a3bad3', hi: '#dce7f1' };
const BELLY = '#dfe3df';

// Perfil del cuerpo: radio relativo en función de s (0 = morro, 1 = cola).
// Cabeza que crece deprisa, cuerpo grueso hasta la mitad y un pedúnculo estrecho.
const prof = (s) => (s < 0.24 ? 0.06 + 0.94 * Math.sqrt(s / 0.24) : s < 0.5 ? lerp(1, 0.86, (s - 0.24) / 0.26) : lerp(0.86, 0.1, Math.pow((s - 0.5) / 0.4, 0.75)));

function paintWhale(rng, len, R) {
  const pad = R * 0.7;
  const w = Math.ceil(len + pad * 2), h = Math.ceil(R * 2.6 + pad * 2);
  const spine = (s) => [pad + s * len, pad + R * 1.3 - Math.sin(s * Math.PI) * R * 0.18 + s * s * R * 0.2];
  const puffs = [];
  for (let i = 0; i <= 90; i++) {
    const s = Math.min(0.9, i / 100);
    const r = R * prof(s);
    const [x, y] = spine(s);
    // El vientre es más plano que el lomo: el centro baja un poco.
    // Garganta abultada abajo cerca de la cabeza; el vientre sube hacia la cola.
    // La cabeza es más plana por arriba (el centro baja) y el vientre sube hacia la cola.
    const flat = s < 0.25 ? (0.25 - s) * 0.9 : 0;
    puffs.push({ x, y: y + r * (0.3 - 0.6 * s + flat), rx: r * 1.0 + len * 0.01, ry: r, z: r * 0.25 });
  }
  const c = renderMass(w, h, puffs, {
    light: L, ramp: makeRamp([[0, SKIN.deep], [0.3, SKIN.shade], [0.52, SKIN.mid], [0.72, SKIN.lit], [0.9, SKIN.hi]], 1.8),
    sharpK: 0.05, edgeAmp: 0.03, edgeFreq: 0.01, brushAmp: 0.08, brushFreq: 0.012, brushStretch: 4,
    ao: 0.25, aoRadius: R * 0.15, aoRange: R * 0.2, bump: 1.1, wrap: 0.35, seed: 5,
    vertical: { top: pad, bottom: pad + R * 2.6, amount: 0.3 }, rim: 0.15, rimColor: '#eaf4fb',
  });
  const g = c.getContext('2d');
  g.save();
  g.globalCompositeOperation = 'source-atop';
  // Vientre claro con los pliegues de la garganta.
  const belly = new Path2D();
  for (let i = 0; i <= 60; i++) { const s = 0.03 + (i / 60) * 0.6; const [x, y] = spine(s); const r = R * prof(s); i ? belly.lineTo(x, y + r * 0.22) : belly.moveTo(x, y + r * 0.22); }
  belly.lineTo(spine(0.63)[0], h); belly.lineTo(spine(0.03)[0], h); belly.closePath();
  // Se funde por los extremos (sin cortes rectos) y por arriba.
  const bx0 = spine(0.03)[0], bx1 = spine(0.63)[0];
  const bg = g.createLinearGradient(bx0, 0, bx1, 0);
  bg.addColorStop(0, css(BELLY, 0)); bg.addColorStop(0.12, css(BELLY, 0.7)); bg.addColorStop(0.7, css(BELLY, 0.7)); bg.addColorStop(1, css(BELLY, 0));
  g.save(); g.filter = 'blur(6px)'; g.fillStyle = bg; g.fill(belly); g.restore();
  for (let k = 0; k < 9; k++) {
    const off = 0.32 + k * 0.075;
    const pts = [];
    for (let i = 0; i <= 30; i++) { const s = 0.05 + (i / 30) * (0.5 - k * 0.02); const [x, y] = spine(s); pts.push([x, y + R * prof(s) * off]); }
    stroke(g, pts, { width: Math.max(1.5, R * 0.012), color: '#9aa6b4', alpha: 0.45, taper: [0.35, 0.5], wobble: 0.1, seed: k });
  }
  // Manchas y lunares claros (percebes) en la cabeza y el lomo; moteado oscuro.
  for (let i = 0; i < 160; i++) {
    const s = Math.pow(rng(), 1.3) * 0.75, [x, y] = spine(s), r = R * prof(s);
    const yy = y - r * (0.2 + rng() * 0.75);
    if (rng() < 0.5) fillBlob(g, x + (rng() - 0.5) * 20, yy, 3 + rng() * 7, 2 + rng() * 5, '#e6eef5', 0.5, { wobble: 0.3, n: 8, seed: i });
    else dab(g, x, yy, R * (0.06 + rng() * 0.1), R * 0.03, (rng() - 0.5) * 0.4, SKIN.deep, 0.18, i, 0.2);
  }
  g.restore();
  // Boca: una curva larga y tranquila del morro hacia el ojo.
  const mouth = [];
  for (let i = 0; i <= 20; i++) { const s = 0.005 + (i / 20) * 0.16; const [x, y] = spine(s); mouth.push([x, y + R * prof(s) * (0.12 + i * 0.004)]); }
  stroke(g, mouth, { width: Math.max(2, R * 0.016), color: SKIN.deep, alpha: 0.8, taper: [0.05, 0.5], wobble: 0.05 });
  // Ojo pequeño y bondadoso, con su pliegue.
  const [ex, ey0] = spine(0.15);
  const ey = ey0 + R * prof(0.15) * 0.02;
  fillBlob(g, ex, ey, R * 0.05, R * 0.042, '#1b2333', 1, { wobble: 0.05, n: 14 });
  fillBlob(g, ex - R * 0.015, ey - R * 0.015, R * 0.015, R * 0.012, '#ffffff', 0.95, { wobble: 0.05, n: 10 });
  stroke(g, [[ex - R * 0.08, ey - R * 0.07], [ex, ey - R * 0.095], [ex + R * 0.08, ey - R * 0.065]], { width: Math.max(1.5, R * 0.012), color: SKIN.deep, alpha: 0.6 });
  // Jardín en el lomo: matas de hierba, musgo que chorrea y árboles pequeños.
  const top = (s) => { const [x, y] = spine(s); return [x, y - R * prof(s) * 0.97]; };
  for (const [s0, s1] of [[0.22, 0.34], [0.4, 0.55], [0.6, 0.66]]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(top(lerp(s0, s1, i / 16)));
    const cx = (pts[0][0] + pts[16][0]) / 2, cy = (pts[0][1] + pts[16][1]) / 2;
    const rx = (pts[16][0] - pts[0][0]) / 2 + 10, ry = R * 0.09;
    g.save();
    const cap = new Path2D(); cap.ellipse(cx, cy + ry * 0.2, rx, ry, Math.atan2(pts[16][1] - pts[0][1], pts[16][0] - pts[0][0]), 0, Math.PI * 2);
    g.clip(cap);
    paintCapMeadow(g, rng, cx, cy + ry * 0.2, rx, ry, { light: L, k: 0.6 });
    g.restore();
    for (let i = 0; i < rx / 3; i++) {
      const p = pts[Math.floor(rng() * 17)];
      stroke(g, [[p[0] + (rng() - 0.5) * 8, p[1] + ry * 0.6], [p[0] + (rng() - 0.5) * 10, p[1] + ry * 0.6 + 10 + rng() * R * 0.25]], { width: 2 + rng() * 4, color: rng() < 0.5 ? '#4f7f3a' : '#6b9a45', alpha: 0.75, taper: [0.05, 0.8], seed: i });
    }
    for (let i = 0; i < rx / 2; i++) { const p = pts[Math.floor(rng() * 17)]; blade(g, p[0] + (rng() - 0.5) * 6, p[1] + 2, 6 + rng() * 10, 1.6, (rng() - 0.4) * 6, rng() < 0.5 ? '#86c43e' : '#b6e05a', 1, i); }
  }
  for (const [s, hh] of [[0.26, 70], [0.3, 46], [0.45, 92], [0.5, 60], [0.63, 40]]) { const [x, y] = top(s); paintLeafyTree(g, rng, x, y + 4, hh, { leaf: LEAF_DAY, light: L, seed: s * 100 }); }
  // Aleta dorsal pequeña, cerca de la cola.
  {
    const [dx, dy] = spine(0.72);
    const r = R * prof(0.72);
    const top = dy + r * (0.3 - 0.6 * 0.72) - r;
    const df = new Path2D();
    df.moveTo(dx - R * 0.22, top + R * 0.04); df.quadraticCurveTo(dx + R * 0.02, top - R * 0.06, dx + R * 0.1, top - R * 0.2); df.quadraticCurveTo(dx + R * 0.08, top - R * 0.02, dx + R * 0.2, top + R * 0.05); df.closePath();
    g.fillStyle = css(SKIN.mid); g.fill(df);
    g.strokeStyle = css(SKIN.deep, 0.4); g.lineWidth = 1.5; g.stroke(df);
  }
  // Aletas de la cola vistas de lado: horizontales, finas y algo curvadas
  // hacia arriba en las puntas (no verticales como las de un pez).
  {
    const [tx, ty] = spine(0.9);
    const fl = new Path2D();
    fl.moveTo(tx - R * 0.05, ty - R * 0.08);
    fl.quadraticCurveTo(tx + R * 0.5, ty - R * 0.14, tx + R * 1.05, ty - R * 0.28);
    fl.quadraticCurveTo(tx + R * 0.95, ty - R * 0.12, tx + R * 1.1, ty - R * 0.02);
    fl.quadraticCurveTo(tx + R * 0.5, ty + R * 0.06, tx - R * 0.05, ty + R * 0.07);
    fl.closePath();
    const fg = g.createLinearGradient(0, ty - R * 0.28, 0, ty + R * 0.07);
    fg.addColorStop(0, SKIN.lit); fg.addColorStop(0.55, SKIN.mid); fg.addColorStop(1, SKIN.shade);
    g.fillStyle = fg; g.fill(fl);
    g.strokeStyle = css(SKIN.deep, 0.4); g.lineWidth = Math.max(1.5, R * 0.008); g.stroke(fl);
  }
  c.anchor = [pad, pad + R * 1.3];
  c.spine = spine; c.R = R;
  return c;
}

// Aleta pectoral larga (como la de una yubarta): clara por debajo, con nudos.
function paintFin(len, wd) {
  const c = makeCanvas(Math.ceil(len + 40), Math.ceil(wd * 2 + 40));
  const g = c.getContext('2d');
  const oy = wd + 20;
  // Hoja ancha en la raíz que se afila; el canto de ataque con bultitos.
  const top = [], bot = [];
  for (let i = 0; i <= 24; i++) {
    const s = i / 24;
    const half = wd * 0.5 * Math.pow(1 - s, 0.7) * (0.75 + 0.25 * Math.sin(Math.min(1, s * 3) * Math.PI / 2));
    const bow = Math.sin(s * Math.PI) * wd * 0.35;
    top.push([10 + s * len, oy - half + bow + Math.sin(s * 22) * wd * 0.025 * (1 - s)]);
    bot.push([10 + s * len, oy + half * 0.8 + bow]);
  }
  const p = new Path2D();
  p.moveTo(...top[0]); for (const q of top) p.lineTo(...q); for (let i = bot.length - 1; i >= 0; i--) p.lineTo(...bot[i]); p.closePath();
  const gr = g.createLinearGradient(0, oy - wd * 0.5, 0, oy + wd * 0.45);
  gr.addColorStop(0, SKIN.lit); gr.addColorStop(0.35, SKIN.mid); gr.addColorStop(0.7, css(mix(SKIN.mid, BELLY, 0.5))); gr.addColorStop(1, BELLY);
  g.fillStyle = gr; g.fill(p);
  g.strokeStyle = css(SKIN.deep, 0.45); g.lineWidth = 2; g.stroke(p);
  for (let i = 1; i < 9; i++) fillBlob(g, 10 + (i / 10) * len, top[Math.round(i * 2.4)][1] + wd * 0.06, wd * 0.045, wd * 0.035, '#e6eef5', 0.55, { n: 8, seed: i });
  c.root = [10, oy];
  return c;
}

export function makeWhale(env, K) {
  const rng = mulberry32(8101);
  const whale = paintWhale(rng, 1700, 210);
  const fin = paintFin(430, 150);
  // Banco de nubes por delante del vientre y la cola (de donde emerge).
  const bank = [];
  for (let i = 0; i < 6; i++) bank.push({ c: cumulusMass(rng, 520 + rng() * 300, 220 + rng() * 80, { light: L, pal: CLOUD_DAY, tower: 0.5, seed: 120 + i }), x: 260 + i * 330 + rng() * 60, y: 860 + rng() * 40 });
  const flock = makeFlock(rng, 12, { spread: [360, 140], size: [7, 12] });
  const streams = [];
  for (let i = 0; i < 9; i++) streams.push({ s: 0.08 + i * 0.075, ph: rng(), w: 14 + rng() * 22 });

  return function whaleShot(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.25; post.threshold = 0.9; post.vignette = 0.42;
    const e = smoother(u);
    const cam = { x: lerp(-40, 30, e), y: lerp(40, -30, e), zoom: lerp(1.0, 1.06, e) };
    const at = (d) => { place(g, cam, d); g.translate(-CX, -CY); };
    g.imageSmoothingQuality = 'low';
    at(10); g.drawImage(K.sky, K.SKX, K.SKY);
    at(6); g.drawImage(K.sea, K.SEX, K.SEY);
    // La ballena sube despacio y cabecea.
    at(2.8);
    const rise = lerp(170, 0, smoother(invLerp(0, 1, u)));
    const ang = 0.1 + Math.sin(t * 0.6) * 0.015;
    const hx = 200, hy = 300 + rise;
    g.save();
    g.translate(hx, hy); g.rotate(ang);
    // Aleta de detrás (asoma bajo el cuerpo).
    const [fx, fy] = whale.spine(0.27);
    const fa = 0.42 + Math.sin(t * 1.1) * 0.1;
    g.save(); g.translate(fx - whale.anchor[0] + 40, fy - whale.anchor[1] + whale.R * 0.55); g.rotate(fa + 0.18); g.scale(0.75, 0.75); g.drawImage(fin, -fin.root[0], -fin.root[1]); g.restore();
    g.drawImage(whale, -whale.anchor[0], -whale.anchor[1]);
    g.save(); g.translate(fx - whale.anchor[0], fy - whale.anchor[1] + whale.R * 0.45); g.rotate(fa); g.drawImage(fin, -fin.root[0], -fin.root[1]); g.restore();
    // Jirones de nube que le caen del vientre al subir.
    for (const st of streams) {
      const [sx, sy] = whale.spine(st.s);
      const yb = sy - whale.anchor[1] + whale.R * prof(st.s) * 0.85;
      for (let k = 0; k < 4; k++) {
        const q = (st.ph + t * 0.5 + k * 0.25) % 1;
        const wx = sx - whale.anchor[0] + Math.sin(q * 6 + st.s * 20) * 6, wy = yb + q * 220, wr = st.w * (1 + q * 2);
        g.save(); g.translate(wx, wy); g.scale(0.6, 1.6);
        const wg = g.createRadialGradient(0, 0, 0, 0, 0, wr);
        wg.addColorStop(0, css('#f4f8fa', 0.32 * (1 - q))); wg.addColorStop(1, css('#f4f8fa', 0));
        g.fillStyle = wg; g.fillRect(-wr, -wr, wr * 2, wr * 2); g.restore();
      }
    }
    g.restore();
    at(2.5); drawFlock(g, flock, lerp(700, 900, u), lerp(170, 130, u), t, { far: 0.1, dir: -1 });
    at(2.0); for (const b of bank) drawMass(g, b.c, b.x + Math.sin(t * 0.3 + b.x) * 6, b.y);
    // El planeador, diminuto, se acerca a la cabeza.
    at(1.6);
    drawGliderRider(g, t, { x: lerp(1500, 1380, u), y: lerp(560, 520, u), size: 190, view: 'back', bank: -0.12, glow: f.glow });
    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.1);
  };
}
