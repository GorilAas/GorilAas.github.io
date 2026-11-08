import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { F_BL, F_IN, F_SC, F_TX } from '../book/canvas.js';
import { LOW, wait } from './env.js';
import { DROLL, LEAVES } from '../scene/layout.js';

export let DRACO, KTX2;
export function ktx2Loader() {
  if (KTX2) return KTX2;
  KTX2 = new KTX2Loader().setTranscoderPath('assets/lib/basis/');
  const gl = document.createElement('canvas').getContext('webgl2');
  const get = (n) => (gl ? gl.getExtension(n) : null);
  KTX2.detectSupport({ extensions: { has: (n) => !!get(n), get } });
  if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
  return KTX2;
}
export function gltfLoader() {
  if (!DRACO) { DRACO = new DRACOLoader(); DRACO.setDecoderPath('assets/lib/draco/'); }
  return new GLTFLoader().setDRACOLoader(DRACO).setKTX2Loader(ktx2Loader());
}
export const ASSETS = {};
export async function loadFonts() {
  try {
    for (const [fam, file] of [[F_BL, 'ghotan-textura.otf'], [F_IN, 'lombarda-ghotan.otf']]) { const f = new FontFace(fam, `url(assets/fonts/${file})`); await f.load(); document.fonts.add(f); }
  } catch (e) { console.warn('fonte indisponível', e); }
  await Promise.race([Promise.all([`30px "${F_TX}"`, `italic 30px "${F_TX}"`, `30px "${F_SC}"`].map((f) => document.fonts.load(f))), wait(5000)]);
}
export async function loadTextures() {
  const tl = new THREE.TextureLoader(), kl = ktx2Loader();
  const file = (dir, f) => LOW ? (f === 'diffuse' && dir === 'wood-table-worn' ? `${dir}/diffuse.ktx2` : `${dir}/512/${f}.ktx2`) : `${dir}/${f}.${f === 'nor_gl' ? 'jpg' : 'ktx2'}`;
  const set = async (name, dir) => {
    try {
      const [diff, nor, rough] = await Promise.all(['diffuse', 'nor_gl', 'rough'].map((f) => { const u = `assets/textures/${file(dir, f)}`; return (u.endsWith('.ktx2') ? kl : tl).loadAsync(u); }));
      ASSETS[name] = { diff, nor, rough };
    } catch (e) {}
  };
  const cover = tl.loadAsync('assets/textures/brown-leather/cover.jpg').then((t) => { ASSETS.leatherImg = t.image; }).catch(() => {});
  await Promise.race([Promise.all([cover, set('wood', 'wood-table-worn'), set('leather', 'brown-leather'), set('stone', 'castle-wall-slates'), set('plank', 'medieval-wood')]), wait(8000)]);
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
    const g = new THREE.Group(), pivot = new THREE.Group(); pivot.add(root); g.add(pivot); g.scale.setScalar(3); g.updateMatrixWorld(true);
    const ring = () => {
      const b = new THREE.Box3().setFromObject(g, true), v = new THREE.Vector3(), r = new THREE.Box3();
      g.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y > b.max.y - 0.02) r.expandByPoint(v); } });
      return r.getCenter(v);
    };
    const box = new THREE.Box3().setFromObject(g, true), tc = ring();
    pivot.position.set(-tc.x / 3, -box.min.y / 3, -tc.z / 3);
    g.updateMatrixWorld(true); const top = new THREE.Box3().setFromObject(g, true).max.y;
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
