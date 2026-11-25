// Fenêtre de bureau de PlatFight Studio (Electron).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 960, minHeight: 600,
    backgroundColor: '#0e1030',
    title: 'PlatFight Studio',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'));
  // Les liens externes s'ouvrent dans le navigateur
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // F11 : plein écran, F12 : outils de développement
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
