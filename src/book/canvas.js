import { SMALL } from '../core/env.js';
import { B } from '../core/i18n.js';
import { fbm, vnoise } from '../core/math.js';

export const PW = SMALL ? 768 : 1024, PH = Math.round(PW * 4 / 3), U = PW / 1000, UH = 1333;
export const F_BL = 'Ghotan Textura', F_IN = 'Lombarda Ghotan', F_TX = 'IM Fell English', F_SC = 'IM Fell English SC';
export const C = { ink: '#2b1a10', soft: '#5a4130', rubric: '#a3241c', lapis: '#22408a', gold: '#c19a3f', verd: '#3f6b52' };
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const font = (ctx, px, fam, style = '') => {
  if (fam === F_TX) { px *= 1.07; if (style === '600') { fam = F_SC; style = ''; } }
  ctx.font = `${style} ${px}px "${fam}"`;
};
export function goldGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#f3dc94'); g.addColorStop(0.45, '#c19a3f'); g.addColorStop(0.72, '#87621f'); g.addColorStop(1, '#e9c96f');
  return g;
}

export let NOISE, MOTTLE;
export function buildBaseTextures() {
  NOISE = mk(256, 256);
  { const x = NOISE.getContext('2d'), d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = 140 + Math.random() * 115; d.data[i] = v; d.data[i + 1] = v * 0.93; d.data[i + 2] = v * 0.82; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); }
  const w = 220, h = 293; MOTTLE = mk(w, h);
  { const x = MOTTLE.getContext('2d'), d = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const n = fbm(i * 0.018, j * 0.018, 5), f = fbm(i * 0.09 + 50, j * 0.09, 2);
      const v = 255 - Math.max(0, n - 0.4) * 230 - f * 18;
      const k = (j * w + i) * 4; d.data[k] = v; d.data[k + 1] = v * 0.94; d.data[k + 2] = v * 0.8; d.data[k + 3] = 255;
    }
    x.putImageData(d, 0, 0); }
}

