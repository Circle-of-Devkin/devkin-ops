import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Lock,
  Globe,
  Loader2,
  FolderGit2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { apiBridge } from '../../../services/apiBridge';
import RepoCard, { type RemoteRepository } from './RepoCard';
import DeleteRepoModal from './DeleteRepoModal';
import './repoExplorer.css';

interface RepoExplorerProps {
  account: any;
  currentFolderPath?: string;
  currentGitStatus?: any;
  onRefreshGitStatus?: (path: string) => Promise<void>;
  onOpenAddAccount?: () => void;
  onSwitchToPublishView?: () => void;
}

type FilterTab = 'all' | 'public' | 'private' | 'sources' | 'forks';

function extractRepoNameFromUrl(remoteUrl?: string): string | null {
  if (!remoteUrl) return null;
  const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}

export default function RepoExplorer({
  account,
  currentFolderPath,
  currentGitStatus,
  onRefreshGitStatus,
  onOpenAddAccount,
  onSwitchToPublishView
}: RepoExplorerProps) {
  const [repos, setRepos] = useState<RemoteRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [deleteTarget, setDeleteTarget] = useState<RemoteRepository | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const fetchRepos = async () => {
    if (!account) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiBridge.listRepositories({
        accountId: account.id,
        token: account.patToken
      });

      if (res.success && Array.isArray(res.repos)) {
        setRepos(res.repos);
      } else {
        setErrorMsg(res.error || 'Failed to fetch repositories from GitHub.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while fetching repositories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.id) {
      fetchRepos();
    } else {
      setRepos([]);
    }
  }, [account?.id]);

  // Determine currently linked remote repo slug
  const activeRemoteSlug = useMemo(() => {
    return extractRepoNameFromUrl(currentGitStatus?.remoteUrl);
  }, [currentGitStatus?.remoteUrl]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: repos.length,
      public: repos.filter((r) => !r.isPrivate).length,
      private: repos.filter((r) => r.isPrivate).length,
      sources: repos.filter((r) => !r.isFork).length,
      forks: repos.filter((r) => r.isFork).length
    };
  }, [repos]);

  // Filtered repositories
  const filteredRepos = useMemo(() => {
    let list = repos;

    // Tab filter
    if (activeTab === 'public') list = list.filter((r) => !r.isPrivate);
    else if (activeTab === 'private') list = list.filter((r) => r.isPrivate);
    else if (activeTab === 'sources') list = list.filter((r) => !r.isFork);
    else if (activeTab === 'forks') list = list.filter((r) => r.isFork);

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.language && r.language.toLowerCase().includes(q))
      );
    }

    return list;
  }, [repos, activeTab, searchQuery]);

  const handleOpenExternal = (url: string) => {
    apiBridge.openExternalUrl(url);
  };

  const handleDeletedRepo = async (deletedRepo: RemoteRepository, unlinkedLocal: boolean) => {
    setRepos((prev) => prev.filter((r) => r.id !== deletedRepo.id));
    setToast({
      type: 'success',
      text: `Repository "${deletedRepo.name}" was permanently deleted on GitHub.${
        unlinkedLocal ? ' Local remote origin was also unlinked.' : ''
      }`
    });

    if (unlinkedLocal && currentFolderPath && onRefreshGitStatus) {
      await onRefreshGitStatus(currentFolderPath);
    }

    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  if (!account) {
    return (
      <div className="repo-explorer-empty">
        <FolderGit2 size={40} color="var(--ios-text-muted)" />
        <div className="repo-explorer-empty-title">No GitHub Account Selected</div>
        <p className="repo-explorer-empty-desc">
          Please add or select a GitHub account from the left sidebar to view and manage its repositories.
        </p>
        {onOpenAddAccount && (
          <button type="button" className="btn-select-folder" onClick={onOpenAddAccount}>
            <Plus size={14} /> Add GitHub Account
          </button>
        )}
      </div>
    );
  }

  const isOAuth = account.authType === 'oauth' || (account.patToken && account.patToken.startsWith('gho_'));
  const isPat = account.authType === 'pat' && !isOAuth;

  return (
    <div className="repo-explorer-container">
      {/* Account Profile & Summary Bar */}
      <div className="repo-explorer-header">
        <div className="repo-explorer-profile">
          <img
            src={account.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
            alt={account.name}
            className="repo-explorer-avatar"
          />
          <div className="repo-explorer-user-meta">
            <div className="repo-explorer-name">
              <span>{account.name || account.username}</span>
              <span className={`badge-tag ${isOAuth ? 'badge-oauth' : isPat ? 'badge-pat' : 'badge-ssh'}`}>
                {isOAuth ? 'Direct OAuth' : isPat ? 'PAT Token' : 'SSH'}
              </span>
            </div>
            <div className="repo-explorer-username">@{account.username}</div>
          </div>
        </div>

        <div className="repo-explorer-stats-bar">
          <div className="repo-stat-chip">
            <span>Repositories:</span>
            <strong>{counts.all}</strong>
          </div>
          <div className="repo-stat-chip">
            <Globe size={11} color="#60a5fa" />
            <span>Public:</span>
            <strong>{counts.public}</strong>
          </div>
          <div className="repo-stat-chip">
            <Lock size={11} color="#facc15" />
            <span>Private:</span>
            <strong>{counts.private}</strong>
          </div>

          <button
            type="button"
            className="repo-refresh-btn"
            onClick={fetchRepos}
            disabled={loading}
            title="Refresh repository list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className={`alert-banner alert-${toast.type}`} style={{ animation: 'fadeIn 0.2s ease-out' }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={16} />
          <div style={{ flex: 1 }}>{errorMsg}</div>
          <button type="button" className="btn-add-account" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={fetchRepos}>
            Try Again
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Filter Tabs */}
      <div className="repo-explorer-controls">
        <div className="repo-search-box">
          <Search size={15} className="repo-search-icon" />
          <input
            type="text"
            className="repo-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories by name, language, topic..."
          />
          {searchQuery && (
            <button
              type="button"
              className="repo-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="repo-filter-tabs" role="tablist">
          <button
            type="button"
            className={`repo-filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All</span>
            <span className="repo-count-badge">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`repo-filter-tab ${activeTab === 'public' ? 'active' : ''}`}
            onClick={() => setActiveTab('public')}
          >
            <span>Public</span>
            <span className="repo-count-badge">{counts.public}</span>
          </button>
          <button
            type="button"
            className={`repo-filter-tab ${activeTab === 'private' ? 'active' : ''}`}
            onClick={() => setActiveTab('private')}
          >
            <span>Private</span>
            <span className="repo-count-badge">{counts.private}</span>
          </button>
          <button
            type="button"
            className={`repo-filter-tab ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            <span>Sources</span>
            <span className="repo-count-badge">{counts.sources}</span>
          </button>
          <button
            type="button"
            className={`repo-filter-tab ${activeTab === 'forks' ? 'active' : ''}`}
            onClick={() => setActiveTab('forks')}
          >
            <span>Forks</span>
            <span className="repo-count-badge">{counts.forks}</span>
          </button>
        </div>
      </div>

      {/* Grid List of Repositories */}
      {loading && repos.length === 0 ? (
        <div className="repo-explorer-empty">
          <Loader2 size={32} className="animate-spin" color="#3b82f6" />
          <div className="repo-explorer-empty-title">Loading repositories from GitHub...</div>
          <p className="repo-explorer-empty-desc">Fetching repositories for @{account.username} via GitHub API.</p>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="repo-explorer-empty">
          <FolderGit2 size={36} color="var(--ios-text-muted)" />
          <div className="repo-explorer-empty-title">No repositories found</div>
          <p className="repo-explorer-empty-desc">
            {searchQuery
              ? `No repositories match "${searchQuery}". Try a different search term or clear the filter.`
              : `No ${activeTab !== 'all' ? activeTab : ''} repositories found under @${account.username}.`}
          </p>
          {searchQuery && (
            <button type="button" className="repo-refresh-btn" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          )}
          {onSwitchToPublishView && (
            <button type="button" className="btn-select-folder" style={{ marginTop: '8px' }} onClick={onSwitchToPublishView}>
              <Plus size={14} /> Publish a Project Here
            </button>
          )}
        </div>
      ) : (
        <div className="repo-cards-grid">
          {filteredRepos.map((repo) => {
            const isCurrent = activeRemoteSlug === repo.fullName.toLowerCase();
            return (
              <RepoCard
                key={repo.id}
                repo={repo}
                isCurrentProjectRemote={isCurrent}
                onOpenExternal={handleOpenExternal}
                onDelete={(target) => setDeleteTarget(target)}
              />
            );
          })}
        </div>
      )}

      {/* Safe Danger Zone Deletion Modal */}
      <DeleteRepoModal
        isOpen={deleteTarget !== null}
        repo={deleteTarget}
        account={account}
        isCurrentProjectRemote={Boolean(deleteTarget && activeRemoteSlug === deleteTarget.fullName.toLowerCase())}
        currentFolderPath={currentFolderPath}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeletedRepo}
      />
    </div>
  );
}
