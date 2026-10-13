// Mundo «flight»: el vuelo en planeador. Pasada («flyby»), persecución entre
// islas («chase»), la ballena del cielo («whale»), la sombra del dirigible
// («airship») y el picado hacia el sol («dive»).
import { buildKit } from './flight/kit.js';
import { makeFlyby } from './flight/flyby.js';
import { makeChase } from './flight/chase.js';
import { makeWhale } from './flight/whale.js';
import { makeAirship } from './flight/airship.js';
import { makeDive } from './flight/dive.js';

export async function build(env) {
  const K = buildKit();
  return {
    shots: {
      flyby: makeFlyby(env, K),
      chase: makeChase(env, K),
      whale: makeWhale(env, K),
      airship: makeAirship(env, K),
      dive: makeDive(env, K),
    },
  };
}
