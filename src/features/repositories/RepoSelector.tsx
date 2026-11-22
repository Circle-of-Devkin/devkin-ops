import React, { useState, type DragEvent } from 'react';
import {
  Folder,
  GitCommit,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  Play,
  Code2,
  FolderOpen,
  Check,
  ShieldCheck,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { type WorkflowMode } from '../../types/workflow';
import { apiBridge } from '../../services/apiBridge';
import BranchSelector from '../branches/BranchSelector';
import DiffViewerModal from '../diff/DiffViewerModal';
import DiscardConfirmModal from '../staging/DiscardConfirmModal';
import RecentProjectsChips from './RecentProjectsChips';
import SecretShieldAlert, { type SensitiveFileMatch } from './SecretShieldAlert';
import ChangesList, { type GitChange } from './ChangesList';
import RepoStatusPills from './RepoStatusPills';
import './repoSelector.css';
import '../staging/staging.css';

export type { SensitiveFileMatch };

interface GitStatus {
  isGitRepo?: boolean;
  folderName?: string;
  currentBranch?: string;
  totalUncommitted?: number;
  stagedCount?: number;
  modifiedCount?: number;
  notAddedCount?: number;
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
  const [diffTarget, setDiffTarget] = useState<{ path: string; type: 'added' | 'modified' | 'deleted' } | null>(null);
  const [discardTarget, setDiscardTarget] = useState<{ path: string; isUntracked: boolean } | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isStagingAction, setIsStagingAction] = useState(false);

  const handleToggleStage = async (filePath: string, currentlyStaged: boolean) => {
    if (!folderPath || isStagingAction) return;
    setIsStagingAction(true);
    try {
      if (currentlyStaged) {
        await apiBridge.unstageFile(folderPath, filePath);
      } else {
        await apiBridge.stageFile(folderPath, filePath);
      }
      if (onRefreshGitStatus) {
        await onRefreshGitStatus(folderPath);
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Staging update failed' });
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsStagingAction(false);
    }
  };

  const handleStageAll = async () => {
    if (!folderPath || isStagingAction) return;
    setIsStagingAction(true);
    try {
      await apiBridge.stageAll(folderPath);
      if (onRefreshGitStatus) {
        await onRefreshGitStatus(folderPath);
      }
      setSyncMessage({ type: 'success', text: 'All changes staged for commit!' });
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Failed to stage all files' });
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsStagingAction(false);
    }
  };

  const handleUnstageAll = async () => {
    if (!folderPath || isStagingAction) return;
    setIsStagingAction(true);
    try {
      await apiBridge.unstageAll(folderPath);
      if (onRefreshGitStatus) {
        await onRefreshGitStatus(folderPath);
      }
      setSyncMessage({ type: 'info', text: 'All files unstaged.' });
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Failed to unstage all files' });
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsStagingAction(false);
    }
  };

  const handleConfirmDiscard = async () => {
    if (!folderPath || !discardTarget || isDiscarding) return;
    setIsDiscarding(true);
    try {
      const res = await apiBridge.discardFileChanges(folderPath, discardTarget.path, discardTarget.isUntracked);
      if (res && res.success) {
        setSyncMessage({ type: 'info', text: `Discarded changes in "${discardTarget.path}"` });
        setDiscardTarget(null);
        if (onRefreshGitStatus) {
          await onRefreshGitStatus(folderPath);
        }
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage({ type: 'error', text: res?.error || 'Failed to discard changes' });
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Failed to discard changes' });
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setIsDiscarding(false);
    }
  };

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

      <RecentProjectsChips
        recentProjects={recentProjects}
        activeFolderPath={folderPath}
        onSelectProject={onSelectRecentProject}
        onRemoveProject={onRemoveRecentProject}
        onClearProjects={onClearRecentProjects}
      />

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
            <SecretShieldAlert
              sensitiveFiles={gitStatus.sensitiveFiles!}
              isProtecting={isProtectingSecrets}
              onProtect={handleProtectSecrets}
            />
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
                <span>
                  <GitCommit size={14} /> {(gitStatus.totalUncommitted || 0) > 0 ? `${gitStatus.totalUncommitted} uncommitted changes` : 'Working tree clean'}
                </span>
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

              <ChangesList
                changes={gitStatus.changes}
                totalUncommitted={gitStatus.totalUncommitted}
                stagedCount={gitStatus.stagedCount}
                workflowMode={workflowMode}
                isStagingAction={isStagingAction}
                onToggleStage={handleToggleStage}
                onStageAll={handleStageAll}
                onUnstageAll={handleUnstageAll}
                onOpenDiff={(target) => setDiffTarget(target)}
                onOpenDiscard={(target) => setDiscardTarget(target)}
              />
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
        <RepoStatusPills
          currentBranch={gitStatus.currentBranch}
          totalUncommitted={gitStatus.totalUncommitted}
          userName={gitStatus.userName}
        />
      )}

      {diffTarget && folderPath && (
        <DiffViewerModal
          isOpen={Boolean(diffTarget)}
          onClose={() => setDiffTarget(null)}
          folderPath={folderPath}
          filePath={diffTarget.path}
          changeType={diffTarget.type}
        />
      )}

      {discardTarget && folderPath && (
        <DiscardConfirmModal
          isOpen={Boolean(discardTarget)}
          filePath={discardTarget.path}
          isUntracked={discardTarget.isUntracked}
          isDiscarding={isDiscarding}
          onClose={() => !isDiscarding && setDiscardTarget(null)}
          onConfirm={handleConfirmDiscard}
        />
      )}
    </div>
  );
}
