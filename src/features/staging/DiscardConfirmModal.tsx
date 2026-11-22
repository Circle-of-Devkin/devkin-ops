import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Undo2, Loader2 } from 'lucide-react';
import './discardModal.css';

interface DiscardConfirmModalProps {
  isOpen: boolean;
  filePath: string;
  isUntracked: boolean;
  isDiscarding: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function DiscardConfirmModal({
  isOpen,
  filePath,
  isUntracked,
  isDiscarding,
  onConfirm,
  onClose
}: DiscardConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isDiscarding) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDiscarding, onClose]);

  if (!isOpen) return null;

  return (
    <div className="discard-modal-backdrop" onClick={!isDiscarding ? onClose : undefined}>
      <div className="discard-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="discard-modal-header">
          <div className="discard-modal-icon-badge">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="discard-modal-title-wrap">
            <h3>Discard Changes?</h3>
            <span className="discard-modal-subtitle">Data Loss Prevention Guard</span>
          </div>
          <button
            type="button"
            className="btn-discard-close"
            onClick={onClose}
            disabled={isDiscarding}
            title="Cancel (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        <div className="discard-modal-body">
          <p className="discard-modal-message">
            Are you sure you want to discard all changes in:
          </p>

          <div className="discard-file-highlight">
            <code>{filePath}</code>
          </div>

          <div className="discard-warning-callout">
            <AlertTriangle size={15} className="discard-warning-icon" />
            <div className="discard-warning-text">
              {isUntracked ? (
                <span>
                  <strong>Warning:</strong> This untracked file was never committed to Git and will be <strong>permanently deleted from your disk</strong>. This action cannot be undone.
                </span>
              ) : (
                <span>
                  <strong>Warning:</strong> All modifications in this file will be permanently reverted to the last commit. <strong>All uncommitted work will be lost forever.</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="discard-modal-actions">
          <button
            type="button"
            className="btn-discard-cancel"
            onClick={onClose}
            disabled={isDiscarding}
          >
            Keep Changes
          </button>
          <button
            type="button"
            className="btn-discard-danger"
            onClick={onConfirm}
            disabled={isDiscarding}
          >
            {isDiscarding ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Discarding...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>Yes, Discard Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
