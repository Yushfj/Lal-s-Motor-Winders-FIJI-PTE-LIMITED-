/**
 * Electrical scroll-morphing constellation
 * Particles rearrange into electrical objects as the page scrolls:
 *   0 Hero      → motor stator winding
 *   1 Services  → motor / generator body
 *   2 Telecom   → lightning bolt
 *   3 About     → power transformer
 *   4 CTA       → spark burst
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

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
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNT = window.innerWidth < 768 ? 2400 : 5200;
const AMBIENT = window.innerWidth < 768 ? 160 : 380;

/* —— Noise —— */
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

/* —— Electrical shape samplers —— */

/** Hero: motor stator cross-section with copper winding slots */
function sampleStator(i, n) {
  const rings = 10;
  const ring = i % rings;
  const along = Math.floor(i / rings) / Math.max(1, Math.ceil(n / rings));
  const angle = along * Math.PI * 2;

  // Outer yoke + slotted teeth
  if (ring < 7) {
    const r = 1.35 + ring * 0.22;
    const teeth = 36;
    const tooth = Math.abs(Math.sin(angle * teeth * 0.5));
    const slotDepth = tooth > 0.7 ? 0.35 : 0;
    const rr = r - slotDepth;
    // Copper winding fill in slots
    const inSlot = tooth > 0.55 && ring > 2 && ring < 6;
    const zJitter = inSlot ? (Math.sin(along * 40) * 0.25) : Math.sin(angle * 2) * 0.08;
    return new THREE.Vector3(
      Math.cos(angle) * rr,
      Math.sin(angle) * rr,
      (ring / rings - 0.5) * 1.4 + zJitter
    ).multiplyScalar(1.7);
  }

  // Inner rotor / shaft
  const r = 0.35 + (ring - 7) * 0.18;
  return new THREE.Vector3(
    Math.cos(angle) * r,
    Math.sin(angle) * r,
    Math.sin(angle * 4) * 0.15
  ).multiplyScalar(1.7);
}

/** Services: complete motor body — cylindrical housing + end bells + shaft */
function sampleMotorBody(i, n) {
  const u = i / n;
  const t = (i * 0.6180339887) % 1;
  const a = t * Math.PI * 2;

  if (u < 0.55) {
    // Main cylindrical housing with cooling fins
    const h = (u / 0.55 - 0.5) * 3.6;
    const fin = Math.sin(a * 12) * 0.12;
    const r = 1.55 + fin;
    return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r).multiplyScalar(1.35);
  }
  if (u < 0.75) {
    // End bell (front)
    const h = ((u - 0.55) / 0.2);
    const r = 1.55 * (1 - h * 0.45);
    return new THREE.Vector3(Math.cos(a) * r, 1.85 + h * 0.5, Math.sin(a) * r).multiplyScalar(1.35);
  }
  if (u < 0.88) {
    // Rear end
    const h = ((u - 0.75) / 0.13);
    const r = 1.55 * (1 - h * 0.4);
    return new THREE.Vector3(Math.cos(a) * r, -1.85 - h * 0.45, Math.sin(a) * r).multiplyScalar(1.35);
  }
  // Drive shaft extending forward
  const h = ((u - 0.88) / 0.12);
  const r = 0.22;
  return new THREE.Vector3(Math.cos(a) * r, 2.4 + h * 1.4, Math.sin(a) * r).multiplyScalar(1.35);
}

/** Telecom: lightning bolt / electrical arc */
function sampleLightning(i, n) {
  const u = i / n;
  // Zigzag bolt spine from top to bottom
  const segments = [
    [0.0, 2.8], [0.45, 1.6], [-0.35, 0.5], [0.55, -0.6], [-0.25, -1.5], [0.15, -2.6],
  ];
  const segF = u * (segments.length - 1);
  const si = Math.min(Math.floor(segF), segments.length - 2);
  const f = segF - si;
  const x0 = segments[si][0], y0 = segments[si][1];
  const x1 = segments[si + 1][0], y1 = segments[si + 1][1];
  const x = lerp(x0, x1, f);
  const y = lerp(y0, y1, f);

  // Branch forks
  const branch = (i % 7 === 0);
  const side = (i % 2 === 0 ? 1 : -1);
  const spread = branch ? side * (0.4 + (i % 5) * 0.15) : side * ((i % 11) * 0.04);
  const z = (Math.sin(u * 20 + i) * 0.35) + (branch ? side * 0.5 : 0);

  // Thickness envelope — denser near core
  const thick = (1 - Math.abs(u - 0.5) * 1.2) * 0.35;
  const ox = (Math.sin(i * 12.989) * 0.5 + 0.5) * thick * side;

  return new THREE.Vector3(
    (x + spread * 0.6 + ox) * 1.8,
    y * 1.35,
    z * 1.2
  );
}

