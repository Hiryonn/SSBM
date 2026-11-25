// Point d'entrée de PlatFight Studio.
import { app, loadLibrary, go } from './app.js';
import './ui/menus.js';
import './ui/game.js';
import './ui/library.js';
import './ui/importer.js';
import './ui/charEditor.js';
import './ui/stageEditor.js';
import { listenKeyboard } from './engine/input.js';
import { startPadNav } from './ui/padnav.js';

async function boot() {
  app.root = document.getElementById('app');
  listenKeyboard();
  try {
    await loadLibrary();
  } catch (e) {
    console.error(e);
    app.root.textContent = 'Erreur au démarrage : ' + e.message;
    return;
  }
  go('title');
  startPadNav();
}
window.PlatFight = app;
boot();
