// Guía de estilo común: paletas por acto, tinta de los personajes y la ficha
// de diseño de la protagonista. Todos los planos beben de aquí para que el
// tráiler parezca dibujado por el mismo equipo.

import { css, shade, mix } from './paint.js';

// Fotograma de trabajo: 1920×800 (2,4:1). Todas las coordenadas de dibujo se
// expresan en estos píxeles.
export const W = 1920;
export const H = 800;

// ─── Tinta de los personajes (estilo acetato) ───────────────────────────────
// Línea fina marrón muy oscuro (nunca negro puro), color plano y UNA sombra
// dura (más fría y algo violeta), a veces un brillo en pelo y ojos.
export const INK = '#3a2621';
export const INK_SOFT = '#5a3d33';
export const LINE = 2.2; // grosor de línea para un personaje de ~360 px de alto; escalar con el tamaño

// Sombra de acetato: el color base desplazado hacia azul/violeta y más oscuro.
export function celShadow(base, k = 0.78) {
  return mix(shade(base, k), '#5b5c8c', 0.16);
}

// Rellena una forma con color plano y la perfila con tinta.
export function inkFill(g, path, fill, { line = LINE, ink = INK, alpha = 1 } = {}) {
  g.fillStyle = css(fill, alpha);
  g.fill(path);
  if (line > 0) {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = css(ink, alpha);
    g.lineWidth = line;
    g.stroke(path);
  }
}

// Pinta la sombra de acetato recortada dentro de la forma base.
export function celShade(g, basePath, shadowPath, base, { k = 0.78, alpha = 1 } = {}) {
  g.save();
  g.clip(basePath);
  g.fillStyle = css(celShadow(base, k), alpha);
  g.fill(shadowPath);
  g.restore();
}

export function inkLine(g, path, { line = LINE, ink = INK, alpha = 1 } = {}) {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = css(ink, alpha);
  g.lineWidth = line;
  g.stroke(path);
}

// ─── Ficha de la protagonista ───────────────────────────────────────────────
// Chica de unos 13 años, delgada, proporciones de película de animación
// clásica (cabeza ≈ 1/5,5 de la altura, no chibi). Cara redonda con barbilla
// suave, ojos grandes ovalados marrón oscuro con un brillo blanco, nariz
// insinuada con un trazo, boca pequeña. Rubor rosado con dos o tres rayitas.
// Pelo castaño muy oscuro, media melena a la altura de la mandíbula con
// flequillo recto a mechones y dos mechones que enmarcan la cara.
// Gafas de chatarra: dos lentes redondas con aro de cobre, correa de cuero
// marrón, una antena fina con punta roja en el lado derecho y una cajita de
// pilas de latón en el izquierdo. Cuando se encienden: lentes cian y un aro
// de 8 LEDs cian alrededor de cada una.
export const GIRL = {
  skin: '#f6d9c0',
  skinShade: '#e3b29a',
  blush: '#f0a39a',
  hair: '#3b2823',
  hairShade: '#261917',
  hairHi: '#6b5550',
  eye: '#3a2420',
  eyeHi: '#ffffff',
  // Mundo real: chubasquero amarillo con capucha, mallas azul marino, botas rojas.
  coat: '#f1c232',
  coatShade: '#d39a24',
  coatLine: '#7a5a1c',
  leggings: '#2e3550',
  boots: '#b9372f',
  // Nubaria: exploradora.
  shirt: '#f2ead8',
  vest: '#7b5236',
  shorts: '#5a4131',
  socks: '#ece4d4',
  shoes: '#5b3b28',
  scarf: '#d23a2f',
  scarfShade: '#9e2a2a',
  bag: '#946339',
  // Gafas.
  copper: '#c47b3e',
  brass: '#a5844a',
  strap: '#5a3a26',
  lensOff: '#24424c',
  lensOn: '#8ff3ff',
  led: '#7ff6ff',
  antennaTip: '#ff4a38',
};

// El gato negro del tejado: compacto, orejas grandes, ojos amarillos.
export const CAT = { fur: '#2b2a35', furShade: '#1b1a22', eye: '#ffd760', nose: '#4b3c40' };