/** About: power transformer — dual coils + core */
function sampleTransformer(i, n) {
  const u = i / n;
  const t = (i * 0.6180339887) % 1;
  const a = t * Math.PI * 2;

  if (u < 0.38) {
    // Left coil (primary)
    const h = (t - 0.5) * 3.2;
    const layer = Math.floor((u / 0.38) * 6);
    const r = 0.7 + layer * 0.14;
    return new THREE.Vector3(-1.35 + Math.cos(a) * r * 0.35, h, Math.sin(a) * r).multiplyScalar(1.4);
  }
  if (u < 0.76) {
    // Right coil (secondary)
    const h = (t - 0.5) * 3.2;
    const layer = Math.floor(((u - 0.38) / 0.38) * 6);
    const r = 0.7 + layer * 0.14;
    return new THREE.Vector3(1.35 + Math.cos(a) * r * 0.35, h, Math.sin(a) * r).multiplyScalar(1.4);
  }
  // Laminated iron core (E/I center column + yokes)
  const h = (t - 0.5) * 3.4;
  const corePart = (i % 3);
  if (corePart === 0) {
    return new THREE.Vector3((t - 0.5) * 0.5, h, (i % 5) * 0.08 - 0.16).multiplyScalar(1.4);
  }
  if (corePart === 1) {
    return new THREE.Vector3((t - 0.5) * 2.8, 1.7, (i % 4) * 0.06).multiplyScalar(1.4);
  }
  return new THREE.Vector3((t - 0.5) * 2.8, -1.7, (i % 4) * 0.06).multiplyScalar(1.4);
}

/** CTA: electrical spark / discharge burst */
function sampleSparkBurst(i, n) {
  const t = (i * 0.6180339887) % 1;
  const theta = t * Math.PI * 2 * 21;
  const phi = Math.acos(2 * ((i * 0.381966) % 1) - 1);

  // Radial sparks from core — longer rays
  const ray = (i % 9 === 0);
  const r = ray
    ? 1.5 + ((i * 13) % 10) * 0.45
    : 0.6 + ((i * 7) % 10) * 0.22 + Math.sin(theta * 3) * 0.25;

  // Jagged spark paths
  const jag = ray ? Math.sin(phi * 14 + theta) * 0.35 : Math.sin(theta * 5) * 0.12;

  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * (r + jag),
    Math.sin(phi) * Math.sin(theta) * (r + jag) * 0.85,
    Math.cos(phi) * r * 0.75
  ).multiplyScalar(1.55);
}

const SHAPES = [sampleStator, sampleMotorBody, sampleLightning, sampleTransformer, sampleSparkBurst];

// Cluster X positions per section (zigzag like Dala: visual opposite text)
const CLUSTER_X = [2.4, -2.2, -2.4, 2.3, 0.0];
const CLUSTER_Y = [0.15, 0.1, 0.25, 0.05, 0.3];
const CLUSTER_SCALE = [1.05, 1.0, 1.15, 1.05, 1.25];

function createTriangleGeo() {
  const geo = new THREE.BufferGeometry();
  const s = 0.026;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, s * 1.25, 0,
    s, -s * 0.7, 0,
    -s, -s * 0.7, 0,
  ]), 3));
  return geo;
}

