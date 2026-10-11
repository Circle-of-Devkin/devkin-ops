import fs from 'fs';
import path from 'path';
import { app } from 'electron';

class StorageService {
  filePath: string;
  legacyFilePath: string;

  constructor() {
    // Save data in app user data directory
    const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../.storage_data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.filePath = path.join(userDataPath, 'gitman_accounts.json');
    this.legacyFilePath = path.join(userDataPath, 'gitmulti_accounts.json');
    this.ensureFileExists();
  }

  ensureFileExists() {
    if (!fs.existsSync(this.filePath)) {
      if (fs.existsSync(this.legacyFilePath)) {
        try {
          fs.copyFileSync(this.legacyFilePath, this.filePath);
        } catch (e) {
          console.error('Failed to copy legacy storage file:', e);
        }
      }
      if (!fs.existsSync(this.filePath)) {
        const initialData = { accounts: [], activeAccountId: null };
        fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), 'utf-8');
      }
    }
  }

  getData() {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read storage data:', error);
      return { accounts: [], activeAccountId: null };
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save storage data:', error);
      return false;
    }
  }

  getAccounts() {
    const data = this.getData();
    return data.accounts || [];
  }

  getActiveAccountId() {
    const data = this.getData();
    return data.activeAccountId;
  }

  saveAccount(account) {
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

  deleteAccount(accountId) {
    const data = this.getData();
    data.accounts = data.accounts.filter((acc) => acc.id !== accountId);

    if (data.activeAccountId === accountId) {
      data.activeAccountId = data.accounts.length > 0 ? data.accounts[0].id : null;
    }

    this.saveData(data);
    return data;
  }

  setActiveAccount(accountId) {
    const data = this.getData();
    data.activeAccountId = accountId;
    this.saveData(data);
    return data;
  }
}

export default new StorageService();
