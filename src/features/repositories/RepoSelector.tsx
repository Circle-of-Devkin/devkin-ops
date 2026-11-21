import React, { useState, type DragEvent } from 'react';
import { Folder, GitBranch, GitCommit, User, AlertCircle, RefreshCw, UploadCloud, Play, FilePlus2, FilePen, FileX2, History, X, Code2, FolderOpen, Check, ShieldAlert, ShieldCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { type WorkflowMode } from '../../types/workflow';
import { apiBridge } from '../../services/apiBridge';
import BranchSelector from './BranchSelector';

interface GitChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  status: string;
}

export interface SensitiveFileMatch {
  path: string;
  reason: string;
  severity: 'critical' | 'warning';
  recommendedPattern: string;
}

interface GitStatus {
  isGitRepo?: boolean;
  folderName?: string;
  currentBranch?: string;
  totalUncommitted?: number;
  remoteUrl?: string;
  userName?: string;
  changes?: GitChange[];
  hasSensitiveFiles?: boolean;
  sensitiveFiles?: SensitiveFileMatch[];
  ahead?: number;
  behind?: number;
  tracking?: string | null;
}

interface RepoSelectorProps {
  folderPath: string;
  gitStatus: GitStatus | null;
  activeAccount?: any;
  onSelectFolder: () => void;
  onInitRepo: () => void;
  onDropFolder?: (path: string) => void;
  onRefreshGitStatus?: (path: string) => Promise<void>;
  workflowMode?: WorkflowMode;
  recentProjects?: string[];
  onSelectRecentProject?: (path: string) => void;
  onRemoveRecentProject?: (path: string) => void;
  onClearRecentProjects?: () => void;
}

