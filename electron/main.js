const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let tray;
let isQuitting = false;

// Auto-launch on startup
const appFolder = path.dirname(process.execPath);
const updateExe = path.resolve(appFolder, '..', 'Update.exe');
const exeName = path.basename(process.execPath);

app.setLoginItemSettings({
  openAtLogin: true,
  path: updateExe,
  args: [
    '--processStart', `"${exeName}"`,
    '--process-start-args', `"--hidden"`
  ]
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Start hidden
    icon: path.join(__dirname, '../public/logo192.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple local wrapper interactions
      webSecurity: false // Allow local file access for gallery
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Handle external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/logo192.png'); // Ensure you have an icon here
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16 });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Gemini Smart Photo Sync');

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Dashboard', 
      click: () => mainWindow.show() 
    },
    { 
      label: 'Sync Now', 
      click: () => {
        // Send event to React App via IPC
        mainWindow.webContents.send('trigger-sync');
      } 
    },
    { type: 'separator' },
    { 
      label: 'Start on Login', 
      type: 'checkbox', 
      checked: app.getLoginItemSettings().openAtLogin,
      click: () => {
        const settings = app.getLoginItemSettings();
        app.setLoginItemSettings({ openAtLogin: !settings.openAtLogin });
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  // If started normally (not auto-start), show window
  if (!process.argv.includes('--hidden')) {
    mainWindow.show();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Do nothing, keep running in tray
  }
});
