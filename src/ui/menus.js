// Écran titre, sélection des persos et du stage, entraînement.
import { h, clear, toast, select, check, num } from './dom.js';
import { app, go, screens, drawFighterThumb, drawStageThumb, saveSettings, bankFor, isPersistent, endPreview } from '../app.js';
import { desktop } from '../data/game.js';
import { Match } from '../engine/match.js';
import { PLAYER_COLORS } from '../data/defs.js';
import { AnimPlayer, drawFrame } from '../engine/sprites.js';
import { sfx, unlockAudio } from '../engine/audio.js';
import { getPads } from '../engine/input.js';

// ------------------------------------------------------------------ Titre
screens.title = () => {
  const canvas = h('canvas', { class: 'attract' });
  const item = (label, sub, fn, cls = '') => h('button', { class: 'menu-item ' + cls, onclick: () => { unlockAudio(); sfx('menu'); fn(); } },
    h('span', { class: 'mi-label' }, label), h('span', { class: 'mi-sub' }, sub));
  const counts = `${app.fighters.length} perso${app.fighters.length > 1 ? 's' : ''} · ${app.stages.length} stage${app.stages.length > 1 ? 's' : ''}`;
  const G = app.player;
  let el;
  if (G) {
    // ---- Écran titre d'un jeu exporté (ou de son aperçu)
    const exitPreview = () => { endPreview(); go('exporter'); };
    const logo = G.logo
      ? h('img', { class: 'game-logo', src: G.logo, alt: G.name })
      : h('div', { class: 'logo' }, h('span', { class: 'l1' }, G.name));
    const dk = desktop();
    el = h('div', { class: 'screen title' + (G.titleImage ? ' has-image' : ''), style: G.titleImage ? { backgroundImage: `url("${G.titleImage}")` } : null },
      G.titleImage ? null : canvas,
      app.preview ? h('div', { class: 'preview-banner' }, 'Aperçu de « ' + G.name + ' »', h('button', { class: 'btn small', onclick: exitPreview }, 'Revenir à « Créer mon jeu »')) : null,
      h('div', { class: 'title-wrap' },
        logo,
        G.subtitle ? h('p', { class: 'tagline' }, G.subtitle) : null,
        h('nav', { class: 'menu' },
          item('Combat', 'Jusqu\'à 4 joueurs ou CPU', () => go('versus'), 'red'),
          G.training ? item('Entraînement', 'Entraîne-toi avec ton perso', () => go('training'), 'yellow') : null,
          item('Options', 'Touches, manettes, son', () => go('options')),
          dk && !app.preview ? item('Quitter', '', () => dk.quit()) : null),
        h('p', { class: 'foot' }, [G.author ? 'Par ' + G.author : null, 'Version ' + (G.gameVersion || '1.0'), 'Créé avec PlatFight Studio'].filter(Boolean).join(' · '))));
    el.addEventListener('keydown', (e) => { if (e.code === 'Escape' && app.preview) exitPreview(); });
  } else el = h('div', { class: 'screen title' }, canvas,
    h('div', { class: 'title-wrap' },
      h('div', { class: 'logo' }, h('span', { class: 'l1' }, 'PLATFIGHT'), h('span', { class: 'l2' }, 'STUDIO')),
      h('p', { class: 'tagline' }, 'Crée ton jeu de combat façon Smash, importe tes persos Mugen et JUS, et joue jusqu\'à 4.'),
      h('nav', { class: 'menu' },
        item('Combat', 'Jusqu\'à 4 joueurs ou CPU', () => go('versus'), 'red'),
        item('Entraînement', 'Teste un perso, hitbox visibles', () => go('training'), 'yellow'),
        item('Éditeur de persos', 'Anims, hitbox, coups, stats', () => go('charlist'), 'blue'),
        item('Éditeur de stages', 'Sols, plateformes, décor, zones de KO', () => go('stagelist'), 'green'),
        item('Créer mon jeu', 'Exporte ton propre jeu, prêt à partager', () => go('exporter'), 'yellow'),
        item('Importer', 'Persos et stages Mugen (.def/.sff/.air), zip', () => go('importer')),
        item('Options', 'Touches, son, physique, sauvegardes', () => go('options'))),
      h('p', { class: 'foot' }, counts, isPersistent() ? '' : ' · ⚠ stockage indisponible : rien ne sera gardé à la fermeture')));
  let match = null, raf = 0, alive = true;
  const loop = () => {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const W = canvas.clientWidth | 0, H = canvas.clientHeight | 0;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    if (!match) return;
    match.step();
    match.draw(canvas.getContext('2d'), W, H);
  };
  return {
    el,
    async enter() {
      if (G && G.titleImage) return;
      const pool = app.fighters;
      const stage = (G && G.titleStage && app.stages.find((x) => x.id === G.titleStage)) || app.stages[Math.floor(Math.random() * app.stages.length)];
      if (!stage) return;
      const n = pool.length ? Math.min(4, Math.max(2, pool.length)) : 0;
      const players = Array.from({ length: n }, (_, k) => ({ def: pool[(k + Math.floor(Math.random() * pool.length)) % pool.length], type: 'cpu', level: 4 + k, costume: k }));
      try {
        match = await Match.create({ stageDef: stage, players, rules: { mode: 'stock', stocks: 99 }, music: false, training: true });
        match.noHUD = true;
        if (!alive) return;
      } catch (e) { console.warn(e); }
      raf = requestAnimationFrame(loop);
    },
    leave() { alive = false; cancelAnimationFrame(raf); },
  };
};

