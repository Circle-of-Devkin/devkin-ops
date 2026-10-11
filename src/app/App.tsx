import React, { useState, useEffect } from 'react';
import Sidebar from '../features/accounts/Sidebar';
import AccountModal from '../features/accounts/AccountModal';
import RepoSelector from '../features/repositories/RepoSelector';
import PublishPanel from '../features/publishing/PublishPanel';
import QuickHelp from '../components/ui/QuickHelp';
import RightSidebar from '../components/ui/RightSidebar';
import { apiBridge } from '../services/apiBridge';

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('gitman_theme') || 'dark');

  const [folderPath, setFolderPath] = useState('');
  const [gitStatus, setGitStatus] = useState(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gitman_theme', theme);
  }, [theme]);

  // Initial accounts load
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const data = await apiBridge.getAccounts();
    setAccounts(data.accounts || []);
    setActiveAccountId(data.activeAccountId || (data.accounts.length > 0 ? data.accounts[0].id : null));
  };

  const handleSelectAccount = async (accountId) => {
    setActiveAccountId(accountId);
    await apiBridge.setActiveAccount(accountId);
  };

  const handleSaveAccount = async (newAccount) => {
    await apiBridge.saveAccount(newAccount);
    await loadAccounts();
  };

  const handleDeleteAccount = async (accountId) => {
    await apiBridge.deleteAccount(accountId);
    await loadAccounts();
  };

  const handleSelectFolder = async () => {
    // Opens Real System File Manager Window!
    const selected = await apiBridge.selectFolder();
    if (selected) {
      setFolderPath(selected);
      refreshGitStatus(selected);
    }
  };

  const refreshGitStatus = async (path) => {
    if (path) {
      const status = await apiBridge.getGitStatus(path);
      setGitStatus(status);
    }
  };

  // Keep the project status in sync with changes made in an editor or terminal.
  useEffect(() => {
    if (!folderPath) return undefined;

    const refresh = () => refreshGitStatus(folderPath);
    const intervalId = window.setInterval(refresh, 3000);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [folderPath]);

  const handleInitRepo = async () => {
    if (folderPath) {
      const res = await apiBridge.initGitRepo(folderPath);
      if (res.success) {
        refreshGitStatus(folderPath);
      }
    }
  };

  const handlePublish = async (options) => {
    const res = await apiBridge.publishRepo(options);
    if (res.success) {
      refreshGitStatus(folderPath);
    }
    return res;
  };

  return (
    <div className="app-container">
      <div className="app-body">
        <Sidebar
          accounts={accounts}
          activeAccountId={activeAccountId}
          onSelectAccount={handleSelectAccount}
          onOpenAddModal={() => setIsAccountModalOpen(true)}
          onDeleteAccount={handleDeleteAccount}
        />

        <div className="main-content">
          <RepoSelector
            folderPath={folderPath}
            gitStatus={gitStatus}
            onSelectFolder={handleSelectFolder}
            onInitRepo={handleInitRepo}
            onDropFolder={(path) => {
              setFolderPath(path);
              refreshGitStatus(path);
            }}
            onRefreshGitStatus={refreshGitStatus}
          />

          <PublishPanel
            folderPath={folderPath}
            gitStatus={gitStatus}
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSelectAccount={handleSelectAccount}
            onPublish={handlePublish}
            onOpenAddModal={() => setIsAccountModalOpen(true)}
          />

          <QuickHelp />
        </div>

        <RightSidebar
          theme={theme}
          onSelectTheme={setTheme}
        />
      </div>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSaveAccount={handleSaveAccount}
      />
    </div>
  );
}
