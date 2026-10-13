// Hoja de contactos: renderiza fotogramas clave de todos los planos (o de los
// indicados) y los junta en una imagen. Uso:
//   node tools/sheet.mjs                 → 3 fotogramas por plano
//   node tools/sheet.mjs reveal cliff    → solo esos planos
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openTrailer, ROOT } from './browser.mjs';

const want = process.argv.slice(2);
const tag = want.length ? want.join('-') : 'all';
const out = path.join(ROOT, 'out', `sheet-${tag}-frames`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const { page, close, errors } = await openTrailer();
const shots = await page.evaluate(() => window.trailer.shots);
let k = 0;
for (const s of shots) {
  if (want.length && !want.includes(s.name)) continue;
  for (const f of [0.15, 0.5, 0.88]) {
    const T = s.start + (s.end - s.start) * f;
    await page.evaluate((T) => window.trailer.renderAt(T), T);
    const file = path.join(out, `f${String(k++).padStart(3, '0')}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 140, width: 1920, height: 800 } });
    console.log(`${s.name} t=${T.toFixed(2)} → ${file}`);
  }
}
await close();
const cols = 3;
const rows = Math.ceil(k / cols);
const sheet = path.join(ROOT, 'out', `sheet-${tag}.png`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(out, 'f%03d.png'), '-vf', `scale=640:-1,tile=${cols}x${rows}:padding=6:color=black`, '-frames:v', '1', sheet]);
console.log('Hoja:', sheet);
if (errors.length) console.log('Consola:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
