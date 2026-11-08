import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { F_BL, F_IN, F_SC, F_TX } from '../book/canvas.js';
import { wait } from './env.js';
import { DROLL, LEAVES } from '../scene/layout.js';

export let DRACO;
export function gltfLoader() {
  if (!DRACO) { DRACO = new DRACOLoader(); DRACO.setDecoderPath('assets/lib/draco/'); }
  return new GLTFLoader().setDRACOLoader(DRACO);
}
export const ASSETS = {};
export async function loadFonts() {
  try {
    for (const [fam, file] of [[F_BL, 'ghotan-textura.otf'], [F_IN, 'lombarda-ghotan.otf']]) { const f = new FontFace(fam, `url(assets/fonts/${file})`); await f.load(); document.fonts.add(f); }
  } catch (e) { console.warn('fonte indisponível', e); }
  await Promise.race([Promise.all([`30px "${F_TX}"`, `italic 30px "${F_TX}"`, `30px "${F_SC}"`].map((f) => document.fonts.load(f))), wait(5000)]);
}
export async function loadTextures() {
  const tl = new THREE.TextureLoader();
  const set = async (name, dir) => {
    try {
      const [diff, nor, rough] = await Promise.all(['diffuse', 'nor_gl', 'rough'].map((f) => tl.loadAsync(`assets/textures/${dir}/${f}.jpg`)));
      ASSETS[name] = { diff, nor, rough };
    } catch (e) {}
  };
  await Promise.race([Promise.all([set('wood', 'wood-table-worn'), set('leather', 'brown-leather')]), wait(8000)]);
  if (ASSETS.leather) {
    const { diff, nor, rough } = ASSETS.leather;
    diff.colorSpace = THREE.SRGBColorSpace;
    for (const t of [diff, nor, rough]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
}
export async function loadStick() {
  try {
    const gltf = await gltfLoader().loadAsync('assets/models/met-candlestick/model.glb');
    const root = gltf.scene;
    root.traverse((o) => {
      if (o.name && o.name.startsWith('_D_')) { const q = o.quaternion; q.set(0, q.y, 0, q.w).normalize(); }
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    const g = new THREE.Group(); g.add(root); g.scale.setScalar(1.75); g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g); root.position.y -= box.min.y / 1.75;
    g.updateMatrixWorld(true); const top = new THREE.Box3().setFromObject(g).max.y;
    ASSETS.stick = g; ASSETS.stickTop = top;
  } catch (e) {}
}
export async function loadImages() {
  const tl = new THREE.TextureLoader(), jobs = [];
  const pair = (dir, item) => Promise.all([tl.loadAsync(`assets/${dir}/${item.name}.jpg`), tl.loadAsync(`assets/${dir}/${item.name}_alpha.jpg`)])
    .then(([m, a]) => { m.colorSpace = THREE.SRGBColorSpace; item.map = m; item.alpha = a; }).catch(() => {});
  for (const L of LEAVES) jobs.push(pair('images/manuscripts', L));
  for (const D of DROLL) jobs.push(pair('images/drolleries', D));
  const img = (k, f) => new THREE.ImageLoader().loadAsync(`assets/images/manuscripts/${f}`).then((im) => { ASSETS[k] = im; }).catch(() => {});
  jobs.push(img('portrait', 'portrait.jpg'), img('scribe', 'scribe.jpg'));
  jobs.push(new THREE.ImageLoader().loadAsync('assets/images/manuscripts/last_judgment.jpg').then((img) => { ASSETS.lj = img; }).catch(() => {}));
  await Promise.race([Promise.all(jobs), wait(8000)]);
}
