import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { audio } from '../audio/audio.js';
import { mk, MOTTLE, UH } from '../book/canvas.js';
import { coverTextures, LINK_RECTS, PAGES, pageTexture } from '../book/pages.js';
import { ASSETS, gltfLoader } from '../core/assets.js';
import { $, ANISO, CALM, COARSE, gsap, LOW, setAniso, SMALL } from '../core/env.js';
import { T } from '../core/i18n.js';
import { clamp, lerp, smooth, vnoise } from '../core/math.js';
import { SITE } from '../data/conteudo.js';
import { DROLL, LEAVES, PROPS, WALL } from './layout.js';
import { buildWindow, WIN } from './window.js';
import { featherTexture, glowTexture, leatherSideTexture, pageEdgeTexture, sealTextures, woodTextures } from './materials.js';
import { hide, hideHint, hintKey, renderLook, show, showHint, updateHUD } from '../ui/hud.js';

export const W = 1.0, H = 1.36, WC = 1.05, HC = 1.42, TC = 0.035, TB = 0.075, EPS = 0.0035, NL = 6, LAST = NL + 1, SEG = 40, SEGZ = 14;
export const BASE = TC + TB;
export const PY_CLOSED = BASE + (NL + 1) * EPS + TB, PY_OPEN = TC;
export const CANDLE = new THREE.Vector3(-1.5, 0, -0.78);
export const LIGHT_MAX = 7.5;
export let CL = 0;

export let renderer, scene, camera, composer, bloom, candleLight, fillLight, hemi, flame, flameMat, glow, halo, dust, embers, emberData = [];
export let coverGroup, spine, sealGroup, sealHalves = [], ribbonMat, leaves = [];
export let PR = 1, PR_MAX = 1, sea = null;
export const camState = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 };
export const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
export const look = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
let lookDrag = null;
const V_Y = new THREE.Vector3(0, 1, 0), lookDir = new THREE.Vector3(), lookRight = new THREE.Vector3();
export const canLook = () => isPortrait() || COARSE;
export const cover = { a: 0 };
export const fx = { light: 0, flame: 0, dust: 0, env: 0 };
export let state = 'loading', spread = 1, readSide = 'right', drag = null, busy = 0;
export let shadowFrames = 4, lastCoverA = -1;
export const bumpShadows = (n = 2) => { shadowFrames = Math.max(shadowFrames, n); };
export const isPortrait = () => innerWidth / innerHeight < 0.8;
export const freeze = (o) => { o.updateMatrixWorld(true); o.traverse((c) => { c.matrixAutoUpdate = false; }); };
export const freezeKids = (o) => { o.updateMatrixWorld(true); o.traverse((c) => { if (c !== o) c.matrixAutoUpdate = false; }); };
export const SUPPORTS = [];
const upRay = new THREE.Raycaster(), downRay = new THREE.Raycaster(), V_UP = new THREE.Vector3(0, 1, 0), V_DOWN = new THREE.Vector3(0, -1, 0);
function supportAt(x, z, top) {
  downRay.set(new THREE.Vector3(x, top, z), V_DOWN);
  for (const h of downRay.intersectObjects(SUPPORTS, false)) {
    const a = h.object.userData.alphaPix;
    if (a && h.uv) { const px = Math.min(a.w - 1, Math.floor(h.uv.x * a.w)), py = Math.min(a.h - 1, Math.floor((1 - h.uv.y) * a.h)); if (a.d[(py * a.w + px) * 4] < 128) continue; }
    return h;
  }
  return null;
}
export function restGap(obj, skip = []) {
  obj.updateMatrixWorld(true);
  const meshes = []; obj.traverse((o) => { if (o.isMesh && !skip.includes(o)) meshes.push(o); });
  const b = new THREE.Box3().setFromObject(obj, true), n = 40, o = new THREE.Vector3();
  let gap = Infinity, on = null;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    o.set(THREE.MathUtils.lerp(b.min.x, b.max.x, i / n), b.min.y - 1, THREE.MathUtils.lerp(b.min.z, b.max.z, j / n));
    upRay.set(o, V_UP); const h = upRay.intersectObjects(meshes, false)[0]; if (!h) continue;
    const s = supportAt(o.x, o.z, b.max.y + 1), g = h.point.y - (s ? s.point.y : 0);
    if (g < gap) { gap = g; on = s ? s.object : null; }
  }
  return { gap, on };
}
export function settle(obj, carry = [], skip = []) {
  const { gap, on } = restGap(obj, skip); if (!isFinite(gap)) return;
  for (const o of [obj, ...carry]) { o.position.y -= gap; o.updateMatrix(); o.updateMatrixWorld(true); }
  if (on) (on.userData.riders || (on.userData.riders = [])).push(obj);
  bumpShadows(3);
}
export const flare = { v: 0 };
export let chestGlow;
export const INTER = [], ibox = new THREE.Box3(), ihit = new THREE.Vector3();
export const bump = () => bumpShadows(2);
export function interactive(key, objs, action) { INTER.push({ key, objs: [].concat(objs), action, busy: false }); }
export function propAt(cx, cy) {
  if (state !== 'closed' && state !== 'reading' && state !== 'away') return null;
  setRay(cx, cy); let best = null, bd = Infinity;
  for (const it of INTER) for (const o of it.objs) {
    ibox.setFromObject(o); ibox.expandByScalar(0.015);
    const h = ray.ray.intersectBox(ibox, ihit); if (!h) continue;
    const d = h.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = it; }
  }
  return best;
}
export function poke(it) {
  if (it.busy) return; it.busy = true;
  const r = it.action(); const done = () => { it.busy = false; };
  if (r && r.then) r.then(done); else setTimeout(done, 600);
}
export let tipTimer = 0;
export function showTip(it, cx, cy, ms) {
  const tip = $('#tip'), lbl = T().props[it.key]; if (!lbl) return;
  tip.querySelector('b').textContent = lbl[0]; tip.querySelector('span').textContent = lbl[1];
  tip.classList.remove('off');
  const x = Math.min(cx + 18, innerWidth - tip.offsetWidth - 10), y = Math.min(cy + 22, innerHeight - tip.offsetHeight - 10);
  tip.style.transform = `translate(${x}px, ${y}px)`;
  clearTimeout(tipTimer); if (ms) tipTimer = setTimeout(hideTip, ms);
}
export function hideTip() { $('#tip').classList.add('off'); }
function tipper(g) {
  if (!g.userData.tip) {
    g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g, true), cx = (b.min.x + b.max.x) / 2, v = new THREE.Vector3(); let r = 0;
    g.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y < b.min.y + 0.006) r = Math.max(r, Math.abs(v.x - cx)); } });
    g.userData.tip = { p0: g.position.clone(), r0: g.rotation.z, r, ox: cx - g.position.x, oy: b.min.y - g.position.y };
  }
  const t = g.userData.tip;
  return (th) => {
    const s = Math.sign(th) || 1, px = t.p0.x + t.ox - s * t.r, py = t.p0.y + t.oy, dx = t.p0.x - px, dy = t.p0.y - py, c = Math.cos(th), sn = Math.sin(th);
    g.position.set(px + dx * c - dy * sn, py + dx * sn + dy * c, t.p0.z); g.rotation.z = t.r0 + th;
  };
}
function spinner(g) {
  if (!g.userData.spin) {
    g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g, true), c = b.getCenter(new THREE.Vector3()), v = new THREE.Vector3(); let r = 0;
    g.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); r = Math.max(r, Math.hypot(v.x - c.x, v.z - c.z)); } });
    const near = Math.max(0, r - Math.max(Math.abs(c.z) - HC / 2, Math.abs(c.x) - WC));
    g.userData.spin = { p0: g.position.clone(), r0: g.rotation.y, c, r, lift: near > 0 ? BASE + 0.12 + 0.02 - b.min.y : 0.05 };
  }
  const t = g.userData.spin;
  return (a, y) => {
    const dx = t.p0.x - t.c.x, dz = t.p0.z - t.c.z, c = Math.cos(a), s = Math.sin(a);
    g.position.set(t.c.x + dx * c + dz * s, t.p0.y + y, t.c.z - dx * s + dz * c); g.rotation.y = t.r0 + a;
  };
}
export const ACTIONS = {
  candle: () => { audio.whoosh(); return gsap.fromTo(flare, { v: 1 }, { v: 0, duration: 1.8, ease: 'power2.out' }); },
  goblet: (g) => {
    audio.clink(); const tip = tipper(g), st = { a: 0 };
    return gsap.timeline({ onUpdate: () => { tip(st.a); bump(); }, onComplete: () => tip(0) }).to(st, { a: 0.16, duration: 0.12 }).to(st, { a: -0.12, duration: 0.16 }).to(st, { a: 0.07, duration: 0.16 }).to(st, { a: -0.03, duration: 0.16 }).to(st, { a: 0, duration: 0.2 });
  },
  apple: (g) => {
    audio.crunch(); const y0 = g.position.y, r0 = g.rotation.y;
    return gsap.timeline({ onUpdate: bump, onComplete: () => { g.position.y = y0; g.rotation.y = r0; } }).to(g.position, { y: y0 + 0.16, duration: 0.22, ease: 'power2.out' }).to(g.position, { y: y0, duration: 0.45, ease: 'bounce.out' }).to(g.rotation, { y: r0 + Math.PI * 2, duration: 0.6, ease: 'power1.inOut' }, 0);
  },
  penbox: (g) => {
    audio.knock(); const tip = tipper(g), st = { a: 0, y: 0 };
    return gsap.timeline({ onUpdate: () => { tip(st.a); g.position.y += st.y; bump(); }, onComplete: () => tip(0) })
      .to(st, { y: 0.05, duration: 0.12, ease: 'power2.out' }).to(st, { y: 0, duration: 0.3, ease: 'bounce.out' })
      .to(st, { a: 0.06, duration: 0.1 }, 0).to(st, { a: -0.04, duration: 0.12 }).to(st, { a: 0.02, duration: 0.1 }).to(st, { a: 0, duration: 0.1 });
  },
  dagger: (g) => {
    audio.shing(); const sp = spinner(g), st = { a: 0, y: 0 };
    return gsap.timeline({ onUpdate: () => { sp(st.a, st.y); bump(); }, onComplete: () => sp(0, 0) })
      .to(st, { y: g.userData.spin.lift, duration: 0.3, ease: 'power2.out' }).to(st, { a: Math.PI * 2, duration: 0.9, ease: 'power2.inOut' }, 0.15).to(st, { y: 0, duration: 0.35, ease: 'power2.in' }, 0.95);
  },
  chest: (g) => {
    const lid = g.userData.lid; if (!lid) return;
    g.userData.open = !g.userData.open;
    if (g.userData.open) {
      audio.creak(); setTimeout(() => audio.coins(), 380);
      gsap.to(chestGlow, { intensity: 1.6, duration: 0.9 });
      return gsap.to(lid.rotation, { x: lid.userData.x0 - 1.15, duration: 1.1, ease: 'power2.out', onUpdate: bump });
    }
    audio.creak(true); gsap.to(chestGlow, { intensity: 0, duration: 0.5 });
    return gsap.to(lid.rotation, { x: lid.userData.x0, duration: 0.7, ease: 'power2.in', onUpdate: bump, onComplete: () => audio.thud() });
  },
  inkwell: (q) => {
    audio.plip(); audio.scratch(); const u = q.userData;
    return gsap.timeline({ onUpdate: bump }).to(q.position, { y: u.y0 - 0.07, duration: 0.3, ease: 'power2.in' }).to(q.position, { y: u.y0, duration: 0.45, ease: 'power2.out' }).to(q.rotation, { x: u.rx + 0.22, duration: 0.18, yoyo: true, repeat: 3 }, 0.75);
  },
  scroll: (sc) => {
    audio.flip();
    const st = { a: 0 }, axis = new THREE.Vector3(0, 1, 0), q0 = sc.quaternion.clone(), p0 = sc.position.clone();
    const dir = new THREE.Vector3().crossVectors(axis.clone().applyQuaternion(q0), new THREE.Vector3(0, 1, 0)).normalize(), tq = new THREE.Quaternion();
    return gsap.timeline({ onUpdate: () => { sc.quaternion.copy(q0).multiply(tq.setFromAxisAngle(axis, st.a)); sc.position.copy(p0).addScaledVector(dir, -st.a * 0.045); bump(); } })
      .to(st, { a: Math.PI * 1.6, duration: 0.9, ease: 'power2.out' }).to(st, { a: 0, duration: 1.1, ease: 'power2.inOut' }, '+=0.4');
  },
  wall: (g) => { audio.knock(); const r = g.rotation.z; g.matrixAutoUpdate = true; return gsap.timeline({ onUpdate: bump, onComplete: () => { g.rotation.z = r; g.updateMatrix(); g.matrixAutoUpdate = false; } }).to(g.rotation, { z: r + 0.05, duration: 0.12 }).to(g.rotation, { z: r - 0.03, duration: 0.2 }).to(g.rotation, { z: r, duration: 0.3, ease: 'power2.out' }); },
  leaf: (m) => {
    audio.flip(); const y0 = m.position.y, r0 = m.rotation.y, riders = (m.userData.riders || []).filter((r) => r.parent === scene);
    const its = INTER.filter((it) => it.objs.some((o) => riders.includes(o))); its.forEach((it) => { it.busy = true; });
    riders.forEach((r) => m.attach(r)); const up = riders.length ? 0.025 : 0.07;
    return gsap.timeline({ onUpdate: bump, onComplete: () => { m.position.y = y0; m.rotation.set(0, r0, 0); m.updateMatrixWorld(true); riders.forEach((r) => scene.attach(r)); its.forEach((it) => { it.busy = false; }); } })
      .to(m.position, { y: y0 + up, duration: 0.35, ease: 'power2.out' }).to(m.rotation, { y: r0 + 0.12, duration: 0.35 }, 0)
      .to(m.position, { y: y0, duration: 0.6, ease: 'bounce.out' }).to(m.rotation, { y: r0, duration: 0.6 }, '<');
  }
};

