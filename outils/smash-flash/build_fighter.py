"""Construit un perso PlatFight (.pfchar.json) à partir d'une planche Smash Flash et d'une description.

Description (dict) :
  name, sheet, credit, region=(x0,y0,x1,y1) facultatif, face='right'|'left',
  anims = { 'idle': ['2.0','2.1'], ... }   # références « ligne.sprite » de l'aperçu
  times = { 'idle': 8, ... }               # durée de chaque image (sinon valeur par défaut)
  stats = {...}, height=60 (taille visée en unités de jeu), sounds='Mario'
  moves = { 'upB': dict(vy=-9, helpless=True), ... }  # réglages en plus
"""
import base64, json, os, re, zlib, random
import numpy as np
from PIL import Image
from slice import slice_sheet, crop

SSF = os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'), 'ressources', 'smash-flash')
SOUNDS = os.path.join(SSF, 'Audio', 'Finished Sounds', 'Characters')
SHEETS = os.path.join(SSF, 'SSBM Sprites')

MOVE_SLOTS = [
    ('jab', 'sol', dict(dmg=3, angle=45, bkb=12, kbg=50)),
    ('ftilt', 'sol', dict(dmg=8, angle=35, bkb=22, kbg=90)),
    ('utilt', 'sol', dict(dmg=7, angle=85, bkb=25, kbg=95)),
    ('dtilt', 'sol', dict(dmg=6, angle=75, bkb=25, kbg=80)),
    ('dash', 'sol', dict(dmg=9, angle=45, bkb=40, kbg=70)),
    ('fsmash', 'smash', dict(dmg=15, angle=38, bkb=35, kbg=100)),
    ('usmash', 'smash', dict(dmg=14, angle=85, bkb=35, kbg=98)),
    ('dsmash', 'smash', dict(dmg=13, angle=30, bkb=30, kbg=95)),
    ('nair', 'air', dict(dmg=8, angle=45, bkb=18, kbg=95)),
    ('fair', 'air', dict(dmg=10, angle=40, bkb=22, kbg=100)),
    ('bair', 'air', dict(dmg=11, angle=40, bkb=25, kbg=100)),
    ('uair', 'air', dict(dmg=7, angle=85, bkb=25, kbg=95)),
    ('dair', 'air', dict(dmg=11, angle=270, bkb=20, kbg=90)),
    ('neutralB', 'special', dict(dmg=8, angle=40, bkb=25, kbg=70)),
    ('sideB', 'special', dict(dmg=10, angle=40, bkb=30, kbg=80)),
    ('upB', 'special', dict(dmg=6, angle=80, bkb=40, kbg=70)),
    ('downB', 'special', dict(dmg=10, angle=70, bkb=35, kbg=80)),
    ('ledgeAtk', 'sol', dict(dmg=8, angle=40, bkb=40, kbg=50)),
    ('getupAtk', 'sol', dict(dmg=7, angle=45, bkb=40, kbg=50)),
    ('grab', 'chope', dict(dmg=0, angle=0, bkb=0, kbg=0)),
    ('pummel', 'chope', dict(dmg=2, angle=0, bkb=0, kbg=0)),
    ('fthrow', 'chope', dict(dmg=9, angle=40, bkb=60, kbg=55)),
    ('bthrow', 'chope', dict(dmg=10, angle=45, bkb=62, kbg=62)),
    ('uthrow', 'chope', dict(dmg=8, angle=88, bkb=65, kbg=50)),
    ('dthrow', 'chope', dict(dmg=6, angle=75, bkb=55, kbg=40)),
]
MOVE_D = {m: (cat, d) for m, cat, d in MOVE_SLOTS}
# Numéros d'anims (style Mugen) pour les états
STATE_ANIM = {'idle': 0, 'walk': 20, 'run': 100, 'crouch': 11, 'jumpSquat': 40, 'jump': 41, 'doubleJump': 42, 'fall': 44,
              'land': 47, 'shield': 130, 'roll': 105, 'dodge': 131, 'airdodge': 132, 'hurt': 5000, 'hurtAir': 5030,
              'tumble': 5050, 'lie': 5110, 'getup': 5120, 'helpless': 5051, 'ledge': 5200, 'dizzy': 5300, 'taunt': 195, 'win': 181}
