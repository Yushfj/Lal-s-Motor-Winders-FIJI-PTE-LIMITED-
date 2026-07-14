/**
 * Beyond Dala — electrical constellation engine
 * Bloom glow · depth layers · morph arcs · current pulse · magnetic mouse
 *
 * Scroll morphs:
 *   0 Hero     → motor stator (copper windings)
 *   1 Services → generator body
 *   2 Telecom  → lightning bolt
 *   3 About    → transformer
 *   4 CTA      → spark burst
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const COLORS = [
  new THREE.Color('#8052ff'),
  new THREE.Color('#ffb829'),
  new THREE.Color('#15846e'),
  new THREE.Color('#c77dff'),
  new THREE.Color('#4cc9f0'),
  new THREE.Color('#ff6b9d'),
  new THREE.Color('#7b68ee'),
  new THREE.Color('#e040fb'),
  new THREE.Color('#a78bfa'),
  new THREE.Color('#fbbf24'),
  new THREE.Color('#67e8f9'),
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNT = window.innerWidth < 768 ? 2800 : 6200;
const AMBIENT = window.innerWidth < 768 ? 200 : 480;
const LARGE = window.innerWidth < 768 ? 18 : 36;

/* Noise */
const perm = new Uint8Array(512);
(() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function noise3D(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(
    lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
         lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
         lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
    w
  );
}
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* —— Sharper electrical shapes —— */
function sampleStator(i, n) {
  const rings = 12;
  const ring = i % rings;
  const along = Math.floor(i / rings) / Math.max(1, Math.ceil(n / rings));
  const angle = along * Math.PI * 2;
  const teeth = 48;

  if (ring < 9) {
    const rBase = 1.2 + ring * 0.2;
    const toothPhase = (angle * teeth) % (Math.PI * 2);
    const inTooth = Math.cos(toothPhase) > 0.15;
    const slotDepth = inTooth ? 0 : 0.42;
    const rr = rBase - slotDepth;
    // Copper fill denser in slots
    const copperLayer = !inTooth && ring >= 3 && ring <= 7;
    const z = copperLayer
      ? ((i % 5) - 2) * 0.18
      : (ring / rings - 0.5) * 1.2 + Math.sin(angle * 3) * 0.06;
    return new THREE.Vector3(Math.cos(angle) * rr, Math.sin(angle) * rr, z).multiplyScalar(1.85);
  }
  // Rotor bars
  const r = 0.25 + (ring - 9) * 0.16;
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r,
    Math.sin(angle * 8) * 0.2
  ).multiplyScalar(1.85);
}

function sampleMotorBody(i, n) {
  const u = i / n;
  const t = (i * 0.6180339887) % 1;
  const a = t * Math.PI * 2;

  if (u < 0.5) {
    const h = (u / 0.5 - 0.5) * 4.0;
    const fin = Math.sin(a * 16) > 0.4 ? 0.18 : 0;
    const r = 1.5 + fin;
    return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r).multiplyScalar(1.4);
  }
  if (u < 0.68) {
    const h = (u - 0.5) / 0.18;
    const r = 1.5 * (1 - h * 0.5);
    return new THREE.Vector3(Math.cos(a) * r, 2.05 + h * 0.55, Math.sin(a) * r).multiplyScalar(1.4);
  }
  if (u < 0.82) {
    const h = (u - 0.68) / 0.14;
    const r = 1.5 * (1 - h * 0.45);
    return new THREE.Vector3(Math.cos(a) * r, -2.05 - h * 0.5, Math.sin(a) * r).multiplyScalar(1.4);
  }
  // Terminal box
  if (u < 0.9) {
    const bx = ((i % 20) / 20 - 0.5) * 1.2;
    const by = ((Math.floor(i / 20) % 8) / 8) * 0.7 + 0.3;
    return new THREE.Vector3(bx, by, 1.55).multiplyScalar(1.4);
  }
  // Shaft
  const h = (u - 0.9) / 0.1;
  return new THREE.Vector3(Math.cos(a) * 0.2, 2.6 + h * 1.6, Math.sin(a) * 0.2).multiplyScalar(1.4);
}

