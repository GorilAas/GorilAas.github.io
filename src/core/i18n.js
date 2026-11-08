import { SITE, TEXT } from '../data/conteudo.js';

export let LANG = (() => {
  try { const s = localStorage.getItem('grimorio-lang'); if (TEXT[s]) return s; } catch (e) {}
  const n = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  return TEXT[n] ? n : 'en';
})();
export const T = () => TEXT[LANG];
export const B = () => TEXT[LANG].book;
export const fmt = (s) => s.replace('{name}', SITE.name).replace('{full}', SITE.fullName).replace('{year}', SITE.year);

export function setLanguage(l) {
  LANG = l;
  try { localStorage.setItem('grimorio-lang', l); } catch (e) {}
}
