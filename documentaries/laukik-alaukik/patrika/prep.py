# पत्रिका के चित्र: बड़े स्रोतों से छपाई-योग्य छोटे JPEG। चलाना: python3 prep.py <scratchpad>
import sys, os, subprocess
from PIL import Image
import qrcode
S = sys.argv[1]; B = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(B); O = os.path.join(B, 'img')
def save(src, name, box=None, maxw=1800, q=86):
    im = Image.open(src).convert('RGB')
    if box: im = im.crop(box)
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(os.path.join(O, name), quality=q, optimize=True); print(name, im.size)
A = os.path.join(R, 'art-full'); T = os.path.join(R, 'pilot2', 'stills'); E = os.path.join(R, 'pilot2', 'earth')
save(f'{A}/keyart-1.png', 'cover.jpg', maxw=1696, q=90)
for i in (1, 2, 3, 5, 6): save(f'{A}/strip-{i}.png', f'strip-{i}.jpg', maxw=2200)
im = Image.open(f'{T}/n-tear.png'); w, h = im.size; cw = round(h * 210 / 297); x0 = round(w * 0.47 - cw / 2)
save(f'{T}/n-tear.png', 'tear.jpg', box=(x0, 0, x0 + cw, h), q=92)
save(f'{T}/n-wide.png', 'wide.jpg')
for n in ('a1-feast', 'm1-hunger', 'a2-water', 'm2-thirst', 'a3-nature', 'm3-air', 'm4-grief', 'm5-pain'): save(f'{T}/{n}.png', n + '.jpg', maxw=1400)
im = Image.open(f'{T}/a2-water.png'); w, h = im.size; save(f'{T}/a2-water.png', 'a2-water.jpg', box=(0, 0, round(w * 0.80), h), maxw=1400)   # गाड़ी का अगला हिस्सा बाहर
for t, n in (('0', 'e1'), ('5.5', 'e2'), ('6.5', 'e3'), ('10.4', 'e4')): save(f'{E}/_still-{t}.jpg', n + '.jpg', maxw=1600)
D = os.path.join(S, 'drive'); H = os.path.join(S, 'ashram')
save(f'{D}/Untitled-6.png', 'child.jpg', box=(683, 66, 1120, 1052))
save(f'{D}/IMG_20220426_012151-1.jpg', 'young.jpg', box=(40, 40, 1010, 990))
save(f'{D}/Picsart_24-02-23_12-34-26-123.jpg', 'bapuji.jpg', maxw=1700, q=90)
save(f'{D}/Picsart_24-02-05_19-53-23-567.jpg', 'bapuji-full.jpg', maxw=1100)
save(f'{D}/IMG-20250205-WA0011.jpg', 'podcast.jpg', maxw=1400)
save(f'{D}/IMG-20251224-WA0114.jpg', 'book.jpg', maxw=1200)
save(f'{D}/IMG-20250212-WA0008.jpg', 'winter.jpg', maxw=1100)
save(f'{H}/IMG_0846.jpg', 'ashram.jpg', maxw=1800)
save(f'{H}/IMG_0729.jpg', 'ashram2.jpg', maxw=1400)
C = os.path.join(R, 'pilot2', 'clips')
for clip, t, n in (('v6-space.mp4', 2.6, 'space.jpg'), ('v6-space.mp4', 4.6, 'space2.jpg'), ('v5-sky.mp4', 4.2, 'sky.jpg')):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', f'{C}/{clip}', '-frames:v', '1', '-q:v', '2', os.path.join(O, n)], check=True); print(n)
for url, n in (('https://www.youtube.com/channel/UC01X7d2bKFGxdk8tQ0ZKzOQ', 'qr-yt.png'), ('https://www.paramshantiblogs.org', 'qr-site.png')):
    q = qrcode.QRCode(border=1, box_size=12, error_correction=qrcode.constants.ERROR_CORRECT_M); q.add_data(url); q.make()
    q.make_image(fill_color='#2A160B', back_color='#F4E9CF').save(os.path.join(O, n)); print(n)
