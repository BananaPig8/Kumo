import * as THREE from 'three';
import { Stage } from './engine/stage.js';
import { paperTexture } from './engine/paint.js';
import { W, H } from './engine/style.js';
import { SHOTS, DURATION } from './timeline.js';
import { Captions } from './captions.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const LAB = params.get('lab');
if (CAPTURE) document.body.classList.add('capture');

// Cada mundo pinta sus fondos al construirse (una vez) y dibuja sus planos.
const WORLDS = {
  town: () => import('./scenes/town.js'),
  goggles: () => import('./scenes/goggles.js'),
  nubaria: () => import('./scenes/nubaria.js'),
  meadow: () => import('./scenes/meadow.js'),
  flight: () => import('./scenes/flight.js'),
};
const SHOT_WORLD = {
  town: 'town', roof: 'town', goggles: 'goggles', tunnel: 'goggles', reveal: 'nubaria', title: 'nubaria',
  cliff: 'meadow', shrine: 'meadow', flyby: 'flight', chase: 'flight', whale: 'flight', airship: 'flight', dive: 'flight',
};

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: CAPTURE, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
const stage = new Stage(renderer);
stage.post.mFinal.uniforms.uFxaa.value = 0;

const env = { W, H, paper: paperTexture(512, 512, 7) };
const built = {};
async function world(key) {
  if (!built[key]) built[key] = WORLDS[key]().then((m) => m.build(env));
  return built[key];
}

const shotList = Object.entries(SHOTS).map(([name, [start, end]]) => ({ name, start, end })).sort((a, b) => a.start - b.start);
const captions = new Captions();

function shotAt(T) {
  for (const s of shotList) if (T >= s.start && T < s.end) return s;
  return shotList[shotList.length - 1];
}

// Dibuja el instante T (en segundos). Si el mundo aún no está pintado, lo pinta antes.
async function renderAt(T) {
  if (LAB) {
    const lab = await (built['lab:' + LAB] ||= import(`./lab/${LAB}.js`).then((m) => m.build(env)));
    const post = stage.begin();
    lab.draw({ T, lt: T, u: 0, dur: 1, g: stage.g, glow: stage.glow, W, H, post, stage, paper: env.paper });
    stage.end(T);
    return 'lab:' + LAB;
  }
  T = Math.max(0, Math.min(DURATION - 1e-4, T));
  const shot = shotAt(T);
  const w = await world(SHOT_WORLD[shot.name]);
  drawFrame(w, shot, T);
  return shot.name;
}

function drawFrame(w, shot, T) {
  const dur = shot.end - shot.start;
  const lt = T - shot.start;
  const post = stage.begin();
  const f = { T, lt, u: lt / dur, dur, g: stage.g, glow: stage.glow, W, H, post, stage, paper: env.paper };
  w.shots[shot.name](f);
  stage.end(T);
  captions.update(T);
}

const note = document.getElementById('intro-note');
async function buildAll(progress) {
  const keys = Object.keys(WORLDS);
  for (const [i, k] of keys.entries()) {
    progress?.(i, keys.length);
    await world(k);
    await new Promise((r) => setTimeout(r, 0));
  }
}

window.trailer = {
  duration: DURATION,
  renderAt,
  shots: shotList,
  async renderAudio(sampleRate = 48000) {
    const { renderScoreWav } = await import('./audio/score.js');
    return renderScoreWav(DURATION, sampleRate);
  },
};

await document.fonts.ready.catch(() => {});
window.__ready = true;

if (!CAPTURE) {
  await buildAll((i, n) => { note.textContent = `Pintando los fondos… ${Math.round((i / n) * 100)} %`; });
  await renderAt(0);
  setupPlayer();
  // La música se sintetiza de antemano para que «play» no espere.
  import('./audio/score.js').then((m) => setTimeout(() => m.prepareScore(DURATION), 50)).catch(() => {});
}

function setupPlayer() {
  const intro = document.getElementById('intro');
  const btnPlay = document.getElementById('btn-play');
  const ctrl = document.getElementById('ctrl');
  const btnReplay = document.getElementById('btn-replay');
  const btnMute = document.getElementById('btn-mute');
  const btnFull = document.getElementById('btn-full');
  const progress = document.getElementById('progress');
  note.textContent = 'Mejor con sonido y a pantalla completa.';
  btnPlay.disabled = false;

  let actx = null, master = null, startAt = 0, muted = false, clockStart = 0, raf = 0;
  const now = () => (actx ? actx.currentTime - startAt : (performance.now() - clockStart) / 1000);
  const worldsReady = {};
  Promise.all(Object.keys(WORLDS).map(async (k) => { worldsReady[k] = await world(k); }));

  async function play() {
    intro.hidden = true;
    ctrl.hidden = false;
    try {
      if (actx) await actx.close();
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(actx.destination);
      const { scheduleScore } = await import('./audio/score.js');
      startAt = actx.currentTime + 0.15;
      scheduleScore(actx, master, startAt, DURATION);
    } catch (e) {
      console.warn('Sin audio:', e);
      actx = null;
      clockStart = performance.now();
    }
    cancelAnimationFrame(raf);
    loop();
  }
  function loop() {
    const T = Math.max(0, Math.min(DURATION - 1e-4, now()));
    const shot = shotAt(T);
    const w = worldsReady[SHOT_WORLD[shot.name]];
    if (w) drawFrame(w, shot, T);
    progress.style.width = `${Math.min(100, (T / DURATION) * 100)}%`;
    if (now() < DURATION) raf = requestAnimationFrame(loop);
    else btnReplay.focus();
  }
  btnPlay.addEventListener('click', play);
  btnReplay.addEventListener('click', play);
  btnMute.addEventListener('click', () => {
    muted = !muted;
    btnMute.textContent = muted ? 'Sonido: no' : 'Sonido: sí';
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, actx.currentTime, 0.05);
  });
  btnFull.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.getElementById('frame').requestFullscreen();
    } catch { btnFull.hidden = true; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !intro.hidden) { e.preventDefault(); play(); }
  });
}