export function init() {
  const canvas = $('#gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  PR_MAX = Math.min(devicePixelRatio || 1, LOW ? 1.5 : 1.75); PR = PR_MAX;
  renderer.setPixelRatio(PR); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  setAniso(Math.min(LOW ? 4 : 8, renderer.capabilities.getMaxAnisotropy()));
  CL = ASSETS.stick ? ASSETS.stickTop - 0.075 : 0;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050302);
  scene.fog = new THREE.FogExp2(0x050302, 0.16);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0;
  pm.dispose();

  camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.02, 60);

  candleLight = new THREE.PointLight(0xffa458, 0, 0, 2);
  candleLight.position.set(CANDLE.x, 0.5 + CL, CANDLE.z);
  candleLight.castShadow = true;
  candleLight.shadow.mapSize.set(LOW ? 512 : 1024, LOW ? 512 : 1024);
  candleLight.shadow.bias = -0.002; candleLight.shadow.normalBias = 0.02;
  candleLight.shadow.camera.near = 0.03; candleLight.shadow.camera.far = 8;
  scene.add(candleLight);
  fillLight = new THREE.DirectionalLight(0xffcf98, 0); fillLight.position.set(0.8, 3.5, 2.6); scene.add(fillLight);
  hemi = new THREE.HemisphereLight(0x6b4a33, 0x0a0604, 0); scene.add(hemi);
  chestGlow = new THREE.PointLight(0xffc46b, 0, 1.4, 2); chestGlow.position.set(-0.35, 0.25, -1.75); scene.add(chestGlow);

  buildDesk(); sea = buildWindow(scene); interactive('window', sea.pickables, () => sea.cycle()); buildCandle(); buildProps(); buildBook(); buildParticles(); buildLooseLeaves(); buildDrolleries();
  const dk = scene.userData.desk; settle(dk.well, [dk.quill]); dk.quill.userData.y0 = dk.quill.position.y; settle(dk.scroll);

  const samples = SMALL ? 2 : PR >= 1.5 ? 2 : 4;
  const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(PR); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.55, 0.6, 0.92);
  const bloomSize = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => bloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  setPose(poseIntro(), 0);
  addEventListener('resize', onResize);
}

