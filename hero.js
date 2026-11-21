// Hero painting, inspired by the painted hero on Sarthak Mangla's site (sarthakmangla.com).
// Strokes land at random on an ease-out schedule, shrinking over time. Each one is a curve that follows
// the image's contours (Hertzmann '98) and samples a reference that sharpens as strokes shrink.
// The ragged border is made by the strokes themselves.
(() => {
  const SRC = '/images/hero-lighthouse.webp', BLEED = 14;
  const DURATION = 7500, TAIL = 800, FRAME_BUDGET = 10, READ_EVERY = 300;
  // Experiments, switched on with ?fx=sweep,underpaint,taper,rhythm (or ?fx=all).
  const fxParam = new URLSearchParams(location.search).get('fx') || '';
  const FX = new Set(fxParam === 'all' ? ['sweep', 'underpaint', 'taper', 'rhythm'] : fxParam.split(','));
  const LANTERN = [232, 184], RHYTHM = 650;
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

    const makeStroke = (ref, r, steps, x0, y0, alpha, tone = 1) => {
      const [rr, rg, rb] = ref.ch, lum = ref.lum, i0 = at(x0, y0);
      const c0 = rr[i0], c1 = rg[i0], c2 = rb[i0];
      // Underpainting: early strokes are a warm sepia of the same value, blooming into colour.
      const v = 0.299 * c0 + 0.587 * c1 + 0.114 * c2;
      const p0 = lerp(Math.min(255, v * 1.08 + 10), c0, tone), p1 = lerp(v * 0.96 + 4, c1, tone), p2 = lerp(v * 0.8, c2, tone);
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
        color: `rgba(${(p0 + jit) | 0},${(p1 + jit) | 0},${(p2 + jit) | 0},${alpha})`,
      };
    };

    // Taper's thin ends leave pinholes the sparser instant repaint can't close, so it is animation-only.
    const tapered = FX.has('taper') && !instant;
    const draw = (ctx, st) => {
      const p = st.pts, len = p.length;
      ctx.strokeStyle = ctx.fillStyle = st.color;
      ctx.beginPath();
      if (len === 2) { ctx.arc(p[0], p[1], st.r, 0, 6.2832); ctx.fill(); return; }
      if (tapered && !st.fill) { taper(ctx, p, st.r); return; }
      ctx.lineWidth = st.r * 2;
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < len - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
      ctx.lineTo(p[len - 2], p[len - 1]);
      ctx.stroke();
    };
    // Brush taper: the stroke as a filled outline that swells from a fine tip to full width and back.
    const taper = (ctx, p, r) => {
      const pts = p.length === 4 ? [p[0], p[1], (p[0] + p[2]) / 2, (p[1] + p[3]) / 2, p[2], p[3]] : p, N = pts.length / 2;
      const side = [];
      for (let i = 0; i < N; i++) {
        const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
        let tx = pts[2 * b] - pts[2 * a], ty = pts[2 * b + 1] - pts[2 * a + 1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const wid = r * (0.55 + 0.6 * Math.sin(Math.PI * (i + 0.5) / N) ** 0.7);
        side.push(pts[2 * i] - ty * wid, pts[2 * i + 1] + tx * wid, pts[2 * i] + ty * wid, pts[2 * i + 1] - tx * wid);
      }
      ctx.moveTo(side[0], side[1]);
      for (let i = 1; i < N; i++) ctx.lineTo(side[4 * i], side[4 * i + 1]);
      for (let i = N - 1; i >= 0; i--) ctx.lineTo(side[4 * i + 2], side[4 * i + 3]);
      ctx.closePath();
      ctx.fill();
    };
    const put = (st) => {
      draw(plan, st); draw(g, st);
      if (++sinceRead >= READ_EVERY) read();
    };

    const total = Math.round(9000 * 1.3 * 2 ** 1.6 * (w / 300) ** 0.6 * Math.min(2.5, h / w / 0.66) ** 0.8);
    const sz = (w / 300) ** 0.7;
    // Sweep: the first coat spreads outward from the lantern, as if its light reveals the scene.
    const lx = (LANTERN[0] - crop.x) / crop.w * W, ly = (LANTERN[1] - crop.y) / crop.h * H;
    const reach = Math.max(Math.hypot(lx, ly), Math.hypot(W - lx, ly), Math.hypot(lx, H - ly), Math.hypot(W - lx, H - ly));
    const smooth = (q) => { q = clamp(q, 0, 1); return q * q * (3 - 2 * q); };
    const propose = (t) => {
      const fine = lerp(Math.SQRT2, 2, t);
      const r = lerp(6, 1.6, t) * sz / fine / 2, len = lerp(16, 4, t) * sz / fine;
      let x = rand() * W, y = rand() * H;
      if (FX.has('sweep')) {
        const front = reach * lerp(0.06, 1.05, 1 - (1 - clamp(t / 0.6, 0, 1)) ** 1.4);
        for (let k = 0; k < 30 && Math.hypot(x - lx, y - ly) > front * (0.85 + 0.3 * rand()); k++) { x = rand() * W; y = rand() * H; }
      }
      const tone = FX.has('underpaint') ? smooth((t - 0.12) / 0.5) : 1;
      if (inside(x, y)) put(makeStroke(build(refFor(r)), r, len / (r * 1.3), x, y, lerp(0.55, 0.85, t), tone));
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
    const fill = (i) => { if (cur[4 * i + 3] < 230) { const st = makeStroke(build(sharpest), sharpest.r, 4, i % W, (i / W) | 0, 0.9); st.fill = true; put(st); } };

    if (instant) {
      for (let i = 0; i < total; i++) propose(sizeAt(i / total));
      for (const i of gaps()) fill(i);
      return () => {};
    }

    // Strokes are due on a gentle ease-out schedule; each frame paints what is due within a time budget,
    // so a slow device stretches the animation instead of freezing the page.
    const count = Math.round(total * REFINE);
    let made = 0, queue = null, queueTotal = 0, raf = 0, start = 0, lag = 0, cancelled = false;
    const frame = (now) => {
      if (cancelled) return;
      if (!start) start = now;
      const deadline = performance.now() + FRAME_BUDGET;
      const raw = now - start - lag;
      // Rhythm: strokes come in gentle pulses, like a painter's wrist, instead of an even stream.
      const t = FX.has('rhythm') ? raw + 0.75 * RHYTHM / 6.2832 * Math.sin(raw / RHYTHM * 6.2832) : raw;
      const p = Math.min(1, t / DURATION);
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
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }

  // Crop with the lantern on the top third line, zoomed in toward the left third only while
  // at least SEA of the frame stays sea below the horizon.
  const LANTERN = [237, 185], HORIZON = 315, SEA = 0.2;
  function frame(img, aspect) {
    const W = img.naturalWidth, H = img.naturalHeight, [lx, ly] = LANTERN;
    // Bottom edge is ly + 2/3 ch; requiring (bottom - HORIZON) >= SEA * ch bounds ch from below.
    const minCh = (HORIZON - ly) / (2 / 3 - SEA);
    const cw = Math.max(Math.min(W, H * aspect, lx * 3), Math.min(W, H * aspect, minCh * aspect)), ch = cw / aspect;
    return { x: clamp(lx - cw / 3, 0, W - cw), y: clamp(ly - ch / 3, 0, H - ch), w: cw, h: ch };
  }

  let stop = () => {};
  function init(img, instant) {
    stop();
    const w = Math.max(200, canvas.parentElement.clientWidth), aspect = cssAspect(), h = Math.round(w / aspect);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stop = paint(ctx, img, w, h, frame(img, aspect), instant);
  }

  const img = new Image();
  img.onload = () => {
    init(img, reduceMotion);
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
