import { audio } from '../audio/audio.js';
import { listJoin } from '../book/canvas.js';
import { PAGE_TEX, paintCover, paintPage } from '../book/pages.js';
import { $, COARSE } from '../core/env.js';
import { B, fmt, LANG, setLanguage, T } from '../core/i18n.js';
import { SITE, TEXT } from '../data/conteudo.js';
import { backToBook, goTo, isPortrait, LAST, lookUp, next, onDown, onMove, onUp, openBook, prev, readSide, spread, state } from '../scene/world.js';

export let hintKey = null;
export const CHAPTERS = [
  { n: 'I', spread: 2, side: 'left' }, { n: 'II', spread: 3, side: 'left' }, { n: 'III', spread: 4, side: 'left' },
  { n: 'IV', spread: 5, side: 'left' }, { n: 'V', spread: 5, side: 'right' }, { n: 'VI', spread: 6, side: 'left' }, { n: '✠', spread: 7, side: 'left' }
];
export const chapterLabel = (i) => { const t = B().titles; return [t.about, t.works, t.games, t.pastimes, t.relics, t.poem, t.colophon][i]; };
export const show = (s) => $(s).classList.remove('off');
export const hide = (s) => $(s).classList.add('off');
export function showHint(key) { hintKey = key; renderHint(); show('#hint'); }
export function hideHint() { hintKey = null; hide('#hint'); }
export function renderHint() {
  if (!hintKey) return; const u = T().ui;
  $('#hint').textContent = hintKey === 'seal' ? (COARSE ? u.sealTouch : u.sealMouse) : hintKey === 'away' ? (COARSE ? u.awayTouch : u.awayMouse) : (COARSE ? u.readTouch : u.readMouse);
}
export function renderLook() {
  const b = $('#look'), u = T().ui;
  b.classList.toggle('off', state !== 'reading' && state !== 'away');
  b.textContent = state === 'away' ? u.lookBack : u.lookUp;
}
export function updateHUD() {
  if (state !== 'reading' && state !== 'opening') return;
  const P = isPortrait(), u = T().ui;
  $('#where').textContent = P ? u.whereP[spread + (readSide === 'left' ? 'L' : 'R')] : u.where[spread];
  $('#prev').disabled = P ? (spread === 1 && readSide === 'left') : spread === 1;
  $('#next').disabled = P ? (spread === LAST && readSide === 'right') : spread === LAST;
  const cur = CHAPTERS.findIndex((c) => c.spread === spread && (!P || c.side === readSide));
  [...$('#ribbons').querySelectorAll('button')].forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
}
export function buildHUD() {
  const rib = $('#ribbons');
  CHAPTERS.forEach((c, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button">${c.n}</button><span class="lbl"></span>`;
    li.querySelector('button').addEventListener('click', () => goTo(c.spread, c.side));
    rib.appendChild(li);
  });
  $('#prev').addEventListener('click', prev); $('#next').addEventListener('click', next);
  $('#look').addEventListener('click', () => (state === 'away' ? backToBook() : lookUp()));
  $('#sound').addEventListener('click', () => { audio.setMuted(!audio.muted); renderSound(); });
  for (const b of document.querySelectorAll('#lang button')) b.addEventListener('click', () => setLang(b.dataset.lang));
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('button, a')) return;
    if (state === 'closed' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBook(); return; }
    if (e.key === 'Escape' && state === 'reading') { lookUp(); return; }
    if (state === 'away' && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); backToBook(); return; }
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); next(); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  });
  const intro = $('#intro'), nameEl = $('#intro-name');
  intro.addEventListener('pointermove', (e) => {
    for (const g of nameEl.querySelectorAll('.g')) {
      const r = g.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      g.style.setProperty('--k', Math.max(0, 1 - d / 240).toFixed(3));
    }
  });
  intro.addEventListener('pointerleave', () => nameEl.querySelectorAll('.g').forEach((g) => g.style.setProperty('--k', 0)));
  const cv = $('#gl');
  cv.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
}
export function renderSound() {
  const u = T().ui, m = audio.muted, b = $('#sound');
  b.classList.toggle('muted', m); b.setAttribute('aria-pressed', String(!m));
  b.setAttribute('aria-label', m ? u.unmute : u.mute);
  const tr = SITE.music[audio.track ?? 0];
  $('#sound-label').textContent = m ? u.silence : `${tr.name}, ${tr.era[LANG]}`;
  b.title = `${tr.name}. ${u.performer}: ${tr.by}. ${tr.license === 'pd' ? u.pd : tr.license}.`;
}
export function applyText() {
  const t = T(), u = t.ui;
  document.documentElement.lang = t.htmlLang;
  document.title = fmt(t.title);
  $('#intro-pre').textContent = t.book.frontRubric;
  $('#intro-name').innerHTML = [...SITE.name].map((c, i) => `<span class="ch${i === 0 ? ' ini' : ''}" style="--i:${i}"><span class="g">${esc(c)}</span></span>`).join('');
  $('#intro-name').setAttribute('aria-label', SITE.name);
  const btn = $('#ignite'); $('#ignite-label').textContent = btn.disabled ? u.loading : u.ignite; btn.setAttribute('aria-label', u.ignite);
  $('#gl').setAttribute('aria-label', u.canvas);
  $('#prev').setAttribute('aria-label', u.prev); $('#next').setAttribute('aria-label', u.next);
  $('#nav').setAttribute('aria-label', u.chapters); $('#lang').setAttribute('aria-label', u.language);
  for (const b of document.querySelectorAll('#lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === LANG));
  [...$('#ribbons').querySelectorAll('li')].forEach((li, i) => { const l = chapterLabel(i); li.querySelector('.lbl').textContent = l; li.querySelector('button').setAttribute('aria-label', l); });
  renderSound(); renderHint(); updateHUD(); buildA11y(); renderLook();
}
export function setLang(l) {
  if (!TEXT[l] || l === LANG) return;
  setLanguage(l);
  applyText();
  if (PAGE_TEX.length) { for (const e of PAGE_TEX) paintPage(e); paintCover(); }
}
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function buildA11y() {
  const b = B(), el = $('#a11y');
  el.innerHTML = `
    <h1>${esc(SITE.fullName)}</h1><p><em>${esc(b.tagline)}</em></p>
    <h2>${esc(b.titles.about)}</h2>${b.about.map((p) => `<p>${esc(p)}</p>`).join('')}
    <ul>${b.fields.map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join('')}<li>${esc(b.arms)}: ${esc(listJoin(SITE.arms))}</li></ul>
    <h2>${esc(b.titles.works)}</h2>${b.works.map((w, i) => `<h3>${esc(w.title)}${w.when ? ` (${esc(w.when)})` : ''}</h3><p>${esc(w.text)}${SITE.works[i].tools.length ? ` ${esc(b.wrought)} ${esc(listJoin(SITE.works[i].tools))}.` : ''}</p>`).join('')}
    <h2>${esc(b.titles.games)}</h2>${b.games.map((g, i) => `<h3>${esc(SITE.games[i].name)}</h3><p>${esc(g.kind)}. ${esc(g.text)} ${esc(g.note)}.</p>`).join('')}
    <h2>${esc(b.titles.pastimes)}</h2>${b.pastimes.map((p) => `<h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>`).join('')}
    <h2>${esc(b.titles.relics)}</h2>${b.relics.map((r) => `<h3>${esc(r.title)}</h3><ul>${r.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
    <h2>${esc(b.titles.poem)}</h2><h3 lang="pt-BR">${esc(SITE.poem.title)}</h3>${SITE.poem.stanzas.map((st) => `<p lang="pt-BR">${st.map(esc).join('<br>')}</p>`).join('')}
    <h2>${esc(b.titles.colophon)}</h2><p>${esc(b.contact.join(' '))}</p>
    <ul>${SITE.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>`;
}
