# अंतरिक्ष से धरती, भारत, गुजरात होते हुए अंबासण गाँव तक एक ही अटूट ज़ूम।
# असली तस्वीरें: EOX Sentinel-2 cloudless 2018 (CC BY 4.0) + NASA GIBS VIIRS NOAA-20 के असली बादल।
# चलाना: python3 render.py still 0 3 6 9   |   python3 render.py video out.mp4
import sys, math, subprocess, numpy as np, cv2
from multiprocessing import Pool

LAT, LON = 23.4799339, 72.3461926          # अंबासण, मेहसाणा ज़िला
DATE = '2026-11-15'
W, H, FPS, T = 1920, 1080, 24, 10.5
R = 6371.0
HFOV = math.radians(40)
H0, H1 = 45000.0, 16.5                     # कैमरे की ऊँचाई, किमी
SUBS = 3                                    # मोशन ब्लर के लिए हर फ़्रेम में उप-नमूने
SUN = (math.radians(8), math.radians(LON + 52))   # सूरज पूरब में: पश्चिमी किनारे पर रात

def mips(img, n):
    out = [img]
    for _ in range(n):
        img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA); out.append(img)
    return out

def load(path):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None: raise SystemExit('missing ' + path)
    return im

def cloud_rgba(bgr):
    f = bgr.astype(np.float32) / 255
    mn, mx = f.min(2), f.max(2)
    a = np.clip((mn - 0.50) / 0.34, 0, 1); a = a * a * (3 - 2 * a)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    a *= 1 - np.clip((sat - 0.10) / 0.16, 0, 1)
    col = np.clip(0.55 + 0.45 * f, 0, 1)
    return np.dstack([col * a[..., None], a]).astype(np.float32)   # premultiplied

BASE, CLOUD, STARS, NIGHT = [], [], None, None
def setup():
    global STARS, NIGHT
    BASE.append(dict(ext=(-180, -90, 360, 180), mips=mips(load('src/s2-global.png'), 3)))
    for k in range(10):
        w = 90 / 2 ** k
        BASE.append(dict(ext=(LON - w / 2, LAT - w / 2, w, w), mips=mips(load(f'src/s2-{k}.jpg'), 2)))
    CLOUD.append(dict(ext=(-180, -90, 360, 180), mips=mips(cloud_rgba(load(f'src/viirs-global-{DATE}.jpg')), 3)))
    for k in range(3):
        w = 90 / 2 ** k
        CLOUD.append(dict(ext=(LON - w / 2, LAT - w / 2, w, w), mips=mips(cloud_rgba(load(f'src/viirs-{k}-{DATE}.jpg')), 2)))
    NIGHT = cv2.GaussianBlur(load('src/blackmarble-global.jpg'), (0, 0), 0.8)
    # तारे: ठंडे सफ़ेद-नीले, कोई सुनहरा नहीं
    rng = np.random.default_rng(7); sw, sh = 8192, 4096
    st = np.zeros((sh, sw, 3), np.float32); n = 26000
    z = rng.uniform(-1, 1, n); la = np.arcsin(z); lo = rng.uniform(-np.pi, np.pi, n)
    x = ((lo + np.pi) / (2 * np.pi) * sw).astype(int) % sw; y = np.clip(((np.pi / 2 - la) / np.pi * sh).astype(int), 0, sh - 1)
    mag = rng.pareto(2.2, n) * 0.10 + 0.05; tint = rng.uniform(0, 1, n)
    col = np.stack([1.0 + 0 * tint, 0.92 + 0.06 * tint, 0.84 + 0.14 * tint], 1) * np.clip(mag, 0, 2.5)[:, None]   # BGR
    np.add.at(st, (y, x), col)
    STARS = np.clip(cv2.GaussianBlur(st, (0, 0), 0.9) * 3.2 + cv2.GaussianBlur(st, (0, 0), 3.0) * 2.0, 0, 1)

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def smoother(t):
    t = min(max(t, 0.0), 1.0); return t * t * t * (t * (t * 6 - 15) + 10)

def cam(t):
    s = 0.035 * (t / T) + 0.965 * smoother((t - 2.4) / (T - 2.4))
    h = math.exp(math.log(H0) + (math.log(H1) - math.log(H0)) * s)
    k = 1 - smoother(s / 0.55)
    return h, LAT - 13 * k, LON - 16 * k, math.radians(-32) * (1 - smoother(s / 0.8)), s

