/**
 * Dala constellation — Three.js WebGL
 * Matches dala.craftedbygc.com: dense triangular particles forming
 * an organic brain/cloud shape with ambient scatter, mouse parallax,
 * noise drift, and slow rotation.
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
  new THREE.Color('#22d3ee'),
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 768;

/* —— Compact 3D simplex —— */
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

/**
 * Organic brain / neural cloud — Dala signature shape
 * Two hemispheres + cerebellum-like lobe with slot modulation
 */
function sampleBrain() {
  for (let i = 0; i < 50; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    let x = Math.sin(phi) * Math.cos(theta);
    let y = Math.sin(phi) * Math.sin(theta);
    let z = Math.cos(phi);

    // Dual hemisphere brain profile
    const hemi = Math.sign(x) || 1;
    const hemiPush = 0.18 * hemi * Math.pow(Math.abs(Math.sin(phi)), 1.5);
    const folds = 0.12 * Math.sin(phi * 8 + theta * 3) + 0.06 * Math.sin(theta * 11);
    const stem = y < -0.4 ? 0.15 * (y + 0.4) : 0;
    const r = (0.5 + Math.random() * 0.5) * (1 + folds + Math.abs(hemiPush) * 0.3) + stem;

    if (r < 0.18) continue;

    const s = 3.4;
    return {
      x: (x + hemiPush) * r * s * 1.05,
      y: y * r * s * 0.9,
      z: z * r * s * 0.75,
    };
  }
  return { x: 0, y: 0, z: 0 };
}

