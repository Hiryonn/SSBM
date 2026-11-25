// Fenêtre de bureau de PlatFight Studio (Electron).
// Si un fichier jeu.html se trouve à côté du .exe, on lance ce jeu (mode joueur)
// au lieu du logiciel complet : c'est ce que produit « Créer mon jeu ».
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const exeDir = path.dirname(process.execPath);
const gameHtml = path.join(exeDir, 'jeu.html');
const gameMetaFile = path.join(exeDir, 'jeu.json');
let gameMeta = null;
if (app.isPackaged && fs.existsSync(gameHtml)) {
  try { gameMeta = JSON.parse(fs.readFileSync(gameMetaFile, 'utf8')); } catch (e) { gameMeta = { title: 'Jeu', id: 'jeu' }; }
  // Chaque jeu exporté garde ses réglages dans son propre dossier
  const safe = String(gameMeta.name || gameMeta.title || 'Jeu').replace(/[<>:"/\\|?*]+/g, '').trim() || 'Jeu';
  app.setName(safe);
  app.setPath('userData', path.join(app.getPath('appData'), safe));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 960, minHeight: 600,
    backgroundColor: '#0e1030',
    title: gameMeta ? gameMeta.title : 'PlatFight Studio',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(gameMeta ? gameHtml : path.join(__dirname, 'index.html'));
  // Les liens externes s'ouvrent dans le navigateur
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // F11 : plein écran, F12 : outils de développement
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
}

// ------------------------------------------------------------------ export d'un jeu
ipcMain.handle('pf:export-game', async (event, { name, title, id, html }) => {
  if (!app.isPackaged) return { error: 'L\'export de .exe ne marche que depuis la version compilée (PlatFight Studio.exe).' };
  const win = BrowserWindow.fromWebContents(event.sender);
  // PF_EXPORT_DIR : dossier imposé (tests automatiques), sinon on demande à l'utilisateur
  const pick = process.env.PF_EXPORT_DIR ? { canceled: false, filePaths: [process.env.PF_EXPORT_DIR] } : await dialog.showOpenDialog(win, {
    title: 'Où créer le dossier du jeu ?',
    buttonLabel: 'Créer le jeu ici',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (pick.canceled || !pick.filePaths[0]) return { cancelled: true };
  const safe = String(name).replace(/[<>:"/\\|?*]+/g, '').trim() || 'Mon jeu';
  const target = path.join(pick.filePaths[0], safe);
  if (path.resolve(target).toLowerCase().startsWith(path.resolve(exeDir).toLowerCase())) {
    return { error: 'Choisis un dossier en dehors de celui de PlatFight Studio.' };
  }
  if (fs.existsSync(target)) {
    const r = await dialog.showMessageBox(win, {
      type: 'question', buttons: ['Remplacer', 'Annuler'], defaultId: 0, cancelId: 1,
      message: 'Le dossier « ' + safe + ' » existe déjà.', detail: 'Le remplacer par la nouvelle version du jeu ?',
    });
    if (r.response !== 0) return { cancelled: true };
    process.noAsar = true;
    try { fs.rmSync(target, { recursive: true, force: true }); } finally { process.noAsar = false; }
  }
  // Copie de l'application (sans traiter app.asar comme un dossier)
  process.noAsar = true;
  try {
    fs.cpSync(exeDir, target, {
      recursive: true,
      filter: (src) => !['jeu.html', 'jeu.json'].includes(path.basename(src)) || path.dirname(src) !== exeDir,
    });
  } finally { process.noAsar = false; }
  const studioExe = path.join(target, path.basename(process.execPath));
  const gameExe = path.join(target, safe + '.exe');
  if (studioExe !== gameExe) fs.renameSync(studioExe, gameExe);
  fs.writeFileSync(path.join(target, 'jeu.html'), html, 'utf8');
  fs.writeFileSync(path.join(target, 'jeu.json'), JSON.stringify({ name: safe, title, id }, null, 2), 'utf8');
  return { ok: true, path: target, exe: safe + '.exe' };
});

ipcMain.handle('pf:open-folder', (e, p) => shell.openPath(p));
// Quitter : ferme la fenêtre qui le demande (la fenêtre de test se ferme sans fermer l'éditeur)
ipcMain.handle('pf:quit', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.close(); else app.quit(); });

// ------------------------------------------------------------------ projets (un dossier par jeu)
// Un chemin relatif à l'intérieur du projet, sans possibilité d'en sortir
function inside(dir, rel) {
  const full = path.resolve(dir, rel);
  if (!full.startsWith(path.resolve(dir) + path.sep)) throw new Error('Chemin interdit : ' + rel);
  return full;
}
const isProject = (dir) => fs.existsSync(path.join(dir, 'projet.json'));

ipcMain.handle('pf:project-new', async (event, name) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const pick = process.env.PF_PROJECT_DIR ? { canceled: false, filePaths: [process.env.PF_PROJECT_DIR] } : await dialog.showOpenDialog(win, {
    title: 'Où créer le dossier du projet ?', buttonLabel: 'Créer le projet ici', properties: ['openDirectory', 'createDirectory'],
  });
  if (pick.canceled || !pick.filePaths[0]) return { cancelled: true };
  const safe = String(name).replace(/[<>:"/\\|?*]+/g, '').trim() || 'Mon jeu';
  const dir = path.join(pick.filePaths[0], safe);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) return { error: 'Le dossier « ' + safe + ' » existe déjà et n\'est pas vide.' };
  fs.mkdirSync(path.join(dir, 'persos'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'stages'), { recursive: true });
  return { ok: true, dir };
});

ipcMain.handle('pf:project-open', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const pick = await dialog.showOpenDialog(win, {
    title: 'Ouvrir un projet PlatFight (dossier contenant projet.json)', buttonLabel: 'Ouvrir le projet', properties: ['openDirectory'],
  });
  if (pick.canceled || !pick.filePaths[0]) return { cancelled: true };
  let dir = pick.filePaths[0];
  if (!isProject(dir)) return { error: 'Ce dossier ne contient pas de fichier projet.json.' };
  return { ok: true, dir };
});

ipcMain.handle('pf:project-load', (e, dir) => {
  try {
    if (!isProject(dir)) return { error: 'Projet introuvable : ' + dir };
    const read = (sub, ext) => {
      const d = path.join(dir, sub);
      if (!fs.existsSync(d)) return [];
      return fs.readdirSync(d).filter((f) => f.toLowerCase().endsWith(ext)).map((f) => ({ name: f, text: fs.readFileSync(path.join(d, f), 'utf8') }));
    };
    return {
      meta: fs.readFileSync(path.join(dir, 'projet.json'), 'utf8'),
      fighters: read('persos', '.pfchar.json'),
      stages: read('stages', '.pfstage.json'),
    };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('pf:project-write', (e, dir, rel, text) => {
  try {
    const full = inside(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    // Écriture sûre : fichier temporaire puis renommage
    fs.writeFileSync(full + '.tmp', text, 'utf8');
    fs.renameSync(full + '.tmp', full);
    return { ok: true };
  } catch (err) { return { error: err.message }; }
});

ipcMain.handle('pf:project-delete', (e, dir, rel) => {
  try { const full = inside(dir, rel); if (fs.existsSync(full)) fs.unlinkSync(full); return { ok: true }; } catch (err) { return { error: err.message }; }
});

ipcMain.handle('pf:project-exists', (e, dir) => isProject(dir));

// ------------------------------------------------------------------ lanceur de test
let testWin = null;
ipcMain.handle('pf:test-game', async (event, { html, title }) => {
  const dir = path.join(app.getPath('temp'), 'platfight-test');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'jeu.html');
  fs.writeFileSync(file, html, 'utf8');
  if (testWin && !testWin.isDestroyed()) {
    testWin.setTitle(title + ' (test)');
    await testWin.loadFile(file);
    testWin.show(); testWin.focus();
    return { ok: true, reused: true };
  }
  testWin = new BrowserWindow({
    width: 1280, height: 760, minWidth: 800, minHeight: 500, backgroundColor: '#000000',
    title: title + ' (test)', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  testWin.on('page-title-updated', (ev) => ev.preventDefault());
  testWin.webContents.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { testWin.setFullScreen(!testWin.isFullScreen()); ev.preventDefault(); }
    if (input.key === 'F12') { testWin.webContents.toggleDevTools(); ev.preventDefault(); }
  });
  testWin.on('closed', () => { testWin = null; });
  await testWin.loadFile(file);
  return { ok: true };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