function sampleLightning(i, n) {
  const u = i / n;
  const segs = [[0, 3.0], [0.55, 1.8], [-0.5, 0.7], [0.7, -0.4], [-0.4, -1.4], [0.2, -2.8]];
  const segF = u * (segs.length - 1);
  const si = Math.min(Math.floor(segF), segs.length - 2);
  const f = segF - si;
  let x = lerp(segs[si][0], segs[si + 1][0], f);
  let y = lerp(segs[si][1], segs[si + 1][1], f);

  const branch = i % 5 === 0;
  const side = i % 2 ? 1 : -1;
  if (branch) {
    const bf = (i % 10) / 10;
    x += side * (0.3 + bf * 1.1);
    y += (Math.random() - 0.5) * 0.3;
  }
  const thick = Math.max(0, 0.4 - Math.abs(u - 0.45) * 0.5);
  x += side * ((i * 17) % 7) * 0.03 * thick;
  const z = Math.sin(u * 22 + i) * (0.25 + (branch ? 0.4 : 0));
  return new THREE.Vector3(x * 2.0, y * 1.3, z);
}

function sampleTransformer(i, n) {
  const u = i / n;
  const t = (i * 0.6180339887) % 1;
  const a = t * Math.PI * 2;

  if (u < 0.36) {
    const h = (t - 0.5) * 3.4;
    const layer = Math.floor((u / 0.36) * 8);
    const r = 0.55 + layer * 0.12;
    // Helical winding
    const helix = h * 2.5;
    return new THREE.Vector3(
      -1.4 + Math.cos(a + helix) * r * 0.4,
      h,
      Math.sin(a + helix) * r
    ).multiplyScalar(1.45);
  }
  if (u < 0.72) {
    const h = (t - 0.5) * 3.4;
    const layer = Math.floor(((u - 0.36) / 0.36) * 8);
    const r = 0.55 + layer * 0.12;
    const helix = h * 2.5;
    return new THREE.Vector3(
      1.4 + Math.cos(a + helix) * r * 0.4,
      h,
      Math.sin(a + helix) * r
    ).multiplyScalar(1.45);
  }
  // Core frame
  const h = (t - 0.5) * 3.6;
  const part = i % 5;
  if (part < 2) return new THREE.Vector3((t - 0.5) * 0.55, h, (part - 0.5) * 0.2).multiplyScalar(1.45);
  if (part < 4) return new THREE.Vector3((t - 0.5) * 3.0, part === 2 ? 1.8 : -1.8, 0).multiplyScalar(1.45);
  return new THREE.Vector3((t - 0.5) * 3.4, h * 0.3, 0.35).multiplyScalar(1.45);
}

function sampleSparkBurst(i, n) {
  const t = (i * 0.6180339887) % 1;
  const theta = t * Math.PI * 2 * 23;
  const phi = Math.acos(2 * ((i * 0.381966) % 1) - 1);
  const ray = i % 7 === 0;
  const r = ray ? 1.8 + (i % 12) * 0.4 : 0.5 + (i % 10) * 0.2;
  const jag = Math.sin(phi * 16 + theta * 3) * (ray ? 0.5 : 0.1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * (r + jag),
    Math.sin(phi) * Math.sin(theta) * (r + jag) * 0.9,
    Math.cos(phi) * r * 0.7
  ).multiplyScalar(1.6);
}

const SHAPES = [sampleStator, sampleMotorBody, sampleLightning, sampleTransformer, sampleSparkBurst];
const CLUSTER_X = [2.5, -2.3, -2.5, 2.4, 0];
const CLUSTER_Y = [0.1, 0.05, 0.2, 0, 0.25];
const CLUSTER_SCALE = [1.08, 1.0, 1.2, 1.05, 1.3];

function triGeo(size = 0.026) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, size * 1.25, 0, size, -size * 0.7, 0, -size, -size * 0.7, 0,
  ]), 3));
  return g;
}