function createTriangleGeo() {
  const geo = new THREE.BufferGeometry();
  const s = 0.028;
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
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
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

  const ambient = new THREE.Group();
  root.add(ambient);

  const geo = createTriangleGeo();
  const matCluster = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const matAmbient = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  let N = isMobile() ? 2200 : 5500;
  let A = isMobile() ? 180 : 420;

  const clusterMesh = new THREE.InstancedMesh(geo, matCluster, N);
  const ambientMesh = new THREE.InstancedMesh(geo, matAmbient, A);
  cluster.add(clusterMesh);
  ambient.add(ambientMesh);

  const dummy = new THREE.Object3D();
  const clusterData = [];
  const ambientData = [];

  function rebuildCluster() {
    clusterData.length = 0;
    for (let i = 0; i < N; i++) {
      const p = sampleBrain();
      const color = COLORS[i % COLORS.length];
      clusterMesh.setColorAt(i, color);
      const sc = 0.55 + Math.random() * 1.1;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      clusterMesh.setMatrixAt(i, dummy.matrix);
      clusterData.push({
        base: new THREE.Vector3(p.x, p.y, p.z),
        offset: new THREE.Vector3(),
        phase: Math.random() * 100,
        speed: 0.06 + Math.random() * 0.14,
        rotSpeed: (Math.random() - 0.5) * 0.55,
        scale: sc,
        color,
      });
    }
    clusterMesh.instanceMatrix.needsUpdate = true;
    if (clusterMesh.instanceColor) clusterMesh.instanceColor.needsUpdate = true;
  }

  function rebuildAmbient() {
    ambientData.length = 0;
    for (let i = 0; i < A; i++) {
      const x = (Math.random() - 0.35) * 18;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 8 - 1;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      ambientMesh.setColorAt(i, color);
      const sc = 0.35 + Math.random() * 0.55;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      ambientMesh.setMatrixAt(i, dummy.matrix);
      ambientData.push({
        base: new THREE.Vector3(x, y, z),
        phase: Math.random() * 100,
        speed: 0.03 + Math.random() * 0.07,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        scale: sc,
      });
    }
    ambientMesh.instanceMatrix.needsUpdate = true;
    if (ambientMesh.instanceColor) ambientMesh.instanceColor.needsUpdate = true;
  }

  rebuildCluster();
  rebuildAmbient();

  // Position constellation like Dala — right-center of viewport
  function layoutCluster() {
    if (window.innerWidth < 768) {
      cluster.position.set(0.6, 0.4, 0);
      cluster.scale.setScalar(0.72);
    } else {
      cluster.position.set(2.6, 0.15, 0);
      cluster.scale.setScalar(1.05);
    }
  }
  layoutCluster();

  const mouse = new THREE.Vector2(0, 0);
  const mouseTarget = new THREE.Vector2(0, 0);
  const mouseWorld = new THREE.Vector3();

  window.addEventListener('pointermove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layoutCluster();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let frameId;
  let running = true;

  function animate() {
    if (!running) return;
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mouse.lerp(mouseTarget, reducedMotion ? 1 : 0.05);

    if (!reducedMotion) {
      // Camera parallax — Dala feel
      camera.position.x += (mouse.x * 0.85 - camera.position.x) * 0.025;
      camera.position.y += (mouse.y * 0.45 - camera.position.y) * 0.025;
      camera.lookAt(cluster.position.x * 0.4, cluster.position.y * 0.3, 0);

      // Slow orbit of the whole constellation
      cluster.rotation.y = t * 0.045;
      cluster.rotation.x = Math.sin(t * 0.12) * 0.04;
      cluster.rotation.z = Math.sin(t * 0.08) * 0.025;
    }

    mouseWorld.set(
      mouse.x * 4 + cluster.position.x,
      mouse.y * 2.5 + cluster.position.y,
      2
    );

    for (let i = 0; i < N; i++) {
      const d = clusterData[i];
      const bx = d.base.x, by = d.base.y, bz = d.base.z;

      if (!reducedMotion) {
        const n1 = noise3D(bx * 0.45 + t * d.speed * 0.28, by * 0.45, bz * 0.45 + d.phase);
        const n2 = noise3D(bx * 0.45, by * 0.45 + t * d.speed * 0.22, bz * 0.45 + d.phase + 40);
        const n3 = noise3D(bx * 0.45 + d.phase, by * 0.45, bz * 0.45 + t * d.speed * 0.18);
        d.offset.set(n1 * 0.22, n2 * 0.22, n3 * 0.14);

        // Soft mouse repulsion (Dala spring-like)
        const px = bx + d.offset.x + cluster.position.x;
        const py = by + d.offset.y + cluster.position.y;
        const dx = px - mouseWorld.x;
        const dy = py - mouseWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const push = Math.max(0, 1 - dist / 3.2) * 0.55;
        d.offset.x += (dx / dist) * push;
        d.offset.y += (dy / dist) * push;
      }

      const twinkle = reducedMotion ? 1 : 0.72 + noise3D(t * 0.45 + d.phase, i * 0.008, 0) * 0.28;
      dummy.position.set(bx + d.offset.x, by + d.offset.y, bz + d.offset.z);
      dummy.rotation.set(
        t * d.rotSpeed * 0.35,
        t * d.rotSpeed * 0.25 + d.phase,
        t * d.rotSpeed * 0.18
      );
      dummy.scale.setScalar(d.scale * twinkle);
      dummy.updateMatrix();
      clusterMesh.setMatrixAt(i, dummy.matrix);

      const c = d.color.clone().multiplyScalar(0.65 + twinkle * 0.35);
      clusterMesh.setColorAt(i, c);
    }
    clusterMesh.instanceMatrix.needsUpdate = true;
    if (clusterMesh.instanceColor) clusterMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < A; i++) {
      const d = ambientData[i];
      let ax = d.base.x, ay = d.base.y, az = d.base.z;
      if (!reducedMotion) {
        ax += noise3D(d.base.x * 0.15 + t * d.speed, d.base.y * 0.15, d.phase) * 0.65;
        ay += noise3D(d.base.x * 0.15, d.base.y * 0.15 + t * d.speed, d.phase) * 0.65;
        az += noise3D(d.phase, d.base.z * 0.15, t * d.speed * 0.4) * 0.35;
      }
      dummy.position.set(ax, ay, az);
      dummy.rotation.set(t * d.rotSpeed * 0.12, d.phase, 0);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      ambientMesh.setMatrixAt(i, dummy.matrix);
    }
    ambientMesh.instanceMatrix.needsUpdate = true;

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
