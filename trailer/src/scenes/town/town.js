// Plano «town»: el pueblo costero gris al anochecer, bajo la lluvia, visto
// desde lo alto de la colina. Tejados mojados en cascada hasta el puerto, el
// mar gris con el faro en el cabo (su haz gira), nubes bajas y pesadas, un
// poste de teléfono con los cables combados cruzando el plano y ventanas
// cálidas. Travelling lento multiplano; entra desde negro.

import { place } from '../../engine/stage.js';
import { mulberry32, cumulusMass, drawMass, painterly, applyPaper, paintRain, makeCanvas, fillBlob, dab, blade, stroke, glow, css, mix, vary, vgrad } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { lerp, smooth, smoother, invLerp, clamp } from '../../lib/util.js';
import { paintHouse, paintTownTree, paintPole, wirePath, paintLighthouse } from './houses.js';

const CX = 960, CY = 400;
const P = PAL.grey;
const HORIZON = 330;
const SKYREF = '#9aa3aa';

// Capa pintada una vez con su lienzo de luz (ventanas) del mismo tamaño.
function layer(w, h) {
  const c = makeCanvas(w, h), l = makeCanvas(w, h);
  return { c, l, g: c.getContext('2d'), lg: l.getContext('2d') };
}

// Fila de casas a lo largo de una línea (y en función de x), de atrás adelante.
function houseRow(L, rng, ox, oy, { x0, x1, y, w, floors = [1, 2], haze = 0, lit = 0.35, gap = 0.12, trees = 0.25 }) {
  const items = [];
  let x = x0;
  while (x < x1) {
    const ww = w * (0.75 + rng() * 0.5);
    items.push({ x: x + ww / 2, ww });
    x += ww * (1 + gap + rng() * gap);
  }
  for (const it of items) {
    const yy = (typeof y === 'function' ? y(it.x) : y) + (rng() - 0.5) * w * 0.12;
    if (rng() < trees) paintTownTree(L.g, rng, it.x - ox + it.ww * 0.55, yy - oy + w * 0.05, w * 0.42, { haze, hazeColor: P.haze });
    const side = rng() < 0.55 ? (it.x < 960 ? 1 : -1) * (rng() < 0.8 ? 1 : -1) : 0;
    paintHouse(L.g, rng, it.x - ox, yy - oy, it.ww, { floors: floors[0] + Math.floor(rng() * (floors[1] - floors[0] + 1)), side, sky: SKYREF, light: L.lg, lit, haze, hazeColor: P.haze });
  }
}

