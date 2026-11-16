// Real-time oil-paint stylization of a photo (WebGL2).
//   1. grade + crop the photo into a working-resolution texture
//   2. structure tensor -> smoothed -> per-pixel stroke direction and anisotropy
//   3. anisotropic Kuwahara filter (Kyprianidis et al.) for flat, painterly colour masses
//   4. line integral convolution along the stroke direction: smeared colour,
//      bristle/stroke height map, and a per-stroke paint-in order
//   5. per frame: light the height map (impasto) and reveal strokes over time
// Heavy passes run once; only step 5 runs per frame.
window.createOilHero = function createOilHero(canvas, img, opts) {
  const { aspect, focusY = 0.5, duration = 3800, onDone } = opts;
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.max(200, canvas.parentElement.clientWidth), cssH = Math.round(cssW / aspect);
  const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
  canvas.width = W; canvas.height = H;
  const workW = Math.min(1100, W), workH = Math.round(workW / aspect);
  const strokeScale = workW / 900;

  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const COMMON = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  uniform vec2 uRes;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  `;

  const FS_GRADE = COMMON + `
  uniform sampler2D uSrc; uniform vec4 uCrop;
  void main() {
    vec3 c = texture(uSrc, uCrop.xy + uv * uCrop.zw).rgb;
    vec2 px = uv * uRes;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 1.22);
    c += (1.0 - l) * (1.0 - l) * vec3(0.035, 0.0, 0.03);
    c += (vnoise(px / 46.0) - 0.5) * vec3(0.08, 0.04, 0.09);
    c += (vnoise(px / 90.0 + 19.0) - 0.5) * vec3(0.06, 0.03, -0.04);
    c += (vnoise(px / 13.0 + 7.1) - 0.5) * 0.025;
    o = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;

  const FS_TENSOR = COMMON + `
  uniform sampler2D uSrc;
  vec3 S(float x, float y) { return texture(uSrc, uv + vec2(x, y) / uRes).rgb; }
  void main() {
    vec3 gx = (-S(-1.,-1.) - 2.*S(-1.,0.) - S(-1.,1.) + S(1.,-1.) + 2.*S(1.,0.) + S(1.,1.)) / 4.0;
    vec3 gy = (-S(-1.,-1.) - 2.*S(0.,-1.) - S(1.,-1.) + S(-1.,1.) + 2.*S(0.,1.) + S(1.,1.)) / 4.0;
    o = vec4(dot(gx, gx), dot(gx, gy), dot(gy, gy), 1.0);
  }`;

  const FS_BLUR = COMMON + `
  uniform sampler2D uSrc; uniform vec2 uDir; uniform float uSigma;
  void main() {
    vec4 sum = vec4(0.0); float wsum = 0.0;
    int r = int(ceil(2.5 * uSigma));
    for (int i = -12; i <= 12; i++) {
      if (abs(i) > r) continue;
      float w = exp(-float(i * i) / (2.0 * uSigma * uSigma));
      sum += w * texture(uSrc, uv + uDir * float(i) / uRes); wsum += w;
    }
    o = sum / wsum;
  }`;

  // Stroke tangent + anisotropy. Where the photo is flat (skies) there is no reliable
  // direction, so fall back to gently wavy horizontal strokes.
  const FS_FLOW = COMMON + `
  uniform sampler2D uSrc;
  void main() {
    vec3 g = texture(uSrc, uv).xyz;
    float E = g.x, F = g.y, G = g.z;
    float d = sqrt(max(0.0, (E - G) * (E - G) + 4.0 * F * F));
    float l1 = 0.5 * (E + G + d), l2 = 0.5 * (E + G - d);
    vec2 t = vec2(l1 - E, -F);
    t = length(t) > 1e-7 ? normalize(t) : vec2(0.0, 1.0);
    float A = l1 + l2 > 1e-7 ? (l1 - l2) / (l1 + l2) : 0.0;
    vec2 px = uv * uRes;
    float ang = (vnoise(px / vec2(200.0, 80.0)) - 0.5) * 0.55 + (vnoise(px / 60.0 + 3.0) - 0.5) * 0.2;
    vec2 t0 = vec2(cos(ang), sin(ang));
    float s = smoothstep(0.00025, 0.004, l1);
    if (dot(t, t0) < 0.0) t = -t;
    t = normalize(mix(t0, t, s));
    A = mix(0.7, A, s);
    o = vec4(t, A, s);
  }`;

  const FS_KUWAHARA = COMMON + `
  uniform sampler2D uSrc, uFlow; uniform float uRadius;
  const float HARD = 8.0, SHARP = 8.0, ALPHA = 1.0, ZERO_CROSS = 0.58, ZETA_K = 2.0;
  void main() {
    vec4 f = texture(uFlow, uv);
    vec2 t = f.xy; float A = f.z;
    float a = uRadius * clamp((ALPHA + A) / ALPHA, 0.1, 2.0);
    float b = uRadius * clamp(ALPHA / (ALPHA + A), 0.1, 2.0);
    float cp = t.x, sp = t.y;
    mat2 R = mat2(cp, -sp, sp, cp);
    mat2 SR = mat2(0.5 / a, 0.0, 0.0, 0.5 / b) * R;
    int mx = int(sqrt(a * a * cp * cp + b * b * sp * sp));
    int my = int(sqrt(a * a * sp * sp + b * b * cp * cp));
    float zeta = ZETA_K / uRadius;
    float sinZ = sin(ZERO_CROSS);
    float eta = (zeta + cos(ZERO_CROSS)) / (sinZ * sinZ);
    vec4 m[8]; vec3 s[8];
    for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s[k] = vec3(0.0); }
    for (int j = -20; j <= 20; j++) {
      if (abs(j) > my) continue;
      for (int i = -20; i <= 20; i++) {
        if (abs(i) > mx) continue;
        vec2 v = SR * vec2(float(i), float(j));
        if (dot(v, v) > 0.25) continue;
        vec3 c = texture(uSrc, uv + vec2(float(i), float(j)) / uRes).rgb;
        float w[8]; float sum = 0.0, z, vxx, vyy;
        vxx = zeta - eta * v.x * v.x; vyy = zeta - eta * v.y * v.y;
        z = max(0.0, v.y + vxx);  w[0] = z * z; sum += w[0];
        z = max(0.0, -v.x + vyy); w[2] = z * z; sum += w[2];
        z = max(0.0, -v.y + vxx); w[4] = z * z; sum += w[4];
        z = max(0.0, v.x + vyy);  w[6] = z * z; sum += w[6];
        vec2 v2 = 0.70710678 * vec2(v.x - v.y, v.x + v.y);
        vxx = zeta - eta * v2.x * v2.x; vyy = zeta - eta * v2.y * v2.y;
        z = max(0.0, v2.y + vxx);  w[1] = z * z; sum += w[1];
        z = max(0.0, -v2.x + vyy); w[3] = z * z; sum += w[3];
        z = max(0.0, -v2.y + vxx); w[5] = z * z; sum += w[5];
        z = max(0.0, v2.x + vyy);  w[7] = z * z; sum += w[7];
        float g = exp(-3.125 * dot(v, v)) / max(sum, 1e-6);
        for (int k = 0; k < 8; k++) {
          float wk = w[k] * g;
          m[k] += vec4(c * wk, wk);
          s[k] += c * c * wk;
        }
      }
    }
    // Weight sectors relative to the calmest one so high-variance spots (moon, lamp)
    // don't underflow to black.
    vec3 means[8]; float sig[8]; float minSig = 1e9;
    for (int k = 0; k < 8; k++) {
      means[k] = m[k].w > 0.0 ? m[k].rgb / m[k].w : vec3(0.0);
      vec3 var = m[k].w > 0.0 ? abs(s[k] / m[k].w - means[k] * means[k]) : vec3(1e3);
      sig[k] = var.r + var.g + var.b;
      minSig = min(minSig, sig[k]);
    }
    vec4 acc = vec4(0.0);
    for (int k = 0; k < 8; k++) {
      if (m[k].w <= 0.0) continue;
      float wk = 1.0 / (1.0 + pow(HARD * 1000.0 * max(0.0, sig[k] - minSig), 0.5 * SHARP));
      acc += vec4(means[k] * wk, wk);
    }
    o = vec4(acc.rgb / acc.w, 1.0);
  }`;

  // Line integral convolution along the stroke field. uMode 0 -> smeared colour with
  // per-stroke jitter; uMode 1 -> (height, paint-in order).
  const FS_LIC = COMMON + `
  uniform sampler2D uSrc, uFlow; uniform int uMode; uniform float uLen, uScale;
  void main() {
    vec2 px0 = uv * uRes;
    vec3 col = vec3(0.0); float cw = 0.0;
    float bristle = 0.0, stroke = 0.0, jit = 0.0, hue = 0.0, order = 0.0, nw = 0.0;
    float cell = 9.0 * uScale;
    for (int dirSign = 0; dirSign < 2; dirSign++) {
      vec2 p = px0;
      vec2 prev = texture(uFlow, uv).xy * (dirSign == 0 ? 1.0 : -1.0);
      for (int i = 0; i < 40; i++) {
        float fi = float(i);
        if (fi > uLen) break;
        if (dirSign == 1 && i == 0) { vec2 t = texture(uFlow, p / uRes).xy; prev = -t; p += prev; continue; }
        float w = exp(-fi * fi / (0.5 * uLen * uLen));
        if (uMode == 0) {
          if (fi < uLen * 0.3) { float wc = exp(-fi * fi / (0.02 * uLen * uLen + 1.0)); col += texture(uSrc, p / uRes).rgb * wc; cw += wc; }
          jit += w * hash(floor(p / cell) + 11.0);
          hue += w * hash(floor(p / (cell * 1.6)) + 29.0);
        } else {
          bristle += w * hash(floor(p * 0.5));
          stroke += w * hash(floor(p / cell));
          order += w * vnoise(p / (cell * 2.2) + 53.0);
        }
        nw += w;
        vec2 t = texture(uFlow, p / uRes).xy;
        if (dot(t, prev) < 0.0) t = -t;
        prev = t;
        p += t;
      }
    }
    if (uMode == 0) {
      vec3 c = col / max(cw, 1e-6);
      float j = clamp((jit / nw - 0.5) * 2.6, -1.0, 1.0), h = clamp((hue / nw - 0.5) * 2.6, -1.0, 1.0);
      c *= 1.0 + 0.075 * j;
      c += vec3(0.035, 0.0, -0.03) * h;
      o = vec4(clamp(c, 0.0, 1.0), 1.0);
    } else {
      float b = clamp((bristle / nw - 0.5) * 3.0 + 0.5, 0.0, 1.0);
      float s = clamp((stroke / nw - 0.5) * 2.6 + 0.5, 0.0, 1.0);
      float ord = clamp((order / nw - 0.5) * 2.0 + 0.5, 0.0, 1.0);
      ord = clamp(0.55 * ord + 0.45 * (1.0 - uv.y) + 0.08 * (s - 0.5), 0.0, 1.0);
      o = vec4(0.75 * s + 0.25 * b, ord, s, 1.0);
    }
  }`;

  const FS_FINAL = COMMON + `
  uniform sampler2D uPaint, uHeight; uniform vec2 uWork;
  uniform vec3 uLightDir; uniform vec3 uLightPos; uniform float uPoint, uProgress, uBump;
  void main() {
    vec2 tx = 1.0 / uWork;
    vec3 c = texture(uPaint, uv).rgb;
    vec4 hs = texture(uHeight, uv);
    vec2 frag = uv * uRes;
    float weave = 0.5 + 0.25 * (sin(frag.x * 1.9) + sin(frag.y * 1.9));
    float hx = texture(uHeight, uv + vec2(tx.x, 0)).r - texture(uHeight, uv - vec2(tx.x, 0)).r;
    float hy = texture(uHeight, uv + vec2(0, tx.y)).r - texture(uHeight, uv - vec2(0, tx.y)).r;
    vec3 n = normalize(vec3(-hx * uBump, -hy * uBump, 1.0));
    vec3 Lp = normalize(vec3(uLightPos.xy - frag, uLightPos.z));
    vec3 L = normalize(mix(normalize(uLightDir), Lp, uPoint));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0, 0, 1)), 0.0), 28.0);
    float near = uPoint * exp(-dot(uLightPos.xy - frag, uLightPos.xy - frag) / (uRes.x * uRes.x * 0.05));
    vec3 col = c * (0.8 + 0.32 * diff) + spec * (0.07 + 0.3 * near) * vec3(1.0, 0.96, 0.88);
    col *= 0.985 + 0.03 * weave;
    float edge = hs.g;
    float reveal = smoothstep(edge - 0.035, edge, uProgress * 1.12 - 0.06);
    o = vec4(col * reveal, reveal);
  }`;

  const compile = (type, src) => {
    const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VS);
  const program = (fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  let P;
  try {
    P = {
      grade: program(FS_GRADE), tensor: program(FS_TENSOR), blur: program(FS_BLUR), flow: program(FS_FLOW),
      kuwahara: program(FS_KUWAHARA), lic: program(FS_LIC), final: program(FS_FINAL),
    };
  } catch (e) {
    console.warn('oil hero disabled:', e.message);
    return null;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = (w, h, internal, format, type, data) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (data) gl.texImage2D(gl.TEXTURE_2D, 0, internal, format, type, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    return t;
  };
  const target = (internal = gl.RGBA16F, type = gl.HALF_FLOAT) => {
    const tex = texture(workW, workH, internal, gl.RGBA, type);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  };
  const run = (prog, out, textures, uniforms, res = [workW, workH]) => {
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    gl.viewport(0, 0, res[0], res[1]);
    let unit = 0;
    for (const [name, tex] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(prog, name), unit++);
    }
    gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), res[0], res[1]);
    for (const [name, v] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(prog, name);
      if (Number.isInteger(v) && name === 'uMode') gl.uniform1i(loc, v);
      else if (typeof v === 'number') gl.uniform1f(loc, v);
      else gl[`uniform${v.length}f`](loc, ...v);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const src = texture(0, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
  const cw = Math.min(img.naturalWidth, img.naturalHeight * aspect), chh = cw / aspect;
  const cropX = (img.naturalWidth - cw) / 2 / img.naturalWidth;
  const cropTop = (img.naturalHeight - chh) * focusY / img.naturalHeight;
  const crop = [cropX, 1 - cropTop - chh / img.naturalHeight, cw / img.naturalWidth, chh / img.naturalHeight];

  const graded = target(gl.RGBA8, gl.UNSIGNED_BYTE);
  const tA = target(), tB = target(), flow = target();
  const kuw = target(gl.RGBA8, gl.UNSIGNED_BYTE), paint = target(gl.RGBA8, gl.UNSIGNED_BYTE), height = target();

  run(P.grade, graded, { uSrc: src }, { uCrop: crop });
  run(P.tensor, tA, { uSrc: graded.tex }, {});
  const sigma = 2.2 * strokeScale + 0.8;
  run(P.blur, tB, { uSrc: tA.tex }, { uDir: [1, 0], uSigma: sigma });
  run(P.blur, tA, { uSrc: tB.tex }, { uDir: [0, 1], uSigma: sigma });
  run(P.flow, flow, { uSrc: tA.tex }, {});
  run(P.kuwahara, kuw, { uSrc: graded.tex, uFlow: flow.tex }, { uRadius: Math.max(3, 5.5 * strokeScale) });
  const len = Math.round(Math.min(38, 22 * strokeScale + 4));
  run(P.lic, paint, { uSrc: kuw.tex, uFlow: flow.tex }, { uMode: 0, uLen: len, uScale: strokeScale });
  run(P.lic, height, { uSrc: kuw.tex, uFlow: flow.tex }, { uMode: 1, uLen: len, uScale: strokeScale });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const start = performance.now();
  let progress = reduceMotion ? 1 : 0, point = 0, pointTarget = 0, raf = 0, dead = false, done = false;
  let light = [W * 0.25, H * 0.3, W * 0.25];
  let drift = 0, prev = start;

  const frame = (now) => {
    raf = 0;
    if (dead) return;
    const dt = Math.min(64, now - prev); prev = now;
    if (!reduceMotion) progress = Math.min(1, (now - start) / duration);
    point += (pointTarget - point) * Math.min(1, dt / 180);
    drift += dt * 0.00025;
    const dir = [-0.55 + 0.15 * Math.sin(drift), 0.6, 0.75];
    run(P.final, null, { uPaint: paint.tex, uHeight: height.tex }, {
      uWork: [workW, workH], uLightDir: dir, uLightPos: light, uPoint: point, uProgress: progress, uBump: 6.0,
    }, [W, H]);
    if (progress >= 1 && !done) { done = true; onDone && onDone(); }
    if (progress < 1 || Math.abs(point - pointTarget) > 0.002 || pointTarget > 0) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  const onMove = (e) => {
    if (e.pointerType === 'touch' || !finePointer || reduceMotion) return;
    const r = canvas.getBoundingClientRect();
    light = [(e.clientX - r.left) * W / r.width, (r.bottom - e.clientY) * H / r.height, W * 0.12];
    pointTarget = 1; kick();
  };
  const onLeave = () => { pointTarget = 0; kick(); };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  kick();

  return () => {
    dead = true; cancelAnimationFrame(raf);
    canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
  };
};
