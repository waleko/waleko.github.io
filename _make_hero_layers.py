"""Builds images/hero-layers.webp, the layer masks hero.js paints back to front.

Red is the hill, green the lighthouse and buildings, blue the lantern and its beam.
The hill comes from texture and colour (rock is rough and warm, sky and sea are smooth or blue);
the lighthouse is traced by hand, so redo the polygons if the hero image changes.

    python3 _make_hero_layers.py
"""
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT = 'images/hero-lighthouse.webp', 'images/hero-layers.webp'

a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W, _ = a.shape
L = a @ np.array([.299, .587, .114], np.float32)


def blur(arr, r):
    lo, hi = arr.min(), arr.max()
    u = ((arr - lo) / (hi - lo + 1e-6) * 255).astype(np.uint8)
    return np.asarray(Image.fromarray(u).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255 * (hi - lo) + lo


def soft(mask, r):
    return np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)))


def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m) > 127


# Hill: the first sustained run of rough, warm pixels down each column.
tex = blur(sliding_window_view(np.pad(L, 3, mode='edge'), (7, 7)).std(axis=(2, 3)), 2.5)
rock = (tex > 5) & (blur(a[..., 2] - a[..., 0], 3) < 8)
BX0, BX1 = 128, 266  # columns under the lighthouse, interpolated instead
top = np.full(W, float(H))
for x in range(660):
    y0 = 172 if x < BX0 else 205
    run = np.convolve(rock[y0:, x].astype(float), np.ones(6), 'valid') >= 5
    idx = np.nonzero(run)[0]
    if len(idx):
        top[x] = y0 + idx[0]
xs = np.arange(W)
good = (top < H) & ((xs < BX0) | (xs >= BX1))
top[BX0:BX1] = np.interp(np.arange(BX0, BX1), xs[good], top[good])

tower = poly([(229, 141), (233, 141), (234, 150), (238, 155), (244, 162), (250, 169), (252, 173), (255, 197), (256, 203),
              (256, 212), (255, 240), (251, 245), (214, 245), (212, 236), (211, 212), (206, 210), (208, 203), (208, 197),
              (209, 172), (216, 162), (224, 155), (228, 150)])
house = poly([(137, 225), (146, 219), (165, 214), (178, 212), (188, 215), (200, 220), (212, 224), (213, 241), (240, 246),
              (270, 249), (270, 255), (240, 253), (200, 245), (185, 241), (150, 237), (137, 233)])
lantern = poly([(210, 170), (252, 170), (256, 184), (254, 197), (210, 197)])

# Beam: how much brighter than the sky interpolated between the rows above and below it.
ya, yb, x0, x1 = 148, 214, 248, 540
sky = np.zeros_like(L)
for x in range(x0, x1):
    sky[ya:yb, x] = np.linspace(L[ya - 3:ya + 3, x].mean(), L[yb - 3:yb + 3, x].mean(), yb - ya)
beam = np.zeros_like(L)
beam[ya:yb, x0:x1] = np.clip((L - sky)[ya:yb, x0:x1] - 3, 0, None) / 18
beam = soft(np.clip(beam, 0, 1), 2)

yy, _ = np.mgrid[:H, :W]
hill = (yy >= top[None, :]) & ~tower & ~house
out = np.stack([soft(hill, 1), soft((tower | house) & ~lantern, 0.7), np.maximum(soft(lantern, 1), beam)], axis=2)
Image.fromarray(out.astype(np.uint8)).save(OUT, lossless=True, quality=100, method=6)
print('wrote', OUT)
