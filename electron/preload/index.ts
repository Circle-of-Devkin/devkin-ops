const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs & Links
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectSshFile: () => ipcRenderer.invoke('select-ssh-file'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  openInFolder: (folderPath) => ipcRenderer.invoke('open-in-folder', folderPath),
  openInVSCode: (folderPath) => ipcRenderer.invoke('open-in-vscode', folderPath),

  // Storage / Accounts
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  saveAccount: (account) => ipcRenderer.invoke('save-account', account),
  deleteAccount: (accountId) => ipcRenderer.invoke('delete-account', accountId),
  setActiveAccount: (accountId) => ipcRenderer.invoke('set-active-account', accountId),

  // Recent Projects
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  addRecentProject: (folderPath) => ipcRenderer.invoke('add-recent-project', folderPath),
  removeRecentProject: (folderPath) => ipcRenderer.invoke('remove-recent-project', folderPath),
  clearRecentProjects: () => ipcRenderer.invoke('clear-recent-projects'),

  // GitHub Service
  validatePatToken: (token) => ipcRenderer.invoke('validate-pat-token', token),
  startDeviceFlow: () => ipcRenderer.invoke('start-device-flow'),
  pollDeviceToken: (deviceCode) => ipcRenderer.invoke('poll-device-token', deviceCode),

  // Git Operations
  getGitStatus: (folderPath) => ipcRenderer.invoke('get-git-status', folderPath),
  initGitRepo: (folderPath) => ipcRenderer.invoke('init-git-repo', folderPath),
  applyAccountToRepo: (folderPath, account) => ipcRenderer.invoke('apply-account-to-repo', { folderPath, account }),
  publishRepo: (options) => ipcRenderer.invoke('publish-repo', options)
});
