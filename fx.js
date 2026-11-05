/* Cursor + click effects.
   - A glowing comet trail follows the mouse (orange → pink → purple), shedding sparks.
   - A ring follows with a little lag and swells over anything clickable.
   - Clicks fire a shockwave plus a burst of sparks.
   - Cards/buttons get a spotlight under the cursor and buttons gently lean toward it. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const cv = document.getElementById('fx'), g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();

  const rnd = (a, b) => a + Math.random() * (b - a);
  const CLICKABLE = 'a, button, .tile, .tab, .chip, li[data-smoke], .due-row, .up-row, .course-card, input';
  const SPOT = '.card, .tile, .due-row, .up-row, .course-card, .tab, .chip';
  const MAGNET = '.tile, .tab, .chip, .course-card';

  // glow sprites in a few warm/cool colors
  const cols = [[255, 140, 60], [255, 90, 160], [190, 110, 255], [255, 210, 160]];
  const sprites = cols.map(([r, gg, b]) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(255,255,255,1)`); gr.addColorStop(.18, `rgba(${r},${gg},${b},.95)`);
    gr.addColorStop(.5, `rgba(${r},${gg},${b},.3)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
  });
  const spr = () => sprites[(Math.random() * sprites.length) | 0];

  const mouse = { x: -200, y: -200, on: false, hot: false };
  const ring = { x: -200, y: -200, r: 14 };
  const trail = [], sparks = [], rings = [];
  let lastMove = 0;

  function emitSpark(x, y, vx, vy, life, size) {
    sparks.push({ x, y, vx, vy, life, age: 0, size, s: spr() });
    if (sparks.length > 700) sparks.splice(0, sparks.length - 700);
  }

  /* ----- pointer ----- */
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const px = mouse.x, py = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; lastMove = performance.now();
    mouse.hot = !!(e.target.closest && e.target.closest(CLICKABLE));
    trail.push({ x: e.clientX, y: e.clientY, t: lastMove });
    if (!reduce) {
      const sp = Math.hypot(e.clientX - px, e.clientY - py);
      const n = Math.min(3, (sp / 14) | 0);
      for (let i = 0; i < n; i++) emitSpark(e.clientX + rnd(-3, 3), e.clientY + rnd(-3, 3), rnd(-30, 30), rnd(-50, 10), rnd(.45, .9), rnd(5, 10));
    }
    // spotlight + magnet
    const sp = e.target.closest && e.target.closest(SPOT);
    if (sp) { const r = sp.getBoundingClientRect(); sp.style.setProperty('--mx', (e.clientX - r.left) + 'px'); sp.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    const mg = e.target.closest && e.target.closest(MAGNET);
    if (mg) {
      const r = mg.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      mg.style.setProperty('--tx', (dx * 8).toFixed(1) + 'px'); mg.style.setProperty('--ty', (dy * 6).toFixed(1) + 'px');
    }
  }, { passive: true });
  document.addEventListener('pointerout', e => {
    const mg = e.target.closest && e.target.closest(MAGNET);
    if (mg) { mg.style.setProperty('--tx', '0px'); mg.style.setProperty('--ty', '0px'); }
  });
  document.addEventListener('pointerleave', () => { mouse.on = false; });

  /* ----- click burst ----- */
  function burst(x, y) {
    const t = performance.now();
    rings.push({ x, y, t, d: 0, max: 90, w: 3.5, c: '255,110,190' });
    rings.push({ x, y, t, d: 0.09, max: 150, w: 2, c: '255,150,70' });
    rings.push({ x, y, t, d: 0.04, max: 46, w: 5, c: '255,255,255', flash: true });
    if (reduce) return;
    for (let i = 0; i < 34; i++) {
      const a = rnd(0, 6.283), v = rnd(110, 460);
      emitSpark(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(.55, 1.3), rnd(6, 14));
    }
  }
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') burst(e.clientX, e.clientY); }, true);
  window.fxBurst = burst;

  /* ----- draw ----- */
  const TRAIL_MS = 520;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';

    // comet trail
    while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();
    if (!reduce) for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i], age = (now - b.t) / TRAIL_MS, k = 1 - age;
      g.strokeStyle = `hsla(${385 - age * 120}, 100%, ${54 + k * 8}%, ${k * 0.6})`;
      g.lineWidth = 1.5 + k * 7;
      g.shadowColor = `hsla(${385 - age * 120}, 100%, 60%, 1)`; g.shadowBlur = 14 * k;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    g.shadowBlur = 0;

    // sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.age += dt;
      if (p.age >= p.life) { sparks.splice(i, 1); continue; }
      const k = 1 - p.age / p.life, f = Math.pow(0.05, dt);
      p.vx *= f; p.vy = p.vy * f + 150 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const r = p.size * (0.4 + k);
      g.globalAlpha = Math.min(1, k * 1.4);
      g.drawImage(p.s, p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;

    // shockwaves
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i], t = (now - r.t) / 1000 - r.d;
      if (t < 0) continue;
      const dur = 0.65, q = t / dur;
      if (q >= 1) { rings.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - q, 3);
      if (r.flash) {
        const rad = r.max * (0.4 + e), gr = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad);
        gr.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - q)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(r.x, r.y, rad, 0, 6.283); g.fill(); continue;
      }
      g.strokeStyle = `rgba(${r.c},${0.9 * (1 - q)})`; g.lineWidth = r.w * (1 - q) + 0.4;
      g.shadowColor = `rgba(${r.c},1)`; g.shadowBlur = 16;
      g.beginPath(); g.arc(r.x, r.y, r.max * e, 0, 6.283); g.stroke();
    }
    g.shadowBlur = 0;

    // follower ring + core dot
    if (mouse.on) {
      ring.x += (mouse.x - ring.x) * Math.min(1, dt * 14); ring.y += (mouse.y - ring.y) * Math.min(1, dt * 14);
      const target = mouse.hot ? 24 : 13; ring.r += (target - ring.r) * Math.min(1, dt * 12);
      g.strokeStyle = mouse.hot ? 'rgba(255,150,90,.95)' : 'rgba(200,150,255,.8)'; g.lineWidth = mouse.hot ? 2.2 : 1.6;
      g.shadowColor = mouse.hot ? 'rgba(255,120,60,1)' : 'rgba(170,110,255,1)'; g.shadowBlur = 14;
      g.beginPath(); g.arc(ring.x, ring.y, ring.r, 0, 6.283); g.stroke();
      g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath(); g.arc(mouse.x, mouse.y, 2.2, 0, 6.283); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  if (fine) requestAnimationFrame(frame);
})();
