import { buildBaseTextures } from './book/canvas.js';
import { loadFonts, loadImages, loadStick, loadTextures } from './core/assets.js';
import { $, wait } from './core/env.js';
import { T } from './core/i18n.js';
import { camera, frame, ignite, init, loadModels, perf, renderer, scene, warmup } from './scene/world.js';
import { applyText, buildHUD } from './ui/hud.js';
import { finishLoader, frameYield, loaderText, step, task } from './ui/loader.js';
import { audio } from './audio/audio.js';

async function boot() {
  applyText();
  loaderText(T().ui.loaderLine);
  const later = Array.from({ length: 16 }, step);
  const sounds = task(audio.preload());
  await Promise.all([task(loadFonts()), task(loadTextures()), task(loadStick()), task(loadImages())]);
  let models;
  try {
    await frameYield();
    buildBaseTextures();
    await frameYield();
    init();
    models = loadModels();
  } catch (err) {
    console.error(err);
    document.body.classList.add('no-gl'); $('#a11y').classList.add('fallback'); finishLoader(); return;
  }
  buildHUD();
  applyText();
  await task(renderer.compileAsync(scene, camera));
  await Promise.race([models, wait(30000)]);
  later.slice(0, 13).forEach((f) => f());
  await task(renderer.compileAsync(scene, camera)); later[13]();
  await task(warmup()); later[14]();
  await Promise.race([sounds, wait(20000)]); later[15]();
  perf.last = performance.now();
  requestAnimationFrame(frame);
  await frameYield();
  await finishLoader();
  const btn = $('#ignite'); btn.disabled = false; $('#ignite-label').textContent = T().ui.ignite;
  btn.addEventListener('click', ignite, { once: true });
}
boot();