// ------------------------------------------------------------------ VS
const SOURCES = [['kb0', 'Clavier 1'], ['kb1', 'Clavier 2'], ['pad0', 'Manette 1'], ['pad1', 'Manette 2'], ['pad2', 'Manette 3'], ['pad3', 'Manette 4']];
const srcObj = (s) => (s.startsWith('kb') ? { type: 'kb', slot: +s.slice(2) } : { type: 'pad', index: +s.slice(3) });

function defaultPlayers() {
  const f = app.fighters;
  return [0, 1, 2, 3].map((k) => ({
    type: k === 0 ? 'human' : k === 1 ? 'cpu' : 'off', src: k === 0 ? 'kb0' : 'kb1', level: 5,
    fighterId: f[k % f.length]?.id, costume: 0, team: k % 2,
  }));
}

function noFighters(title) {
  return {
    el: h('div', { class: 'screen panel-screen' },
      h('header', { class: 'bar' }, h('button', { class: 'btn ghost back-menu', onclick: () => go('title') }, '← Menu'), h('h1', null, title)),
      h('div', { class: 'card narrow' },
        h('h2', null, 'Aucun perso pour l\'instant'),
        h('p', null, 'Importe un perso Mugen / JUS (dossier, fichiers ou .zip) ou un fichier PlatFight pour commencer.'),
        h('button', { class: 'btn primary big', onclick: () => go('importer') }, 'Importer un perso'))),
  };
}

