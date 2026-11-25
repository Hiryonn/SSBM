// Jeux exportés : un jeu = la page du logiciel + un bloc de données (persos, stages, réglages)
// intégré dans la page. Au démarrage, si ce bloc existe, le logiciel passe en « mode joueur ».

// Copie de la page d'origine du logiciel, prise au démarrage (avant toute modification du DOM).
let SOURCE = null;
export function captureSource() {
  if (SOURCE) return;
  SOURCE = document.documentElement.cloneNode(true);
  SOURCE.querySelector('#pf-game')?.remove();
  const root = SOURCE.querySelector('#app');
  if (root) root.textContent = '';
}

// Lit le jeu intégré à la page, s'il y en a un.
export function embeddedGame() {
  const el = document.getElementById('pf-game');
  if (!el) return null;
  try { return JSON.parse(el.textContent); } catch (e) { console.error('Données du jeu illisibles', e); return null; }
}

export const slugName = (s) => (s || 'Mon jeu').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, ' ').slice(0, 60) || 'Mon jeu';

// Construit l'objet « jeu » à partir du projet et de la bibliothèque.
export function buildGame(project, fighters, stages, constants) {
  const pickF = fighters.filter((f) => project.fighters.includes(f.id));
  const pickS = stages.filter((s) => project.stages.includes(s.id));
  return {
    format: 'platfight-game', version: 1,
    id: project.id, name: project.name, subtitle: project.subtitle || '', author: project.author || '', gameVersion: project.version || '1.0',
    color: project.color || '#ff3d48',
    logo: project.logo || null,
    titleImage: project.titleMode === 'image' ? project.titleImage || null : null,
    titleStage: project.titleMode === 'demo' ? (project.titleStage || null) : null,
    training: project.training !== false,
    rules: { ...project.rules },
    constants: { ...constants },
    fighters: pickF,
    stages: pickS,
  };
}

// Produit la page autonome du jeu (même moteur, données intégrées).
export function standaloneHTML(game) {
  if (!SOURCE) throw new Error('Source du logiciel indisponible');
  const doc = SOURCE.cloneNode(true);
  const title = doc.querySelector('title');
  if (title) title.textContent = game.name;
  const block = document.createElement('script');
  block.type = 'application/json';
  block.id = 'pf-game';
  // Le JSON ne doit jamais contenir "</script" ni "<!--" : on échappe tous les "<".
  block.textContent = JSON.stringify(game).replace(/</g, '\\u003c');
  const root = doc.querySelector('#app');
  if (!root) throw new Error('Page du logiciel inattendue');
  root.after(block);
  return '<!DOCTYPE html>\n' + doc.outerHTML;
}

// Pont vers la version bureau (Electron), absent dans le navigateur.
export const desktop = () => (typeof window !== 'undefined' && window.platfight && window.platfight.isDesktop ? window.platfight : null);
