// Mundo «goggles»: el primer plano de la chica bajándose las gafas («goggles»)
// y el viaje a través de las nubes hasta Nubaria («tunnel»).
//
// goggles: de frente, capucha puesta, lluvia y las luces del pueblo
// desenfocadas detrás. Se baja las gafas, los LEDs se encienden uno a uno, las
// lentes brillan cian y le iluminan la cara; la cámara entra en la lente de la
// derecha y acaba en un fogonazo cian.
// tunnel: desde el cian sube a través de nubes grises que se aclaran, con
// estelas de luz y partículas cuadradas (el guiño digital), de gris a dorado
// y a blanco.

import { place } from '../engine/stage.js';
import { mulberry32, cumulusMass, applyPaper, paintRain, makeCanvas, glow, css, mix, vgrad } from '../engine/paint.js';
import { lerp, smooth, smoother, easeIn, invLerp, clamp } from '../lib/util.js';
import { drawGirlFace } from '../characters/girl.js';

const CX = 960, CY = 400;
const FACE = { x: 960, y: 372, size: 640 };
const LENS = [FACE.x + 165 * FACE.size / 1000, FACE.y];

function bokehSheet(rng, w, h, n) {
  const c = makeCanvas(w, h), l = makeCanvas(w, h);
  const g = c.getContext('2d'), lg = l.getContext('2d');
  g.fillStyle = vgrad(g, 0, 0, 0, h, [[0, '#263040'], [0.55, '#36404f'], [1, '#2b3340']]);
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = rng() * w, y = h * (0.25 + rng() * 0.75), r = 18 + Math.pow(rng(), 2) * 90;
    const warm = rng() < 0.78;
    const col = warm ? (rng() < 0.5 ? '#ffb35a' : '#ffd38c') : '#9fd8e4';
    const a = 0.18 + rng() * 0.35;
    // Disco de bokeh: relleno suave con el borde algo más claro.
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, css(col, a * 0.75)); gr.addColorStop(0.82, css(col, a)); gr.addColorStop(0.93, css(mix(col, '#ffffff', 0.3), a * 1.2)); gr.addColorStop(1, css(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    glow(lg, x, y, r * 1.3, col, a * 0.35);
  }
  return { c, l };
}

