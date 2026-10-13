// Mundo «meadow»: el acantilado de hierba de la exploradora («cliff») y el
// santuario en ruinas con la llave dorada («shrine»). El santuario reutiliza
// las nubes, las islas y la hierba que pinta el acantilado.
import { buildCliff } from './meadow/cliff.js';
import { buildShrine } from './meadow/shrine.js';

export async function build(env) {
  const cliff = await buildCliff(env);
  const shrine = await buildShrine(env, cliff.shared);
  return { shots: { cliff: cliff.shot, shrine } };
}
