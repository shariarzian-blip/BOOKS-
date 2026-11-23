"""Put the real photographs of Bapuji, Brahma Maa, Neeru Maa, Shri Anant Patel and Smt. Sakshi Patel into the launch poster.
   poster-supplied.png = the supplied poster; cut/ holds the portraits with their backgrounds removed
   (rembg, model birefnet-portrait; Bapuji's portrait toned down first because the original is very bright);
   old-figures-mask.png marks the figures that were in the supplied poster."""
import numpy as np, sys
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage as nd
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
CUT = 'cut/'
orig = np.asarray(Image.open('poster-supplied.png').convert('RGB')).astype(np.float32)
H, W = orig.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
R, G, B = orig[..., 0], orig[..., 1], orig[..., 2]
box = lambda x0, y0, x1, y1: (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)

# 1. what must stay in front: the badge, the TV icon, the gold ring and the name
badge = nd.binary_fill_holes(nd.binary_closing(box(405, 298, 852, 394) & (R - B > 70) & (R > 105), iterations=3))
badge = nd.binary_dilation(badge, iterations=4) & box(400, 294, 858, 398)
icon = nd.binary_dilation(nd.binary_fill_holes(box(92, 338, 262, 420) & (R - B > 95) & (R > 150)), iterations=3)
ring = nd.binary_dilation(box(880, 322, 1200, 420) & (R - B > 95) & (R > 150), iterations=2)
name = nd.binary_dilation(box(255, 372, 1195, 420) & (((R < 95) & (B > R + 12)) | ((R - B > 95) & (R > 150))), iterations=2)
front = badge | icon | ring | name

# 2. a clean plate: take the old figures out and let the sky and the light flow in
old = np.zeros((H, W), bool); m = np.asarray(Image.open('old-figures-mask.png')) > 100; old[:m.shape[0]] = m
old = nd.binary_dilation(old, iterations=9) & (yy < 418)
hole = old | (front & (yy < 420))
known = ~hole
plate = orig.copy()
acc = np.zeros_like(orig); wsum = np.zeros((H, W), np.float32)
for s in (90, 45, 22, 11, 5):                       # wide to narrow: far colour first, then nearer detail wins near the edges
    num = np.stack([nd.gaussian_filter(orig[..., c] * known, s) for c in range(3)], -1); den = nd.gaussian_filter(known.astype(np.float32), s)
    ok = den > .02
    est = num / np.maximum(den, 1e-4)[..., None]
    wgt = np.where(ok, den ** 2, 0) / s
    acc += est * wgt[..., None]; wsum += wgt
fill = acc / np.maximum(wsum, 1e-6)[..., None]
plate[hole] = fill[hole]
soft = nd.gaussian_filter(hole.astype(np.float32), 3)[..., None]
plate = plate * (1 - soft) + np.where(hole[..., None], plate, nd.gaussian_filter(plate, (4, 4, 0))) * soft
# the light behind Bapuji, and the white haze the figures stand in
glow = np.exp(-(((xx - 626) / 300.) ** 2 + ((yy - 190) / 250.) ** 2) * 1.6) * .9
haze = np.clip((yy - 250) / 140., 0, 1) * np.clip(1 - np.abs(xx - 626) / 640., 0, 1) ** .6 * .95
lift = np.maximum(glow, haze) * nd.gaussian_filter(old.astype(np.float32), 14)
plate = plate + (255 - plate) * lift[..., None]

canvas = Image.fromarray(np.clip(plate, 0, 255).astype(np.uint8)).convert('RGBA')