export function buildDesk() {
  let m;
  if (ASSETS.wood) {
    const { diff, nor, rough } = ASSETS.wood;
    for (const t of [diff, nor, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4.05, 2.0); t.anisotropy = ANISO; }
    diff.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshStandardMaterial({ map: diff, normalMap: nor, normalScale: new THREE.Vector2(1.2, 1.2), roughnessMap: rough, roughness: 1, metalness: 0, color: 0xc29b7c });
  } else {
    const wood = woodTextures();
    wood.map.repeat.set(1.87, 1.6); wood.bump.repeat.copy(wood.map.repeat);
    m = new THREE.MeshStandardMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: 1.2, roughness: 0.72, metalness: 0 });
  }
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.2), m);
  desk.rotation.x = -Math.PI / 2; desk.position.z = 0.4; desk.receiveShadow = true; scene.add(desk); freeze(desk);
}

export function buildCandle() {
  const g = new THREE.Group(); g.position.copy(CANDLE); g.position.y = CL; scene.add(g);
  if (ASSETS.stick) { const st = ASSETS.stick; st.position.set(CANDLE.x, 0, CANDLE.z); scene.add(st); freeze(st); }
  else {
    const brass = new THREE.MeshStandardMaterial({ color: 0xb48c55, metalness: 1, roughness: 0.32, envMapIntensity: 1.4 });
    const prof = [[0, 0], [0.17, 0], [0.178, 0.012], [0.17, 0.024], [0.09, 0.026], [0.08, 0.05], [0.088, 0.062], [0.0, 0.062]].map(([x, y]) => new THREE.Vector2(x, y));
    const holder = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), brass); holder.castShadow = true; holder.receiveShadow = true; g.add(holder);
  }
  interactive('candle', ASSETS.stick ? [g, ASSETS.stick] : [g], ACTIONS.candle);
  const grad = mk(64, 256), gx = grad.getContext('2d'), gg = gx.createLinearGradient(0, 0, 0, 256);
  gg.addColorStop(0, '#ffe2b0'); gg.addColorStop(0.08, '#f5cf95'); gg.addColorStop(0.3, '#c9a473'); gg.addColorStop(0.7, '#7a5c3c'); gg.addColorStop(1, '#3a2817');
  gx.fillStyle = gg; gx.fillRect(0, 0, 64, 256);
  const side = gx.createLinearGradient(0, 0, 64, 0); side.addColorStop(0, 'rgba(0,0,0,.35)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,.35)');
  gx.fillStyle = side; gx.fillRect(0, 0, 64, 256);
  const em = new THREE.CanvasTexture(grad); em.colorSpace = THREE.SRGBColorSpace;
  const wax = new THREE.MeshBasicMaterial({ map: em, color: 0x222222 });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.051, 0.38, 40), wax);
  candle.position.y = 0.022 + 0.19; candle.receiveShadow = true; g.add(candle);
  g.userData.wax = wax;
  for (const [a, y, l] of [[0.4, 0.33, 0.06], [2.2, 0.36, 0.09], [4.1, 0.31, 0.05]]) {
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, l, 4, 8), wax);
    d.position.set(Math.cos(a) * 0.047, y, Math.sin(a) * 0.047); g.add(d);
  }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.03, 8), new THREE.MeshBasicMaterial({ color: 0x120a06 }));
  wick.position.y = 0.415; g.add(wick);
  freeze(g);
  flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform float uPower; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      void main(){
        float y = vUv.y;
        float nn = n(vec2(vUv.x*4.0, y*5.0 - uTime*4.0));
        float sway = (n(vec2(uTime*1.7, 3.0)) - 0.5) * 0.35 * y * y;
        float x = (vUv.x - 0.5 - sway) * 2.0;
        float w = pow(sin(3.14159 * pow(clamp(y, 0.0, 1.0), 0.62)), 1.15) * (0.52 + 0.12 * nn);
        float d = abs(x) / max(w, 0.001);
        float shape = smoothstep(1.0, 0.45, d) * smoothstep(0.0, 0.07, y) * smoothstep(1.0, 0.72, y + nn * 0.12);
        float core = smoothstep(0.65, 0.0, d) * smoothstep(0.7, 0.12, y);
        vec3 col = mix(vec3(1.0, 0.32, 0.04), vec3(1.0, 0.72, 0.28), shape);
        col = mix(col, vec3(1.0, 0.96, 0.82), core);
        float blue = smoothstep(0.22, 0.0, y) * (1.0 - core);
        col = mix(col, vec3(0.25, 0.4, 1.0), blue * 0.7);
        gl_FragColor = vec4(col * 3.2 * uPower, shape * uPower);
      }`
  });
  flame = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.17).translate(0, 0.085, 0), flameMat);
  flame.position.set(CANDLE.x, 0.418 + CL, CANDLE.z); flame.scale.setScalar(0.001); scene.add(flame);
  const gt = glowTexture();
  glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xffb070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.position.set(CANDLE.x, 0.49 + CL, CANDLE.z); glow.scale.setScalar(0.26); scene.add(glow);
  halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xff8a3a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  halo.position.copy(glow.position); halo.scale.setScalar(2.2); scene.add(halo);
  scene.userData.candleGroup = g;
}

export function buildProps() {
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x120c10, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2 });
  const prof = [[0, 0], [0.11, 0], [0.12, 0.02], [0.12, 0.085], [0.095, 0.115], [0.045, 0.128], [0.043, 0.158], [0.054, 0.163], [0.05, 0.172], [0, 0.172]].map(([x, y]) => new THREE.Vector2(x, y));
  const well = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glass); well.position.set(1.66, 0, -0.68); well.castShadow = true; scene.add(well); freeze(well);
  const quill = new THREE.Group(); quill.position.set(1.66, 0.15, -0.68); quill.rotation.set(-0.42, 0.5, -0.38); scene.add(quill);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.002, 0.62, 8), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.5 }));
  shaft.position.y = 0.26; quill.add(shaft);
  const fm = new THREE.MeshStandardMaterial({ map: featherTexture(), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.8 });
  const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.56), fm); feather.position.y = 0.33; feather.castShadow = true; quill.add(feather);
  freezeKids(quill); quill.userData = { y0: quill.position.y, rx: quill.rotation.x };
  interactive('inkwell', [well, quill], () => ACTIONS.inkwell(quill));
  const pc = mk(512, 256), px = pc.getContext('2d'); px.scale(512 / 1000, 256 / 500); px.fillStyle = '#e2cf9c'; px.fillRect(0, 0, 1000, 500);
  px.globalCompositeOperation = 'multiply'; px.drawImage(MOTTLE, 0, 0, 1000, 500);
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const parch = new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.85 });
  const capc = mk(128, 128), cx = capc.getContext('2d'); cx.fillStyle = '#d8c48e'; cx.fillRect(0, 0, 128, 128); cx.strokeStyle = 'rgba(110,70,30,.6)'; cx.lineWidth = 1.5;
  cx.beginPath(); for (let a = 0; a < 40; a += 0.1) { const r = a * 1.5; cx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } cx.stroke();
  const capT = new THREE.CanvasTexture(capc); capT.colorSpace = THREE.SRGBColorSpace; const capM = new THREE.MeshStandardMaterial({ map: capT, roughness: 0.9 });
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 40), [parch, capM, capM]);
  scroll.rotation.set(0, 0.45, Math.PI / 2); scroll.position.set(1.55, 0.045, 0.62); scroll.castShadow = true; scroll.receiveShadow = true; scene.add(scroll);
  const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.0458, 0.0458, 0.022, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x8f1d16, roughness: 0.6, side: THREE.DoubleSide }));
  tie.position.copy(scroll.position); tie.rotation.copy(scroll.rotation); scene.add(tie); scroll.attach(tie); freezeKids(scroll);
  interactive('scroll', [scroll], () => ACTIONS.scroll(scroll));
  scene.userData.desk = { well, quill, scroll };
}

export const vid = (i, j) => i * (SEGZ + 1) + j;
export function makeLeafGeometry() {
  const g = new THREE.BufferGeometry(), n = (SEG + 1) * (SEGZ + 1);
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= SEG; i++) for (let j = 0; j <= SEGZ; j++) uv.set([i / SEG, 1 - j / SEGZ], vid(i, j) * 2);
  for (let i = 0; i < SEG; i++) for (let j = 0; j < SEGZ; j++) {
    const a = vid(i, j), b = vid(i, j + 1), c = vid(i + 1, j), d = vid(i + 1, j + 1); idx.push(a, b, c, c, b, d);
  }
  g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
export const yRight = (i) => BASE + (NL - i) * EPS + EPS;
export const yLeft = (i) => BASE + (i + 1) * EPS;
export function bendLeaf(L) {
  const t = L.t, th = Math.PI * t, b = 0.64 * Math.sin(Math.PI * t), ds = W / SEG, k = L.k ?? 0.8;
  const p = L.geo.attributes.position.array;
  for (let j = 0; j <= SEGZ; j++) {
    const zn = j / SEGZ * 2 - 1, z = zn * H / 2, f = 1 - 0.48 * k * zn;
    let x = 0, y = 0, o = vid(0, j) * 3; p[o] = 0; p[o + 1] = 0; p[o + 2] = z;
    for (let i = 1; i <= SEG; i++) {
      const s = (i - 0.5) / SEG, a = th - b * f * Math.pow(s, 1.35);
      x += ds * Math.cos(a); y += ds * Math.sin(a);
      o = vid(i, j) * 3; p[o] = x; p[o + 1] = y; p[o + 2] = z;
    }
  }
  L.geo.attributes.position.needsUpdate = true; L.geo.computeVertexNormals(); L.geo.computeBoundingSphere();
  L.group.position.y = lerp(yRight(L.i), yLeft(L.i), smooth(t)) + Math.sin(Math.PI * t) * 0.004;
  L.dirty = false;
  bumpShadows(2);
}

export function buildBook() {
  const book = new THREE.Group(); scene.add(book);
  const leatherSide = leatherSideTexture();
  const leatherM = ASSETS.leather
    ? new THREE.MeshStandardMaterial({ map: ASSETS.leather.diff, normalMap: ASSETS.leather.nor, roughnessMap: ASSETS.leather.rough, roughness: 1, color: 0x6a3a26 })
    : new THREE.MeshStandardMaterial({ map: leatherSide, roughness: 0.78 });
  const edgeM = new THREE.MeshStandardMaterial({ map: pageEdgeTexture(), roughness: 0.9 });
  const paperM = new THREE.MeshStandardMaterial({ color: 0xd9c591, roughness: 0.9 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(WC, TC, HC), leatherM); back.position.set(WC / 2 - 0.006, TC / 2, 0); back.castShadow = back.receiveShadow = true; book.add(back);
  const blockR = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, TB, H), [edgeM, edgeM, paperM, paperM, edgeM, edgeM]);
  blockR.position.set(W / 2 + 0.005, TC + TB / 2, 0); blockR.castShadow = blockR.receiveShadow = true; book.add(blockR);
  const finis = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.01, H), new THREE.MeshStandardMaterial({ map: pageTexture(PAGES.finis, 'R'), roughness: 0.92 }));
  finis.rotation.x = -Math.PI / 2; finis.position.set(W / 2 + 0.005, BASE + 0.0006, 0); finis.receiveShadow = true; book.add(finis);
  for (const o of [back, blockR, finis]) freeze(o);

  const g1 = SITE.gamesOnFirstPage;
  const sides = [
    [(c) => PAGES.frontis(c), 'R', (c) => PAGES.about(c), 'L'],
    [(c) => PAGES.sheet(c), 'R', (c) => PAGES.works(c, 'L', 0, 2, true, 'iii'), 'L'],
    [(c) => PAGES.works(c, 'R', 2, 2, false, 'iv'), 'R', (c) => PAGES.games(c, 'L', 0, g1, true, 'v'), 'L'],
    [(c) => PAGES.games(c, 'R', g1, 3, false, 'vi'), 'R', (c) => PAGES.pastimes(c), 'L'],
    [(c) => PAGES.relics(c), 'R', (c) => PAGES.poem(c, 0), 'L'],
    [(c) => PAGES.poem(c, 1), 'R', (c) => PAGES.colophon(c), 'L']
  ];
  sides.forEach(([fd, fs, bd, bs], i) => {
    const geo = makeLeafGeometry(), group = new THREE.Group();
    const fm = new THREE.MeshStandardMaterial({ map: pageTexture(fd, fs), roughness: 0.9, side: THREE.FrontSide, shadowSide: THREE.DoubleSide });
    const bm = new THREE.MeshStandardMaterial({ map: pageTexture(bd, bs, true), roughness: 0.9, side: THREE.BackSide });
    const f = new THREE.Mesh(geo, fm), b = new THREE.Mesh(geo, bm);
    f.castShadow = true; f.receiveShadow = true; b.receiveShadow = true;
    group.add(f, b); book.add(group);
    const L = { i, t: 0, geo, group, dirty: true }; leaves.push(L); bendLeaf(L);
  });

  coverGroup = new THREE.Group(); coverGroup.position.set(0, PY_CLOSED, 0); book.add(coverGroup);
  const board = new THREE.Mesh(new THREE.BoxGeometry(WC, TC, HC), leatherM); board.position.set(WC / 2 - 0.006, TC / 2, 0); board.castShadow = board.receiveShadow = true; coverGroup.add(board);
  const ct = coverTextures();
  const art = new THREE.Mesh(new THREE.PlaneGeometry(WC - 0.004, HC - 0.004), new THREE.MeshStandardMaterial({
    map: ct.map, roughnessMap: ct.rm, metalnessMap: ct.rm, bumpMap: ct.bump, bumpScale: 3, roughness: 1, metalness: 1, envMapIntensity: 2.2,
    normalMap: ASSETS.leather ? ASSETS.leather.nor : null, normalScale: new THREE.Vector2(0.8, 0.8)
  }));
  art.rotation.x = -Math.PI / 2; art.position.set(WC / 2 - 0.006, TC + 0.0008, 0); art.receiveShadow = true; coverGroup.add(art);
  const blockL = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, TB, H), [edgeM, edgeM, paperM, paperM, edgeM, edgeM]);
  blockL.position.set(W / 2 + 0.005, -TB / 2, 0); blockL.castShadow = blockL.receiveShadow = true; coverGroup.add(blockL);
  const flipG = new THREE.Group(); flipG.rotation.z = Math.PI; flipG.position.set(0, -TB - 0.0006, 0); coverGroup.add(flipG);
  const endp = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.01, H), new THREE.MeshStandardMaterial({ map: pageTexture(PAGES.endpaper, 'L'), roughness: 0.9 }));
  endp.rotation.x = -Math.PI / 2; endp.position.set(-(W / 2 + 0.005), 0, 0); endp.receiveShadow = true; flipG.add(endp);

  const T0 = PY_CLOSED + TC;
  const spineM = leatherM.clone(); spineM.side = THREE.DoubleSide;
  spine = new THREE.Mesh(new THREE.CylinderGeometry(T0 / 2, T0 / 2, HC, 28, 1, true, Math.PI, Math.PI), spineM);
  spine.rotation.x = Math.PI / 2; spine.position.set(-0.006, T0 / 2, 0); spine.userData.h = T0 / 2; spine.castShadow = true; book.add(spine);

  const st = sealTextures();
  const side = new THREE.MeshPhysicalMaterial({ color: 0x8e1b14, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3, transparent: true });
  const top = new THREE.MeshPhysicalMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 4, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25, transparent: true });
  sealGroup = new THREE.Group(); sealGroup.position.set(WC * 0.5, TC + 0.013, HC * 0.3); coverGroup.add(sealGroup);
  for (const t0 of [Math.PI / 2, Math.PI * 1.5]) {
    const g = new THREE.CylinderGeometry(0.105, 0.112, 0.026, 64, 1, false, t0, Math.PI);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k), r = Math.hypot(x, z); if (r < 1e-4) continue;
      const a = Math.atan2(z, x), s = 1 + (vnoise(a * 3 + 10, 2) - 0.5) * 0.18; p.setX(k, x * s); p.setZ(k, z * s);
    }
    g.computeVertexNormals();
    const half = new THREE.Mesh(g, [side, top, side]); half.castShadow = true; sealGroup.add(half); sealHalves.push(half);
  }
  ribbonMat = new THREE.MeshStandardMaterial({ color: 0x8f1d16, roughness: 0.55, transparent: true });
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.003, HC * 0.2 + 0.01), ribbonMat); r1.position.set(WC * 0.5, TC + 0.002, HC * 0.4); coverGroup.add(r1);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.003), ribbonMat); r2.position.set(WC * 0.5, TC - 0.13, HC / 2 + 0.004); coverGroup.add(r2);
  scene.userData.ribbon = [r1, r2];
}

export function buildParticles() {
  const N = SMALL ? 260 : 480, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = -2.3 + Math.random() * 4.6; pos[i * 3 + 1] = 0.05 + Math.random() * 1.5; pos[i * 3 + 2] = -1.8 + Math.random() * 3.2; seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLight: { value: new THREE.Vector3(CANDLE.x, 0.5 + CL, CANDLE.z) }, uOn: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime; uniform vec3 uLight; uniform float uPR; attribute float aSeed; varying float vB;
      void main(){ vec3 p = position;
        p.x += sin(uTime*0.11 + aSeed*6.28)*0.18; p.y += sin(uTime*0.07 + aSeed*12.0)*0.12; p.z += cos(uTime*0.09 + aSeed*9.0)*0.16;
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv;
        float d = distance(p, uLight); vB = 1.0/(1.0 + d*d*2.2) * (0.45 + 0.55*sin(uTime*0.6 + aSeed*40.0));
        gl_PointSize = (1.4 + aSeed*2.6) * uPR * 3.0 / -mv.z; }`,
    fragmentShader: `uniform float uOn; varying float vB; void main(){ float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.58) * vB * 1.8 * uOn, a * vB * uOn); }`
  });
  dust = new THREE.Points(g, m); dust.frustumCulled = false; scene.add(dust);
  const E = 26, ep = new Float32Array(E * 3), eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  for (let i = 0; i < E; i++) emberData.push({ life: Math.random(), speed: 0.15 + Math.random() * 0.25, ox: 0, oz: 0, ph: Math.random() * 6 });
  embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: glowTexture(), size: 0.018, color: new THREE.Color(2.2, 0.9, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  embers.frustumCulled = false; scene.add(embers);
}

