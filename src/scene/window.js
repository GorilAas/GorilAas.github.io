import * as THREE from 'three';
import { ASSETS } from '../core/assets.js';
import { mk } from '../book/canvas.js';

export const WIN = { x: 0.62, z: -2.45, depth: 0.42, sill: 0.34, w: 0.9, spring: 1.02 };
const SEA_Y = -1.6;
const MOON = new THREE.Vector3(-0.41, -0.15, -5.9).normalize();

const SKY_GLSL = `
uniform vec3 uMoon; uniform float uTime;
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash3(vec3(i, 1.0)), b = hash3(vec3(i + vec2(1.0, 0.0), 1.0)), c = hash3(vec3(i + vec2(0.0, 1.0), 1.0)), d = hash3(vec3(i + vec2(1.0), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise2(p); p *= 2.03; a *= 0.5; } return s; }
vec3 skyCol(vec3 d){
  float y = d.y;
  vec3 hz = vec3(0.040, 0.060, 0.085), mid = vec3(0.016, 0.026, 0.050), zen = vec3(0.004, 0.007, 0.016);
  vec3 c = mix(hz, mid, smoothstep(0.0, 0.18, y)); c = mix(c, zen, smoothstep(0.18, 0.75, y));
  float m = clamp(dot(d, uMoon), 0.0, 1.0);
  c += vec3(0.30, 0.34, 0.42) * pow(m, 400.0) * 0.22 + vec3(0.10, 0.12, 0.16) * pow(m, 30.0) * 0.12;
  vec2 cp = d.xz / max(y + 0.12, 0.05) * 1.4 + vec2(uTime * 0.012, 0.0);
  float cl = smoothstep(0.45, 0.85, fbm(cp)) * smoothstep(-0.02, 0.12, y) * (1.0 - smoothstep(0.5, 0.9, y));
  c = mix(c, vec3(0.05, 0.06, 0.08) + vec3(0.22, 0.24, 0.28) * pow(m, 18.0), cl * 0.75);
  return c;
}`;

function skyMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SKY_GLSL}
varying vec3 vW;
void main(){
  vec3 d = normalize(vW - cameraPosition);
  vec3 c = skyCol(d);
  float m = dot(d, uMoon);
  float disc = smoothstep(0.99986, 0.99991, m);
  vec2 mp = vec2(dot(d, normalize(cross(uMoon, vec3(0.0, 1.0, 0.0)))), d.y - uMoon.y) * 1700.0;
  float mare = 0.82 + 0.18 * vnoise2(mp * 0.25) - 0.12 * smoothstep(0.55, 0.75, vnoise2(mp * 0.11 + 3.0));
  c = mix(c, vec3(1.25, 1.2, 1.08) * mare, disc);
  vec3 sp = d * 260.0; vec3 cell = floor(sp); float h = hash3(cell);
  float star = step(0.993, h) * smoothstep(0.42, 0.0, length(fract(sp) - 0.5)) * smoothstep(0.02, 0.2, d.y);
  star *= 0.6 + 0.4 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
  c += vec3(0.75, 0.78, 0.9) * star * (1.0 - disc) * 0.9;
  gl_FragColor = vec4(clamp(c, 0.0, 8.0), 1.0);
}`
  });
}

function seaMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    uniforms, fog: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${SKY_GLSL}
varying vec3 vW;
void main(){
  vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
  vec2 p = vW.xz; float fade = 1.0 - smoothstep(8.0, 40.0, dist);
  vec2 g = vec2(0.0);
  vec2 dirs[6]; dirs[0] = normalize(vec2(0.2, 1.0)); dirs[1] = normalize(vec2(-0.6, 1.0)); dirs[2] = normalize(vec2(1.0, 0.4)); dirs[3] = normalize(vec2(-1.0, 0.25)); dirs[4] = normalize(vec2(0.5, -1.0)); dirs[5] = normalize(vec2(0.9, 0.9));
  float fr[6]; fr[0] = 0.9; fr[1] = 1.5; fr[2] = 2.6; fr[3] = 4.1; fr[4] = 6.3; fr[5] = 9.7;
  for (int i = 0; i < 6; i++) { float f = fr[i], a = 0.06 / f * (i > 2 ? fade : 1.0); g += dirs[i] * f * a * cos(dot(dirs[i], p) * f + uTime * sqrt(f) * 1.1 + float(i) * 1.7); }
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 r = reflect(-v, n); r.y = abs(r.y);
  float fres = 0.02 + 0.98 * pow(clamp(1.0 - dot(n, v), 0.0, 1.0), 5.0);
  vec3 deep = vec3(0.004, 0.009, 0.016);
  vec3 c = mix(deep, skyCol(r), fres);
  float sm = clamp(dot(normalize(r), uMoon), 0.0, 1.0);
  c += vec3(1.0, 0.97, 0.88) * pow(sm, 2400.0) * 1.1 + vec3(0.30, 0.32, 0.36) * pow(sm, 260.0) * 0.12;
  vec3 hz = skyCol(normalize(vec3(-v.x, 0.0, -v.z) + vec3(0.0, 1e-4, 0.0)));
  c = mix(c, hz, smoothstep(14.0, 44.0, dist));
  gl_FragColor = vec4(clamp(c, 0.0, 8.0), 1.0);
}`
  });
}

