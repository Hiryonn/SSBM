// Listes de persos / stages (point d'entrée des éditeurs), options, import/export.
import { h, clear, toast, confirmBox, download, pickFiles, slider, check, select, modal } from './dom.js';
import { app, go, screens, drawFighterThumb, drawStageThumb, saveFighter, saveStage, deleteFighter, deleteStage, saveSettings, applySettings } from '../app.js';
import { DEFAULT_KEYS, DEFAULT_PAD, keyLabel, getPads, BUTTONS, padButtonName } from '../engine/input.js';
import { capturePadButton } from './padnav.js';
import { K } from '../engine/constants.js';
import { buildTrainingStage } from '../data/builtin.js';

const slug = (s) => (s || 'export').normalize('NFD').replace(/[^\w-]+/g, '_').slice(0, 40);
const clone = (o) => JSON.parse(JSON.stringify(o));

function listScreen(kind) {
  const isF = kind === 'fighters';
  const list = h('div', { class: 'lib-grid' });
  const render = () => {
    clear(list);
    const items = isF ? app.fighters : app.stages;
    if (!isF) list.append(h('button', { class: 'lib-card new', onclick: () => newStage() }, h('span', { class: 'plus' }, '+'), h('b', null, 'Nouveau stage vide')));
    else list.append(h('button', { class: 'lib-card new', onclick: () => go('importer') }, h('span', { class: 'plus' }, '+'), h('b', null, 'Importer un perso Mugen')));
    for (const d of items) {
      const cv = h('canvas', isF ? { width: 120, height: 120 } : { width: 240, height: 135 });
      const card = h('div', { class: 'lib-card' + (isF ? '' : ' wide') },
        cv,
        h('b', null, d.name),
        h('small', null, (d.builtin ? 'Intégré' : (d.source || '')) + (d.author ? ' · ' + d.author : '')),
        h('div', { class: 'lib-actions' },
          h('button', { class: 'btn primary', onclick: () => go(isF ? 'chareditor' : 'stageeditor', d.id) }, d.builtin ? 'Ouvrir (copie)' : 'Éditer'),
          h('button', { class: 'btn', onclick: async () => { const c = clone(d); c.id = (isF ? 'f' : 's') + Date.now().toString(36); c.builtin = false; c.name = d.name + ' (copie)'; await (isF ? saveFighter(c) : saveStage(c)); toast('Copie créée'); render(); } }, 'Dupliquer'),
          h('button', { class: 'btn', onclick: () => download(slug(d.name) + (isF ? '.pfchar.json' : '.pfstage.json'), JSON.stringify(d)) }, 'Exporter'),
          d.builtin ? null : h('button', { class: 'btn danger', onclick: async () => { if (await confirmBox('Supprimer « ' + d.name + ' » ?', 'Cette action est définitive (exporte-le d\'abord si tu veux le garder).', 'Supprimer')) { await (isF ? deleteFighter(d.id) : deleteStage(d.id)); render(); } } }, 'Supprimer')));
      list.append(card);
      (isF ? drawFighterThumb(d, cv) : drawStageThumb(d, cv)).catch(() => {});
    }
  };
  const newStage = async () => {
    const s = buildTrainingStage();
    s.id = 's' + Date.now().toString(36); s.builtin = false; s.name = 'Nouveau stage'; s.source = 'Créé dans l\'éditeur';
    s.platforms = [];
    await saveStage(s);
    go('stageeditor', s.id);
  };
  const el = h('div', { class: 'screen panel-screen' },
    h('header', { class: 'bar' }, h('button', { class: 'btn ghost', onclick: () => go('title') }, '← Menu'), h('h1', null, isF ? 'Éditeur de persos' : 'Éditeur de stages'),
      h('button', { class: 'btn', onclick: () => importFiles(render) }, 'Ouvrir un fichier PlatFight…')),
    h('p', { class: 'muted pad' }, isF ? 'Choisis un perso à modifier. Les persos intégrés s\'ouvrent en copie.' : 'Choisis un stage à modifier, ou crée-en un vide.'),
    list);
  return { el, enter: render };
}
screens.charlist = () => listScreen('fighters');
screens.stagelist = () => listScreen('stages');