export function topY(s, side) {
  if (side === 'L') return s >= 2 ? yLeft(s - 2) : BASE;
  return s <= NL ? yRight(s - 1) : BASE;
}
export function buildDrolleries() {
  for (const D of DROLL) {
    if (!D.map) continue;
    const img = D.alphaOnly ? D.alpha.image : D.map.image, w = D.w, h = w * img.height / img.width;
    const geo = new THREE.PlaneGeometry(w, h, D.anim === 'swim' ? 24 : 1, 1);
    if (D.pivot === 'bottom') geo.translate(0, h / 2, 0);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ map: D.alphaOnly ? null : D.map, color: D.alphaOnly ? 0x3a2414 : 0xffffff, alphaMap: D.alpha, alphaTest: 0.35, transparent: true, opacity: 0, roughness: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    D.map.anisotropy = ANISO;
    if (D.anim === 'swim') {
      D.uTime = { value: 0 };
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = D.uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>
          float k = clamp((position.x + ${(w * 0.05).toFixed(4)}) / ${(w * 0.55).toFixed(4)}, 0.0, 1.0);
          transformed.z += sin(position.x * 38.0 - uTime * 7.0) * 0.007 * k;`);
      };
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2; mesh.receiveShadow = true; mesh.visible = false;
    D.base = new THREE.Vector3(D.side === 'R' ? D.u * W : -W + D.u * W, topY(D.spread, D.side) + 0.0016, -H / 2 + D.v * H);
    mesh.position.copy(D.base);
    D.mesh = mesh; scene.add(mesh);
  }
}
export function animateDrolleries(t, dt) {
  const show = state === 'reading' && busy === 0 && !drag && cover.a >= 1;
  for (const D of DROLL) {
    if (!D.mesh) continue;
    const target = show && spread === D.spread ? 1 : 0, m = D.mesh.material;
    m.opacity += (target - m.opacity) * Math.min(1, dt * 5);
    D.mesh.visible = m.opacity > 0.01;
    if (!D.mesh.visible) continue;
    const p = D.mesh.position, b = D.base;
    if (D.anim === 'joustL' || D.anim === 'joustR') {
      const ph = (t % 5) / 5;
      const d = ph < 0.42 ? Math.pow(ph / 0.42, 2) : ph < 0.5 ? 1 : 1 - smooth((ph - 0.5) / 0.5);
      const dir = D.anim === 'joustL' ? 1 : -1, hit = ph > 0.42 && ph < 0.52 ? Math.sin((ph - 0.42) * 120) * 0.006 : 0;
      p.set(b.x + dir * (-0.065 + d * 0.065) + hit * dir, b.y, b.z - Math.abs(Math.sin(t * 10 + (dir > 0 ? 0 : 1.3))) * 0.006);
      D.mesh.rotation.y = Math.sin(t * 10 + dir) * 0.025 + (D.anim === 'joustR' && hit ? 0.06 : 0);
    } else if (D.anim === 'swim') {
      D.uTime.value = t;
      const s = Math.sin(t * 0.42), c = Math.cos(t * 0.42);
      p.set(b.x + s * 0.27 * W, b.y, b.z + Math.sin(t * 2.6) * 0.006);
      D.mesh.scale.x = -clamp(c * 5, -1, 1);
      D.mesh.rotation.y = Math.sin(t * 2.6 + 1) * 0.05;
    } else if (D.anim === 'spin') {
      D.mesh.rotation.y = -t * 0.12;
      D.mesh.scale.setScalar(1 + Math.sin(t * 0.8) * 0.012);
    } else if (D.anim === 'raven') {
      const ph = t % 4.2, hop = ph > 3.2 ? Math.sin((ph - 3.2) * Math.PI) : 0, peck = ph > 1.2 && ph < 2.2 ? Math.abs(Math.sin((ph - 1.2) * Math.PI * 3)) : 0;
      if (ph < dt) D.dir = Math.random() < 0.35 ? -(D.dir || 1) : (D.dir || 1);
      D.mesh.scale.x = D.dir || 1;
      p.set(b.x + (D.dir || 1) * hop * 0.015, b.y, b.z - hop * 0.03);
      D.mesh.rotation.y = -peck * 0.18 * (D.dir || 1);
    } else if (D.anim === 'dance') {
      p.set(b.x, b.y, b.z - Math.abs(Math.sin(t * 2.6)) * 0.014);
      D.mesh.rotation.y = Math.sin(t * 2.6) * 0.14;
      D.mesh.scale.setScalar(1 + Math.sin(t * 5.2) * 0.015);
    }
  }
}

export function poseIntro() { return { p: new THREE.Vector3(CANDLE.x + 0.5, 0.62 + CL, CANDLE.z + 0.72), t: new THREE.Vector3(CANDLE.x, 0.47 + CL, CANDLE.z) }; }
export function poseClosed() {
  const a = innerWidth / innerHeight;
  if (a < 0.8) return { p: new THREE.Vector3(0.55, 2.3, 3.6), t: new THREE.Vector3(0.5, 0.22, -0.2) };
  if (a < 1.2) return { p: new THREE.Vector3(1.4, 2.05, 4.45), t: new THREE.Vector3(0.14, 0.5, -0.95) };
  return { p: new THREE.Vector3(1.15, 1.72, 3.45), t: new THREE.Vector3(0.18, 0.56, -1.0) };
}
export function poseReading() {
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), a = innerWidth / innerHeight;
  let tx = 0, needW = 2.3, needH = 1.62;
  if (isPortrait()) { tx = readSide === 'left' ? -0.5 : 0.5; needW = 1.1; needH = 1.5; }
  const dist = Math.max(needH / (2 * tanH), needW / (2 * tanH * a)), el = THREE.MathUtils.degToRad(63);
  const t = new THREE.Vector3(tx, 0.12, 0.08);
  return { p: new THREE.Vector3(tx, t.y + Math.sin(el) * dist, t.z + Math.cos(el) * dist), t };
}
export function setPose(pose, dur = 1.6, ease = 'power2.inOut', delay = 0) {
  const to = { px: pose.p.x, py: pose.p.y, pz: pose.p.z, tx: pose.t.x, ty: pose.t.y, tz: pose.t.z };
  gsap.killTweensOf(camState);
  if (!dur) { Object.assign(camState, to); return; }
  gsap.to(camState, { ...to, duration: dur, ease, delay });
}
export function resizeTargets() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); bloom.setSize(innerWidth * PR, innerHeight * PR);
}
export function onResize() {
  resizeTargets();
  if (state === 'reading') setPose(poseReading(), 0.6); else if (state === 'closed' || state === 'away') setPose(poseClosed(), 0.6);
  updateHUD();
}
export function setPixelRatio(p) {
  PR = p; renderer.setPixelRatio(p); composer.setPixelRatio(p); resizeTargets();
  dust.material.uniforms.uPR.value = p;
}

export const perf = { acc: 0, n: 0, last: 0, cool: 0 };
export function watchPerf(now) {
  const ms = now - perf.last; perf.last = now;
  if (ms <= 0 || ms > 120 || document.hidden || state === 'loading') return;
  perf.acc += ms; perf.n++;
  if (perf.n < 90) return;
  const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
  if (perf.cool > 0) { perf.cool--; return; }
  if (avg > 23 && PR > 1) { setPixelRatio(Math.max(1, PR - 0.25)); perf.cool = 2; }
  else if (avg < 14 && PR < PR_MAX) { setPixelRatio(Math.min(PR_MAX, PR + 0.25)); perf.cool = 6; }
}

export const clock = new THREE.Clock(), camPose = new THREE.Vector3();
export function frame(now) {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  watchPerf(now || performance.now());
  const fl = CALM ? 1 : 0.86 + 0.09 * Math.sin(t * 9.3) * Math.sin(t * 5.7 + 1) + 0.06 * (vnoise(t * 7, 3) - 0.5) * 2;
  candleLight.intensity = LIGHT_MAX * fx.light * fl * (1 + flare.v * 0.9);
  flameMat.uniforms.uTime.value = t; flameMat.uniforms.uPower.value = fx.flame;
  const fs = Math.max(0.001, fx.flame) * (0.95 + 0.08 * fl) * (1 + flare.v * 0.55);
  flame.scale.set(fs, fs * (0.96 + 0.1 * (fl - 0.86)), fs);
  flame.lookAt(camera.position);
  glow.material.opacity = 0.4 * fx.flame * fl * (1 + flare.v); halo.material.opacity = 0.07 * fx.flame * fl;
  scene.userData.candleGroup.userData.wax.color.setScalar(0.12 + 0.88 * fx.light * (0.9 + 0.1 * fl));
  fillLight.intensity = 0.55 * fx.light; hemi.intensity = 0.5 * fx.light;
  scene.environmentIntensity = 0.14 * fx.env;
  dust.material.uniforms.uTime.value = t; dust.material.uniforms.uOn.value = fx.dust;
  if (fx.flame > 0.01) {
    const ep = embers.geometry.attributes.position.array;
    emberData.forEach((e, i) => {
      e.life += dt * e.speed * (1 + flare.v * 3); if (e.life > 1) { e.life = 0; e.ox = (Math.random() - 0.5) * 0.02; e.oz = (Math.random() - 0.5) * 0.02; }
      ep[i * 3] = CANDLE.x + e.ox + Math.sin(t * 2 + e.ph) * 0.03 * e.life; ep[i * 3 + 1] = 0.56 + CL + e.life * 0.9; ep[i * 3 + 2] = CANDLE.z + e.oz + Math.cos(t * 1.7 + e.ph) * 0.03 * e.life;
    });
    embers.geometry.attributes.position.needsUpdate = true;
  }
  embers.material.opacity = 0.8 * fx.flame;
  const a = cover.a;
  if (a !== lastCoverA) {
    lastCoverA = a; bumpShadows(2);
    coverGroup.rotation.z = a * Math.PI; coverGroup.position.y = lerp(PY_CLOSED, PY_OPEN, smooth(clamp(a, 0, 1)));
    const sk = Math.max(0.02, 1 - smooth(clamp(a * 1.6, 0, 1))); spine.scale.set(sk, 1, sk); spine.position.y = spine.userData.h * sk; spine.visible = sk > 0.03;
  }
  cullLeaves();
  for (const L of leaves) if (L.dirty && L.group.visible) bendLeaf(L);
  animateDrolleries(t, dt);
  sea.update(t, 1, camPose.set(camState.px, camState.py, camState.pz));
  pointer.sx += (pointer.x - pointer.sx) * 0.05; pointer.sy += (pointer.y - pointer.sy) * 0.05;
  const par = CALM || drag ? 0 : (state === 'reading' ? 0.05 : 0.12);
  camera.position.set(camState.px + pointer.sx * par, camState.py - pointer.sy * par * 0.6, camState.pz);
  if (state !== 'closed' && state !== 'away') look.ty = look.tp = 0;
  look.yaw += (look.ty - look.yaw) * 0.12; look.pitch += (look.tp - look.pitch) * 0.12;
  lookDir.set(camState.tx - camState.px, camState.ty - camState.py, camState.tz - camState.pz);
  if (Math.abs(look.yaw) > 1e-4 || Math.abs(look.pitch) > 1e-4) { lookDir.applyAxisAngle(V_Y, look.yaw); lookDir.applyAxisAngle(lookRight.crossVectors(lookDir, V_Y).normalize(), look.pitch); }
  camera.lookAt(camera.position.x + lookDir.x, camera.position.y + lookDir.y, camera.position.z + lookDir.z);
  if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }
  composer.render();
  requestAnimationFrame(frame);
}

export const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
export function setRay(cx, cy) { ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
export function hitPlane(cx, cy, yp) { setRay(cx, cy); const r = ray.ray; if (Math.abs(r.direction.y) < 1e-4) return null; const k = (yp - r.origin.y) / r.direction.y; return k > 0 ? r.origin.clone().addScaledVector(r.direction, k) : null; }
export function overSeal(cx, cy) { setRay(cx, cy); return ray.intersectObjects(sealHalves, false).length > 0; }
export function linkAt(cx, cy) {
  if (state !== 'reading' || spread !== LAST || busy) return null;
  const p = hitPlane(cx, cy, BASE + 0.03); if (!p || p.x > 0 || p.x < -W || Math.abs(p.z) > H / 2) return null;
  const x = (p.x + W) / W * 1000, y = (p.z + H / 2) / H * UH;
  return LINK_RECTS.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || null;
}
export function openLink(url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }

export function animateLeaf(L, to, dur = 1.15, delay = 0) {
  busy++;
  gsap.killTweensOf(L);
  L.k = 0.85;
  gsap.to(L, { t: to, duration: dur, delay, ease: 'power1.inOut', onStart: () => audio.flip(), onUpdate: () => { L.dirty = true; }, onComplete: () => { busy = Math.max(0, busy - 1); } });
}
function cullLeaves() {
  const moving = leaves.filter((L) => (L.t > 0.001 && L.t < 0.999) || gsap.isTweening(L) || (drag && drag.L === L));
  for (const L of leaves) {
    const show = (L.i >= spread - 3 && L.i <= spread) || moving.some((M) => Math.abs(M.i - L.i) <= 1);
    if (L.group.visible === show) continue;
    L.group.visible = show;
    if (show) { L.dirty = true; bumpShadows(2); } else L.group.children.forEach((m) => m.material.map && m.material.map.dispose());
  }
}
export function warmup() {
  const queue = [], seen = new Set();
  scene.traverseVisible((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap', 'alphaMap', 'emissiveMap']) {
      const t = m[k]; if (t && !seen.has(t.uuid)) { seen.add(t.uuid); queue.push(t); }
    }
  });
  const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 16));
  return new Promise((done) => {
    const step = (dl) => {
      let n = 0;
      while (queue.length && (n++ < 1 || dl.timeRemaining() > 6)) renderer.initTexture(queue.shift());
      if (queue.length) idle(step); else { bumpShadows(2); done(); }
    };
    idle(step);
  });
}
export function flipForward(delay = 0, dur) { if (spread >= LAST) return false; animateLeaf(leaves[spread - 1], 1, dur, delay); spread++; return true; }
export function flipBack(delay = 0, dur) { if (spread <= 1) return false; spread--; animateLeaf(leaves[spread - 1], 0, dur, delay); return true; }
export function next() {
  if (state !== 'reading') return;
  if (isPortrait() && readSide === 'left') { readSide = 'right'; setPose(poseReading(), 0.8); }
  else if (flipForward()) { if (isPortrait()) { readSide = 'left'; setPose(poseReading(), 1.0, 'power2.inOut', 0.35); } }
  afterChange();
}
export function prev() {
  if (state !== 'reading') return;
  if (isPortrait() && readSide === 'right') { readSide = 'left'; setPose(poseReading(), 0.8); }
  else if (flipBack()) { if (isPortrait()) { readSide = 'right'; setPose(poseReading(), 1.0, 'power2.inOut', 0.35); } }
  afterChange();
}
export function goTo(target, side) {
  if (state !== 'reading') return;
  let k = 0;
  while (spread < target) { flipForward(k * 0.16, 0.75); k++; }
  while (spread > target) { flipBack(k * 0.16, 0.75); k++; }
  if (isPortrait() && side) { readSide = side; setPose(poseReading(), 0.9, 'power2.inOut', k ? 0.3 : 0); }
  afterChange();
}
export function afterChange() { if (hintKey === 'read') hideHint(); updateHUD(); }

function tapRoom(e, touch) {
  if (state === 'closed' && overSeal(e.clientX, e.clientY)) { hideTip(); openBook(); return; }
  if (state === 'away' && overBook(e.clientX, e.clientY)) { backToBook(); return; }
  const it = propAt(e.clientX, e.clientY); if (it) { poke(it); if (touch) showTip(it, e.clientX, e.clientY, 2200); }
}
export function onDown(e) {
  pointer.down = { x: e.clientX, y: e.clientY };
  const touch = e.pointerType !== 'mouse';
  if ((state === 'closed' || state === 'away') && canLook()) {
    lookDrag = { x: e.clientX, y: e.clientY, yaw: look.ty, pitch: look.tp, moved: false, touch };
    $('#gl').setPointerCapture(e.pointerId); return;
  }
  if (state === 'closed') {
    if (overSeal(e.clientX, e.clientY)) { hideTip(); openBook(); return; }
    const it = propAt(e.clientX, e.clientY); if (it) { poke(it); if (touch) showTip(it, e.clientX, e.clientY, 2200); }
    return;
  }
  if (state === 'away') {
    if (overBook(e.clientX, e.clientY)) { backToBook(); return; }
    const it = propAt(e.clientX, e.clientY); if (it) { poke(it); if (touch) showTip(it, e.clientX, e.clientY, 2200); }
    return;
  }
  if (state !== 'reading' || busy) return;
  const link = linkAt(e.clientX, e.clientY);
  if (link) { pointer.link = link; return; }
  const p = hitPlane(e.clientX, e.clientY, BASE + 0.03);
  if (!p || Math.abs(p.z) > H / 2 || Math.abs(p.x) > W) {
    const it = propAt(e.clientX, e.clientY); if (it) { poke(it); if (touch) showTip(it, e.clientX, e.clientY, 2200); }
    return;
  }
  const kz = clamp(p.z / (H / 2), -1, 1) * 1.1;
  if (p.x > 0 && p.x < W && spread < LAST) drag = { L: leaves[spread - 1], dir: 1, x0: p.x, moved: false, kz };
  else if (p.x < 0 && p.x > -W && spread > 1) drag = { L: leaves[spread - 2], dir: -1, x0: p.x, moved: false, kz };
  if (drag) { $('#gl').setPointerCapture(e.pointerId); gsap.killTweensOf(drag.L); document.body.style.cursor = 'grabbing'; }
}
export function onMove(e) {
  if (lookDrag) {
    const dx = e.clientX - lookDrag.x, dy = e.clientY - lookDrag.y;
    if (!lookDrag.moved && Math.hypot(dx, dy) > 8) { lookDrag.moved = true; hideTip(); }
    if (lookDrag.moved) { look.ty = clamp(lookDrag.yaw + dx * 0.0035, -0.5, 0.5); look.tp = clamp(lookDrag.pitch + dy * 0.003, -0.15, 0.45); }
    return;
  }
  pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1;
  if (drag) {
    if (!drag.moved && Math.hypot(e.clientX - pointer.down.x, e.clientY - pointer.down.y) > 8) { drag.moved = true; drag.L.k = clamp(drag.kz, -1, 1); audio.flip(); }
    if (!drag.moved) return;
    const p = hitPlane(e.clientX, e.clientY, BASE + 0.03); if (!p) return;
    drag.L.t = drag.dir > 0 ? clamp((drag.x0 - p.x) / (drag.x0 + W), 0, 1) : 1 - clamp((p.x - drag.x0) / (W - drag.x0), 0, 1);
    drag.L.dirty = true; return;
  }
  if (e.target !== $('#gl')) { document.body.style.cursor = ''; hideTip(); return; }
  let cur = '';
  const sealHover = state === 'closed' && overSeal(e.clientX, e.clientY);
  if (sealHover || (state === 'away' && overBook(e.clientX, e.clientY))) cur = 'pointer';
  else if (state === 'reading') {
    if (linkAt(e.clientX, e.clientY)) cur = 'pointer';
    else { const p = hitPlane(e.clientX, e.clientY, BASE + 0.03); if (p && Math.abs(p.z) < H / 2 && Math.abs(p.x) < W && ((p.x > 0 && spread < LAST) || (p.x < 0 && spread > 1))) cur = 'grab'; }
  }
  if (!cur) {
    const it = propAt(e.clientX, e.clientY);
    if (it) { cur = 'pointer'; if (e.pointerType === 'mouse') showTip(it, e.clientX, e.clientY); } else hideTip();
  } else hideTip();
  document.body.style.cursor = cur;
  if (state === 'closed') for (const h of sealHalves) h.material[1].emissive?.setRGB(sealHover ? 0.25 : 0, sealHover ? 0.03 : 0, 0);
}
export function onUp(e) {
  if (lookDrag) { const d = lookDrag; lookDrag = null; if (!d.moved && (state === 'closed' || state === 'away')) tapRoom(e, d.touch); return; }
  if (pointer.link) {
    const l = pointer.link; pointer.link = null;
    if (pointer.down && Math.hypot(e.clientX - pointer.down.x, e.clientY - pointer.down.y) < 10) openLink(l.url);
    return;
  }
  if (!drag) return;
  const d = drag; drag = null; document.body.style.cursor = '';
  if (!d.moved) { d.dir > 0 ? next() : prev(); return; }
  if (d.dir > 0) {
    if (d.L.t > 0.3) { spread++; restLeaf(d.L, 1); if (isPortrait()) { readSide = 'left'; setPose(poseReading(), 1, 'power2.inOut', 0.2); } } else restLeaf(d.L, 0);
  } else {
    if (d.L.t < 0.7) { spread--; restLeaf(d.L, 0); if (isPortrait()) { readSide = 'right'; setPose(poseReading(), 1, 'power2.inOut', 0.2); } } else restLeaf(d.L, 1);
  }
  afterChange();
}
export function restLeaf(L, to) {
  busy++; gsap.to(L, { t: to, duration: 0.55, ease: 'power2.out', onUpdate: () => { L.dirty = true; }, onComplete: () => { busy = Math.max(0, busy - 1); } });
}

export function ignite() {
  state = 'igniting';
  $('#ignite').classList.add('lit'); $('#intro-name').classList.add('burn');
  setTimeout(() => $('#intro').classList.add('gone'), 1100);
  audio.start(); audio.ignite();
  setTimeout(() => audio.music(), 2600);
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  tl.to(fx, { flame: 1.25, duration: 0.35 }, 0.15)
    .to(fx, { flame: 1, duration: 0.6, ease: 'sine.inOut' }, 0.5)
    .to(fx, { light: 1, duration: 1.4 }, 0.2)
    .to(fx, { env: 1, duration: 2.4 }, 0.6)
    .to(fx, { dust: 1, duration: 3 }, 1.2);
  setPose(poseClosed(), 3.8, 'power2.inOut', 1.3);
  gsap.delayedCall(4.7, () => { state = 'closed'; $('#sound').classList.remove('off'); showHint('seal'); });
}
export function openBook() {
  if (state !== 'closed') return;
  state = 'opening'; hideHint(); document.body.style.cursor = '';
  audio.crack();
  const [h1, h2] = sealHalves, dur = 1, bump = () => bumpShadows(2);
  gsap.to(h1.position, { x: -0.16, y: 0.12, duration: dur * 0.5, ease: 'power2.out', onUpdate: bump });
  gsap.to(h1.position, { y: -0.05, duration: dur * 0.5, delay: dur * 0.5, ease: 'power2.in', onUpdate: bump });
  gsap.to(h1.rotation, { z: 1.2, x: -0.6, duration: dur });
  gsap.to(h2.position, { x: 0.18, y: 0.1, z: 0.05, duration: dur * 0.5, ease: 'power2.out' });
  gsap.to(h2.position, { y: -0.05, duration: dur * 0.5, delay: dur * 0.5, ease: 'power2.in' });
  gsap.to(h2.rotation, { z: -1.1, x: 0.5, duration: dur });
  const fade = [...h1.material, ...h2.material, ribbonMat];
  gsap.to(fade, { opacity: 0, duration: dur * 0.5, delay: dur * 0.55, onComplete: () => { sealGroup.visible = false; scene.userData.ribbon.forEach((r) => (r.visible = false)); bumpShadows(2); } });
  readSide = isPortrait() ? 'left' : 'right';
  gsap.to(cover, { a: 1, duration: 2.0, delay: 0.55, ease: 'power2.inOut', onStart: () => audio.flip(), onComplete: () => audio.thud() });
  setPose(poseReading(), 2.6, 'power2.inOut', 0.4);
  gsap.delayedCall(2.8, () => {
    state = 'reading'; spread = 1;
    show('#pager'); show('#ribbons'); updateHUD(); showHint('read'); renderLook();
    $('#gl').focus({ preventScroll: true });
  });
}

export function lookUp() {
  if (state !== 'reading' || busy || drag) return;
  state = 'away'; hide('#pager'); hide('#ribbons'); hideTip();
  setPose(poseClosed(), 1.8, 'power2.inOut'); showHint('away'); renderLook();
}
export function backToBook() {
  if (state !== 'away') return;
  state = 'returning'; hideHint(); hideTip(); renderLook();
  setPose(poseReading(), 1.6, 'power2.inOut');
  gsap.delayedCall(1.6, () => { state = 'reading'; show('#pager'); show('#ribbons'); updateHUD(); renderLook(); $('#gl').focus({ preventScroll: true }); });
}
export function overBook(cx, cy) { const p = hitPlane(cx, cy, BASE + 0.03); return !!p && Math.abs(p.x) < WC && Math.abs(p.z) < HC / 2; }

export function buildLooseLeaves() {
  for (const L of LEAVES) {
    if (!L.map) continue;
    const w = L.w, h = w * L.map.image.height / L.map.image.width;
    const geo = new THREE.PlaneGeometry(w, h, 20, 28); geo.rotateX(-Math.PI / 2);
    const pa = geo.attributes.position;
    for (let k = 0; k < pa.count; k++) {
      const u = pa.getX(k) / (w / 2), v = pa.getZ(k) / (h / 2);
      pa.setY(k, 0.018 * Math.pow(Math.abs(u), 3) + 0.01 * Math.pow(Math.abs(v), 4) + 0.002 * (1 + Math.sin(u * 3 + v * 2)));
    }
    geo.computeVertexNormals();
    L.map.anisotropy = ANISO;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: L.map, alphaMap: L.alpha, alphaTest: 0.5, roughness: 0.88, side: THREE.DoubleSide }));
    m.position.set(...L.pos); m.rotation.y = L.rot; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    const ac = mk(128, 128), ax = ac.getContext('2d'); ax.drawImage(L.alpha.image, 0, 0, 128, 128);
    m.userData.alphaPix = { w: 128, h: 128, d: ax.getImageData(0, 0, 128, 128).data }; m.updateMatrixWorld(true); SUPPORTS.push(m);
    interactive(L.name, [m], () => ACTIONS.leaf(m));
  }
}
export function loadModels() {
  const loader = gltfLoader(), jobs = [];
  let wallDone = null;
  const loadRoom = () => {
    if (wallDone) return wallDone;
    wallDone = Promise.all([sea.loadOutside(), ...WALL.map((P) => loader.loadAsync(`assets/models/${P.dir}/model.glb`).then((gltf) => {
      const root = gltf.scene, g = new THREE.Group(), inner = new THREE.Group(); inner.add(root); g.add(inner);
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = ANISO; } });
      let b = new THREE.Box3().setFromObject(root, true); const sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      root.position.sub(c); inner.scale.setScalar(P.size / Math.max(sz.x, sz.y, sz.z));
      g.rotation.set(...P.rot); scene.add(g); g.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(g, true);
      g.position.set(P.pos[0], P.pos[1], WIN.z + 0.004 - b.min.z); freeze(g); bumpShadows(3);
      if (P.key) interactive(P.key, [g], () => ACTIONS.wall(g));
    }).catch(() => {}))]).then(() => renderer.compileAsync(scene, camera)).then(warmup).catch(() => {});
    return wallDone;
  };
  for (const P of PROPS) {
    jobs.push(loader.loadAsync(`assets/models/${P.dir}/model.glb`).then((gltf) => {
      const root = gltf.scene;
      if (P.keep) { const keep = root.getObjectByName(P.keep); root.children.slice().forEach((c) => { if (c !== keep) root.remove(c); }); if (keep) keep.position.set(0, keep.position.y, 0); }
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = ANISO; if (P.tame) { o.material.metalness *= P.tame; o.material.envMapIntensity = P.tame; } } });
      const g = new THREE.Group(); g.add(root);
      root.rotation.set(...P.rot.map((d) => THREE.MathUtils.degToRad(d)));
      g.scale.setScalar(P.scale);
      g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g, true);
      g.position.set(P.pos[0], P.pos[1] - box.min.y, P.pos[2]);
      scene.add(g); freezeKids(g); settle(g);
      const key = { ornate_medieval_dagger: 'dagger', brass_goblets: 'goblet', food_apple_01: 'apple', treasure_chest: 'chest', met_penbox: 'penbox' }[P.id];
      if (key === 'chest') {
        const lid = root.getObjectByName('treasure_chest_lid');
        if (lid) { lid.matrixAutoUpdate = true; lid.userData.x0 = lid.rotation.x; g.userData.lid = lid; }
        const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()); chestGlow.position.set(c.x, box.max.y * 0.85, c.z);
      }
      if (key) interactive(key, [g], () => ACTIONS[key](g));
    }).catch(() => {}));
  }
  const main = Promise.all(jobs);
  if (isPortrait()) main.then(loadRoom); else loadRoom();
  return main;
}