function silhouette(w, h, draw) {
  const c = mk(w, h), x = c.getContext('2d'); x.fillStyle = '#fff'; draw(x); const t = new THREE.CanvasTexture(c); return t;
}

function headland() {
  const tex = silhouette(1024, 256, (x) => {
    x.beginPath(); x.moveTo(0, 256); x.lineTo(0, 120);
    x.bezierCurveTo(90, 96, 160, 70, 250, 78); x.bezierCurveTo(320, 84, 360, 104, 420, 120);
    x.bezierCurveTo(500, 140, 560, 180, 640, 214); x.bezierCurveTo(700, 238, 780, 248, 1024, 252); x.lineTo(1024, 256); x.closePath(); x.fill();
    x.fillRect(196, 40, 22, 42); x.beginPath(); x.moveTo(192, 42); x.lineTo(207, 22); x.lineTo(222, 42); x.fill();
    x.fillRect(226, 60, 34, 22); for (let i = 0; i < 4; i++) x.fillRect(226 + i * 9, 54, 5, 7);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4), new THREE.MeshBasicMaterial({ color: 0x080d16, alphaMap: tex, transparent: true, depthWrite: false, fog: false }));
  m.position.set(-2.8, SEA_Y + 1.2 - 0.04, -40); return m;
}

function ship() {
  const tex = silhouette(256, 256, (x) => {
    x.beginPath(); x.moveTo(30, 186); x.quadraticCurveTo(128, 214, 226, 186); x.lineTo(236, 160); x.lineTo(206, 166); x.lineTo(50, 166); x.lineTo(18, 158); x.closePath(); x.fill();
    x.fillRect(196, 146, 34, 20); x.fillRect(26, 140, 30, 26);
    x.fillRect(124, 40, 5, 128);
    x.beginPath(); x.moveTo(84, 58); x.quadraticCurveTo(128, 50, 172, 58); x.quadraticCurveTo(180, 100, 168, 140); x.quadraticCurveTo(128, 132, 88, 140); x.quadraticCurveTo(76, 100, 84, 58); x.fill();
    x.fillRect(116, 30, 20, 12);
    x.lineWidth = 2; x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(126, 42); x.lineTo(20, 156); x.moveTo(128, 42); x.lineTo(232, 150); x.stroke();
  });
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: 0x060a12, alphaMap: tex, transparent: true, depthWrite: false, fog: false }));
  hull.position.y = 0.36; g.add(hull);
  const lc = mk(64, 64), lx = lc.getContext('2d'), gr = lx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(0.25, 'rgba(255,170,80,.5)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); lx.fillStyle = gr; lx.fillRect(0, 0, 64, 64);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  lamp.scale.setScalar(0.09); lamp.position.set(0.42, 0.3, 0.01); g.add(lamp);
  g.position.set(-1.5, SEA_Y, -30); return g;
}

function archShape(w, spring, sill) {
  const s = new THREE.Path(), hw = w / 2, R = w, th = Math.atan2(Math.sqrt(R * R - hw * hw), hw), cx = WIN.x;
  s.moveTo(cx - hw, sill); s.lineTo(cx + hw, sill);
  s.absarc(cx - hw, spring, R, 0, th * 0.999, false);
  s.absarc(cx + hw, spring, R, Math.PI - th, Math.PI, false);
  return s;
}

function cleanNormals(geo) {
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) if (!Number.isFinite(n.getX(i) + n.getY(i) + n.getZ(i)) || n.getX(i) ** 2 + n.getY(i) ** 2 + n.getZ(i) ** 2 < 0.5) n.setXYZ(i, 0, 0, 1);
}

function texSet(set, rx, ry) {
  if (!set) return null;
  const { diff, nor, rough } = set;
  const out = [diff, nor, rough].map((t) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; });
  out[0].colorSpace = THREE.SRGBColorSpace; return out;
}

