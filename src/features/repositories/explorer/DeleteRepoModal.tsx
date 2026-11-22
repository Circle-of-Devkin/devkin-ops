import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Trash2,
  Loader2,
  Check,
  ShieldAlert,
  Info
} from 'lucide-react';
import { apiBridge } from '../../../services/apiBridge';
import type { RemoteRepository } from './RepoCard';

interface DeleteRepoModalProps {
  isOpen: boolean;
  repo: RemoteRepository | null;
  account: any;
  isCurrentProjectRemote?: boolean;
  currentFolderPath?: string;
  onClose: () => void;
  onDeleted: (deletedRepo: RemoteRepository, unlinkedLocal: boolean) => void;
}

export default function DeleteRepoModal({
  isOpen,
  repo,
  account,
  isCurrentProjectRemote = false,
  currentFolderPath,
  onClose,
  onDeleted
}: DeleteRepoModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [unlinkLocal, setUnlinkLocal] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setUnlinkLocal(isCurrentProjectRemote);
      setIsDeleting(false);
      setErrorMsg(null);
    }
  }, [isOpen, repo, isCurrentProjectRemote]);

  if (!isOpen || !repo) return null;

  const isConfirmed = confirmInput.trim() === repo.name;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const res = await apiBridge.deleteRepository({
        accountId: account?.id,
        token: account?.patToken,
        owner: repo.owner,
        repo: repo.name
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to delete repository from GitHub.');
        setIsDeleting(false);
        return;
      }

      // If user opted to unlink local remote
      let unlinked = false;
      if (unlinkLocal && currentFolderPath) {
        try {
          await apiBridge.unlinkRemote(currentFolderPath);
          unlinked = true;
        } catch (unlinkErr) {
          console.warn('Failed to unlink local git remote:', unlinkErr);
        }
      }

      onDeleted(repo, unlinked);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred while deleting.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-title">
            <AlertTriangle size={18} />
            <span>Delete Repository Permanently</span>
          </div>
          <button
            type="button"
            className="delete-modal-close"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleDelete} className="delete-modal-body">
          <div className="delete-modal-warning-box">
            <strong>Warning: This action is permanent and irreversible.</strong>
            <div>
              This will completely delete <strong>{repo.fullName}</strong> on GitHub including all code, commits, branches, issues, and releases.
            </div>
          </div>

          <div className="delete-modal-prompt">
            Please type <span className="delete-modal-repo-target">{repo.name}</span> to confirm:
          </div>

          <input
            type="text"
            className="delete-confirm-input"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={repo.name}
            autoFocus
            disabled={isDeleting}
            autoComplete="off"
            spellCheck={false}
          />

          {isCurrentProjectRemote && currentFolderPath && (
            <label className="delete-modal-unlink-toggle">
              <input
                type="checkbox"
                checked={unlinkLocal}
                onChange={(e) => setUnlinkLocal(e.target.checked)}
                className="devkin-checkbox-input"
                disabled={isDeleting}
              />
              <div className={`devkin-checkbox-box ${unlinkLocal ? 'checked' : ''}`} style={{ marginTop: '2px' }}>
                {unlinkLocal && <Check size={12} strokeWidth={3} className="devkin-checkbox-icon" />}
              </div>
              <span>
                <strong>Also unlink local Git remote</strong> from your currently open project folder. (Prevents broken ghost remote references)
              </span>
            </label>
          )}

          {errorMsg && (
            <div className="delete-modal-warning-box" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <ShieldAlert size={16} style={{ minWidth: '16px', marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Deletion Failed</div>
                  <div>{errorMsg}</div>
                  {errorMsg.includes('delete_repo') && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                      <Info size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      To fix this: Go to GitHub.com &gt; Settings &gt; Developer settings &gt; Personal access tokens &gt; Select your token &gt; Check the <strong>delete_repo</strong> checkbox &gt; Save.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="delete-modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
            <button
              type="button"
              className="btn-delete-cancel"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-delete-confirm"
              disabled={!isConfirmed || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>I understand, delete this repository</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