function init() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 11.5);

  // Bloom — beyond Dala glow
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 0.85);
  if (!reducedMotion) composer.addPass(bloom);

  const root = new THREE.Group();
  scene.add(root);
  const cluster = new THREE.Group();
  root.add(cluster);
  const ambientG = new THREE.Group();
  root.add(ambientG);
  const largeG = new THREE.Group();
  root.add(largeG);

  const geo = triGeo(0.024);
  const largeGeo = triGeo(0.14);
  const matC = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const matA = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.18,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const matL = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.12,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geo, matC, COUNT);
  const ambMesh = new THREE.InstancedMesh(geo, matA, AMBIENT);
  const largeMesh = new THREE.InstancedMesh(largeGeo, matL, LARGE);
  cluster.add(mesh);
  ambientG.add(ambMesh);
  largeG.add(largeMesh);

  const shapePos = SHAPES.map((fn) => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const p = fn(i, COUNT);
      arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
    }
    return arr;
  });

  const dummy = new THREE.Object3D();
  const data = [];
  for (let i = 0; i < COUNT; i++) {
    const color = COLORS[i % COLORS.length];
    mesh.setColorAt(i, color);
    const sc = 0.45 + Math.random() * 1.2;
    const depth = Math.random(); // 0 near, 1 far — DOF feel
    data.push({
      phase: Math.random() * 100,
      speed: 0.05 + Math.random() * 0.14,
      rotSpeed: (Math.random() - 0.5) * 0.6,
      scale: sc,
      depth,
      color,
      x: shapePos[0][i * 3],
      y: shapePos[0][i * 3 + 1],
      z: shapePos[0][i * 3 + 2],
      vx: 0, vy: 0, vz: 0,
    });
    dummy.position.set(data[i].x, data[i].y, data[i].z);
    dummy.scale.setScalar(sc * (0.6 + depth * 0.8));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const ambData = [];
  for (let i = 0; i < AMBIENT; i++) {
    const x = (Math.random() - 0.35) * 20;
    const y = (Math.random() - 0.5) * 14;
    const z = (Math.random() - 0.5) * 10 - 2;
    ambMesh.setColorAt(i, COLORS[Math.floor(Math.random() * COLORS.length)]);
    const sc = 0.28 + Math.random() * 0.5;
    ambData.push({
      base: new THREE.Vector3(x, y, z),
      phase: Math.random() * 100,
      speed: 0.025 + Math.random() * 0.06,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      scale: sc,
    });
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    ambMesh.setMatrixAt(i, dummy.matrix);
  }
  ambMesh.instanceMatrix.needsUpdate = true;

  const largeData = [];
  for (let i = 0; i < LARGE; i++) {
    const x = (Math.random() - 0.4) * 14;
    const y = (Math.random() - 0.5) * 10;
    const z = -3 - Math.random() * 5;
    largeMesh.setColorAt(i, COLORS[Math.floor(Math.random() * COLORS.length)]);
    const sc = 0.8 + Math.random() * 1.8;
    largeData.push({
      base: new THREE.Vector3(x, y, z),
      phase: Math.random() * 100,
      speed: 0.015 + Math.random() * 0.03,
      scale: sc,
    });
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    largeMesh.setMatrixAt(i, dummy.matrix);
  }
  largeMesh.instanceMatrix.needsUpdate = true;
  if (largeMesh.instanceColor) largeMesh.instanceColor.needsUpdate = true;

  // Morph state
  let morphFrom = 0, morphTo = 0, morphT = 1, targetMorphT = 1;
  let clusterTX = CLUSTER_X[0], clusterTY = CLUSTER_Y[0], clusterTS = CLUSTER_SCALE[0];
  let energize = 0; // flash on shape change
  let lastShape = 0;
  let scrollVel = 0, lastScrollY = window.scrollY;

  const sections = () => [
    document.getElementById('top'),
    document.getElementById('services'),
    document.getElementById('spark'),
    document.getElementById('about'),
    document.getElementById('cta'),
  ].filter(Boolean);

  function updateScrollMorph() {
    const secs = sections();
    if (!secs.length) return;
    const scrollY = window.scrollY;
    scrollVel = scrollY - lastScrollY;
    lastScrollY = scrollY;
    const vh = window.innerHeight;
    const centers = secs.map((el) => {
      const r = el.getBoundingClientRect();
      return scrollY + r.top + r.height * 0.35;
    });

    let i = 0;
    while (i < centers.length - 1 && scrollY + vh * 0.4 > centers[i + 1]) i++;
    const i1 = Math.min(i, centers.length - 1);
    const i2 = Math.min(i1 + 1, centers.length - 1);
    let t = 0;
    if (i1 !== i2) {
      const span = centers[i2] - centers[i1];
      t = span > 0 ? (scrollY + vh * 0.4 - centers[i1]) / span : 0;
      t = Math.max(0, Math.min(1, t));
    }
    morphFrom = i1;
    morphTo = i2;
    targetMorphT = easeInOut(t);

    if (Math.round(i1 + t) !== lastShape && t > 0.15 && t < 0.85) {
      energize = 1;
      lastShape = Math.round(i1 + t);
      document.body.dataset.shape = String(lastShape);
      window.dispatchEvent(new CustomEvent('constellation-shape', { detail: { shape: lastShape } }));
    }

    const mobile = window.innerWidth < 768;
    clusterTX = mobile ? lerp(CLUSTER_X[morphFrom], CLUSTER_X[morphTo], targetMorphT) * 0.22
      : lerp(CLUSTER_X[morphFrom], CLUSTER_X[morphTo], targetMorphT);
    clusterTY = lerp(CLUSTER_Y[morphFrom], CLUSTER_Y[morphTo], targetMorphT);
    clusterTS = mobile ? lerp(CLUSTER_SCALE[morphFrom], CLUSTER_SCALE[morphTo], targetMorphT) * 0.68
      : lerp(CLUSTER_SCALE[morphFrom], CLUSTER_SCALE[morphTo], targetMorphT);
  }

  window.addEventListener('scroll', updateScrollMorph, { passive: true });
  updateScrollMorph();

  const mouse = new THREE.Vector2();
  const mouseTarget = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  // Click to energize
  window.addEventListener('pointerdown', () => { energize = Math.max(energize, 0.85); });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateScrollMorph();
  }
  resize();
  window.addEventListener('resize', resize);

  // Signal ready
  window.dispatchEvent(new Event('constellation-ready'));

  const clock = new THREE.Clock();
  let running = true, frameId;

  function animate() {
    if (!running) return;
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    morphT += (targetMorphT - morphT) * (reducedMotion ? 1 : Math.min(1, dt * 4));
    energize *= reducedMotion ? 0 : 0.94;

    cluster.position.x += (clusterTX - cluster.position.x) * (reducedMotion ? 1 : 0.07);
    cluster.position.y += (clusterTY - cluster.position.y) * (reducedMotion ? 1 : 0.07);
    const s = cluster.scale.x + (clusterTS - cluster.scale.x) * (reducedMotion ? 1 : 0.07);
    cluster.scale.setScalar(s);

    mouse.lerp(mouseTarget, reducedMotion ? 1 : 0.06);

    if (!reducedMotion) {
      // Scroll-velocity camera kick
      const kick = Math.max(-0.35, Math.min(0.35, scrollVel * 0.002));
      camera.position.x += (mouse.x * 0.9 - camera.position.x) * 0.035;
      camera.position.y += (mouse.y * 0.45 + kick - camera.position.y) * 0.035;
      camera.position.z = 11.5 + Math.sin(t * 0.15) * 0.15;
      camera.lookAt(cluster.position.x * 0.4, cluster.position.y * 0.3, 0);
      cluster.rotation.y = t * 0.045;
      cluster.rotation.x = Math.sin(t * 0.12) * 0.04;
      // Bloom breathes with energize
      bloom.strength = 0.45 + energize * 0.7 + Math.sin(t * 0.8) * 0.05;
    }

    const from = shapePos[morphFrom];
    const to = shapePos[morphTo];
    const blend = morphT;
    // Morph turbulence — particles fly out mid-transition
    const morphEnergy = Math.sin(blend * Math.PI) * (1 + Math.abs(scrollVel) * 0.01);

    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      const i3 = i * 3;
      let tx = lerp(from[i3], to[i3], blend);
      let ty = lerp(from[i3 + 1], to[i3 + 1], blend);
      let tz = lerp(from[i3 + 2], to[i3 + 2], blend);

      if (!reducedMotion) {
        // Outward burst during morph
        const nx = tx || 0.001, ny = ty || 0.001, nz = tz || 0.001;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        tx += (nx / len) * morphEnergy * 0.55;
        ty += (ny / len) * morphEnergy * 0.55;
        tz += (nz / len) * morphEnergy * 0.35;

        const n1 = noise3D(tx * 0.4 + t * d.speed * 0.3, ty * 0.4, d.phase) * 0.18;
        const n2 = noise3D(tx * 0.4, ty * 0.4 + t * d.speed * 0.25, d.phase + 40) * 0.18;
        const n3 = noise3D(d.phase, tz * 0.4, t * d.speed * 0.2) * 0.12;
        tx += n1; ty += n2; tz += n3;

        // Magnetic mouse — attract near, repel when close
        const px = tx + cluster.position.x;
        const py = ty + cluster.position.y;
        const dx = mouse.x * 4.5 - px;
        const dy = mouse.y * 2.8 - py;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        if (dist < 3.5) {
          const force = dist > 1.2 ? 0.08 / dist : -0.25 / dist;
          tx += dx * force;
          ty += dy * force;
        }

        // Current pulse along stator rings
        if (morphFrom === 0 || morphTo === 0) {
          const ang = Math.atan2(ty, tx);
          const pulse = Math.sin(ang * 8 - t * 4) * 0.5 + 0.5;
          const statorB = morphFrom === 0 ? 1 - blend : blend;
          tx += Math.cos(ang) * pulse * 0.06 * statorB;
          ty += Math.sin(ang) * pulse * 0.06 * statorB;
        }
      }

      // Spring physics
      const k = reducedMotion ? 1 : 0.14;
      d.vx = (d.vx + (tx - d.x) * k) * 0.78;
      d.vy = (d.vy + (ty - d.y) * k) * 0.78;
      d.vz = (d.vz + (tz - d.z) * k) * 0.78;
      d.x += d.vx;
      d.y += d.vy;
      d.z += d.vz;

      const twinkle = reducedMotion ? 1
        : 0.65 + noise3D(t * 0.5 + d.phase, i * 0.01, 0) * 0.25 + energize * 0.35;
      const depthScale = 0.55 + d.depth * 0.9;
      dummy.position.set(d.x, d.y, d.z - d.depth * 1.2);
      dummy.rotation.set(
        t * d.rotSpeed * 0.35,
        t * d.rotSpeed * 0.22 + d.phase,
        t * d.rotSpeed * 0.18
      );
      dummy.scale.setScalar(d.scale * twinkle * depthScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const c = d.color.clone();
      // Electrical accent washes
      if (morphTo === 0 || morphFrom === 0) {
        const b = morphFrom === 0 ? 1 - blend : blend;
        const r = Math.sqrt(d.x * d.x + d.y * d.y);
        if (r > 1.6) c.lerp(new THREE.Color('#ffb829'), b * 0.6);
      }
      if (morphTo === 2 || morphFrom === 2) {
        const b = morphFrom === 2 ? 1 - blend : blend;
        c.lerp(new THREE.Color('#fff4cc'), b * 0.5 * twinkle);
      }
      if (morphTo === 4 || morphFrom === 4) {
        const b = morphFrom === 4 ? 1 - blend : blend;
        c.lerp(new THREE.Color('#ffffff'), b * 0.4 * energize);
      }
      c.multiplyScalar(0.55 + twinkle * 0.5 + energize * 0.3);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < AMBIENT; i++) {
      const d = ambData[i];
      let ax = d.base.x, ay = d.base.y, az = d.base.z;
      if (!reducedMotion) {
        ax += noise3D(d.base.x * 0.1 + t * d.speed, d.base.y * 0.1, d.phase) * 0.7;
        ay += noise3D(d.base.x * 0.1, d.base.y * 0.1 + t * d.speed, d.phase) * 0.7;
        // Parallax with mouse
        ax += mouse.x * 0.3 * (1 + d.base.z * 0.05);
        ay += mouse.y * 0.2 * (1 + d.base.z * 0.05);
      }
      dummy.position.set(ax, ay, az);
      dummy.rotation.set(t * d.rotSpeed * 0.1, d.phase, 0);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      ambMesh.setMatrixAt(i, dummy.matrix);
    }
    ambMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < LARGE; i++) {
      const d = largeData[i];
      let ax = d.base.x + (reducedMotion ? 0 : noise3D(d.phase, t * d.speed, 0) * 0.4);
      let ay = d.base.y + (reducedMotion ? 0 : noise3D(0, d.phase, t * d.speed) * 0.4);
      ax += mouse.x * 0.8;
      ay += mouse.y * 0.5;
      dummy.position.set(ax, ay, d.base.z);
      dummy.rotation.set(t * 0.05 + d.phase, t * 0.03, 0);
      dummy.scale.setScalar(d.scale * (0.9 + energize * 0.3));
      dummy.updateMatrix();
      largeMesh.setMatrixAt(i, dummy.matrix);
    }
    largeMesh.instanceMatrix.needsUpdate = true;

    if (reducedMotion) renderer.render(scene, camera);
    else composer.render();
  }

  animate();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(frameId);
    } else {
      running = true;
      clock.start();
      animate();
    }
  });
}

init();
