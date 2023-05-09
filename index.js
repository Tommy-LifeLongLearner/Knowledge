const { app, BrowserWindow } = require('electron');
const gotTheLock = app.requestSingleInstanceLock();
// hot reload while developing the app
const electronReload = require('electron-reload');
electronReload(__dirname);

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
  // hides the menu
  // win.setMenu(null);
  win.webContents.toggleDevTools();
}

app.on('window-all-closed', () => {
  if(process.platform !== 'darwin') {
    app.quit();
  }
})

if(!gotTheLock) {
  app.quit();
}else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if(win) {
      if(win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  })
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
})