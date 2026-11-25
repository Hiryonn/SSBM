// Pont entre la page du jeu et la version bureau (export de jeux, quitter).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('platfight', {
  isDesktop: true,
  exportGame: (opts) => ipcRenderer.invoke('pf:export-game', opts),
  openFolder: (p) => ipcRenderer.invoke('pf:open-folder', p),
  quit: () => ipcRenderer.invoke('pf:quit'),
});
