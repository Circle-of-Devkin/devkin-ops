import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileCode2, AlertCircle, Loader2, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { apiBridge } from '../../services/apiBridge';

interface DiffLine {
  type: 'add' | 'del' | 'normal' | 'header';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffResult {
  success: boolean;
  filePath: string;
  isBinary?: boolean;
  isTooLarge?: boolean;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  raw?: string;
  message?: string;
  error?: string;
}

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath: string;
  filePath: string;
  changeType?: 'added' | 'modified' | 'deleted';
}

export default function DiffViewerModal({
  isOpen,
  onClose,
  folderPath,
  filePath,
  changeType = 'modified'
}: DiffViewerModalProps) {
  const [staged, setStaged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch diff on open or staged toggle
  useEffect(() => {
    if (!isOpen || !folderPath || !filePath) return;
    loadDiff();
  }, [isOpen, folderPath, filePath, staged]);

  const loadDiff = async () => {
    setLoading(true);
    try {
      const res = await apiBridge.getFileDiff(folderPath, filePath, staged);
      setDiffResult(res);
    } catch (err: any) {
      setDiffResult({
        success: false,
        filePath,
        additions: 0,
        deletions: 0,
        lines: [],
        error: err?.message || 'Failed to load file diff'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="diff-modal-backdrop" onClick={onClose}>
      <div className="diff-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="diff-modal-header">
          <div className="diff-modal-title-group">
            <FileCode2 size={16} className="text-blue-400" />
            <span className="diff-modal-file-path" title={filePath}>
              {filePath}
            </span>
            <button
              type="button"
              className="btn-diff-copy-path"
              onClick={handleCopyPath}
              title="Copy file path"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
            <span className={`diff-badge-type diff-badge-${changeType}`}>
              {changeType}
            </span>
          </div>

          <div className="diff-modal-header-actions">
            {/* Staged Toggle */}
            <div className="diff-staged-toggle">
              <button
                type="button"
                className={`diff-toggle-btn ${!staged ? 'active' : ''}`}
                onClick={() => setStaged(false)}
              >
                Working Tree
              </button>
              <button
                type="button"
                className={`diff-toggle-btn ${staged ? 'active' : ''}`}
                onClick={() => setStaged(true)}
              >
                Staged
              </button>
            </div>

            {/* Stats Badges */}
            {diffResult?.success && !diffResult.isBinary && !diffResult.isTooLarge && (
              <div className="diff-stats-badges">
                <span className="diff-stat-add" title={`${diffResult.additions} additions`}>
                  +{diffResult.additions}
                </span>
                <span className="diff-stat-del" title={`${diffResult.deletions} deletions`}>
                  -{diffResult.deletions}
                </span>
              </div>
            )}

            <button
              type="button"
              className="btn-diff-close"
              onClick={onClose}
              title="Close diff (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="diff-modal-body">
          {loading ? (
            <div className="diff-state-center">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <span>Analyzing line differences...</span>
            </div>
          ) : !diffResult?.success ? (
            <div className="diff-state-center diff-state-error">
              <AlertCircle size={24} className="text-red-400" />
              <span>{diffResult?.error || 'Unable to compute diff for this file.'}</span>
            </div>
          ) : diffResult.isBinary ? (
            <div className="diff-state-center diff-state-notice">
              <ShieldAlert size={26} className="text-amber-400" />
              <h4>Binary File Detected</h4>
              <p>{diffResult.message || 'Binary files cannot be displayed as text diff.'}</p>
            </div>
          ) : diffResult.isTooLarge ? (
            <div className="diff-state-center diff-state-notice">
              <ShieldAlert size={26} className="text-amber-400" />
              <h4>Large File Guard (2MB+)</h4>
              <p>{diffResult.message || 'This file exceeds the 2MB threshold and cannot be previewed in text mode.'}</p>
            </div>
          ) : diffResult.lines.length === 0 ? (
            <div className="diff-state-center">
              <span>{diffResult.message || 'No differences found between revisions.'}</span>
            </div>
          ) : (
            <div className="diff-code-table">
              {diffResult.lines.map((line, idx) => {
                if (line.type === 'header') {
                  return (
                    <div className="diff-line diff-line-header" key={`hdr-${idx}`}>
                      <div className="diff-line-gutter-old">...</div>
                      <div className="diff-line-gutter-new">...</div>
                      <div className="diff-line-sign">@@</div>
                      <div className="diff-line-content">{line.text}</div>
                    </div>
                  );
                }

                const isAdd = line.type === 'add';
                const isDel = line.type === 'del';
                const sign = isAdd ? '+' : isDel ? '-' : ' ';

                return (
                  <div
                    key={`ln-${idx}`}
                    className={`diff-line diff-line-${line.type}`}
                  >
                    <div className="diff-line-gutter-old">
                      {line.oldLineNumber ?? ''}
                    </div>
                    <div className="diff-line-gutter-new">
                      {line.newLineNumber ?? ''}
                    </div>
                    <div className="diff-line-sign">{sign}</div>
                    <div className="diff-line-content">{line.text || ' '}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="diff-modal-footer">
          <div className="diff-footer-summary">
            {diffResult?.success && (
              <span>
                Reviewing <strong>{filePath}</strong> ({staged ? 'Staged in index' : 'Unstaged local changes'})
              </span>
            )}
          </div>
          <button type="button" className="btn-diff-modal-dismiss" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
