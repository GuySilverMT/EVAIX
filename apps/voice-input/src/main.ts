import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as robot from 'robotjs';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isListening = false;

// Configuration
const ACTIVATION_SHORTCUT = 'CommandOrControl+Shift+Space'; // Customizable hotkey

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false, // Start hidden
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, '../renderer/preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Hide window when it loses focus
  mainWindow.on('blur', () => {
    if (mainWindow && !isListening) {
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create a simple icon for the tray (you can replace with a proper icon file)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFJSURBVDiNpdM9S8NAGMDx/5Nc0kKhUBwEwUVwcRMEJ8HBQXDxA/gFHPwEfoGCk4uDm4uDi4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4PDw/wFmxHBvYVl0ZQAAAABJRU5ErkJggg=='
  );
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Voice Input',
      type: 'normal',
      enabled: false
    },
    { type: 'separator' },
    {
      label: `Hotkey: ${ACTIVATION_SHORTCUT}`,
      type: 'normal',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          showWindowAtCursor();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Voice Input - Press ' + ACTIVATION_SHORTCUT);
  tray.setContextMenu(contextMenu);
}

function showWindowAtCursor() {
  if (!mainWindow) return;

  // Get current mouse position
  const mousePos = robot.getMousePos();
  
  // Position window near cursor
  const windowWidth = 400;
  const windowHeight = 300;
  mainWindow.setPosition(
    Math.floor(mousePos.x - windowWidth / 2),
    Math.floor(mousePos.y - windowHeight / 2)
  );
  
  mainWindow.show();
  mainWindow.focus();
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register global shortcut
  const registered = globalShortcut.register(ACTIVATION_SHORTCUT, () => {
    console.log('Hotkey pressed!');
    showWindowAtCursor();
  });

  if (!registered) {
    console.error('Failed to register global shortcut');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', (e: Event) => {
  // Prevent app from quitting when all windows are closed
  e.preventDefault();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.on('start-listening', () => {
  isListening = true;
  console.log('Started listening...');
});

ipcMain.on('stop-listening', () => {
  isListening = false;
  console.log('Stopped listening...');
});

ipcMain.on('insert-text', (_event, text: string) => {
  console.log('Inserting text:', text);
  
  if (!mainWindow) return;
  
  // Hide the window first
  mainWindow.hide();
  isListening = false;
  
  // Wait a bit for the window to hide and focus to return to previous app
  setTimeout(() => {
    try {
      // Type the text at the current cursor position
      robot.typeString(text);
    } catch (error) {
      console.error('Error typing text:', error);
    }
  }, 100);
});

ipcMain.on('cancel', () => {
  isListening = false;
  if (mainWindow) {
    mainWindow.hide();
  }
});