export default function RepoSelector({
  folderPath,
  gitStatus,
  activeAccount,
  onSelectFolder,
  onInitRepo,
  onDropFolder,
  onRefreshGitStatus,
  workflowMode = 'basic',
  recentProjects = [],
  onSelectRecentProject,
  onRemoveRecentProject,
  onClearRecentProjects
}: RepoSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [launcherStatus, setLauncherStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isProtectingSecrets, setIsProtectingSecrets] = useState(false);
  const [secretsProtectedMessage, setSecretsProtectedMessage] = useState<string | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const handleCheckRemoteSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!folderPath) return;
    setIsCheckingSync(true);
    setSyncMessage(null);
    try {
      const res = await apiBridge.syncRemote(folderPath, activeAccount);
      if (res && res.success) {
        if (onRefreshGitStatus) {
          await onRefreshGitStatus(folderPath);
        }
        if (res.behind > 0) {
          setSyncMessage({ type: 'info', text: `${res.behind} new commit(s) available on remote. Click 'Pull' to update.` });
        } else if (res.ahead > 0) {
          setSyncMessage({ type: 'info', text: `You have ${res.ahead} local commit(s) ready to push.` });
        } else {
          setSyncMessage({ type: 'success', text: 'Local repository is fully up-to-date with remote!' });
        }
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage({ type: 'error', text: res?.error || 'Failed to sync with remote' });
        setTimeout(() => setSyncMessage(null), 4500);
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Remote sync failed' });
      setTimeout(() => setSyncMessage(null), 4500);
    } finally {
      setIsCheckingSync(false);
    }
  };

  const handlePullRemote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!folderPath) return;
    setIsPulling(true);
    setSyncMessage(null);
    try {
      const res = await apiBridge.pullRepo({
        folderPath,
        account: activeAccount,
        branchName: gitStatus?.currentBranch || 'main'
      });
      if (res && res.success) {
        setSyncMessage({ type: 'success', text: res.message || 'Successfully pulled remote changes!' });
        if (onRefreshGitStatus) {
          await onRefreshGitStatus(folderPath);
        }
        setTimeout(() => setSyncMessage(null), 4500);
      } else {
        setSyncMessage({ type: 'error', text: res?.error || 'Pull failed' });
        setTimeout(() => setSyncMessage(null), 6000);
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Pull failed' });
      setTimeout(() => setSyncMessage(null), 6000);
    } finally {
      setIsPulling(false);
    }
  };

  const handleProtectSecrets = async () => {
    if (!folderPath || !gitStatus?.sensitiveFiles?.length) return;
    setIsProtectingSecrets(true);
    setSecretsProtectedMessage(null);
    try {
      const patterns = gitStatus.sensitiveFiles.map((s) => s.path);
      const res = await apiBridge.addToGitignore(folderPath, patterns);
      if (res && res.success) {
        setSecretsProtectedMessage(`Protected ${patterns.length} secret file(s) in .gitignore!`);
        if (onRefreshGitStatus) {
          await onRefreshGitStatus(folderPath);
        }
        setTimeout(() => setSecretsProtectedMessage(null), 4000);
      } else {
        setLauncherStatus({ type: 'error', message: res?.error || 'Failed to update .gitignore' });
      }
    } catch (e: any) {
      setLauncherStatus({ type: 'error', message: e?.message || 'Failed to update .gitignore' });
    } finally {
      setIsProtectingSecrets(false);
    }
  };

  const handleOpenInVSCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!folderPath) return;
    setLauncherStatus(null);
    const res = await apiBridge.openInVSCode(folderPath);
    if (res && !res.success) {
      setLauncherStatus({ type: 'error', message: res.error || 'Failed to open in VS Code' });
      setTimeout(() => setLauncherStatus(null), 4000);
    } else {
      setLauncherStatus({ type: 'success', message: 'Opening project in VS Code...' });
      setTimeout(() => setLauncherStatus(null), 2500);
    }
  };

  const handleOpenInFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!folderPath) return;
    setLauncherStatus(null);
    const res = await apiBridge.openInFolder(folderPath);
    if (res && !res.success) {
      setLauncherStatus({ type: 'error', message: res.error || 'Failed to open folder' });
      setTimeout(() => setLauncherStatus(null), 4000);
    } else {
      setLauncherStatus({ type: 'success', message: 'Opening in file manager...' });
      setTimeout(() => setLauncherStatus(null), 2500);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0] as File & { path?: string };
      const droppedPath = droppedFile.path;
      if (droppedPath && onDropFolder) {
        onDropFolder(droppedPath);
      }
    }
  };

  const handleRefreshClick = async () => {
    if (!folderPath || !onRefreshGitStatus) return;
    setIsRefreshing(true);
    await onRefreshGitStatus(folderPath);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <span className="step-badge">Step 1</span>
        <div>
          <div className="panel-title">Choose Project Folder</div>
          <div className="panel-subtitle">Drag & drop a folder here, or select using file browser</div>
        </div>
      </div>

      <div
        className={`folder-drop-zone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          {isDragging ? (
            <UploadCloud size={24} color="#007aff" style={{ minWidth: 24 }} />
          ) : (
            <Folder size={24} color="#388bfd" style={{ minWidth: 24 }} />
          )}
          <div className="folder-info-text">
            {isDragging ? (
              <span style={{ color: '#007aff', fontWeight: 600 }}>Drop folder here to load project!</span>
            ) : folderPath ? (
              folderPath
            ) : (
              'Drag & Drop project folder here, or click Select Folder'
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {folderPath && (
            <button
              type="button"
              className="btn-refresh"
              onClick={handleRefreshClick}
              title="Refresh Git Status"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          )}

          <button type="button" className="btn-select-folder" onClick={onSelectFolder}>
            <Folder size={16} /> {folderPath ? 'Change Folder' : 'Select Folder'}
          </button>
        </div>
      </div>

      {recentProjects.length > 0 && (
        <div className="recent-projects-bar">
          <div className="recent-projects-header">
            <div className="recent-projects-title">
              <History size={12} color="var(--ios-blue)" />
              <span>Recent Projects</span>
            </div>
            {onClearRecentProjects && (
              <button
                type="button"
                className="btn-clear-recent"
                onClick={onClearRecentProjects}
                title="Clear all recent projects"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="recent-projects-list">
            {recentProjects.map((p) => {
              const name = p.split('/').filter(Boolean).pop() || p;
              const isActive = p === folderPath;
              return (
                <div
                  key={p}
                  className={`recent-project-pill ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectRecentProject?.(p)}
                  title={p}
                >
                  <Folder size={12} className="recent-pill-icon" />
                  <span className="recent-pill-name">{name}</span>
                  {onRemoveRecentProject && (
                    <button
                      type="button"
                      className="recent-pill-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecentProject(p);
                      }}
                      title="Remove from recent"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {folderPath && gitStatus && (
        <div className="selected-folder-summary">
          <div className="selected-folder-heading">
            <div className="selected-folder-info-block">
              <div className="selected-folder-name">
                <Folder size={16} color="#3b82f6" />
                {gitStatus.folderName || folderPath.split('/').pop() || 'Project folder'}
              </div>
              <div className="selected-folder-path" title={folderPath}>{folderPath}</div>
            </div>
            <div className="folder-action-launchers">
              <button
                type="button"
                className="btn-quick-launcher"
                onClick={handleOpenInVSCode}
                title="Open project in VS Code editor"
              >
                <Code2 size={13} />
                <span>VS Code</span>
              </button>
              <button
                type="button"
                className="btn-quick-launcher"
                onClick={handleOpenInFolder}
                title="Open folder in system file manager"
              >
                <FolderOpen size={13} />
                <span>Open Folder</span>
              </button>
              <span className={`repo-status-badge ${gitStatus.isGitRepo ? 'repo-status-ready' : 'repo-status-warning'}`}>
                {gitStatus.isGitRepo ? 'Git repository detected' : 'Git setup required'}
              </span>
            </div>
          </div>
          {launcherStatus && (
            <div className={`launcher-status-toast launcher-status-${launcherStatus.type}`}>
              {launcherStatus.type === 'error' ? <AlertCircle size={13} /> : <Check size={13} />}
              <span>{launcherStatus.message}</span>
            </div>
          )}

          {gitStatus.hasSensitiveFiles && (gitStatus.sensitiveFiles?.length ?? 0) > 0 && (
            <div className="secret-shield-card">
              <div className="secret-shield-top">
                <div className="secret-shield-title">
                  <ShieldAlert size={16} className="secret-shield-icon" />
                  <span>Secret Shield Alert: Sensitive files detected</span>
                </div>
                <button
                  type="button"
                  className="btn-protect-secrets"
                  onClick={handleProtectSecrets}
                  disabled={isProtectingSecrets}
                >
                  <ShieldCheck size={13} />
                  <span>{isProtectingSecrets ? 'Protecting...' : 'Add to .gitignore & Untrack'}</span>
                </button>
              </div>
              <div className="secret-shield-body">
                The following {gitStatus.sensitiveFiles!.length} file(s) may contain private credentials or secrets. Protect them before publishing to GitHub:
              </div>
              <div className="secret-shield-chips">
                {gitStatus.sensitiveFiles!.map((s) => (
                  <span key={s.path} className={`secret-chip secret-chip-${s.severity}`}>
                    <code>{s.path}</code>
                    <small>{s.reason}</small>
                  </span>
                ))}
              </div>
            </div>
          )}

          {secretsProtectedMessage && (
            <div className="launcher-status-toast launcher-status-success" style={{ marginTop: '10px' }}>
              <ShieldCheck size={14} />
              <span>{secretsProtectedMessage}</span>
            </div>
          )}
          {gitStatus.isGitRepo && (
            <>
              <div className="selected-folder-details">
                <BranchSelector
                  folderPath={folderPath}
                  currentBranch={gitStatus.currentBranch || 'main'}
                  workflowMode={workflowMode}
                  onBranchChanged={async () => {
                    if (onRefreshGitStatus) {
                      await onRefreshGitStatus(folderPath);
                    }
                  }}
                />
                <span><GitCommit size={14} /> {(gitStatus.totalUncommitted || 0) > 0 ? `${gitStatus.totalUncommitted} uncommitted changes` : 'Working tree clean'}</span>
                <span>{gitStatus.remoteUrl ? 'Remote configured' : 'No remote configured'}</span>

                {workflowMode !== 'basic' && gitStatus.remoteUrl && (
                  <div className="repo-sync-widget">
                    {gitStatus.behind && gitStatus.behind > 0 ? (
                      <button
                        type="button"
                        className="btn-sync-action btn-sync-pull"
                        onClick={handlePullRemote}
                        disabled={isPulling}
                        title="Pull incoming commits from GitHub"
                      >
                        <ArrowDown size={12} className="animate-bounce" />
                        <span>{isPulling ? 'Pulling...' : `Pull ${gitStatus.behind} commit(s)`}</span>
                      </button>
                    ) : gitStatus.ahead && gitStatus.ahead > 0 ? (
                      <span className="sync-pill sync-pill-ahead" title="Local commits ready to publish">
                        <ArrowUp size={12} />
                        <span>{gitStatus.ahead} ahead</span>
                      </span>
                    ) : (
                      <span className="sync-pill sync-pill-synced" title="Local branch is up to date with remote">
                        <Check size={12} />
                        <span>In sync</span>
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn-sync-check"
                      onClick={handleCheckRemoteSync}
                      disabled={isCheckingSync}
                      title="Fetch and check for latest remote updates"
                    >
                      <RefreshCw size={11} className={isCheckingSync ? 'animate-spin' : ''} />
                      <span>{isCheckingSync ? 'Checking...' : 'Check Remote'}</span>
                    </button>
                  </div>
                )}
              </div>

              {syncMessage && (
                <div className={`launcher-status-toast launcher-status-${syncMessage.type}`} style={{ marginTop: '8px' }}>
                  {syncMessage.type === 'error' ? <AlertCircle size={13} /> : <Check size={13} />}
                  <span>{syncMessage.text}</span>
                </div>
              )}
              <div className="changes-preview">
                <div className="changes-preview-header">
                  <span>Changes to review before publish</span>
                  <span>{gitStatus.totalUncommitted || 0} files</span>
                </div>
                {(gitStatus.changes?.length ?? 0) > 0 ? (
                  <div className="changes-preview-list">
                    {gitStatus.changes?.map((change) => {
                      const ChangeIcon = change.type === 'added' ? FilePlus2 : change.type === 'deleted' ? FileX2 : FilePen;
                      return (
                        <div className="change-preview-row" key={`${change.status}-${change.path}`}>
                          <ChangeIcon size={14} className={`change-icon change-icon-${change.type}`} />
                          <span className="change-type">{change.type}</span>
                          <span className="change-path">{change.path}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="changes-clean-state">No uncommitted files. Your working tree is clean.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {folderPath && gitStatus && !gitStatus.isGitRepo && (
        <div className="alert-banner alert-info" style={{ marginTop: '16px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#58a6ff" />
            <span>This folder is not initialized with Git yet.</span>
          </div>
          <button className="btn-select-folder" style={{ background: '#1f6feb' }} onClick={onInitRepo}>
            <Play size={14} /> Initialize Git
          </button>
        </div>
      )}

      {folderPath && gitStatus && gitStatus.isGitRepo && (
        <div className="status-pills-row">
          <div className="status-pill">
            <div className="status-pill-label">Branch</div>
            <div className="status-pill-value">
              <GitBranch size={14} color="#388bfd" />
              {gitStatus.currentBranch || 'main'}
            </div>
          </div>

          <div className="status-pill">
            <div className="status-pill-label">Changes</div>
            <div className="status-pill-value">
              <GitCommit size={14} color={(gitStatus.totalUncommitted || 0) > 0 ? '#d29922' : '#3fb950'} />
              {(gitStatus.totalUncommitted || 0) > 0 ? `${gitStatus.totalUncommitted} modified` : 'Clean'}
            </div>
          </div>

          <div className="status-pill">
            <div className="status-pill-label">Configured Git Identity</div>
            <div className="status-pill-value" style={{ fontSize: '12px' }}>
              <User size={14} color="#a371f7" />
              {gitStatus.userName ? gitStatus.userName : 'Will be set on Publish'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
