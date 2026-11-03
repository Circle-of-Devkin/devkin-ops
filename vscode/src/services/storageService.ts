import fs from 'fs';
import path from 'path';
import os from 'os';

export interface GitAccount {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  authType?: string;
  patToken?: string;
  sshKeyPath?: string;
  avatarUrl?: string;
  [key: string]: unknown;
}

export interface StorageData {
  accounts: GitAccount[];
  activeAccountId: string | null;
}

class StorageService {
  filePath: string;
  legacyFilePath: string;

  constructor(customStorageDir?: string) {
    const userDataPath = customStorageDir || this.resolveDefaultStorageDir();
    if (!fs.existsSync(userDataPath)) {
      try {
        fs.mkdirSync(userDataPath, { recursive: true });
      } catch (e) {
        console.error('Failed to create storage directory:', e);
      }
    }
    this.filePath = path.join(userDataPath, 'gitman_accounts.json');
    this.legacyFilePath = path.join(userDataPath, 'gitmulti_accounts.json');
    this.ensureFileExists();
  }

  private resolveDefaultStorageDir(): string {
    const home = os.homedir();
    const platform = process.platform;

    if (platform === 'win32') {
      const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      return path.join(appData, 'devkin-ops');
    } else if (platform === 'darwin') {
      return path.join(home, 'Library', 'Application Support', 'devkin-ops');
    } else {
      // Linux / Unix
      const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
      return path.join(configHome, 'devkin-ops');
    }
  }

  ensureFileExists() {
    try {
      if (!fs.existsSync(this.filePath)) {
        if (fs.existsSync(this.legacyFilePath)) {
          try {
            fs.copyFileSync(this.legacyFilePath, this.filePath);
          } catch (e) {
            console.error('Failed to copy legacy storage file:', e);
          }
        }
        if (!fs.existsSync(this.filePath)) {
          const initialData: StorageData = { accounts: [], activeAccountId: null };
          fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      console.error('Storage ensureFileExists error:', err);
    }
  }

  getData(): StorageData {
    try {
      this.ensureFileExists();
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to read storage data:', error);
    }
    return { accounts: [], activeAccountId: null };
  }

  saveData(data: StorageData): boolean {
    try {
      this.ensureFileExists();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save storage data:', error);
      return false;
    }
  }

  getAccounts(): GitAccount[] {
    const data = this.getData();
    return data.accounts || [];
  }

  getActiveAccountId(): string | null {
    const data = this.getData();
    return data.activeAccountId || null;
  }

  getActiveAccount(): GitAccount | null {
    const data = this.getData();
    if (!data.activeAccountId) return data.accounts[0] || null;
    return data.accounts.find((a) => a.id === data.activeAccountId) || data.accounts[0] || null;
  }

  saveAccount(account: GitAccount): StorageData {
    const data = this.getData();
    const existingIndex = data.accounts.findIndex((acc) => acc.id === account.id);

    if (existingIndex >= 0) {
      data.accounts[existingIndex] = { ...data.accounts[existingIndex], ...account };
    } else {
      data.accounts.push(account);
    }

    if (!data.activeAccountId || data.accounts.length === 1) {
      data.activeAccountId = account.id;
    }

    this.saveData(data);
    return data;
  }

  deleteAccount(accountId: string): StorageData {
    const data = this.getData();
    data.accounts = data.accounts.filter((acc) => acc.id !== accountId);

    if (data.activeAccountId === accountId) {
      data.activeAccountId = data.accounts.length > 0 ? data.accounts[0].id : null;
    }

    this.saveData(data);
    return data;
  }

  setActiveAccount(accountId: string): StorageData {
    const data = this.getData();
    data.activeAccountId = accountId;
    this.saveData(data);
    return data;
  }
}

export default new StorageService();

