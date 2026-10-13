// Plano «dive»: el clímax. El planeador se lanza en picado hacia un estallido
// de sol dorado entre las nubes; las nubes pasan a los lados como un túnel,
// líneas de velocidad y luz. Acaba en blanco.

import { applyPaper, glow, css, mix, vgrad, makeCanvas } from '../../engine/paint.js';
import { lerp, smooth, easeIn, invLerp } from '../../lib/util.js';
import { drawGliderRider } from '../../characters/girl.js';

const SUN = [960, 360];

export function makeDive(env, K) {
  // Copias doradas de las nubes (se funden con las blancas según se acerca el sol).
  const gold = K.puffs.map((c) => {
    const d = makeCanvas(c.width, c.height);
    const dg = d.getContext('2d');
    dg.drawImage(c, 0, 0);
    // Aclara hacia blanco cálido (teñir de naranja encima del gris da barro).
    dg.globalCompositeOperation = 'source-atop'; dg.fillStyle = css('#fff1d4', 0.55); dg.fillRect(0, 0, c.width, c.height);
    d.anchor = c.anchor;
    return d;
  });
  const puffs = [];
  for (let i = 0; i < 40; i++) puffs.push({ a: (i / 40) * Math.PI * 2 + (i % 3) * 0.4, r: 0.55 + ((i * 37) % 10) / 10, z0: ((i * 0.618) % 1), s: K.puffs[i % K.puffs.length], gs: gold[i % gold.length], flip: i % 2 === 0 });
  const lines = [];
  for (let i = 0; i < 70; i++) lines.push({ a: (i * 2.399) % (Math.PI * 2), z0: (i * 0.377) % 1, w: 1 + (i % 4) * 0.6 });

  return function dive(f) {
    const { g, lt, u, post, dur } = f;
    const t = lt;
    post.sat = 1.08; post.contrast = 1.04; post.lift = [0.01, 0.005, 0]; post.gain = [1.05, 1.0, 0.94];
    post.bloom = 0.45; post.threshold = 0.82; post.vignette = 0.5;
    f.stage.setGlowGain(1.3);
    const burst = smooth(invLerp(0, 1, u));
    // Cielo que se dora hacia el sol.
    g.fillStyle = vgrad(g, 0, 0, 0, 800, [[0, mix('#3a8fbe', '#7fbfdc', burst)], [0.45, mix('#9fd3e6', '#ffeac2', burst)], [1, mix('#cfe6ee', '#ffe0ae', burst * 0.8)]]);
    g.fillRect(0, 0, 1920, 800);
    // Sol que estalla entre las nubes.
    glow(g, SUN[0], SUN[1], 700, '#fff0c8', 0.55 + 0.3 * burst);
    glow(f.glow, SUN[0], SUN[1], 260 + 300 * burst, '#ffd98a', 0.35 + 0.4 * burst);
    const speed = lerp(0.45, 1.1, easeIn(u));
    const proj = (a, r, z) => { const k = 1 / Math.max(0.05, z); return [SUN[0] + Math.cos(a) * r * 430 * k, SUN[1] + Math.sin(a) * r * 300 * k, k]; };
    // Nubes que pasan rozando, como un túnel.
    const list = puffs.map((p) => ({ p, z: 1 - ((p.z0 + t * speed) % 1) })).sort((a, b) => b.z - a.z);
    g.imageSmoothingQuality = 'low';
    for (const { p, z } of list) {
      const [x, y, k] = proj(p.a, p.r, z * 2.4);
      const s = k * 0.42;
      const a = smooth(invLerp(1, 0.75, z)) * (1 - smooth(invLerp(0.2, 0.05, z)));
      if (a <= 0) continue;
      if (s > 4) continue;
      g.save(); g.translate(x, y); g.scale(p.flip ? -s : s, s);
      g.globalAlpha = a * (1 - burst); g.drawImage(p.s, -p.s.anchor[0], -p.s.height / 2);
      g.globalAlpha = a * burst; g.drawImage(p.gs, -p.s.anchor[0], -p.s.height / 2);
      g.restore();
    }
    // Líneas de velocidad.
    f.glow.globalCompositeOperation = 'lighter';
    for (const l of lines) {
      const z = 1 - ((l.z0 + t * speed * 1.7) % 1);
      const [x0, y0] = proj(l.a, 0.3, z * 1.4 + 0.14), [x1, y1] = proj(l.a, 0.3, z * 1.4);
      const a = smooth(invLerp(1, 0.7, z)) * 0.7;
      g.strokeStyle = css('#fffaf0', a); g.lineWidth = l.w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      f.glow.strokeStyle = css('#ffe0a0', a * 0.4); f.glow.lineWidth = l.w * 4;
      f.glow.beginPath(); f.glow.moveTo(x0, y0); f.glow.lineTo(x1, y1); f.glow.stroke();
    }
    f.glow.globalCompositeOperation = 'source-over';
    // El planeador en picado, de espaldas, encogiéndose hacia la luz.
    g.imageSmoothingQuality = 'high';
    const p = easeIn(u);
    drawGliderRider(g, t, { x: lerp(980, SUN[0], p), y: lerp(640, SUN[1] + 40, p), size: lerp(620, 120, p), view: 'back', bank: Math.sin(t * 2.2) * 0.12, glow: f.glow, rim: '#ffd98a' });
    applyPaper(g, env.paper, 0.08);
    post.rays = 0.35 + 0.3 * burst; post.sun = [SUN[0] / 1920, 1 - SUN[1] / 800]; post.raysDecay = 0.96; post.raysDensity = 0.95;
    post.zoom = 0.02 + 0.03 * easeIn(u); post.zoomCenter = [SUN[0] / 1920, 1 - SUN[1] / 800];
    post.flash = smooth(invLerp(dur - 0.4, dur, t));
  };
}
