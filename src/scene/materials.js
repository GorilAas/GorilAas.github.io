import * as THREE from 'three';
import { F_IN, font, mk } from '../book/canvas.js';
import { ANISO, SMALL } from '../core/env.js';
import { fbm, vnoise } from '../core/math.js';
import { SITE } from '../data/conteudo.js';

export let LEATHER;
export function leather() {
  if (LEATHER) return LEATHER;
  const w = 256, h = 350; LEATHER = mk(w, h); const x = LEATHER.getContext('2d'), d = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = fbm(i * 0.03, j * 0.03, 4), f = vnoise(i * 0.5, j * 0.5);
    const v = 150 + n * 110 - f * 30, k = (j * w + i) * 4;
    d.data[k] = v; d.data[k + 1] = v * 0.9; d.data[k + 2] = v * 0.82; d.data[k + 3] = 255;
  }
  x.putImageData(d, 0, 0); return LEATHER;
}
export function leatherSideTexture() {
  const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = '#3c2015'; x.fillRect(0, 0, 256, 256);
  x.globalCompositeOperation = 'multiply'; x.drawImage(leather(), 0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function pageEdgeTexture() {
  const c = mk(512, 64), x = c.getContext('2d'); x.fillStyle = '#d9c591'; x.fillRect(0, 0, 512, 64);
  for (let y = 0; y < 64; y += 1.5) { x.strokeStyle = `rgba(${90 + Math.random() * 40},${60 + Math.random() * 30},30,${0.12 + Math.random() * 0.25})`; x.lineWidth = 0.7; x.beginPath(); x.moveTo(0, y); x.lineTo(512, y + (Math.random() - 0.5)); x.stroke(); }
  const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, 'rgba(90,55,25,.4)'); g.addColorStop(0.15, 'rgba(0,0,0,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,55,25,.4)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function woodTextures() {
  const w = SMALL ? 768 : 1536, h = w / 2, c = mk(w, h), x = c.getContext('2d'), d = x.createImageData(w, h);
  const planks = 5, ph = h / planks;
  for (let j = 0; j < h; j++) {
    const p = Math.floor(j / ph), local = (j % ph) / ph, seed = p * 37.7;
    for (let i = 0; i < w; i++) {
      const n = fbm(i * 0.0025 + seed, j * 0.03, 4), ring = Math.sin(j * 0.14 + n * 14 + seed) * 0.5 + 0.5, fine = vnoise(i * 0.4, j * 1.4);
      let v = 0.42 + ring * 0.28 + (fine - 0.5) * 0.12 + (n - 0.5) * 0.3;
      if (local < 0.012 || local > 0.988) v *= 0.35;
      const k = (j * w + i) * 4; d.data[k] = 48 + v * 70; d.data[k + 1] = 28 + v * 42; d.data[k + 2] = 16 + v * 24; d.data[k + 3] = 255;
    }
  }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
  const bt = new THREE.CanvasTexture(c); bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
  return { map: t, bump: bt };
}
export function sealTextures() {
  const L = SITE.name[0];
  const c = mk(256, 256), x = c.getContext('2d');
  const g = x.createRadialGradient(100, 90, 10, 128, 128, 128); g.addColorStop(0, '#c23a2e'); g.addColorStop(1, '#6a120d');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#4a0b08'; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 86, 0, 7); x.stroke();
  font(x, 110, F_IN); x.textAlign = 'center'; x.fillStyle = '#4a0b08'; x.fillText(L, 128, 166);
  const b = mk(256, 256), y = b.getContext('2d'); y.fillStyle = '#ccc'; y.fillRect(0, 0, 256, 256);
  y.strokeStyle = '#555'; y.lineWidth = 8; y.beginPath(); y.arc(128, 128, 86, 0, 7); y.stroke();
  font(y, 110, F_IN); y.textAlign = 'center'; y.fillStyle = '#444'; y.fillText(L, 128, 166);
  const t1 = new THREE.CanvasTexture(c); t1.colorSpace = THREE.SRGBColorSpace;
  return { map: t1, bump: new THREE.CanvasTexture(b) };
}
export function glowTexture() {
  const c = mk(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,220,160,1)'); g.addColorStop(0.25, 'rgba(255,160,70,.45)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
export function featherTexture() {
  const c = mk(128, 512), x = c.getContext('2d');
  x.strokeStyle = '#efe7d6'; x.lineCap = 'round';
  for (let y = 40; y < 470; y += 3) {
    const t = (y - 40) / 430, wdt = Math.sin(t * Math.PI) * 52 * (0.85 + Math.random() * 0.3);
    x.globalAlpha = 0.75; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(64, y); x.quadraticCurveTo(64 - wdt * 0.6, y - 6, 64 - wdt, y - 18); x.stroke();
    x.beginPath(); x.moveTo(64, y); x.quadraticCurveTo(64 + wdt * 0.6, y - 6, 64 + wdt * 0.8, y - 16); x.stroke();
  }
  x.globalAlpha = 1; x.strokeStyle = '#d8ccb2'; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 20); x.lineTo(64, 512); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