def sample(level, lon, lat, minif, interp=cv2.INTER_LINEAR):
    lon0, lat0, w, hh = level['ext']
    j = int(min(max(math.floor(math.log2(max(minif, 1e-6)) + 0.35), 0), len(level['mips']) - 1))
    im = level['mips'][j]; ih, iw = im.shape[:2]
    u = (lon - lon0) / w; v = 1 - (lat - lat0) / hh
    mx = (u * iw - 0.5).astype(np.float32); my = (v * ih - 0.5).astype(np.float32)
    out = cv2.remap(im, mx, my, interp, borderMode=cv2.BORDER_REPLICATE)
    if w >= 359: return out, None
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    return out, smooth(0.0, 0.05, e).astype(np.float32)

def render(t):
    h, slat, slon, roll, s = cam(t)
    la, lo = math.radians(slat), math.radians(slon)
    n = np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])
    e = np.array([-math.sin(lo), math.cos(lo), 0.0]); nn = np.array([-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la)])
    r = math.cos(roll) * e + math.sin(roll) * nn; up = -math.sin(roll) * e + math.cos(roll) * nn
    tx = math.tan(HFOV / 2); ty = tx * H / W
    xs = ((np.arange(W) + 0.5) / W * 2 - 1) * tx; ys = (1 - (np.arange(H) + 0.5) / H * 2) * ty
    X, Y = np.meshgrid(xs, ys)
    d = -n[None, None, :] + X[..., None] * r + Y[..., None] * up
    d /= np.linalg.norm(d, axis=2, keepdims=True)
    cd = (R + h) * (d @ n)
    disc = cd * cd - h * (2 * R + h)
    hit = disc > 0
    sq = np.sqrt(np.maximum(disc, 0))
    P = (R + h) * n[None, None, :] + (-cd - sq)[..., None] * d
    N = P / R
    lat = np.degrees(np.arcsin(np.clip(N[..., 2], -1, 1))); lon = np.degrees(np.arctan2(N[..., 1], N[..., 0]))
    spd = W / (2 * tx * h / 111.19)                       # स्क्रीन पिक्सेल प्रति डिग्री
    # ---- ज़मीन ----
    col = None
    for k, L in enumerate(BASE):
        tex = L['mips'][0].shape[1] / L['ext'][2]; m = tex / spd
        a = 1.0 if k == 0 else float(1 - smooth(1.25, 2.1, m))
        if a <= 0: continue
        if k + 1 < len(BASE):                               # अगला महीन स्तर पूरी स्क्रीन ढक ले तो यह स्तर छोड़ें
            L2 = BASE[k + 1]; m2 = (L2['mips'][0].shape[1] / L2['ext'][2]) / spd
            if m2 <= 1.25 and L2['ext'][2] * spd > 2203 * 1.25 and abs(slat - LAT) < L2['ext'][2] * 0.05: continue
        lonq = lon if k else lon
        img, mask = sample(L, lonq, lat, m)
        img = img.astype(np.float32) / 255
        if col is None: col = img
        else:
            wgt = (mask * a)[..., None]; col = col * (1 - wgt) + img * wgt
    # ---- असली बादल, नीचे उतरते हुए घुल जाते हैं ----
    ca = float(smooth(math.log(350), math.log(3500), math.log(h)))
    if ca > 0:
        cl = None
        for k, L in enumerate(CLOUD):
            tex = L['mips'][0].shape[1] / L['ext'][2]; m = tex / spd
            a = 1.0 if k == 0 else float(1 - smooth(1.25, 2.1, m))
            if a <= 0: continue
            img, mask = sample(L, lon, lat, m)
            if cl is None: cl = img
            else:
                wgt = (mask * a)[..., None]; cl = cl * (1 - wgt) + img * wgt
        col = col * (1 - cl[..., 3:4] * ca) + cl[..., :3] * ca
    # ---- रोशनी, रात की बत्तियाँ, वायुमंडल ----
    S = np.array([math.cos(SUN[0]) * math.cos(SUN[1]), math.cos(SUN[0]) * math.sin(SUN[1]), math.sin(SUN[0])])
    Ld = N @ S
    day = smooth(-0.10, 0.22, Ld)[..., None]
    lit = (0.30 + 0.70 * smooth(0.0, 0.5, Ld))[..., None]
    g = col.mean(2, keepdims=True); col = np.clip(g + (col - g) * 1.22, 0, 1)        # विविड रंग
    sm = float(1 - smooth(math.log(25), math.log(400), math.log(h))) * 0.72          # मई की गर्मी: हरियाली सूखकर भूरी
    if sm > 0:
        veg = np.clip((col[..., 1] - np.maximum(col[..., 0], col[..., 2])) * 7, 0, 1)[..., None] * sm
        lum = col.mean(2, keepdims=True)
        col = col * (1 - veg) + np.clip(lum * np.array([0.78, 1.12, 1.42], np.float32) + 0.10, 0, 1) * veg
    col = col * lit * day
    if h > 300:
        ni, _ = sample(dict(ext=(-180, -90, 360, 180), mips=[NIGHT]), lon, lat, 1.0)
        ni = ni.astype(np.float32) / 255; ng = ni.max(2, keepdims=True)
        col += (0.55 * ni + 0.45 * ng) * 1.5 * np.clip(ng * 3 - 0.25, 0, 1) * (1 - day)
    cosv = np.clip(-(N * d).sum(2), 0, 1)
    rim = ((1 - cosv) ** 2.6)[..., None] * float(smooth(math.log(150), math.log(4000), math.log(h)))
    blue = np.array([1.0, 0.62, 0.34], np.float32)                                     # BGR: ठंडा नीला-सफ़ेद
    col = col * (1 - 0.55 * rim) + (blue * 0.9 + 0.25) * rim * (0.15 + 0.85 * day)
    veil = 0.07 * float(smooth(math.log(30), math.log(900), math.log(h))) * float(1 - smooth(math.log(4000), math.log(30000), math.log(h)))
    col = col * (1 - veil) + np.array([1.0, 0.86, 0.72], np.float32) * veil
    out = np.zeros((H, W, 3), np.float32)
    if hit.all(): out = col
    else:
        out[hit] = col[hit]
        miss = ~hit
        dm = d[miss]
        sh, sw = STARS.shape[:2]
        mxf = ((np.arctan2(d[..., 1], d[..., 0]) + np.pi) / (2 * np.pi) * sw).astype(np.float32)
        myf = ((np.pi / 2 - np.arcsin(np.clip(d[..., 2], -1, 1))) / np.pi * sh).astype(np.float32)
        stars = cv2.remap(STARS, mxf, myf, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)[miss]
        b = np.sqrt(np.maximum((R + h) ** 2 - cd[miss] ** 2, 0))                     # किरण की धरती से न्यूनतम दूरी
        Q = (R + h) * n[None, :] - cd[miss][:, None] * dm; Q /= np.linalg.norm(Q, axis=1, keepdims=True)
        dl = smooth(-0.15, 0.25, Q @ S)
        glow = np.exp(-(b - R) / (0.016 * R)) * 0.95 + np.exp(-(b - R) / (0.07 * R)) * 0.16
        out[miss] = stars * (1 - np.clip(glow, 0, 1))[:, None] + (blue * 0.85 + 0.2)[None, :] * (glow * (0.12 + 0.88 * dl))[:, None]
    return out

