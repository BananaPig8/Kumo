// Plano «roof»: la chica, de espaldas con el chubasquero amarillo, sentada en
// el caballete de su tejado junto al gato negro, bajo la lluvia. Levanta la
// cabeza y la cámara sube con su mirada hasta las nubes, donde se abre un
// claro de luz dorada.

import { place, sunUV } from '../../engine/stage.js';
import { mulberry32, cumulusMass, drawMass, painterly, applyPaper, paintRain, makeCanvas, fillBlob, dab, stroke, glow, css, mix, vgrad } from '../../engine/paint.js';
import { PAL } from '../../engine/style.js';
import { lerp, smooth, easeInOut, invLerp } from '../../lib/util.js';
import { drawGirlSittingBack, drawCat } from '../../characters/girl.js';

const CX = 960, CY = 400;
const P = PAL.grey;
const RIDGE = (x) => 560 - (x - 820) * 0.035;
const GIRL = [820, RIDGE(820) + 2];
const CAT = [985, RIDGE(985) + 3];
const GAP = [1180, -560];

export async function buildRoof(env, shared) {
  const rng = mulberry32(1301);

  // ─── Cielo de arriba: nubes pesadas con un claro dorado (profundidad 12) ──
  const UX = -90, UY = -1300;
  const upper = makeCanvas(2100, 1500);
  {
    const g = upper.getContext('2d');
    g.fillStyle = vgrad(g, 0, 0, 0, 1500, [[0, '#3c444e'], [0.7, '#4c555f'], [0.88, '#4f5862'], [1, '#4a535d', 0]]);
    g.fillRect(0, 0, 2100, 1500);
    // El claro: cielo cálido detrás de las nubes.
    const gx = GAP[0] - UX, gy = GAP[1] - UY;
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, 520);
    gr.addColorStop(0, '#fff3d2'); gr.addColorStop(0.3, '#ffd896'); gr.addColorStop(0.65, '#f0b878'); gr.addColorStop(1, '#787882');
    g.save(); g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.ellipse(gx, gy, 620, 460, 0, 0, Math.PI * 2); g.fill(); g.restore();
    // Nubes alrededor del claro: oscuras, con el canto que mira al claro encendido.
    const dark = { hi: '#c2b8a8', lit: '#9a9ca2', mid: '#7b828c', shade: '#5f6670', deep: '#4b525c', rim: '#ffd9a0' };
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rng() * 0.3;
      const d = 300 + rng() * 260;
      const cx = gx + Math.cos(a) * d * 1.5, cy = gy + Math.sin(a) * d * 0.8;
      const lx = -Math.cos(a), ly = -Math.sin(a);
      // Sin base plana: vistas desde abajo, alrededor del hueco.
      const m = cumulusMass(rng, 520 + rng() * 360, 200 + rng() * 140, { pal: dark, light: [lx, ly, 0.3], tower: 0.4, seed: 60 + i, flat: false });
      drawMass(g, m, cx, cy + 100);
    }
    // Capa de nubes bajas grises hasta el horizonte.
    for (let i = 0; i < 8; i++) {
      const m = cumulusMass(rng, 700 + rng() * 400, 220 + rng() * 100, { pal: { ...P.cloud, hi: '#a7afb6', lit: '#949ca5', mid: '#7e8691', shade: '#646c77', deep: '#525a65' }, light: [0.1, -1, 0.3], tower: 0.3, seed: 80 + i });
      drawMass(g, m, (i / 7) * 2200 - 100, 1200 + (i % 2) * 90);
    }
    painterly(upper, { seed: 8, size: 7, alpha: 0.3, stretch: 2.2, soften: 0.8 });
    // Funde por abajo con el cielo del pueblo.
    g.globalCompositeOperation = 'destination-out';
    const fd = g.createLinearGradient(0, 1300, 0, 1500);
    fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fd; g.fillRect(0, 1300, 2100, 200);
  }

  // ─── Su tejado (profundidad 1) ────────────────────────────────────────────
  const RX = -200, RY = 440;
  const roof = makeCanvas(2400, 560);
  {
    const g = roof.getContext('2d');
    g.translate(-RX, -RY);
    const p = new Path2D();
    p.moveTo(-200, RIDGE(-200)); p.lineTo(2200, RIDGE(2200)); p.lineTo(2200, 1000); p.lineTo(-200, 1000); p.closePath();
    g.fillStyle = vgrad(g, 0, 520, 0, 1000, [[0, '#6a5a58'], [0.25, '#57494a'], [1, '#2f2a2e']]);
    g.fill(p);
    g.save(); g.clip(p);
    // Hileras de tejas curvas, cada vez más grandes hacia cámara.
    let y = RIDGE(820) + 14, row = 0;
    while (y < 1000) {
      const th = 11 + (y - 560) * 0.07;
      const tw = th * 1.7;
      for (let x = -200 - (row % 2) * tw * 0.5; x < 2200; x += tw) {
        const yy = y - (x - 820) * 0.035;
        // Tejas mojadas: oscuras, con el cielo gris reflejado en algunas.
        const c = mix(mix('#6e5856', '#4b4044', rng()), '#9aa3aa', rng() < 0.2 ? 0.3 : 0.08);
        g.fillStyle = css(c);
        g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + tw / 2, yy + th * 0.35, x + tw, yy); g.lineTo(x + tw, yy + th); g.quadraticCurveTo(x + tw / 2, yy + th * 1.3, x, yy + th); g.closePath(); g.fill();
        // Brillo de agua arriba de cada teja y sombra en el borde.
        dab(g, x + tw * 0.5, yy + th * 0.3, tw * 0.35, Math.max(1, th * 0.08), -0.03, '#b6bec4', 0.35, x, 0.05);
        g.strokeStyle = css('#2d2629', 0.55); g.lineWidth = Math.max(1, th * 0.07);
        g.beginPath(); g.moveTo(x, yy + th); g.quadraticCurveTo(x + tw / 2, yy + th * 1.3, x + tw, yy + th); g.stroke();
      }
      y += th * 0.9; row++;
    }
    g.restore();
    // Caballete: tejas cumbreras redondas.
    for (let x = -200; x < 2200; x += 34) {
      const yy = RIDGE(x);
      fillBlob(g, x + 17, yy + 2, 19, 9, '#6f605e', 1, { wobble: 0.05, n: 12, seed: x });
      dab(g, x + 14, yy - 2, 12, 2, -0.03, '#c3c9cd', 0.45, x, 0.05);
    }
    // Chimenea a la derecha con la ventanita del desván encendida debajo.
    const cx = 1420, cy = RIDGE(1420);
    g.fillStyle = css('#7d6a64'); g.fillRect(cx - 34, cy - 120, 68, 150);
    // Ladrillos: hiladas alternas con tonos sueltos.
    for (let r = 0; r < 15; r++) {
      const by = cy - 118 + r * 10;
      for (let k = -1; k < 5; k++) {
        const bx = cx - 34 + k * 17 + (r % 2) * 8.5;
        g.fillStyle = css(mix(mix('#8a6f66', '#6a5652', rng()), '#9aa3aa', 0.15));
        g.fillRect(Math.max(cx - 34, bx + 1), by + 1, Math.min(15, cx + 34 - bx - 1), 8);
      }
    }
    // Lado en sombra, churretes y sombrerete.
    g.fillStyle = css('#2e2a30', 0.45); g.fillRect(cx + 6, cy - 120, 28, 150);
    for (let i = 0; i < 8; i++) { const sx = cx - 30 + rng() * 60; stroke(g, [[sx, cy - 116], [sx + 1, cy - 116 + 40 + rng() * 80]], { width: 2 + rng() * 2, color: '#3b3436', alpha: 0.35, taper: [0.1, 0.8], seed: i }); }
    g.fillStyle = css('#3e383b'); g.fillRect(cx - 42, cy - 132, 84, 16);
    g.fillStyle = css('#a9b0b5', 0.5); g.fillRect(cx - 42, cy - 132, 84, 3);
    g.fillStyle = css('#2a2629'); g.fillRect(cx - 14, cy - 150, 28, 20);
  }
  const smoke = [];
  for (let i = 0; i < 14; i++) smoke.push({ ph: rng(), x: (rng() - 0.5) * 20, s: 18 + rng() * 26 });

  return function roofShot(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.4; post.threshold = 0.8; post.vignette = 0.55;
    f.stage.setGlowGain(1.0);
    // Mira hacia arriba y la cámara sube con su mirada.
    const look = smooth(invLerp(0.1, 0.45, u));
    const tilt = 900 * easeInOut(invLerp(0.22, 1, u));
    const cam = { x: lerp(-10, 10, u), y: 0, zoom: lerp(1.04, 1.0, u) };
    const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY + tilt * (0.8 + 0.2 / d)); };
    g.imageSmoothingQuality = 'low';
    const S = shared;

    at(12);
    g.drawImage(S.sky, S.SKX, S.SKY);
    g.drawImage(upper, UX, UY);
    // El claro se abre: la luz dorada crece al subir.
    const open = smooth(invLerp(0.45, 1, u));
    at(12, f.glow); glow(f.glow, GAP[0], GAP[1], 300 + 200 * open, '#ffd58a', 0.35 * open);
    at(8); g.drawImage(S.sea, S.SEX, S.SEY);
    at(7); g.drawImage(S.cape, S.CAX, S.CAY);
    at(5); g.drawImage(S.far.c, S.F.x, S.F.y);
    at(5, f.glow); f.glow.globalCompositeOperation = 'lighter'; f.glow.drawImage(S.far.l, S.F.x, S.F.y); f.glow.globalCompositeOperation = 'source-over';
    at(3); g.drawImage(S.mid.c, S.M.x, S.M.y + 60);
    at(3, f.glow); f.glow.globalCompositeOperation = 'lighter'; f.glow.drawImage(S.mid.l, S.M.x, S.M.y + 60); f.glow.globalCompositeOperation = 'source-over';
    paintRain(g, 1920, 800, t, { count: 380, speed: 1300, len: 30, angle: 0.1, color: '#cfd6dc', alpha: 0.2, seed: 21, width: 1 });

    at(1);
    g.drawImage(roof, RX, RY);
    f.glow.globalCompositeOperation = 'destination-out'; at(1, f.glow); f.glow.drawImage(roof, RX, RY); f.glow.globalCompositeOperation = 'source-over';
    // Humo de la chimenea, aplastado por la lluvia.
    for (const s of smoke) {
      const k = (s.ph + t * 0.25) % 1;
      fillBlob(g, 1420 + s.x + k * 120, RIDGE(1420) - 140 - k * 160, s.s * (0.6 + k), s.s * 0.6 * (0.6 + k), '#a3aab0', 0.3 * (1 - k), { wobble: 0.3, seed: s.ph * 10 });
    }
    drawGirlSittingBack(g, t, { x: GIRL[0], y: GIRL[1], size: 520, look, hood: true, tint: '#c9cfd8' });
    drawCat(g, t, { x: CAT[0], y: CAT[1], size: 112, facing: -1, look: look * 0.8, tint: '#c9cfd8' });
    // Salpicaduras en las tejas.
    for (let i = 0; i < 40; i++) {
      const k = (i * 0.618 + t * 3.1) % 1;
      const x = (i * 197) % 2000 - 40, y = RIDGE(x) + 30 + ((i * 89) % 300);
      g.strokeStyle = css('#dfe6ec', 0.5 * (1 - k)); g.lineWidth = 1.2;
      g.beginPath(); g.arc(x, y, 2 + k * 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    at(0.8);
    paintRain(g, 1920, 900, t + 4, { count: 240, speed: 2100, len: 70, angle: 0.1, color: '#dfe6ec', alpha: 0.28, seed: 22, width: 1.6 });

    g.setTransform(1, 0, 0, 1, 0, 0);
    f.glow.setTransform(1, 0, 0, 1, 0, 0);
    applyPaper(g, env.paper, 0.12);
    // Rayos desde el claro cuando ya está en cuadro.
    const sy = 400 + (GAP[1] - CY + tilt * (0.8 + 0.2 / 12));
    post.rays = 0.3 * open; post.sun = sunUV(960 + (GAP[0] - CX), sy); post.raysDecay = 0.955; post.raysDensity = 0.9;
    g.imageSmoothingQuality = 'high';
  };
}
