// Renderiza la banda sonora a out/score.wav, mide niveles por compás y dibuja
// un espectrograma (out/score.png) para poder «ver» la música.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openTrailer, ROOT } from './browser.mjs';

const { page, close, errors } = await openTrailer({ width: 800, height: 450 });
const t0 = Date.now();
const b64 = await page.evaluate(() => window.trailer.renderAudio(48000));
await close();
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
const wav = path.join(ROOT, 'out', 'score.wav');
const buf = Buffer.from(b64, 'base64');
fs.writeFileSync(wav, buf);
console.log(`WAV en ${((Date.now() - t0) / 1000).toFixed(1)} s → ${wav}`);

// Lectura PCM16 (cabecera estándar de 44 bytes).
const ch = buf.readUInt16LE(22), sr = buf.readUInt32LE(24);
const data = new Int16Array(buf.buffer, buf.byteOffset + 44, (buf.length - 44) / 2);
const frames = data.length / ch;
const bar = 60 / 72 * 4;
let peakAll = 0;
console.log('compás  inicio   RMS dBFS   pico dBFS');
for (let b = 0; b * bar * sr < frames; b++) {
  const a = Math.floor(b * bar * sr), z = Math.min(frames, Math.floor((b + 1) * bar * sr));
  let sum = 0, peak = 0;
  for (let i = a; i < z; i++) for (let c = 0; c < ch; c++) { const v = data[i * ch + c] / 32768; sum += v * v; peak = Math.max(peak, Math.abs(v)); }
  peakAll = Math.max(peakAll, peak);
  const rms = Math.sqrt(sum / Math.max(1, (z - a) * ch));
  const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf').padStart(8);
  console.log(`${String(b + 1).padStart(5)}  ${(b * bar).toFixed(2).padStart(6)} s ${db(rms)}  ${db(peak)}`);
}
console.log(`Pico total: ${(20 * Math.log10(peakAll || 1e-9)).toFixed(2)} dBFS (${peakAll >= 0.999 ? 'SATURA' : 'sin saturar'})`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-lavfi', 'showspectrumpic=s=1600x500:legend=1:scale=log', path.join(ROOT, 'out', 'score.png')]);
console.log('Espectrograma → out/score.png');
if (errors.length) console.log('Consola:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
