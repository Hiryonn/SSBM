// Coque de l'éditeur de projet (façon Pokémon Studio) : barre latérale + lanceur de test.
import { h, toast, confirmBox } from './dom.js';
import { app, go, hooks, closeProject, saveSettings } from '../app.js';
import { buildGame, standaloneHTML, desktop } from '../data/game.js';
import { startPreview } from '../app.js';

const NAV = [
  ['dashboard', 'Accueil', 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
  ['charlist', 'Persos', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0z'],
  ['stagelist', 'Stages', 'M2 18h20M5 18V9h4v9M15 18v-6h4v6M3 9l4-5 4 5'],
  ['exporter', 'Jeu', 'M6 7h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-3a4 4 0 0 1 4-4zm2 3v4m-2-2h4m6-1h.01m2 2h.01'],
  ['importer', 'Importer', 'M12 3v12m0 0l-5-5m5 5l5-5M4 19h16'],
  ['options', 'Options', 'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M16 4v4M10 10v4M18 16v4'],
];
// Écrans rattachés à une entrée de la barre
const OWNER = { chareditor: 'charlist', stageeditor: 'stagelist', training: 'charlist', versus: 'dashboard', results: 'dashboard' };

const icon = (d) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svg.append(p);
  return svg;
};

// Lance le projet dans une fenêtre de test séparée (ou un nouvel onglet / un aperçu dans le navigateur)
export async function testProject() {
  if (!app.project) return;
  const meta = app.project.meta;
  if (!app.fighters.length) { toast('Ajoute au moins un perso au projet pour tester le jeu.', 'bad'); return; }
  if (!app.stages.length) { toast('Ajoute au moins un stage au projet pour tester le jeu.', 'bad'); return; }
  const P = { ...meta, fighters: app.fighters.map((f) => f.id), stages: app.stages.map((x) => x.id) };
  const game = buildGame(P, app.fighters, app.stages, meta.constants);
  game.id = meta.id;
  const dk = desktop();
  if (dk && dk.testGame) {
    const r = await dk.testGame(standaloneHTML(game), meta.name);
    if (r && r.error) toast(r.error, 'bad');
    else toast(r && r.reused ? 'Jeu relancé dans la fenêtre de test' : 'Jeu lancé dans une fenêtre de test');
    return;
  }
  // Navigateur : nouvel onglet si possible, sinon aperçu dans la page
  try {
    const url = URL.createObjectURL(new Blob([standaloneHTML(game)], { type: 'text/html' }));
    const w = window.open(url, '_blank');
    if (w) { toast('Jeu lancé dans un nouvel onglet'); return; }
  } catch (e) { /* fenêtre bloquée */ }
  startPreview(game);
  go('title');
}

hooks.wrap = (content, current) => {
  const active = OWNER[current] || current;
  const meta = app.project.meta;
  const nav = h('nav', { class: 'side-nav', 'aria-label': 'Projet' },
    NAV.map(([id, label, d]) => h('button', { class: 'side-item' + (active === id ? ' on' : ''), 'aria-current': active === id ? 'page' : null, onclick: () => go(id) },
      icon(d), h('span', null, label))));
  const side = h('aside', { class: 'side' },
    h('button', { class: 'side-project', title: 'Tableau de bord', onclick: () => go('dashboard') },
      meta.logo ? h('img', { src: meta.logo, alt: '' }) : h('span', { class: 'side-initial', style: { background: meta.color } }, (meta.name || '?').slice(0, 1).toUpperCase()),
      h('span', { class: 'side-name' }, meta.name)),
    nav,
    h('div', { class: 'side-bottom' },
      h('button', { class: 'side-test', title: 'Lancer le jeu dans une fenêtre de test (F5)', onclick: testProject }, icon('M7 4l13 8-13 8z'), h('span', null, 'Tester'), h('kbd', null, 'F5')),
      h('button', { class: 'side-item small', onclick: async () => {
        const s = app.screen;
        if (s && s.dirty && s.dirty() && !(await confirmBox('Fermer le projet ?', 'Des modifications ne sont pas enregistrées dans l\'éditeur ouvert.', 'Fermer quand même'))) return;
        closeProject(); await saveSettings(); go('home');
      } }, icon('M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10'), h('span', null, 'Fermer le projet'))));
  return h('div', { class: 'shell' }, side, h('main', { class: 'shell-main' }, content));
};

// F5 : tester le jeu, depuis n'importe quel écran du projet
window.addEventListener('keydown', (e) => {
  if (e.key === 'F5' && app.project && !app.player && !app.screen?.ingame) { e.preventDefault(); testProject(); }
});
