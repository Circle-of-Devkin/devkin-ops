const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs & Links
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectSshFile: () => ipcRenderer.invoke('select-ssh-file'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),

  // Storage / Accounts
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  saveAccount: (account) => ipcRenderer.invoke('save-account', account),
  deleteAccount: (accountId) => ipcRenderer.invoke('delete-account', accountId),
  setActiveAccount: (accountId) => ipcRenderer.invoke('set-active-account', accountId),

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
