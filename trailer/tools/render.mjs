// Render final: fotograma a fotograma a 1920×1080 (con banda negra y rótulos)
// y mezcla con la banda sonora en un MP4.
//   node tools/render.mjs [--fps 24] [--workers 2] [--from 0] [--to 60] [--out out/kumo-trailer.mp4]
// Cada trabajador abre su propio Chromium y renderiza un tramo; los tramos ya
// hechos se reutilizan si se relanza (útil si se corta a medias).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { openTrailer, ROOT } from './browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const FPS = +opt('fps', 24);
const WORKERS = +opt('workers', 2);
const FROM = +opt('from', 0);
const OUT = path.resolve(ROOT, opt('out', 'out/kumo-trailer.mp4'));
const work = path.join(ROOT, 'out', 'render');
fs.mkdirSync(work, { recursive: true });

async function renderAudio() {
  const wav = path.join(work, 'score.wav');
  if (fs.existsSync(wav)) return wav;
  const { page, close } = await openTrailer({ width: 800, height: 450 });
  const b64 = await page.evaluate(() => window.trailer.renderAudio(48000));
  await close();
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  return wav;
}

async function renderChunk(id, f0, f1) {
  const file = path.join(work, `part-${String(id).padStart(2, '0')}-${f0}-${f1}.mp4`);
  if (fs.existsSync(file)) { console.log(`tramo ${id} ya hecho`); return file; }
  const tmp = file + '.tmp.mp4';
  const { page, close, errors } = await openTrailer();
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const T = f / FPS;
    await page.evaluate((T) => window.trailer.renderAt(T), T);
    const png = await page.screenshot({ type: 'png', timeout: 600000 });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 24 === 0) {
      const el = (Date.now() - t0) / 1000;
      const per = el / Math.max(1, f - f0);
      console.log(`[${id}] ${f - f0}/${f1 - f0} fotogramas · ${per.toFixed(2)} s/f · quedan ~${Math.round(per * (f1 - f))} s`);
    }
  }
  ff.stdin.end();
  await done;
  await close();
  if (errors.length) console.log(`[${id}] consola:\n` + [...new Set(errors)].slice(0, 10).join('\n'));
  fs.renameSync(tmp, file);
  return file;
}

const { page, close } = await openTrailer({ width: 800, height: 450 });
const duration = await page.evaluate(() => window.trailer.duration);
await close();
const TO = Math.min(duration, +opt('to', duration));
const total = Math.round((TO - FROM) * FPS);
const first = Math.round(FROM * FPS);
console.log(`Render ${total} fotogramas a ${FPS} fps con ${WORKERS} trabajadores`);
const per = Math.ceil(total / WORKERS);
const audioP = renderAudio();
const parts = await Promise.all(Array.from({ length: WORKERS }, (_, i) => {
  const a = first + i * per, b = Math.min(first + total, a + per);
  return a < b ? renderChunk(i, a, b) : null;
}));
const list = path.join(work, 'list.txt');
fs.writeFileSync(list, parts.filter(Boolean).map((p) => `file '${p}'`).join('\n'));
const wav = await audioP;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(FROM), '-t', String(TO - FROM), '-i', wav,
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-tune', 'animation',
  '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', OUT], { stdio: 'inherit' });
console.log('Tráiler →', OUT);
