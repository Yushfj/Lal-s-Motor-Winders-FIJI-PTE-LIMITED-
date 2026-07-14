/**
 * Motor stator winding particle field — Dala-inspired constellation
 * Triangular particles form concentric coil slots with ambient electrical sparks
 */

(function () {
  const canvas = document.getElementById('winding-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = ['#8052ff', '#ffb829', '#15846e', '#c77dff', '#4cc9f0', '#ff6b9d', '#7b68ee'];
  let particles = [];
  let ambient = [];
  let animationId;
  let width = 0;
  let height = 0;
  let centerX = 0;
  let centerY = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    centerX = width / 2;
    centerY = height / 2;
    initParticles();
  }

  function initParticles() {
    particles = [];
    ambient = [];
    const scale = Math.min(width, height) * 0.38;

    // Stator slots — concentric arcs of triangular particles (motor winding pattern)
    const slotCount = 36;
    const layers = [0.55, 0.72, 0.88, 1.0];

    layers.forEach((layerScale, li) => {
      const r = scale * layerScale;
      const count = Math.floor(slotCount * layerScale);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const wobble = Math.sin(i * 2.3 + li) * 8;
        const x = centerX + Math.cos(angle) * (r + wobble);
        const y = centerY + Math.sin(angle) * (r + wobble);
        particles.push({
          x, y,
          angle: angle + Math.PI / 2,
          size: 2 + (li % 2),
          color: colors[(i + li * 3) % colors.length],
          phase: Math.random() * Math.PI * 2,
          layer: li,
          type: 'slot',
        });
      }
    });

    // Inner rotor hub
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = scale * 0.22;
      particles.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        angle: angle,
        size: 1.5,
        color: '#ffb829',
        phase: Math.random() * Math.PI * 2,
        layer: 0,
        type: 'rotor',
      });
    }

    // Coil cross-lines connecting slots (winding paths)
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const r1 = scale * 0.35;
      const r2 = scale * 0.75;
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const r = r1 + (r2 - r1) * t;
        const spiral = angle + t * 0.4;
        particles.push({
          x: centerX + Math.cos(spiral) * r,
          y: centerY + Math.sin(spiral) * r,
          angle: spiral + Math.PI / 4,
          size: 1.2,
          color: colors[(i + s) % colors.length],
          phase: Math.random() * Math.PI * 2,
          layer: 2,
          type: 'coil',
        });
      }
    }

    // Ambient scattered triangles
    for (let i = 0; i < 80; i++) {
      ambient.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        size: 1 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.15 + Math.random() * 0.25,
        drift: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawTriangle(x, y, size, angle, color, opacity = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const h = size * 1.2;
    ctx.moveTo(0, -h);
    ctx.lineTo(size, h * 0.6);
    ctx.lineTo(-size, h * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const t = reducedMotion ? 0 : time * 0.001;

    // Ambient field
    ambient.forEach((p) => {
      const ox = reducedMotion ? 0 : Math.sin(t * p.drift + p.phase) * 3;
      const oy = reducedMotion ? 0 : Math.cos(t * p.drift * 0.7 + p.phase) * 3;
      drawTriangle(p.x + ox, p.y + oy, p.size, p.angle + t * 0.1, p.color, p.opacity);
    });

    // Main winding particles
    particles.forEach((p) => {
      const pulse = reducedMotion ? 1 : 0.7 + Math.sin(t * 2 + p.phase) * 0.3;
      const ox = reducedMotion ? 0 : Math.sin(t * 0.5 + p.phase) * (p.type === 'coil' ? 2 : 1);
      const oy = reducedMotion ? 0 : Math.cos(t * 0.4 + p.phase) * (p.type === 'coil' ? 2 : 1);
      drawTriangle(
        p.x + ox,
        p.y + oy,
        p.size * pulse,
        p.angle + (reducedMotion ? 0 : t * 0.05),
        p.color,
        p.type === 'rotor' ? 0.9 : 0.75
      );
    });

    // Center glow (energized core)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) * 0.15);
    gradient.addColorStop(0, 'rgba(128, 82, 255, 0.12)');
    gradient.addColorStop(0.5, 'rgba(255, 184, 41, 0.04)');
    gradient.addColorStop(1, 'transparent');
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    animationId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  animationId = requestAnimationFrame(draw);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animationId = requestAnimationFrame(draw);
    }
  });
})();
