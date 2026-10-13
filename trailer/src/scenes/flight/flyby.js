// Plano «flyby»: el planeador entra rozando la cámara por la derecha, con la
// bufanda ondeando, y se aleja hacia la izquierda ladeándose; la cámara lo
// sigue con un barrido y el cielo, las islas y las nubes pasan con velocidad.

import { place } from '../../engine/stage.js';
import { drawMass, applyPaper, paintWaterfall, glow } from '../../engine/paint.js';
import { lerp, smooth, smoother, easeOut, invLerp } from '../../lib/util.js';
import { drawGliderRider } from '../../characters/girl.js';
import { P } from './kit.js';

const CX = 960, CY = 400;

export function makeFlyby(env, K) {
  const farIsles = [[K.isles[3], 160, 380, 0.7], [K.isles[1], 1500, 330, 0.8], [K.isles[0], 2300, 360, 0.75]];
  const midIsles = [[K.isles[2], -300, 420, 1.0], [K.isles[1], 900, 250, 0.9]];
  return function flyby(f) {
    const { g, lt, u, post } = f;
    const t = lt;
    Object.assign(post, P.post);
    post.bloom = 0.25; post.threshold = 0.9; post.vignette = 0.38;
    // Barrido hacia la izquierda siguiendo al planeador.
    const e = smoother(u);
    const cam = { x: lerp(260, -320, e), y: lerp(30, -20, e), zoom: 1 };
    const at = (d) => { place(g, cam, d); g.translate(-CX, -CY); };
    g.imageSmoothingQuality = 'low';
    at(10); g.drawImage(K.sky, K.SKX, K.SKY);
    at(6); g.drawImage(K.sea, K.SEX, K.SEY);
    at(4);
    for (const [img, x, y, k] of farIsles) drawMass(g, img, x, y, k);
    at(2.2);
    for (const [img, x, y, k] of midIsles) drawMass(g, img, x, y, k);
    paintWaterfall(g, -300 - 120, 430, 10, 220, t, { seed: 3, alpha: 0.7 });
    // Nubecillas a media distancia.
    at(1.4);
    drawMass(g, K.puffs[0], 1700, 760, 1.1);
    drawMass(g, K.puffs[1], -200, 820, 1.2);
    // El planeador (la cámara lo sigue: coordenadas de pantalla).
    g.setTransform(1, 0, 0, 1, 0, 0);
    const p = easeOut(u);
    const gx = lerp(1780, 640, p), gy = lerp(700, 330, p);
    const size = lerp(1300, 330, p);
    const bank = lerp(0.28, -0.22, smooth(u));
    g.imageSmoothingQuality = 'high';
    drawGliderRider(g, t, { x: gx, y: gy, size, view: 'back', bank, glow: f.glow });
    // Jirones que pasan muy cerca, deprisa (sensación de velocidad).
    for (let i = 0; i < 3; i++) {
      const k = (u * 1.6 + i * 0.37) % 1;
      const x = lerp(2300, -500, k), y = 120 + i * 260;
      g.save(); g.globalAlpha = 0.35 * Math.sin(k * Math.PI); drawMass(g, K.puffs[2 + i], x, y, 1.6); g.restore();
    }
    applyPaper(g, env.paper, 0.1);
    post.zoom = 0.012; post.zoomCenter = [gx / 1920, 1 - gy / 800];
  };
}