# Remplacements quand un état n'a pas d'anim dédiée
STATE_FALLBACK = {'walk': 'idle', 'run': 'walk', 'crouch': 'idle', 'jumpSquat': 'crouch', 'jump': 'idle', 'doubleJump': 'jump',
                  'fall': 'jump', 'land': 'jumpSquat', 'shield': 'crouch', 'roll': 'run', 'dodge': 'shield', 'airdodge': 'fall',
                  'hurt': 'idle', 'hurtAir': 'hurt', 'tumble': 'hurtAir', 'lie': 'hurt', 'getup': 'crouch', 'helpless': 'fall',
                  'ledge': 'fall', 'dizzy': 'hurt', 'taunt': 'win', 'win': 'idle'}
DEF_TIMES = {'idle': 9, 'walk': 6, 'run': 4, 'crouch': 4, 'jumpSquat': 3, 'jump': 6, 'doubleJump': 4, 'fall': 6, 'land': 3,
             'shield': 6, 'roll': 4, 'dodge': 4, 'airdodge': 5, 'hurt': 6, 'hurtAir': 6, 'tumble': 4, 'lie': 10,
             'getup': 5, 'helpless': 5, 'ledge': 10, 'dizzy': 10, 'taunt': 8, 'win': 10, 'proj': 3}
LOOPING = {'idle', 'walk', 'run', 'fall', 'tumble', 'helpless', 'dizzy', 'ledge', 'shield', 'jump', 'proj', 'win'}


def ref_list(spec_val):
    """'2.0-2.3' ou ['2.0','2.1'] -> liste de (ligne, index)."""
    if isinstance(spec_val, str):
        spec_val = [spec_val]
    out = []
    for r in spec_val:
        part = ''
        r = r.strip()
        if r.endswith('~'):
            part, r = '~', r[:-1]
        if ':' in r:
            p0, r = r.split(':', 1)
            part = p0 + part
        m = re.match(r'^(\d+)\.(\d+)(?:-(\d+)\.(\d+))?$', r)
        if not m:
            raise ValueError('Référence invalide : ' + r)
        a, b = int(m.group(1)), int(m.group(2))
        if m.group(3) is None:
            out.append((part, a, b))
        else:
            c, d = int(m.group(3)), int(m.group(4))
            if a != c:
                raise ValueError('Plage sur plusieurs lignes : ' + r)
            out += [(part, a, k) for k in range(b, d + 1)]
    return out


def anchor_of(img):
    """Point d'appui : bas du sprite, x = milieu des pixels du bas (les pieds)."""
    a = img[..., 3] > 0
    h, w = a.shape
    ys, xs = np.nonzero(a)
    bottom = ys.max()
    band = xs[ys >= bottom - max(3, h * 0.22)]
    ax = int(round((band.min() + band.max()) / 2)) if len(band) else w // 2
    return ax, int(bottom)


