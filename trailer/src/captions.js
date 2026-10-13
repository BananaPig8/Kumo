import { CAPTIONS, TITLE } from './timeline.js';
import { env, smooth, invLerp } from './lib/util.js';

// Rótulos y título en el DOM; su animación depende solo del tiempo del tráiler.
export class Captions {
  constructor() {
    this.box = document.getElementById('captions');
    this.items = CAPTIONS.map((c) => {
      const p = document.createElement('p');
      p.className = 'cap';
      p.textContent = c.text;
      this.box.appendChild(p);
      return { ...c, el: p };
    });
    const word = document.getElementById('title-word');
    this.letters = [...TITLE.word].map((ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      word.appendChild(s);
      return s;
    });
    word.setAttribute('aria-label', TITLE.word);
    this.kanji = document.getElementById('title-kanji');
    this.sub = document.getElementById('title-sub');
    this.rule = document.getElementById('title-rule');
    this.tag = document.getElementById('title-tag');
    this.soon = document.getElementById('title-soon');
  }

  update(T) {
    for (const c of this.items) {
      const a = env(T, c.t0, c.t0 + 0.9, c.t1 - 0.7, c.t1);
      c.el.style.opacity = a.toFixed(3);
      const rise = (1 - smooth(invLerp(c.t0, c.t0 + 1.4, T))) * 0.6;
      c.el.style.transform = `translateY(${rise.toFixed(3)}cqw)`;
      c.el.style.letterSpacing = `${(0.02 + 0.03 * (1 - smooth(invLerp(c.t0, c.t1, T)))).toFixed(4)}em`;
      c.el.style.filter = a < 0.999 ? `blur(${((1 - a) * 0.35).toFixed(3)}cqw)` : 'none';
    }
    const out = 1 - smooth(invLerp(TITLE.out - 0.4, TITLE.out + 0.6, T));
    this.letters.forEach((s, i) => {
      const t0 = TITLE.t0 + i * 0.24;
      const a = smooth(invLerp(t0, t0 + 1.3, T)) * out;
      s.style.opacity = a.toFixed(3);
      s.style.transform = `translateY(${((1 - smooth(invLerp(t0, t0 + 1.6, T))) * 0.8).toFixed(3)}cqw)`;
      s.style.filter = a < 0.999 ? `blur(${((1 - smooth(invLerp(t0, t0 + 1.3, T))) * 0.6).toFixed(3)}cqw)` : 'none';
    });
    const k = smooth(invLerp(TITLE.kanji, TITLE.kanji + 1.4, T)) * out;
    this.kanji.style.opacity = k.toFixed(3);
    this.kanji.style.transform = `scale(${(1.25 - 0.25 * smooth(invLerp(TITLE.kanji, TITLE.kanji + 1.8, T))).toFixed(4)})`;
    const sb = smooth(invLerp(TITLE.sub, TITLE.sub + 1.2, T)) * out;
    this.sub.style.opacity = sb.toFixed(3);
    this.sub.style.letterSpacing = `${(0.6 - 0.14 * smooth(invLerp(TITLE.sub, TITLE.sub + 2.5, T))).toFixed(4)}em`;
    const rw = smooth(invLerp(TITLE.sub + 0.3, TITLE.sub + 2.0, T));
    this.rule.style.width = `${(rw * 34).toFixed(2)}cqw`;
    this.rule.style.opacity = out.toFixed(3);
    this.tag.style.opacity = (smooth(invLerp(TITLE.tag, TITLE.tag + 1.2, T)) * out).toFixed(3);
    this.soon.style.opacity = (smooth(invLerp(TITLE.soon, TITLE.soon + 1.0, T)) * out).toFixed(3);
  }
}
