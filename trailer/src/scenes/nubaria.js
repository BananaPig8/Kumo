import { painted, place, blit, sunUV } from '../engine/stage.js';
import { mulberry32, paintSky, paintCirrus, cumulusMass, drawMass, cloudSeaMass, paintIsland, paintWaterfall, applyPaper, glow, css } from '../engine/paint.js';
import { PAL } from '../engine/style.js';
import { lerp, easeOut, smooth, invLerp } from '../lib/util.js';

// Prueba de estilo del plano de revelación (se completará después).
export async function build(env) {
  const P = PAL.morning;
  const L = P.light;
  const sky = painted(2400, 1100, (g, w, h) => {
    const rng = mulberry32(11);
    paintSky(g, w, h, { ...P.sky, horizonY: 0.78, seed: 2, streaks: 0.6 });
    glow(g, w * 0.78, h * 0.18, 520, P.sun, 0.55);
    paintCirrus(g, rng, w * 0.35, h * 0.16, w * 0.5, '#ffffff', 0.5, 16);
    paintCirrus(g, rng, w * 0.7, h * 0.3, w * 0.4, '#ffffff', 0.4, 10);
    // Torres de cúmulo lejanas.
    for (const [x, cw, ch] of [[0.12, 560, 520], [0.4, 460, 360], [0.66, 640, 600], [0.92, 520, 440]]) {
      drawMass(g, cumulusMass(rng, cw, ch, { light: [L[0], L[1], 0.6], pal: P.cloud, tower: 1.3, haze: 0.3, hazeColor: P.haze, seed: x * 10 }), w * x, h * 0.8);
    }
    applyPaper(g, env.paper, 0.25);
  });
  const sea = painted(2600, 520, (g, w, h) => {
    const rng = mulberry32(5);
    g.drawImage(cloudSeaMass(rng, w, h, { light: [L[0], L[1], 0.6], pal: P.cloud, haze: P.haze, rows: 9 }), 0, 0);
    applyPaper(g, env.paper, 0.25);
  });
  const isles = painted(2400, 900, (g, w, h) => {
    const rng = mulberry32(9);
    paintIsland(g, rng, w * 0.18, 420, 220, 210, { light: L, trees: 2, conifers: 1, haze: 0.35, hazeColor: P.haze });
    paintIsland(g, rng, w * 0.82, 360, 260, 250, { light: L, trees: 2, conifers: 2, haze: 0.3, hazeColor: P.haze });
    paintIsland(g, rng, w * 0.5, 470, 560, 380, { light: L, trees: 4, conifers: 2, haze: 0.08, hazeColor: P.haze });
    applyPaper(g, env.paper, 0.25);
  });

  return {
    shots: {
      reveal(f) {
        const { g, u, lt, post } = f;
        Object.assign(post, P.post);
        const e = easeOut(u);
        const cam = { x: lerp(-40, 30, u), y: lerp(160, 0, e), zoom: lerp(1.0, 1.08, u) };
        place(g, cam, 6); blit(g, sky, 0, -120);
        place(g, cam, 2.2); blit(g, isles, 0, -80);
        paintWaterfall(g, 1200 - 1200 + 40, -80 - 450 + 470 + 30, 18, 260, lt, { seed: 4 });
        place(g, cam, 1.2); blit(g, sea, 0, 260);
        post.flash = 1 - smooth(invLerp(0, 1.6, lt));
      },
      title(f) { f.g.fillStyle = '#000'; f.g.fillRect(0, 0, f.W, f.H); },
    },
  };
}
