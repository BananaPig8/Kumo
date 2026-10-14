// Laboratorio: hoja de modelo de los personajes (?capture&lab=characters).
//  T=0 todas las funciones a tamaño medio · T=1 cara con gafas subidas
//  T=1.x gafas bajando · T=2 gafas bajadas, power 0,4 · T=3 power 1
//  T=4 vistas del planeador · T=5 de pie con viento · T=6 tejado con lluvia
//  T=7 sobre el fondo de estilo · T=8/9 cara enorme (detalle) apagada/encendida
import { drawGirlFace, drawGirlSittingBack, drawCat, drawGirlStandingBack, drawGliderRider } from '../characters/girl.js';
import { paintRain, applyPaper, vgrad, mulberry32, bokehFlowers, glow as glowBlob } from '../engine/paint.js';
import { build as buildRef } from './ref.js';

function neutral(g, W, H) {
  g.fillStyle = vgrad(g, 0, 0, 0, H, [[0, '#eeeae2'], [1, '#d9d4ca']]);
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(80,70,60,0.12)';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
}

function rainyBg(g, W, H) {
  g.fillStyle = vgrad(g, 0, 0, 0, H, [[0, '#4d5662'], [0.6, '#6c7682'], [1, '#3e454f']]);
  g.fillRect(0, 0, W, H);
  const rng = mulberry32(4);
  for (let i = 0; i < 26; i++) glowBlob(g, rng() * W, H * 0.45 + rng() * H * 0.5, 30 + rng() * 60, i % 3 ? '#ffbf66' : '#ffe2a8', 0.35);
}

export async function build(env) {
  const ref = await buildRef(env);
  return {
    draw(f) {
      const { g, glow, W, H, post } = f;
      const T = f.T;
      const t = T * 1.37;
      const ms = [];
      const time = (fn) => { const s = performance.now(); fn(); ms.push(Math.round(performance.now() - s)); };
      if (T < 1) {
        neutral(g, W, H);
        time(() => drawGirlFace(g, t, { x: 260, y: 330, size: 380, goggles: 1, glow }));
        time(() => drawGirlSittingBack(g, t, { x: 650, y: 560, size: 420, look: 0.3 }));
        time(() => drawCat(g, t, { x: 820, y: 565, size: 130, facing: -1 }));
        time(() => drawGirlStandingBack(g, t, { x: 1080, y: 720, size: 400, wind: 1, windDir: 1 }));
        time(() => drawGliderRider(g, t, { x: 1600, y: 250, size: 460, view: 'back', glow }));
        time(() => drawGliderRider(g, t, { x: 1600, y: 560, size: 420, view: 'side', dir: -1, glow }));
      } else if (T < 4) {
        rainyBg(g, W, H);
        let goggles = 1, power = 0;
        if (T >= 2) { goggles = 0; power = Math.min(1, 0.4 + (T - 2) * 0.6); }
        else if (T > 1) goggles = 1 - (T - 1);
        time(() => drawGirlFace(g, t, { x: 960, y: 440, size: 720, goggles, power, glow: T === 3.5 ? null : glow, look: 0 }));
        post.bloom = 0.4; post.threshold = 0.92;
      } else if (T < 5) {
        g.fillStyle = vgrad(g, 0, 0, 0, H, [[0, '#2585b1'], [1, '#a3d8e5']]);
        g.fillRect(0, 0, W, H);
        time(() => drawGliderRider(g, t, { x: 330, y: 260, size: 520, view: 'back', glow }));
        time(() => drawGliderRider(g, t, { x: 960, y: 230, size: 520, view: 'side', dir: 1, glow }));
        time(() => drawGliderRider(g, t, { x: 1600, y: 250, size: 520, view: 'front', glow }));
        time(() => drawGliderRider(g, t, { x: 330, y: 600, size: 480, view: 'below', glow }));
        time(() => drawGliderRider(g, t, { x: 960, y: 600, size: 420, view: 'back', bank: -0.35, glow }));
        time(() => drawGliderRider(g, t, { x: 1450, y: 620, size: 300, view: 'side', dir: -1, bank: 0.2, glow }));
        time(() => drawGliderRider(g, t, { x: 1780, y: 640, size: 120, view: 'back', glow }));
      } else if (T < 6) {
        neutral(g, W, H);
        time(() => drawGirlStandingBack(g, t, { x: 420, y: 760, size: 640, wind: 1, windDir: 1 }));
        time(() => drawGirlStandingBack(g, t + 0.6, { x: 1150, y: 740, size: 420, wind: 1, windDir: -1 }));
        time(() => drawGirlStandingBack(g, t, { x: 1650, y: 740, size: 300, wind: 0.3, windDir: 1 }));
      } else if (T < 7) {
        rainyBg(g, W, H);
        g.fillStyle = '#3d3a40';
        g.beginPath(); g.moveTo(0, 640); g.lineTo(960, 600); g.lineTo(1920, 640); g.lineTo(1920, 800); g.lineTo(0, 800); g.fill();
        time(() => drawGirlSittingBack(g, t, { x: 760, y: 610, size: 480, look: 0 }));
        time(() => drawCat(g, t, { x: 960, y: 606, size: 140, facing: 1 }));
        time(() => drawGirlSittingBack(g, t, { x: 1400, y: 610, size: 480, look: 1 }));
        time(() => drawCat(g, t, { x: 1570, y: 606, size: 140, facing: -1, look: 1 }));
        paintRain(g, W, H, t, { count: 500, alpha: 0.3 });
        time(() => drawGirlFace(g, t, { x: 230, y: 330, size: 300, goggles: 0.5, tint: '#b8c0d0' }));
      } else if (T < 8) {
        ref.draw(f);
        time(() => drawGirlStandingBack(g, t, { x: 700, y: 760, size: 380, wind: 1, windDir: 1 }));
        time(() => drawGliderRider(g, t, { x: 1350, y: 200, size: 300, view: 'side', dir: -1, bank: 0.1 }));
        time(() => drawGliderRider(g, t, { x: 1700, y: 120, size: 160, view: 'below' }));
      } else {
        rainyBg(g, W, H);
        const on = T >= 9;
        time(() => drawGirlFace(g, t, { x: 960, y: 330, size: 1400, goggles: on ? 0 : 1, power: on ? 1 : 0, glow }));
        post.bloom = 0.4; post.threshold = 0.92;
      }
      applyPaper(g, env.paper, 0.06);
      console.warn('ms personajes', T, ms.join(' '));
    },
  };
}
