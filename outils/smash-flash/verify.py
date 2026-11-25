import json, sys, base64, zlib
import numpy as np
from PIL import Image, ImageDraw
def render(path, out, scale=2):
    d = json.load(open(path))
    blob = zlib.decompress(base64.b64decode(d['pack']['blob']))
    pal = np.frombuffer(base64.b64decode(d['palettes'][0]), np.uint8).reshape(256, 4)
    tab = {(s[0], s[1]): s for s in d['pack']['sprites']}
    names = {v: k for k, v in d['states'].items()}
    for k, m in d['moves'].items():
        if m['anim'] is not None: names.setdefault(m['anim'], k)
    cells = []
    for no, an in sorted(d['anims'].items(), key=lambda x: int(x[0])):
        for fi, f in enumerate(an['frames']):
            cells.append((names.get(int(no), no), fi, f))
    C = 90; cols = 14
    W, H = cols * C, ((len(cells) + cols - 1) // cols) * C
    im = Image.new('RGBA', (W, H), (40, 44, 70, 255)); dr = ImageDraw.Draw(im)
    for n, (nm, fi, f) in enumerate(cells):
        s = tab[(f['g'], f['i'])]; g, i, w, h, ax, ay, kind, p, off, ln = s
        idx = np.frombuffer(blob[off:off + ln], np.uint8).reshape(h, w)
        rgba = pal[idx]
        sp = Image.fromarray(rgba, 'RGBA')
        cx, cy = (n % cols) * C + C // 2, (n // cols) * C + C - 12
        im.alpha_composite(sp, (cx - ax, cy - ay))
        for b in f['c2']: dr.rectangle([cx + b[0], cy + b[1], cx + b[2], cy + b[3]], outline=(80, 140, 255, 255))
        for b in f['c1']: dr.rectangle([cx + b[0], cy + b[1], cx + b[2], cy + b[3]], outline=(255, 50, 50, 255))
        dr.line([cx - 4, cy, cx + 4, cy], fill=(255, 220, 0, 255))
        dr.text(((n % cols) * C + 2, (n // cols) * C + C - 11), f'{nm}{fi}', fill=(255, 255, 0, 255))
    im = im.resize((W * scale // 2 * 2 // 2, H * scale // 2 * 2 // 2))
    im.save(out)
if __name__ == '__main__': render(sys.argv[1], sys.argv[2])
