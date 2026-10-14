// Personajes dibujados en estilo acetato: línea fina marrón, color plano y una
// sombra dura, con la luz por defecto arriba a la izquierda. Este archivo es la
// API pública; el dibujo de cada pieza vive en face.js, body.js, cat.js y
// glider.js (y las herramientas de tinta en ink.js).
//
// Convenciones comunes:
//  · Todas las funciones dibujan en el contexto 2D `g` con la transformación
//    que tenga en ese momento; (x, y) es el ANCLA indicada en cada función.
//  · `size` es la escala en píxeles indicada en cada función.
//  · `t` es el tiempo en segundos (para pelo, bufanda, respiración…). Todo es
//    determinista: mismo t → mismo dibujo.
//  · `glow` (opcional) es el contexto de luz emisiva: lo que brille (LEDs,
//    lentes, punta de la antena) se pinta también ahí, en modo 'lighter'.
//
// Opciones extra (todas opcionales, en cualquier función):
//  · tint: color que multiplica todos los colores (luz del plano; p. ej.
//    '#b9c2d2' para el pueblo gris, '#ffd2b0' para el atardecer).
//  · light: [x, y] dirección de la que viene la luz (por defecto [-0.5, -0.85]).
//  · rim: color de contraluz; pinta un filo de luz en el lado de `light`.

import { INK } from '../engine/style.js';
import { drawFace } from './face.js';
import { drawSitting, drawStanding } from './body.js';
import { drawCatImpl } from './cat.js';
import { drawGliderImpl } from './glider.js';

// Sentada de espaldas en el caballete de un tejado, con el chubasquero
// amarillo y la capucha puesta, abrazándose las rodillas.
// Ancla: punto donde se sienta (centro de la cadera sobre el caballete).
// size: altura que tendría de pie (la figura sentada mide ≈ 0,45 × size).
// look: 0 = mira al frente, 1 = mira hacia arriba (cabeza inclinada atrás).
// hood: false enseña la media melena en vez de la capucha.
export function drawGirlSittingBack(g, t, opts) { drawSitting(g, t, opts); }

// Gato negro sentado. Ancla: centro de la base (patas). size: altura del gato
// (de las patas a la punta de las orejas).
// facing: -1 mira a la izquierda, 1 a la derecha. look: 0 al frente, 1 arriba.
export function drawCat(g, t, opts) { drawCatImpl(g, t, opts); }

// Primer plano de la cara, de frente, con la capucha amarilla (hood=true) o sin
// ella. Ancla: punto entre los dos ojos. size: altura de la cara de la
// barbilla a lo alto del pelo (en un primer plano típico, ≈ 600 px).
// goggles: 1 = gafas subidas en la frente, 0 = bajadas sobre los ojos.
// power: 0..1, se encienden los LEDs uno a uno (0–0,6) y después las lentes (0,6–1).
// look: -1..1 desplaza la mirada (si se ven los ojos).
// Extra: mouth (0 cerrada … 1 abierta de asombro), blink (fuerza el parpadeo
// 0..1; por defecto parpadea sola con t).
export function drawGirlFace(g, t, opts) { drawFace(g, t, opts); }

// De pie, de espaldas (tres cuartos), con ropa de exploradora y bufanda roja
// larguísima ondeando. Ancla: entre los pies. size: altura total.
// wind: 0..1 fuerza del viento; windDir: 1 sopla hacia la derecha, -1 izquierda.
// Extra: face (1 asoma la mejilla por la derecha, -1 por la izquierda, 0 nada).
export function drawGirlStandingBack(g, t, opts) { drawStanding(g, t, opts); }

// El planeador con la chica tumbada encima. Ancla: centro del ala.
// size: envergadura en píxeles. view: 'back' (desde detrás), 'side' (de perfil,
// morro hacia la derecha si dir=1), 'front' (de frente, viene hacia cámara),
// 'below' (visto desde abajo, silueta contra el cielo). bank: alabeo en radianes.
// dir: 1 vuela hacia la derecha, -1 hacia la izquierda (para 'side').
export function drawGliderRider(g, t, opts) { drawGliderImpl(g, t, opts); }

export const INK_COLOR = INK;
