import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import path from 'path';
import storageService from './services/storageService';
import gitService from './services/gitService';
import githubService from './services/githubService';

type Account = Record<string, unknown>;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#8e8e93',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(app.getAppPath(), 'public/icon.png')
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  // Prevent internal navigation to external sites
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (isAllowedExternalUrl(url)) {
      openUrlInDefaultBrowser(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedExternalUrl(url)) event.preventDefault();
  });
}

function openUrlInDefaultBrowser(url: string) {
  if (!isAllowedExternalUrl(url)) return;

  try {
    void shell.openExternal(url.trim());
  } catch (err) {
    console.error('shell.openExternal failed:', err);
  }
}

function isAllowedExternalUrl(url: string) {
  try {
    return new URL(url).protocol === 'https:';
  } catch (error) {
    return false;
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

// --- IPC HANDLERS ---

// Open External URL in default system browser
ipcMain.handle('open-external-url', async (_event: IpcMainInvokeEvent, url: string) => {
  openUrlInDefaultBrowser(url);
  return { success: true };
});

// Select Folder Dialog
ipcMain.handle('select-folder', async () => {
  const dialogOptions: OpenDialogOptions = { properties: ['openDirectory'] };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Select SSH Key Private File Dialog
ipcMain.handle('select-ssh-file', async () => {
  const dialogOptions: OpenDialogOptions = {
    properties: ['openFile'],
    title: 'Select Private SSH Key File',
    buttonLabel: 'Select Key'
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Storage / Accounts Handlers
ipcMain.handle('get-accounts', async () => {
  const accounts = storageService.getAccounts();
  const activeAccountId = storageService.getActiveAccountId();
  return { accounts, activeAccountId };
});

ipcMain.handle('save-account', async (_event: IpcMainInvokeEvent, account: Account) => {
  return storageService.saveAccount(account);
});

ipcMain.handle('delete-account', async (_event: IpcMainInvokeEvent, accountId: string) => {
  return storageService.deleteAccount(accountId);
});

ipcMain.handle('set-active-account', async (_event: IpcMainInvokeEvent, accountId: string) => {
  return storageService.setActiveAccount(accountId);
});

// GitHub API Handlers
ipcMain.handle('validate-pat-token', async (_event: IpcMainInvokeEvent, token: string) => {
  return await githubService.validateToken(token);
});

ipcMain.handle('start-device-flow', async () => {
  return await githubService.startDeviceFlow();
});

ipcMain.handle('poll-device-token', async (_event: IpcMainInvokeEvent, deviceCode: string) => {
  return await githubService.pollDeviceToken(deviceCode);
});

// Git Handlers
ipcMain.handle('get-git-status', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return await gitService.getFolderGitStatus(folderPath);
});

ipcMain.handle('init-git-repo', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return await gitService.initRepo(folderPath);
});

ipcMain.handle('apply-account-to-repo', async (_event: IpcMainInvokeEvent, { folderPath, account }: { folderPath: string; account: Account }) => {
  return await gitService.applyAccountToRepo(folderPath, account);
});

ipcMain.handle('publish-repo', async (_event: IpcMainInvokeEvent, options: Parameters<typeof gitService.publishRepo>[0]) => {
  return await gitService.publishRepo(options);
});