export async function importFiles(after) {
  const files = await pickFiles({ multiple: true, accept: '.json' });
  let n = 0;
  for (const f of files) {
    try {
      const d = JSON.parse(await f.text());
      const arr = Array.isArray(d) ? d : d.format === 'platfight-library' ? [...(d.fighters || []), ...(d.stages || [])] : [d];
      for (const x of arr) {
        if (x.format === 'platfight-fighter') { x.builtin = false; await saveFighter(x); n++; }
        else if (x.format === 'platfight-stage') { x.builtin = false; await saveStage(x); n++; }
      }
    } catch (e) { toast('Fichier illisible : ' + f.name, 'bad'); }
  }
  if (n) toast(n + ' élément(s) ajouté(s) à la bibliothèque');
  after && after();
}

// ------------------------------------------------------------------ Options
screens.options = () => {
  const S = app.settings;
  const body = h('div', { class: 'opt-body' });
  let waiting = null, waitingPad = null;
  // Affiche en direct les boutons enfoncés (utile pour les manettes non standard)
  const padLive = h('p', { class: 'pad-live' });
  let liveRaf = 0;
  const live = () => {
    liveRaf = requestAnimationFrame(live);
    const parts = [];
    for (const p of getPads()) {
      const b = p.buttons.map((x, k) => (x.pressed ? padButtonName(k) : null)).filter(Boolean);
      const ax = p.axes.map((v, k) => (Math.abs(v) > 0.5 ? 'axe ' + k + (v > 0 ? '+' : '−') : null)).filter(Boolean);
      if (b.length || ax.length) parts.push('Manette ' + (p.index + 1) + ' : ' + [...b, ...ax].join(', '));
    }
    const t = parts.length ? parts.join(' · ') : 'Appuie sur des boutons pour les voir ici.';
    if (padLive.textContent !== t) padLive.textContent = t;
  };
  const actions = [['left', 'Gauche'], ['right', 'Droite'], ['up', 'Haut / saut'], ['down', 'Bas'], ['attack', 'Attaque'], ['special', 'Spécial'], ['jump', 'Saut'], ['shield', 'Bouclier / esquive'], ['smash', 'Attaque smash'], ['start', 'Pause']];
  const onKey = (e) => {
    if (!waiting) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code !== 'Escape') {
      const [slot, act] = waiting;
      S.keymaps[slot][act] = [e.code];
    }
    waiting = null;
    saveSettings();
    render();
  };
  const render = () => {
    clear(body);
    const keyTable = (slot) => h('div', { class: 'card' },
      h('h2', null, 'Clavier ' + (slot + 1)),
      h('table', { class: 'keys' }, h('tbody', null, actions.map(([a, label]) => h('tr', null,
        h('td', null, label),
        h('td', null, h('button', { class: 'keycap' + (waiting && waiting[0] === slot && waiting[1] === a ? ' wait' : ''), onclick: () => { waiting = [slot, a]; render(); } },
          waiting && waiting[0] === slot && waiting[1] === a ? 'Appuie sur une touche…' : (S.keymaps[slot][a] || []).map(keyLabel).join(' / ') || '—')))))),
      h('button', { class: 'btn ghost', onclick: () => { S.keymaps[slot] = JSON.parse(JSON.stringify(DEFAULT_KEYS[slot])); saveSettings(); render(); } }, 'Touches par défaut'));
    const pads = getPads();
    if (!S.padMap) S.padMap = JSON.parse(JSON.stringify(DEFAULT_PAD));
    const padActions = [['attack', 'Attaque'], ['special', 'Spécial'], ['jump', 'Saut'], ['shield', 'Bouclier / esquive'], ['smash', 'Attaque smash (en plus du stick droit)'], ['start', 'Pause']];
    const padTable = h('div', { class: 'card' }, h('h2', null, 'Manettes'),
      h('p', null, pads.length ? pads.map((p) => 'Manette ' + (p.index + 1) + ' : ' + p.id.slice(0, 48)).join(' · ') : 'Aucune manette détectée. Branche-la et appuie sur un bouton.'),
      padLive,
      h('table', { class: 'keys' }, h('tbody', null, padActions.map(([a, label]) => h('tr', null,
        h('td', null, label),
        h('td', null, h('button', { class: 'keycap' + (waitingPad === a ? ' wait' : ''), onclick: () => {
          waitingPad = a; render();
          capturePadButton((i, n) => { S.padMap[a] = [n]; waitingPad = null; saveSettings(); render(); });
        } }, waitingPad === a ? 'Appuie sur un bouton…' : (S.padMap[a] || []).map(padButtonName).join(' / ') || '—')))))),
      h('p', { class: 'muted small' }, 'Noms des boutons : Xbox · Switch · PlayStation. Déplacement : stick gauche ou croix. Stick droit : attaques smash. Dans les menus : bouton bas pour valider, bouton droit pour revenir, Start pour lancer le combat.'),
      h('button', { class: 'btn ghost', onclick: () => { S.padMap = JSON.parse(JSON.stringify(DEFAULT_PAD)); saveSettings(); render(); } }, 'Boutons par défaut'));
    body.append(
      h('div', { class: 'opt-cols' }, keyTable(0), keyTable(1), padTable),
      h('div', { class: 'opt-cols' },
        h('div', { class: 'card' }, h('h2', null, 'Son'),
          slider('Effets', S.volume.sfx, (v) => { S.volume.sfx = v; applySettings(); saveSettings(); }, { fmt: (v) => Math.round(v * 100) + ' %' }),
          slider('Musique', S.volume.music, (v) => { S.volume.music = v; applySettings(); saveSettings(); }, { fmt: (v) => Math.round(v * 100) + ' %' })),
        app.player ? null : h('div', { class: 'card' }, h('h2', null, 'Physique du jeu'),
          slider('Puissance d\'éjection', S.constants.launch, (v) => { S.constants.launch = v; applySettings(); saveSettings(); }, { min: 0.02, max: 0.08, step: 0.001, fmt: (v) => v.toFixed(3) }),
          slider('Freinage de l\'éjection', S.constants.decay, (v) => { S.constants.decay = v; applySettings(); saveSettings(); }, { min: 0.02, max: 0.15, step: 0.005, fmt: (v) => v.toFixed(3) }),
          slider('Étourdissement', S.constants.hitstun, (v) => { S.constants.hitstun = v; applySettings(); saveSettings(); }, { min: 0.2, max: 0.6, step: 0.01, fmt: (v) => v.toFixed(2) }),
          slider('Vitesse du jeu', S.constants.gameSpeed, (v) => { S.constants.gameSpeed = v; applySettings(); saveSettings(); }, { min: 0.5, max: 1.5, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' }),
          check('Sauter avec la direction haut', S.constants.tapJump, (v) => { S.constants.tapJump = v; applySettings(); saveSettings(); }),
          h('button', { class: 'btn ghost', onclick: () => { S.constants = { launch: 0.042, decay: 0.06, hitstun: 0.4, tumbleKB: 80, shieldMax: 50, ledgeTime: 300, respawnInvuln: 120, tapJump: true, di: 15, gameSpeed: 1 }; applySettings(); saveSettings(); render(); } }, 'Valeurs par défaut')),
        app.player ? null : h('div', { class: 'card' }, h('h2', null, 'Sauvegardes'),
          h('p', { class: 'muted' }, 'Tes persos et stages sont gardés dans ce navigateur / ce logiciel. Exporte-les pour les partager ou les sauvegarder.'),
          h('button', { class: 'btn', onclick: () => download('platfight-bibliotheque.json', JSON.stringify({ format: 'platfight-library', fighters: app.fighters.filter((f) => !f.builtin), stages: app.stages.filter((s) => !s.builtin) })) }, 'Exporter toute la bibliothèque'),
          h('button', { class: 'btn', onclick: () => importFiles(render) }, 'Importer des fichiers PlatFight (.json)'))));
  };
  const el = h('div', { class: 'screen panel-screen' },
    h('header', { class: 'bar' }, h('button', { class: 'btn ghost', onclick: () => go('title') }, '← Menu'), h('h1', null, 'Options')),
    body);
  return {
    el,
    enter() { render(); window.addEventListener('keydown', onKey, true); live(); },
    leave() { window.removeEventListener('keydown', onKey, true); cancelAnimationFrame(liveRaf); capturePadButton(null); },
  };
};
