// Page « Jeu » du projet : nom, logo, écran titre, règles, physique, puis export du jeu
// (.exe avec la version Windows, page .html dans le navigateur). Tout est rangé dans projet.json.
import { h, clear, toast, pickFiles, text, select, num, check, slider, download } from './dom.js';
import { app, go, screens, saveProjectMeta, startPreview, applySettings } from '../app.js';
import { buildGame, standaloneHTML, slugName, desktop } from '../data/game.js';
import { K } from '../engine/constants.js';
import { testProject } from './shell.js';

// Réduit une image trop grande et la renvoie en data URL.
async function imageToDataURL(file, maxW, maxH) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const sc = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = sc < 1;
    cx.drawImage(img, 0, 0, c.width, c.height);
    return maxW > 1000 && /jpe?g/i.test(file.type) ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

const PHYS_DEFAULT = { launch: 0.048, decay: 0.08, hitstun: 0.4, tumbleKB: 80, shieldMax: 50, ledgeTime: 300, respawnInvuln: 120, tapJump: true, di: 15, gameSpeed: 1, ssfAirdodge: true, physVer: 2 };

screens.exporter = () => {
  const P = app.project.meta;
  P.rules = P.rules || { mode: 'stock', stocks: 3, time: 3, teams: false };
  P.constants = { ...K, ...(P.constants || {}) };
  let saveT = 0;
  // Enregistrement automatique dans projet.json (regroupé)
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => saveProjectMeta().catch((e) => toast('Enregistrement impossible : ' + e.message, 'bad')), 400); };
  const body = h('div', { class: 'exp-body' });

  const render = () => {
    clear(body);
    const logoPrev = P.logo ? h('img', { class: 'exp-logo', src: P.logo, alt: 'Logo' }) : h('div', { class: 'exp-logo empty' }, 'Pas de logo : le nom du jeu sera écrit en grand');
    const ident = h('section', { class: 'card' }, h('h2', null, 'Le jeu'),
      text('Nom du jeu', P.name, (v) => { P.name = v; persist(); }),
      text('Sous-titre (sous le logo)', P.subtitle, (v) => { P.subtitle = v; persist(); }),
      h('div', { class: 'grid2' },
        text('Auteur', P.author, (v) => { P.author = v; persist(); }),
        text('Version', P.version, (v) => { P.version = v; persist(); })),
      h('label', { class: 'field' }, h('span', null, 'Couleur principale (boutons, bandeaux)'),
        (() => { const i = h('input', { type: 'color', value: P.color || '#ff3d48' }); i.addEventListener('input', () => { P.color = i.value; persist(); }); return i; })()),
      h('h3', null, 'Logo'),
      logoPrev,
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: async () => { const [f] = await pickFiles({ multiple: false, accept: 'image/*' }); if (!f) return; P.logo = await imageToDataURL(f, 900, 400); persist(); render(); } }, P.logo ? 'Changer le logo…' : 'Choisir un logo (PNG transparent conseillé)…'),
        P.logo ? h('button', { class: 'btn small danger', onclick: () => { P.logo = null; persist(); render(); } }, 'Retirer') : null));

    const title = h('section', { class: 'card' }, h('h2', null, 'Écran titre et règles'),
      select('Fond de l\'écran titre', P.titleMode || 'demo', [['demo', 'Combat de démonstration entre CPU'], ['image', 'Une image']], (v) => { P.titleMode = v; persist(); render(); }),
      (P.titleMode || 'demo') === 'demo'
        ? select('Stage de la démonstration', P.titleStage || '', [['', 'Au hasard parmi les stages du jeu'], ...app.stages.map((s) => [s.id, s.name])], (v) => { P.titleStage = v || null; persist(); })
        : h('div', null,
          P.titleImage ? h('img', { class: 'exp-title-img', src: P.titleImage, alt: 'Image de fond' }) : h('p', { class: 'muted' }, 'Aucune image choisie.'),
          h('button', { class: 'btn small', onclick: async () => { const [f] = await pickFiles({ multiple: false, accept: 'image/*' }); if (!f) return; P.titleImage = await imageToDataURL(f, 1920, 1080); persist(); render(); } }, P.titleImage ? 'Changer l\'image…' : 'Choisir une image…')),
      check('Mode entraînement accessible aux joueurs', P.training !== false, (v) => { P.training = v; persist(); }),
      h('h3', null, 'Règles par défaut'),
      h('div', { class: 'grid2' },
        select('Mode', P.rules.mode, [['stock', 'Vies'], ['time', 'Temps']], (v) => { P.rules.mode = v; persist(); render(); }),
        P.rules.mode === 'stock'
          ? num('Vies', P.rules.stocks, (v) => { P.rules.stocks = Math.max(1, Math.min(99, v | 0)); persist(); }, { min: 1, max: 99 })
          : num('Minutes', P.rules.time, (v) => { P.rules.time = Math.max(1, Math.min(99, v)); persist(); }, { min: 1, max: 99 })));

    const C = P.constants;
    const phys = (label, key, o) => slider(label, C[key], (v) => { C[key] = v; applySettings(); persist(); }, o);
    const physics = h('section', { class: 'card' }, h('h2', null, 'Physique du jeu'),
      h('p', { class: 'muted small' }, 'Ces réglages s\'appliquent à tout le jeu (tests et jeu exporté). Les joueurs ne peuvent pas les changer.'),
      phys('Puissance d\'éjection', 'launch', { min: 0.02, max: 0.08, step: 0.001, fmt: (v) => v.toFixed(3) }),
      phys('Freinage de l\'éjection', 'decay', { min: 0.02, max: 0.15, step: 0.005, fmt: (v) => v.toFixed(3) }),
      phys('Étourdissement', 'hitstun', { min: 0.2, max: 0.6, step: 0.01, fmt: (v) => v.toFixed(2) }),
      phys('Vitesse du jeu', 'gameSpeed', { min: 0.5, max: 1.5, step: 0.05, fmt: (v) => Math.round(v * 100) + ' %' }),
      check('Sauter avec la direction haut', C.tapJump, (v) => { C.tapJump = v; applySettings(); persist(); }),
      check('Esquive aérienne façon Melee (wavedash)', !C.ssfAirdodge, (v) => { C.ssfAirdodge = !v; applySettings(); persist(); }),
      h('button', { class: 'btn ghost', onclick: () => { P.constants = { ...PHYS_DEFAULT }; applySettings(); persist(); render(); } }, 'Valeurs par défaut'));

    const content = h('section', { class: 'card' }, h('h2', null, 'Contenu du jeu'),
      h('p', null, app.fighters.length + ' perso(s) et ' + app.stages.length + ' stage(s) : tout le contenu du projet est dans le jeu. Pour en retirer, supprime-les du projet (pages Persos et Stages).'),
      h('div', { class: 'row gap' }, h('button', { class: 'btn small', onclick: () => go('charlist') }, 'Persos'), h('button', { class: 'btn small', onclick: () => go('stagelist') }, 'Stages')));

    body.append(h('div', { class: 'exp-cols' }, ident, title), h('div', { class: 'exp-cols' }, physics, content));
  };

  const makeGame = () => {
    if (!P.name || !P.name.trim()) { toast('Donne un nom à ton jeu.', 'bad'); return null; }
    if (!app.fighters.length) { toast('Ajoute au moins un perso au projet.', 'bad'); return null; }
    if (!app.stages.length) { toast('Ajoute au moins un stage au projet.', 'bad'); return null; }
    const g = buildGame({ ...P, fighters: app.fighters.map((f) => f.id), stages: app.stages.map((s) => s.id) }, app.fighters, app.stages, P.constants);
    g.id = P.id;
    return g;
  };

  const preview = () => { const g = makeGame(); if (!g) return; startPreview(g); go('title'); };

  const exportGame = async () => {
    const g = makeGame();
    if (!g) return;
    await saveProjectMeta();
    const html = standaloneHTML(g);
    const dk = desktop();
    if (dk) {
      exportBtn.disabled = true; exportBtn.textContent = 'Export en cours…';
      try {
        const res = await dk.exportGame({ name: slugName(g.name), title: g.name, id: g.id, html });
        if (res && res.ok) {
          toast('Jeu exporté dans ' + res.path);
          status.replaceChildren(h('b', null, 'Jeu créé !'), ' Dossier : ' + res.path + ' — lance « ' + res.exe + ' ». Pour le partager, envoie tout le dossier (en .zip).',
            h('button', { class: 'btn small', onclick: () => dk.openFolder(res.path) }, 'Ouvrir le dossier'));
        } else if (res && res.error) toast(res.error, 'bad');
      } catch (e) { toast('Export impossible : ' + e.message, 'bad'); }
      exportBtn.disabled = false; exportBtn.textContent = 'Exporter le jeu';
    } else {
      download(slugName(g.name) + '.html', html, 'text/html');
      status.replaceChildren(h('b', null, 'Page du jeu téléchargée.'), ' Elle s\'ouvre dans Chrome ou Edge. Pour obtenir un .exe, exporte depuis la version Windows de PlatFight Studio.');
    }
  };

  const exportBtn = h('button', { class: 'btn primary big', onclick: exportGame }, 'Exporter le jeu');
  const status = h('p', { class: 'exp-status' }, desktop()
    ? 'Exporter crée un dossier au nom du jeu avec son propre .exe, sans les éditeurs, prêt à partager.'
    : 'Dans le navigateur, le jeu est exporté en une page .html autonome. La version Windows crée un .exe.');

  const el = h('div', { class: 'screen panel-screen' },
    h('header', { class: 'bar' },
      h('h1', null, 'Jeu'),
      h('div', { class: 'bar-tools' },
        h('button', { class: 'btn', onclick: testProject }, '▶ Tester (F5)'),
        h('button', { class: 'btn', onclick: preview }, 'Aperçu de l\'écran titre'),
        exportBtn)),
    status, body);
  return { el, enter: render, leave() { clearTimeout(saveT); saveProjectMeta().catch(() => {}); } };
};
