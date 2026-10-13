// Mundo «nubaria»: la revelación del cielo por la mañana («reveal») y el
// panorama del título al atardecer («title»).
import { buildReveal } from './nubaria/reveal.js';

export async function build(env) {
  const reveal = await buildReveal(env);
  return {
    shots: {
      reveal,
      title(f) { f.g.fillStyle = '#000'; f.g.fillRect(0, 0, f.W, f.H); },
    },
  };
}
