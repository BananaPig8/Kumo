// Mundo «town»: el pueblo gris bajo la lluvia («town») y la chica en su
// tejado con el gato («roof»), que comparte el cielo, el mar y el pueblo.
import { buildTown } from './town/town.js';
import { buildRoof } from './town/roof.js';

export async function build(env) {
  const town = await buildTown(env);
  const roof = await buildRoof(env, town.shared);
  return { shots: { town: town.shot, roof } };
}