def frame(i):
    acc = None
    for j in range(SUBS):
        f = render((i + (j + 0.5) / SUBS * 0.5) / FPS)
        acc = f if acc is None else acc + f
    f = acc / SUBS
    f = np.clip(f, 0, 1); f = f * f * (3 - 2 * f) * 0.35 + f * 0.65                    # हल्का कॉन्ट्रास्ट
    yy, xx = np.mgrid[0:H, 0:W]; vg = 1 - 0.16 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    return (np.clip(f * vg[..., None], 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()

if __name__ == '__main__':
    setup()
    if sys.argv[1] == 'still':
        SUBS = 1
        for ts in sys.argv[2:]:
            b = frame(int(float(ts) * FPS)); cv2.imwrite(f'_still-{ts}.jpg', np.frombuffer(b, np.uint8).reshape(H, W, 3), [cv2.IMWRITE_JPEG_QUALITY, 90])
    else:
        nfr = int(T * FPS)
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                               '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', sys.argv[2]], stdin=subprocess.PIPE)
        with Pool(4) as pool:
            for k, b in enumerate(pool.imap(frame, range(nfr), chunksize=2)):
                ff.stdin.write(b)
                if k % 24 == 0: print('frame', k, flush=True)
        ff.stdin.close(); ff.wait()
