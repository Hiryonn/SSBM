// Éditeur de personnages : animations, hitbox/hurtbox, coups, états, statistiques, couleurs.
import { h, clear, toast, confirmBox, num, slider, select, check, text, pickFiles, modal, promptBox } from './dom.js';
import { app, go, screens, saveFighter, bankFor, forgetBank } from '../app.js';
import { SpriteBank, AnimPlayer, drawFrame } from '../engine/sprites.js';
import { MOVE_SLOTS, MOVE_INFO, STATE_SLOTS, DEFAULT_STATS } from '../data/defs.js';
import { autoHits, makeMove } from '../import/mugen.js';
import { knockback } from '../engine/constants.js';
import { unpack, repack, addRGBA, nextFreeIndex, imageFileToRGBA, sliceSheet, keyOutCorner } from '../data/pack.js';
import { parseACT } from '../import/sff.js';
import { toBase64 } from '../import/inflate.js';
import { launchTraining } from './menus.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const CAT_LABEL = { sol: 'Au sol', smash: 'Smashs', air: 'Aériens', special: 'Spéciaux', chope: 'Chopes' };

screens.chareditor = (id, keep) => {
  const src = app.fighters.find((f) => f.id === id);
  if (!src && !keep) { toast('Perso introuvable', 'bad'); return screens.charlist(); }
  const def = keep?.def || clone(src);
  if (def.builtin && !keep) { def.builtin = false; def.id = 'f' + Date.now().toString(36); def.name = def.name + ' (copie)'; }
  def.moves = def.moves || {};
  for (const [slot] of MOVE_SLOTS) if (!def.moves[slot]) def.moves[slot] = makeMove(slot, null, def.anims);
  def.stats = { ...DEFAULT_STATS, ...def.stats };
  def.states = def.states || {};

  const E = {
    tab: keep?.tab || 'moves', move: keep?.move ?? 'jab', anim: keep?.anim ?? (def.moves.jab?.anim ?? def.states.idle ?? +Object.keys(def.anims)[0]),
    elem: 0, playing: false, loop: true, zoom: 3, panX: 0, panY: 0, onion: false, tool: 'select', selBox: null,
    dirty: !!keep?.dirty, undo: [], redo: [], bank: null, player: null, previewCostume: 0, filter: '',
  };

  // --------------------------------------------------------------- historique
  const snapshot = () => JSON.stringify({ anims: def.anims, moves: def.moves, states: def.states, stats: def.stats, costumes: def.costumes, name: def.name, scale: def.scale });
  let lastSnap = snapshot();
  const commit = () => {
    const s = snapshot();
    if (s === lastSnap) return;
    E.undo.push(lastSnap); if (E.undo.length > 60) E.undo.shift();
    E.redo = []; lastSnap = s; E.dirty = true; updateTitle();
  };
  const restore = (s) => { const o = JSON.parse(s); Object.assign(def, o); lastSnap = s; E.dirty = true; E.player.anims = def.anims; if (!def.anims[E.anim]) E.anim = animNos()[0]; E.elem = Math.min(E.elem, (curAnim()?.frames.length || 1) - 1); E.selBox = null; renderAll(); };
  const undo = () => { if (!E.undo.length) return; E.redo.push(snapshot()); restore(E.undo.pop()); };
  const redo = () => { if (!E.redo.length) return; E.undo.push(snapshot()); restore(E.redo.pop()); };

  // --------------------------------------------------------------- structure
  const titleEl = h('h1', null);
  const updateTitle = () => { titleEl.textContent = def.name + (E.dirty ? ' •' : ''); };
  const left = h('div', { class: 'ed-left' });
  const tabs = h('div', { class: 'tabs' });
  const leftBody = h('div', { class: 'ed-list' });
  left.append(tabs, leftBody);
  const canvas = h('canvas', { class: 'ed-canvas', tabindex: 0 });
  const toolbar = h('div', { class: 'ed-toolbar' });
  const timeline = h('div', { class: 'timeline' });
  const center = h('div', { class: 'ed-center' }, toolbar, h('div', { class: 'ed-stage' }, canvas), timeline);
  const right = h('div', { class: 'ed-right' });
  const stageSel = select(null, app.settings.stageId || app.stages[0]?.id, app.stages.map((s) => [s.id, s.name]), (v) => { app.settings.stageId = v; });

  const save = async () => {
    const saved = await saveFighter(def);
    if (saved.id !== def.id) Object.assign(def, { id: saved.id, name: saved.name, builtin: false });
    E.dirty = false; updateTitle();
    toast('Perso enregistré');
  };
  const test = () => {
    launchTraining({
      fighterDef: clone(def), stageId: app.settings.stageId, cpu: 0, title: 'Test : ' + def.name,
      back: () => go('chareditor', def.id, { def, tab: E.tab, move: E.move, anim: E.anim, dirty: E.dirty }),
    });
  };
  const back = async () => {
    if (E.dirty && !(await confirmBox('Quitter sans enregistrer ?', 'Les modifications non enregistrées seront perdues.', 'Quitter'))) return;
    go('charlist');
  };

  const el = h('div', { class: 'screen editor' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn ghost', onclick: back }, '← Persos'),
      titleEl,
      h('div', { class: 'bar-tools' },
        h('button', { class: 'btn ghost', title: 'Annuler (Ctrl+Z)', onclick: undo }, '↶'),
        h('button', { class: 'btn ghost', title: 'Rétablir (Ctrl+Y)', onclick: redo }, '↷'),
        stageSel,
        h('button', { class: 'btn', onclick: test }, '▶ Tester'),
        h('button', { class: 'btn primary', onclick: save }, 'Enregistrer'))),
    h('div', { class: 'ed-body' }, left, center, right));

  // --------------------------------------------------------------- utilitaires anim
  const animNos = () => Object.keys(def.anims).map(Number).sort((a, b) => a - b);
  const curAnim = () => def.anims[E.anim];
  const curFrame = () => curAnim()?.frames[E.elem];
  const usage = () => {
    const u = {};
    for (const [slot, label] of MOVE_SLOTS) { const m = def.moves[slot]; if (m?.anim != null) (u[m.anim] = u[m.anim] || []).push(label); if (m?.proj?.anim != null) (u[m.proj.anim] = u[m.proj.anim] || []).push('Projectile'); }
    for (const [slot, label] of STATE_SLOTS) { const a = def.states[slot]; if (a != null) (u[a] = u[a] || []).push(label); }
    return u;
  };
  // Échange deux emplacements de coups (ex. une anim importée au mauvais endroit)
  const swapMoves = (a, b) => {
    if (!a || !b || a === b) return;
    [def.moves[a], def.moves[b]] = [def.moves[b], def.moves[a]];
    commit();
    const cur = def.moves[E.move];
    if (cur?.anim != null && def.anims[cur.anim]) setAnim(cur.anim);
    renderLeft(); renderRight();
    toast('Échangé : ' + MOVE_INFO[a].label + ' ⇄ ' + MOVE_INFO[b].label);
  };
  const animOptions = (withNone = true) => [...(withNone ? [['', '— aucune —']] : []), ...animNos().map((n) => [n, n + ' · ' + def.anims[n].frames.length + ' él.' + (def.anims[n].frames.some((f) => f.c1.length) ? ' · ⚔' : '')])];
  const setAnim = (n, elem = 0) => {
    E.anim = n; E.elem = Math.max(0, Math.min(elem, (def.anims[n]?.frames.length || 1) - 1)); E.selBox = null;
    E.player.anims = def.anims; E.player.set(n, true);
    renderTimeline(); renderRight(); draw();
  };

  // --------------------------------------------------------------- panneau gauche
  const renderTabs = () => {
    clear(tabs);
    for (const [id, label] of [['moves', 'Coups'], ['anims', 'Anims'], ['states', 'États'], ['sheet', 'Fiche']]) {
      tabs.append(h('button', { class: 'tab' + (E.tab === id ? ' on' : ''), onclick: () => { E.tab = id; if (id !== 'moves') E.move = null; else if (!E.move) E.move = 'jab'; renderAll(); } }, label));
    }
  };
  const renderLeft = () => {
    clear(leftBody);
    if (E.tab === 'moves') {
      let cat = null;
      // Regroupés par catégorie (Au sol, Smashs, Aériens, Spéciaux, Chopes)
      const order = Object.keys(CAT_LABEL);
      const slots = [...MOVE_SLOTS].sort((a, b) => order.indexOf(a[2]) - order.indexOf(b[2]));
      for (const [slot, label, c] of slots) {
        if (c !== cat) { cat = c; leftBody.append(h('div', { class: 'list-head' }, CAT_LABEL[c] || c)); }
        const m = def.moves[slot];
        const hits = m?.hits?.length || 0;
        leftBody.append(h('button', {
          class: 'list-item' + (E.move === slot ? ' on' : '') + (m?.anim == null ? ' empty' : ''),
          onclick: () => { E.move = slot; if (m?.anim != null && def.anims[m.anim]) setAnim(m.anim); renderLeft(); renderRight(); },
          draggable: 'true', title: 'Glisse sur un autre coup pour les échanger',
          ondragstart: (e) => { e.dataTransfer.setData('text/plain', 'move:' + slot); e.dataTransfer.effectAllowed = 'move'; },
          ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('drop'); },
          ondragleave: (e) => e.currentTarget.classList.remove('drop'),
          ondrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('drop'); const d = e.dataTransfer.getData('text/plain') || ''; if (d.startsWith('move:')) swapMoves(d.slice(5), slot); },
        },
          h('span', null, label), h('small', null, m?.anim == null ? 'vide' : 'anim ' + m.anim + (hits ? ' · ' + hits + ' coup' + (hits > 1 ? 's' : '') + ' · ' + m.hits.reduce((s, x) => s + (+x.dmg || 0), 0) + '%' : ' · aucun coup'))));
      }
    } else if (E.tab === 'anims') {
      const u = usage();
      const search = h('input', { class: 'inp', placeholder: 'Chercher un numéro ou un usage…', value: E.filter });
      search.addEventListener('input', () => { E.filter = search.value; renderAnimList(); });
      const listBox = h('div');
      const renderAnimList = () => {
        clear(listBox);
        const q = E.filter.trim().toLowerCase();
        for (const n of animNos()) {
          const tags = (u[n] || []).join(', ');
          if (q && !String(n).includes(q) && !tags.toLowerCase().includes(q)) continue;
          const a = def.anims[n];
          listBox.append(h('button', { class: 'list-item' + (E.anim === n ? ' on' : ''), onclick: () => { setAnim(n); renderAnimList(); } },
            h('span', null, n, a.frames.some((f) => f.c1.length) ? h('i', { class: 'sword' }, ' ⚔') : null), h('small', null, tags || a.frames.length + ' éléments')));
        }
      };
      leftBody.append(
        h('div', { class: 'row gap' },
          h('button', { class: 'btn small', onclick: newAnim }, '+ Nouvelle'),
          h('button', { class: 'btn small', onclick: dupAnim }, 'Dupliquer'),
          h('button', { class: 'btn small danger', onclick: delAnim }, 'Supprimer')),
        search, listBox);
      renderAnimList();
    } else if (E.tab === 'states') {
      leftBody.append(h('p', { class: 'muted small' }, 'Quelle animation jouer dans chaque situation. Clique sur un état pour le prévisualiser.'));
      for (const [slot, label] of STATE_SLOTS) {
        const sel = select(null, def.states[slot] ?? '', animOptions(), (v) => { def.states[slot] = v === '' ? null : +v; commit(); if (v !== '') setAnim(+v); });
        leftBody.append(h('div', { class: 'state-row' }, h('button', { class: 'link', onclick: () => def.states[slot] != null && setAnim(def.states[slot]) }, label), sel));
      }
    } else if (E.tab === 'sheet') {
      renderSheet();
    }
  };

  const newAnim = async () => {
    const v = await promptBox('Nouvelle animation', 'Numéro de l\'animation', String(Math.max(...animNos(), 0) + 1));
    const n = parseInt(v, 10);
    if (isNaN(n)) return;
    if (def.anims[n]) { toast('Ce numéro existe déjà', 'bad'); return; }
    const f = curFrame();
    def.anims[n] = { loop: 0, frames: [{ g: f?.g ?? 0, i: f?.i ?? 0, ox: 0, oy: 0, t: 5, fh: false, fv: false, trans: '', c1: [], c2: clone(f?.c2 || []) }] };
    commit(); E.tab = 'anims'; renderAll(); setAnim(n);
  };
  const dupAnim = async () => {
    const v = await promptBox('Dupliquer l\'animation ' + E.anim, 'Numéro de la copie', String(Math.max(...animNos(), 0) + 1));
    const n = parseInt(v, 10);
    if (isNaN(n) || def.anims[n]) { if (!isNaN(n)) toast('Ce numéro existe déjà', 'bad'); return; }
    def.anims[n] = clone(curAnim());
    commit(); renderAll(); setAnim(n);
  };
  const delAnim = async () => {
    const u = usage()[E.anim];
    if (!(await confirmBox('Supprimer l\'animation ' + E.anim + ' ?', u ? 'Elle est utilisée par : ' + u.join(', ') + '.' : 'Elle n\'est utilisée nulle part.', 'Supprimer'))) return;
    delete def.anims[E.anim];
    commit();
    E.anim = animNos()[0];
    renderAll(); setAnim(E.anim);
  };

  // --------------------------------------------------------------- fiche
  const renderSheet = () => {
    const S = def.stats;
    const st = (label, key, step, min, max, help) => h('div', { class: 'stat' }, num(label, S[key], (v) => { S[key] = v; commit(); }, { step, min, max }), help ? h('small', null, help) : null);
    const costumes = h('div', { class: 'costumes' });
    const renderCostumes = () => {
      clear(costumes);
      const usedBySprites = new Set(def.pack.sprites.map((sp) => sp[7]));
      const palIdx = [...new Set([def.palBase ?? 0, ...(def.palettes || []).map((_, k) => k).filter((k) => !usedBySprites.has(k)), ...def.costumes.map((c) => c.pal)])];
      const palOpts = palIdx.map((k) => [k, k === (def.palBase ?? 0) ? 'Palette d\'origine' : 'Palette ' + k]);
      (def.costumes || []).forEach((c, k) => {
        const cv = h('canvas', { width: 48, height: 48, class: 'costume-cv' });
        const paint = async () => {
          E.bank.costumePals.delete(k);
          for (const key of [...E.bank.cache.keys()]) if (key.endsWith(',' + k)) E.bank.cache.delete(key);
          const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 48, 48);
          const p = def.portrait || def.icon;
          const s = p && E.bank.get(p[0], p[1], k);
          ctx.imageSmoothingEnabled = true;
          if (s) { const sc = Math.min(48 / s.w, 48 / s.h); ctx.drawImage(s.img, (48 - s.w * sc) / 2, 48 - s.h * sc, s.w * sc, s.h * sc); }
          else { const fr = def.anims[def.states.idle ?? 0]?.frames[0]; drawFrame(ctx, E.bank, fr, 24, 46, 1, 0.8 * (def.scale || 1), k, {}); }
        };
        costumes.append(h('div', { class: 'costume-row' }, cv,
          h('div', { class: 'grow' },
            text('Nom', c.name, (v) => { c.name = v; commit(); }),
            palOpts.length > 1 ? select('Palette', c.pal, palOpts, (v) => { c.pal = +v; commit(); paint(); if (E.previewCostume === k) draw(); }) : null,
            slider('Teinte', c.hue || 0, (v) => { c.hue = v; paint(); if (E.previewCostume === k) draw(); }, { min: 0, max: 359, step: 1, fmt: (v) => v + '°' })),
          h('div', { class: 'col' },
            h('button', { class: 'mini', title: 'Voir dans l\'aperçu', onclick: () => { E.previewCostume = k; draw(); renderTimeline(); } }, '👁'),
            k > 0 ? h('button', { class: 'mini', title: 'Supprimer', onclick: () => { def.costumes.splice(k, 1); commit(); renderCostumes(); } }, '✕') : null)));
        const inp = costumes.lastChild.querySelector('input[type=range]');
        inp && inp.addEventListener('change', commit);
        paint();
      });
      costumes.append(h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: () => { def.costumes.push({ name: 'Couleur ' + (def.costumes.length + 1), pal: def.palBase ?? 0, hue: 1 + Math.floor(Math.random() * 359) }); commit(); renderCostumes(); } }, '+ Couleur'),
        h('button', { class: 'btn small', onclick: importAct }, 'Importer une palette .act')));
    };
    const importAct = async () => {
      const files = await pickFiles({ multiple: true, accept: '.act' });
      for (const f of files) {
        const pal = parseACT(new Uint8Array(await f.arrayBuffer()));
        def.palettes.push(toBase64(pal));
        def.costumes.push({ name: f.name.replace(/\.act$/i, ''), pal: def.palettes.length - 1, hue: 0 });
      }
      if (files.length) { commit(); await reloadBank(); renderSheet(); }
    };
    const portrait = h('div', { class: 'row gap' },
      num('Portrait groupe', def.portrait?.[0] ?? '', (v) => { def.portrait = [v, def.portrait?.[1] ?? 0]; commit(); }, { cls: 'sm' }),
      num('n°', def.portrait?.[1] ?? '', (v) => { def.portrait = [def.portrait?.[0] ?? 9000, v]; commit(); }, { cls: 'sm' }),
      num('Icône groupe', def.icon?.[0] ?? '', (v) => { def.icon = [v, def.icon?.[1] ?? 0]; commit(); }, { cls: 'sm' }),
      num('n°', def.icon?.[1] ?? '', (v) => { def.icon = [def.icon?.[0] ?? 9000, v]; commit(); }, { cls: 'sm' }));
    leftBody.append(
      h('h3', null, 'Identité'),
      text('Nom', def.name, (v) => { def.name = v; updateTitle(); }),
      text('Auteur', def.author, (v) => { def.author = v; }),
      num('Échelle d\'affichage', def.scale, (v) => { def.scale = v; commit(); draw(); }, { step: 0.05, min: 0.1, max: 6 }),
      portrait,
      h('h3', null, 'Physique'),
      st('Poids', 'weight', 1, 40, 200, '100 = moyen. Plus lourd = éjecté moins loin.'),
      st('Vitesse de marche', 'walkSpeed', 0.1, 0, 6),
      st('Vitesse de course', 'runSpeed', 0.1, 0, 8),
      st('Vitesse en l\'air', 'airSpeed', 0.1, 0, 6),
      st('Accélération en l\'air', 'airAccel', 0.01, 0, 1),
      st('Gravité', 'gravity', 0.01, 0.05, 1),
      st('Vitesse de chute', 'fallSpeed', 0.1, 1, 12),
      st('Chute rapide', 'fastFallSpeed', 0.1, 1, 16),
      st('Force du saut', 'jumpForce', 0.1, 1, 15),
      st('Petit saut', 'shortHopForce', 0.1, 1, 12),
      st('Double saut', 'doubleJumpForce', 0.1, 1, 15),
      st('Nombre de sauts', 'jumps', 1, 1, 6),
      st('Adhérence au sol', 'traction', 0.01, 0.01, 1),
      st('Largeur du corps', 'width', 1, 4, 80, 'Sert aux collisions avec le décor et au rebord.'),
      st('Hauteur du corps', 'height', 1, 10, 200),
      h('h3', null, 'Couleurs'), costumes,
      h('h3', null, 'Sprites'),
      h('p', { class: 'muted small' }, 'Ajoute tes propres images (PNG avec transparence ou planche de sprites) pour créer de nouvelles anims.'),
      h('button', { class: 'btn small', onclick: addSprites }, 'Ajouter des sprites…'));
    renderCostumes();
  };

  const reloadBank = async () => {
    forgetBank(def.id);
    E.bank = await SpriteBank.load(def);
    draw(); renderTimeline();
  };

  const addSprites = async () => {
    const files = await pickFiles({ multiple: true, accept: 'image/*' });
    if (!files.length) return;
    const g = h('input', { class: 'inp', type: 'number', value: 7000 });
    const cols = h('input', { class: 'inp', type: 'number', value: 1, min: 1 });
    const rows = h('input', { class: 'inp', type: 'number', value: 1, min: 1 });
    const key = h('input', { type: 'checkbox' });
    const mk = h('input', { type: 'checkbox', checked: true });
    const ok = await modal('Ajouter ' + files.length + ' image(s)', h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', null, 'Groupe de sprites'), g),
      h('label', { class: 'field' }, h('span', null, 'Colonnes (planche)'), cols),
      h('label', { class: 'field' }, h('span', null, 'Lignes (planche)'), rows),
      h('label', { class: 'field check' }, key, h('span', null, 'Fond uni → transparent (couleur du coin)')),
      h('label', { class: 'field check' }, mk, h('span', null, 'Créer une nouvelle anim avec ces images'))),
    [{ label: 'Annuler', value: false }, { label: 'Ajouter', value: true, primary: true }]);
    if (!ok) return;
    const up = await unpack(def);
    const grp = parseInt(g.value, 10) || 7000;
    const added = [];
    for (const f of files) {
      let img = await imageFileToRGBA(f);
      if (key.checked) img = keyOutCorner(img);
      const parts = (+cols.value > 1 || +rows.value > 1) ? sliceSheet(img, Math.max(1, +cols.value | 0), Math.max(1, +rows.value | 0)) : [img];
      for (const p of parts) {
        const i = nextFreeIndex(up, grp);
        addRGBA(up, grp, i, p.w, p.h, p.rgba, Math.round(p.w / 2), p.h - 1);
        added.push([grp, i]);
      }
    }
    await repack(def, up);
    if (mk.checked && added.length) {
      const n = Math.max(...animNos(), 0) + 1;
      def.anims[n] = { loop: 0, frames: added.map(([gg, ii]) => ({ g: gg, i: ii, ox: 0, oy: 0, t: 6, fh: false, fv: false, trans: '', c1: [], c2: [[-10, -Math.round(def.stats.height), 10, 0]] })) };
      E.anim = n;
    }
    commit();
    await reloadBank();
    toast(added.length + ' sprite(s) ajouté(s)');
    E.tab = 'anims'; renderAll(); setAnim(E.anim);
  };

  // --------------------------------------------------------------- panneau droit
  const renderRight = () => {
    clear(right);
    if (E.move && E.tab === 'moves') right.append(movePanel());
    right.append(elemPanel());
  };

  const movePanel = () => {
    const slot = E.move;
    const m = def.moves[slot];
    const info = MOVE_INFO[slot];
    const wrap = h('div', { class: 'panel' }, h('h3', null, info.label));
    const animCount = curAnim()?.frames.length || 0;
    wrap.append(h('div', { class: 'row gap' },
      select('Animation', m.anim ?? '', animOptions(), (v) => { m.anim = v === '' ? null : +v; if (m.anim != null) { m.hits = autoHits(def.anims[m.anim], { ...info.d }); setAnim(m.anim); } commit(); renderLeft(); renderRight(); }),
      h('button', { class: 'btn small', title: 'Prendre l\'animation affichée au centre', onclick: () => { m.anim = E.anim; m.hits = autoHits(curAnim(), { ...info.d }); commit(); renderLeft(); renderRight(); renderTimeline(); } }, 'Utiliser l\'anim affichée')),
      h('div', { class: 'row gap' },
        select('Échanger avec un autre coup', '', [['', '— choisir —'], ...MOVE_SLOTS.filter(([id]) => id !== slot).map(([id, label]) => [id, label + (def.moves[id]?.anim != null ? ' (anim ' + def.moves[id].anim + ')' : ' (vide)')])], (v) => swapMoves(slot, v))));
    if (m.anim == null) { wrap.append(h('p', { class: 'muted' }, 'Choisis une animation pour ce coup.')); return wrap; }
    if (m.anim !== E.anim) wrap.append(h('p', { class: 'warn' }, 'L\'aperçu montre une autre anim. ', h('button', { class: 'link', onclick: () => setAnim(m.anim) }, 'Afficher l\'anim ' + m.anim)));
    // Groupes de coups
    const tbl = h('table', { class: 'hits' },
      h('thead', null, h('tr', null, ['Éléments', 'Dégâts', 'Angle', 'Base', 'Croiss.', ''].map((t) => h('th', null, t)))),
      h('tbody', null, (m.hits || []).map((g, k) => {
        const cell = (key, step = 1, w = 'n') => { const i = h('input', { class: 'inp ' + w, type: 'number', step, value: g[key] }); i.addEventListener('input', () => { const v = parseFloat(i.value); if (!isNaN(v)) { g[key] = v; if (key === 'angle') arrow.style.transform = `rotate(${-v}deg)`; updKB(); } }); i.addEventListener('change', () => { commit(); renderTimeline(); renderLeft(); }); return i; };
        const arrow = h('span', { class: 'angle-arrow', style: { transform: `rotate(${-(g.angle ?? 45)}deg)` } }, '➜');
        return h('tr', null,
          h('td', null, h('div', { class: 'row' }, cell('from', 1, 'xs'), '→', cell('to', 1, 'xs'))),
          h('td', null, cell('dmg', 0.5)),
          h('td', null, h('div', { class: 'row' }, cell('angle'), arrow)),
          h('td', null, cell('bkb')), h('td', null, cell('kbg')),
          h('td', null, h('button', { class: 'mini', title: 'Supprimer', onclick: () => { m.hits.splice(k, 1); commit(); renderRight(); renderTimeline(); } }, '✕')));
      })));
    const kbInfo = h('p', { class: 'kb-info' });
    const updKB = () => {
      const last = m.hits?.[m.hits.length - 1];
      if (!last) { kbInfo.textContent = ''; return; }
      const kbAt = (p) => Math.round(knockback(p + last.dmg, last.dmg, 100, last.bkb, last.kbg));
      let ko = null;
      for (let p = 0; p <= 400; p += 5) if (knockback(p + last.dmg, last.dmg, 100, last.bkb, last.kbg) >= 150) { ko = p; break; }
      kbInfo.textContent = `Dernier coup — éjection à 0 % : ${kbAt(0)} · à 100 % : ${kbAt(100)} · KO estimé ${ko != null ? 'vers ' + ko + ' %' : 'au-delà de 400 %'} (poids moyen, centre du stage).`;
    };
    updKB();
    wrap.append(h('div', { class: 'scroll' }, tbl), kbInfo,
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: () => { (m.hits = m.hits || []).push({ from: E.elem, to: E.elem, ...info.d }); commit(); renderRight(); renderTimeline(); } }, '+ Coup sur l\'élément ' + E.elem),
        h('button', { class: 'btn small', title: 'Recrée les coups à partir des hitbox rouges de l\'anim', onclick: () => { m.hits = autoHits(def.anims[m.anim], { ...info.d }); commit(); renderRight(); renderTimeline(); } }, 'Recalculer depuis les hitbox')),
      h('p', { class: 'muted small' }, 'Les hitbox rouges des éléments couverts infligent ce coup. Angle : 0 = devant, 90 = haut, 270 = bas (météore). Base = éjection minimale, Croissance = augmentation avec les %.'));
    // Options
    const elemOpts = [['', '—'], ...Array.from({ length: def.anims[m.anim]?.frames.length || animCount }, (_, k) => [k, 'élément ' + k])];
    wrap.append(h('h4', null, 'Comportement'),
      h('div', { class: 'grid2' },
        info.cat === 'air' || m.landLag ? num('Retard à l\'atterrissage', m.landLag || 0, (v) => { m.landLag = v; commit(); }, { min: 0, max: 60 }) : null,
        select('Charge (maintenir)', m.charge ?? '', elemOpts, (v) => { m.charge = v === '' ? null : +v; commit(); }),
        num('Élan horizontal', m.vx || 0, (v) => { m.vx = v; commit(); }, { step: 0.1 }),
        num('Élan vertical', m.vy || 0, (v) => { m.vy = v; commit(); }, { step: 0.1 }),
        select('Élan à partir de', m.at || 0, elemOpts.slice(1), (v) => { m.at = +v; commit(); })),
      check('Chute sans défense après le coup (comme un spécial haut)', m.helpless, (v) => { m.helpless = v; commit(); }),
      check('Coup vers l\'arrière (anim retournée)', m.flip, (v) => { m.flip = v; commit(); draw(); }));
    // Projectile
    const P = m.proj;
    wrap.append(h('h4', null, 'Projectile'), check('Ce coup lance un projectile', !!P, (v) => { m.proj = v ? { anim: null, at: Math.min(1, animCount - 1), x: 20, y: -30, vx: 4, vy: 0, life: 80, dmg: 6, angle: 40, bkb: 20, kbg: 50, gravity: 0, pierce: false } : null; commit(); renderRight(); }));
    if (P) {
      wrap.append(h('div', { class: 'grid2' },
        select('Anim du projectile', P.anim ?? '', animOptions(), (v) => { P.anim = v === '' ? null : +v; commit(); }),
        select('Lancé à l\'élément', P.at || 0, elemOpts.slice(1), (v) => { P.at = +v; commit(); }),
        num('Départ X', P.x, (v) => { P.x = v; commit(); }), num('Départ Y', P.y, (v) => { P.y = v; commit(); }),
        num('Vitesse X', P.vx, (v) => { P.vx = v; commit(); }, { step: 0.1 }), num('Vitesse Y', P.vy, (v) => { P.vy = v; commit(); }, { step: 0.1 }),
        num('Gravité', P.gravity || 0, (v) => { P.gravity = v; commit(); }, { step: 0.01 }), num('Durée (frames)', P.life, (v) => { P.life = v; commit(); }),
        num('Dégâts', P.dmg, (v) => { P.dmg = v; commit(); }, { step: 0.5 }), num('Angle', P.angle, (v) => { P.angle = v; commit(); }),
        num('Base', P.bkb, (v) => { P.bkb = v; commit(); }), num('Croissance', P.kbg, (v) => { P.kbg = v; commit(); })),
      check('Traverse les adversaires', P.pierce, (v) => { P.pierce = v; commit(); }));
    }
    return wrap;
  };

  const elemPanel = () => {
    const a = curAnim();
    const wrap = h('div', { class: 'panel' });
    if (!a) { wrap.append(h('p', { class: 'muted' }, 'Aucune animation.')); return wrap; }
    const f = a.frames[E.elem];
    wrap.append(h('h3', null, 'Anim ' + E.anim + ' · élément ' + E.elem + ' / ' + (a.frames.length - 1)));
    if (!f) return wrap;
    const spriteNav = (d) => {
      const list = E.bank ? [...E.bank.table.keys()].map((k) => k.split(',').map(Number)).sort((x, y) => x[0] - y[0] || x[1] - y[1]) : [];
      const k = list.findIndex(([g, i]) => g === f.g && i === f.i);
      const n = list[Math.max(0, Math.min(list.length - 1, (k < 0 ? 0 : k) + d))];
      if (n) { f.g = n[0]; f.i = n[1]; commit(); renderRight(); renderTimeline(); draw(); }
    };
    wrap.append(
      h('div', { class: 'grid2' },
        num('Sprite groupe', f.g, (v) => { f.g = v; commit(); draw(); renderTimeline(); }),
        num('Sprite n°', f.i, (v) => { f.i = v; commit(); draw(); renderTimeline(); })),
      h('div', { class: 'row gap' }, h('button', { class: 'btn small', onclick: () => spriteNav(-1) }, '◀ Sprite précédent'), h('button', { class: 'btn small', onclick: () => spriteNav(1) }, 'Sprite suivant ▶')),
      h('div', { class: 'grid2' },
        num('Décalage X', f.ox, (v) => { f.ox = v; commit(); draw(); }),
        num('Décalage Y', f.oy, (v) => { f.oy = v; commit(); draw(); }),
        num('Durée (frames, -1 = infini)', f.t, (v) => { f.t = v; commit(); renderTimeline(); }, { min: -1 }),
        select('Retourner', (f.fh ? 'H' : '') + (f.fv ? 'V' : ''), [['', 'Non'], ['H', 'Horizontal'], ['V', 'Vertical'], ['HV', 'Les deux']], (v) => { f.fh = v.includes('H'); f.fv = v.includes('V'); commit(); draw(); })),
      check('Transparence additive (effets lumineux)', f.trans === 'add', (v) => { f.trans = v ? 'add' : ''; commit(); draw(); }),
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: () => { a.frames.splice(E.elem + 1, 0, clone(f)); E.elem++; commit(); renderTimeline(); renderRight(); draw(); } }, 'Dupliquer l\'élément'),
        h('button', { class: 'btn small', onclick: () => moveElem(-1) }, '← Déplacer'),
        h('button', { class: 'btn small', onclick: () => moveElem(1) }, 'Déplacer →'),
        a.frames.length > 1 ? h('button', { class: 'btn small danger', onclick: () => { a.frames.splice(E.elem, 1); E.elem = Math.max(0, E.elem - 1); commit(); renderTimeline(); renderRight(); draw(); } }, 'Supprimer') : null),
      num('Boucle à partir de l\'élément', a.loop || 0, (v) => { a.loop = Math.max(0, Math.min(a.frames.length - 1, v | 0)); commit(); renderTimeline(); }, { min: 0 }));
    // Boîtes
    const boxes = h('div', { class: 'boxes' });
    const list = [...f.c1.map((b, k) => ['c1', k, b]), ...f.c2.map((b, k) => ['c2', k, b])];
    for (const [type, k, b] of list) {
      const isSel = E.selBox && E.selBox[0] === type && E.selBox[1] === k;
      const inp = (j) => { const i = h('input', { class: 'inp xs', type: 'number', value: b[j] }); i.addEventListener('input', () => { const v = parseFloat(i.value); if (!isNaN(v)) { b[j] = v; draw(); } }); i.addEventListener('change', commit); return i; };
      boxes.append(h('div', { class: 'box-row ' + type + (isSel ? ' on' : ''), onclick: () => { E.selBox = [type, k]; draw(); } },
        h('b', null, type === 'c1' ? 'Hitbox' : 'Hurtbox'), inp(0), inp(1), inp(2), inp(3),
        h('button', { class: 'mini', onclick: (e) => { e.stopPropagation(); f[type].splice(k, 1); E.selBox = null; commit(); renderRight(); draw(); renderTimeline(); } }, '✕')));
    }
    wrap.append(h('h4', null, 'Boîtes de collision'),
      h('p', { class: 'muted small' }, 'Rouge = frappe (hitbox), bleu = zone touchable (hurtbox). Dessine-les à la souris avec les outils au-dessus de l\'aperçu.'),
      boxes,
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: () => { const p = a.frames[E.elem - 1]; if (!p) return; f.c1 = clone(p.c1); f.c2 = clone(p.c2); commit(); renderRight(); draw(); renderTimeline(); } }, 'Copier depuis l\'élément précédent'),
        h('button', { class: 'btn small', onclick: () => { for (const o of a.frames) o.c2 = clone(f.c2); commit(); toast('Hurtbox appliquées à toute l\'anim'); } }, 'Hurtbox → toute l\'anim'),
        h('button', { class: 'btn small', onclick: () => { f.c1 = []; commit(); renderRight(); draw(); renderTimeline(); } }, 'Effacer les hitbox')));
    return wrap;
  };
  const moveElem = (d) => {
    const a = curAnim();
    const j = E.elem + d;
    if (j < 0 || j >= a.frames.length) return;
    [a.frames[E.elem], a.frames[j]] = [a.frames[j], a.frames[E.elem]];
    E.elem = j; commit(); renderTimeline(); renderRight(); draw();
  };

  // --------------------------------------------------------------- barre d'outils & frise
  const renderToolbar = () => {
    clear(toolbar);
    const tool = (id, label, title) => h('button', { class: 'tool' + (E.tool === id ? ' on' : ''), title, onclick: () => { E.tool = id; renderToolbar(); canvas.style.cursor = id === 'select' ? 'default' : id === 'sprite' ? 'move' : 'crosshair'; } }, label);
    toolbar.append(
      h('button', { class: 'tool', title: 'Élément précédent (←)', onclick: () => stepElem(-1) }, '⏮'),
      h('button', { class: 'tool play', title: 'Lecture / pause (Espace)', onclick: togglePlay }, E.playing ? '⏸' : '▶'),
      h('button', { class: 'tool', title: 'Élément suivant (→)', onclick: () => stepElem(1) }, '⏭'),
      h('span', { class: 'sep' }),
      tool('select', 'Sélection', 'Sélectionner, déplacer et redimensionner les boîtes'),
      tool('c1', '+ Hitbox', 'Dessiner une hitbox rouge'),
      tool('c2', '+ Hurtbox', 'Dessiner une hurtbox bleue'),
      tool('sprite', 'Déplacer le sprite', 'Glisser pour changer le décalage de l\'élément'),
      h('span', { class: 'sep' }),
      h('button', { class: 'tool' + (E.onion ? ' on' : ''), title: 'Afficher l\'élément précédent en transparence', onclick: () => { E.onion = !E.onion; renderToolbar(); draw(); } }, 'Pelure'),
      h('button', { class: 'tool', title: 'Zoom −', onclick: () => { E.zoom = Math.max(0.5, E.zoom / 1.25); draw(); } }, '−'),
      h('button', { class: 'tool', title: 'Zoom +', onclick: () => { E.zoom = Math.min(16, E.zoom * 1.25); draw(); } }, '+'),
      h('button', { class: 'tool', title: 'Recentrer', onclick: () => { E.panX = 0; E.panY = 0; E.zoom = 3; draw(); } }, 'Centrer'));
  };
  const timelineCanvases = [];
  const renderTimeline = () => {
    clear(timeline);
    timelineCanvases.length = 0;
    const a = curAnim();
    if (!a) return;
    const m = E.move && E.tab === 'moves' ? def.moves[E.move] : null;
    const total = AnimPlayer.length(a);
    timeline.append(h('div', { class: 'tl-info' }, 'Anim ' + E.anim + ' · ' + a.frames.length + ' éléments · ' + (total < 0 ? 'durée infinie' : total + ' frames (' + (total / 60).toFixed(2) + ' s)')));
    const row = h('div', { class: 'tl-row' });
    a.frames.forEach((f, k) => {
      const cv = h('canvas', { width: 64, height: 64 });
      const grp = m ? (m.hits || []).findIndex((g) => k >= g.from && k <= g.to) : -1;
      const cell = h('button', { class: 'tl-cell' + (k === E.elem ? ' on' : '') + (f.c1.length ? ' hit' : ''), onclick: () => { E.elem = k; E.playing = false; E.selBox = null; renderToolbar(); renderTimeline(); renderRight(); draw(); } },
        cv, h('span', { class: 'tl-t' }, f.t < 0 ? '∞' : f.t),
        grp >= 0 ? h('span', { class: 'tl-grp', title: 'Coup n°' + (grp + 1) }, grp + 1) : null,
        m && m.charge === k ? h('span', { class: 'tl-charge', title: 'Charge' }, 'C') : null,
        a.loop === k && k > 0 ? h('span', { class: 'tl-loop', title: 'Début de boucle' }, '↻') : null,
        h('span', { class: 'tl-n' }, k));
      row.append(cell);
      timelineCanvases.push([cv, f]);
    });
    timeline.append(row);
    paintTimeline();
    const on = row.querySelector('.on');
    on && on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  const paintTimeline = () => {
    if (!E.bank) return;
    for (const [cv, f] of timelineCanvases) {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 64, 64);
      const s = E.bank.get(f.g, f.i, E.previewCostume);
      if (!s) continue;
      const sc = Math.min(1.5, 60 / Math.max(s.w, s.h));
      ctx.imageSmoothingEnabled = sc < 1;
      ctx.save(); ctx.translate(32, 32); ctx.scale(sc * (f.fh ? -1 : 1), sc * (f.fv ? -1 : 1));
      ctx.drawImage(s.img, -s.w / 2, -s.h / 2); ctx.restore();
    }
  };

  const stepElem = (d) => {
    const a = curAnim(); if (!a) return;
    E.playing = false;
    E.elem = (E.elem + d + a.frames.length) % a.frames.length;
    E.selBox = null;
    renderToolbar(); renderTimeline(); renderRight(); draw();
  };
  const togglePlay = () => {
    E.playing = !E.playing;
    if (E.playing) { E.player.set(E.anim, true); E.player.elem = 0; }
    else { E.elem = E.player.elem; renderTimeline(); renderRight(); }
    renderToolbar();
  };

  // --------------------------------------------------------------- aperçu
  const origin = () => ({ x: canvas.width / 2 + E.panX, y: canvas.height * 0.78 + E.panY });
  const toLocal = (mx, my) => { const o = origin(); const z = E.zoom * (def.scale || 1); return [(mx - o.x) / z, (my - o.y) / z]; };
  const flipX = () => (E.tab === 'moves' && E.move && def.moves[E.move]?.flip ? -1 : 1);
  const draw = () => {
    const W = canvas.clientWidth | 0, H = canvas.clientHeight | 0;
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#151a33'; ctx.fillRect(0, 0, W, H);
    const o = origin();
    const z = E.zoom * (def.scale || 1);
    // grille
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    const step = 10 * z;
    for (let x = o.x % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = o.y % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(W, o.y); ctx.stroke();
    // corps (taille de collision)
    ctx.setTransform(z, 0, 0, z, o.x, o.y);
    ctx.fillStyle = 'rgba(255,220,0,0.06)';
    ctx.fillRect(-def.stats.width / 2, -def.stats.height, def.stats.width, def.stats.height);
    if (!E.bank) return;
    const a = curAnim();
    const fr = E.playing ? E.player.frame : a?.frames[E.elem];
    ctx.imageSmoothingEnabled = false;
    if (E.onion && !E.playing && a && a.frames.length > 1) {
      ctx.globalAlpha = 0.3;
      drawFrame(ctx, E.bank, a.frames[(E.elem - 1 + a.frames.length) % a.frames.length], 0, 0, flipX(), 1, E.previewCostume, {});
      ctx.globalAlpha = 1;
    }
    drawFrame(ctx, E.bank, fr, 0, 0, flipX(), 1, E.previewCostume, {});
    if (!fr) return;
    // boîtes
    const lw = 1 / z;
    const drawBoxes = (list, type) => list.forEach((b, k) => {
      const sel = E.selBox && E.selBox[0] === type && E.selBox[1] === k && !E.playing;
      const x1 = b[0] * flipX(), x2 = b[2] * flipX();
      ctx.fillStyle = type === 'c1' ? 'rgba(255,40,60,0.28)' : 'rgba(60,140,255,0.22)';
      ctx.strokeStyle = type === 'c1' ? '#ff4a5a' : '#58a6ff';
      ctx.lineWidth = (sel ? 2.5 : 1.2) * lw;
      ctx.fillRect(Math.min(x1, x2), b[1], Math.abs(x2 - x1), b[3] - b[1]);
      ctx.strokeRect(Math.min(x1, x2), b[1], Math.abs(x2 - x1), b[3] - b[1]);
      if (sel) {
        ctx.fillStyle = '#fff';
        for (const [hx, hy] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) ctx.fillRect(hx * flipX() - 3 * lw, hy - 3 * lw, 6 * lw, 6 * lw);
      }
    });
    drawBoxes(fr.c2, 'c2');
    drawBoxes(fr.c1, 'c1');
    // axe
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
    if (drag && drag.mode === 'draw') {
      ctx.strokeStyle = '#fff'; ctx.setLineDash([4 * lw, 3 * lw]);
      ctx.strokeRect(Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1), Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
      ctx.setLineDash([]);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    const info = E.bank.info(fr.g, fr.i);
    ctx.fillText(`Sprite ${fr.g},${fr.i}${info ? ' · ' + info.w + '×' + info.h : ' (introuvable)'} · zoom ${E.zoom.toFixed(1)} · molette pour zoomer, clic droit pour déplacer la vue`, 10, H - 10);
  };

  // --------------------------------------------------------------- souris
  let drag = null;
  const hitTest = (lx, ly) => {
    const f = curFrame(); if (!f) return null;
    const tol = 5 / (E.zoom * (def.scale || 1));
    const X = (v) => v * flipX();
    const order = [];
    if (E.selBox) order.push(E.selBox);
    f.c1.forEach((_, k) => order.push(['c1', k])); f.c2.forEach((_, k) => order.push(['c2', k]));
    for (const [type, k] of order) {
      const b = f[type][k]; if (!b) continue;
      const corners = [[0, 1], [2, 1], [0, 3], [2, 3]];
      for (const [cx, cy] of corners) if (Math.abs(lx - X(b[cx])) < tol * 1.5 && Math.abs(ly - b[cy]) < tol * 1.5) return { type, k, corner: [cx, cy] };
      const x1 = Math.min(X(b[0]), X(b[2])), x2 = Math.max(X(b[0]), X(b[2]));
      if (lx >= x1 && lx <= x2 && ly >= b[1] && ly <= b[3]) return { type, k };
    }
    return null;
  };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const [lx, ly] = toLocal(mx, my);
    if (e.button === 1 || e.button === 2) { drag = { mode: 'pan', mx, my, px: E.panX, py: E.panY }; return; }
    const f = curFrame(); if (!f) return;
    if (E.playing) togglePlay();
    if (E.tool === 'c1' || E.tool === 'c2') { drag = { mode: 'draw', type: E.tool, x0: Math.round(lx), y0: Math.round(ly), x1: Math.round(lx), y1: Math.round(ly) }; return; }
    if (E.tool === 'sprite') { drag = { mode: 'sprite', lx, ly, ox: f.ox, oy: f.oy }; return; }
    const hit = hitTest(lx, ly);
    if (hit) {
      E.selBox = [hit.type, hit.k];
      const b = f[hit.type][hit.k];
      drag = { mode: hit.corner ? 'resize' : 'move', hit, lx, ly, orig: b.slice() };
      renderRight();
    } else { E.selBox = null; drag = { mode: 'pan', mx, my, px: E.panX, py: E.panY }; renderRight(); }
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const [lx, ly] = toLocal(mx, my);
    const f = curFrame();
    if (drag.mode === 'pan') { E.panX = drag.px + mx - drag.mx; E.panY = drag.py + my - drag.my; }
    else if (drag.mode === 'draw') { drag.x1 = Math.round(lx); drag.y1 = Math.round(ly); }
    else if (drag.mode === 'sprite') { f.ox = Math.round(drag.ox + (lx - drag.lx) * flipX()); f.oy = Math.round(drag.oy + ly - drag.ly); }
    else if (drag.mode === 'move' || drag.mode === 'resize') {
      const b = f[drag.hit.type][drag.hit.k];
      const dx = Math.round((lx - drag.lx) * flipX()), dy = Math.round(ly - drag.ly);
      if (drag.mode === 'move') { b[0] = drag.orig[0] + dx; b[2] = drag.orig[2] + dx; b[1] = drag.orig[1] + dy; b[3] = drag.orig[3] + dy; }
      else { const [cx, cy] = drag.hit.corner; b[cx] = drag.orig[cx] + dx; b[cy] = drag.orig[cy] + dy; }
    }
    draw();
  });
  const endDrag = () => {
    if (!drag) return;
    const f = curFrame();
    if (drag.mode === 'draw' && f) {
      const x0 = drag.x0 * flipX(), x1 = drag.x1 * flipX();
      const b = [Math.min(x0, x1), Math.min(drag.y0, drag.y1), Math.max(x0, x1), Math.max(drag.y0, drag.y1)];
      if (b[2] - b[0] >= 2 && b[3] - b[1] >= 2) {
        f[drag.type].push(b);
        E.selBox = [drag.type, f[drag.type].length - 1];
        // une hitbox dessinée dans un coup sans groupe sur cet élément : on en crée un
        if (drag.type === 'c1' && E.tab === 'moves' && E.move) {
          const m = def.moves[E.move];
          if (m.anim === E.anim && !(m.hits || []).some((g) => E.elem >= g.from && E.elem <= g.to)) (m.hits = m.hits || []).push({ from: E.elem, to: E.elem, ...MOVE_INFO[E.move].d });
        }
      }
    }
    if (drag.mode === 'resize' || drag.mode === 'move') {
      const b = f[drag.hit.type][drag.hit.k];
      const n = [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])];
      b.splice(0, 4, ...n);
    }
    const changed = drag.mode !== 'pan';
    drag = null;
    if (changed) { commit(); renderRight(); renderTimeline(); }
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = toLocal(mx, my);
    E.zoom = Math.max(0.5, Math.min(16, E.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const o = origin(); const z = E.zoom * (def.scale || 1);
    E.panX += mx - (o.x + before[0] * z); E.panY += my - (o.y + before[1] * z);
    draw();
  }, { passive: false });

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') { e.preventDefault(); redo(); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); save(); }
    else if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); stepElem(-1); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); stepElem(1); }
    else if ((e.code === 'Delete' || e.code === 'Backspace') && E.selBox) {
      const f = curFrame(); f[E.selBox[0]].splice(E.selBox[1], 1); E.selBox = null; commit(); renderRight(); renderTimeline(); draw();
    }
  };

  let raf = 0, alive = true;
  const loop = () => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    if (E.playing) {
      E.player.step();
      if (E.player.ended && !E.loop) { E.playing = false; renderToolbar(); }
      draw();
    }
  };
  const ro = new ResizeObserver(() => draw());

  const renderAll = () => { renderTabs(); renderLeft(); renderToolbar(); renderTimeline(); renderRight(); updateTitle(); draw(); };

  return {
    el,
    async enter() {
      E.bank = await SpriteBank.load(def);
      E.player = new AnimPlayer(def.anims);
      if (!def.anims[E.anim]) E.anim = animNos()[0];
      E.player.set(E.anim);
      renderAll();
      ro.observe(canvas);
      window.addEventListener('keydown', onKey);
      raf = requestAnimationFrame(loop);
    },
    leave() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', onKey); },
  };
};
