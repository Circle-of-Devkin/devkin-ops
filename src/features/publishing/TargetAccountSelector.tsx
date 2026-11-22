import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';

interface Account {
  id: string;
  name?: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  authType?: string;
  patToken?: string;
  sshKeyPath?: string;
}

interface TargetAccountSelectorProps {
  accounts: Account[];
  activeAccountId?: string;
  onSelectAccount?: (id: string) => void;
  onOpenAddModal?: () => void;
}

export default function TargetAccountSelector({
  accounts,
  activeAccountId,
  onSelectAccount,
  onOpenAddModal
}: TargetAccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || (accounts.length > 0 ? accounts[0] : null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!activeAccount) {
    return null;
  }

  return (
    <div className="account-dropdown-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`account-dropdown-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <img
          src={activeAccount.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
          alt={activeAccount.username}
          className="trigger-avatar"
        />
        <span className="trigger-username">@{activeAccount.username}</span>
        <ChevronDown size={14} className={`trigger-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="account-dropdown-popover" role="listbox">
          <div className="account-dropdown-header">
            <span>Switch Target Account</span>
          </div>

          <div className="account-dropdown-list">
            {accounts.map((acc) => {
              const isSelected = acc.id === (activeAccountId || activeAccount.id);
              const isOAuth = acc.authType === 'oauth' || (acc.patToken && acc.patToken.startsWith('gho_'));
              const isPat = acc.authType === 'pat' && !isOAuth;

              return (
                <div
                  key={acc.id}
                  className={`account-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectAccount?.(acc.id);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <img
                    src={acc.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
                    alt={acc.username}
                    className="dropdown-item-avatar"
                  />
                  <div className="dropdown-item-info">
                    <div className="dropdown-item-name">{acc.name || acc.username}</div>
                    <div className="dropdown-item-meta">
                      <span className="dropdown-item-username">@{acc.username}</span>
                      <span
                        className={`dropdown-badge ${
                          isOAuth
                            ? 'dropdown-badge-oauth'
                            : isPat
                            ? 'dropdown-badge-pat'
                            : 'dropdown-badge-ssh'
                        }`}
                      >
                        {isOAuth ? 'OAuth' : isPat ? 'PAT' : 'SSH'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="dropdown-item-check" />}
                </div>
              );
            })}
          </div>

          {onOpenAddModal && (
            <div className="account-dropdown-footer">
              <button
                type="button"
                className="btn-dropdown-add-account"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddModal();
                }}
              >
                <Plus size={13} />
                <span>Add another account...</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