screens.versus = () => {
  if (!app.fighters.length) return noFighters('Combat');
  const S = app.settings;
  if (!S.players || S.players.length !== 4) S.players = defaultPlayers();
  for (const p of S.players) if (!app.fighters.some((f) => f.id === p.fighterId)) p.fighterId = app.fighters[0]?.id;
  if (!app.stages.some((s) => s.id === S.stageId)) S.stageId = app.stages[0]?.id;
  let active = 0;
  const roster = h('div', { class: 'roster' });
  const slots = h('div', { class: 'slots' });
  const stages = h('div', { class: 'stage-grid' });
  const rules = h('div', { class: 'rules' });
  const previews = [];

  const renderRoster = () => {
    clear(roster);
    for (const f of app.fighters) {
      const cv = h('canvas', { width: 96, height: 96 });
      const taken = S.players.map((p, k) => (p.type !== 'off' && p.fighterId === f.id ? k : -1)).filter((k) => k >= 0);
      roster.append(h('button', { class: 'char-card', onclick: () => pick(f) },
        cv, h('span', { class: 'cc-name' }, f.name),
        h('span', { class: 'cc-tags' }, taken.map((k) => h('i', { style: { background: PLAYER_COLORS[k] } }, k + 1)))));
      drawFighterThumb(f, cv, 0);
    }
  };
  const pick = (f) => {
    const p = S.players[active];
    p.fighterId = f.id;
    if (p.type === 'off') p.type = 'cpu';
    // costume différent si le même perso est déjà pris
    const same = S.players.filter((q, k) => k !== active && q.type !== 'off' && q.fighterId === f.id).map((q) => q.costume);
    p.costume = 0;
    while (same.includes(p.costume) && p.costume < (f.costumes?.length || 1) - 1) p.costume++;
    sfx('menu');
    active = (active + 1) % 4;
    for (let n = 0; n < 4 && S.players[active].type === 'off'; n++) active = (active + 1) % 4;
    renderSlots(); renderRoster();
  };

  const renderSlots = () => {
    clear(slots);
    previews.length = 0;
    S.players.forEach((p, k) => {
      const f = app.fighters.find((x) => x.id === p.fighterId);
      const cv = h('canvas', { width: 150, height: 120 });
      const typeBtn = h('button', { class: 'type-btn', onclick: (e) => { e.stopPropagation(); p.type = { human: 'cpu', cpu: 'off', off: 'human' }[p.type]; renderSlots(); renderRoster(); } },
        { human: 'JOUEUR', cpu: 'CPU', off: 'VIDE' }[p.type]);
      const costumes = f?.costumes?.length || 1;
      const body = p.type === 'off' ? h('div', { class: 'slot-empty' }, 'Cliquer sur JOUEUR / CPU pour ajouter') : [
        cv,
        h('div', { class: 'slot-name' }, f ? f.name : '—'),
        h('div', { class: 'slot-row' },
          h('button', { class: 'mini', title: 'Couleur précédente', onclick: (e) => { e.stopPropagation(); p.costume = (p.costume - 1 + costumes) % costumes; renderSlots(); } }, '◀'),
          h('span', { class: 'costume' }, f?.costumes?.[p.costume]?.name || 'Couleur ' + (p.costume + 1)),
          h('button', { class: 'mini', title: 'Couleur suivante', onclick: (e) => { e.stopPropagation(); p.costume = (p.costume + 1) % costumes; renderSlots(); } }, '▶')),
        p.type === 'human'
          ? select(null, p.src, SOURCES, (v) => { p.src = v; })
          : select(null, p.level, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, 'Niveau ' + n]), (v) => { p.level = +v; }),
        S.rules.teams ? select(null, p.team, [[0, 'Équipe rouge'], [1, 'Équipe bleue']], (v) => { p.team = +v; }) : null,
      ];
      const slot = h('div', { class: 'slot' + (k === active ? ' active' : '') + (p.type === 'off' ? ' off' : ''), style: { '--pc': PLAYER_COLORS[k] }, onclick: () => { active = k; renderSlots(); } },
        h('div', { class: 'slot-head' }, h('b', null, 'J' + (k + 1)), typeBtn), body);
      for (const x of slot.querySelectorAll('select')) x.addEventListener('click', (e) => e.stopPropagation());
      slots.append(slot);
      if (f && p.type !== 'off') previews.push({ f, cv, costume: p.costume });
    });
    startPreviews();
  };

  let pRaf = 0;
  const startPreviews = async () => {
    cancelAnimationFrame(pRaf);
    const items = [];
    for (const pv of previews) {
      const bank = await bankFor(pv.f);
      const ap = new AnimPlayer(pv.f.anims);
      ap.set(pv.f.states?.idle ?? 0);
      items.push({ ...pv, bank, ap });
    }
    const tick = () => {
      pRaf = requestAnimationFrame(tick);
      for (const it of items) {
        it.ap.step();
        const ctx = it.cv.getContext('2d');
        ctx.clearRect(0, 0, it.cv.width, it.cv.height);
        ctx.imageSmoothingEnabled = false;
        const fr = it.ap.frame;
        const info = fr && it.bank.info(fr.g, fr.i);
        const sc = info ? Math.min(2.2, 100 / Math.max(30, it.f.stats.height * it.f.scale)) * it.f.scale : 2;
        drawFrame(ctx, it.bank, fr, it.cv.width / 2, it.cv.height - 6, 1, sc, it.costume, {});
      }
    };
    tick();
  };

  const renderStages = () => {
    clear(stages);
    for (const s of app.stages) {
      const cv = h('canvas', { width: 192, height: 108 });
      stages.append(h('button', { class: 'stage-card' + (s.id === S.stageId ? ' sel' : ''), onclick: () => { S.stageId = s.id; sfx('menu'); renderStages(); } }, cv, h('span', null, s.name)));
      drawStageThumb(s, cv);
    }
  };

  const renderRules = () => {
    clear(rules);
    rules.append(
      select('Mode', S.rules.mode, [['stock', 'Vies'], ['time', 'Temps']], (v) => { S.rules.mode = v; renderRules(); }),
      S.rules.mode === 'stock'
        ? num('Vies', S.rules.stocks, (v) => { S.rules.stocks = Math.max(1, Math.min(99, v | 0)); }, { min: 1, max: 99 })
        : num('Minutes', S.rules.time, (v) => { S.rules.time = Math.max(1, Math.min(99, v)); }, { min: 1, max: 99 }),
      check('Équipes', S.rules.teams, (v) => { S.rules.teams = v; renderSlots(); }),
      check('Afficher les hitbox', S.rules.debug, (v) => { S.rules.debug = v; }),
    );
  };

  const start = () => {
    const ps = S.players.map((p, k) => ({ ...p, port: k })).filter((p) => p.type !== 'off' && p.fighterId);
    if (ps.length < 2) { toast('Il faut au moins 2 combattants.', 'bad'); return; }
    const stageDef = app.stages.find((s) => s.id === S.stageId) || app.stages[0];
    saveSettings();
    const players = ps.map((p) => ({
      def: app.fighters.find((f) => f.id === p.fighterId), type: p.type === 'cpu' ? 'cpu' : 'human',
      source: srcObj(p.src), level: p.level, costume: p.costume, port: p.port, team: S.rules.teams ? p.team : p.port,
    }));
    const r = S.rules;
    go('game', {
      cfg: { stageDef, players, rules: { mode: r.mode, stocks: r.stocks, time: Math.round(r.time * 60), teams: r.teams }, debug: r.debug },
      back: () => go('versus'),
    });
  };

  // ---- Manettes : chaque manette rejoint un emplacement en appuyant sur un bouton
  const padSlot = (i) => S.players.findIndex((p) => p.type === 'human' && p.src === 'pad' + i);
  const autoPads = () => {
    const pads = getPads();
    if (!pads.length || S.players.some((p) => p.type === 'human' && p.src.startsWith('pad'))) return;
    const j1 = S.players[0];
    if (j1.type === 'human' && j1.src.startsWith('kb')) { j1.src = 'pad' + pads[0].index; toast('Manette détectée : elle contrôle J1'); }
  };
  const joinPad = (i) => {
    if (padSlot(i) >= 0) return padSlot(i);
    let k = S.players.findIndex((p) => p.type === 'off');
    if (k < 0) k = S.players.findIndex((p) => p.type === 'cpu');
    if (k < 0) return -1;
    S.players[k].type = 'human';
    S.players[k].src = 'pad' + i;
    active = k;
    toast('Manette ' + (i + 1) + ' → J' + (k + 1));
    sfx('menu');
    renderSlots(); renderRoster();
    return k;
  };
  const onPadConnect = () => { autoPads(); renderSlots(); };

  const el = h('div', { class: 'screen versus' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn ghost back-menu', onclick: () => go('title') }, '← Menu'),
      h('h1', null, 'Combat'),
      h('button', { class: 'btn primary big go', onclick: start }, 'C\'EST PARTI !')),
    h('div', { class: 'vs-body' },
      h('section', { class: 'vs-left' },
        h('h2', null, 'Personnages', h('small', null, ' · clique un emplacement en bas, puis un perso · manette : appuie sur un bouton pour rejoindre, Start pour lancer')),
        roster, slots),
      h('aside', { class: 'vs-right' },
        h('h2', null, 'Stage'), stages,
        h('h2', null, 'Règles'), rules)));
  return {
    el,
    enter() {
      autoPads();
      renderRoster(); renderSlots(); renderStages(); renderRules();
      window.addEventListener('gamepadconnected', onPadConnect);
    },
    leave() { cancelAnimationFrame(pRaf); saveSettings(); window.removeEventListener('gamepadconnected', onPadConnect); },
    // Une manette pas encore attribuée rejoint la partie au premier appui
    padPress(i) { if (padSlot(i) < 0) { joinPad(i); return true; } return false; },
    // Valider un perso avec la manette l'attribue à l'emplacement de cette manette
    padOwner(i) { const k = padSlot(i); if (k >= 0) active = k; },
    padStart() { start(); },
  };
};

