/**
 * Universal API Bridge
 * Automatically uses Electron IPC if inside Electron App,
 * or Native Browser APIs if running in standard Web Browser.
 */

export const apiBridge = {
  openExternalUrl: async (url) => {
    try {
      if (window.electronAPI?.openExternalUrl) {
        return await window.electronAPI.openExternalUrl(url);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('openExternalUrl error:', e);
    }
  },

  selectFolder: async () => {
    // 1. Electron Desktop Native OS File Manager
    if (window.electronAPI?.selectFolder) {
      return await window.electronAPI.selectFolder();
    }

    // 2. Modern Web Browser Native Directory Picker (showDirectoryPicker)
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        return dirHandle.name;
      } catch (err) {
        if (err.name === 'AbortError') {
          return null; // User closed File Manager
        }
        console.warn('showDirectoryPicker fallback error:', err);
      }
    }

    // 3. Fallback for older browsers
    return prompt('Enter local project folder path:', '') || null;
  },

  selectSshFile: async () => {
    if (window.electronAPI?.selectSshFile) {
      return await window.electronAPI.selectSshFile();
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e) => {
        const files = (e.currentTarget as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          document.body.removeChild(input);
          resolve(file.name);
        } else {
          document.body.removeChild(input);
          resolve(null);
        }
      };

      input.click();
    });
  },

  getAccounts: async () => {
    if (window.electronAPI?.getAccounts) {
      return await window.electronAPI.getAccounts();
    }
    try {
      const stored = localStorage.getItem('gitman_accounts') || localStorage.getItem('gitmulti_accounts');
      const activeId = localStorage.getItem('gitman_active_account') || localStorage.getItem('gitmulti_active_account');
      return {
        accounts: stored ? JSON.parse(stored) : [],
        activeAccountId: activeId || null
      };
    } catch (e) {
      return { accounts: [], activeAccountId: null };
    }
  },

  saveAccount: async (account) => {
    if (window.electronAPI?.saveAccount) {
      return await window.electronAPI.saveAccount(account);
    }
    const stored = localStorage.getItem('gitman_accounts') || localStorage.getItem('gitmulti_accounts');
    let accounts = stored ? JSON.parse(stored) : [];
    const index = accounts.findIndex((a) => a.id === account.id);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem('gitman_accounts', JSON.stringify(accounts));
    localStorage.setItem('gitman_active_account', account.id);
    return { accounts, activeAccountId: account.id };
  },

  deleteAccount: async (accountId) => {
    if (window.electronAPI?.deleteAccount) {
      return await window.electronAPI.deleteAccount(accountId);
    }
    const stored = localStorage.getItem('gitman_accounts') || localStorage.getItem('gitmulti_accounts');
    let accounts = stored ? JSON.parse(stored) : [];
    accounts = accounts.filter((a) => a.id !== accountId);
    localStorage.setItem('gitman_accounts', JSON.stringify(accounts));
    return { accounts };
  },

  setActiveAccount: async (accountId) => {
    if (window.electronAPI?.setActiveAccount) {
      return await window.electronAPI.setActiveAccount(accountId);
    }
    localStorage.setItem('gitman_active_account', accountId);
  },

  validatePatToken: async (token) => {
    if (window.electronAPI?.validatePatToken) {
      return await window.electronAPI.validatePatToken(token);
    }
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (res.status === 401) {
        return { success: false, error: 'Invalid GitHub Token (Bad credentials).' };
      }

      if (!res.ok) {
        return { success: false, error: `GitHub API status ${res.status}` };
      }

      const user = await res.json();
      return {
        success: true,
        user: {
          username: user.login,
          name: user.name || user.login,
          email: user.email || `${user.login}@users.noreply.github.com`,
          avatarUrl: user.avatar_url,
          htmlUrl: user.html_url
        }
      };
    } catch (err) {
      return { success: false, error: err.message || 'Network error' };
    }
  },

  startDeviceFlow: async () => {
    if (window.electronAPI?.startDeviceFlow) {
      return await window.electronAPI.startDeviceFlow();
    }
    try {
      const res = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: '178c6fc778ccc68e1d6a',
          scope: 'repo user'
        })
      });
      const data = await res.json();
      if (data.device_code) {
        return {
          success: true,
          deviceCode: data.device_code,
          userCode: data.user_code,
          verificationUri: data.verification_uri || 'https://github.com/login/device',
          expiresIn: data.expires_in,
          interval: data.interval || 5
        };
      }
      return { success: false, error: data.error_description || 'Failed to start device auth' };
    } catch (err) {
      console.error('startDeviceFlow fallback error:', err);
      return {
        success: false,
        error: err.message === 'Failed to fetch'
          ? 'App restart required to activate Direct Login IPC. Please close and re-open DevKin Ops Desktop App.'
          : (err.message || 'Network error')
      };
    }
  },

  pollDeviceToken: async (deviceCode) => {
    if (window.electronAPI?.pollDeviceToken) {
      return await window.electronAPI.pollDeviceToken(deviceCode);
    }
    try {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: '178c6fc778ccc68e1d6a',
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });
      const data = await res.json();
      if (data.access_token) {
        return { success: true, accessToken: data.access_token };
      }
      if (data.error === 'authorization_pending') {
        return { success: false, pending: true };
      }
      return { success: false, error: data.error_description || data.error };
    } catch (err) {
      return { success: false, error: err.message || 'Polling error' };
    }
  },

  getGitStatus: async (folderPath) => {
    if (window.electronAPI?.getGitStatus) {
      return await window.electronAPI.getGitStatus(folderPath);
    }
    return {
      success: true,
      isGitRepo: true,
      folderPath,
      folderName: folderPath.split('/').pop() || 'project',
      currentBranch: 'main',
      totalUncommitted: 0,
      userName: '',
      userEmail: '',
      remoteUrl: '',
      isClean: true
    };
  },

  initGitRepo: async (folderPath) => {
    if (window.electronAPI?.initGitRepo) {
      return await window.electronAPI.initGitRepo(folderPath);
    }
    return { success: true };
  },

  publishRepo: async (options) => {
    if (window.electronAPI?.publishRepo) {
      return await window.electronAPI.publishRepo(options);
    }
    return {
      success: true,
      message: `[Web Preview] Simulated publish to GitHub @${options.account?.username} for branch ${options.branchName}!`
    };
  }
};
