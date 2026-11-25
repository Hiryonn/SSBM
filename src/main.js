// Point d'entrée de PlatFight Studio.
import { app, loadLibrary, go, enterPlayer, loadPlayerSettings } from './app.js';
import { captureSource, embeddedGame } from './data/game.js';
import './ui/menus.js';
import './ui/game.js';
import './ui/library.js';
import './ui/importer.js';
import './ui/charEditor.js';
import './ui/stageEditor.js';
import './ui/exporter.js';
import { listenKeyboard } from './engine/input.js';
import { startPadNav } from './ui/padnav.js';

async function boot() {
  app.root = document.getElementById('app');
  listenKeyboard();
  try {
    const game = embeddedGame();
    if (game) { enterPlayer(game); await loadPlayerSettings(); }
    else await loadLibrary();
  } catch (e) {
    console.error(e);
    app.root.textContent = 'Erreur au démarrage : ' + e.message;
    return;
  }
  go('title');
  startPadNav();
}
// Copie de la page d'origine, pour pouvoir exporter des jeux
captureSource();
window.PlatFight = app;
boot();
