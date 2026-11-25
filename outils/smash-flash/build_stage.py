"""Monte des stages PlatFight à partir des planches Super Smash Flash."""
import base64, json, os, sys, zlib, uuid
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'), 'ressources', 'smash-flash')
MUSIC = ROOT + '/Audio/Finished Sounds/Music/'
OUT = os.path.join(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'), 'projets', 'Super Smash Flash', 'stages')

def load(f):
    return np.array(Image.open(os.path.join(ROOT, 'Stages', f)).convert('RGBA'))

def piece(a, box, trim=True):
    x1, y1, x2, y2 = box
    p = a[y1:y2, x1:x2].copy()
    if trim:
        ys, xs = np.nonzero(p[:, :, 3] > 0)
        p = p[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        return p, (x1 + xs.min(), y1 + ys.min())
    return p, (x1, y1)

def solid(p):
    p = p.copy(); p[:, :, 3] = 255; return p

def build(name, layers, out, **kw):
    """layers: liste de dict(img, x, y, scale, delta, tile, layer) — x,y = coin haut-gauche en unités de jeu."""
    blob, table, bg = bytearray(), [], []
    for k, L in enumerate(layers):
        img = L['img']
        h, w = img.shape[:2]
        data = img.astype(np.uint8).tobytes()
        table.append([0, k, w, h, 0, 0, 1, 0, len(blob), len(data)])
        blob += data
        s = L.get('scale', 1)
        bg.append(dict(name=L.get('name', 'Calque %d' % k), type='normal', spr=[0, k], anim=None,
                       start=[L['x'], L['y']], delta=L.get('delta', [1, 1]), tile=L.get('tile', [0, 0]),
                       tilespacing=[0, 0], scale=[s, s], velocity=L.get('velocity', [0, 0]), trans='', layer=L.get('layer', 0)))
    music = None
    if kw.get('music'):
        music = 'data:audio/mpeg;base64,' + base64.b64encode(open(MUSIC + kw.pop('music'), 'rb').read()).decode()
    else:
        kw.pop('music', None)
    d = dict(format='platfight-stage', version=1, id='ssf-' + out, builtin=False, name=name,
             author=kw.pop('author', ''), source='Super Smash Flash', zoffset=0, localcoord=[320, 240],
             bgColor=kw.pop('bgColor', '#000000'), palettes=[],
             pack=dict(blob=base64.b64encode(zlib.compress(bytes(blob), 9)).decode(), sprites=table),
             anims={}, bg=bg, music=music, edited=True, **kw)
    path = os.path.join(OUT, f'ssf-{out}.pfstage.json')
    json.dump(d, open(path, 'w'), separators=(',', ':'))
    print(name, os.path.getsize(path) // 1024, 'Ko')

def cam_blast(half, top=-260):
    return dict(blast=dict(left=-half - 200, right=half + 200, top=top - 80, bottom=190),
                camera=dict(left=-half - 160, right=half + 160, top=top, bottom=140))

# ---------------- Destination Finale
a = load('Nint_SSBM_finaldest.png')
arena, (ax, ay) = piece(a, (10, 40, 380, 280))
back, _ = piece(a, (396, 9, 976, 388), trim=False)
S = 1.0
top_y = 93 - ay          # arête avant du plateau
half = arena.shape[1] * S / 2
build('Destination Finale', [
    dict(name='Grille', img=solid(back), x=-293, y=-330, delta=[0.25, 0.25], tile=[1, 1]),
    dict(name='Plateau', img=arena, x=-half, y=-top_y * S, scale=S),
], 'final-destination', music='54 - Final Destination.mp3', bgColor='#000000', author='MarioMK1',
   ground=[dict(x1=-half + 2, y1=0, x2=half - 2, y2=110, style='none')], platforms=[],
   spawns=[[-90, 0], [90, 0], [-40, 0], [40, 0]], respawn=[0, -150], **cam_blast(half))

# ---------------- Champ de bataille
a = load('mlbattlefield.png')
main, (mx, my) = piece(a, (10, 4, 222, 62))
plat, (px, py) = piece(a, (180, 150, 240, 170))
S = 1.4
row = np.nonzero(main[:, main.shape[1] // 10, 3] > 0)[0]
top_y = row.min()        # surface sur l'aile gauche
half = main.shape[1] * S / 2
pw = plat.shape[1] * S
L = [dict(name='Plateau', img=main, x=-half, y=-top_y * S, scale=S)]
P = []
for cx, y in [(-70, -62), (70, -62), (0, -122)]:
    L.append(dict(name='Plateforme', img=plat, x=cx - pw / 2, y=y - 2, scale=S))
    P.append(dict(x1=cx - pw / 2 + 2, x2=cx + pw / 2 - 2, y=y, style='none'))
build('Champ de bataille', L, 'battlefield', music='62 - All-Star.mp3', author='Joshr_691',
      sky=['#2f7fe8', '#a8d4ff'], ground=[dict(x1=-half + 6, y1=0, x2=half - 6, y2=60, style='none')], platforms=P,
      spawns=[[-70, -62], [70, -62], [-110, 0], [110, 0]], respawn=[0, -170], **cam_blast(half))

# ---------------- Temple
a = load('hyrulecastle.png')
bridge, (bx, by) = piece(a, (2, 212, 252, 340))
arch, _ = piece(a, (2, 95, 108, 185))
slab, _ = piece(a, (118, 160, 220, 180))
sky, _ = piece(a, (264, 200, 511, 338), trim=False)
S = 1.5
half = bridge.shape[1] * S / 2
ah = arch.shape[1] * S
L = [dict(name='Ciel', img=solid(sky), x=-370, y=-260, delta=[0.2, 0.2], tile=[1, 0], scale=3),
     dict(name='Pont', img=bridge, x=-half, y=-6 * S, scale=S)]
P = []
for cx, y in [(-half - ah / 2 - 30, -40), (half + ah / 2 + 30, -40)]:
    L.append(dict(name='Arche', img=arch, x=cx - ah / 2, y=y - 4 * S, scale=S))
    P.append(dict(x1=cx - ah / 2 + 4, x2=cx + ah / 2 - 4, y=y, style='none'))
sw = slab.shape[1] * S
L.append(dict(name='Dalle', img=slab, x=-sw / 2, y=-110 - 4 * S, scale=S))
P.append(dict(x1=-sw / 2 + 6, x2=sw / 2 - 6, y=-110, style='none'))
W = half + ah + 30
build('Temple', L, 'temple', music='07 - Temple.mp3', author='Offerursoul53', bgColor='#7cc4f8',
      ground=[dict(x1=-half + 4, y1=0, x2=half - 4, y2=150, style='none')], platforms=P,
      spawns=[[-80, 0], [80, 0], [-W + 40, -40], [W - 40, -40]], respawn=[0, -170], **cam_blast(W, -280))

# ---------------- Château de Peach
a = load('peachescastle.gif')
scene = solid(a)
S = 1.2
x0 = -323 * S
build('Château de Peach', [dict(name='Décor', img=scene, x=x0, y=-372 * S, scale=S)], 'peach-castle',
      music='MarioSong.mp3', bgColor='#5fb0ff', sky=['#5fb0ff', '#bfe4ff'],
      ground=[dict(x1=x0, y1=(452 - 372) * S, x2=x0 + 508 * S, y2=(517 - 372) * S, style='none')],
      platforms=[dict(x1=x0 + 4, x2=x0 + 642 * S, y=0, style='none')],
      spawns=[[-120, 0], [120, 0], [-60, 0], [60, 0]], respawn=[0, -150],
      blast=dict(left=x0 - 140, right=-x0 + 140, top=-360, bottom=320),
      camera=dict(left=x0 - 40, right=-x0 + 40, top=-280, bottom=160))
