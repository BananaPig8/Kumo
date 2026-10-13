// Personajes dibujados (estilo acetato: línea fina marrón, color plano y una
// sombra dura). ESTE ARCHIVO ES UN BOCETO PROVISIONAL: siluetas simples con la
// API definitiva para que los planos puedan colocarlas mientras se dibujan
// los personajes de verdad.
//
// Convenciones comunes:
//  · Todas las funciones dibujan en el contexto 2D `g` con la transformación
//    que tenga en ese momento; (x, y) es el ANCLA indicada en cada función.
//  · `size` es la escala en píxeles indicada en cada función.
//  · `t` es el tiempo en segundos (para pelo, bufanda, respiración…). Todo debe
//    ser determinista: mismo t → mismo dibujo.
//  · `glow` (opcional) es el contexto de luz emisiva: lo que brille (LEDs,
//    lentes, punta de la antena) se pinta también ahí, en modo 'lighter'.

import { GIRL, CAT, GLIDER, INK, inkFill } from '../engine/style.js';
import { css } from '../engine/paint.js';
import { drawFace } from './face.js';

function ell(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); return p; }

// Sentada de espaldas en el caballete de un tejado, con el chubasquero
// amarillo y la capucha puesta, mirando al cielo.
// Ancla: punto donde se sienta (centro de la cadera sobre el caballete).
// size: altura que tendría de pie (≈ 3,3 × la altura sentada visible).
// look: 0 = mira al frente, 1 = mira hacia arriba (cabeza inclinada atrás).
export function drawGirlSittingBack(g, t, { x, y, size, look = 0, hood = true }) {
  const s = size;
  inkFill(g, ell(x, y - s * 0.13, s * 0.13, s * 0.15), GIRL.coat, { line: s * 0.006 });
  inkFill(g, ell(x, y - s * 0.32 - look * s * 0.01, s * 0.075, s * 0.08), hood ? GIRL.coat : GIRL.hair, { line: s * 0.006 });
}

// Gato negro sentado. Ancla: centro de la base (patas). size: altura del gato.
// facing: -1 mira a la izquierda, 1 a la derecha. look: 0 al frente, 1 arriba.
export function drawCat(g, t, { x, y, size, facing = 1, look = 0 }) {
  const s = size;
  inkFill(g, ell(x, y - s * 0.3, s * 0.22, s * 0.3), CAT.fur, { line: s * 0.02 });
  inkFill(g, ell(x + facing * s * 0.05, y - s * 0.72, s * 0.17, s * 0.15), CAT.fur, { line: s * 0.02 });
}

// Primer plano de la cara, de frente, con la capucha amarilla (hood=true) o sin
// ella. Ancla: punto entre los dos ojos. size: altura de la cara de la
// barbilla a lo alto del pelo (en un primer plano típico, ≈ 600 px).
// goggles: 1 = gafas subidas en la frente, 0 = bajadas sobre los ojos.
// power: 0..1, se encienden los LEDs uno a uno (0–0,6) y después las lentes (0,6–1).
// look: -1..1 desplaza la mirada (si se ven los ojos).
export function drawGirlFace(g, t, opts) { drawFace(g, t, opts); }

// De pie, de espaldas (tres cuartos), con ropa de exploradora y bufanda roja
// larga ondeando. Ancla: entre los pies. size: altura total.
// wind: 0..1 fuerza del viento; windDir: 1 sopla hacia la derecha, -1 izquierda.
export function drawGirlStandingBack(g, t, { x, y, size, wind = 1, windDir = 1 }) {
  const s = size;
  inkFill(g, ell(x, y - s * 0.25, s * 0.07, s * 0.25), GIRL.shorts, { line: s * 0.006 });
  inkFill(g, ell(x, y - s * 0.6, s * 0.1, s * 0.16), GIRL.vest, { line: s * 0.006 });
  inkFill(g, ell(x, y - s * 0.86, s * 0.08, s * 0.09), GIRL.hair, { line: s * 0.006 });
  inkFill(g, ell(x + windDir * s * 0.2, y - s * 0.74, s * 0.18, s * 0.03), GIRL.scarf, { line: s * 0.006 });
}

// El planeador con la chica tumbada encima. Ancla: centro del ala.
// size: envergadura en píxeles. view: 'back' (desde detrás), 'side' (de perfil,
// morro hacia la derecha si dir=1), 'front' (de frente, viene hacia cámara),
// 'below' (visto desde abajo, silueta). bank: alabeo en radianes.
// dir: 1 vuela hacia la derecha, -1 hacia la izquierda (para 'side').
export function drawGliderRider(g, t, { x, y, size, view = 'back', bank = 0, dir = 1, glow = null }) {
  const s = size;
  g.save();
  g.translate(x, y);
  g.rotate(bank);
  const wing = new Path2D();
  if (view === 'side') { wing.ellipse(0, 0, s * 0.3, s * 0.03, 0, 0, Math.PI * 2); }
  else { wing.moveTo(-s / 2, s * 0.02); wing.quadraticCurveTo(0, -s * 0.1, s / 2, s * 0.02); wing.quadraticCurveTo(0, s * 0.02, -s / 2, s * 0.02); }
  inkFill(g, wing, GLIDER.wing, { line: Math.max(1, s * 0.004) });
  inkFill(g, ell(0, -s * 0.04, s * 0.04, s * 0.03), GIRL.vest, { line: Math.max(1, s * 0.004) });
  inkFill(g, ell(-dir * s * 0.08, -s * 0.05, s * 0.08, s * 0.012), GIRL.scarf, { line: Math.max(1, s * 0.003) });
  g.restore();
}

export const INK_COLOR = INK;
