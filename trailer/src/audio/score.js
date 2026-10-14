// Banda sonora original del tráiler, sintetizada en código (sin muestras).
// 72 BPM en 4/4: un compás = 3,333 s; 18 compases = 60 s; cada plano empieza
// en un compás. Se renderiza fuera de línea a un búfer estéreo (determinista)
// que sirve tanto para el reproductor web como para el WAV del MP4.
//
// Guion musical por compases (1-18):
//  1-3  pueblo y tejado: lluvia, piano solo en si menor; en el 3 entra una
//       nota alta de cuerda cuando ella mira arriba.
//  4    gafas: arpegios de celesta que suben, «bips» de los LEDs, zumbido de
//       las lentes y un «whoosh» hacia dentro de la lente.
//  5    túnel: crescendo de cuerdas en trémolo, brillos y viento.
//  6-9  Nubaria y acantilado: el tema principal en re mayor (flauta y
//       cuerdas, arpegios de piano y arpa, coro suave).
//  10-11 santuario: misterio; celesta, coro «ah», cuerdas graves.
//  12-13 vuelo: ostinato de cuerdas, taikos y metales (re mixolidio).
//  14   ballena: acorde enorme y lento (sol lidio), trompas y su canto grave.
//  15   dirigible: dron de metales en re menor, golpes graves, truenos.
//  16   picado: redoble, escala que sube, platillo en crescendo.
//  17-18 título: golpe con todo en re mayor, el tema por última vez y un
//       final tierno de piano; campana y fundido.

const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const at = (bar, beat = 0) => (bar - 1) * BAR + beat * BEAT;

// ─── Utilidades ─────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  if (typeof n === 'number') return n;
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const mtof = (m) => 440 * Math.pow(2, (midi(m) - 69) / 12);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Tablas de onda de diente de sierra limitadas en banda (sin aliasing).
const TABLE = 2048;
const sawCache = new Map();
function sawTable(nh) {
  if (sawCache.has(nh)) return sawCache.get(nh);
  const t = new Float32Array(TABLE + 1);
  for (let i = 0; i <= TABLE; i++) {
    let s = 0;
    for (let h = 1; h <= nh; h++) s += Math.sin((2 * Math.PI * h * i) / TABLE) / h;
    t[i] = s * 0.55;
  }
  sawCache.set(nh, t);
  return t;
}
const SINE = (() => { const t = new Float32Array(TABLE + 1); for (let i = 0; i <= TABLE; i++) t[i] = Math.sin((2 * Math.PI * i) / TABLE); return t; })();
function readTable(tb, ph) {
  const x = (ph - Math.floor(ph)) * TABLE;
  const i = x | 0;
  return tb[i] + (tb[i + 1] - tb[i]) * (x - i);
}

// Filtro biquad (recetario RBJ).
class Biquad {
  constructor(type, f, q, sr) { this.sr = sr; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(type, f, q); }
  set(type, f, q) {
    const w = (2 * Math.PI * Math.min(f, this.sr * 0.45)) / this.sr, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

// ─── El mezclador ───────────────────────────────────────────────────────────
class Mix {
  constructor(duration, sr) {
    this.sr = sr;
    this.n = Math.ceil(duration * sr);
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
    this.rev = new Float32Array(this.n);
    this.rng = mulberry32(2024);
  }
  // Escribe una voz mono generada por fn(k, tt) (k = muestra relativa, tt = s).
  voice(t0, len, pan, send, fn) {
    const sr = this.sr;
    const i0 = Math.max(0, Math.round(t0 * sr)), i1 = Math.min(this.n, Math.round((t0 + len) * sr));
    const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = i0; i < i1; i++) {
      const k = i - Math.round(t0 * sr);
      const v = fn(k, k / sr);
      this.L[i] += v * gl; this.R[i] += v * gr; this.rev[i] += v * send;
    }
  }
  noise() { return this.rng() * 2 - 1; }
}

// ─── Instrumentos ───────────────────────────────────────────────────────────
// Piano: parciales algo inarmónicos que se apagan antes cuanto más agudos,
// con un golpecito de martillo. dur = lo que se mantiene la tecla.
function piano(M, t, note, dur, vel = 0.6, pan = 0, send = 0.35) {
  const f = mtof(note), sr = M.sr;
  const len = Math.min(dur + 0.5, 6);
  const parts = [];
  for (let n = 1; n <= 9; n++) {
    const fn = f * n * Math.sqrt(1 + 0.00035 * n * n);
    if (fn > sr * 0.45) break;
    parts.push([fn / sr, Math.pow(n, -1.15) * (n === 1 ? 1 : 0.6 + vel * 0.5), 0.55 + n * 0.55 + f / 900]);
  }
  const ph = parts.map(() => 0);
  const lp = new Biquad('lp', 2500, 0.7, sr);
  M.voice(t, len, pan, send, (k, tt) => {
    let s = 0;
    for (let j = 0; j < parts.length; j++) { ph[j] += parts[j][0]; s += Math.sin(6.2832 * ph[j]) * parts[j][1] * Math.exp(-tt * parts[j][2] * 0.6); }
    const att = clamp01(tt / 0.004);
    const rel = tt < dur ? 1 : Math.exp(-(tt - dur) * 9);
    const hammer = tt < 0.012 ? M.noise() * (1 - tt / 0.012) * 0.15 : 0;
    return (lp.run(s * 0.32 + hammer)) * att * rel * vel;
  });
}

// Cuerdas: tres sierras desafinadas, vibrato que entra tarde, filtro paso bajo.
function strings(M, t, note, dur, vel = 0.4, pan = 0, send = 0.45, { att = 0.35, rel = 0.7, bright = 2600, trem = 0 } = {}) {
  const f = mtof(note), sr = M.sr;
  const tb = sawTable(Math.max(1, Math.min(48, Math.floor((sr / 2.3) / f))));
  const det = [0.997, 1.0, 1.0032], ph = [M.rng(), M.rng(), M.rng()];
  const lp = new Biquad('lp', bright, 0.6, sr);
  const len = dur + rel;
  M.voice(t, len, pan, send, (k, tt) => {
    const vib = 1 + 0.0028 * Math.sin(6.2832 * 5.3 * tt) * clamp01((tt - 0.3) / 0.6);
    let s = 0;
    for (let j = 0; j < 3; j++) { ph[j] += (f * det[j] * vib) / sr; s += readTable(tb, ph[j]); }
    let env = clamp01(tt / att) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / rel));
    if (trem) env *= 0.65 + 0.35 * Math.sin(6.2832 * 11 * tt);
    return lp.run(s * 0.24) * env * vel;
  });
}

