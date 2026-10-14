// Plano «chase»: detrás del planeador, que zigzaguea entre islas que vienen
// hacia la cámara desde el horizonte y pasan a los lados (mucho paralaje),
// rozando una cascada. Las islas se proyectan en perspectiva: x/z, y/z.

import { drawMass, applyPaper, paintWaterfall, makeCanvas } from '../../engine/paint.js';
import { lerp, smooth, invLerp, clamp } from '../../lib/util.js';
import { drawGliderRider } from '../../characters/girl.js';
import { P, HORIZON } from './kit.js';

const VP = [960, 400];

export function makeChase(env, K) {
  // Islas en el espacio: x lateral, y vertical (positivo = abajo), z0 profundidad inicial.
  const field = [
    { img: K.isles[0], x: -620, y: -40, z0: 1.4, fall: true },
    { img: K.isles[2], x: 760, y: 60, z0: 2.1, fall: true },
    { img: K.isles[1], x: -820, y: 140, z0: 2.9 },
    { img: K.isles[3], x: 520, y: -160, z0: 3.6 },
    { img: K.isles[0], x: 900, y: 20, z0: 4.4 },
    { img: K.isles[2], x: -700, y: -60, z0: 5.2, fall: true },
  ];
  const clouds = [];
  for (let i = 0; i < 10; i++) clouds.push({ img: K.puffs[i % K.puffs.length], x: (i % 2 ? 1 : -1) * (900 + (i * 137) % 600), y: 380 + (i * 71) % 200, z0: 0.6 + i * 0.55 });
  return function chase(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.25; post.threshold = 0.9; post.vignette = 0.4;
    // Zigzag: el planeador se ladea hacia donde gira y la cámara lo sigue a medias.
    const sway = Math.sin(t * 1.9);
    const gx = 960 + sway * 230, gy = 560 + Math.sin(t * 3.8) * 22;
    const bank = -Math.cos(t * 1.9) * 0.38;
    const camX = sway * 120, roll = bank * 0.25;
    g.save();
    g.translate(960, 400); g.rotate(roll); g.translate(-960 - camX * 0.15, -400);
    g.imageSmoothingQuality = 'low';
    g.drawImage(K.sky, K.SKX - 200, K.SKY + 40, K.sky.width * 1.05, K.sky.height * 1.05);
    // Suelo de nube bajo el mar (para que nunca asome el borde de las copias).
    g.fillStyle = '#c7d6dd'; g.fillRect(-400, HORIZON + 160, 2800, 900);
    // El mar de nubes corre hacia abajo: dos copias que se relevan.
    const scroll = (t * 0.35) % 1;
    for (const k of [scroll, scroll - 1]) {
      const s = 1 + k * 0.5;
      g.save(); g.globalAlpha = smooth(invLerp(-1, -0.6, k)) * (1 - smooth(invLerp(0.6, 1, k)));
      g.translate(960 - camX * 0.3, HORIZON + 10); g.scale(s, s);
      g.drawImage(K.sea, K.SEX - 960, -K.sea.height * 0.2);
      g.restore();
    }
    // Islas y nubes que vienen hacia la cámara, de lejos a cerca.
    const speed = 1.15;
    const items = [];
    for (const o of field) { const z = ((o.z0 - t * speed) % 5.6 + 5.6) % 5.6 + 0.15; items.push({ o, z, kind: 'isle' }); }
    for (const o of clouds) { const z = ((o.z0 - t * speed * 1.2) % 5.6 + 5.6) % 5.6 + 0.12; items.push({ o, z, kind: 'cloud' }); }
    items.sort((a, b) => b.z - a.z);
    for (const { o, z, kind } of items) {
      const k = 1 / z;
      const x = VP[0] + (o.x - camX) * k * 0.9, y = VP[1] + o.y * k * 0.9;
      const s = k * (kind === 'isle' ? 0.95 : 1.2);
      const a = smooth(invLerp(5.6, 4.4, z)) * (kind === 'cloud' ? 0.85 * (1 - smooth(invLerp(0.5, 0.15, z))) : 1);
      if (a <= 0 || s > 6) continue;
      g.save(); g.globalAlpha = a;
      drawMass(g, o.img, x, y, s);
      if (o.fall && kind === 'isle') paintWaterfall(g, x - o.img.anchor[0] * s * 0.45, y + 6 * s, 9 * s, 240 * s, t, { seed: 5, alpha: 0.75 });
      g.restore();
    }
    g.restore();
    // El planeador por delante de todo.
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingQuality = 'high';
    drawGliderRider(g, t, { x: gx, y: gy, size: 560, view: 'back', bank: bank + roll, glow: f.glow });
    applyPaper(g, env.paper, 0.1);
    post.zoom = 0.014; post.zoomCenter = [0.5, 0.5];
  };
}
