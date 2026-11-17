// Hero painting, inspired by the painted hero on Sarthak Mangla's site (sarthakmangla.com).
// It is painted back to front: sky and sea over the whole canvas, then the hill, the lighthouse and its light,
// each layer over the last. Within a layer strokes land at random and shrink over time; each one is a curve
// that follows the image's contours (Hertzmann '98) and samples a reference that sharpens as strokes shrink.
// The ragged border is made by the strokes themselves.
(() => {
  const SRC = '/images/hero-lighthouse.webp', LAYERS = '/images/hero-layers.webp', FOCUS_X = 0.15, FOCUS_Y = 0.17, BLEED = 14;
  const FRAME_BUDGET = 10, READ_EVERY = 300;
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

  function paint(g, img, layers, w, h, crop, instant) {
    const W = Math.round(w), H = Math.round(h), n = W * H;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); };
    const pixels = (im) => {
      const c = mk();
      c.imageSmoothingQuality = 'high';
      c.drawImage(im, crop.x, crop.y, crop.w, crop.h, 0, 0, W, H);
      return c.getImageData(0, 0, W, H).data;
    };
    const orig = pixels(img);
    // Layer masks share the image's crop: red is the hill, green the lighthouse, blue the light.
    const lay = layers && pixels(layers);
    // Strokes are mirrored onto a 1x offscreen canvas so coverage can be read back cheaply.
    const plan = mk();
    plan.lineCap = plan.lineJoin = g.lineCap = g.lineJoin = 'round';
    const s = Math.max(0.45, w / 768);
    const tmp = new Float32Array(n);

    // The sky-and-sea plate: the image with every layer filled in from the colours beside it on the same row,
    // so the first coat can cover the whole canvas and the layers are painted over it.
    const plate = new Uint8ClampedArray(orig);
    if (lay) {
      const cov = new Float32Array(n);
      for (let i = 0; i < n; i++) cov[i] = Math.max(lay[4 * i], lay[4 * i + 1], lay[4 * i + 2]) > 10 ? 1 : 0;
      boxBlur(cov, tmp, W, H, 2);
      for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
          if (!cov[row + x]) continue;
          let e = x;
          while (e < W && cov[row + e]) e++;
          const a = x > 0 ? row + x - 1 : -1, b = e < W ? row + e : -1;
          for (let k = x; k < e; k++) {
            const f = a < 0 ? 1 : b < 0 ? 0 : (k - x + 1) / (e - x + 1);
            for (let c = 0; c < 3; c++) plate[4 * (row + k) + c] = lerp(a < 0 ? plate[4 * b + c] : plate[4 * a + c], b < 0 ? plate[4 * a + c] : plate[4 * b + c], f);
          }
          x = e;
        }
      }
      for (let c = 0; c < 3; c++) {
        const ch = new Float32Array(n);
        for (let i = 0; i < n; i++) ch[i] = plate[4 * i + c];
        boxBlur(ch, tmp, W, H, 3);
        for (let i = 0; i < n; i++) if (cov[i]) plate[4 * i + c] = ch[i];
      }
    }

    // References from soft to sharp, built on first use so no single frame pays for all of them.
    const refSet = (data) => {
      const refs = [{ r: 2.7, blur: 4 }, { r: 2.2, blur: 2 }, { r: 1.5, blur: 1 }, { r: 0.85, blur: 0 }].map(b => ({ r: b.r * s, blur: b.blur, ch: null, lum: null }));
      const build = (ref) => {
        if (ref.ch) return ref;
        ref.ch = [0, 1, 2].map(c => {
          const a = new Float32Array(n);
          for (let i = 0; i < n; i++) a[i] = data[4 * i + c];
          if (ref.blur) boxBlur(a, tmp, W, H, ref.blur);
          return a;
        });
        const [R, G, B] = ref.ch, lum = new Float32Array(n);
        for (let i = 0; i < n; i++) lum[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
        ref.lum = lum;
        return ref;
      };
      const sharpest = refs[refs.length - 1];
      return { build, sharp: () => build(sharpest), at: (r) => build(refs.find(b => r >= b.r * 1.6) || sharpest) };
    };
    const skyRefs = refSet(plate), imgRefs = refSet(orig);

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
    const propose = (set, t, x, y) => {
      const fine = lerp(Math.SQRT2, 2, t);
      const r = lerp(6, 1.6, t) * sz / fine / 2, len = lerp(16, 4, t) * sz / fine;
      if (inside(x, y)) put(makeStroke(set.at(r), r, len / (r * 1.3), x, y, lerp(0.55, 0.85, t)));
    };

    // Pixels of one mask channel, so strokes for a layer can start anywhere inside it.
    const region = (c, min) => {
      const out = [];
      if (lay) for (let i = 0; i < n; i++) if (lay[4 * i + c] >= min) out.push(i);
      return out;
    };
    const hill = region(0, 128), tower = region(1, 100), light = region(2, 60);
    const anywhere = () => [rand() * W, rand() * H];
    const within = (px) => () => { const i = px[(rand() * px.length) | 0]; return [i % W + rand() - 0.5, ((i / W) | 0) + rand() - 0.5]; };

    const easeOut = (p) => 1 - (1 - p) ** 1.6, smooth = (p) => p * p * (3 - 2 * p), linear = (p) => p;
    // A layer: `count` strokes from size t0 to t1, due over `dur` ms on the given easing.
    const layer = (set, pick, count, t0, t1, dur, ease) => ({
      dur, ease, prep: () => Math.round(count * (instant ? 0.6 : 1)),
      item: (k, c) => { const [x, y] = pick(); propose(set, lerp(t0, t1, k / c), x, y); },
    });
    // Touch-up: small sharp strokes on pixels still showing paper, or (within `px`) the layer underneath.
    const touchUp = (set, px, dur) => {
      let list;
      const off = (i) => {
        const j = 4 * i;
        if (cur[j + 3] < 230) return true;
        if (!px) return false;
        const ref = set.sharp().ch;
        return Math.hypot(cur[j] - ref[0][i], cur[j + 1] - ref[1][i], cur[j + 2] - ref[2][i]) > 50;
      };
      return {
        dur, ease: linear,
        prep: () => {
          read();
          list = [];
          const src = px || Array.from({ length: n >> 1 }, (_, k) => 2 * k);
          for (let k = 0; k < src.length; k++) { const i = src[k]; if (depth(i % W, (i / W) | 0) > m * 0.6 && off(i)) list.push(i); }
          for (let i = list.length - 1; i > 0; i--) { const k = (rand() * (i + 1)) | 0; const t = list[i]; list[i] = list[k]; list[k] = t; }
          return list.length;
        },
        item: (k) => { const i = list[k]; if (off(i)) { const ref = set.sharp(); put(makeStroke(ref, s * 0.85, 4, i % W, (i / W) | 0, 0.9)); } },
      };
    };

    const steps = [
      layer(skyRefs, anywhere, total * 0.75, 0, 0.8, 1600, easeOut), touchUp(skyRefs, null, 250),
      layer(imgRefs, within(hill), total * 1.5 * hill.length / n, 0.2, 1, 2000, smooth), touchUp(imgRefs, hill, 300),
      layer(imgRefs, within(tower), total * 8 * tower.length / n, 0.5, 1, 1300, smooth), touchUp(imgRefs, tower, 200),
      layer(imgRefs, within(light), total * 5 * light.length / n, 0.35, 1, 1200, smooth), touchUp(imgRefs, light, 200),
      touchUp(imgRefs, null, 300),
    ].filter(st => st.dur);

    if (instant) {
      for (const st of steps) for (let k = 0, c = st.prep(); k < c; k++) st.item(k, c);
      return () => {};
    }

    // Each frame paints what is due within a time budget, so a slow device stretches the animation
    // instead of freezing the page.
    let si = -1, st = null, count = 0, made = 0, start = 0, lag = 0, raf = 0, cancelled = false;
    const next = (now) => {
      st = steps[++si];
      if (!st) return false;
      count = st.prep(); made = 0; start = now; lag = 0;
      return true;
    };
    const frame = (now) => {
      if (cancelled) return;
      if (!st && !next(now)) return;
      const deadline = performance.now() + FRAME_BUDGET;
      const p = Math.min(1, (now - start - lag) / st.dur);
      const goal = Math.ceil(count * st.ease(p));
      while (made < goal && performance.now() < deadline) st.item(made++, count);
      if (made < goal) lag += 16;
      if (made >= count && !next(now)) return;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }

  let stop = () => {};
  function init(img, layers, instant) {
    stop();
    const w = Math.max(200, canvas.parentElement.clientWidth), aspect = cssAspect(), h = Math.round(w / aspect);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = Math.min(img.naturalWidth, img.naturalHeight * aspect), ch = cw / aspect;
    stop = paint(ctx, img, layers, w, h, { x: (img.naturalWidth - cw) * FOCUS_X, y: (img.naturalHeight - ch) * FOCUS_Y, w: cw, h: ch }, instant);
  }

  const load = (src) => new Promise((done) => { const im = new Image(); im.onload = () => done(im); im.onerror = () => done(null); im.src = src; });
  Promise.all([load(canvas.dataset.src || SRC), load(canvas.dataset.layers || LAYERS)]).then(([img, layers]) => {
    if (!img) return;
    init(img, layers, reduceMotion);
    let lastWidth = canvas.parentElement.clientWidth, lastAspect = cssAspect(), timer = 0;
    addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const nw = canvas.parentElement.clientWidth, na = cssAspect();
        if (Math.abs(nw - lastWidth) > 40 || na !== lastAspect) { lastWidth = nw; lastAspect = na; init(img, layers, true); }
      }, 200);
    });
  });
})();
