/**
 * UI polish — scroll ink, cursor sparks, energize click, form mailto
 */

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ——— Scroll progress ink ——— */
  const ink = document.getElementById('scroll-ink');
  function updateInk() {
    if (!ink) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    ink.style.transform = `scaleY(${p})`;
  }
  window.addEventListener('scroll', updateInk, { passive: true });
  window.addEventListener('resize', updateInk);
  updateInk();

  /* ——— Shape chip electric wipe ——— */
  const chip = document.getElementById('shape-chip');
  const SHAPE_NAMES = ['Motor stator', 'Generator', 'Lightning', 'Transformer', 'Spark burst'];
  let chipTimer;
  window.addEventListener('constellation-shape', (e) => {
    if (!chip) return;
    const name = SHAPE_NAMES[e.detail.shape] || '';
    chip.classList.remove('is-on', 'is-wipe');
    void chip.offsetWidth;
    chip.textContent = name;
    chip.classList.add('is-wipe', 'is-on');
    clearTimeout(chipTimer);
    chipTimer = setTimeout(() => chip.classList.remove('is-on'), 1800);
  });

  /* ——— Magnetic cursor spark trail ——— */
  const trail = document.getElementById('cursor-trail');
  if (trail && finePointer && !reduced) {
    const sparks = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span');
      s.className = 'cursor-spark';
      trail.appendChild(s);
      sparks.push({ el: s, x: 0, y: 0 });
    }
    let mx = -100, my = -100;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    function tickTrail() {
      let px = mx, py = my;
      sparks.forEach((s, i) => {
        s.x += (px - s.x) * (0.28 - i * 0.018);
        s.y += (py - s.y) * (0.28 - i * 0.018);
        const scale = 1 - i * 0.08;
        s.el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${scale})`;
        s.el.style.opacity = String(0.85 - i * 0.07);
        px = s.x;
        py = s.y;
      });
      requestAnimationFrame(tickTrail);
    }
    tickTrail();
  }

  /* ——— Optional energize click sound (muted by default) ——— */
  const soundBtn = document.getElementById('sound-toggle');
  let soundOn = false;
  let audioCtx = null;

  function playEnergize() {
    if (!soundOn || reduced) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t0);
      osc.frequency.exponentialRampToValueAtTime(920, t0 + 0.06);
      osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.18);
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 4;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.045, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    } catch (_) { /* ignore */ }
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.classList.toggle('is-on', soundOn);
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
      if (soundOn) playEnergize();
    });
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, select, textarea, label')) return;
    playEnergize();
  });

  /* ——— Contact form → mailto ——— */
  const form = document.getElementById('enquiry-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const phone = (fd.get('phone') || '').toString().trim();
      const service = (fd.get('service') || '').toString().trim();
      const message = (fd.get('message') || '').toString().trim();
      const subject = encodeURIComponent(`Enquiry from ${name || 'website'} — ${service || 'General'}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${service}\n\n${message}`
      );
      window.location.href = `mailto:lalsmws315@gmail.com?subject=${subject}&body=${body}`;
    });
  }
})();
