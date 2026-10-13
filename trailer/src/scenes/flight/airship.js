// Plano «airship»: el cielo se vuelve tormentoso. Desde las nubes oscuras
// asoma la panza de un dirigible de hierro inmenso: planchas remachadas,
// luces rojas que parpadean, hélices girando y focos que barren la niebla. Su
// sombra se come la luz de abajo. Solo se insinúa: niebla delante, silueta.

import { place } from '../../engine/stage.js';
import { mulberry32, cumulusMass, drawMass, applyPaper, makeCanvas, fillBlob, dab, stroke, glow, css, mix, vgrad, paintRain } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { lerp, smooth, smoother, invLerp } from '../../lib/util.js';
import { drawGliderRider } from '../../characters/girl.js';

const CX = 960, CY = 400;
const S = PAL.storm;
const IRON = { hi: '#7b8190', lit: '#5d6372', mid: '#454a57', shade: '#30343f', deep: '#1f222a', rust: '#6b4a3c' };

// La panza vista desde abajo: un huso enorme con cuadernas, planchas y
// remaches, una góndola de mando, aletas y los soportes de las hélices.
function paintHull(rng, w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const cx = w / 2, cy = h * 0.42, rx = w * 0.47, ry = h * 0.36;
  const body = new Path2D(); body.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.save(); g.clip(body);
  g.fillStyle = vgrad(g, 0, cy - ry, 0, cy + ry, [[0, IRON.deep], [0.45, IRON.shade], [0.75, IRON.mid], [1, IRON.lit]]);
  g.fillRect(0, 0, w, h);
  // Planchas: costuras longitudinales (curvas) y cuadernas, con remaches;
  // más marcadas abajo (donde llega la luz) y perdidas arriba en la sombra.
  for (let k = -5; k <= 5; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI - Math.PI / 2; pts.push([cx + Math.sin(a) * rx, cy + (k / 6) * ry * Math.cos(a) + Math.sin(i * 0.7 + k) * 1.5]); }
    const vis = 0.25 + 0.45 * ((k + 5) / 10);
    stroke(g, pts, { width: 2.2, color: IRON.deep, alpha: 0.35 * vis + 0.05, taper: [0.08, 0.08], wobble: 0.2, seed: k });
    stroke(g, pts.map(([x, y]) => [x, y + 3]), { width: 1.4, color: IRON.hi, alpha: 0.3 * vis, taper: [0.08, 0.08], seed: k + 20 });
  }
  for (let i = 1; i < 16; i++) {
    const x = cx - rx + (i / 16) * rx * 2 + (rng() - 0.5) * 20, half = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
    stroke(g, [[x, cy - half], [x + 4, cy], [x, cy + half]], { width: 5, color: IRON.deep, alpha: 0.28, taper: [0.3, 0.1], wobble: 0.15, seed: i });
    stroke(g, [[x + 5, cy - half * 0.2], [x + 8, cy + half * 0.95]], { width: 1.5, color: IRON.hi, alpha: 0.25, taper: [0.1, 0.1], seed: i + 40 });
    for (let r = 0; r < 14; r++) { const yy = cy + (r / 13) * half; g.fillStyle = css(IRON.hi, 0.18 + 0.3 * (r / 13)); g.fillRect(x + 6, yy, 2.5, 2.5); }
  }
  // Volumen: luz rasante del cielo abajo y sombra profunda arriba.
  const vol = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  vol.addColorStop(0, 'rgba(8,10,16,0.55)'); vol.addColorStop(0.5, 'rgba(8,10,16,0)'); vol.addColorStop(0.92, 'rgba(150,165,190,0.12)'); vol.addColorStop(1, 'rgba(190,205,230,0.3)');
  g.fillStyle = vol; g.fillRect(0, 0, w, h);
  // Óxido y churretes.
  for (let i = 0; i < 260; i++) dab(g, cx + (rng() - 0.5) * rx * 2, cy + (rng() - 0.2) * ry * 1.4, 10 + rng() * 40, 2 + rng() * 5, Math.PI / 2 + (rng() - 0.5) * 0.3, rng() < 0.5 ? IRON.rust : IRON.deep, 0.25, i, 0.1);
  g.restore();
  // Góndola de mando colgando en el centro, con ventanas rojizas.
  const gw = w * 0.16, gh = h * 0.16;
  const gp = new Path2D(); gp.moveTo(cx - gw / 2, cy + ry * 0.7); gp.lineTo(cx + gw / 2, cy + ry * 0.7); gp.lineTo(cx + gw * 0.38, cy + ry * 0.7 + gh); gp.lineTo(cx - gw * 0.38, cy + ry * 0.7 + gh); gp.closePath();
  g.fillStyle = vgrad(g, 0, cy + ry * 0.7, 0, cy + ry * 0.7 + gh, [[0, IRON.shade], [1, IRON.mid]]); g.fill(gp);
  for (let i = 0; i < 7; i++) { g.fillStyle = css('#ff7a52', 0.85); g.fillRect(cx - gw * 0.36 + i * gw * 0.105, cy + ry * 0.7 + gh * 0.35, gw * 0.06, gh * 0.25); }
  // Aletas de cola y soportes de las hélices.
  for (const sd of [-1, 1]) {
    const fx = cx + sd * rx * 0.8;
    const fp = new Path2D(); fp.moveTo(fx - sd * w * 0.04, cy + ry * 0.55); fp.quadraticCurveTo(fx + sd * w * 0.02, cy + ry * 0.7, fx + sd * w * 0.07, cy + ry * 1.08); fp.lineTo(fx - sd * w * 0.025, cy + ry * 0.98); fp.closePath();
    g.fillStyle = vgrad(g, 0, cy + ry * 0.55, 0, cy + ry * 1.08, [[0, IRON.deep], [1, IRON.mid]]); g.fill(fp);
    for (let k = 1; k < 4; k++) stroke(g, [[fx - sd * w * 0.04 + sd * k * w * 0.02, cy + ry * (0.6 + k * 0.05)], [fx + sd * k * w * 0.012, cy + ry * (0.98 + k * 0.02)]], { width: 2, color: IRON.hi, alpha: 0.3, taper: [0.1, 0.1] });
    stroke(g, [[cx + sd * rx * 0.35, cy + ry * 0.6], [cx + sd * rx * 0.55, cy + ry * 1.05]], { width: 14, color: IRON.deep, taper: [0.02, 0.02] });
  }
  c.props = [[cx - rx * 0.55, cy + ry * 1.05], [cx + rx * 0.55, cy + ry * 1.05]];
  c.lights = [[cx - rx * 0.92, cy + ry * 0.1], [cx + rx * 0.92, cy + ry * 0.1], [cx - rx * 0.4, cy + ry * 0.9], [cx + rx * 0.4, cy + ry * 0.9], [cx, cy + ry * 0.7 + gh + 8]];
  return c;
}

