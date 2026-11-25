// Pont entre la page du jeu et la version bureau (export de jeux, quitter).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('platfight', {
  isDesktop: true,
  exportGame: (opts) => ipcRenderer.invoke('pf:export-game', opts),
  openFolder: (p) => ipcRenderer.invoke('pf:open-folder', p),
  quit: () => ipcRenderer.invoke('pf:quit'),
  // Projets
  projectNew: (name) => ipcRenderer.invoke('pf:project-new', name),
  projectOpen: () => ipcRenderer.invoke('pf:project-open'),
  projectLoad: (dir) => ipcRenderer.invoke('pf:project-load', dir),
  projectWrite: (dir, rel, text) => ipcRenderer.invoke('pf:project-write', dir, rel, text),
  projectDelete: (dir, rel) => ipcRenderer.invoke('pf:project-delete', dir, rel),
  projectExists: (dir) => ipcRenderer.invoke('pf:project-exists', dir),
  // Lanceur de test
  testGame: (html, title) => ipcRenderer.invoke('pf:test-game', { html, title }),
});
