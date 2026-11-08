import { SITE } from '../data/conteudo.js';
import { renderSound } from '../ui/hud.js';

export const audio = {
  ctx: null, master: null, muted: false, buf: null, musicOn: false,
  start() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.85; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.buf = b;
      const s = this.src(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0.05; s.connect(f).connect(g).connect(this.master); s.start();
      this.loadLeaves();
      const loop = () => { if (!this.ctx) return; this.crackle(0.008 + Math.random() * 0.025); setTimeout(loop, 180 + Math.random() * 1200); }; loop();
    } catch (e) { this.ctx = null; }
  },
  music() {
    if (!this.ctx || this.musicOn) return; this.musicOn = true;
    const el = new Audio(); el.preload = 'auto'; this.el = el; this.fails = 0;
    const g = this.ctx.createGain(); g.gain.value = 0.55;
    this.ctx.createMediaElementSource(el).connect(g).connect(this.master);
    el.addEventListener('ended', () => setTimeout(() => this.playTrack(this.track + 1), 1500));
    el.addEventListener('error', () => setTimeout(() => this.playTrack(this.track + 1), 500));
    this.playTrack(0);
  },
  async trackUrl(i) {
    const t = SITE.music[i];
    return `assets/audio/${t.id}.mp3`;
  },
  async playTrack(i) {
    const n = SITE.music.length; i = ((i % n) + n) % n; this.track = i;
    try {
      this.el.src = await this.trackUrl(i); await this.el.play(); this.fails = 0;
      renderSound(); new Audio().src = await this.trackUrl((i + 1) % n);
    } catch (e) { if (++this.fails < n) setTimeout(() => this.playTrack(i + 1), 600); }
  },
  src() { const s = this.ctx.createBufferSource(); s.buffer = this.buf; s.loop = true; return s; },
  env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); },
  crackle(v) {
    if (!this.ctx) return; const t = this.ctx.currentTime, s = this.src(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 1500 + Math.random() * 3000; this.env(g, t, 0.002, v, 0.02 + Math.random() * 0.05);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.1);
  },
  loadLeaves() {
    this.leaves = []; this.lastLeaf = -1;
    [1, 2, 3, 4].forEach((n) => fetch(`assets/audio/sfx/folha-${n}.mp3`).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((d) => this.leaves.push(d)).catch(() => {}));
  },
  flip() {
    if (!this.ctx) return;
    if (this.leaves && this.leaves.length) {
      let i = Math.floor(Math.random() * this.leaves.length);
      if (i === this.lastLeaf && this.leaves.length > 1) i = (i + 1) % this.leaves.length;
      this.lastLeaf = i;
      const t = this.ctx.currentTime, s = this.ctx.createBufferSource(), g = this.ctx.createGain(), p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      s.buffer = this.leaves[i]; s.playbackRate.value = 0.94 + Math.random() * 0.12; g.gain.value = 0.75 + Math.random() * 0.2;
      let n = s.connect(g); if (p) { p.pan.value = (Math.random() - 0.5) * 0.5; n = n.connect(p); } n.connect(this.master); s.start(t);
      return;
    }
    const t = this.ctx.currentTime, s = this.src(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.35);
    this.env(g, t, 0.07, 0.32, 0.45); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.6);
    setTimeout(() => this.crackle(0.08), 420);
  },
  strike() {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const s = this.src(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.8; this.env(g, t, 0.01, 0.5, 0.28);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.4);
    const s2 = this.src(), f2 = this.ctx.createBiquadFilter(), g2 = this.ctx.createGain();
    f2.type = 'lowpass'; f2.frequency.value = 500; this.env(g2, t + 0.08, 0.25, 0.35, 1.2);
    s2.connect(f2).connect(g2).connect(this.master); s2.start(t + 0.08); s2.stop(t + 1.8);
  },
  crack() {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    for (const dt of [0, 0.07]) {
      const s = this.src(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 1200; this.env(g, t + dt, 0.002, 0.7, 0.05);
      s.connect(f).connect(g).connect(this.master); s.start(t + dt); s.stop(t + dt + 0.1);
    }
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    this.env(g, t, 0.005, 0.4, 0.3); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
  },
  thud() {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3); this.env(g, t, 0.01, 0.5, 0.4);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.5);
  },
  tone(freq, t, dur, peak, type = 'sine', to) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    this.env(g, t, 0.004, peak, dur); o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(t, dur, peak, type, f0, f1, q = 1) {
    const s = this.src(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(g, t, Math.min(0.02, dur / 4), peak, dur); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  },
  clink() { if (!this.ctx) return; const t = this.ctx.currentTime; for (const [f, v] of [[1320, 0.12], [2150, 0.08], [3480, 0.05], [4700, 0.03]]) this.tone(f * (0.98 + Math.random() * 0.04), t, 1.2, v); this.noise(t, 0.03, 0.15, 'highpass', 5000); },
  coins() { if (!this.ctx) return; const t = this.ctx.currentTime; for (let i = 0; i < 9; i++) { const tt = t + 0.25 + Math.random() * 0.6; this.tone(2600 + Math.random() * 1800, tt, 0.25, 0.05); this.tone(4200 + Math.random() * 1500, tt, 0.15, 0.025); } },
  crunch() { if (!this.ctx) return; const t = this.ctx.currentTime; for (let i = 0; i < 4; i++) this.noise(t + i * 0.055 + Math.random() * 0.02, 0.05 + Math.random() * 0.04, 0.35, 'bandpass', 1800 + Math.random() * 1800, 0, 1.2); },
  creak(rev) {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; const pts = rev ? [140, 110, 125, 85] : [80, 120, 100, 135];
    o.frequency.setValueAtTime(pts[0], t); pts.forEach((v, i) => o.frequency.linearRampToValueAtTime(v, t + 0.25 * (i + 1)));
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 5; this.env(g, t, 0.05, 0.18, 1.0); o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + 1.2);
  },
  shing() { if (!this.ctx) return; const t = this.ctx.currentTime; this.noise(t, 0.35, 0.25, 'highpass', 3000, 9000); this.tone(2650, t + 0.05, 0.9, 0.06, 'sine', 2500); this.tone(3970, t + 0.05, 0.7, 0.03); },
  knock() { if (!this.ctx) return; const t = this.ctx.currentTime; for (const d of [0, 0.11]) { this.tone(190, t + d, 0.12, 0.35, 'triangle', 120); this.noise(t + d, 0.03, 0.15, 'lowpass', 1200); } },
  plip() { if (!this.ctx) return; const t = this.ctx.currentTime; this.tone(950, t + 0.25, 0.12, 0.2, 'sine', 320); this.tone(700, t + 0.42, 0.1, 0.1, 'sine', 260); },
  scratch() { if (!this.ctx) return; const t = this.ctx.currentTime + 0.7; for (let i = 0; i < 6; i++) this.noise(t + i * 0.09, 0.07, 0.05, 'bandpass', 3200 + Math.random() * 1500, 0, 2.5); },
  whoosh() { if (!this.ctx) return; const t = this.ctx.currentTime; this.noise(t, 0.7, 0.3, 'lowpass', 300, 1600); for (let i = 0; i < 6; i++) setTimeout(() => this.crackle(0.03 + Math.random() * 0.05), 80 + i * 90); },
  ignite() {
    if (!this.ctx) return; this.strike(); const t = this.ctx.currentTime;
    this.noise(t + 0.02, 0.06, 0.4, 'bandpass', 3200, 0, 1);
    this.noise(t + 0.18, 1.1, 0.32, 'lowpass', 220, 1400);
    this.tone(70, t + 0.2, 0.6, 0.15, 'sine', 45);
    for (let i = 0; i < 10; i++) setTimeout(() => this.crackle(0.02 + Math.random() * 0.06), 250 + i * 110);
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.08); }
};
