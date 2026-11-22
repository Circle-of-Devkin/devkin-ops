import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import storageService from './services/storageService';
import gitService from './services/gitService';
import githubService from './services/githubService';

// Disable artificial floaty smooth scrolling for crisp, instant, native-feeling scroll across all OS
app.commandLine.appendSwitch('disable-smooth-scrolling');

type Account = Record<string, unknown>;

let mainWindow: BrowserWindow | null = null;

function getAppIconPath(): string | undefined {
  const candidates = [
    path.join(app.getAppPath(), 'public/icon.png'),
    path.join(app.getAppPath(), 'dist/icon.png'),
    path.join(app.getAppPath(), 'build-resources/icon.png'),
    path.join(app.getAppPath(), 'electron/public/icon.png'),
    path.join(__dirname, '../../public/icon.png'),
    path.join(__dirname, '../../electron/public/icon.png'),
    path.join(__dirname, '../../build-resources/icon.png')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

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
    icon: getAppIconPath()
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

// Quick Action Launchers
ipcMain.handle('open-in-folder', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  if (!folderPath) return { success: false, error: 'No folder path specified' };
  try {
    const errorMsg = await shell.openPath(folderPath);
    if (errorMsg) {
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to open folder';
    return { success: false, error: msg };
  }
});

ipcMain.handle('open-in-vscode', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  if (!folderPath) return { success: false, error: 'No folder path specified' };
  return new Promise((resolve) => {
    const command = process.platform === 'win32'
      ? `code "${folderPath}"`
      : `code "${folderPath.replace(/"/g, '\\"')}"`;

    exec(command, { env: process.env }, (err) => {
      if (err) {
        console.warn('open-in-vscode error:', err);
        resolve({
          success: false,
          error: 'VS Code command line ("code") not found in system PATH. Please ensure the "code" command is installed.'
        });
      } else {
        resolve({ success: true });
      }
    });
  });
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

// Recent Projects Handlers
ipcMain.handle('get-recent-projects', async () => {
  return storageService.getRecentProjects();
});

ipcMain.handle('add-recent-project', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return storageService.addRecentProject(folderPath);
});

ipcMain.handle('remove-recent-project', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return storageService.removeRecentProject(folderPath);
});

ipcMain.handle('clear-recent-projects', async () => {
  return storageService.clearRecentProjects();
});

// GitHub API Handlers
function resolveAccountToken(payload?: { token?: string; accountId?: string }): string {
  if (payload?.token) return payload.token.trim();
  const accounts = storageService.getAccounts() as Array<{ id: string; patToken?: string }>;
  if (payload?.accountId) {
    const acc = accounts.find((a) => a.id === payload.accountId);
    if (acc?.patToken) return acc.patToken.trim();
  }
  const activeId = storageService.getActiveAccountId();
  const activeAcc = accounts.find((a) => a.id === activeId) || accounts[0];
  return activeAcc?.patToken ? activeAcc.patToken.trim() : '';
}

ipcMain.handle('validate-pat-token', async (_event: IpcMainInvokeEvent, token: string) => {
  return await githubService.validateToken(token);
});

ipcMain.handle('start-device-flow', async () => {
  return await githubService.startDeviceFlow();
});

ipcMain.handle('poll-device-token', async (_event: IpcMainInvokeEvent, deviceCode: string) => {
  return await githubService.pollDeviceToken(deviceCode);
});

ipcMain.handle('list-repositories', async (_event: IpcMainInvokeEvent, payload: { token?: string; accountId?: string; perPage?: number; page?: number }) => {
  const token = resolveAccountToken(payload);
  return await githubService.listRepositories(token, payload?.perPage, payload?.page);
});

ipcMain.handle('delete-repository', async (_event: IpcMainInvokeEvent, payload: { token?: string; accountId?: string; owner: string; repo: string }) => {
  const token = resolveAccountToken(payload);
  return await githubService.deleteRepository(token, payload?.owner, payload?.repo);
});

ipcMain.handle('check-repo-exists', async (_event: IpcMainInvokeEvent, payload: { token?: string; accountId?: string; owner: string; repo: string }) => {
  const token = resolveAccountToken(payload);
  return await githubService.checkRepoExists(token, payload?.owner, payload?.repo);
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

ipcMain.handle('unlink-remote', async (_event: IpcMainInvokeEvent, payload: { folderPath: string; remoteName?: string } | string) => {
  const folderPath = typeof payload === 'string' ? payload : payload?.folderPath;
  const remoteName = typeof payload === 'object' ? payload?.remoteName || 'origin' : 'origin';
  return await gitService.unlinkRemote(folderPath, remoteName);
});

// Secret Shield: Add files to .gitignore and untrack
ipcMain.handle('add-to-gitignore', async (_event: IpcMainInvokeEvent, { folderPath, patterns }: { folderPath: string; patterns: string[] }) => {
  return await gitService.addToGitignore(folderPath, patterns);
});

// Pro Mode: Safe Remote Sync (Fetch) & 1-Click Pull
ipcMain.handle('sync-remote', async (_event: IpcMainInvokeEvent, { folderPath, account }: { folderPath: string; account?: Account }) => {
  return await gitService.syncRemote(folderPath, account as any);
});

ipcMain.handle('pull-repo', async (_event: IpcMainInvokeEvent, options: { folderPath: string; account?: Account; branchName?: string }) => {
  return await gitService.pullRepo(options as any);
});

// Pro Mode: Branch Management
ipcMain.handle('get-branches', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return await gitService.getBranches(folderPath);
});

ipcMain.handle('checkout-branch', async (_event: IpcMainInvokeEvent, { folderPath, branchName }: { folderPath: string; branchName: string }) => {
  return await gitService.checkoutBranch(folderPath, branchName);
});

ipcMain.handle('create-branch', async (_event: IpcMainInvokeEvent, { folderPath, branchName, checkout }: { folderPath: string; branchName: string; checkout?: boolean }) => {
  return await gitService.createBranch(folderPath, branchName, checkout);
});

// Pro Mode: Visual Line Diff Viewer
ipcMain.handle('get-file-diff', async (_event: IpcMainInvokeEvent, { folderPath, filePath, staged }: { folderPath: string; filePath: string; staged?: boolean }) => {
  return await gitService.getFileDiff(folderPath, filePath, staged);
});

// Pro Mode: Selective Staging & Safe Discard
ipcMain.handle('stage-file', async (_event: IpcMainInvokeEvent, { folderPath, filePath }: { folderPath: string; filePath: string }) => {
  return await gitService.stageFile(folderPath, filePath);
});

ipcMain.handle('unstage-file', async (_event: IpcMainInvokeEvent, { folderPath, filePath }: { folderPath: string; filePath: string }) => {
  return await gitService.unstageFile(folderPath, filePath);
});

ipcMain.handle('stage-all', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return await gitService.stageAll(folderPath);
});

ipcMain.handle('unstage-all', async (_event: IpcMainInvokeEvent, folderPath: string) => {
  return await gitService.unstageAll(folderPath);
});

ipcMain.handle('discard-file-changes', async (_event: IpcMainInvokeEvent, { folderPath, filePath, isUntracked }: { folderPath: string; filePath: string; isUntracked?: boolean }) => {
  return await gitService.discardFileChanges(folderPath, filePath, isUntracked);
});