export function parchment(ctx, side) {
  ctx.fillStyle = '#ead8a8'; ctx.fillRect(0, 0, 1000, UH);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.9;
  ctx.drawImage(MOTTLE, -Math.random() * 500, -Math.random() * 660, 1600, 2130);
  ctx.globalAlpha = 0.3; ctx.fillStyle = ctx.createPattern(NOISE, 'repeat'); ctx.fillRect(0, 0, 1000, UH);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * 1000, y = Math.random() * UH, r = 60 + Math.random() * 170;
    const g = ctx.createRadialGradient(x, y, r * 0.82, x, y, r);
    g.addColorStop(0, 'rgba(150,100,45,0)'); g.addColorStop(0.92, 'rgba(150,100,45,.06)'); g.addColorStop(1, 'rgba(150,100,45,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  const v = ctx.createRadialGradient(500, 666, 420, 500, 666, 900);
  v.addColorStop(0, 'rgba(120,75,30,0)'); v.addColorStop(1, 'rgba(110,65,25,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, 1000, UH);
  if (side) {
    const gx = side === 'L' ? 1000 : 0, g = ctx.createLinearGradient(gx, 0, side === 'L' ? 840 : 160, 0);
    g.addColorStop(0, 'rgba(80,45,18,.5)'); g.addColorStop(1, 'rgba(80,45,18,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, UH);
  }
  ctx.restore();
}

export function para(ctx, text, x, y, w, lh, o = {}) {
  const words = text.split(/\s+/).filter(Boolean);
  let i = 0, ln = 0;
  while (i < words.length) {
    const ind = ln < (o.indentLines || 0) ? o.indent : 0, maxW = w - ind;
    const line = [words[i]]; let j = i + 1;
    while (j < words.length && ctx.measureText([...line, words[j]].join(' ')).width <= maxW) { line.push(words[j]); j++; }
    const last = j >= words.length, lx = x + ind;
    if (o.justify && !last && line.length > 1) {
      const tw = line.reduce((s, wd) => s + ctx.measureText(wd).width, 0), gap = (maxW - tw) / (line.length - 1);
      let cx = lx; for (const wd of line) { ctx.fillText(wd, cx, y); cx += ctx.measureText(wd).width + gap; }
    } else if (o.center) { ctx.textAlign = 'center'; ctx.fillText(line.join(' '), x + w / 2, y); ctx.textAlign = 'left'; }
    else ctx.fillText(line.join(' '), lx, y);
    y += lh; i = j; ln++;
  }
  return y;
}
export function margins(side) { return side === 'L' ? { x0: 135, x1: 895 } : { x0: 105, x1: 865 }; }
export function fitFont(ctx, text, size, fam, maxW, style = '') {
  font(ctx, size, fam, style); const w = ctx.measureText(text).width;
  if (w > maxW) { size *= maxW / w; font(ctx, size, fam, style); }
  return size;
}
export function head(ctx, rub, title, x, y, w) {
  font(ctx, 30, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.fillText(rub, x, y);
  fitFont(ctx, title, 104, F_BL, w); ctx.fillStyle = C.ink; ctx.fillText(title, x, y + 100);
  return y + 180;
}
export function folio(ctx, n) { font(ctx, 26, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.textAlign = 'center'; ctx.fillText(n, 500, 1272); ctx.textAlign = 'left'; }
export function rule(ctx, x, y, w, a = 0.28) { ctx.strokeStyle = `rgba(43,26,16,${a})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
export function gloss(ctx, text, x, y, w) {
  font(ctx, 32, 'serif'); ctx.fillStyle = C.rubric; ctx.fillText('☞', x, y);
  font(ctx, 29, F_TX, 'italic'); ctx.fillStyle = C.soft; return para(ctx, text, x + 48, y, w - 48, 42);
}
export function dropCap(ctx, letter, x, y, s = 160) {
  ctx.save();
  ctx.fillStyle = C.lapis; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = 'rgba(240,215,138,.35)';
  for (let i = 14; i < s - 8; i += 17) for (let j = 14; j < s - 8; j += 17) { ctx.beginPath(); ctx.arc(x + i, y + j, 1.7, 0, 7); ctx.fill(); }
  ctx.strokeStyle = goldGrad(ctx, x, y, x + s, y + s); ctx.lineWidth = 6; ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
  ctx.strokeStyle = C.rubric; ctx.lineWidth = 1.6; ctx.strokeRect(x + 11, y + 11, s - 22, s - 22);
  font(ctx, s * 0.78, F_IN); ctx.textAlign = 'center';
  const m = ctx.measureText(letter), hgt = (m.actualBoundingBoxAscent || s * 0.6) + (m.actualBoundingBoxDescent || 0);
  const by = y + s / 2 + hgt / 2 - (m.actualBoundingBoxDescent || 0);
  ctx.fillStyle = '#0f1d44'; ctx.fillText(letter, x + s / 2 + 3, by + 3);
  ctx.fillStyle = goldGrad(ctx, x, y + 10, x + s, y + s); ctx.fillText(letter, x + s / 2, by);
  ctx.restore();
}
export function vine(ctx, x, y0, y1) {
  ctx.save(); ctx.strokeStyle = C.verd; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y0);
  for (let y = y0; y < y1; y += 70) ctx.bezierCurveTo(x + 20, y + 18, x - 20, y + 52, x, y + 70);
  ctx.stroke();
  for (let y = y0 + 35, k = 0; y < y1; y += 70, k++) {
    const s = k % 2 ? 1 : -1;
    ctx.fillStyle = C.verd; ctx.beginPath(); ctx.ellipse(x + s * 17, y - 6, 16, 6.5, s * 0.6, 0, 7); ctx.fill();
    ctx.fillStyle = k % 3 === 0 ? C.rubric : C.gold; ctx.beginPath(); ctx.arc(x - s * 12, y + 14, 4.5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = C.rubric; ctx.beginPath(); ctx.arc(x, y0 - 6, 8, 0, 7); ctx.fill();
  ctx.restore();
}
export function fleuron(ctx, cx, y, w = 240) {
  ctx.save(); ctx.strokeStyle = C.rubric; ctx.lineWidth = 2; const h = w / 2;
  ctx.beginPath(); ctx.moveTo(cx - h, y); ctx.lineTo(cx - 36, y); ctx.moveTo(cx + 36, y); ctx.lineTo(cx + h, y); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, y, 15, 10, 0, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 15, y); ctx.quadraticCurveTo(cx - 28, y - 13, cx - 38, y); ctx.quadraticCurveTo(cx - 28, y + 13, cx - 15, y);
  ctx.moveTo(cx + 15, y); ctx.quadraticCurveTo(cx + 28, y - 13, cx + 38, y); ctx.quadraticCurveTo(cx + 28, y + 13, cx + 15, y); ctx.stroke();
  ctx.fillStyle = C.rubric; ctx.beginPath(); ctx.arc(cx, y, 4, 0, 7); ctx.fill();
  ctx.restore();
}
export function waxEmblem(ctx, cx, cy, r, letter) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#d65244'); g.addColorStop(0.55, '#9b1f18'); g.addColorStop(1, '#5c0f0b');
  ctx.fillStyle = g; ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) { const rr = r * (1 + (vnoise(a * 3 + 7, 1) - 0.5) * 0.16); ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,10,8,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, 7); ctx.stroke();
  font(ctx, r * 0.9, F_IN); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(70,10,8,.85)'; ctx.fillText(letter, cx, cy + r * 0.3);
  ctx.fillStyle = 'rgba(240,120,105,.35)'; ctx.fillText(letter, cx - 1.5, cy + r * 0.3 - 1.5);
  ctx.restore();
}
export function cornerOrn(ctx, x, y, sx, sy) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.strokeStyle = goldGrad(ctx, 0, 0, 80, 80); ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 70); ctx.quadraticCurveTo(0, 0, 70, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, 18); ctx.bezierCurveTo(40, 18, 52, 32, 50, 50); ctx.bezierCurveTo(34, 50, 28, 40, 30, 30); ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(10, 10, 5, 0, 7); ctx.fill();
  ctx.restore();
}
export const ICONS = {
  castle: ['M10 58V26h8v6h6v-6h8v6h6v-6h8v6h6v-6h8v32z', 'M28 58V44a4 4 0 0 1 8 0v14', 'M18 38h4M42 38h4'],
  house: ['M8 30 32 10l24 20', 'M14 26v32h36V26', 'M27 58V42h10v16', 'M40 16v-6h6v11'],
  d20: ['M32 4 56 18v28L32 60 8 46V18z', 'M32 4 20 40h24zM8 18l12 22M56 18 44 40M8 46l12-6M56 46l-12-6M32 60V40'],
  lute: ['M9 44a15 13 0 1 0 30 0a15 13 0 1 0-30 0', 'M20 44a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M33 34 54 10M50 8l7 7M52 6l3 3M55 9l3 3', 'M14 40l18-2M15 46l18-4'],
  quill: ['M52 6C34 10 20 26 14 50c10-6 22-14 30-26M14 50l-4 8', 'M52 6c-2 10-6 18-12 24M36 18l8 2M30 26l9 2M24 36l9 1', 'M6 58h24'],
  sword: ['M44 6h8v8L24 42l-6-6z', 'M14 34l16 16M18 42l-8 8M10 50l4 4M8 56l4-4', 'M40 10l14 14']
};
export function icon(ctx, name, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 64, s / 64);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const d of ICONS[name] || []) ctx.stroke(new Path2D(d));
  if (name === 'd20') { font(ctx, 9, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.textAlign = 'center'; ctx.fillText('20', 32, 34); }
  ctx.restore();
}
export function emblem(ctx, kind, cx, cy, r) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(163,36,28,.07)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, 7); ctx.stroke();
  ctx.lineWidth = 2.6; const g = goldGrad(ctx, -r, -r, r, r);
  if (kind === 'ring') {
    ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 4, r * 0.42, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = C.ink;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(0, 4, r * 0.62 + k * 4, -2.3 + k * 0.2, -0.8 - k * 0.2); ctx.stroke(); }
  } else if (kind === 'sword') {
    ctx.fillStyle = '#c9c2b0'; ctx.strokeStyle = C.ink;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.72); ctx.lineTo(7, -r * 0.55); ctx.lineTo(7, r * 0.25); ctx.lineTo(-7, r * 0.25); ctx.lineTo(-7, -r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = g; ctx.fillRect(-r * 0.4, r * 0.25, r * 0.8, 8); ctx.strokeRect(-r * 0.4, r * 0.25, r * 0.8, 8);
    ctx.fillStyle = C.rubric; ctx.fillRect(-4, r * 0.33, 8, r * 0.28); ctx.beginPath(); ctx.arc(0, r * 0.68, 7, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  } else if (kind === 'mask') {
    ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.ellipse(0, 6, r * 0.42, r * 0.5, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.3); ctx.quadraticCurveTo(-r * 0.5, -r * 0.8, -r * 0.18, -r * 0.62); ctx.moveTo(r * 0.3, -r * 0.3); ctx.quadraticCurveTo(r * 0.5, -r * 0.8, r * 0.18, -r * 0.62); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(-r * 0.17, 2, 6, 10, 0, 0, 7); ctx.ellipse(r * 0.17, 2, 6, 10, 0, 0, 7); ctx.fill();
  } else if (kind === 'castle') {
    ctx.fillStyle = '#d9cdb0'; ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.5); ctx.lineTo(-r * 0.5, -r * 0.2);
    for (let k = 0; k < 5; k++) { const x = -r * 0.5 + k * r * 0.25; ctx.lineTo(x, -r * 0.42); ctx.lineTo(x + r * 0.125, -r * 0.42); ctx.lineTo(x + r * 0.125, -r * 0.2); ctx.lineTo(x + r * 0.25, -r * 0.2); }
    ctx.lineTo(r * 0.5, r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 0.5); ctx.lineTo(-r * 0.12, r * 0.18); ctx.arc(0, r * 0.18, r * 0.12, Math.PI, 0); ctx.lineTo(r * 0.12, r * 0.5); ctx.fill();
    ctx.fillStyle = C.rubric; ctx.beginPath(); ctx.moveTo(0, -r * 0.42); ctx.lineTo(0, -r * 0.72); ctx.lineTo(r * 0.28, -r * 0.63); ctx.lineTo(0, -r * 0.55); ctx.fill(); ctx.stroke();
  } else if (kind === 'eye') {
    ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(0, -r * 0.55, r * 0.6, 0); ctx.quadraticCurveTo(0, r * 0.55, -r * 0.6, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.lapis; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = '#f3dc94'; ctx.beginPath(); ctx.arc(0, 0, r * 0.08, 0, 7); ctx.fill();
    ctx.strokeStyle = g; ctx.lineWidth = 3;
    for (let k = 0; k < 7; k++) { const a = -Math.PI * 0.85 + k * Math.PI * 0.7 / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.42 - r * 0.05); ctx.lineTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.58 - r * 0.08); ctx.stroke(); }
  } else if (kind === 'crown') {
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.3); ctx.lineTo(-r * 0.55, -r * 0.3); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(0, -r * 0.45); ctx.lineTo(r * 0.25, 0); ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.5, r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.rubric; for (const x of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.arc(x * r, r * 0.15, r * 0.06, 0, 7); ctx.fill(); }
  } else {
    ctx.fillStyle = C.lapis; ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.5); ctx.lineTo(r * 0.45, -r * 0.5); ctx.lineTo(r * 0.45, 0); ctx.quadraticCurveTo(r * 0.4, r * 0.45, 0, r * 0.65); ctx.quadraticCurveTo(-r * 0.4, r * 0.45, -r * 0.45, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, -r * 0.45); ctx.lineTo(0, r * 0.55); ctx.moveTo(-r * 0.4, -r * 0.08); ctx.lineTo(r * 0.4, -r * 0.08); ctx.stroke();
  }
  ctx.restore();
}
export const toRoman = (n) => { const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
export const listJoin = (a) => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ' + B().and + ' ' + a[a.length - 1];

export let MARBLE;
export function marbled() {
  if (MARBLE) return MARBLE;
  const w = 600, h = 800, base = mk(w, h), b = base.getContext('2d');
  b.fillStyle = '#d5bf86'; b.fillRect(0, 0, w, h);
  const cols = ['#22408a', '#182b5e', '#a3241c', '#c19a3f', '#efe4c6', '#3f6b52', '#22408a'];
  for (let i = 0; i < 260; i++) { b.globalAlpha = 0.9; b.fillStyle = cols[i % cols.length]; b.beginPath(); b.arc(Math.random() * w, Math.random() * h, 8 + Math.random() * 46, 0, 7); b.fill(); }
  b.globalAlpha = 1;
  const t = mk(w, h), tc = t.getContext('2d');
  const passX = (src, dst, f) => { const d = dst.getContext('2d'); d.clearRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { const o = f(y); d.drawImage(src, 0, y, w, 2, o, y, w, 2); d.drawImage(src, 0, y, w, 2, o - w, y, w, 2); d.drawImage(src, 0, y, w, 2, o + w, y, w, 2); } };
  const passY = (src, dst, f) => { const d = dst.getContext('2d'); d.clearRect(0, 0, w, h); for (let x = 0; x < w; x += 2) { const o = f(x); d.drawImage(src, x, 0, 2, h, x, o, 2, h); d.drawImage(src, x, 0, 2, h, x, o - h, 2, h); d.drawImage(src, x, 0, 2, h, x, o + h, 2, h); } };
  passX(base, t, (y) => Math.sin(y * 0.03) * 60 + Math.sin(y * 0.11) * 14);
  passY(t, base, (x) => Math.sin(x * 0.045) * 40 + Math.sin(x * 0.013) * 60);
  passX(base, t, (y) => Math.sin(y * 0.09 + 1) * 18 + Math.sin(y * 0.021) * 30);
  passY(t, base, (x) => Math.sin(x * 0.12 + 2) * 10);
  tc.clearRect(0, 0, w, h); tc.drawImage(base, 0, 0);
  tc.globalAlpha = 0.28; tc.fillStyle = '#cdb47c'; tc.fillRect(0, 0, w, h);
  tc.globalCompositeOperation = 'multiply'; tc.globalAlpha = 0.35; tc.fillStyle = tc.createPattern(NOISE, 'repeat'); tc.fillRect(0, 0, w, h);
  MARBLE = t; return t;
}
