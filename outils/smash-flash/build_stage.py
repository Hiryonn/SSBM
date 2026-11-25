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

# ---------------- Stade Pokémon
a = load('PRBStage4.GIF')
arena, (ax, ay) = piece(a, (0, 140, 475, 300))
plat, (px, py) = piece(a, (100, 115, 190, 140))
S = 1.05
gy = 192                          # bord avant du terrain
half = 446 * S / 2
x0 = -(ax + 233) * S              # centre du terrain (x≈233) en 0
L = [dict(name='Stade', img=arena, x=x0 + ax * S - ax * S, y=(ay - gy) * S, scale=S)]
L[0]['x'] = (ax - 233) * S
pw = plat.shape[1] * S
P = []
for cx in (-(233 - 144) * S, (330 - 233) * S):
    L.append(dict(name='Plateforme', img=plat, x=cx - pw / 2, y=(py - gy) * S, scale=S))
    P.append(dict(x1=cx - pw / 2 + 3, x2=cx + pw / 2 - 3, y=(125 - gy) * S, style='none'))
build('Stade Pokémon', L, 'pokemon-stadium', music='Pokemon_Medley.mp3', author='Cleod 9', sky=['#4a86d8', '#cfe6ff'],
      ground=[dict(x1=(20 - 233) * S, y1=0, x2=(446 - 233) * S, y2=(290 - gy) * S, style='none')], platforms=P,
      spawns=[[-120, 0], [120, 0], [-60, 0], [60, 0]], respawn=[0, -160], **cam_blast(225))

# ---------------- Royaume II (Subcon)
a = load('subcon.gif')
scene = solid(a[:384])
S = 1.3
ox = -320 * S; gy = 209
G = lambda x: ox + x * S
Y = lambda y: (y - gy) * S
build('Royaume II', [dict(name='Décor', img=scene, x=ox, y=Y(0), scale=S)], 'subcon', music='Burly Brawl.mp3', author='Tonberry2k',
      bgColor='#c0f8f8', ground=[dict(x1=G(0), y1=0, x2=G(189), y2=Y(384), style='none'), dict(x1=G(449), y1=0, x2=G(640), y2=Y(384), style='none'),
                                 dict(x1=G(227), y1=Y(264), x2=G(275), y2=Y(384), style='none'), dict(x1=G(363), y1=Y(264), x2=G(411), y2=Y(384), style='none')],
      platforms=[dict(x1=G(275), x2=G(363), y=Y(265), style='none')],
      spawns=[[G(90), 0], [G(545), 0], [G(250), Y(264)], [G(386), Y(264)]], respawn=[0, -150],
      blast=dict(left=G(0) - 160, right=G(640) + 160, top=-380, bottom=Y(384) + 60),
      camera=dict(left=G(0) - 20, right=G(640) + 20, top=-300, bottom=Y(330)))

# ---------------- Île de Wario
a = load('allstarstage.gif'); w = load('war4.gif')
isl, (ix, iy) = piece(a, (0, 0, 596, 150))
sky, _ = piece(w, (0, 0, 240, 160), trim=False)
pl, _ = piece(w, (10, 291, 116, 326))
S = 1.2; gy = 110
half = 596 * S / 2
pw = pl.shape[1] * S
L = [dict(name='Ciel et mer', img=solid(sky), x=-480, y=-330, delta=[0.3, 0.3], tile=[1, 0], scale=2.6),
     dict(name='Île', img=isl, x=-half, y=(iy - gy) * S, scale=S)]
P = []
for cx, y in ((-150, -75), (150, -75), (0, -145)):
    L.append(dict(name='Plateforme', img=pl, x=cx - pw / 2, y=y - 6, scale=S))
    P.append(dict(x1=cx - pw / 2 + 6, x2=cx + pw / 2 - 6, y=y, style='none'))
build("Île de Wario", L, 'wario-island', music='59 - Targets!.mp3', author='Bacon', bgColor='#5ab4f0',
      ground=[dict(x1=-half + 2, y1=0, x2=half - 2, y2=(150 - gy) * S, style='none')], platforms=P,
      spawns=[[-150, 0], [150, 0], [-60, 0], [60, 0]], respawn=[0, -180], **cam_blast(half, -290))

# ---------------- Green Hill
b = load('emeral2.png'); bs = load('backgroundstuff.gif')
back, _ = piece(b, (0, 0, 508, 228), trim=False)
p1, (p1x, p1y) = piece(bs, (350, 726, 476, 827))
p2, (p2x, p2y) = piece(bs, (520, 739, 646, 839))
S = 1.35
L = [dict(name='Paysage', img=solid(back), x=-560, y=-189, delta=[0.35, 0.35], tile=[1, 0], scale=2.2)]
tiles = [p1, p2, p1]
tw = sum(t.shape[1] for t in tiles) * S
x = -tw / 2
for t in tiles:
    L.append(dict(name='Sol', img=t, x=x, y=-8 * S, scale=S)); x += t.shape[1] * S
top, _ = piece(bs, (350, 726, 476, 760))
P = []
for cx, y in ((-95, -80), (95, -80)):
    w2 = top.shape[1] * S * 0.75
    L.append(dict(name='Plateforme', img=top, x=cx - w2 / 2, y=y - 8 * S * 0.75, scale=S * 0.75))
    P.append(dict(x1=cx - w2 / 2 + 4, x2=cx + w2 / 2 - 4, y=y, style='none'))
