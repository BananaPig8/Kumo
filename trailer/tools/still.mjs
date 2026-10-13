// Renderiza fotogramas sueltos para revisar: node tools/still.mjs 18.5 25 40.2 [--out dir]
import fs from 'node:fs';
import path from 'node:path';
import { openTrailer, ROOT } from './browser.mjs';

const args = process.argv.slice(2);
let out = path.join(ROOT, 'out', 'stills');
const li = args.indexOf('--lab');
let query = '';
if (li >= 0) { query = '&lab=' + args[li + 1]; out = path.join(ROOT, 'out', 'lab', args[li + 1]); args.splice(li, 2); }
const oi = args.indexOf('--out');
if (oi >= 0) { out = args[oi + 1]; args.splice(oi, 2); }
fs.mkdirSync(out, { recursive: true });
const t0 = Date.now();
const { page, close, errors } = await openTrailer({ query });
console.log(`listo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const a of args) {
  const T = parseFloat(a);
  const s = Date.now();
  const shot = await page.evaluate((T) => window.trailer.renderAt(T), T);
  const file = path.join(out, `t${T.toFixed(2).padStart(6, '0')}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 140, width: 1920, height: 800 } });
  console.log(`${file}  [${shot}]  ${Date.now() - s} ms`);
}
if (errors.length) console.log('Consola:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
await close();