export function makeAirship(env, K) {
  const rng = mulberry32(9101);
  const hull = paintHull(rng, 2000, 760);
  // Nubes de tormenta: techo oscuro y jirones que pasan por delante.
  const dark = { ...S.cloud };
  const ceiling = [];
  for (let i = 0; i < 9; i++) ceiling.push({ c: cumulusMass(rng, 700 + rng() * 400, 260 + rng() * 120, { pal: dark, light: [0.2, 1, 0.3], tower: 0.4, seed: 140 + i, flat: false }), x: -200 + i * 290, y: 40 + (i % 3) * 50 });
  const fog = [];
  for (let i = 0; i < 6; i++) fog.push({ c: cumulusMass(rng, 900 + rng() * 300, 300, { pal: dark, light: [0.2, -1, 0.3], tower: 0.3, seed: 160 + i, flat: false }), x: i * 420 - 300, y: 420 + (i % 2) * 120, v: 30 + rng() * 30 });
  const below = cumulusMass(rng, 2400, 360, { pal: dark, light: [0, -1, 0.3], tower: 0.3, seed: 170 });

  return function airship(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, S.post);
    post.bloom = 0.45; post.threshold = 0.75; post.vignette = 0.6;
    f.stage.setGlowGain(1.2);
    const e = smoother(u);
    const cam = { x: lerp(-30, 30, e), y: lerp(20, -30, e), zoom: lerp(1.0, 1.05, e) };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };
    // El cielo se oscurece al empezar (venimos del día).
    const dusk = smooth(invLerp(0, 0.4, u));
    g.fillStyle = vgrad(g, 0, 0, 0, 800, [[0, mix('#5f87a6', S.sky.top, dusk)], [0.6, mix('#9cc3d5', S.sky.mid, dusk)], [1, mix('#c4dbe3', S.sky.bottom, dusk)]]);
    g.fillRect(0, 0, 1920, 800);
    g.imageSmoothingQuality = 'low';
    at(6); drawMass(g, below, 960, 1010);
    // Relámpago lejano dentro de las nubes.
    const flashT = (t * 0.9) % 1;
    if (flashT < 0.05) { at(6, f.glow); glow(f.glow, 1500, 520, 380, '#cfd8ff', 0.25 * (1 - flashT / 0.05)); }
    // La panza baja desde el techo de nubes.
    const drop = lerp(-330, -60, smoother(invLerp(0.05, 1, u)));
    at(2.2);
    g.drawImage(hull, 960 - hull.width / 2, drop);
    // Hélices: discos borrosos que giran.
    for (const [px, py] of hull.props) {
      const x = 960 - hull.width / 2 + px, y = drop + py;
      g.save(); g.translate(x, y);
      for (let k = 0; k < 3; k++) {
        const a = t * 22 + k * 2.09;
        g.save(); g.rotate(a); g.scale(1, 0.32);
        g.fillStyle = css(IRON.lit, 0.32); g.beginPath(); g.ellipse(0, 0, 150, 26, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // Disco borroso de las palas y el buje.
      const pd = g.createRadialGradient(0, 0, 10, 0, 0, 150);
      pd.addColorStop(0, css(IRON.hi, 0.25)); pd.addColorStop(0.85, css(IRON.lit, 0.18)); pd.addColorStop(1, css(IRON.lit, 0));
      g.save(); g.scale(1, 0.35); g.fillStyle = pd; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.fill(); g.restore();
      g.fillStyle = css(IRON.deep); g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // Luces rojas que parpadean y focos que barren hacia abajo.
    at(2.2, f.glow);
    for (const [i, [lx, ly]] of hull.lights.entries()) {
      const x = 960 - hull.width / 2 + lx, y = drop + ly;
      const on = (Math.sin(t * 4 + i * 1.7) > 0.2) ? 1 : 0.2;
      g.setTransform(f.glow.getTransform());
      g.fillStyle = css('#ff5a3c', 0.95 * on); g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      glow(f.glow, x, y, 60, '#ff4a2a', 0.5 * on);
    }
    for (const sd of [-1, 1]) {
      const sx = 960 + sd * 260, sy = drop + 660;
      const a = sd * 0.25 + Math.sin(t * 0.9 + sd) * 0.3;
      const ex = sx + Math.sin(a) * 900, ey = sy + Math.cos(a) * 900;
      const bg = f.glow.createLinearGradient(sx, sy, ex, ey);
      bg.addColorStop(0, 'rgba(230,236,255,0.18)'); bg.addColorStop(1, 'rgba(230,236,255,0)');
      f.glow.fillStyle = bg; f.glow.filter = 'blur(18px)';
      f.glow.beginPath(); f.glow.moveTo(sx - 8, sy); f.glow.lineTo(ex - 140, ey); f.glow.lineTo(ex + 140, ey); f.glow.lineTo(sx + 8, sy); f.glow.closePath(); f.glow.fill();
      f.glow.filter = 'none';
    }
    // Techo de nubes por delante de la parte alta del casco.
    at(1.8);
    for (const c of ceiling) drawMass(g, c.c, c.x, c.y - 120);
    // Niebla que pasa por delante (la silueta se insinúa).
    at(1.3);
    for (const fo of fog) { g.save(); g.globalAlpha = 0.6; drawMass(g, fo.c, ((fo.x + t * fo.v) % 2500) - 300, fo.y + 260); g.restore(); }
    // El planeador, minúsculo, a contraluz abajo a la izquierda.
    at(1.5);
    drawGliderRider(g, t, { x: lerp(420, 520, u), y: 640, size: 120, view: 'below', tint: '#6b7180' });
    paintRain(g, 1920, 800, t, { count: 300, speed: 1600, len: 40, angle: 0.18, color: '#aab3c4', alpha: 0.18, seed: 41, width: 1 });
    // La sombra del dirigible barre la escena de arriba abajo.
    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    const shY = lerp(-200, 900, smooth(invLerp(0.2, 1, u)));
    const sg = g.createLinearGradient(0, shY - 400, 0, shY);
    sg.addColorStop(0, 'rgba(12,14,22,0.45)'); sg.addColorStop(1, 'rgba(12,14,22,0)');
    g.fillStyle = sg; g.fillRect(0, 0, 1920, Math.max(0, shY));
    applyPaper(g, env.paper, 0.12);
  };
}
