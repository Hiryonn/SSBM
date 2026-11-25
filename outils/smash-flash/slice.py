"""Découpage automatique des planches de sprites Smash Flash.

slice_sheet(path) -> (rgba, rows) où rows = liste de lignes, chaque ligne = liste de sprites
sprite = dict(x0,y0,x1,y1)  (x1/y1 exclus), avec masque calculable.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from collections import Counter


def load_rgba(path):
    im = Image.open(path)
    return np.array(im.convert('RGBA'))


def background_mask(a, tol=6, extra=()):
    """True là où c'est du fond. Fond = couleur dominante des bords (+ couleurs extra)."""
    h, w = a.shape[:2]
    border = np.concatenate([a[0, :], a[-1, :], a[:, 0], a[:, -1]])
    cols = Counter(map(tuple, border[:, :3]))
    bg = [np.array(c) for c, n in cols.most_common(2) if n > len(border) * 0.08]
    for c in extra:
        bg.append(np.array(c))
    m = a[..., 3] < 16
    rgb = a[..., :3].astype(int)
    for c in bg:
        m |= (np.abs(rgb - c).sum(axis=2) <= tol)
    return m, bg


def components(fg, gap=2, min_w=8, min_h=10, max_w=260, max_h=260):
    """Composantes connexes (pièces proches fusionnées de `gap` px)."""
    st = np.ones((3, 3), bool)
    grown = ndimage.binary_dilation(fg, structure=st, iterations=gap) if gap else fg
    lab, n = ndimage.label(grown, structure=st)
    out = []
    for k, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sl is None:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        # retire la dilatation : boîte réelle des pixels de premier plan
        sub = fg[y0:y1, x0:x1] & (lab[y0:y1, x0:x1] == k)
        ys, xs = np.nonzero(sub)
        if not len(ys):
            continue
        y0r, y1r, x0r, x1r = y0 + ys.min(), y0 + ys.max() + 1, x0 + xs.min(), x0 + xs.max() + 1
        w, h = x1r - x0r, y1r - y0r
        if w < min_w and h < min_h:
            continue
        if w > max_w or h > max_h:
            continue
        out.append(dict(x0=x0r, y0=y0r, x1=x1r, y1=y1r, label=k, area=int(sub.sum())))
    return out, lab


def group_rows(comps, overlap=0.45):
    """Regroupe les sprites en lignes : centres verticaux proches (seuil = moitié de la hauteur médiane)."""
    if not comps:
        return []
    H = float(np.median([c['y1'] - c['y0'] for c in comps]))
    comps = sorted(comps, key=lambda c: (c['y0'] + c['y1']) / 2)
    rows = []
    for c in comps:
        cy = (c['y0'] + c['y1']) / 2
        if rows and abs(cy - rows[-1]['cy']) <= max(6, 0.5 * H):
            r = rows[-1]
            r['items'].append(c)
            r['cy'] = sum((i['y0'] + i['y1']) / 2 for i in r['items']) / len(r['items'])
        else:
            rows.append(dict(cy=cy, items=[c]))
    for r in rows:
        r['items'].sort(key=lambda c: c['x0'])
    return [r['items'] for r in rows]


def split_big(fg, comps, factor=1.8):
    """Re-découpe sans fusion (gap 0) les composantes anormalement grandes (poses collées)."""
    if not comps:
        return comps
    H = float(np.median([c['y1'] - c['y0'] for c in comps]))
    W = float(np.median([c['x1'] - c['x0'] for c in comps]))
    out = []
    st = np.ones((3, 3), bool)
    for c in comps:
        h, w = c['y1'] - c['y0'], c['x1'] - c['x0']
        if h > factor * H or w > factor * 1.6 * W:
            sub = fg[c['y0']:c['y1'], c['x0']:c['x1']]
            lab, n = ndimage.label(sub, structure=st)
            parts = []
            for k, sl in enumerate(ndimage.find_objects(lab), start=1):
                if sl is None:
                    continue
                y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
                if (y1 - y0) < 8 and (x1 - x0) < 8:
                    continue
                parts.append(dict(x0=c['x0'] + x0, y0=c['y0'] + y0, x1=c['x0'] + x1, y1=c['y0'] + y1, area=int((lab[sl] == k).sum())))
            if len(parts) > 1:
                out.extend(parts)
                continue
        out.append(c)
    return out


def slice_sheet(path, tol=6, gap=2, extra_bg=(), min_w=8, min_h=10, max_w=260, max_h=260, region=None):
    a = load_rgba(path)
    if region:
        x0, y0, x1, y1 = region
        a = a[y0:y1, x0:x1].copy()
    bgm, bg = background_mask(a, tol, extra_bg)
    fg = ~bgm
    comps, lab = components(fg, gap, min_w, min_h, max_w, max_h)
    comps = split_big(fg, comps)
    rows = group_rows(comps)
    return a, fg, lab, rows, bg


def crop(a, fg, lab, c, pad=0):
    """Image RGBA du sprite, fond rendu transparent (seulement sa composante)."""
    y0, y1, x0, x1 = c['y0'], c['y1'], c['x0'], c['x1']
    sub = a[y0:y1, x0:x1].copy()
    keep = fg[y0:y1, x0:x1]
    sub[~keep] = 0
    return sub



def preview(a, rows, out, scale=2, title=''):
    """Aperçu numéroté : ligne r, sprite i."""
    h, w = a.shape[:2]
    im = Image.fromarray(a).convert('RGBA')
    bgc = Image.new('RGBA', im.size, (40, 44, 70, 255))
    bgc.alpha_composite(im)
    im = bgc.resize((w * scale, h * scale), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for r, items in enumerate(rows):
        for i, c in enumerate(items):
            box = [c['x0'] * scale, c['y0'] * scale, c['x1'] * scale - 1, c['y1'] * scale - 1]
            d.rectangle(box, outline=(255, 60, 60, 255) if i else (255, 220, 0, 255))
            d.text((box[0] + 1, box[1] + 1), f'{r}.{i}', fill=(255, 255, 0, 255))
    im.save(out)
    return im.size
