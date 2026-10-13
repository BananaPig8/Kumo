// Laboratorio: recreación de la referencia de estilo del cliente (cielo
// turquesa, cúmulo blanquísimo, prado verde amarillento lleno de flores).
import { mulberry32, paintSky, cumulusMass, drawMass, paintMeadow, applyPaper, painterly, bokehFlowers, paintStreaks, SKY_DAY, MEADOW_DAY, makeCanvas, fillBlob } from '../engine/paint.js';

export async function build(env) {
  const rng = mulberry32(21);
  const L = [-0.5, -0.85, 0.3];
  const big = cumulusMass(rng, 980, 560, { light: L, tower: 1.5, seed: 31 });
  const right = cumulusMass(rng, 520, 260, { light: L, tower: 0.6, seed: 6 });
  const left = cumulusMass(rng, 420, 300, { light: L, tower: 0.8, seed: 9 });
  const low = cumulusMass(rng, 700, 200, { light: L, tower: 0.4, seed: 12, haze: 0.2 });
  const sky = makeCanvas(1920, 800);
  {
    const g = sky.getContext('2d');
    paintSky(g, 1920, 800, { ...SKY_DAY, horizonY: 0.72, seed: 4, streaks: 0.35 });
    paintStreaks(g, mulberry32(5), 120, 170, 900, 0.28, { n: 2, alpha: 0.5, width: 3 });
    paintStreaks(g, mulberry32(6), 60, 330, 700, 0.2, { n: 2, alpha: 0.35, width: 2.5 });
    painterly(sky, { seed: 9, size: 18, alpha: 0.25, stretch: 3, soften: 1.5, angle: () => 0.1 });
  }
  const meadow = (() => {
    const c = makeCanvas(2000, 460);
    const g = c.getContext('2d');
    const edge = [];
    for (let i = 0; i <= 80; i++) { const x = i * 25; edge.push([x, 30 + x * 0.06 + Math.sin(i * 0.4) * 4]); }
    const hill = new Path2D();
    hill.moveTo(0, edge[0][1]); for (const p of edge) hill.lineTo(p[0], p[1]); hill.lineTo(2000, 460); hill.lineTo(0, 460); hill.closePath();
    g.save(); g.clip(hill);
    paintMeadow(g, rng, 0, 20, 2000, 440, { pal: MEADOW_DAY, density: 1.3, lean: 0.1, flowers: 4 });
    g.restore();
    paintMeadow(g, rng, 0, 0, 0, 0, { fringe: edge, pal: MEADOW_DAY });
    // Esquina de primer término en sombra: degradado radial que oscurece la hierba.
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createRadialGradient(60, 360, 20, 60, 360, 560);
    gr.addColorStop(0, 'rgba(12,60,22,0.75)'); gr.addColorStop(0.55, 'rgba(18,80,28,0.35)'); gr.addColorStop(1, 'rgba(18,80,28,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 2000, 460);
    g.restore();
    painterly(c, { seed: 4, size: 5, alpha: 0.4, stretch: 1.8, soften: 0.5 });
    return c;
  })();
  return {
    draw({ g, post }) {
      g.drawImage(sky, 0, 0);
      drawMass(g, left, 140, 470);
      drawMass(g, big, 1000, 590);
      drawMass(g, right, 1800, 430);
      drawMass(g, low, 1500, 600);
      g.drawImage(meadow, -40, 440);
      bokehFlowers(g, mulberry32(8), -60, 640, 260, 7);
      applyPaper(g, env.paper, 0.12);
      post.bloom = 0.35; post.threshold = 0.8; post.sat = 1.05;
    },
  };
}
