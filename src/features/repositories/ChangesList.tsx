import React from 'react';
import { FilePlus2, FilePen, FileX2, Eye, Undo2 } from 'lucide-react';
import { type WorkflowMode } from '../../types/workflow';

export interface GitChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  status: string;
  staged?: boolean;
  isUntracked?: boolean;
}

interface ChangesListProps {
  changes?: GitChange[];
  totalUncommitted?: number;
  stagedCount?: number;
  workflowMode?: WorkflowMode;
  isStagingAction?: boolean;
  onToggleStage: (filePath: string, currentlyStaged: boolean) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onOpenDiff: (target: { path: string; type: 'added' | 'modified' | 'deleted' }) => void;
  onOpenDiscard: (target: { path: string; isUntracked: boolean }) => void;
}

export default function ChangesList({
  changes = [],
  totalUncommitted = 0,
  stagedCount = 0,
  workflowMode = 'basic',
  isStagingAction = false,
  onToggleStage,
  onStageAll,
  onUnstageAll,
  onOpenDiff,
  onOpenDiscard
}: ChangesListProps) {
  const isProOrAdvanced = workflowMode !== 'basic';

  return (
    <div className="changes-preview">
      <div className="changes-preview-header">
        <div className="changes-header-left">
          <span>Changes to review before publish</span>
          <span className="changes-count-badge">{totalUncommitted} files</span>
          {stagedCount > 0 && (
            <span className="changes-staged-badge">{stagedCount} staged</span>
          )}
        </div>

        {isProOrAdvanced && changes.length > 0 && (
          <div className="changes-bulk-actions">
            <button
              type="button"
              className="btn-bulk-stage"
              onClick={onStageAll}
              disabled={isStagingAction}
              title="Stage all modified and untracked files"
            >
              Stage All
            </button>
            <button
              type="button"
              className="btn-bulk-unstage"
              onClick={onUnstageAll}
              disabled={isStagingAction || !stagedCount}
              title="Unstage all files from index"
            >
              Unstage All
            </button>
          </div>
        )}
      </div>

      {changes.length > 0 ? (
        <div className="changes-preview-list">
          {changes.map((change) => {
            const ChangeIcon = change.type === 'added' ? FilePlus2 : change.type === 'deleted' ? FileX2 : FilePen;
            return (
              <div
                className={`change-preview-row ${isProOrAdvanced ? 'clickable-diff-row' : ''}`}
                key={`${change.status}-${change.path}`}
                onClick={() => {
                  if (isProOrAdvanced) {
                    onOpenDiff({ path: change.path, type: change.type });
                  }
                }}
                title={isProOrAdvanced ? 'Click to inspect line-by-line diff' : undefined}
              >
                {isProOrAdvanced && (
                  <label
                    className="change-stage-checkbox"
                    title={change.staged ? 'Unstage file' : 'Stage file for commit'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(change.staged)}
                      onChange={() => onToggleStage(change.path, Boolean(change.staged))}
                      disabled={isStagingAction}
                    />
                  </label>
                )}

                <ChangeIcon size={14} className={`change-icon change-icon-${change.type}`} />
                <span className="change-type">{change.type}</span>

                {isProOrAdvanced && (
                  <span className={`stage-status-pill ${change.staged ? 'staged-yes' : 'staged-no'}`}>
                    {change.staged ? 'Staged' : 'Unstaged'}
                  </span>
                )}

                <span className="change-path">{change.path}</span>

                {isProOrAdvanced && (
                  <div className="change-row-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-diff-action"
                      onClick={() => onOpenDiff({ path: change.path, type: change.type })}
                      title="Review line diff"
                    >
                      <Eye size={12} />
                      <span>Diff</span>
                    </button>

                    <button
                      type="button"
                      className="btn-discard-action"
                      onClick={() => onOpenDiscard({ path: change.path, isUntracked: Boolean(change.isUntracked) })}
                      title="Discard uncommitted changes (Permanent)"
                    >
                      <Undo2 size={12} />
                      <span>Discard</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="changes-clean-state">No uncommitted files. Your working tree is clean.</div>
      )}
    </div>
  );
}