// ------------------------------------------------------------------ Entraînement
screens.training = (preset = {}) => {
  if (!app.fighters.length) return noFighters('Entraînement');
  const known = (id) => app.fighters.some((f) => f.id === id) ? id : null;
  const st = { fighterId: known(preset.fighterId) || known(app.settings.trainF) || app.fighters[0]?.id, stageId: preset.stageId || app.settings.stageId || app.stages[0]?.id, cpu: preset.cpu ?? 0, src: preset.src || (getPads()[0] ? 'pad' + getPads()[0].index : 'kb0'), costume: 0, oppId: null };
  const body = h('div', { class: 'train-body' });
  const render = () => {
    clear(body);
    body.append(
      select('Ton perso', st.fighterId, app.fighters.map((f) => [f.id, f.name]), (v) => { st.fighterId = v; }),
      select('Commandes', st.src, SOURCES, (v) => { st.src = v; }),
      select('Adversaire', st.oppId || '', [['', 'Le même perso'], ...app.fighters.map((f) => [f.id, f.name])], (v) => { st.oppId = v || null; }),
      select('Comportement de l\'adversaire', st.cpu, [[0, 'Immobile (sac de frappe)'], ...[1, 3, 5, 7, 9].map((n) => [n, 'CPU niveau ' + n])], (v) => { st.cpu = +v; }),
      select('Stage', st.stageId, app.stages.map((s) => [s.id, s.name]), (v) => { st.stageId = v; }),
      h('button', { class: 'btn primary big', onclick: launch }, 'Lancer'));
  };
  const launch = () => {
    app.settings.trainF = st.fighterId;
    launchTraining({ fighterId: st.fighterId, stageId: st.stageId, cpu: st.cpu, src: st.src, oppId: st.oppId, back: () => go('training', st) });
  };
  const el = h('div', { class: 'screen panel-screen' },
    h('header', { class: 'bar' }, h('button', { class: 'btn ghost back-menu', onclick: () => go('title') }, '← Menu'), h('h1', null, 'Entraînement')),
    h('div', { class: 'card narrow' }, h('p', { class: 'muted' }, 'Pourcentages remis à zéro avec R, hitbox avec H, vies infinies.'), body));
  return { el, enter: render };
};

export function launchTraining({ fighterId, fighterDef, stageId, cpu = 0, src = 'kb0', oppId = null, back, title }) {
  const def = fighterDef || app.fighters.find((f) => f.id === fighterId) || app.fighters[0];
  const opp = (oppId && app.fighters.find((f) => f.id === oppId)) || def;
  const stageDef = app.stages.find((s) => s.id === stageId) || app.stages[0];
  go('game', {
    training: true, title,
    cfg: {
      stageDef, debug: false, rules: { mode: 'stock', stocks: 99 },
      players: [
        { def, type: 'human', source: srcObj(src), port: 0, costume: 0 },
        { def: opp, type: cpu > 0 ? 'cpu' : 'human', dummy: cpu === 0, source: { type: 'kb', slot: 9 }, level: cpu || 1, port: 1, costume: opp === def ? 1 : 0 },
      ],
    },
    back,
  });
}