function init() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0, 11);

  const root = new THREE.Group();
  scene.add(root);
  const cluster = new THREE.Group();
  root.add(cluster);
  const ambientG = new THREE.Group();
  root.add(ambientG);

  const geo = createTriangleGeo();
  const matC = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const matA = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.2,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geo, matC, COUNT);
  const ambMesh = new THREE.InstancedMesh(geo, matA, AMBIENT);
  cluster.add(mesh);
  ambientG.add(ambMesh);

  // Precompute all shape positions
  const shapePos = SHAPES.map((fn) => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const p = fn(i, COUNT);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    return arr;
  });

  const dummy = new THREE.Object3D();
  const data = [];
  for (let i = 0; i < COUNT; i++) {
    const color = COLORS[i % COLORS.length];
    // Color by height for bulb/globe gradient feel
    mesh.setColorAt(i, color);
    const sc = 0.5 + Math.random() * 1.15;
    data.push({
      phase: Math.random() * 100,
      speed: 0.05 + Math.random() * 0.12,
      rotSpeed: (Math.random() - 0.5) * 0.5,
      scale: sc,
      color,
      // current animated position
      x: shapePos[0][i * 3],
      y: shapePos[0][i * 3 + 1],
      z: shapePos[0][i * 3 + 2],
    });
    dummy.position.set(data[i].x, data[i].y, data[i].z);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const ambData = [];
  for (let i = 0; i < AMBIENT; i++) {
    const x = (Math.random() - 0.35) * 18;
    const y = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 8 - 1;
    ambMesh.setColorAt(i, COLORS[Math.floor(Math.random() * COLORS.length)]);
    const sc = 0.3 + Math.random() * 0.55;
    ambData.push({ base: new THREE.Vector3(x, y, z), phase: Math.random() * 100, speed: 0.03 + Math.random() * 0.06, rotSpeed: (Math.random() - 0.5) * 0.2, scale: sc });
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    ambMesh.setMatrixAt(i, dummy.matrix);
  }
  ambMesh.instanceMatrix.needsUpdate = true;

  // Scroll morph state
  let morphFrom = 0;
  let morphTo = 0;
  let morphT = 1; // 0..1 blend
  let targetMorphT = 1;
  let scrollShape = 0;
  let clusterTX = CLUSTER_X[0];
  let clusterTY = CLUSTER_Y[0];
  let clusterTS = CLUSTER_SCALE[0];

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
    const vh = window.innerHeight;
    const centers = secs.map((el) => {
      const r = el.getBoundingClientRect();
      return scrollY + r.top + r.height * 0.35;
    });

    // Find surrounding section pair
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

    const shapeIndex = i1;
    const nextIndex = i2;
    if (shapeIndex !== morphFrom || nextIndex !== morphTo) {
      // Snap blend when pair changes
      if (shapeIndex !== morphFrom) {
        morphFrom = shapeIndex;
        morphTo = nextIndex;
      } else {
        morphTo = nextIndex;
      }
    }
    morphFrom = shapeIndex;
    morphTo = nextIndex;
    targetMorphT = easeInOut(t);
    scrollShape = shapeIndex + t;

    // Cluster layout zigzag
    const cx0 = CLUSTER_X[morphFrom] ?? 0;
    const cx1 = CLUSTER_X[morphTo] ?? 0;
    const cy0 = CLUSTER_Y[morphFrom] ?? 0;
    const cy1 = CLUSTER_Y[morphTo] ?? 0;
    const cs0 = CLUSTER_SCALE[morphFrom] ?? 1;
    const cs1 = CLUSTER_SCALE[morphTo] ?? 1;
    const mobile = window.innerWidth < 768;
    clusterTX = mobile ? lerp(cx0, cx1, targetMorphT) * 0.25 : lerp(cx0, cx1, targetMorphT);
    clusterTY = lerp(cy0, cy1, targetMorphT);
    clusterTS = mobile ? lerp(cs0, cs1, targetMorphT) * 0.7 : lerp(cs0, cs1, targetMorphT);
  }

  window.addEventListener('scroll', updateScrollMorph, { passive: true });
  updateScrollMorph();

  const mouse = new THREE.Vector2();
  const mouseTarget = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateScrollMorph();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  let frameId;

  function animate() {
    if (!running) return;
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    // Smooth morph blend
    morphT += (targetMorphT - morphT) * (reducedMotion ? 1 : Math.min(1, dt * 3.5));

    // Smooth cluster transform
    cluster.position.x += (clusterTX - cluster.position.x) * (reducedMotion ? 1 : 0.06);
    cluster.position.y += (clusterTY - cluster.position.y) * (reducedMotion ? 1 : 0.06);
    const s = cluster.scale.x + (clusterTS - cluster.scale.x) * (reducedMotion ? 1 : 0.06);
    cluster.scale.setScalar(s);

    mouse.lerp(mouseTarget, reducedMotion ? 1 : 0.05);

    if (!reducedMotion) {
      camera.position.x += (mouse.x * 0.7 - camera.position.x) * 0.03;
      camera.position.y += (mouse.y * 0.4 - camera.position.y) * 0.03;
      camera.lookAt(cluster.position.x * 0.35, cluster.position.y * 0.25, 0);
      cluster.rotation.y = t * 0.04;
      cluster.rotation.x = Math.sin(t * 0.11) * 0.035;
    }

    const from = shapePos[morphFrom];
    const to = shapePos[morphTo];
    const blend = morphT;

    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      const i3 = i * 3;
      let tx = lerp(from[i3], to[i3], blend);
      let ty = lerp(from[i3 + 1], to[i3 + 1], blend);
      let tz = lerp(from[i3 + 2], to[i3 + 2], blend);

      // Spring toward target
      if (!reducedMotion) {
        const n1 = noise3D(tx * 0.4 + t * d.speed * 0.25, ty * 0.4, d.phase) * 0.16;
        const n2 = noise3D(tx * 0.4, ty * 0.4 + t * d.speed * 0.2, d.phase + 30) * 0.16;
        const n3 = noise3D(d.phase, tz * 0.4, t * d.speed * 0.15) * 0.1;
        tx += n1; ty += n2; tz += n3;

        // Mouse soft push
        const px = tx + cluster.position.x;
        const py = ty + cluster.position.y;
        const dx = px - mouse.x * 4;
        const dy = py - mouse.y * 2.5;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const push = Math.max(0, 1 - dist / 3) * 0.4;
        tx += (dx / dist) * push;
        ty += (dy / dist) * push;
      }

      d.x += (tx - d.x) * (reducedMotion ? 1 : 0.12);
      d.y += (ty - d.y) * (reducedMotion ? 1 : 0.12);
      d.z += (tz - d.z) * (reducedMotion ? 1 : 0.12);

      const twinkle = reducedMotion ? 1 : 0.72 + noise3D(t * 0.4 + d.phase, i * 0.01, 0) * 0.28;
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(t * d.rotSpeed * 0.3, t * d.rotSpeed * 0.2 + d.phase, t * d.rotSpeed * 0.15);
      dummy.scale.setScalar(d.scale * twinkle);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Height-based color shift for bulb (amber top → violet base)
      const c = d.color.clone();
      if (morphTo === 2 || morphFrom === 2) {
        const bulbBlend = morphFrom === 2 ? 1 - blend : (morphTo === 2 ? blend : 0);
        const hNorm = Math.max(0, Math.min(1, (d.y + 2.5) / 5));
        const amber = new THREE.Color('#ffb829');
        const violet = new THREE.Color('#8052ff');
        const heightCol = amber.clone().lerp(violet, 1 - hNorm);
        c.lerp(heightCol, bulbBlend * 0.7);
      }
      c.multiplyScalar(0.65 + twinkle * 0.35);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < AMBIENT; i++) {
      const d = ambData[i];
      let ax = d.base.x, ay = d.base.y, az = d.base.z;
      if (!reducedMotion) {
        ax += noise3D(d.base.x * 0.12 + t * d.speed, d.base.y * 0.12, d.phase) * 0.6;
        ay += noise3D(d.base.x * 0.12, d.base.y * 0.12 + t * d.speed, d.phase) * 0.6;
      }
      dummy.position.set(ax, ay, az);
      dummy.rotation.set(t * d.rotSpeed * 0.1, d.phase, 0);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      ambMesh.setMatrixAt(i, dummy.matrix);
    }
    ambMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
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