// Coro «ah»: sierras por tres formantes de vocal.
function choir(M, t, note, dur, vel = 0.3, pan = 0, send = 0.6) {
  const f = mtof(note), sr = M.sr;
  const tb = sawTable(Math.max(1, Math.min(40, Math.floor((sr / 2.3) / f))));
  const F = [new Biquad('bp', 760, 6, sr), new Biquad('bp', 1150, 7, sr), new Biquad('bp', 2700, 8, sr)];
  const ph = [M.rng(), M.rng()];
  M.voice(t, dur + 1.0, pan, send, (k, tt) => {
    const vib = 1 + 0.004 * Math.sin(6.2832 * 4.7 * tt + k * 0);
    ph[0] += (f * vib) / sr; ph[1] += (f * 1.004 * vib) / sr;
    const x = readTable(tb, ph[0]) + readTable(tb, ph[1]);
    const s = F[0].run(x) * 1.0 + F[1].run(x) * 0.55 + F[2].run(x) * 0.25;
    const env = clamp01(tt / 0.8) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / 1.0));
    return s * env * vel * 0.9;
  });
}

// Flauta: seno con un poco de segundo armónico, soplo y vibrato.
function flute(M, t, note, dur, vel = 0.4, pan = 0.1, send = 0.4) {
  const f = mtof(note), sr = M.sr;
  let p = 0;
  const bp = new Biquad('bp', f * 2, 1.5, sr);
  M.voice(t, dur + 0.25, pan, send, (k, tt) => {
    const vib = 1 + 0.005 * Math.sin(6.2832 * 5.1 * tt) * clamp01((tt - 0.25) / 0.4);
    p += (f * vib) / sr;
    const s = readTable(SINE, p) + 0.18 * readTable(SINE, p * 2) + 0.05 * readTable(SINE, p * 3);
    const breath = bp.run(M.noise()) * 0.25;
    const env = clamp01(tt / 0.06) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / 0.25));
    return (s * 0.5 + breath) * env * vel;
  });
}

// Celesta / glockenspiel: parciales de campana que se apagan rápido.
function celesta(M, t, note, vel = 0.3, pan = 0, send = 0.5) {
  const f = mtof(note), sr = M.sr;
  const P = [[1, 1, 2.2], [3.01, 0.35, 5], [5.43, 0.15, 9], [2.0, 0.2, 3.5]];
  const ph = P.map(() => 0);
  M.voice(t, 2.5, pan, send, (k, tt) => {
    let s = 0;
    for (let j = 0; j < P.length; j++) { ph[j] += (f * P[j][0]) / sr; s += readTable(SINE, ph[j]) * P[j][1] * Math.exp(-tt * P[j][2]); }
    return s * clamp01(tt / 0.002) * vel * 0.5;
  });
}