build('Green Hill', L, 'green-hill', music='Sonic_The_Hedgehog_2-Emerald_Hill_Zone.mp3', author='Flare', bgColor='#000080',
      ground=[dict(x1=-tw / 2 + 2, y1=0, x2=tw / 2 - 2, y2=95 * S, style='none')], platforms=P,
      spawns=[[-140, 0], [140, 0], [-60, 0], [60, 0]], respawn=[0, -170], **cam_blast(tw / 2))

# ---------------- Dream Land
a = load('whispywhoods.gif'); sky = load('mariosky.PNG')
isl, (ix, iy) = piece(a, (60, 1165, 470, 1505))
clouds, _ = piece(sky, (0, 500, 652, 1060), trim=False)
S = 1.25; gy = 1407; cx0 = 257
X = lambda x: (x - cx0) * S
Y = lambda y: (y - gy) * S
build('Dream Land', [dict(name='Ciel', img=solid(clouds), x=-600, y=-520, delta=[0.25, 0.25], tile=[1, 0], scale=1.9),
                     dict(name='Whispy Woods', img=isl, x=X(ix), y=Y(iy), scale=S)], 'dream-land', music='GreenGreens.mp3', author='Jack',
      bgColor='#8fc4ff', ground=[dict(x1=X(84), y1=0, x2=X(431), y2=Y(1495), style='none')],
      platforms=[dict(x1=X(232), x2=X(295), y=Y(1283), style='none'), dict(x1=X(132), x2=X(195), y=Y(1340), style='none'),
                 dict(x1=X(337), x2=X(400), y=Y(1347), style='none')],
      spawns=[[X(130), 0], [X(385), 0], [X(200), 0], [X(320), 0]], respawn=[0, -180], **cam_blast((431 - 84) * S / 2))

# ---------------- Royaume Champignon (Super Mario World)
a = load('smwworld1.gif'); bgi = load('smwworld1background.gif')
X0 = 240
land, (lx, ly) = piece(a, (X0, 200, 900, 432))
S = 1.35; gy = 399; cx0 = 570
X = lambda x: (x - cx0) * S
Y = lambda y: (y - gy) * S
clouds2, _ = piece(load('mariosky.PNG'), (0, 500, 652, 1060), trim=False)
build('Royaume Champignon', [dict(name='Ciel', img=solid(clouds2), x=-600, y=-560, delta=[0.25, 0.25], tile=[1, 0], scale=1.7),
                             dict(name='Terrain', img=land, x=X(lx), y=Y(ly), scale=S)], 'mushroom-kingdom', music='08 Opening.mp3',
      bgColor='#e8f4ff', ground=[dict(x1=X(X0), y1=0, x2=X(900), y2=Y(432) + 40, style='none'),
                                 dict(x1=X(305), y1=Y(351), x2=X(559), y2=0, style='none'),
                                 dict(x1=X(705), y1=Y(335), x2=X(815), y2=0, style='none')],
      platforms=[dict(x1=X(608), x2=X(656), y=Y(334), style='none'), dict(x1=X(848), x2=X(880), y=Y(350), style='none')],
      spawns=[[X(270), 0], [X(870), 0], [X(430), Y(351)], [X(760), Y(335)]], respawn=[0, -200],
      blast=dict(left=X(X0) - 180, right=X(900) + 180, top=-420, bottom=200), camera=dict(left=X(X0) - 30, right=X(900) + 30, top=-320, bottom=120))

# ---------------- Rêve étoilé (Kirby)
a = load('kirbyhubroom.png')
S = 1.4; gy = 437; cx0 = 224
X = lambda x: (x - cx0) * S
Y = lambda y: (y - gy) * S
PL = [(57, 10, 53), (57, 122, 165), (57, 282, 325), (57, 394, 437), (89, 186, 261), (105, 58, 117), (105, 330, 389), (153, 10, 53), (153, 122, 165),
      (153, 282, 325), (153, 394, 437), (169, 202, 245), (201, 58, 117), (201, 330, 389), (249, 10, 53), (249, 122, 165), (249, 282, 325), (249, 394, 437),
      (265, 202, 245), (297, 58, 117), (297, 330, 389), (345, 10, 53), (345, 122, 165), (345, 282, 325), (345, 394, 437), (361, 202, 245),
      (393, 58, 117), (393, 330, 389)]
build('Rêve étoilé', [dict(name='Palais', img=a, x=X(0), y=Y(0), scale=S)], 'star-dream', music='57 - Menu 2.mp3', author='SSF',
      sky=['#fff4fb', '#ffd6f0'], ground=[dict(x1=X(6), y1=0, x2=X(442), y2=40, style='none')],
      platforms=[dict(x1=X(x1), x2=X(x2), y=Y(y + 1), style='none') for y, x1, x2 in PL],
      spawns=[[X(60), 0], [X(390), 0], [X(150), 0], [X(300), 0]], respawn=[0, Y(200)],
      blast=dict(left=X(0) - 190, right=X(448) + 190, top=Y(0) - 160, bottom=200),
      camera=dict(left=X(0) - 20, right=X(448) + 20, top=Y(0) - 40, bottom=110))