export async function build(env) {
  const rng = mulberry32(1501);
  // Fondo de luces desenfocadas (profundidad 6).
  const BX = -160, BY = -120;
  const bokeh = bokehSheet(rng, 2240, 1040, 70);

  // Nubes del túnel: sprites grises y dorados (se funden según avanza).
  const greyPal = { hi: '#c7ccd2', lit: '#b3b9c1', mid: '#9aa1ab', shade: '#7f8792', deep: '#69717d', rim: '#dfe3e8' };
  const goldPal = { hi: '#fffcf4', lit: '#fff1d8', mid: '#fbe2c2', shade: '#f0cfaa', deep: '#e5bd98', rim: '#ffffff' };
  const sprites = [];
  for (let i = 0; i < 6; i++) {
    const w = 420 + rng() * 260, h = 220 + rng() * 120;
    const seed = 90 + i;
    sprites.push({
      grey: cumulusMass(mulberry32(seed), w, h, { pal: greyPal, light: [0, -1, 0.4], tower: 0.5, seed, flat: false }),
      gold: cumulusMass(mulberry32(seed), w, h, { pal: goldPal, light: [0, -1, 0.4], tower: 0.5, seed, flat: false }),
    });
  }
  const puffs = [];
  for (let i = 0; i < 42; i++) puffs.push({ a: rng() * Math.PI * 2, r: 0.35 + rng() * 1.2, z0: rng(), s: sprites[i % sprites.length], k: 0.8 + rng() * 0.6, flip: rng() < 0.5 });
  const streaks = [];
  for (let i = 0; i < 60; i++) streaks.push({ a: rng() * Math.PI * 2, z0: rng(), w: 1 + rng() * 2.5, gold: rng() < 0.5 });
  const bits = [];
  for (let i = 0; i < 90; i++) bits.push({ a: rng() * Math.PI * 2, r: 0.2 + rng() * 1.1, z0: rng(), s: 3 + rng() * 7, gold: rng() < 0.45 });

  return {
    shots: {
      goggles(f) {
        const { g, lt, u, post, dur } = f;
        const t = lt;
        post.sat = 0.95; post.contrast = 1.05; post.lift = [0, 0.005, 0.02]; post.gain = [0.98, 1, 1.03];
        post.bloom = 0.55; post.threshold = 0.78; post.vignette = 0.6;
        f.stage.setGlowGain(1.4);
        const goggles = 1 - smoother(invLerp(0.15, 0.85, t));
        const power = t < 2.0 ? 0.6 * invLerp(1.0, 2.0, t) : 0.6 + 0.4 * smooth(invLerp(2.0, 2.5, t));
        // Empuje suave y, al final, entrada en la lente de la derecha.
        const dive = easeIn(invLerp(dur - 0.8, dur, t));
        const zoom = lerp(1.0, 1.08, smooth(invLerp(0, dur - 0.8, t))) * lerp(1, 9, dive);
        const cam = { x: (LENS[0] - CX) * (1 - 1 / zoom) * smooth(invLerp(dur - 1.2, dur - 0.5, t)), y: (LENS[1] - CY) * (1 - 1 / zoom) * smooth(invLerp(dur - 1.2, dur - 0.5, t)), zoom };
        const at = (d, c = g) => { place(c, cam, d); c.translate(-CX, -CY); };
        g.imageSmoothingQuality = 'low';
        at(6); g.drawImage(bokeh.c, BX, BY);
        at(6, f.glow); f.glow.drawImage(bokeh.l, BX, BY);
        paintRain(g, 1920, 800, t, { count: 380, speed: 900, len: 26, angle: 0.08, color: '#c6d0da', alpha: 0.22, seed: 31, width: 1 });
        at(1);
        g.imageSmoothingQuality = 'high';
        drawGirlFace(g, t, { x: FACE.x, y: FACE.y, size: FACE.size, goggles, power, hood: true, look: 0, glow: f.glow, mouth: 0.25 * smooth(invLerp(2.0, 2.6, t)), tint: '#d9dfe8' });
        // Lluvia muy cerca, desenfocada (trazos anchos y tenues).
        at(0.6);
        paintRain(g, 1920, 800, t + 3, { count: 70, speed: 1600, len: 110, angle: 0.08, color: '#dfe6ee', alpha: 0.12, seed: 32, width: 6 });
        g.setTransform(1, 0, 0, 1, 0, 0);
        f.glow.setTransform(1, 0, 0, 1, 0, 0);
        applyPaper(g, env.paper, 0.1);
        post.zoom = 0.35 * dive; post.zoomCenter = [LENS[0] / 1920, 1 - LENS[1] / 800];
        post.flash = smooth(invLerp(dur - 0.55, dur, t)); post.flashColor = [0.75, 0.97, 1];
      },

      tunnel(f) {
        const { g, lt, u, post } = f;
        const t = lt;
        post.sat = 1.0; post.contrast = 1.02; post.bloom = 0.5; post.threshold = 0.8; post.vignette = 0.5;
        f.stage.setGlowGain(1.2);
        const warm = smooth(invLerp(0.25, 0.85, u));
        // Fondo: de gris azulado a dorado claro.
        g.fillStyle = vgrad(g, 0, 0, 0, 800, [[0, mix('#7d8794', '#ffe2b0', warm)], [0.5, mix('#98a1ac', '#fff1d6', warm)], [1, mix('#6f7884', '#ffd9a0', warm)]]);
        g.fillRect(0, 0, 1920, 800);
        const speed = lerp(0.35, 0.8, u);
        const proj = (a, r, z) => {
          const k = 1 / Math.max(0.04, z);
          return [CX + Math.cos(a) * r * 420 * k, CY + Math.sin(a) * r * 300 * k, k];
        };
        // Nubes que pasan a los lados (de lejos a cerca).
        const list = puffs.map((p) => ({ p, z: 1 - ((p.z0 + t * speed) % 1) })).sort((a, b) => b.z - a.z);
        for (const { p, z } of list) {
          const [x, y, k] = proj(p.a, p.r, z * 2.2);
          const s = k * 0.38 * p.k;
          const a = smooth(invLerp(1, 0.75, z)) * (1 - smooth(invLerp(0.18, 0.04, z)));
          if (a <= 0) continue;
          for (const [img, wgt] of [[p.s.grey, 1 - warm], [p.s.gold, warm]]) {
            if (wgt <= 0.01) continue;
            g.save();
            g.globalAlpha = a * wgt;
            g.translate(x, y); g.scale(p.flip ? -s : s, s);
            g.drawImage(img, -img.anchor[0], -img.height / 2);
            g.restore();
          }
        }
        // Estelas de luz (líneas de datos) y partículas cuadradas.
        f.glow.globalCompositeOperation = 'lighter';
        g.lineCap = 'round';
        for (const s of streaks) {
          const z = 1 - ((s.z0 + t * speed * 1.6) % 1);
          const [x0, y0] = proj(s.a, 0.25, z * 1.5 + 0.12), [x1, y1] = proj(s.a, 0.25, z * 1.5);
          const col = s.gold ? '#ffd98a' : '#9ff0ff';
          const a = smooth(invLerp(1, 0.7, z)) * 0.8;
          f.glow.strokeStyle = css(col, a * 0.6); f.glow.lineWidth = s.w * 3;
          f.glow.beginPath(); f.glow.moveTo(x0, y0); f.glow.lineTo(x1, y1); f.glow.stroke();
          g.strokeStyle = css(mix(col, '#ffffff', 0.5), a); g.lineWidth = s.w;
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        }
        for (const b of bits) {
          const z = 1 - ((b.z0 + t * speed * 1.2) % 1);
          const [x, y, k] = proj(b.a, b.r, z * 1.8);
          const sz = b.s * clamp(k * 0.5, 0.3, 4);
          const a = smooth(invLerp(1, 0.8, z)) * (0.5 + 0.5 * Math.sin(t * 9 + b.a * 10));
          const col = b.gold || warm > 0.6 ? '#ffe3a0' : '#a8f4ff';
          g.fillStyle = css(mix(col, '#ffffff', 0.4), a);
          g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          f.glow.fillStyle = css(col, a * 0.5);
          f.glow.fillRect(x - sz, y - sz, sz * 2, sz * 2);
        }
        f.glow.globalCompositeOperation = 'source-over';
        applyPaper(g, env.paper, 0.08);
        post.zoom = 0.04; post.zoomCenter = [0.5, 0.5];
        // Sale del fogonazo cian y acaba en blanco total.
        const fin = smooth(invLerp(0.78, 1, u));
        post.flash = Math.max(1 - smooth(invLerp(0, 0.5, t)), fin);
        post.flashColor = [lerp(0.75, 1, Math.min(1, t / 0.5 + fin)), lerp(0.97, 1, fin), 1];
      },
    },
  };
}
