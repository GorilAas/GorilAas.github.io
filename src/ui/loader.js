import { $ } from '../core/env.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
let total = 0, done = 0, shown = 0, finished = false;

function paint() {
  shown = Math.max(shown, total ? Math.min(finished ? 12 : 11, Math.floor((done / total) * 12)) : 0);
  document.querySelectorAll('#loader .seg').forEach((s, i) => s.classList.toggle('on', i < shown));
  $('#loader-count').textContent = `${ROMAN[shown] || '·'} de XII`;
}
export function step() { let done; task(new Promise((r) => { done = r; })); return done; }
export function task(p) { total++; paint(); return Promise.resolve(p).catch(() => {}).finally(() => { done++; paint(); }); }
export function loaderText(t) { $('#loader-line').textContent = t; }
export const frameYield = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
export function finishLoader() {
  finished = true; done = total; paint();
  return new Promise((r) => setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.remove('loading'); r(); }, 500));
}