// Arpa: cuerda pulsada (Karplus-Strong).
function harp(M, t, note, vel = 0.4, pan = 0, send = 0.4) {
  const f = mtof(note), sr = M.sr;
  const N = Math.max(2, Math.round(sr / f));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = (M.rng() * 2 - 1) * 0.5 + Math.sin((2 * Math.PI * i) / N) * 0.5;
  let idx = 0, prev = 0;
  const lp = new Biquad('lp', 3200, 0.7, sr);
  M.voice(t, 3.0, pan, send, (k, tt) => {
    const v = buf[idx];
    const nv = (v + prev) * 0.4985;
    prev = v; buf[idx] = nv; idx = (idx + 1) % N;
    return lp.run(v) * vel * 0.6;
  });
}

// Metales: sierra con un filtro que se abre con la nota.
function brass(M, t, note, dur, vel = 0.4, pan = 0, send = 0.4, { open = 1800 } = {}) {
  const f = mtof(note), sr = M.sr;
  const tb = sawTable(Math.max(1, Math.min(48, Math.floor((sr / 2.3) / f))));
  const lp = new Biquad('lp', 400, 0.9, sr);
  let p = M.rng(), p2 = M.rng();
  M.voice(t, dur + 0.5, pan, send, (k, tt) => {
    if ((k & 63) === 0) lp.set('lp', 300 + open * clamp01(tt / 0.25) * (tt < dur ? 1 : Math.max(0.2, 1 - (tt - dur) / 0.5)), 0.9);
    const scoop = 1 - 0.01 * Math.exp(-tt * 18);
    p += (f * scoop) / sr; p2 += (f * 1.003 * scoop) / sr;
    const s = readTable(tb, p) + readTable(tb, p2);
    const env = clamp01(tt / 0.08) * (tt < dur ? 1 : Math.max(0, 1 - (tt - dur) / 0.5));
    return lp.run(s * 0.3) * env * vel;
  });
}

// Percusión.
function timpani(M, t, note, vel = 0.6, pan = 0, send = 0.4) {
  const f = mtof(note), sr = M.sr;
  let p = 0, p2 = 0;
  const lp = new Biquad('lp', 900, 0.7, sr);
  M.voice(t, 2.5, pan, send, (k, tt) => {
    const bend = 1 + 0.06 * Math.exp(-tt * 20);
    p += (f * bend) / sr; p2 += (f * 1.5 * bend) / sr;
    const s = Math.sin(6.2832 * p) * Math.exp(-tt * 2.2) + 0.4 * Math.sin(6.2832 * p2) * Math.exp(-tt * 4) + lp.run(M.noise()) * Math.exp(-tt * 30) * 0.5;
    return s * vel * 0.6;
  });
}
function roll(M, t, note, dur, v0, v1, pan = 0) {
  for (let x = 0; x < dur; x += 0.07) timpani(M, t + x, note, (v0 + (v1 - v0) * (x / dur)) * (0.85 + M.rng() * 0.3), pan, 0.45);
}
function taiko(M, t, vel = 0.6, pan = 0, send = 0.3) {
  const sr = M.sr;
  let p = 0;
  const lp = new Biquad('lp', 600, 0.8, sr);
  M.voice(t, 1.2, pan, send, (k, tt) => {
    const f = 62 * (1 + 0.5 * Math.exp(-tt * 30));
    p += f / sr;
    return (Math.sin(6.2832 * p) * Math.exp(-tt * 6) + lp.run(M.noise()) * Math.exp(-tt * 25) * 0.6) * vel * 0.8;
  });
}
function snare(M, t, vel = 0.3, pan = 0) {
  const hp = new Biquad('bp', 2500, 0.8, M.sr);
  M.voice(t, 0.25, pan, 0.25, (k, tt) => hp.run(M.noise()) * Math.exp(-tt * 22) * vel);
}
function cymbal(M, t, len, vel = 0.3, pan = 0, { swell = false } = {}) {
  const hp = new Biquad('hp', 5000, 0.7, M.sr), bp = new Biquad('bp', 8000, 1.2, M.sr);
  M.voice(t, len, pan, 0.5, (k, tt) => {
    const n = M.noise();
    const env = swell ? Math.pow(clamp01(tt / len), 2.5) : Math.exp(-tt * 1.6) * clamp01(tt / 0.003);
    return (hp.run(n) * 0.6 + bp.run(n) * 0.5) * env * vel;
  });
}

