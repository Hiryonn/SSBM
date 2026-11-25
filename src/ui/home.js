// Accueil du logiciel (liste des projets) et tableau de bord d'un projet.
import { h, clear, toast, promptBox, confirmBox } from './dom.js';
import { app, go, screens, openProject, createProject, loadLegacy, saveSettings, drawFighterThumb, drawStageThumb } from '../app.js';
import { DiskProject, LocalProject, backendFromRecent, uid } from '../data/project.js';
import { desktop } from '../data/game.js';
import { MOVE_SLOTS } from '../data/defs.js';
import { testProject } from './shell.js';

const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

async function tryOpen(backend) {
  try {
    await openProject(backend);
    go('dashboard');
  } catch (e) {
    console.error(e);
    toast('Impossible d\'ouvrir le projet : ' + e.message, 'bad');
  }
}

// Crée un projet (dossier sur le disque dans la version Windows, sinon dans le navigateur)
async function newProject(content = {}) {
  const name = await promptBox('Nouveau projet', 'Nom du jeu', content.name || 'Mon jeu de combat');
  if (!name || !name.trim()) return;
  const dk = desktop();
  let backend;
  if (dk && dk.projectNew) {
    const r = await dk.projectNew(name.trim());
    if (!r || r.cancelled) return;
    if (r.error) { toast(r.error, 'bad'); return; }
    backend = new DiskProject(r.dir);
  } else backend = new LocalProject(uid('p'));
  try {
    await createProject(backend, name.trim(), content);
    await tryOpen(backend);
  } catch (e) { console.error(e); toast('Création impossible : ' + e.message, 'bad'); }
}

// ------------------------------------------------------------------ Accueil des projets
screens.home = () => {
  const recentBox = h('div', { class: 'home-recent' });
  const legacyBox = h('div');
  const dk = desktop();

  const renderRecent = async () => {
    clear(recentBox);
    let list = app.settings.recent || [];
    // Dans le navigateur, on montre aussi les projets enregistrés qui ne sont pas dans les récents
    if (!dk) {
      const local = await LocalProject.list();
      for (const m of local) if (!list.some((r) => r.kind === 'local' && r.id === m.id)) list = [...list, { kind: 'local', id: m.id, name: m.name, where: 'Dans ce navigateur', t: m.updated || m.created || 0 }];
    }
    if (!list.length) {
      recentBox.append(h('p', { class: 'muted' }, 'Aucun projet pour l\'instant. Crée ton premier jeu !'));
      return;
    }
    for (const r of list) {
      recentBox.append(h('div', { class: 'recent-row' },
        h('button', { class: 'recent-open', onclick: () => tryOpen(backendFromRecent(r)) },
          h('b', null, r.name || 'Projet'), h('small', null, r.where || r.dir || ''), h('small', null, r.t ? ago(r.t) : '')),
        h('button', { class: 'mini', title: 'Retirer de la liste' + (r.kind === 'local' ? ' et supprimer du navigateur' : ' (le dossier n\'est pas supprimé)'), onclick: async () => {
          if (r.kind === 'local') {
            if (!(await confirmBox('Supprimer « ' + r.name + ' » ?', 'Ce projet est rangé dans le navigateur : il sera effacé définitivement.', 'Supprimer'))) return;
            await LocalProject.remove(r.id);
          }
          app.settings.recent = (app.settings.recent || []).filter((x) => x !== r);
          await saveSettings(); renderRecent();
        } }, '✕')));
    }
  };

  const renderLegacy = async () => {
    clear(legacyBox);
    const lib = await loadLegacy();
    if (!lib.fighters.length && !lib.stages.length) return;
    legacyBox.append(h('div', { class: 'home-legacy' },
      h('b', null, 'Ta bibliothèque de l\'ancienne version'),
      h('p', null, lib.fighters.length + ' perso(s) et ' + lib.stages.length + ' stage(s) sont rangés dans le logiciel. Mets-les dans un projet pour continuer à les éditer.'),
      h('button', { class: 'btn', onclick: () => {
        const gp = app.settings.gameProject || {};
        newProject({ name: gp.name || 'Mon jeu de combat', fighters: lib.fighters, stages: lib.stages,
          extra: { subtitle: gp.subtitle || '', author: gp.author || '', color: gp.color || '#ff3d48', logo: gp.logo || null, titleMode: gp.titleMode || 'demo', titleImage: gp.titleImage || null, training: gp.training !== false, rules: gp.rules || undefined } });
      } }, 'Créer un projet avec ces éléments')));
  };

  const el = h('div', { class: 'screen home' },
    h('div', { class: 'home-brand' },
      h('div', { class: 'logo' }, h('span', { class: 'l1' }, 'PLATFIGHT'), h('span', { class: 'l2' }, 'STUDIO')),
      h('p', { class: 'tagline' }, 'Crée ton jeu de combat façon Smash : importe tes persos Mugen et JUS, règle leurs coups, dessine tes stages, puis teste et exporte ton jeu.'),
      h('div', { class: 'home-actions' },
        h('button', { class: 'btn primary big', onclick: () => newProject() }, '+ Nouveau projet'),
        dk ? h('button', { class: 'btn big', onclick: async () => {
          const r = await dk.projectOpen();
          if (!r || r.cancelled) return;
          if (r.error) { toast(r.error, 'bad'); return; }
          tryOpen(new DiskProject(r.dir));
        } }, 'Ouvrir un projet…') : null),
      dk ? null : h('p', { class: 'muted small' }, 'Dans le navigateur, les projets sont rangés dans ce navigateur. Avec la version Windows, chaque projet est un dossier sur ton PC.'),
      h('button', { class: 'link', onclick: () => go('options') }, 'Options : touches, manettes, son')),
    h('section', { class: 'home-list' },
      h('h2', null, 'Projets récents'), recentBox, legacyBox));
  return { el, noShell: true, enter() { renderRecent(); renderLegacy(); } };
};

