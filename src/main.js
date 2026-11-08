import { buildBaseTextures } from './book/canvas.js';
import { loadFonts, loadImages, loadStick, loadTextures } from './core/assets.js';
import { $ } from './core/env.js';
import { T } from './core/i18n.js';
import { camera, frame, ignite, init, loadModels, perf, renderer, scene, warmup } from './scene/world.js';
import { applyText, buildHUD } from './ui/hud.js';

async function boot() {
  applyText();
  await Promise.all([loadFonts(), loadTextures(), loadStick(), loadImages()]);
  try {
    buildBaseTextures();
    init();
    loadModels().then(() => renderer.compileAsync(scene, camera)).then(warmup).catch(() => {});
  } catch (err) {
    console.error(err);
    document.body.classList.add('no-gl'); $('#a11y').classList.add('fallback'); return;
  }
  buildHUD();
  applyText();
  try { await renderer.compileAsync(scene, camera); } catch (e) {}
  warmup();
  perf.last = performance.now();
  requestAnimationFrame(frame);
  const btn = $('#ignite'); btn.disabled = false; $('#ignite-label').textContent = T().ui.ignite;
  btn.addEventListener('click', ignite, { once: true });
}
boot();
