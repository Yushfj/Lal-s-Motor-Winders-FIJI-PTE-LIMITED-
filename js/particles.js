/**
 * Dala constellation — motor winding field
 * Dense triangular particles forming an organic stator/brain hybrid on black void
 */

(function () {
  const COLORS = ['#8052ff', '#ffb829', '#15846e', '#c77dff', '#4cc9f0', '#ff6b9d', '#7b68ee', '#e040fb'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createEngine(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const {
      density = 1,
      ambientOnly = false,
      shapeScale = 0.38,
      ambientCount = 120,
    } = options;

    let particles = [];
    let ambient = [];
    let w = 0, h = 0, cx = 0, cy = 0, frameId;

    function resize() {
      const parent = canvas.parentElement === document.body
        ? document.documentElement
        : canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      build();
    }

    function inBrainShape(x, y) {
      const nx = (x - cx) / (w * shapeScale);
      const ny = (y - cy) / (h * shapeScale);
      const r = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);
      const lobe = 0.72 + 0.28 * Math.sin(angle * 3) + 0.12 * Math.cos(angle * 5);
      const motorSlot = 0.08 * Math.sin(angle * 18);
      return r < lobe + motorSlot && r > 0.12;
    }

    function build() {
      particles = [];
      ambient = [];

      if (!ambientOnly) {
        const step = Math.max(4, Math.floor(7 / density));
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            if (inBrainShape(x, y) && Math.random() > 0.15) {
              particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                angle: Math.random() * Math.PI * 2,
                size: 1 + Math.random() * 1.5,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                phase: Math.random() * Math.PI * 2,
                drift: 0.3 + Math.random() * 0.5,
              });
            }
          }
        }

        // Stator ring accent
        const rings = [0.35, 0.55, 0.72, 0.88];
        rings.forEach((rs, li) => {
          const count = Math.floor(32 * rs * density);
          const r = Math.min(w, h) * shapeScale * rs;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            particles.push({
              x: cx + Math.cos(angle) * r,
              y: cy + Math.sin(angle) * r,
              angle: angle + Math.PI / 2,
              size: 1.5 + (li % 2) * 0.5,
              color: COLORS[(i + li) % COLORS.length],
              phase: Math.random() * Math.PI * 2,
              drift: 0.2,
            });
          }
        });
      }

      const count = Math.floor(ambientCount * density);
      for (let i = 0; i < count; i++) {
        ambient.push({
          x: Math.random() * w,
          y: Math.random() * h,
          angle: Math.random() * Math.PI * 2,
          size: 0.8 + Math.random() * 1.2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 0.08 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          drift: 0.15 + Math.random() * 0.35,
        });
      }
    }

    function triangle(x, y, size, angle, color, alpha = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const h = size * 1.15;
      ctx.moveTo(0, -h);
      ctx.lineTo(size, h * 0.55);
      ctx.lineTo(-size, h * 0.55);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      const t = reducedMotion ? 0 : time * 0.001;

      ambient.forEach((p) => {
        const ox = reducedMotion ? 0 : Math.sin(t * p.drift + p.phase) * 2;
        const oy = reducedMotion ? 0 : Math.cos(t * p.drift * 0.8 + p.phase) * 2;
        triangle(p.x + ox, p.y + oy, p.size, p.angle + t * 0.08, p.color, p.opacity);
      });

      if (!ambientOnly) {
        particles.forEach((p) => {
          const pulse = reducedMotion ? 1 : 0.75 + Math.sin(t * 1.8 + p.phase) * 0.25;
          const ox = reducedMotion ? 0 : Math.sin(t * p.drift + p.phase) * 1.5;
          const oy = reducedMotion ? 0 : Math.cos(t * p.drift * 0.7 + p.phase) * 1.5;
          triangle(
            p.x + ox, p.y + oy,
            p.size * pulse,
            p.angle + (reducedMotion ? 0 : t * 0.04),
            p.color,
            0.7
          );
        });

        if (!reducedMotion) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.2);
          g.addColorStop(0, 'rgba(128, 82, 255, 0.1)');
          g.addColorStop(0.5, 'rgba(255, 184, 41, 0.03)');
          g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }

      frameId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    frameId = requestAnimationFrame(draw);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(frameId);
      else frameId = requestAnimationFrame(draw);
    });

    return { resize };
  }

  createEngine('ambient-canvas', { ambientOnly: true, ambientCount: 200, density: 1.2 });
  createEngine('hero-canvas', { density: 1.4, shapeScale: 0.42, ambientCount: 40 });
})();