// Ambientes y efectos.
function noiseBed(M, t, len, { type = 'bp', f = 2500, q = 0.6, vel = 0.1, pan = 0, send = 0.2, fadeIn = 0.5, fadeOut = 0.5, sweep = null, lfo = 0 } = {}) {
  const flt = new Biquad(type, f, q, M.sr);
  M.voice(t, len, pan, send, (k, tt) => {
    if (sweep && (k & 63) === 0) flt.set(type, sweep(tt / len), q);
    const env = clamp01(tt / fadeIn) * clamp01((len - tt) / fadeOut) * (lfo ? 0.7 + 0.3 * Math.sin(6.2832 * lfo * tt) : 1);
    return flt.run(M.noise()) * env * vel;
  });
}
function drops(M, t, len, rate, vel = 0.08) {
  for (let x = 0; x < len; x += (1 / rate) * (0.4 + M.rng() * 1.2)) {
    const f = 1800 + M.rng() * 3500, pan = M.rng() * 1.6 - 0.8, v = vel * (0.4 + M.rng() * 0.8);
    let p = 0;
    M.voice(t + x, 0.06, pan, 0.2, (k, tt) => { p += (f * (1 - tt * 4)) / M.sr; return Math.sin(6.2832 * p) * Math.exp(-tt * 70) * v; });
  }
}
function blip(M, t, f, vel = 0.12, pan = 0) {
  let p = 0;
  M.voice(t, 0.25, pan, 0.4, (k, tt) => { p += f / M.sr; return (readTable(SINE, p) + 0.3 * readTable(SINE, p * 2)) * Math.exp(-tt * 18) * clamp01(tt / 0.003) * vel; });
}
function whaleCall(M, t, len, vel = 0.3) {
  let p = 0;
  const lp = new Biquad('lp', 700, 0.8, M.sr);
  M.voice(t, len, -0.2, 0.9, (k, tt) => {
    const u = tt / len;
    const f = 95 + 60 * Math.sin(Math.PI * u) - 25 * u + 3 * Math.sin(6.2832 * 3 * tt);
    p += f / M.sr;
    const s = Math.sin(6.2832 * p) + 0.5 * Math.sin(6.2832 * p * 2.01) + 0.2 * Math.sin(6.2832 * p * 3.02);
    return lp.run(s) * Math.sin(Math.PI * u) * vel;
  });
}
function thunder(M, t, len, vel = 0.4) {
  const lp = new Biquad('lp', 160, 0.7, M.sr);
  const bumps = [];
  for (let i = 0; i < 6; i++) bumps.push([M.rng() * len * 0.6, 0.3 + M.rng() * 0.8]);
  M.voice(t, len, 0.3, 0.5, (k, tt) => {
    let env = 0;
    for (const [b, a] of bumps) env += tt > b ? a * Math.exp(-(tt - b) * 2.5) : 0;
    return lp.run(M.noise()) * Math.min(1.4, env) * vel * clamp01(tt / 0.02);
  });
}