# 3. the real photographs
def person(file, scale, x, y, fade=(352, 404), tone=None, halo=.6, white_edge=False):
    im = Image.open(CUT + file).convert('RGBA')
    if tone: im = tone(im)
    if white_edge:                                                        # white hair on a busy background: pull the soft edge to white, and soften it
        q = np.asarray(im).astype(np.float32); al0 = nd.gaussian_filter(nd.grey_erosion(q[..., 3], size=5), 2.2) / 255.
        k = np.clip(al0 * 1.25, 0, 1)[..., None] ** 1.6
        lum = q[..., :3] @ np.array([.299, .587, .114], np.float32)
        keep = (1 - np.clip((lum - 150) / 80., 0, 1) * .85)[..., None]       # near-white hair and cloth lose their yellow-green cast
        q[..., :3] = lum[..., None] + (q[..., :3] - lum[..., None]) * keep
        q[..., :3] = 255 - (255 - q[..., :3]) * k; q[..., 3] = al0 * 255
        im = Image.fromarray(q.astype(np.uint8))
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3] / 255.
    al = np.clip((al - .08) / .84, 0, 1)                                  # tighten the faint fringe
    rows = (np.arange(h) + y)[:, None]
    al = al * np.clip((fade[1] - rows) / float(fade[1] - fade[0]), 0, 1)   # dissolve into the light at the bottom
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    a[..., 3] = al * 255
    layer.paste(Image.fromarray(a.astype(np.uint8)), (x, y))
    la = np.asarray(layer)[..., 3].astype(np.float32) / 255.
    hl = np.clip(nd.gaussian_filter(la, 16) * 1.5, 0, 1) * halo
    canvas.alpha_composite(Image.fromarray(np.dstack([np.full((H, W, 3), 255, np.uint8), (hl * 255).astype(np.uint8)])))
    canvas.alpha_composite(layer)

def rgb_tone(bright=1., contrast=1., colour=1., gain=(1, 1, 1)):
    def f(im):
        r, g, b, a = im.split(); rgb = Image.merge('RGB', (r, g, b))
        rgb = ImageEnhance.Brightness(rgb).enhance(bright); rgb = ImageEnhance.Contrast(rgb).enhance(contrast); rgb = ImageEnhance.Color(rgb).enhance(colour)
        arr = np.asarray(rgb).astype(np.float32) * np.array(gain, np.float32); rgb = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        return Image.merge('RGBA', (*rgb.split(), a))
    return f

FIVE = 'trio' not in sys.argv          # five people by default; "python3 compose.py trio" keeps the first version with three
if FIVE:
    person('anant.png', .46, 186 - round(449 * .46), 62 - round(76 * .46), tone=rgb_tone(1.04, 1.03, .96, (.99, 1., 1.035)))
    person('sakshi.png', .41, 1068 - round(368 * .41), 60 - round(27 * .41), tone=rgb_tone(1.0, 1.02, 1.0))
    person('brahma-maa.png', .405, 400 - round(640 * .405), 56 - round(90 * .405), tone=rgb_tone(.98, 1.05, 1.03))
    person('neeru-maa.png', .65, 852 - round(356 * .65), 52 - round(49 * .65), fade=(318, 374), tone=rgb_tone(1.0, 1.04, 1.04))
    person('bapuji.png', .45, 626 - round(428 * .45), 8, white_edge=True, halo=.85, tone=rgb_tone(.97, 1.1, 1.06))
else:
    person('anant.png', .50, 328 - round(449 * .50), 60 - round(76 * .50), tone=rgb_tone(1.04, 1.03, .96, (.99, 1., 1.035)))
    person('sakshi.png', .445, 930 - round(368 * .445), 58 - round(27 * .445), tone=rgb_tone(1.0, 1.02, 1.0))
    person('bapuji.png', .45, 626 - round(428 * .45), 8, white_edge=True, halo=.85, tone=rgb_tone(.97, 1.1, 1.06))

# 4. the badge, icon, ring and name go back on top, exactly as they were
fa = nd.gaussian_filter(nd.binary_dilation(front, iterations=1).astype(np.float32), .8)
out = np.asarray(canvas.convert('RGB')).astype(np.float32)
out = out * (1 - fa[..., None]) + orig * fa[..., None]
out[420:] = orig[420:]
res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
res.save('../../paramshanti-tv-8-now-launched-%sen.jpg' % ('' if FIVE else 'trio-'), quality=95, subsampling=0)
print('done')