function shutter(side, mat, iron) {
  const hw = WIN.w / 2, R = WIN.w, rise = Math.sqrt(R * R - hw * hw), s = new THREE.Shape();
  if (side < 0) {
    s.moveTo(0, 0); s.lineTo(hw, 0);
    s.absarc(hw * 2, WIN.spring - WIN.sill, R, Math.PI - Math.atan2(rise, hw), Math.PI, false);
  } else {
    s.moveTo(0, 0); s.lineTo(-hw, 0);
    s.absarc(-hw * 2, WIN.spring - WIN.sill, R, Math.atan2(rise, hw), 0, true);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: false }); cleanNormals(geo);
  const pa = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pa.count; i++) uv.setXY(i, pa.getX(i) * 1.4 + 0.3, pa.getY(i) * 0.9);
  const g = new THREE.Group(), m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  for (const y of [0.16, 0.62]) { const b = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.92, 0.035, 0.012), iron); b.position.set(side * -hw * 0.46, y, 0.04); g.add(b); }
  g.position.set(WIN.x + side * hw, WIN.sill + 0.002, WIN.z + 0.004);
  g.rotation.y = side * 1.95;
  return g;
}

export function buildWindow(scene) {
  const uniforms = { uMoon: { value: MOON.clone() }, uTime: { value: 0 } };
  const room = new THREE.Group(); scene.add(room);

  const hole = archShape(WIN.w, WIN.spring, WIN.sill);
  const shape = new THREE.Shape(); shape.moveTo(-7, -0.05); shape.lineTo(7, -0.05); shape.lineTo(7, 5); shape.lineTo(-7, 5); shape.holes.push(hole);
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: WIN.depth, bevelEnabled: false, curveSegments: 28 }); cleanNormals(wallGeo);
  const st = texSet(ASSETS.stone, 0.42, 0.42);
  const wallMat = st ? new THREE.MeshStandardMaterial({ map: st[0], normalMap: st[1], roughnessMap: st[2], roughness: 1, color: 0x9a8f84 }) : new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.95 });
  const wall = new THREE.Mesh(wallGeo, wallMat); wall.position.z = WIN.z - WIN.depth; wall.receiveShadow = true; room.add(wall);

  const sillMat = st ? new THREE.MeshStandardMaterial({ map: st[0], normalMap: st[1], roughnessMap: st[2], roughness: 1, color: 0xb0a497 }) : wallMat;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(WIN.w + 0.16, 0.06, WIN.depth + 0.1), sillMat);
  sill.position.set(WIN.x, WIN.sill - 0.03, WIN.z - WIN.depth / 2 + 0.05); sill.receiveShadow = true; sill.castShadow = true; room.add(sill);

  const pk = texSet(ASSETS.plank, 1, 1);
  const wood = pk ? new THREE.MeshStandardMaterial({ map: pk[0], normalMap: pk[1], roughnessMap: pk[2], roughness: 1, color: 0x8a6a4c }) : new THREE.MeshStandardMaterial({ color: 0x3b2716, roughness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.55, metalness: 0.7 });
  room.add(shutter(-1, wood, iron), shutter(1, wood, iron));

  const out = new THREE.Group(); scene.add(out);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(22, 48, 24), skyMaterial(uniforms)); sky.position.set(WIN.x, 0, -26); sky.renderOrder = 10; out.add(sky);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(70, 46, 1, 1), seaMaterial(uniforms)); sea.rotation.x = -Math.PI / 2; sea.position.set(WIN.x, SEA_Y, -3 - 23); sea.renderOrder = 9; out.add(sea);
  out.add(headland());
  const boat = ship(); out.add(boat);

  const moonLight = new THREE.SpotLight(0x8fa6d6, 0, 6, 0.5, 1, 1.2);
  moonLight.position.set(WIN.x - 0.35, WIN.spring + 0.5, WIN.z - 1.2); moonLight.target.position.set(WIN.x + 0.25, 0, WIN.z + 1.3);
  scene.add(moonLight, moonLight.target);

  const moonAt = new THREE.Vector3();
  return {
    update(t, on, cam) {
      uniforms.uTime.value = t;
      if (cam) {
        const D = cam.z - WIN.z, yh = cam.y - D * (cam.y - SEA_Y) / (cam.z + 49), apex = WIN.spring + WIN.w * 0.866 - 0.14;
        moonAt.set(WIN.x + 0.07, yh + 0.48 * Math.max(0.1, apex - yh), WIN.z).sub(cam).normalize();
        uniforms.uMoon.value.copy(moonAt);
      }
      boat.position.x = -4.6 + ((t * 0.025) % 5.4);
      boat.rotation.z = Math.sin(t * 0.8) * 0.035; boat.position.y = SEA_Y + Math.sin(t * 0.6) * 0.02;
      moonLight.intensity = 1.6 * on;
    }
  };
}
