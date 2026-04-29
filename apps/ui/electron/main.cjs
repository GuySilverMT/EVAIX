const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Disable GPU/Vulkan to prevent driver warnings on systems without proper GPU access
// app.commandLine.appendSwitch('disable-gpu');
// app.commandLine.appendSwitch('disable-gpu-compositing');
// app.commandLine.appendSwitch('disable-software-rasterizer');
// app.disableHardwareAcceleration();

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  // Force native dark mode rendering for web contents
  mainWindow.webContents.forceDark = true;

  const isDev = !app.isPackaged;
  // In dev, wait for Vite to serve. In prod, load the local index.html
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Debugging: Log navigation events
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });


  if (isDev) {
    console.log('Running in dev mode, opening DevTools');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Running in prod mode');
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