// El planeador: ala blanca en flecha con puntas rojas, quilla gris, la chica
// tumbada encima agarrada a dos asas (como en las películas de vuelo clásicas,
// pero diseño propio).
export const GLIDER = { wing: '#f4f0e6', wingShade: '#c9c4d6', tip: '#c9372d', keel: '#8b8478' };

// ─── Paletas de luz por momento ─────────────────────────────────────────────
// Cada una: cielo (top/mid/bottom), nubes (hi/lit/mid/shade/deep), luz y
// etalonaje sugerido para el postprocesado.
export const PAL = {
  grey: {
    sky: { top: '#5d6670', mid: '#7a848e', bottom: '#98a1a8' },
    cloud: { hi: '#a9b1b8', lit: '#9aa2ab', mid: '#848c97', shade: '#68717d', deep: '#565e69', rim: '#b8c0c8' },
    light: [0.2, -1], haze: '#8c959d', warmWindow: '#ffbf66',
    post: { sat: 0.72, contrast: 1.04, lift: [0, 0.005, 0.02], gain: [0.97, 0.99, 1.03] },
  },
  // Mañana y día: calibrados con la referencia del cliente (cielo turquesa,
  // nubes blanquísimas con sombras gris claro, luz de arriba a la izquierda).
  morning: {
    sky: { top: '#2585b1', mid: '#3d9cc3', bottom: '#b2dfe8' },
    cloud: { hi: '#ffffff', lit: '#fdfcf8', mid: '#e6e9ec', shade: '#c4cbd2', deep: '#9fb0bd', rim: '#fff8e8' },
    light: [-0.5, -0.85], haze: '#c2e3ec', sun: '#fff6dc',
    post: { sat: 1.05, contrast: 1.03, lift: [0, 0.004, 0.008], gain: [1.01, 1.0, 0.98] },
  },
  day: {
    sky: { top: '#2585b1', mid: '#3a99c1', bottom: '#a3d8e5' },
    cloud: { hi: '#ffffff', lit: '#f9fafb', mid: '#e3e7ea', shade: '#c2cad1', deep: '#9badba', rim: '#ffffff' },
    light: [-0.5, -0.85], haze: '#bfe3ee', sun: '#fffbe8',
    post: { sat: 1.05, contrast: 1.03, lift: [0, 0.003, 0.008], gain: [1, 1, 0.99] },
  },
  storm: {
    sky: { top: '#262b38', mid: '#3d4455', bottom: '#5b6273' },
    cloud: { hi: '#8f96a6', lit: '#7d8495', mid: '#666d7e', shade: '#4c5264', deep: '#393e4e', rim: '#a8b0c0' },
    light: [0.2, -1], haze: '#555c6c',
    post: { sat: 0.7, contrast: 1.1, lift: [0, 0, 0.02], gain: [0.97, 0.98, 1.04] },
  },
  golden: {
    sky: { top: '#3f6fbe', mid: '#9fb6d9', bottom: '#f7dfb8' },
    cloud: { hi: '#fffaf0', lit: '#ffe9c7', mid: '#ecd2c6', shade: '#b1a2cc', deep: '#9184b3', rim: '#ffd9a0' },
    light: [0, -0.4], haze: '#f1dcc0', sun: '#ffe2a6',
    post: { sat: 1.08, contrast: 1.03, lift: [0.01, 0.004, 0], gain: [1.04, 1.0, 0.95] },
  },
  sunset: {
    sky: { top: '#34418a', mid: '#a77fa6', bottom: '#ffc08e' },
    cloud: { hi: '#ffe7cf', lit: '#ffcfa6', mid: '#e3a7a2', shade: '#9a7fb8', deep: '#76619c', rim: '#ffbf85' },
    light: [0, -0.25], haze: '#e9b0a0', sun: '#ffb877',
    post: { sat: 1.08, contrast: 1.04, lift: [0.012, 0, 0.02], gain: [1.04, 0.98, 0.96] },
  },
};
