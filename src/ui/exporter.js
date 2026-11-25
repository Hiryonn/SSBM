// Écran « Créer mon jeu » : choisir le nom, le logo, l'écran titre, les persos et les stages,
// puis exporter un jeu autonome (.exe avec la version bureau, page .html dans le navigateur).
import { h, clear, toast, pickFiles, text, select, num, check, download } from './dom.js';
import { app, go, screens, saveSettings, drawFighterThumb, drawStageThumb, startPreview } from '../app.js';
import { buildGame, standaloneHTML, slugName, desktop } from '../data/game.js';

const uid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

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
    // PNG pour garder la transparence du logo ; JPEG pour les grandes images de fond
    return maxW > 1000 && /jpe?g/i.test(file.type) ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

function defaultProject() {
  return {
    id: uid(), name: 'Mon jeu de combat', subtitle: '', author: '', version: '1.0',
    color: '#ff3d48', logo: null, titleMode: 'demo', titleImage: null, titleStage: app.stages[0]?.id || null,
    training: true,
    fighters: app.fighters.map((f) => f.id),
    stages: app.stages.map((s) => s.id),
    rules: { mode: 'stock', stocks: 3, time: 3, teams: false },
  };
}

const kb = (n) => (n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko');

screens.exporter = () => {
  const S = app.settings;
  if (!S.gameProject) S.gameProject = defaultProject();
  const P = S.gameProject;
  // On retire les persos / stages supprimés depuis
  P.fighters = P.fighters.filter((id) => app.fighters.some((f) => f.id === id));
  P.stages = P.stages.filter((id) => app.stages.some((s) => s.id === id));
  const persist = () => saveSettings();

  const body = h('div', { class: 'exp-body' });
  const sizeEl = h('span', { class: 'exp-size' });
  const updateSize = () => {
    let n = 0;
    for (const f of app.fighters) if (P.fighters.includes(f.id)) n += (f.pack?.blob?.length || 0) + 60000;
    for (const s of app.stages) if (P.stages.includes(s.id)) n += (s.pack?.blob?.length || 0) + (s.music ? s.music.length : 0) + 10000;
    n += (P.logo?.length || 0) + (P.titleImage?.length || 0) + 310000;
    sizeEl.textContent = 'Taille des données du jeu : environ ' + kb(n);
  };

  const check2 = (label, on, onChange) => check(label, on, (v) => { onChange(v); persist(); updateSize(); });

  const render = () => {
    clear(body);
    // ---- Identité
    const logoPrev = P.logo ? h('img', { class: 'exp-logo', src: P.logo, alt: 'Logo' }) : h('div', { class: 'exp-logo empty' }, 'Pas de logo : le nom du jeu sera écrit en grand');
    const ident = h('section', { class: 'card' }, h('h2', null, 'Le jeu'),
      text('Nom du jeu', P.name, (v) => { P.name = v; persist(); }),
      text('Sous-titre (sous le logo)', P.subtitle, (v) => { P.subtitle = v; persist(); }),
      h('div', { class: 'grid2' },
        text('Auteur', P.author, (v) => { P.author = v; persist(); }),
        text('Version', P.version, (v) => { P.version = v; persist(); })),
      h('label', { class: 'field' }, h('span', null, 'Couleur principale (boutons, bandeaux)'),
        (() => { const i = h('input', { type: 'color', value: P.color }); i.addEventListener('input', () => { P.color = i.value; persist(); }); return i; })()),
      h('h3', null, 'Logo'),
      logoPrev,
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: async () => { const [f] = await pickFiles({ multiple: false, accept: 'image/*' }); if (!f) return; P.logo = await imageToDataURL(f, 900, 400); persist(); render(); } }, P.logo ? 'Changer le logo…' : 'Choisir un logo (PNG transparent conseillé)…'),
        P.logo ? h('button', { class: 'btn small danger', onclick: () => { P.logo = null; persist(); render(); } }, 'Retirer') : null));

    // ---- Écran titre
    const title = h('section', { class: 'card' }, h('h2', null, 'Écran titre'),
      select('Fond de l\'écran titre', P.titleMode, [['demo', 'Combat de démonstration entre CPU'], ['image', 'Une image']], (v) => { P.titleMode = v; persist(); render(); }),
      P.titleMode === 'demo'
        ? select('Stage de la démonstration', P.titleStage || '', [['', 'Au hasard parmi les stages du jeu'], ...app.stages.filter((s) => P.stages.includes(s.id)).map((s) => [s.id, s.name])], (v) => { P.titleStage = v || null; persist(); })
        : h('div', null,
          P.titleImage ? h('img', { class: 'exp-title-img', src: P.titleImage, alt: 'Image de fond' }) : h('p', { class: 'muted' }, 'Aucune image choisie.'),
          h('button', { class: 'btn small', onclick: async () => { const [f] = await pickFiles({ multiple: false, accept: 'image/*' }); if (!f) return; P.titleImage = await imageToDataURL(f, 1920, 1080); persist(); render(); updateSize(); } }, P.titleImage ? 'Changer l\'image…' : 'Choisir une image…')),
      check2('Mode entraînement accessible aux joueurs', P.training, (v) => { P.training = v; }),
      h('h3', null, 'Règles par défaut'),
      h('div', { class: 'grid2' },
        select('Mode', P.rules.mode, [['stock', 'Vies'], ['time', 'Temps']], (v) => { P.rules.mode = v; persist(); render(); }),
        P.rules.mode === 'stock'
          ? num('Vies', P.rules.stocks, (v) => { P.rules.stocks = Math.max(1, Math.min(99, v | 0)); persist(); }, { min: 1, max: 99 })
          : num('Minutes', P.rules.time, (v) => { P.rules.time = Math.max(1, Math.min(99, v)); persist(); }, { min: 1, max: 99 })),
      h('p', { class: 'muted small' }, 'La physique du jeu (éjection, vitesse…) est celle réglée en ce moment dans Options. Les joueurs ne pourront pas la changer.'));

    // ---- Persos
    const roster = h('div', { class: 'exp-grid' });
    for (const f of app.fighters) {
      const cv = h('canvas', { width: 72, height: 72 });
      const on = P.fighters.includes(f.id);
      roster.append(h('button', { class: 'exp-pick' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: () => {
        P.fighters = on ? P.fighters.filter((x) => x !== f.id) : [...P.fighters, f.id]; persist(); render(); updateSize();
      } }, cv, h('span', null, f.name)));
      drawFighterThumb(f, cv).catch(() => {});
    }
    const fighters = h('section', { class: 'card wide' }, h('h2', null, 'Persos du jeu (' + P.fighters.length + ')'),
      app.fighters.length ? roster : h('p', { class: 'muted' }, 'Ta bibliothèque n\'a aucun perso : importe-en d\'abord.'),
      h('div', { class: 'row gap' },
        h('button', { class: 'btn small', onclick: () => { P.fighters = app.fighters.map((f) => f.id); persist(); render(); updateSize(); } }, 'Tout cocher'),
        h('button', { class: 'btn small', onclick: () => { P.fighters = []; persist(); render(); updateSize(); } }, 'Tout décocher')));

    // ---- Stages
    const stg = h('div', { class: 'exp-grid stages' });
    for (const s of app.stages) {
      const cv = h('canvas', { width: 160, height: 90 });
      const on = P.stages.includes(s.id);
      stg.append(h('button', { class: 'exp-pick' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: () => {
        P.stages = on ? P.stages.filter((x) => x !== s.id) : [...P.stages, s.id]; persist(); render(); updateSize();
      } }, cv, h('span', null, s.name)));
      drawStageThumb(s, cv).catch(() => {});
    }
    const stages = h('section', { class: 'card wide' }, h('h2', null, 'Stages du jeu (' + P.stages.length + ')'), stg);

    body.append(h('div', { class: 'exp-cols' }, ident, title), fighters, stages);
    updateSize();
  };

  const makeGame = () => {
    if (!P.name.trim()) { toast('Donne un nom à ton jeu.', 'bad'); return null; }
    if (!P.fighters.length) { toast('Choisis au moins un perso.', 'bad'); return null; }
    if (!P.stages.length) { toast('Choisis au moins un stage.', 'bad'); return null; }
    return buildGame(P, app.fighters, app.stages, S.constants);
  };

  const preview = () => {
    const g = makeGame();
    if (!g) return;
    startPreview(g);
    go('title');
  };

  const exportGame = async () => {
    const g = makeGame();
    if (!g) return;
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
      status.replaceChildren(h('b', null, 'Page du jeu téléchargée.'), ' Elle s\'ouvre dans Chrome ou Edge. Pour obtenir un .exe, utilise « Créer mon jeu » depuis la version Windows de PlatFight Studio.');
    }
  };

  const exportBtn = h('button', { class: 'btn primary big', onclick: exportGame }, 'Exporter le jeu');
  const status = h('p', { class: 'exp-status' }, desktop()
    ? 'Le jeu sera créé dans un dossier de ton choix : un .exe à son nom, sans les éditeurs, prêt à partager.'
    : 'Dans le navigateur, le jeu est exporté en une page .html autonome. La version Windows crée un .exe.');

  const el = h('div', { class: 'screen panel-screen' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn ghost', onclick: () => go('title') }, '← Menu'),
      h('h1', null, 'Créer mon jeu'),
      h('div', { class: 'bar-tools' }, sizeEl,
        h('button', { class: 'btn', onclick: () => { S.gameProject = defaultProject(); persist(); go('exporter'); } }, 'Nouveau projet'),
        h('button', { class: 'btn', onclick: preview }, '▶ Essayer'),
        exportBtn)),
    status, body);
  return { el, enter: render };
};