def build(spec, out_path, verbose=True):
    sheet = os.path.join(SHEETS, spec['sheet'])
    parts = {'': spec.get('region')}
    parts.update(spec.get('parts', {}))
    sliced = {}
    for pk, reg in parts.items():
        sliced[pk] = slice_sheet(sheet, region=reg, tol=spec.get('tol', 6), gap=spec.get('gap', 2), extra_bg=spec.get('extra_bg', ()))
    flip = spec.get('face', 'right') == 'left'
    # ---- sprites utilisés
    used = {}
    crops = {}
    for name, refs in spec['anims'].items():
        for ref in ref_list(refs):
            if ref in crops:
                continue
            pk, r, i = ref
            a, fg, lab, rows, bg = sliced[pk.rstrip('~')]
            c = rows[r][i]
            img = crop(a, fg, lab, c)
            if flip != pk.endswith('~'):
                img = img[:, ::-1].copy()
            crops[ref] = img
    # Palette commune (sprites en couleurs indexées : permet les couleurs alternatives)
    allpix = np.concatenate([im[im[..., 3] > 0][:, :3] for im in crops.values()])
    uniq = np.unique(allpix, axis=0)
    if len(uniq) > 255:
        big = Image.fromarray(allpix.reshape(1, -1, 3).astype(np.uint8), 'RGB').quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        palrgb = np.array(big.getpalette()[:255 * 3]).reshape(-1, 3)
    else:
        palrgb = uniq
    pal = np.zeros((256, 4), np.uint8)
    pal[1:len(palrgb) + 1, :3] = palrgb
    pal[1:len(palrgb) + 1, 3] = 255
    lut = {tuple(c): k + 1 for k, c in enumerate(palrgb.tolist())}

    def index_img(img):
        h, w = img.shape[:2]
        out = np.zeros((h, w), np.uint8)
        m = img[..., 3] > 0
        px = img[m][:, :3]
        idx = []
        for p in map(tuple, px.tolist()):
            k = lut.get(p)
            if k is None:  # couleur quantifiée : la plus proche
                k = int(np.argmin(((palrgb - np.array(p)) ** 2).sum(1))) + 1
                lut[p] = k
            idx.append(k)
        out[m] = np.array(idx, np.uint8)
        return out

    # ---- taille et échelle
    idle_ref = ref_list(spec['anims']['idle'])[0]
    idle_img = crops[idle_ref]
    iax, iay = anchor_of(idle_img)
    ih = iay + 1 - np.nonzero(idle_img[..., 3] > 0)[0].min()
    iw = np.nonzero((idle_img[..., 3] > 0).any(0))[0]
    iw = iw.max() - iw.min() + 1
    scale = round(spec.get('height', 58) / ih, 3)

    # ---- table des sprites
    table, chunks, off = [], [], 0
    spr_id = {}
    meta = {}
    part_no = {pk: n for n, pk in enumerate(sorted(parts))}
    for k, (ref, img) in enumerate(sorted(crops.items())):
        pk, r, i = ref
        data = index_img(img)
        h, w = data.shape
        ax, ay = anchor_of(img)
        g, ii = 1000 + part_no[pk.rstrip('~')] * 100 + (50 if pk.endswith('~') else 0) + r, i
        spr_id[ref] = (g, ii)
        meta[ref] = (ax, ay, img)
        b = data.tobytes()
        table.append([g, ii, w, h, ax, ay, 0, 0, off, len(b)])
        chunks.append(b)
        off += len(b)
    # portrait : la pose d'attente
    table.append([9000, 0] + table[[t[0:2] for t in table].index(list(spr_id[idle_ref]))][2:])

    # ---- boîtes
    body_half = max(5, int(iw * 0.32))
    body_top = -int(ih * 0.92)

    def boxes_for(ref):
        ax, ay, img = meta[ref]
        m = img[..., 3] > 0
        ys, xs = np.nonzero(m)
        x1, x2 = xs.min() - ax, xs.max() - ax
        y1, y2 = ys.min() - ay, ys.max() - ay
        hurt = [int(max(x1, -body_half - 2)), int(max(y1, body_top - 4)), int(min(x2, body_half + 2)), int(min(y2, 0))]
        if hurt[2] - hurt[0] < 6:
            hurt = [-body_half, body_top, body_half, 0]
        # pixels hors du corps -> zone de frappe possible
        X = xs - ax
        Y = ys - ay
        out = (X > body_half + 3) | (X < -body_half - 3) | (Y < body_top - 4) | (Y > 3)
        ext = int(out.sum())
        hit = None
        if ext > 12:
            hx, hy = X[out], Y[out]
            hit = [int(hx.min()), int(hy.min()), int(hx.max()) + 1, int(hy.max()) + 1]
        return hurt, hit, ext

    anims = {}
    anim_no = {}
    nxt = 200
    attack_names = [m for m, _, _ in MOVE_SLOTS]
    times = {**DEF_TIMES, **spec.get('times', {})}
    for name, refs in spec['anims'].items():
        refs = ref_list(refs)
        if name in STATE_ANIM:
            no = STATE_ANIM[name]
        elif name == 'proj':
            no = 1900
        else:
            no = nxt; nxt += 10
        anim_no[name] = no
        frames = []
        info = [boxes_for(rf) for rf in refs]
        is_attack = name in attack_names
        maxext = max([e for _, _, e in info] + [0])
        n = len(refs)
        for k, rf in enumerate(refs):
            g, ii = spr_id[rf]
            hurt, hit, ext = info[k]
            c1 = []
            if is_attack and name not in ('grab',):
                active = hit is not None and ext >= max(14, maxext * 0.45)
                if active:
                    c1 = [hit]
            if name == 'proj':
                ax, ay, img = meta[rf]
                m = img[..., 3] > 0
                ys, xs = np.nonzero(m)
                c1 = [[int(xs.min() - ax), int(ys.min() - ay), int(xs.max() - ax) + 1, int(ys.max() - ay) + 1]]
            t = times.get(name, 4 if is_attack else 6)
            if isinstance(t, list):
                t = t[k] if k < len(t) else t[-1]
            frames.append(dict(g=g, i=ii, ox=0, oy=0, t=t, fh=False, fv=False, trans='', c1=c1, c2=[hurt] if name != 'proj' else []))
        # attaque sans zone détectée : la moitié avant du corps sur les images du milieu
        if is_attack and name != 'grab' and not any(f['c1'] for f in frames):
            lo, hi = n // 3, max(n // 3, (2 * n) // 3 - (1 if n > 2 else 0))
            for k in range(lo, hi + 1):
                frames[k]['c1'] = [[0, body_top // 2, body_half + 10, 0]]
        loop = 0
        anims[no] = dict(loop=loop, frames=frames)
        if name not in LOOPING and name not in attack_names and name != 'proj':
            frames[-1]['t'] = -1 if name in ('crouch', 'shield', 'lie') else frames[-1]['t']

    # ---- états
    states = {}
    for st in STATE_ANIM:
        cur = st
        seen = set()
        while cur not in anim_no and cur in STATE_FALLBACK and cur not in seen:
            seen.add(cur); cur = STATE_FALLBACK[cur]
        states[st] = anim_no.get(cur, anim_no['idle'])

    # ---- coups
    def auto_hits(no, base):
        fr = anims[no]['frames']
        runs, start = [], -1
        for k, f in enumerate(fr):
            if f['c1'] and start < 0:
                start = k
            if not f['c1'] and start >= 0:
                runs.append([start, k - 1]); start = -1
        if start >= 0:
            runs.append([start, len(fr) - 1])
        if not runs:
            return []
        if len(runs) == 1:
            return [dict(frm=runs[0][0], to=runs[0][1], **base)]
        each = max(1, round(base['dmg'] * 0.6 / (len(runs) - 1)))
        out = []
        for k, (x, y) in enumerate(runs):
            if k < len(runs) - 1:
                out.append(dict(frm=x, to=y, dmg=each, angle=80, bkb=8, kbg=10))
            else:
                out.append(dict(frm=x, to=y, **{**base, 'dmg': max(1, round(base['dmg'] * 0.4 + 1))}))
        return out

    reuse = {'fair': 'nair', 'bair': 'fair', 'uair': 'utilt', 'dair': 'dtilt', 'dash': 'ftilt', 'fsmash': 'ftilt', 'usmash': 'utilt',
             'dsmash': 'dtilt', 'ledgeAtk': 'ftilt', 'getupAtk': 'dtilt', 'nair': 'jab', 'sideB': 'ftilt', 'upB': 'utilt',
             'downB': 'dtilt', 'neutralB': 'jab', 'utilt': 'jab', 'dtilt': 'jab', 'ftilt': 'jab',
             'grab': 'jab', 'pummel': 'jab', 'fthrow': 'ftilt', 'bthrow': 'ftilt', 'uthrow': 'utilt', 'dthrow': 'dtilt'}
    moves = {}
    extra = spec.get('moves', {})
    for m, cat, d in MOVE_SLOTS:
        src = m
        seen = set()
        while src not in anim_no and src in reuse and src not in seen:
            seen.add(src); src = reuse[src]
        no = anim_no.get(src)
        base = {**d, **extra.get(m, {}).get('hit', {})}
        mv = dict(anim=no, hits=[], landLag=9 if cat == 'air' else 0, charge=None, vx=0, vy=0, at=0, helpless=False, flip=False, proj=None)
        if no is not None:
            mv['hits'] = [{('from' if k == 'frm' else k): v for k, v in h.items()} for h in auto_hits(no, base)]
            if cat == 'smash':
                fr = anims[no]['frames']
                first = next((k for k, f in enumerate(fr) if f['c1']), 1)
                mv['charge'] = max(0, first - 1)
        if m in ('bair', 'bthrow') and src in ('fair', 'nair', 'ftilt', 'jab'):
            mv['flip'] = True
        if m == 'upB':
            mv.update(vy=-9, helpless=True, at=0)
        if m == 'sideB':
            mv.update(vx=3)
        for k, v in extra.get(m, {}).items():
            if k != 'hit':
                mv[k] = v
        moves[m] = mv
    # projectile
    if 'proj' in anim_no and spec.get('proj_move'):
        pm = spec['proj_move']
        moves[pm['move']]['proj'] = dict(anim=anim_no['proj'], at=pm.get('at', 1), x=pm.get('x', 18), y=pm.get('y', -int(ih * 0.5)),
                                         vx=pm.get('vx', 4), vy=pm.get('vy', 0), life=pm.get('life', 70), dmg=pm.get('dmg', 6),
                                         angle=pm.get('angle', 40), bkb=pm.get('bkb', 20), kbg=pm.get('kbg', 40),
                                         gravity=pm.get('gravity', 0), pierce=False)
        if pm.get('no_melee'):
            moves[pm['move']]['hits'] = []

    # ---- sons
    sounds, sfx = {}, {}
    sdir = spec.get('sounds')
    if sdir and os.path.isdir(os.path.join(SOUNDS, sdir)):
        files = sorted(f for f in os.listdir(os.path.join(SOUNDS, sdir)) if re.search(r'\.(wav|mp3)$', f, re.I))
        for f in files:
            key = os.path.splitext(f)[0]
            mime = 'audio/mpeg' if f.lower().endswith('mp3') else 'audio/wav'
            data = open(os.path.join(SOUNDS, sdir, f), 'rb').read()
            sounds[key] = 'data:' + mime + ';base64,' + base64.b64encode(data).decode()
        keys = list(sounds)
        smap = spec.get('sfx', {})
        jump = smap.get('jump') or next((k for k in keys if 'jump' in k.lower()), None)
        if jump: sfx['jump'] = jump
        if smap.get('ko'): sfx['ko'] = smap['ko']
        if smap.get('hurt'): sfx['hurt'] = smap['hurt']
        # sons des coups : précisés, sinon répartis
        rest = [k for k in keys if k not in sfx.values()] or keys
        order = ['jab', 'ftilt', 'utilt', 'dtilt', 'dash', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair',
                 'neutralB', 'sideB', 'upB', 'downB', 'fthrow', 'bthrow', 'uthrow', 'dthrow']
        for k, m in enumerate(order):
            moves[m]['sfx'] = smap.get(m) or rest[k % len(rest)]

    blob = b''.join(chunks)
    st = dict(weight=100, walkSpeed=1.3, runSpeed=2.6, airSpeed=1.7, airAccel=0.15, gravity=0.42, fallSpeed=5.1, fastFallSpeed=7.6,
              jumpForce=8.4, shortHopForce=5.3, doubleJumpForce=7.8, jumps=2, traction=0.15,
              width=int(iw * 0.7), height=int(ih * 0.95))
    st.update(spec.get('stats', {}))
    hues = [(spec.get('name_normal', 'Normal'), 0), ('Bleu', 210), ('Vert', 120), ('Violet', 280), ('Rouge', 350), ('Doré', 45)]
    fid = spec.get('id') or ('ssf-' + re.sub(r'[^a-z0-9]+', '-', spec['name'].lower()).strip('-'))
    out = dict(format='platfight-fighter', version=1, id=fid, name=spec['name'],
               author=spec.get('credit', ''), source='Super Smash Flash (' + spec['sheet'] + ')',
               scale=scale, portrait=[9000, 0], icon=[9000, 0], stats=st, palBase=0, palSwap=[0],
               palettes=[base64.b64encode(pal.tobytes()).decode()],
               costumes=[dict(name=n, pal=0, hue=h) for n, h in hues],
               pack=dict(blob=base64.b64encode(zlib.compress(blob, 9)).decode(), sprites=table),
               anims={str(k): v for k, v in anims.items()}, states=states, moves=moves,
               sounds=sounds, sfx=sfx)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    if verbose:
        print(f"{spec['name']}: {len(crops)} sprites, {len(anims)} anims, échelle {scale}, sons {len(sounds)}, {os.path.getsize(out_path)//1024} Ko")
    return out


def sheet_preview(sheet, out, region=None, scale=2, **kw):
    from slice import preview
    a, fg, lab, rows, bg = slice_sheet(os.path.join(SHEETS, sheet), region=region, **kw)
    preview(a, rows, out, scale)
    return [len(r) for r in rows]