// ------------------------------------------------------------------ Tableau de bord du projet
screens.dashboard = () => {
  const P = app.project.meta;
  const emptyMoves = (f) => MOVE_SLOTS.filter(([id]) => !f.moves?.[id] || f.moves[id].anim == null).length;
  const sizeOf = () => {
    let n = 0;
    for (const f of app.fighters) n += f.pack?.blob?.length || 0;
    for (const s of app.stages) n += (s.pack?.blob?.length || 0) + (s.music?.length || 0);
    return n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.round(n / 1024) + ' Ko';
  };
  const roster = h('div', { class: 'dash-roster' });
  const stages = h('div', { class: 'dash-stages' });
  const todo = [];
  if (!app.fighters.length) todo.push(['Importe ou ajoute un premier perso', () => go('importer')]);
  for (const f of app.fighters) { const n = emptyMoves(f); if (n) todo.push([f.name + ' : ' + n + ' coup(s) sans animation', () => go('chareditor', f.id)]); }
  for (const s of app.stages) if (/^Mugen/.test(s.source || '') && !s.edited) todo.push([s.name + ' : vérifie le sol et les zones de KO (stage importé)', () => go('stageeditor', s.id)]);
  if (!P.logo) todo.push(['Ajoute un logo à ton jeu', () => go('exporter')]);

  const el = h('div', { class: 'screen panel-screen dash' },
    h('header', { class: 'dash-head', style: { '--pc': P.color } },
      P.logo ? h('img', { class: 'dash-logo', src: P.logo, alt: P.name }) : h('h1', { class: 'dash-title' }, P.name),
      h('div', { class: 'dash-meta' },
        P.logo ? h('b', null, P.name) : null,
        P.subtitle ? h('span', null, P.subtitle) : null,
        h('small', null, app.project.backend.where)),
      h('div', { class: 'dash-actions' },
        h('button', { class: 'btn primary big', onclick: testProject }, '▶ Tester le jeu'),
        h('button', { class: 'btn', onclick: () => go('exporter') }, 'Réglages et export'))),
    h('div', { class: 'dash-stats' },
      [[app.fighters.length, app.fighters.length > 1 ? 'persos' : 'perso', 'charlist'], [app.stages.length, app.stages.length > 1 ? 'stages' : 'stage', 'stagelist'], [sizeOf(), 'de données', null], ['v' + (P.version || '1.0'), 'version du jeu', 'exporter']]
        .map(([v, l, to]) => h(to ? 'button' : 'div', { class: 'stat-card', onclick: to ? () => go(to) : null }, h('b', null, v), h('span', null, l)))),
    h('div', { class: 'dash-cols' },
      h('section', { class: 'card' },
        h('h2', null, 'Persos'), roster,
        h('div', { class: 'row gap' }, h('button', { class: 'btn small', onclick: () => go('importer') }, '+ Importer un perso'), h('button', { class: 'btn small', onclick: () => go('charlist') }, 'Tous les persos'))),
      h('section', { class: 'card' },
        h('h2', null, 'À faire'),
        todo.length ? h('ul', { class: 'todo' }, todo.slice(0, 8).map(([t, fn]) => h('li', null, h('button', { class: 'link', onclick: fn }, t)))) : h('p', { class: 'muted' }, 'Rien à signaler : lance un test avec F5 !'),
        h('p', { class: 'muted small' }, 'Astuce : F5 lance le jeu dans une fenêtre de test depuis n\'importe quel écran. Relance-le après chaque modification.'))),
    h('section', { class: 'card dash-stage-card' }, h('h2', null, 'Stages'), stages,
      h('div', { class: 'row gap' }, h('button', { class: 'btn small', onclick: () => go('stagelist') }, 'Tous les stages'))));

  return {
    el,
    enter() {
      for (const f of app.fighters.slice(0, 24)) {
        const cv = h('canvas', { width: 80, height: 80 });
        roster.append(h('button', { class: 'dash-char', title: f.name, onclick: () => go('chareditor', f.id) }, cv, h('span', null, f.name)));
        drawFighterThumb(f, cv).catch(() => {});
      }
      if (!app.fighters.length) roster.append(h('p', { class: 'muted' }, 'Aucun perso dans ce projet.'));
      for (const s of app.stages) {
        const cv = h('canvas', { width: 192, height: 108 });
        stages.append(h('button', { class: 'dash-stage', onclick: () => go('stageeditor', s.id) }, cv, h('span', null, s.name)));
        drawStageThumb(s, cv).catch(() => {});
      }
    },
  };
};
