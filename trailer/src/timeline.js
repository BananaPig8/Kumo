// Montaje del tráiler. La música va a 72 BPM en 4/4: un compás dura 3,333 s y
// los 60 s son exactamente 18 compases, así que cada corte cae en un compás.

export const BAR = 60 / 72 * 4;
export const DURATION = 18 * BAR;
const b = (n) => +(n * BAR).toFixed(4);

export const SHOTS = {
  town: [b(0), b(2)],        // Pueblo gris bajo la lluvia
  roof: [b(2), b(3)],        // Ella en el tejado mirando arriba
  goggles: [b(3), b(4)],     // Primer plano: las gafas se encienden
  tunnel: [b(4), b(5)],      // Atraviesa las nubes
  reveal: [b(5), b(7)],      // Nubaria
  cliff: [b(7), b(9)],       // La aventurera en el acantilado
  shrine: [b(9), b(11)],     // La llave
  flyby: [b(11), b(12)],     // Planeador: pasada
  chase: [b(12), b(13)],     // Planeador: persecución entre islas
  whale: [b(13), b(14)],     // La ballena del cielo
  airship: [b(14), b(15)],   // La sombra del dirigible
  dive: [b(15), b(16)],      // Picado hacia el sol
  title: [b(16), b(18)],     // Título: KUMO · Más allá de la lluvia
};

export const CAPTIONS = [
  { text: 'En un mundo gris…', t0: 1.3, t1: 5.9 },
  { text: '…ella todavía mira hacia arriba.', t0: 7.3, t1: 9.85 },
  { text: 'Hace años, alguien construyó un mundo encima de las nubes.', t0: 19.0, t1: 23.0 },
  { text: 'Antes de irse, escondió tres llaves.', t0: 24.6, t1: 29.6 },
  { text: 'Quien las encuentre… lo heredará todo.', t0: 31.6, t1: 36.3 },
  { text: 'No es la única que las busca.', t0: 47.4, t1: 49.85 },
];

// Título del juego: «Kumo: Más allá de la lluvia» (kumo = 雲, «nube» en japonés).
export const TITLE = {
  word: 'KUMO', kanji: SHOTS.title[0] + 0.5, t0: SHOTS.title[0] + 0.8, sub: SHOTS.title[0] + 2.0,
  tag: SHOTS.title[0] + 3.1, soon: SHOTS.title[0] + 4.1, out: DURATION - 0.9,
};
