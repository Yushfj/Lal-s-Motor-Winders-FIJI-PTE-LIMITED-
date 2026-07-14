/**
 * Dala-style constellation — Three.js WebGL particle field
 * Organic drift, mouse parallax, thousands of outlined triangles
 * Motion modeled after dala.craftedbygc.com particle simulation
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
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;
const CLUSTER_COUNT = isMobile ? 1800 : 4200;
const AMBIENT_COUNT = isMobile ? 120 : 280;

// Simplex-style 3D noise (compact)
const perm = new Uint8Array(512);
(function seedPerm() {
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
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function noise3D(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
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

/** Organic brain / motor-coil hybrid point cloud */
function sampleBrainPoint() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);
    const lobe =
      1 +
      0.22 * Math.sin(phi * 3.2 + 0.5) * Math.cos(theta * 2.1) +
      0.1 * Math.sin(theta * 5) +
      0.06 * Math.sin(phi * 18);
    const r = (0.55 + Math.random() * 0.45) * lobe;
    if (r < 0.15) continue;
    const scale = 2.8;
    return {
      x: nx * r * scale + (Math.random() - 0.5) * 0.08,
      y: ny * r * scale * 0.85 + (Math.random() - 0.5) * 0.08,
      z: nz * r * scale * 0.7 + (Math.random() - 0.5) * 0.12,
    };
  }
  return { x: 0, y: 0, z: 0 };
}

function createTriangleGeometry() {
  const geo = new THREE.BufferGeometry();
  const s = 0.035;
  const verts = new Float32Array([
    0, s * 1.2, 0,
    s, -s * 0.65, 0,
    -s, -s * 0.65, 0,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  return geo;
}

function init() {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const clusterGroup = new THREE.Group();
  clusterGroup.position.set(1.8, 0.2, 0);
  scene.add(clusterGroup);

  const ambientGroup = new THREE.Group();
  scene.add(ambientGroup);

  const triangleGeo = createTriangleGeometry();
  const clusterMesh = new THREE.InstancedMesh(triangleGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), CLUSTER_COUNT);

  const ambientMesh = new THREE.InstancedMesh(triangleGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), AMBIENT_COUNT);

  const dummy = new THREE.Object3D();
  const clusterData = [];
  const ambientData = [];

  for (let i = 0; i < CLUSTER_COUNT; i++) {
    const p = sampleBrainPoint();
    const color = COLORS[i % COLORS.length];
    clusterMesh.setColorAt(i, color);
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const sc = 0.6 + Math.random() * 0.8;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    clusterMesh.setMatrixAt(i, dummy.matrix);
    clusterData.push({
      base: new THREE.Vector3(p.x, p.y, p.z),
      offset: new THREE.Vector3(),
      phase: Math.random() * 100,
      speed: 0.08 + Math.random() * 0.12,
      rotSpeed: (Math.random() - 0.5) * 0.4,
      scale: sc,
      color,
    });
  }
  clusterMesh.instanceMatrix.needsUpdate = true;
  clusterMesh.instanceColor.needsUpdate = true;
  clusterGroup.add(clusterMesh);

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const x = (Math.random() - 0.3) * 14;
    const y = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 6 - 2;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    ambientMesh.setColorAt(i, color);
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    const sc = 0.4 + Math.random() * 0.5;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    ambientMesh.setMatrixAt(i, dummy.matrix);
    ambientData.push({
      base: new THREE.Vector3(x, y, z),
      phase: Math.random() * 100,
      speed: 0.04 + Math.random() * 0.06,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      scale: sc,
    });
  }
  ambientMesh.instanceMatrix.needsUpdate = true;
  ambientMesh.instanceColor.needsUpdate = true;
  ambientGroup.add(ambientMesh);

  const mouse = new THREE.Vector2(0, 0);
  const mouseTarget = new THREE.Vector2(0, 0);
  const mouseWorld = new THREE.Vector3();

  window.addEventListener('mousemove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  let width = 0, height = 0;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    clusterGroup.position.x = width < 768 ? 0.4 : 1.8;
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let frameId;

  function animate() {
    frameId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mouse.lerp(mouseTarget, reducedMotion ? 1 : 0.06);

    // Camera parallax — Dala-style subtle follow
    if (!reducedMotion) {
      camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 0.35 - camera.position.y) * 0.02;
      camera.lookAt(clusterGroup.position);
      clusterGroup.rotation.y = t * 0.04;
      clusterGroup.rotation.z = Math.sin(t * 0.15) * 0.03;
    }

    mouseWorld.set(mouse.x * 3, mouse.y * 2, 2);

    // Update cluster particles — smooth noise drift + mouse repulsion
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const d = clusterData[i];
      const bx = d.base.x, by = d.base.y, bz = d.base.z;

      if (!reducedMotion) {
        const n1 = noise3D(bx * 0.5 + t * d.speed * 0.3, by * 0.5, bz * 0.5 + d.phase);
        const n2 = noise3D(bx * 0.5, by * 0.5 + t * d.speed * 0.25, bz * 0.5 + d.phase + 50);
        const n3 = noise3D(bx * 0.5 + d.phase, by * 0.5, bz * 0.5 + t * d.speed * 0.2);
        d.offset.set(n1 * 0.18, n2 * 0.18, n3 * 0.12);

        const px = bx + d.offset.x + clusterGroup.position.x;
        const py = by + d.offset.y + clusterGroup.position.y;
        const dx = px - mouseWorld.x;
        const dy = py - mouseWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 2.5) * 0.35;
        d.offset.x += (dx / (dist + 0.001)) * influence;
        d.offset.y += (dy / (dist + 0.001)) * influence;
      }

      const twinkle = reducedMotion ? 1 : 0.75 + noise3D(t * 0.5 + d.phase, i * 0.01, 0) * 0.25;
      dummy.position.set(bx + d.offset.x, by + d.offset.y, bz + d.offset.z);
      dummy.rotation.set(
        t * d.rotSpeed * 0.3,
        t * d.rotSpeed * 0.2 + d.phase,
        t * d.rotSpeed * 0.15
      );
      dummy.scale.setScalar(d.scale * twinkle);
      dummy.updateMatrix();
      clusterMesh.setMatrixAt(i, dummy.matrix);

      const c = d.color.clone().multiplyScalar(0.7 + twinkle * 0.3);
      clusterMesh.setColorAt(i, c);
    }
    clusterMesh.instanceMatrix.needsUpdate = true;
    clusterMesh.instanceColor.needsUpdate = true;

    // Ambient particles — slow drift across void
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      const d = ambientData[i];
      const bx = d.base.x, by = d.base.y, bz = d.base.z;
      let ax = bx, ay = by, az = bz;

      if (!reducedMotion) {
        ax += noise3D(bx * 0.2 + t * d.speed, by * 0.2, d.phase) * 0.5;
        ay += noise3D(bx * 0.2, by * 0.2 + t * d.speed, d.phase) * 0.5;
        az += noise3D(d.phase, bz * 0.2, t * d.speed * 0.5) * 0.3;
      }

      dummy.position.set(ax, ay, az);
      dummy.rotation.set(t * d.rotSpeed * 0.1, d.phase, 0);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      ambientMesh.setMatrixAt(i, dummy.matrix);
    }
    ambientMesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frameId);
    else animate();
  });
}

init();
