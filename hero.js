// Hero painting, inspired by the painted hero on Sarthak Mangla's site (sarthakmangla.com).
// Strokes land at random on an ease-out schedule, shrinking over time. Each one is a curve that follows
// the image's contours (Hertzmann '98) and samples a reference that sharpens as strokes shrink.
// The ragged border is made by the strokes themselves.
(() => {
  const SRC = '/images/hero-lighthouse.webp', FOCUS_X = 0.15, FOCUS_Y = 0.17, BLEED = 14;
  const DURATION = 7500, TAIL = 800, FRAME_BUDGET = 10, READ_EVERY = 300;
  // Hover experiments, chosen with ?hover=brush|beam|tilt|night|lens.
  const HOVER = new URLSearchParams(location.search).get('hover') || '';
  const LANTERN = [232, 184]; // in source-image pixels
  const canvas = document.getElementById('hero');
  if (!canvas) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rand = Math.random;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const cssAspect = () => {
    const [a, b = 1] = getComputedStyle(canvas).aspectRatio.split('/').map(Number);
    return a / b || 3.5;
  };

  // Two passes of a running-sum box blur on one channel, in place; `tmp` is scratch of the same size.
  function boxBlur(a, tmp, W, H, r) {
    const norm = 1 / (2 * r + 1);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) {
        const row = y * W;
        let acc = 0;
        for (let k = -r; k <= r; k++) acc += a[row + clamp(k, 0, W - 1)];
        for (let x = 0; x < W; x++) {
          tmp[row + x] = acc * norm;
          acc += a[row + Math.min(W - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let k = -r; k <= r; k++) acc += tmp[clamp(k, 0, H - 1) * W + x];
        for (let y = 0; y < H; y++) {
          a[y * W + x] = acc * norm;
          acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
        }
      }
    }
  }

  // Smooth 1D noise from a few random sines, roughly in [-1, 1], sampled once per pixel along an edge.
  function wobble(len) {
    const waves = Array.from({ length: 4 }, (_, i) => ({ f: (i + 1) * (0.8 + rand() * 0.9), p: rand() * 6.283, a: 1 / (i + 1) }));
    const norm = waves.reduce((s, q) => s + q.a, 0), out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let v = 0;
      for (const q of waves) v += q.a * Math.sin(q.f * (i / len) * 6.283 + q.p);
      out[i] = v / norm;
    }
    return out;
  }

  function paint(g, img, w, h, crop, instant) {
    const W = Math.round(w), H = Math.round(h), n = W * H;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); };
    const src = mk();
    src.imageSmoothingQuality = 'high';
    src.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, W, H);
    const orig = src.getImageData(0, 0, W, H).data;
    // Strokes are mirrored onto a 1x offscreen canvas so coverage can be read back cheaply.
    const plan = mk();
    plan.lineCap = plan.lineJoin = g.lineCap = g.lineJoin = 'round';
    const s = Math.max(0.45, w / 768);

    // References from soft to sharp, built on first use so no single frame pays for all of them.
    const tmp = new Float32Array(n);
    const refs = [{ r: 2.7, blur: 4 }, { r: 2.2, blur: 2 }, { r: 1.5, blur: 1 }, { r: 0.85, blur: 0 }].map(b => ({ r: b.r * s, blur: b.blur, ch: null, lum: null }));
    const build = (ref) => {
      if (ref.ch) return ref;
      ref.ch = [0, 1, 2].map(c => {
        const a = new Float32Array(n);
        for (let i = 0; i < n; i++) a[i] = orig[4 * i + c];
        if (ref.blur) boxBlur(a, tmp, W, H, ref.blur);
        return a;
      });
      const [R, G, B] = ref.ch, lum = new Float32Array(n);
      for (let i = 0; i < n; i++) lum[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
      ref.lum = lum;
      return ref;
    };
    const sharpest = refs[refs.length - 1];
    const refFor = (r) => refs.find(b => r >= b.r * 1.6) || sharpest;

    // Free-form border: distance inside a wobbly inset, from per-row and per-column offsets.
    const m = BLEED, amp = m * 0.35;
    const left = wobble(H), right = wobble(H), top = wobble(W), bottom = wobble(W);
    const depth = (x, y) => {
      const yi = clamp(y | 0, 0, H - 1), xi = clamp(x | 0, 0, W - 1);
      return Math.min(x - m - amp * left[yi], W - m - amp * right[yi] - x, y - m - amp * top[xi], H - m - amp * bottom[xi] - y);
    };
    const inside = (x, y) => { const d = depth(x, y); return d > m * 0.15 || rand() < Math.max(0, (d + m * 0.05) / (m * 0.2)); };

    let cur = new Uint8ClampedArray(4 * n), sinceRead = 0;
    const read = () => { cur = plan.getImageData(0, 0, W, H).data; sinceRead = 0; };
    const at = (x, y) => clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1);

    const makeStroke = (ref, r, steps, x0, y0, alpha) => {
      const [rr, rg, rb] = ref.ch, lum = ref.lum, i0 = at(x0, y0);
      const c0 = rr[i0], c1 = rg[i0], c2 = rb[i0];
      const L = (x, y) => lum[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
      const pts = [x0, y0];
      let x = x0, y = y0, ldx = 0, ldy = 0;
      const step = r * 1.3, maxSteps = Math.max(2, Math.round(steps * (0.5 + rand()))), pad = r * 1.6 + 1;
      for (let k = 1; k <= maxSteps; k++) {
        if (k > 2) {
          // Stop where the colour drifts, or where the canvas already matches better than this stroke.
          const i = at(x, y), j = 4 * i;
          const dStroke = Math.hypot(rr[i] - c0, rg[i] - c1, rb[i] - c2);
          if (dStroke > 40) break;
          if (cur[j + 3] >= 140 && Math.hypot(cur[j] - rr[i], cur[j + 1] - rg[i], cur[j + 2] - rb[i]) < dStroke) break;
        }
        const ix = Math.round(x), iy = Math.round(y);
        const gx = (L(ix + 1, iy - 1) + 2 * L(ix + 1, iy) + L(ix + 1, iy + 1)) - (L(ix - 1, iy - 1) + 2 * L(ix - 1, iy) + L(ix - 1, iy + 1));
        const gy = (L(ix - 1, iy + 1) + 2 * L(ix, iy + 1) + L(ix + 1, iy + 1)) - (L(ix - 1, iy - 1) + 2 * L(ix, iy - 1) + L(ix + 1, iy - 1));
        const mag = Math.hypot(gx, gy);
        let dx, dy;
        if (mag < 2) {
          if (ldx || ldy) { dx = ldx; dy = ldy; } else { const a = (rand() - 0.5) * 0.6; dx = Math.cos(a); dy = Math.sin(a); }
        } else {
          dx = -gy / mag; dy = gx / mag;
          if (ldx * dx + ldy * dy < 0) { dx = -dx; dy = -dy; }
        }
        const nx = x + dx * step, ny = y + dy * step;
        if (nx < pad || ny < pad || nx > W - pad || ny > H - pad || depth(nx, ny) < -m * 0.08) break;
        x = nx; y = ny; ldx = dx; ldy = dy;
        pts.push(x, y);
      }
      const jit = (rand() - 0.5) * 10, edge = clamp(depth(x0, y0) / m, 0, 1);
      return {
        pts,
        r: r * (0.75 + 0.5 * rand()) * lerp(0.45, 1, edge),
        color: `rgba(${(c0 + jit) | 0},${(c1 + jit) | 0},${(c2 + jit) | 0},${alpha})`,
      };
    };

    const draw = (ctx, st) => {
      const p = st.pts, len = p.length;
      ctx.strokeStyle = ctx.fillStyle = st.color;
      ctx.beginPath();
      if (len === 2) { ctx.arc(p[0], p[1], st.r, 0, 6.2832); ctx.fill(); return; }
      ctx.lineWidth = st.r * 2;
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < len - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
      ctx.lineTo(p[len - 2], p[len - 1]);
      ctx.stroke();
    };
    const put = (st) => {
      draw(plan, st); draw(g, st);
      if (++sinceRead >= READ_EVERY) read();
    };

    const total = Math.round(9000 * 1.3 * 2 ** 1.6 * (w / 300) ** 0.6 * Math.min(2.5, h / w / 0.66) ** 0.8);
    const sz = (w / 300) ** 0.7;
    const propose = (t) => {
      const fine = lerp(Math.SQRT2, 2, t);
      const r = lerp(6, 1.6, t) * sz / fine / 2, len = lerp(16, 4, t) * sz / fine;
      const x = rand() * W, y = rand() * H;
      if (inside(x, y)) put(makeStroke(build(refFor(r)), r, len / (r * 1.3), x, y, lerp(0.55, 0.85, t)));
    };
    // The first COAT_SHARE of strokes lays the coat (sizes up to COAT); the rest repaint over it,
    // so the animation adds REFINE times more strokes, all of them refining edges.
    const COAT = 0.35, COAT_SHARE = 0.2, REFINE = 1.6;
    const sizeAt = (u) => (u < COAT_SHARE ? u / COAT_SHARE * COAT : lerp(COAT, 1, (u - COAT_SHARE) / (1 - COAT_SHARE)));

    // Pixels still showing paper well inside the border, in random order.
    const gaps = () => {
      read();
      const out = [];
      for (let i = 0; i < n; i += 2) if (cur[4 * i + 3] < 230 && depth(i % W, (i / W) | 0) > m * 0.6) out.push(i);
      for (let i = out.length - 1; i > 0; i--) { const k = (rand() * (i + 1)) | 0; const t = out[i]; out[i] = out[k]; out[k] = t; }
      return out;
    };
    const fill = (i) => { if (cur[4 * i + 3] < 230) put(makeStroke(build(sharpest), sharpest.r, 4, i % W, (i / W) | 0, 0.9)); };

    // Brush hover: loose strokes stir the paint under the pointer, then fine ones settle it again.
    const touches = [];
    let touchRaf = 0;
    const dab = (x, y, t, spread) => {
      const a = rand() * 6.2832, d = spread * Math.sqrt(rand());
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const fine = lerp(Math.SQRT2, 2, t), r = lerp(6, 1.6, t) * sz / fine / 2, len = lerp(16, 4, t) * sz / fine;
      if (depth(px, py) > m * 0.5) put(makeStroke(build(refFor(r)), r, len / (r * 1.3), px, py, lerp(0.55, 0.85, t)));
    };
    const pump = (now) => {
      touchRaf = 0;
      const deadline = performance.now() + 4;
      while (touches.length && touches[0].due <= now && performance.now() < deadline) { const q = touches.shift(); dab(q.x, q.y, q.t, q.spread); }
      if (touches.length) touchRaf = requestAnimationFrame(pump);
    };
    const touch = (x, y) => {
      const now = performance.now(), R = 30 * sz;
      for (let k = 0; k < 9; k++) touches.push({ x, y, t: lerp(0, 0.3, rand()), spread: R, due: now + rand() * 60 });
      for (let k = 0; k < 30; k++) touches.push({ x, y, t: lerp(0.75, 1, rand()), spread: R * 1.2, due: now + 350 + rand() * 1200 });
      touches.sort((a, b) => a.due - b.due);
      if (touches.length > 4000) touches.splice(0, touches.length - 4000);
      if (!touchRaf) touchRaf = requestAnimationFrame(pump);
    };

    if (instant) {
      for (let i = 0; i < total; i++) propose(sizeAt(i / total));
      for (const i of gaps()) fill(i);
      return Object.assign(() => cancelAnimationFrame(touchRaf), { touch });
    }

    // Strokes are due on a gentle ease-out schedule; each frame paints what is due within a time budget,
    // so a slow device stretches the animation instead of freezing the page.
    const count = Math.round(total * REFINE);
    let made = 0, queue = null, queueTotal = 0, raf = 0, start = 0, lag = 0, cancelled = false;
    const frame = (now) => {
      if (cancelled) return;
      if (!start) start = now;
      const deadline = performance.now() + FRAME_BUDGET;
      const t = now - start - lag, p = Math.min(1, t / DURATION);
      const goal = Math.floor(count * (1 - (1 - p) ** 1.28));
      while (made < goal && performance.now() < deadline) {
        for (const end = Math.min(goal, made + 16); made < end; made++) propose(sizeAt(made / count));
      }
      if (made < goal) lag += 16;
      if (made < count) { raf = requestAnimationFrame(frame); return; }
      // Tail: small sharp strokes on remaining specks of paper, spread over a few frames.
      if (!queue) { queue = gaps(); queueTotal = queue.length; start = now; lag = 0; }
      const q = Math.min(1, (now - start) / TAIL);
      const keep = Math.ceil(queueTotal * (1 - q * q * (3 - 2 * q)));
      while (queue.length > keep && performance.now() < deadline) fill(queue.pop());
      if (queue.length) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return Object.assign(() => { cancelled = true; cancelAnimationFrame(raf); cancelAnimationFrame(touchRaf); }, { touch });
  }

  let stop = () => {}, geom = null;
  function init(img, instant) {
    stop();
    const w = Math.max(200, canvas.parentElement.clientWidth), aspect = cssAspect(), h = Math.round(w / aspect);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = Math.min(img.naturalWidth, img.naturalHeight * aspect), ch = cw / aspect;
    const crop = { x: (img.naturalWidth - cw) * FOCUS_X, y: (img.naturalHeight - ch) * FOCUS_Y, w: cw, h: ch };
    geom = { w, h, crop, lx: (LANTERN[0] - crop.x) / crop.w * w, ly: (LANTERN[1] - crop.y) / crop.h * h };
    stop = paint(ctx, img, w, h, crop, instant);
    if (overlay) { overlay.width = canvas.width; overlay.height = canvas.height; }
  }

  // Overlay for the light and lens effects, stacked exactly on the painting.
  let overlay = null;
  if (['beam', 'night', 'lens'].includes(HOVER)) {
    overlay = document.createElement('canvas');
    overlay.className = 'hero-fx';
    overlay.setAttribute('aria-hidden', 'true');
    canvas.after(overlay);
  }
  document.documentElement.dataset.heroHover = HOVER;

  function hover(img) {
    if (!HOVER || !matchMedia('(hover: hover)').matches) return;
    const octx = overlay && overlay.getContext('2d');
    let px = 0, py = 0, raf = 0, last = 0;
    const local = (e) => { const r = canvas.getBoundingClientRect(); px = (e.clientX - r.left) * geom.w / r.width; py = (e.clientY - r.top) * geom.h / r.height; };
    const begin = () => { octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, geom.w, geom.h); };

    const render = {
      // A second, softer beam that swings from the lantern toward the pointer.
      beam() {
        begin();
        const { lx, ly, w } = geom, a = Math.atan2(py - ly, px - lx), L = Math.max(w * 0.7, Math.hypot(px - lx, py - ly) * 1.4);
        octx.filter = 'blur(6px)';
        const grad = octx.createLinearGradient(lx, ly, lx + Math.cos(a) * L, ly + Math.sin(a) * L);
        grad.addColorStop(0, 'rgba(255, 226, 170, .75)'); grad.addColorStop(0.35, 'rgba(255, 205, 140, .28)'); grad.addColorStop(1, 'rgba(255, 190, 120, 0)');
        octx.fillStyle = grad;
        octx.beginPath(); octx.moveTo(lx, ly);
        octx.arc(lx, ly, L, a - 0.07, a + 0.07); octx.closePath(); octx.fill();
        const glow = octx.createRadialGradient(lx, ly, 0, lx, ly, 26 * w / 800);
        glow.addColorStop(0, 'rgba(255, 236, 190, .9)'); glow.addColorStop(1, 'rgba(255, 210, 150, 0)');
        octx.fillStyle = glow; octx.fillRect(0, 0, geom.w, geom.h);
        octx.filter = 'none';
        clipToPaint();
      },
      // Dusk deepens (a CSS filter on the painting) while the lantern swells.
      night() {
        begin();
        const { lx, ly, w } = geom, R = 80 * w / 800;
        const glow = octx.createRadialGradient(lx, ly, 0, lx, ly, R);
        glow.addColorStop(0, 'rgba(255, 228, 170, .95)'); glow.addColorStop(0.12, 'rgba(255, 196, 120, .55)'); glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
        octx.fillStyle = glow; octx.fillRect(0, 0, geom.w, geom.h);
        const beam = octx.createLinearGradient(lx, ly, lx + w * 0.4, ly);
        beam.addColorStop(0, 'rgba(255, 220, 160, .45)'); beam.addColorStop(1, 'rgba(255, 200, 140, 0)');
        octx.filter = 'blur(5px)'; octx.fillStyle = beam;
        octx.beginPath(); octx.moveTo(lx, ly); octx.arc(lx, ly, w * 0.4, -0.06, 0.06); octx.closePath(); octx.fill();
        octx.filter = 'none';
        clipToPaint();
      },
      // A loupe: the photograph underneath, magnified, in a small soft-rimmed circle.
      lens() {
        begin();
        const { crop, w, h } = geom, R = 52 * w / 800, Z = 1.8;
        const sx = crop.x + px / w * crop.w, sy = crop.y + py / h * crop.h, sw = R * 2 / w * crop.w / Z, sh = R * 2 / h * crop.h / Z;
        octx.save();
        octx.beginPath(); octx.arc(px, py, R, 0, 6.2832); octx.clip();
        octx.drawImage(img, sx - sw / 2, sy - sh / 2, sw, sh, px - R, py - R, R * 2, R * 2);
        const rim = octx.createRadialGradient(px, py, R * 0.8, px, py, R);
        rim.addColorStop(0, 'rgba(30, 20, 15, 0)'); rim.addColorStop(1, 'rgba(30, 20, 15, .28)');
        octx.fillStyle = rim; octx.fillRect(px - R, py - R, R * 2, R * 2);
        octx.restore();
        octx.beginPath(); octx.arc(px, py, R - 0.5, 0, 6.2832);
        octx.strokeStyle = 'rgba(255, 248, 240, .55)'; octx.lineWidth = 1; octx.stroke();
        clipToPaint();
      },
    };
    const clipToPaint = () => {
      octx.save(); octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalCompositeOperation = 'destination-in'; octx.drawImage(canvas, 0, 0);
      octx.restore();
    };

    const tick = () => { raf = 0; if (render[HOVER]) render[HOVER](); };
    canvas.parentElement.addEventListener('pointerenter', (e) => {
      local(e); canvas.parentElement.classList.add('is-hover');
      if (render[HOVER] && !raf) raf = requestAnimationFrame(tick);
    });
    canvas.parentElement.addEventListener('pointerleave', () => {
      canvas.parentElement.classList.remove('is-hover');
      if (HOVER === 'tilt') canvas.style.transform = '';
    });
    canvas.parentElement.addEventListener('pointermove', (e) => {
      local(e);
      if (HOVER === 'brush') {
        const now = performance.now();
        if (now - last > 30) { last = now; stop.touch && stop.touch(px, py); }
      } else if (HOVER === 'tilt') {
        const nx = px / geom.w - 0.5, ny = py / geom.h - 0.5;
        canvas.style.transform = `rotateX(${(-ny * 5).toFixed(2)}deg) rotateY(${(nx * 4).toFixed(2)}deg)`;
        canvas.style.setProperty('--sx', `${(-nx * 10).toFixed(1)}px`); canvas.style.setProperty('--sy', `${(6 - ny * 8).toFixed(1)}px`);
      }
      if (render[HOVER] && HOVER !== 'night' && !raf) raf = requestAnimationFrame(tick);
    });
  }

  const img = new Image();
  img.onload = () => {
    init(img, reduceMotion);
    hover(img);
    let lastWidth = canvas.parentElement.clientWidth, lastAspect = cssAspect(), timer = 0;
    addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const nw = canvas.parentElement.clientWidth, na = cssAspect();
        if (Math.abs(nw - lastWidth) > 40 || na !== lastAspect) { lastWidth = nw; lastAspect = na; init(img, true); }
      }, 200);
    });
  };
  img.src = canvas.dataset.src || SRC;
})();