export async function buildTown(env) {
  const rng = mulberry32(1201);

  // ─── Cielo con nubes bajas (profundidad 12) ───────────────────────────────
  const SKX = -90, SKY = -80;
  const sky = makeCanvas(2100, 520);
  {
    const g = sky.getContext('2d');
    g.fillStyle = vgrad(g, 0, 0, 0, 520, [[0, '#4a535d'], [0.55, '#78828c'], [(HORIZON - 20 - SKY) / 520, '#a9b0b4'], [1, '#b4babd']]);
    g.fillRect(0, 0, 2100, 520);
    // Banda clara junto al horizonte (algo de luz se cuela por debajo).
    fillBlob(g, 1300, HORIZON - 22 - SKY, 900, 26, '#c5cacb', 0.45, { wobble: 0.3, seed: 3 });
    painterly(sky, { seed: 5, size: 20, alpha: 0.3, stretch: 3, soften: 1.5, angle: () => 0.05 });
    // Nubes bajas: masas planas grises, oscuras abajo, que tapan casi todo.
    const pal = { ...P.cloud, hi: '#b9c0c6', lit: '#a3abb3', mid: '#8a929c', shade: '#6c747f', deep: '#555d68' };
    for (let i = 0; i < 9; i++) {
      const w = 600 + rng() * 500, h = 170 + rng() * 120;
      const m = cumulusMass(rng, w, h, { pal, light: [0.15, -1, 0.3], tower: 0.25, seed: 20 + i, haze: 0.15 + (i % 3) * 0.08, hazeColor: '#7f8890' });
      drawMass(g, m, (i / 8) * 2200 - 100 + (rng() - 0.5) * 120, 120 + (i % 2) * 70 + rng() * 60 - SKY);
    }
    // Cortinas de lluvia colgando de las nubes sobre el mar.
    g.filter = 'blur(26px)';
    for (let i = 0; i < 7; i++) {
      const x = 200 + rng() * 1800, w = 120 + rng() * 220;
      const gr = g.createLinearGradient(0, 180 - SKY, 0, HORIZON + 10 - SKY);
      gr.addColorStop(0, 'rgba(120,130,140,0)'); gr.addColorStop(0.4, 'rgba(120,130,140,0.22)'); gr.addColorStop(1, 'rgba(150,158,164,0.35)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x, 180 - SKY); g.lineTo(x + w, 180 - SKY); g.lineTo(x + w + 40, HORIZON + 10 - SKY); g.lineTo(x + 40, HORIZON + 10 - SKY); g.closePath(); g.fill();
    }
    g.filter = 'none';
  }

  // ─── Mar (profundidad 8) ──────────────────────────────────────────────────
  const SEX = -90, SEY = HORIZON - 6;
  const sea = makeCanvas(2100, 200);
  {
    const g = sea.getContext('2d');
    g.fillStyle = vgrad(g, 0, 0, 0, 200, [[0, '#a3abb0'], [0.15, '#86919a'], [1, '#56626c']]);
    g.fillRect(0, 0, 2100, 200);
    // Rayas de oleaje: finas y claras lejos, más largas delante.
    for (let i = 0; i < 900; i++) {
      const t = Math.pow(rng(), 0.8), y = 4 + t * 196;
      dab(g, rng() * 2100, y, lerp(10, 70, t), lerp(0.8, 2.6, t), 0, rng() < 0.55 ? '#b9c1c5' : '#4b5660', lerp(0.25, 0.4, t), i, 0.02);
    }
    // Reflejo de la banda clara.
    fillBlob(g, 1390 - SEX, 14, 700, 10, '#cdd2d3', 0.35, { wobble: 0.3, seed: 9 });
    painterly(sea, { seed: 6, size: 8, alpha: 0.3, stretch: 4, soften: 0.6, angle: () => 0 });
    const mist = g.createLinearGradient(0, 0, 0, 40);
    mist.addColorStop(0, 'rgba(176,183,187,0.85)'); mist.addColorStop(1, 'rgba(176,183,187,0)');
    g.fillStyle = mist; g.fillRect(0, 0, 2100, 40);
  }

  // ─── Cabo con el faro (profundidad 7) ─────────────────────────────────────
  const CAX = 1250, CAY = 160;
  const cape = makeCanvas(900, 240);
  let lantern;
  {
    const g = cape.getContext('2d');
    const p = new Path2D();
    p.moveTo(0, HORIZON + 12 - CAY);
    for (let x = 0; x <= 900; x += 10) {
      const k = clamp((x - 60) / 520);
      p.lineTo(x, HORIZON + 10 - CAY - Math.pow(Math.sin(k * Math.PI / 2), 1.4) * 95 - Math.sin(x * 0.05) * 3);
    }
    p.lineTo(900, 240); p.lineTo(0, 240); p.closePath();
    g.fillStyle = vgrad(g, 0, 60, 0, 200, [[0, '#5d6862'], [1, '#424b4c']]);
    g.fill(p);
    g.save(); g.clip(p);
    for (let i = 0; i < 160; i++) dab(g, rng() * 900, 60 + rng() * 140, 10 + rng() * 30, 3 + rng() * 4, (rng() - 0.5) * 0.4, rng() < 0.5 ? '#6f7a72' : '#394244', 0.4, i);
    // Acantilado del cabo sobre el mar.
    for (let i = 0; i < 40; i++) { const x = 40 + rng() * 300; stroke(g, [[x, HORIZON - CAY - 20 + rng() * 20], [x + 4, HORIZON + 14 - CAY]], { width: 3 + rng() * 6, color: rng() < 0.5 ? '#8d918c' : '#4c5355', alpha: 0.45, seed: i }); }
    g.restore();
    lantern = paintLighthouse(g, 1640 - CAX, 262 - CAY, 64, { haze: 0.2, hazeColor: P.haze });
    lantern = [lantern[0] + CAX, lantern[1] + CAY];
    // Bruma sobre el cabo.
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = css(P.haze, 0.3); g.fillRect(0, 0, 900, 240);
  }

  // ─── El pueblo en tres capas (profundidades 5, 3 y 2) ─────────────────────
  const shore = (x) => 428 + Math.sin(x * 0.004) * 6;
  const F = { x: -120, y: 360, w: 2160, h: 200 };
  const far = layer(F.w, F.h);
  {
    const g = far.g;
    // Muelle, barcas y paseo marítimo.
    g.fillStyle = css('#5e6870'); g.fillRect(-F.x + 980, 416 - F.y, 260, 7);
    g.fillStyle = css('#4b545c'); g.fillRect(-F.x + 1220, 380 - F.y, 10, 44);
    for (let i = 0; i < 6; i++) {
      const bx = -F.x + 820 + i * 85 + rng() * 30, by = 412 - F.y + rng() * 6;
      fillBlob(g, bx, by, 12, 3.5, i % 2 ? '#7a4e46' : '#4f6a72', 1, { wobble: 0.1, seed: i });
      stroke(g, [[bx, by], [bx + 1, by - 16]], { width: 1, color: '#3d444c' });
    }
    // Ladera del pueblo (jardines y muros) bajo las casas.
    const ground = new Path2D();
    ground.moveTo(0, shore(F.x) - F.y);
    for (let x = 0; x <= F.w; x += 20) ground.lineTo(x, shore(x + F.x) - F.y - (x < 900 ? (900 - x) * 0.04 : 0));
    ground.lineTo(F.w, F.h); ground.lineTo(0, F.h); ground.closePath();
    g.fillStyle = vgrad(g, 0, 60, 0, F.h, [[0, '#6c7570'], [1, '#56605a']]); g.fill(ground);
    houseRow(far, rng, F.x, F.y, { x0: -100, x1: 950, y: (x) => shore(x) + 4 - (x < 900 ? (900 - x) * 0.04 : 0), w: 34, haze: 0.42, lit: 0.4, trees: 0.2 });
    houseRow(far, rng, F.x, F.y, { x0: 1260, x1: 2000, y: (x) => shore(x) + 2, w: 30, haze: 0.45, lit: 0.4, trees: 0.2 });
    houseRow(far, rng, F.x, F.y, { x0: -80, x1: 1300, y: (x) => 470 - (x < 900 ? (900 - x) * 0.05 : 0), w: 42, haze: 0.34, lit: 0.4 });
    // Farolas del paseo con su reflejo en el agua.
    for (let i = 0; i < 12; i++) {
      const lx = -F.x + 320 + i * 95, ly = shore(lx + F.x) - F.y - 14;
      g.fillStyle = css('#3e454c'); g.fillRect(lx - 0.8, ly, 1.6, 14);
      g.fillStyle = css('#ffe2a6'); g.fillRect(lx - 1.6, ly - 2, 3.2, 3.2);
      glow(far.lg, lx, ly, 14, '#ffbf66', 0.3);
    }
  }
  const M = { x: -140, y: 420, w: 2200, h: 260 };
  const mid = layer(M.w, M.h);
  {
    const g = mid.g;
    const ground = new Path2D();
    ground.moveTo(0, 60); for (let x = 0; x <= M.w; x += 20) ground.lineTo(x, 70 + Math.sin(x * 0.006) * 10 - (x < 1000 ? (1000 - x) * 0.05 : 0));
    ground.lineTo(M.w, M.h); ground.lineTo(0, M.h); ground.closePath();
    g.fillStyle = vgrad(g, 0, 20, 0, M.h, [[0, '#606a63'], [1, '#4d5651']]); g.fill(ground);
    houseRow(mid, rng, M.x, M.y, { x0: -120, x1: 2060, y: (x) => 512 - (x < 1000 ? (1000 - x) * 0.05 : 0), w: 64, haze: 0.22, lit: 0.42 });
    houseRow(mid, rng, M.x, M.y, { x0: -100, x1: 2060, y: (x) => 572 - (x < 1000 ? (1000 - x) * 0.04 : 0), w: 78, haze: 0.16, lit: 0.42 });
    // Calle que baja en zigzag con farolas.
    for (let i = 0; i < 7; i++) {
      const lx = -M.x + 180 + i * 260 + rng() * 40, ly = 590 - M.y - i * 6;
      g.fillStyle = css('#2f353b'); g.fillRect(lx - 1.2, ly - 30, 2.4, 30);
      g.fillStyle = css('#ffe6b0'); g.fillRect(lx - 3, ly - 34, 6, 5);
      glow(mid.lg, lx, ly - 32, 26, '#ffb85c', 0.3);
    }
  }
  const N = { x: -160, y: 520, w: 2240, h: 380 };
  const near = layer(N.w, N.h);
  {
    const g = near.g;
    const ground = new Path2D();
    ground.moveTo(0, 90); for (let x = 0; x <= N.w; x += 20) ground.lineTo(x, 100 + Math.sin(x * 0.005 + 1) * 14);
    ground.lineTo(N.w, N.h); ground.lineTo(0, N.h); ground.closePath();
    g.fillStyle = vgrad(g, 0, 60, 0, N.h, [[0, '#56605a'], [1, '#3f4843']]); g.fill(ground);
    houseRow(near, rng, N.x, N.y, { x0: -140, x1: 2080, y: (x) => 655 + Math.sin(x * 0.004) * 12, w: 104, haze: 0.08, lit: 0.45, floors: [2, 2], trees: 0.3 });
    houseRow(near, rng, N.x, N.y, { x0: -200, x1: 2100, y: (x) => 870 + Math.sin(x * 0.003 + 2) * 16, w: 160, haze: 0, lit: 0.45, floors: [2, 2], trees: 0.3, gap: 0.08 });
  }

  // Pincel por encima: rompe el aspecto de recorte.
  painterly(far.c, { seed: 41, size: 3, alpha: 0.35, stretch: 1.6, soften: 0.5, density: 0.8 });
  painterly(mid.c, { seed: 42, size: 4, alpha: 0.35, stretch: 1.6, soften: 0.5, density: 0.8 });
  painterly(near.c, { seed: 43, size: 6, alpha: 0.35, stretch: 1.6, soften: 0.6, density: 0.8 });

  // ─── Cima de la colina, poste y cables (profundidad 1) ────────────────────
  const fg = makeCanvas(2300, 1100);
  const FGX = -200, FGY = -200;
  let wires;
  {
    const g = fg.getContext('2d');
    g.translate(-FGX, -FGY);
    // Loma de hierba mojada abajo a la izquierda.
    const hill = new Path2D();
    hill.moveTo(-200, 690); hill.quadraticCurveTo(160, 640, 520, 760); hill.quadraticCurveTo(700, 820, 760, 900); hill.lineTo(-200, 900); hill.closePath();
    g.fillStyle = vgrad(g, 0, 640, 0, 900, [[0, '#3d4a40'], [1, '#232a26']]); g.fill(hill);
    for (let i = 0; i < 520; i++) {
      const x = -200 + rng() * 900, y = 660 + rng() * 240;
      if (!g.isPointInPath(hill, x - FGX, y - FGY)) continue;
      blade(g, x, y + 6, 18 + rng() * 46, 2 + rng() * 2, (rng() - 0.3) * 18, rng() < 0.6 ? '#2b362e' : '#5b6b5c', 1, i);
    }
    const ins = paintPole(g, 300, 900, 1100, { w: 22 });
    const ins2 = [[2160, 60], [2200, 64], [2250, 70], [2290, 74]];
    wires = ins.map((p, i) => wirePath(p, ins2[i], 120 + i * 18));
    g.lineCap = 'round';
    for (const w of wires) {
      g.strokeStyle = css('#262a2e'); g.lineWidth = 2.2;
      g.beginPath(); w.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
  }
  // Gotas colgando de los cables.
  const drops = [];
  for (let i = 0; i < 40; i++) drops.push({ w: i % 4, s: rng(), v: 0.01 + rng() * 0.02, ph: rng() });

  const shared = { sky, SKX, SKY, sea, SEX, SEY, cape, CAX, CAY, lantern, far, F, mid, M };
  return { shared, shot: function town(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.35; post.threshold = 0.8; post.vignette = 0.55;
    f.stage.setGlowGain(1.0);
    const e = smoother(u);
    const cam = { x: lerp(-60, 60, e), y: lerp(8, -10, e), zoom: lerp(1.0, 1.07, e) };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };
    g.imageSmoothingQuality = 'low';

    at(12); g.drawImage(sky, SKX, SKY);
    at(8);
    g.drawImage(sea, SEX, SEY);
    paintRain(g, 1920, 420, t, { count: 500, speed: 900, len: 18, angle: 0.1, color: '#c9d0d6', alpha: 0.18, seed: 11, width: 0.8 });
    at(7);
    g.drawImage(cape, CAX, CAY);
    // Haz del faro: gira; se alarga hacia los lados y destella al mirarnos.
    const a = t * 1.7;
    const sx = Math.sin(a), cz = Math.cos(a);
    at(7, f.glow);
    if (Math.abs(sx) > 0.05) {
      const len = 1500 * Math.abs(sx);
      const dir = Math.sign(sx);
      f.glow.save();
      f.glow.globalCompositeOperation = 'lighter';
      const bg = f.glow.createLinearGradient(lantern[0], 0, lantern[0] + dir * len, 0);
      bg.addColorStop(0, `rgba(255,236,190,${0.16 * (0.4 + 0.6 * Math.abs(sx))})`); bg.addColorStop(1, 'rgba(255,236,190,0)');
      f.glow.fillStyle = bg;
      f.glow.beginPath(); f.glow.moveTo(lantern[0], lantern[1] - 3); f.glow.lineTo(lantern[0] + dir * len, lantern[1] - 40 - len * 0.02); f.glow.lineTo(lantern[0] + dir * len, lantern[1] + 30 + len * 0.02); f.glow.lineTo(lantern[0], lantern[1] + 3); f.glow.closePath(); f.glow.fill();
      f.glow.restore();
    }
    glow(f.glow, lantern[0], lantern[1], 12 + 40 * Math.max(0, cz) ** 6, '#fff0c0', 0.25 + 0.3 * Math.max(0, cz) ** 6);
    at(5);
    g.drawImage(far.c, F.x, F.y);
    at(5, f.glow); f.glow.globalCompositeOperation = 'lighter'; f.glow.drawImage(far.l, F.x, F.y); f.glow.globalCompositeOperation = 'source-over';
    // Cada capa opaca borra la luz de las de detrás.
    const occlude = (img, x, y) => { f.glow.globalCompositeOperation = 'destination-out'; f.glow.drawImage(img, x, y); f.glow.globalCompositeOperation = 'source-over'; };
    at(3);
    g.drawImage(mid.c, M.x, M.y);
    at(3, f.glow); occlude(mid.c, M.x, M.y);
    paintRain(g, 1920, 800, t + 2, { count: 450, speed: 1300, len: 30, angle: 0.1, color: '#cfd6dc', alpha: 0.2, seed: 12, width: 1 });
    at(3, f.glow); f.glow.globalCompositeOperation = 'lighter'; f.glow.drawImage(mid.l, M.x, M.y); f.glow.globalCompositeOperation = 'source-over';
    at(2);
    g.drawImage(near.c, N.x, N.y);
    at(2, f.glow); occlude(near.c, N.x, N.y);
    at(2, f.glow); f.glow.globalCompositeOperation = 'lighter'; f.glow.drawImage(near.l, N.x, N.y); f.glow.globalCompositeOperation = 'source-over';
    at(1);
    g.drawImage(fg, FGX, FGY);
    at(1, f.glow); occlude(fg, FGX, FGY);
    for (const d of drops) {
      const w = wires[d.w];
      const s = (d.s + t * d.v) % 1;
      const i = Math.floor(s * (w.length - 1));
      const [x, y] = w[i];
      g.fillStyle = css('#dfe7ee', 0.8);
      g.beginPath(); g.arc(x, y + 2.5, 2.2, 0, Math.PI * 2); g.fill();
    }
    at(0.8);
    paintRain(g, 1920, 800, t + 5, { count: 260, speed: 2100, len: 70, angle: 0.1, color: '#dfe6ec', alpha: 0.28, seed: 13, width: 1.6 });

    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.12);
    post.fade = 1 - smooth(invLerp(0, 2.0, lt));
    g.imageSmoothingQuality = 'high';
  } };
}
