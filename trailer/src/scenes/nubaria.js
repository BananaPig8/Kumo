// Mundo «nubaria»: la revelación del cielo por la mañana («reveal») y el
// panorama del título al atardecer («title»).
import { buildReveal } from './nubaria/reveal.js';
import { buildTitle } from './nubaria/title.js';

export async function build(env) {
  const reveal = await buildReveal(env);
  const title = await buildTitle(env);
  return { shots: { reveal, title } };
}
