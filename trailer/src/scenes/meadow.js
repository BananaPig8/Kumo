// Mundo «meadow»: el acantilado de hierba de la exploradora («cliff») y el
// santuario en ruinas con la llave dorada («shrine»).
import { buildCliff } from './meadow/cliff.js';

export async function build(env) {
  const cliff = await buildCliff(env);
  return {
    shots: {
      cliff,
      shrine({ g, W, H }) { g.fillStyle = '#20242c'; g.fillRect(0, 0, W, H); },
    },
  };
}
