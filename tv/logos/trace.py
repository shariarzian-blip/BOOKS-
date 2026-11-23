"""Turn the supplied Paramshanti logo files (transparent WebP) into clean, light vector artwork:
   the rays as fitted leaf shapes, the seated figure and both wordmarks as traced outlines."""
import json, math, numpy as np, potrace
from PIL import Image
from scipy import ndimage
import os
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'source')
UP = 2

def path_d(alpha, ox, oy):
    im = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype('uint8'))
    big = np.asarray(im.resize((im.width * UP, im.height * UP), Image.BICUBIC)) > 127
    pl = potrace.Bitmap(~big).trace(turdsize=8, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.45)
    f = lambda p: f'{p.x / UP - ox:.1f} {p.y / UP - oy:.1f}'
    out = []
    for c in pl:
        out.append('M' + f(c.start_point))
        for s in c.segments:
            out.append(('L' + f(s.c) + 'L' + f(s.end_point)) if s.is_corner else ('C' + f(s.c1) + ' ' + f(s.c2) + ' ' + f(s.end_point)))
        out.append('Z')
    return ''.join(out).replace('.0 ', ' ').replace('.0Z', 'Z').replace('.0L', 'L').replace('.0C', 'C')

def bbox(mask):
    ys, xs = np.nonzero(mask); return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

res = {'colors': {'orange': '#F9A21B', 'yellow': '#FBC34B', 'magenta': '#FA02B9'}}
for key in ('en', 'hi'):
    a = np.asarray(Image.open(os.path.join(SRC, f'paramshanti-logo-{key}.webp')).convert('RGBA')).astype(float)
    R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3] / 255
    solid = A > .6
    near_mag = ndimage.binary_dilation(solid & (G < 100), iterations=4)
    near_warm = ndimage.binary_dilation(solid & (G >= 100), iterations=4)
    mag, warm = A * near_mag * ~(near_warm & ~near_mag), A * near_warm * ~(near_mag & ~near_warm)
    x0, y0, x1, y1 = bbox(mag > .5)
    res['word_' + key] = {'w': x1 - x0, 'h': y1 - y0, 'd': path_d(mag, x0, y0)}
    ex0, ey0, ex1, ey1 = bbox(warm > .5)
    res['layout_' + key] = {'emblem': [ex0, ey0, ex1, ey1], 'word': [x0, y0, x1, y1]}
    if key != 'en': continue
    lab, k = ndimage.label(warm > .5)
    means = np.asarray(ndimage.mean(G, lab, np.arange(1, k + 1)))
    light = np.concatenate([[False], means > 180])
    fig = light[lab]
    figa = warm * ndimage.binary_dilation(fig, iterations=3)
    cx, cy = (ex0 + ex1) / 2, (ey0 + ey1) / 2
    rays = []
    for i in range(1, k + 1):
        if light[i]: continue
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 25: continue
        px, py = xs.mean(), ys.mean()
        d = np.stack([xs - px, ys - py]); cov = d @ d.T / len(xs)
        val, vec = np.linalg.eigh(cov); v = vec[:, 1]                      # long axis
        if (px - cx) * v[0] + (py - cy) * v[1] < 0: v = -v                 # point it away from the centre
        nrm = np.array([-v[1], v[0]])
        t = d[0] * v[0] + d[1] * v[1]; s = d[0] * nrm[0] + d[1] * nrm[1]
        L = t.max() - t.min() + 1.5
        # widest point along the leaf, and its width there
        bins = np.clip(((t - t.min()) / (t.max() - t.min() + 1e-6) * 10).astype(int), 0, 9)
        prof = np.array([(np.ptp(s[bins == b]) + 1) if (bins == b).any() else 0 for b in range(10)])
        W = float(np.percentile(prof, 90)) + 0.6
        tip = np.array([px, py]) + v * t.min()
        rays.append([round(float(tip[0] - ex0), 1), round(float(tip[1] - ey0), 1), round(math.degrees(math.atan2(v[1], v[0])), 1), round(float(L), 1), round(W, 1), round(float(prof.argmax() / 9), 2)])
    res['emblem'] = {'w': ex1 - ex0, 'h': ey1 - ey0, 'cx': round(cx - ex0, 1), 'cy': round(cy - ey0, 1), 'rays': rays, 'fig': path_d(figa, ex0, ey0),
                     'fig_bbox': [int(v) for v in np.array(bbox(fig)) - np.array([ex0, ey0, ex0, ey0])]}
    print('emblem', res['emblem']['w'], 'x', res['emblem']['h'], '| rays', len(rays), '| figure path', len(res['emblem']['fig']), 'chars')
    print('  widest point along a ray (0 = inner tip, 1 = outer): mean', round(float(np.mean([r[5] for r in rays])), 2), '| length', min(r[3] for r in rays), '–', max(r[3] for r in rays), '| width', min(r[4] for r in rays), '–', max(r[4] for r in rays))
print('wordmarks:', {k: (v['w'], v['h'], len(v['d'])) for k, v in res.items() if k.startswith('word')})
print(res['layout_en'], res['layout_hi'])
json.dump(res, open(os.path.join(os.path.dirname(SRC), 'brand.json'), 'w'), separators=(',', ':'))
