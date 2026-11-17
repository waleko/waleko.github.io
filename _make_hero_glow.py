"""Builds images/hero-glow.avif, the HDR glow hero.js lays over the painted lantern and beam on HDR screens.

The glow takes the beam's shape from the photo (how much brighter it is than the sky around it) plus a soft core
on the lantern, and is encoded as 10-bit PQ (BT.2100) with alpha so its light can go past SDR white.
Needs avifenc (libavif).

    python3 _make_hero_glow.py
"""
import os
import struct
import subprocess
import tempfile
import zlib

import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = 'images/hero-lighthouse.webp', 'images/hero-glow.avif'
X0, Y0, X1, Y1 = 196, 136, 556, 224          # glow box in source pixels; hero.js positions it from these
SDR_WHITE = 203                               # nits, BT.2408 reference white
CORE_PEAK, BEAM_PEAK = 2.4, 1.5               # peak brightness relative to SDR white

a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
L = a @ np.array([.299, .587, .114], np.float32)
H, W = Y1 - Y0, X1 - X0


def blur(unit, r):
    u8 = Image.fromarray((np.clip(unit, 0, 1) * 255).astype(np.uint8))
    return np.asarray(u8.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255


# Beam: brightness over the sky interpolated between the rows above and below the box, right of the lantern.
sky = np.empty((H, W), np.float32)
for x in range(W):
    top, bot = L[Y0 - 4:Y0 + 2, X0 + x].mean(), L[Y1 - 2:Y1 + 4, X0 + x].mean()
    sky[:, x] = np.linspace(top, bot, H)
yy, xx = np.mgrid[Y0:Y1, X0:X1].astype(np.float32)
beam = np.clip(L[Y0:Y1, X0:X1] - sky - 3, 0, None) / 35 * np.clip((xx - 246) / 10, 0, 1)
beam = blur(beam, 3)

# Core: a soft ellipse on the lantern.
core = np.exp(-(((xx - 232) / 17) ** 2 + ((yy - 184) / 11) ** 2))
strength = np.clip(np.maximum(beam * (BEAM_PEAK - 1) / (CORE_PEAK - 1), core), 0, 1)

# The glow is the photo itself, softened and brightened by up to CORE_PEAK, so its faint edges match the
# painting underneath and only the light gets brighter than white.
soft = np.dstack([blur(a[Y0:Y1, X0:X1, c] / 255, 1.5) for c in range(3)])
lin = np.where(soft <= 0.04045, soft / 12.92, ((soft + 0.055) / 1.055) ** 2.4)
srgb_to_2020 = np.array([[0.6274, 0.3293, 0.0433], [0.0691, 0.9195, 0.0114], [0.0164, 0.0880, 0.8956]], np.float32)
gain = 1 + (CORE_PEAK - 1) * strength
rgb = (lin @ srgb_to_2020.T) * (SDR_WHITE * gain)[..., None] / 10000
alpha = np.clip(strength * 1.6, 0, 1)


def pq(y):
    m1, m2, c1, c2, c3 = 2610 / 16384, 2523 / 4096 * 128, 3424 / 4096, 2413 / 4096 * 32, 2392 / 4096 * 32
    p = np.clip(y, 0, 1) ** m1
    return ((c1 + c2 * p) / (1 + c3 * p)) ** m2


rgba = np.dstack([pq(rgb), alpha]).clip(0, 1)
px = np.round(rgba * 65535).astype('>u2')


def png16(path, data):
    h, w, _ = data.shape
    raw = b''.join(b'\x00' + data[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 16, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


with tempfile.TemporaryDirectory() as tmp:
    png = os.path.join(tmp, 'glow.png')
    png16(png, px)
    subprocess.run(['avifenc', '-q', '80', '--qalpha', '80', '-d', '10', '-y', '444', '--cicp', '9/16/9',
                    '--clli', f'{int(SDR_WHITE * CORE_PEAK)},{int(SDR_WHITE * 1.3)}', '-s', '4', png, OUT],
                   check=True, stdout=subprocess.DEVNULL)
print('wrote', OUT, os.path.getsize(OUT), 'bytes; box', (X0, Y0, X1, Y1))
