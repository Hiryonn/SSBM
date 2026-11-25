// Éditeur de stages : sols, plateformes, apparitions, zones de KO, caméra, calques de décor, musique.
import { h, clear, toast, confirmBox, num, select, check, text, pickFiles } from './dom.js';
import { app, go, screens, saveStage } from '../app.js';
import { Stage } from '../engine/stage.js';
import { PLAYER_COLORS } from '../data/defs.js';
import { unpack, repack, addRGBA, nextFreeIndex, imageFileToRGBA } from '../data/pack.js';
import { toBase64 } from '../import/inflate.js';
import { launchTraining } from './menus.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

screens.stageeditor = (id, keep) => {
  const src = app.stages.find((s) => s.id === id);
  if (!src && !keep) { toast('Stage introuvable', 'bad'); return screens.stagelist(); }
  const def = keep?.def || clone(src);
  if (def.builtin && !keep) { def.builtin = false; def.id = 's' + Date.now().toString(36); def.name += ' (copie)'; }
  def.ground = def.ground || []; def.platforms = def.platforms || []; def.bg = def.bg || [];
  def.spawns = def.spawns || [[-60, 0], [60, 0], [-120, 0], [120, 0]];
  def.respawn = def.respawn || [0, -120];

  const E = { sel: keep?.sel || null, tool: 'select', cam: { x: 0, y: -80, ppu: 2 }, snap: true, dirty: !!keep?.dirty, undo: [], redo: [], tab: 'objects', showBlast: true };
  let stage = null;

  const snapshot = () => JSON.stringify({ ...def, pack: undefined, palettes: undefined });
  let lastSnap = snapshot();
  const commit = () => { const s = snapshot(); if (s === lastSnap) return; E.undo.push(lastSnap); if (E.undo.length > 60) E.undo.shift(); E.redo = []; lastSnap = s; E.dirty = true; updateTitle(); };
  const restore = (s) => { const o = JSON.parse(s); delete o.pack; delete o.palettes; Object.assign(def, o); lastSnap = s; E.dirty = true; E.sel = null; rebuild(); renderAll(); };
  const undo = () => { if (!E.undo.length) return; E.redo.push(snapshot()); restore(E.undo.pop()); };
  const redo = () => { if (!E.redo.length) return; E.undo.push(snapshot()); restore(E.redo.pop()); };

  const titleEl = h('h1');
  const updateTitle = () => { titleEl.textContent = def.name + (E.dirty ? ' •' : ''); };
  const left = h('div', { class: 'ed-left' });
  const canvas = h('canvas', { class: 'ed-canvas', tabindex: 0 });
  const toolbar = h('div', { class: 'ed-toolbar' });
  const right = h('div', { class: 'ed-right' });
  const fighterSel = select(null, app.settings.trainF || app.fighters[0]?.id, app.fighters.map((f) => [f.id, f.name]), (v) => { app.settings.trainF = v; });

  const rebuild = () => { if (stage) { stage.def = def; stage.rebuild(); } draw(); };
  const save = async () => {
    const saved = await saveStage(def);
    if (saved.id !== def.id) Object.assign(def, { id: saved.id, name: saved.name, builtin: false });
    E.dirty = false; updateTitle(); toast('Stage enregistré');
  };
  const test = () => {
    if (!app.fighters.length) { toast('Importe d\'abord un perso pour tester le stage.', 'bad'); return; }
    const tmp = clone(def);
    const k = app.stages.findIndex((s) => s.id === def.id);
    // on teste la version en cours sans l'enregistrer
    const saved = k >= 0 ? app.stages[k] : null;
    if (k >= 0) app.stages[k] = tmp; else app.stages.push(tmp);
    launchTraining({
      fighterId: (app.fighters.some((f) => f.id === app.settings.trainF) ? app.settings.trainF : app.fighters[0]?.id), stageId: tmp.id, cpu: 3, title: 'Test : ' + def.name,
      back: () => { const j = app.stages.indexOf(tmp); if (j >= 0) { if (saved) app.stages[j] = saved; else app.stages.splice(j, 1); } go('stageeditor', def.id, { def, dirty: E.dirty, sel: E.sel }); },
    });
  };
  const back = async () => {
    if (E.dirty && !(await confirmBox('Quitter sans enregistrer ?', 'Les modifications non enregistrées seront perdues.', 'Quitter'))) return;
    go('stagelist');
  };

  const el = h('div', { class: 'screen editor' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn ghost', onclick: back }, '← Stages'), titleEl,
      h('div', { class: 'bar-tools' },
        h('button', { class: 'btn ghost', title: 'Annuler (Ctrl+Z)', onclick: undo }, '↶'),
        h('button', { class: 'btn ghost', title: 'Rétablir (Ctrl+Y)', onclick: redo }, '↷'),
        fighterSel,
        h('button', { class: 'btn', onclick: test }, '▶ Tester'),
        h('button', { class: 'btn primary', onclick: save }, 'Enregistrer'))),
    h('div', { class: 'ed-body' }, left, h('div', { class: 'ed-center' }, toolbar, h('div', { class: 'ed-stage' }, canvas)), right));

  // ------------------------------------------------------------ panneau gauche
  const sel = (o) => { E.sel = o; renderLeft(); renderRight(); draw(); };
  const isSel = (t, k) => E.sel && E.sel.t === t && E.sel.k === k;
  const renderLeft = () => {
    clear(left);
    const tabs = h('div', { class: 'tabs' }, [['objects', 'Terrain'], ['bg', 'Décor'], ['settings', 'Réglages']].map(([id, l]) => h('button', { class: 'tab' + (E.tab === id ? ' on' : ''), onclick: () => { E.tab = id; renderLeft(); } }, l)));
    const body = h('div', { class: 'ed-list' });
    left.append(tabs, body);
    const item = (label, sub, t, k) => h('button', { class: 'list-item' + (isSel(t, k) ? ' on' : ''), onclick: () => sel({ t, k }) }, h('span', null, label), h('small', null, sub));
    if (E.tab === 'objects') {
      body.append(h('div', { class: 'list-head' }, 'Sols pleins (avec rebords)'));
      def.ground.forEach((g, k) => body.append(item('Sol ' + (k + 1), `${g.x1} → ${g.x2}, haut ${g.y1}`, 'ground', k)));
      body.append(h('button', { class: 'btn small', onclick: () => { def.ground.push({ x1: -80, y1: 0, x2: 80, y2: 60, style: 'solid', color: '#6a76a8' }); commit(); rebuild(); sel({ t: 'ground', k: def.ground.length - 1 }); } }, '+ Sol'));
      body.append(h('div', { class: 'list-head' }, 'Plateformes traversables'));
      def.platforms.forEach((p, k) => body.append(item('Plateforme ' + (k + 1), `${p.x1} → ${p.x2}, hauteur ${p.y}`, 'plat', k)));
      body.append(h('button', { class: 'btn small', onclick: () => { def.platforms.push({ x1: -40, x2: 40, y: -60 }); commit(); rebuild(); sel({ t: 'plat', k: def.platforms.length - 1 }); } }, '+ Plateforme'));
      body.append(h('div', { class: 'list-head' }, 'Points'));
      def.spawns.forEach((s, k) => body.append(item('Départ J' + (k + 1), s[0] + ', ' + s[1], 'spawn', k)));
      body.append(item('Réapparition', def.respawn[0] + ', ' + def.respawn[1], 'respawn', 0));
      body.append(h('div', { class: 'list-head' }, 'Zones'));
      body.append(item('Zone de KO', `${def.blast.left} / ${def.blast.right} / ${def.blast.top} / ${def.blast.bottom}`, 'blast', 0));
      body.append(item('Limites de la caméra', `${def.camera.left} / ${def.camera.right} / ${def.camera.top} / ${def.camera.bottom}`, 'camera', 0));
    } else if (E.tab === 'bg') {
      body.append(h('p', { class: 'muted small' }, 'Calques du décor, du plus lointain au plus proche. "Devant" = dessiné par-dessus les persos.'));
      def.bg.forEach((b, k) => body.append(h('div', { class: 'row' },
        h('button', { class: 'list-item grow' + (isSel('bg', k) ? ' on' : ''), onclick: () => sel({ t: 'bg', k }) }, h('span', null, (b.hidden ? '🚫 ' : '') + (b.name || 'Calque ' + (k + 1))), h('small', null, (b.type === 'anim' ? 'anim ' + b.anim : 'sprite ' + b.spr.join(',')) + (b.layer ? ' · devant' : ''))),
        h('button', { class: 'mini', title: 'Monter', onclick: () => { if (k > 0) { [def.bg[k - 1], def.bg[k]] = [def.bg[k], def.bg[k - 1]]; commit(); reloadStage(); sel({ t: 'bg', k: k - 1 }); } } }, '▲'),
        h('button', { class: 'mini', title: 'Descendre', onclick: () => { if (k < def.bg.length - 1) { [def.bg[k + 1], def.bg[k]] = [def.bg[k], def.bg[k + 1]]; commit(); reloadStage(); sel({ t: 'bg', k: k + 1 }); } } }, '▼'))));
      body.append(h('button', { class: 'btn small', onclick: addImageLayer }, '+ Calque depuis une image…'));
    } else {
      body.append(
        text('Nom', def.name, (v) => { def.name = v; updateTitle(); }),
        text('Auteur', def.author, (v) => { def.author = v; }),
        h('label', { class: 'field' }, h('span', null, 'Couleur de fond'), colorInput(def.bgColor || '#101018', (v) => { def.bgColor = v; def.sky = null; draw(); })),
        check('Dégradé de ciel', !!def.sky, (v) => { def.sky = v ? [def.bgColor || '#2a3a8f', '#c0517a'] : null; commit(); renderLeft(); draw(); }),
        def.sky ? h('div', { class: 'row gap' }, colorInput(def.sky[0], (v) => { def.sky[0] = v; draw(); }), colorInput(def.sky[1], (v) => { def.sky[1] = v; draw(); })) : null,
        num('Ligne du sol du décor Mugen (zoffset)', def.zoffset ?? 200, (v) => { def.zoffset = v; commit(); draw(); }),
        h('h3', null, 'Musique'),
        h('p', { class: 'muted small' }, def.music ? 'Une musique est attachée (' + Math.round(def.music.length * 0.75 / 1024) + ' Ko).' : 'Aucune musique.'),
        h('div', { class: 'row gap' },
          h('button', { class: 'btn small', onclick: addMusic }, def.music ? 'Remplacer…' : 'Ajouter un fichier audio…'),
          def.music ? h('button', { class: 'btn small danger', onclick: () => { def.music = null; commit(); renderLeft(); } }, 'Retirer') : null),
        h('h3', null, 'Affichage'),
        check('Aimanter à 5 unités', E.snap, (v) => { E.snap = v; }),
        check('Montrer zones de KO et caméra', E.showBlast, (v) => { E.showBlast = v; draw(); }));
    }
  };
  const colorInput = (value, on) => { const i = h('input', { type: 'color', value }); i.addEventListener('input', () => on(i.value)); i.addEventListener('change', commit); return i; };

  const addMusic = async () => {
    const [f] = await pickFiles({ multiple: false, accept: 'audio/*' });
    if (!f) return;
    if (f.size > 12e6) { toast('Fichier trop lourd (12 Mo max)', 'bad'); return; }
    const b64 = toBase64(new Uint8Array(await f.arrayBuffer()));
    def.music = 'data:' + (f.type || 'audio/mpeg') + ';base64,' + b64;
    commit(); renderLeft(); toast('Musique ajoutée');
  };
  const reloadStage = async () => { stage = await Stage.load(def); draw(); };
  const addImageLayer = async () => {
    const files = await pickFiles({ multiple: true, accept: 'image/*' });
    if (!files.length) return;
    const up = await unpack(def);
    for (const f of files) {
      const img = await imageFileToRGBA(f);
      const g = 9900, i = nextFreeIndex(up, g);
      addRGBA(up, g, i, img.w, img.h, img.rgba, 0, 0);
      def.bg.push({ name: f.name.replace(/\.\w+$/, ''), type: 'normal', spr: [g, i], anim: null, start: [-Math.round(img.w / 2), (def.zoffset ?? 200) - img.h], delta: [1, 1], tile: [0, 0], tilespacing: [0, 0], scale: [1, 1], velocity: [0, 0], trans: '', layer: 0 });
    }
    if (!def.palettes) def.palettes = [];
    await repack(def, up);
    commit();
    await reloadStage();
    E.tab = 'bg'; renderLeft(); sel({ t: 'bg', k: def.bg.length - 1 });
    toast('Image ajoutée au décor');
  };

  // ------------------------------------------------------------ inspecteur
  const renderRight = () => {
    clear(right);
    const s = E.sel;
    const p = h('div', { class: 'panel' });
    right.append(p);
    const n = (label, obj, key, opts = {}) => num(label, obj[key], (v) => { obj[key] = v; rebuild(); renderLeftSoon(); }, opts);
    const commitOnChange = (node) => { node.querySelectorAll('input,select').forEach((i) => i.addEventListener('change', commit)); return node; };
    if (!s) {
      p.append(h('h3', null, 'Aide'),
        h('ul', { class: 'help' },
          h('li', null, 'Clique un élément pour le sélectionner, glisse pour le déplacer, tire les poignées pour le redimensionner.'),
          h('li', null, 'Outils "Dessiner un sol" / "Dessiner une plateforme" : glisse dans la vue.'),
          h('li', null, 'Les sols pleins ont des rebords auxquels on peut s\'accrocher ; les plateformes se traversent par en dessous et avec Bas.'),
          h('li', null, 'Molette : zoom · clic droit ou glisser dans le vide : déplacer la vue · Suppr : effacer.'),
          h('li', null, 'Sortir de la zone de KO (rouge) fait perdre une vie.')));
      return;
    }
    if (s.t === 'ground') {
      const g = def.ground[s.k];
      p.append(h('h3', null, 'Sol ' + (s.k + 1)), commitOnChange(h('div', { class: 'grid2' }, n('Gauche', g, 'x1'), n('Droite', g, 'x2'), n('Haut', g, 'y1'), n('Bas', g, 'y2'))),
        select('Apparence', g.style || 'solid', [['solid', 'Bloc coloré'], ['edge', 'Simple ligne (décor Mugen)'], ['none', 'Invisible']], (v) => { g.style = v; commit(); draw(); }),
        h('label', { class: 'field' }, h('span', null, 'Couleur'), colorInput(g.color || '#6a76a8', (v) => { g.color = v; draw(); })),
        check('Pas de rebords', g.noLedge, (v) => { g.noLedge = v; commit(); rebuild(); }),
        h('button', { class: 'btn small danger', onclick: () => { def.ground.splice(s.k, 1); commit(); rebuild(); sel(null); } }, 'Supprimer ce sol'));
    } else if (s.t === 'plat') {
      const pl = def.platforms[s.k];
      p.append(h('h3', null, 'Plateforme ' + (s.k + 1)), commitOnChange(h('div', { class: 'grid2' }, n('Gauche', pl, 'x1'), n('Droite', pl, 'x2'), n('Hauteur', pl, 'y'))),
        select('Apparence', pl.style || 'line', [['line', 'Visible'], ['none', 'Invisible (dessinée dans le décor)']], (v) => { pl.style = v; commit(); draw(); }),
        h('button', { class: 'btn small danger', onclick: () => { def.platforms.splice(s.k, 1); commit(); rebuild(); sel(null); } }, 'Supprimer cette plateforme'));
    } else if (s.t === 'spawn' || s.t === 'respawn') {
      const pt = s.t === 'spawn' ? def.spawns[s.k] : def.respawn;
      p.append(h('h3', null, s.t === 'spawn' ? 'Départ du joueur ' + (s.k + 1) : 'Point de réapparition'),
        commitOnChange(h('div', { class: 'grid2' }, num('X', pt[0], (v) => { pt[0] = v; draw(); }), num('Y', pt[1], (v) => { pt[1] = v; draw(); }))),
        h('p', { class: 'muted small' }, s.t === 'spawn' ? 'Le perso tombe sur le sol le plus proche en dessous.' : 'Le perso réapparaît ici sur une petite plateforme après un KO.'));
    } else if (s.t === 'blast' || s.t === 'camera') {
      const z = def[s.t];
      p.append(h('h3', null, s.t === 'blast' ? 'Zone de KO' : 'Limites de la caméra'),
        commitOnChange(h('div', { class: 'grid2' }, n('Gauche', z, 'left'), n('Droite', z, 'right'), n('Haut', z, 'top'), n('Bas', z, 'bottom'))),
        h('p', { class: 'muted small' }, s.t === 'blast' ? 'Un perso qui sort par les côtés ou le bas perd une vie. Par le haut, seulement s\'il a été éjecté.' : 'La caméra ne montre jamais au-delà de ce cadre. Garde-le un peu plus petit que la zone de KO.'));
    } else if (s.t === 'bg') {
      const b = def.bg[s.k];
      const pair = (label, key, step = 1) => h('div', { class: 'grid2' },
        num(label + ' X', b[key][0], (v) => { b[key][0] = v; draw(); }, { step }), num(label + ' Y', b[key][1], (v) => { b[key][1] = v; draw(); }, { step }));
      p.append(h('h3', null, b.name || 'Calque'), commitOnChange(h('div', null,
        text('Nom', b.name, (v) => { b.name = v; }),
        b.type === 'anim' ? num('Animation', b.anim, (v) => { b.anim = v; reloadStage(); }) : pair('Sprite', 'spr'),
        pair('Position', 'start'), pair('Parallaxe', 'delta', 0.01), pair('Échelle', 'scale', 0.05),
        pair('Répétition (0 = non, 1 = infinie)', 'tile'), pair('Espacement', 'tilespacing'), pair('Défilement auto', 'velocity', 0.05),
        select('Plan', b.layer || 0, [[0, 'Derrière les persos'], [1, 'Devant les persos']], (v) => { b.layer = +v; draw(); }),
        check('Transparence additive', b.trans === 'add', (v) => { b.trans = v ? 'add' : ''; draw(); }),
        check('Masqué', b.hidden, (v) => { b.hidden = v; draw(); renderLeft(); }))),
        h('p', { class: 'muted small' }, 'Parallaxe 1 = bouge avec le terrain, 0 = reste fixe à l\'écran.'),
        h('button', { class: 'btn small danger', onclick: () => { def.bg.splice(s.k, 1); commit(); reloadStage(); sel(null); } }, 'Supprimer ce calque'));
    }
  };
  let lt = 0;
  const renderLeftSoon = () => { clearTimeout(lt); lt = setTimeout(renderLeft, 250); };

  const renderToolbar = () => {
    clear(toolbar);
    const tool = (id, label) => h('button', { class: 'tool' + (E.tool === id ? ' on' : ''), onclick: () => { E.tool = id; renderToolbar(); canvas.style.cursor = id === 'select' ? 'default' : 'crosshair'; } }, label);
    toolbar.append(tool('select', 'Sélection'), tool('ground', 'Dessiner un sol'), tool('plat', 'Dessiner une plateforme'),
      h('span', { class: 'sep' }),
      h('button', { class: 'tool', onclick: () => { E.cam.ppu = Math.max(0.3, E.cam.ppu / 1.25); draw(); } }, '−'),
      h('button', { class: 'tool', onclick: () => { E.cam.ppu = Math.min(12, E.cam.ppu * 1.25); draw(); } }, '+'),
      h('button', { class: 'tool', onclick: fit }, 'Tout voir'));
  };
  const fit = () => {
    const b = def.blast;
    const W = canvas.clientWidth || 800, H = canvas.clientHeight || 500;
    E.cam.ppu = Math.min(W / (b.right - b.left + 40), H / (b.bottom - b.top + 40));
    E.cam.x = (b.left + b.right) / 2; E.cam.y = (b.top + b.bottom) / 2;
    draw();
  };

  // ------------------------------------------------------------ dessin
  const w2s = (x, y) => [canvas.width / 2 + (x - E.cam.x) * E.cam.ppu, canvas.height / 2 + (y - E.cam.y) * E.cam.ppu];
  const s2w = (x, y) => [(x - canvas.width / 2) / E.cam.ppu + E.cam.x, (y - canvas.height / 2) / E.cam.ppu + E.cam.y];
  const draw = () => {
    const W = canvas.clientWidth | 0, H = canvas.clientHeight | 0;
    if (!W || !H || !stage) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    const c = E.cam;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(c.ppu, 0, 0, c.ppu, W / 2 - c.x * c.ppu, H / 2 - c.y * c.ppu);
    const view = { W, H, left: c.x - W / 2 / c.ppu, right: c.x + W / 2 / c.ppu, top: c.y - H / 2 / c.ppu, bottom: c.y + H / 2 / c.ppu };
    stage.drawBG(ctx, c, 0, view);
    stage.drawGeometry(ctx, {});
    stage.drawBG(ctx, c, 1, view);
    const lw = 1 / c.ppu;
    // repères
    if (E.showBlast) {
      ctx.lineWidth = 2 * lw;
      ctx.strokeStyle = isSel('blast', 0) ? '#fff' : 'rgba(255,70,70,0.9)';
      ctx.setLineDash([8 * lw, 6 * lw]);
      const b = def.blast; ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
      ctx.strokeStyle = isSel('camera', 0) ? '#fff' : 'rgba(120,200,255,0.8)';
      const cb = def.camera; ctx.strokeRect(cb.left, cb.top, cb.right - cb.left, cb.bottom - cb.top);
      ctx.setLineDash([]);
    }
    def.ground.forEach((g, k) => {
      ctx.lineWidth = (isSel('ground', k) ? 2.5 : 1) * lw;
      ctx.strokeStyle = isSel('ground', k) ? '#ffd23f' : 'rgba(90,220,255,0.7)';
      ctx.strokeRect(g.x1, g.y1, g.x2 - g.x1, g.y2 - g.y1);
      if (!g.noLedge) { ctx.fillStyle = '#ffd23f'; for (const x of [g.x1, g.x2]) ctx.fillRect(x - 2 * lw * 2, g.y1 - 2 * lw * 2, 4 * lw * 2, 4 * lw * 2); }
      if (isSel('ground', k)) handles(ctx, [[g.x1, g.y1], [g.x2, g.y1], [g.x1, g.y2], [g.x2, g.y2]], lw);
    });
    def.platforms.forEach((p, k) => {
      ctx.lineWidth = (isSel('plat', k) ? 3 : 1.5) * lw;
      ctx.strokeStyle = isSel('plat', k) ? '#ffd23f' : 'rgba(255,200,90,0.85)';
      ctx.beginPath(); ctx.moveTo(p.x1, p.y); ctx.lineTo(p.x2, p.y); ctx.stroke();
      if (isSel('plat', k)) handles(ctx, [[p.x1, p.y], [p.x2, p.y]], lw);
    });
    def.spawns.forEach((s, k) => marker(ctx, s[0], s[1], PLAYER_COLORS[k], 'J' + (k + 1), isSel('spawn', k), lw));
    marker(ctx, def.respawn[0], def.respawn[1], '#fff', 'R', isSel('respawn', 0), lw);
    if (E.sel?.t === 'bg') {
      const b = def.bg[E.sel.k];
      const info = b && stage.bank && b.type !== 'anim' ? stage.bank.info(b.spr[0], b.spr[1]) : null;
      if (info) {
        const zo = def.zoffset ?? 200, lcH = def.localcoord?.[1] || 240;
        const bx = b.start[0] + c.x * (1 - b.delta[0]), by = b.start[1] - zo + (c.y - (lcH / 2 - zo)) * (1 - b.delta[1]);
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2 * lw;
        ctx.strokeRect(bx - info.ax * (b.scale?.[0] || 1), by - info.ay * (b.scale?.[1] || 1), info.w * (b.scale?.[0] || 1), info.h * (b.scale?.[1] || 1));
      }
    }
    if (drag && drag.mode === 'draw') {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * lw; ctx.setLineDash([5 * lw, 4 * lw]);
      if (drag.tool === 'ground') ctx.strokeRect(Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1), Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
      else { ctx.beginPath(); ctx.moveTo(drag.x0, drag.y0); ctx.lineTo(drag.x1, drag.y0); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(mouseInfo, 10, H - 10);
  };
  let mouseInfo = '';
  const handles = (ctx, pts, lw) => { ctx.fillStyle = '#fff'; for (const [x, y] of pts) ctx.fillRect(x - 4 * lw, y - 4 * lw, 8 * lw, 8 * lw); };
  const marker = (ctx, x, y, color, label, on, lw) => {
    ctx.fillStyle = color; ctx.strokeStyle = on ? '#fff' : '#000'; ctx.lineWidth = (on ? 2.5 : 1) * lw;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7 * lw * 1.4, y - 16 * lw * 1.4); ctx.lineTo(x + 7 * lw * 1.4, y - 16 * lw * 1.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = `bold ${9 * lw * 1.4}px system-ui`; ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 9 * lw * 1.4);
  };

  // ------------------------------------------------------------ souris
  let drag = null;
  const snapV = (v) => (E.snap ? Math.round(v / 5) * 5 : Math.round(v));
  const pick = (wx, wy) => {
    const tol = 8 / E.cam.ppu;
    const near = (a, b) => Math.abs(a - b) < tol;
    for (let k = 0; k < def.spawns.length; k++) { const s = def.spawns[k]; if (near(wx, s[0]) && wy <= s[1] + tol && wy >= s[1] - 26 / E.cam.ppu) return { t: 'spawn', k, part: 'pt' }; }
    if (near(wx, def.respawn[0]) && wy <= def.respawn[1] + tol && wy >= def.respawn[1] - 26 / E.cam.ppu) return { t: 'respawn', k: 0, part: 'pt' };
    for (let k = 0; k < def.platforms.length; k++) {
      const p = def.platforms[k];
      if (near(wy, p.y)) { if (near(wx, p.x1)) return { t: 'plat', k, part: 'x1' }; if (near(wx, p.x2)) return { t: 'plat', k, part: 'x2' }; if (wx > p.x1 && wx < p.x2) return { t: 'plat', k, part: 'body' }; }
    }
    for (let k = def.ground.length - 1; k >= 0; k--) {
      const g = def.ground[k];
      const parts = [];
      if (near(wx, g.x1)) parts.push('x1'); if (near(wx, g.x2)) parts.push('x2');
      if (near(wy, g.y1)) parts.push('y1'); if (near(wy, g.y2)) parts.push('y2');
      const inside = wx >= g.x1 - tol && wx <= g.x2 + tol && wy >= g.y1 - tol && wy <= g.y2 + tol;
      if (inside && parts.length) return { t: 'ground', k, part: parts };
      if (inside) return { t: 'ground', k, part: 'body' };
    }
    if (E.showBlast) for (const t of ['camera', 'blast']) {
      const z = def[t];
      const parts = [];
      const inX = wx > z.left - tol && wx < z.right + tol, inY = wy > z.top - tol && wy < z.bottom + tol;
      if (inY && near(wx, z.left)) parts.push('left'); if (inY && near(wx, z.right)) parts.push('right');
      if (inX && near(wy, z.top)) parts.push('top'); if (inX && near(wy, z.bottom)) parts.push('bottom');
      if (parts.length) return { t, k: 0, part: parts };
    }
    return null;
  };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const [wx, wy] = s2w(mx, my);
    if (e.button === 1 || e.button === 2) { drag = { mode: 'pan', mx, my, cx: E.cam.x, cy: E.cam.y }; return; }
    if (E.tool === 'ground' || E.tool === 'plat') { drag = { mode: 'draw', tool: E.tool, x0: snapV(wx), y0: snapV(wy), x1: snapV(wx), y1: snapV(wy) }; return; }
    const hit = pick(wx, wy);
    if (hit) {
      E.sel = { t: hit.t, k: hit.k };
      drag = { mode: 'edit', hit, wx, wy, orig: clone(hit.t === 'ground' ? def.ground[hit.k] : hit.t === 'plat' ? def.platforms[hit.k] : hit.t === 'spawn' ? def.spawns[hit.k] : hit.t === 'respawn' ? def.respawn : def[hit.t]) };
      renderLeft(); renderRight();
    } else if (E.sel?.t === 'bg') {
      const b = def.bg[E.sel.k];
      drag = { mode: 'bg', wx, wy, orig: b.start.slice(), b };
    } else { E.sel = null; renderLeft(); renderRight(); drag = { mode: 'pan', mx, my, cx: E.cam.x, cy: E.cam.y }; }
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const [wx, wy] = s2w(mx, my);
    mouseInfo = `x ${Math.round(wx)}  y ${Math.round(wy)} · molette : zoom · clic droit : déplacer la vue`;
    if (!drag) { draw(); return; }
    if (drag.mode === 'pan') { E.cam.x = drag.cx - (mx - drag.mx) / E.cam.ppu; E.cam.y = drag.cy - (my - drag.my) / E.cam.ppu; }
    else if (drag.mode === 'draw') { drag.x1 = snapV(wx); drag.y1 = snapV(wy); }
    else if (drag.mode === 'bg') { drag.b.start[0] = Math.round(drag.orig[0] + wx - drag.wx); drag.b.start[1] = Math.round(drag.orig[1] + wy - drag.wy); }
    else if (drag.mode === 'edit') {
      const { hit, orig } = drag;
      const dx = snapV(wx - drag.wx), dy = snapV(wy - drag.wy);
      if (hit.t === 'ground') {
        const g = def.ground[hit.k];
        if (hit.part === 'body') { g.x1 = orig.x1 + dx; g.x2 = orig.x2 + dx; g.y1 = orig.y1 + dy; g.y2 = orig.y2 + dy; }
        else for (const p of hit.part) g[p] = orig[p] + (p[0] === 'x' ? dx : dy);
      } else if (hit.t === 'plat') {
        const p = def.platforms[hit.k];
        if (hit.part === 'body') { p.x1 = orig.x1 + dx; p.x2 = orig.x2 + dx; p.y = orig.y + dy; }
        else p[hit.part] = orig[hit.part] + dx;
      } else if (hit.t === 'spawn' || hit.t === 'respawn') {
        const pt = hit.t === 'spawn' ? def.spawns[hit.k] : def.respawn;
        pt[0] = orig[0] + dx; pt[1] = orig[1] + dy;
      } else {
        const z = def[hit.t];
        for (const p of hit.part) z[p] = orig[p] + (p === 'left' || p === 'right' ? dx : dy);
      }
      rebuild();
    }
    draw();
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.mode === 'draw') {
      const { x0, y0, x1, y1 } = drag;
      if (drag.tool === 'ground' && Math.abs(x1 - x0) >= 5 && Math.abs(y1 - y0) >= 5) {
        def.ground.push({ x1: Math.min(x0, x1), y1: Math.min(y0, y1), x2: Math.max(x0, x1), y2: Math.max(y0, y1), style: 'solid', color: '#6a76a8' });
        E.sel = { t: 'ground', k: def.ground.length - 1 };
      } else if (drag.tool === 'plat' && Math.abs(x1 - x0) >= 5) {
        def.platforms.push({ x1: Math.min(x0, x1), x2: Math.max(x0, x1), y: y0 });
        E.sel = { t: 'plat', k: def.platforms.length - 1 };
      }
      rebuild(); E.tool = 'select'; renderToolbar(); canvas.style.cursor = 'default';
    }
    if (drag.mode === 'edit') {
      for (const g of def.ground) { const a = [g.x1, g.x2].sort((p, q) => p - q), b = [g.y1, g.y2].sort((p, q) => p - q); g.x1 = a[0]; g.x2 = a[1]; g.y1 = b[0]; g.y2 = b[1]; }
      for (const p of def.platforms) if (p.x1 > p.x2) [p.x1, p.x2] = [p.x2, p.x1];
      rebuild();
    }
    const changed = drag.mode !== 'pan';
    drag = null;
    if (changed) { commit(); renderLeft(); renderRight(); }
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = s2w(mx, my);
    E.cam.ppu = Math.max(0.3, Math.min(12, E.cam.ppu * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const after = s2w(mx, my);
    E.cam.x += before[0] - after[0]; E.cam.y += before[1] - after[1];
    draw();
  }, { passive: false });
  const onKey = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); redo(); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); save(); }
    else if ((e.code === 'Delete' || e.code === 'Backspace') && E.sel) {
      if (E.sel.t === 'ground') def.ground.splice(E.sel.k, 1);
      else if (E.sel.t === 'plat') def.platforms.splice(E.sel.k, 1);
      else return;
      commit(); rebuild(); sel(null);
    }
  };
  const ro = new ResizeObserver(() => draw());
  const renderAll = () => { renderLeft(); renderRight(); renderToolbar(); updateTitle(); draw(); };
  let raf = 0, alive = true;
  const loop = () => { if (!alive) return; raf = requestAnimationFrame(loop); if (stage && stage.players.some(Boolean)) { stage.step(); draw(); } };

  return {
    el,
    async enter() {
      stage = await Stage.load(def);
      renderAll();
      ro.observe(canvas);
      requestAnimationFrame(fit);
      window.addEventListener('keydown', onKey);
      raf = requestAnimationFrame(loop);
    },
    leave() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', onKey); },
  };
};