// ─── La partitura ───────────────────────────────────────────────────────────
// seq: notas [compás, pulso, nota, duración en pulsos, velocidad].
function write(M) {
  const B = (bars) => bars * BAR;
  const P = (bar, beat, n, d, v, pan, send) => piano(M, at(bar, beat), n, d * BEAT, v, pan, send);
  const S = (bar, beat, n, d, v, pan, o) => strings(M, at(bar, beat), n, d * BEAT, v, pan, 0.5, o);

  // 1-3 · Pueblo gris bajo la lluvia ─────────────────────────────────────────
  noiseBed(M, 0, B(3.6), { type: 'bp', f: 3200, q: 0.4, vel: 0.07, pan: -0.2, fadeIn: 2.0, fadeOut: 2.5, send: 0.15 });
  noiseBed(M, 0, B(3.6), { type: 'lp', f: 700, q: 0.5, vel: 0.05, pan: 0.2, fadeIn: 2.0, fadeOut: 2.5, send: 0.1 });
  drops(M, 0.4, B(3.4), 9, 0.05);
  // Piano: mano izquierda en arpegio lento, mano derecha con la melodía.
  const LH = [['B2', 'F#3', 'B3', 'D4'], ['G2', 'D3', 'G3', 'B3'], ['E2', 'B2', 'E3', 'G3'], ['A2', 'E3', 'A3', 'C#4']];
  const lhBars = [[1, 0, 0], [1, 2, 0], [2, 0, 1], [2, 2, 3], [3, 0, 2], [3, 2, 3]];
  for (const [bar, beat, c] of lhBars) LH[c].forEach((n, i) => P(bar, beat + i * 0.5, n, 2.2 - i * 0.4, 0.3 + (i === 0 ? 0.08 : 0), -0.25, 0.4));
  const mel1 = [[1, 1, 'F#4', 1], [1, 2, 'B4', 1], [1, 3, 'A4', 0.5], [1, 3.5, 'F#4', 0.5], [2, 0, 'G4', 1.5], [2, 1.5, 'F#4', 0.5], [2, 2, 'E4', 1], [2, 3, 'D4', 1], [3, 0, 'E4', 1], [3, 1, 'F#4', 1], [3, 2, 'A4', 1], [3, 3, 'B4', 1.2]];
  for (const [bar, beat, n, d] of mel1) P(bar, beat, n, d, 0.42, 0.15, 0.4);
  // Ella mira arriba: una cuerda aguda que se queda.
  S(3, 1.5, 'D6', 3.5, 0.12, 0.3, { att: 1.2, rel: 1.5, bright: 3500 });
  S(3, 1.5, 'A5', 3.5, 0.1, -0.3, { att: 1.2, rel: 1.5, bright: 3000 });
  strings(M, at(1), 'B1', B(3), 0.14, 0, 0.3, { att: 2, rel: 2, bright: 500 });

  // 4 · Gafas: celesta que sube, LEDs, lentes y whoosh ──────────────────────
  const arp4 = ['D5', 'F#5', 'A5', 'D6', 'E5', 'G5', 'B5', 'E6'];
  arp4.forEach((n, i) => celesta(M, at(4, i * 0.5), n, 0.22, (i % 2 ? 0.4 : -0.4)));
  strings(M, at(4), 'D3', B(1), 0.14, 0, 0.5, { att: 1.5, rel: 1, bright: 900 });
  strings(M, at(4), 'A3', B(1), 0.1, 0, 0.5, { att: 1.5, rel: 1, bright: 900 });
  [0, 1, 2, 3, 4, 5].forEach((i) => blip(M, at(4) + 1.0 + i * 0.2, 1500 * Math.pow(2, i / 6), 0.14, -0.3 + i * 0.12));
  noiseBed(M, at(4) + 1.9, 0.8, { type: 'bp', f: 2000, q: 3, vel: 0.12, sweep: (u) => 900 + 3000 * u, fadeIn: 0.3, fadeOut: 0.2, send: 0.4 });
  strings(M, at(4) + 2.0, 'A6', 1.3, 0.08, 0.2, 0.6, { att: 0.4, rel: 0.3, bright: 6000 });
  noiseBed(M, at(4) + 2.5, 1.0, { type: 'bp', f: 600, q: 1.2, vel: 0.35, sweep: (u) => 300 + 6000 * u * u, fadeIn: 0.7, fadeOut: 0.08, send: 0.3 });
  cymbal(M, at(5) - 0.05, 2.5, 0.12, 0.2);

  // 5 · Túnel: trémolo en crescendo, brillos y viento ───────────────────────
  for (const [n, pan] of [['D3', -0.4], ['A3', 0.4], ['E4', -0.2], ['A4', 0.2], ['C#5', 0]]) strings(M, at(5), n, B(1), 0.16, pan, 0.5, { att: B(0.9), rel: 0.3, bright: 4200, trem: 1 });
  noiseBed(M, at(5), B(1), { type: 'bp', f: 800, q: 0.7, vel: 0.18, sweep: (u) => 500 + 4000 * u, fadeIn: 1.5, fadeOut: 0.3, send: 0.3 });
  for (let i = 0; i < 16; i++) celesta(M, at(5, i * 0.25), ['A5', 'C#6', 'E6', 'A6'][i % 4], 0.08 + i * 0.008, (i % 2 ? 0.6 : -0.6));
  cymbal(M, at(5), B(1), 0.22, 0, { swell: true });
  roll(M, at(5, 2), 'A2', BEAT * 2, 0.1, 0.45);

  // 6-9 · Nubaria y el acantilado: el tema ──────────────────────────────────
  timpani(M, at(6), 'D2', 0.6); cymbal(M, at(6), 4, 0.2);
  const prog = [[6, ['D3', 'A3', 'D4', 'F#4']], [7, ['C#3', 'A3', 'E4', 'A4']], [8, ['B2', 'F#3', 'D4', 'F#4']], [9, ['G2', 'D3', 'B3', 'D4']]];
  const prog2 = { 7: ['B2', 'F#3', 'D4', 'B4'], 8: ['G2', 'D3', 'B3', 'G4'], 9: ['A2', 'E3', 'C#4', 'A4'] };
  for (const [bar, ch] of prog) {
    ch.forEach((n, i) => S(bar, 0, n, bar === 7 || bar === 9 ? 2 : 4, 0.13 + (i === 0 ? 0.04 : 0), i % 2 ? 0.35 : -0.35, { att: 0.6, rel: 0.8, bright: 2200 }));
    if (prog2[bar]) prog2[bar].forEach((n, i) => S(bar, 2, n, 2, 0.13, i % 2 ? 0.35 : -0.35, { att: 0.4, rel: 0.8, bright: 2200 }));
    // Arpegios de piano y arpa en corcheas.
    const arpN = [...ch, ch[2]].map(midi);
    for (let i = 0; i < 8; i++) {
      const n = arpN[[0, 1, 2, 3, 4, 3, 2, 1][i]] + 12;
      if (bar <= 7) harp(M, at(bar, i * 0.5), n, 0.28, 0.4);
      else P(bar, i * 0.5, n, 0.6, 0.22, 0.3, 0.45);
    }
  }
  choir(M, at(6), 'A4', B(2), 0.08, -0.2); choir(M, at(6), 'D5', B(2), 0.07, 0.2);
  const theme = [[6, 0, 'F#5', 1.5], [6, 1.5, 'E5', 0.5], [6, 2, 'D5', 1], [6, 3, 'A4', 1], [7, 0, 'B4', 1.5], [7, 1.5, 'C#5', 0.5], [7, 2, 'D5', 1], [7, 3, 'E5', 1],
    [8, 0, 'F#5', 1], [8, 1, 'A5', 1], [8, 2, 'G5', 1], [8, 3, 'F#5', 0.5], [8, 3.5, 'E5', 0.5], [9, 0, 'E5', 2], [9, 2, 'D5', 1], [9, 3, 'E5', 1]];
  for (const [bar, beat, n, d] of theme) flute(M, at(bar, beat), n, d * BEAT * 0.95, 0.32, 0.1, 0.45);
  for (const [bar, beat, n, d] of theme.slice(8)) S(bar, beat, midi(n) - 12, d * 0.95, 0.1, -0.1, { att: 0.15, rel: 0.5, bright: 3000 });
  noiseBed(M, at(8), B(2), { type: 'lp', f: 500, q: 0.6, vel: 0.06, lfo: 0.3, fadeIn: 1.5, fadeOut: 1.5, send: 0.2 });

  // 10-11 · El santuario: misterio y la llave ────────────────────────────────
  for (const [n, pan] of [['B1', 0], ['F#2', -0.3], ['B2', 0.3]]) strings(M, at(10), n, B(2), 0.14, pan, 0.5, { att: 1.5, rel: 1.2, bright: 700 });
  choir(M, at(10), 'D4', B(1), 0.1, -0.3); choir(M, at(10), 'F#4', B(1), 0.09, 0.3); choir(M, at(10), 'C#5', B(1), 0.06, 0);
  choir(M, at(11), 'D4', B(1), 0.1, -0.3); choir(M, at(11), 'G4', B(1), 0.09, 0.3); choir(M, at(11), 'B4', B(1), 0.07, 0);
  const keyMotif = ['B5', 'D6', 'F#6', 'C#6', 'B5', 'F#5', 'A5', 'D6'];
  for (let i = 0; i < 16; i++) celesta(M, at(10, i * 0.5), keyMotif[i % 8], 0.18 + (i % 4 === 0 ? 0.08 : 0), Math.sin(i) * 0.6);
  flute(M, at(10, 1), 'F#5', BEAT * 3, 0.22, 0.2); flute(M, at(11, 0), 'E5', BEAT * 2, 0.22, 0.2); flute(M, at(11, 2), 'C#5', BEAT * 1.8, 0.2, 0.2);
  celesta(M, at(11, 3.5), 'B6', 0.3, 0); celesta(M, at(11, 3.5), 'F#6', 0.2, 0.2);

  // 12-13 · Vuelo: ostinato, taikos y metales ────────────────────────────────
  const ost = ['D3', 'D3', 'A3', 'D3', 'C4', 'D3', 'A3', 'D3'];
  for (const bar of [12, 13]) {
    for (let i = 0; i < 16; i++) S(bar, i * 0.25, midi(ost[i % 8]) - (bar === 13 && i >= 8 ? 2 : 0), 0.2, 0.17, i % 2 ? 0.3 : -0.3, { att: 0.01, rel: 0.08, bright: 3200 });
    for (const b of [0, 1.5, 2, 3, 3.5]) taiko(M, at(bar, b), b === 0 ? 0.8 : 0.55, b === 3.5 ? 0.3 : -0.1);
    for (let i = 0; i < 8; i++) snare(M, at(bar, 2 + i * 0.25), 0.05 + i * 0.012, 0.2);
  }
  brass(M, at(12), 'D4', BEAT * 1.5, 0.3, -0.1); brass(M, at(12), 'A3', BEAT * 1.5, 0.25, 0.1);
  brass(M, at(12, 2), 'C4', BEAT * 2, 0.3, -0.1); brass(M, at(12, 2), 'G3', BEAT * 2, 0.25, 0.1);
  brass(M, at(13), 'Bb3', BEAT * 2, 0.3, -0.1); brass(M, at(13), 'F3', BEAT * 2, 0.25, 0.1);
  brass(M, at(13, 2), 'C4', BEAT * 2, 0.32, -0.1); brass(M, at(13, 2), 'E4', BEAT * 2, 0.25, 0.1);
  const fly = [[12, 0, 'A5', 1], [12, 1, 'D6', 1.5], [12, 2.5, 'C6', 0.5], [12, 3, 'A5', 1], [13, 0, 'F5', 1], [13, 1, 'G5', 1], [13, 2, 'A5', 2]];
  for (const [bar, beat, n, d] of fly) flute(M, at(bar, beat), n, d * BEAT * 0.9, 0.28, 0.15);
  noiseBed(M, at(12), B(2), { type: 'bp', f: 1200, q: 0.5, vel: 0.09, lfo: 0.6, fadeIn: 0.3, fadeOut: 0.5, send: 0.1 });
  cymbal(M, at(12), 2.5, 0.16);

  // 14 · La ballena: acorde enorme, lento ────────────────────────────────────
  timpani(M, at(14), 'G2', 0.4); cymbal(M, at(14), 4, 0.12);
  for (const [n, pan] of [['G2', 0], ['D3', -0.4], ['B3', 0.4], ['F#4', -0.2], ['C#5', 0.2], ['D5', 0]]) strings(M, at(14), n, B(1), 0.13, pan, 0.6, { att: 0.9, rel: 1.4, bright: 2000 });
  choir(M, at(14), 'B4', B(1), 0.09, -0.2); choir(M, at(14), 'D5', B(1), 0.08, 0.2);
  brass(M, at(14, 0.5), 'D4', BEAT * 1.5, 0.22, -0.2, 0.6, { open: 1100 }); brass(M, at(14, 2), 'E4', BEAT * 1, 0.22, -0.2, 0.6, { open: 1100 }); brass(M, at(14, 3), 'F#4', BEAT * 1.2, 0.24, -0.2, 0.6, { open: 1100 });
  whaleCall(M, at(14, 0.3), 2.8, 0.2);

  // 15 · El dirigible: dron y golpes en re menor ─────────────────────────────
  noiseBed(M, at(15) - 0.3, B(1) + 0.3, { type: 'lp', f: 220, q: 0.7, vel: 0.22, fadeIn: 0.5, fadeOut: 0.3, send: 0.3 });
  strings(M, at(15), 'D2', B(1), 0.2, 0, 0.5, { att: 0.4, rel: 0.3, bright: 600, trem: 1 });
  strings(M, at(15), 'Eb2', B(1), 0.12, 0.2, 0.5, { att: 0.8, rel: 0.3, bright: 600, trem: 1 });
  for (const b of [0, 2.5]) { brass(M, at(15, b), 'D2', BEAT * 1.2, 0.4, 0, 0.5, { open: 700 }); brass(M, at(15, b), 'A2', BEAT * 1.2, 0.3, 0, 0.5, { open: 700 }); brass(M, at(15, b), 'Eb3', BEAT * 1.2, 0.18, 0, 0.5, { open: 700 }); taiko(M, at(15, b), 0.75); }
  thunder(M, at(15, 1), 3.2, 0.5);
  for (const b of [1, 3]) blip(M, at(15, b), 880, 0.05, 0.6);

  // 16 · El picado: redoble, escala que sube, platillo en crescendo ─────────
  roll(M, at(16), 'D2', B(1), 0.15, 0.7);
  for (let i = 0; i < 16; i++) snare(M, at(16, i * 0.25), 0.05 + i * 0.016, (i % 2 ? 0.2 : -0.2));
  const scale = ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6'];
  scale.forEach((n, i) => S(16, i * 0.25, n, 0.3, 0.12 + i * 0.006, 0.1, { att: 0.02, rel: 0.15, bright: 4000 }));
  brass(M, at(16), 'Bb3', BEAT * 2, 0.3, -0.1); brass(M, at(16), 'F4', BEAT * 2, 0.24, 0.1);
  brass(M, at(16, 2), 'C4', BEAT * 2, 0.34, -0.1); brass(M, at(16, 2), 'E4', BEAT * 2, 0.26, 0.1); brass(M, at(16, 2), 'A4', BEAT * 2, 0.22, 0);
  cymbal(M, at(16), B(1), 0.3, 0, { swell: true });
  noiseBed(M, at(16), B(1), { type: 'bp', f: 600, q: 0.8, vel: 0.2, sweep: (u) => 300 + 5000 * u * u, fadeIn: 1.5, fadeOut: 0.05, send: 0.2 });

  // 17-18 · Título: golpe con todo, el tema y un final tierno ────────────────
  timpani(M, at(17), 'D2', 0.9); taiko(M, at(17), 0.9); cymbal(M, at(17), 5, 0.32);
  for (const [n, pan] of [['D2', 0], ['A2', -0.3], ['D3', 0.3], ['F#3', -0.2], ['A3', 0.2], ['D4', 0], ['F#4', -0.3], ['A4', 0.3]]) strings(M, at(17), n, BEAT * 3.5, 0.13, pan, 0.6, { att: 0.08, rel: 2.0, bright: 2600 });
  for (const n of ['D3', 'A3', 'F#4']) brass(M, at(17), n, BEAT * 2.5, 0.28, 0, 0.6, { open: 1600 });
  choir(M, at(17), 'A4', B(1.6), 0.09, -0.2); choir(M, at(17), 'D5', B(1.6), 0.08, 0.2); choir(M, at(17), 'F#5', B(1.6), 0.06, 0);
  const fin = [[17, 0, 'F#5', 1.5], [17, 1.5, 'E5', 0.5], [17, 2, 'D5', 1], [17, 3, 'A5', 1], [18, 0, 'B5', 2], [18, 2, 'A5', 2]];
  for (const [bar, beat, n, d] of fin) { flute(M, at(bar, beat), n, d * BEAT * 0.95, 0.3, 0.1); S(bar, beat, midi(n) - 12, d * 0.95, 0.1, -0.1, { att: 0.15, rel: 0.8, bright: 2600 }); }
  // Final tierno: piano solo con el acorde de re y una campana.
  for (const [i, n] of ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5'].entries()) P(18, i * 0.4, n, 3.5 - i * 0.3, 0.26, -0.2 + i * 0.08, 0.5);
  strings(M, at(18), 'G3', BEAT * 2, 0.08, -0.3, 0.6, { att: 0.5, rel: 1.5, bright: 1800 });
  strings(M, at(18, 2), 'A3', BEAT * 1.8, 0.08, 0.3, 0.6, { att: 0.5, rel: 1.5, bright: 1800 });
  celesta(M, at(18, 2.6), 'D6', 0.3, 0.1); celesta(M, at(18, 2.6), 'A6', 0.18, -0.1);
  noiseBed(M, at(17, 2), B(1.4), { type: 'lp', f: 450, q: 0.6, vel: 0.05, lfo: 0.2, fadeIn: 1.5, fadeOut: 1.5, send: 0.2 });
}

// ─── Reverberación (Freeverb) ───────────────────────────────────────────────
function freeverb(input, sr, { room = 0.86, damp = 0.32, spread = 23 } = {}) {
  const k = sr / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const make = (off) => ({
    c: combs.map((d) => ({ b: new Float32Array(Math.round((d + off) * k)), i: 0, f: 0 })),
    a: alls.map((d) => ({ b: new Float32Array(Math.round((d + off) * k)), i: 0 })),
  });
  const chans = [make(0), make(spread)];
  const n = input.length;
  const out = [new Float32Array(n), new Float32Array(n)];
  for (let ch = 0; ch < 2; ch++) {
    const { c, a } = chans[ch];
    const o = out[ch];
    for (let s = 0; s < n; s++) {
      const x = input[s] * 0.015;
      let y = 0;
      for (const cb of c) {
        const v = cb.b[cb.i];
        cb.f = v * (1 - damp) + cb.f * damp;
        cb.b[cb.i] = x + cb.f * room;
        if (++cb.i >= cb.b.length) cb.i = 0;
        y += v;
      }
      for (const ap of a) {
        const v = ap.b[ap.i];
        ap.b[ap.i] = y + v * 0.5;
        y = v - y;
        if (++ap.i >= ap.b.length) ap.i = 0;
      }
      o[s] = y;
    }
  }
  return out;
}

// Render completo: devuelve { L, R, sr } normalizado y con un limitador suave.
export function renderScore(duration, sr = 48000) {
  const M = new Mix(duration, sr);
  write(M);
  const [wl, wr] = freeverb(M.rev, sr);
  const n = M.n;
  const L = new Float32Array(n), R = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    L[i] = M.L[i] + wl[i] * 3.2;
    R[i] = M.R[i] + wr[i] * 3.2;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  // Ganancia para dejar margen y saturación suave de los picos.
  const gain = peak > 0 ? 0.9 / peak : 1;
  const fadeStart = duration - 0.9;
  for (let i = 0; i < n; i++) {
    const tt = i / sr;
    const fade = tt > fadeStart ? Math.max(0, 1 - (tt - fadeStart) / 0.9) : 1;
    L[i] = Math.tanh(L[i] * gain * 1.7) * 0.93 * fade;
    R[i] = Math.tanh(R[i] * gain * 1.7) * 0.93 * fade;
  }
  return { L, R, sr };
}

let cached = null;
// Prepara el búfer con antelación (el reproductor lo pide al pulsar «play»).
export function prepareScore(duration, sr = 48000) {
  if (!cached || cached.sr !== sr || cached.duration !== duration) cached = { sr, duration, data: renderScore(duration, sr) };
  return cached.data;
}

export function scheduleScore(ctx, dest, startAt, duration) {
  const { L, R, sr } = prepareScore(duration, 48000);
  const buf = ctx.createBuffer(2, L.length, sr);
  buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start(startAt);
  return src;
}

// WAV PCM16 estéreo en base64 (para el MP4).
export function renderScoreWav(duration, sr = 48000) {
  const { L, R } = renderScore(duration, sr);
  const n = L.length;
  const bytes = new Uint8Array(44 + n * 4);
  const dv = new DataView(bytes.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    dv.setInt16(44 + i * 4, Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), true);
    dv.setInt16(46 + i * 4, Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), true);
  }
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(bin);
}
