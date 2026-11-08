import { buildBaseTextures } from './book/canvas.js';
import { loadFonts, loadImages, loadStick, loadTextures } from './core/assets.js';
import { $, wait } from './core/env.js';
import { T } from './core/i18n.js';
import { camera, frame, ignite, init, loadModels, perf, renderer, scene, warmup } from './scene/world.js';
import { applyText, buildHUD } from './ui/hud.js';
import { finishLoader, frameYield, loaderText, task } from './ui/loader.js';
import { audio } from './audio/audio.js';

async function boot() {
  applyText();
  loaderText(T().ui.loaderLine);
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
  await task(renderer.compileAsync(scene, camera));
  await task(warmup());
  await Promise.race([sounds, wait(20000)]);
  perf.last = performance.now();
  requestAnimationFrame(frame);
  await frameYield();
  await finishLoader();
  const btn = $('#ignite'); btn.disabled = false; $('#ignite-label').textContent = T().ui.ignite;
  btn.addEventListener('click', ignite, { once: true });
}
boot();
