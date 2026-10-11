import React from 'react';
import { Plus, User, Trash2, CheckCircle2, Key, Shield } from 'lucide-react';
import BrandMark from '../../components/ui/BrandMark';

export default function Sidebar({
  accounts,
  activeAccountId,
  onSelectAccount,
  onOpenAddModal,
  onDeleteAccount
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-icon">
            <BrandMark />
          </div>
          <div>
            <div className="brand-title">DevKin Ops</div>
            <div style={{ fontSize: '11px', color: 'var(--ios-text-muted)' }}>Account Switcher</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-label" style={{ margin: 0 }}>GitHub Accounts</div>
        <button className="btn-add-account" onClick={onOpenAddModal}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="accounts-list">
        {accounts.length === 0 ? (
          <div className="empty-state">
            <User size={32} color="var(--ios-text-muted)" />
            <div style={{ fontSize: '13px' }}>No accounts saved yet</div>
            <button className="btn-add-account" onClick={onOpenAddModal}>
              <Plus size={14} /> Add First Account
            </button>
          </div>
        ) : (
          accounts.map((acc) => {
            const isActive = acc.id === activeAccountId;
            const isOAuth = acc.authType === 'oauth' || (acc.patToken && acc.patToken.startsWith('gho_'));
            const isPat = acc.authType === 'pat' && !isOAuth;
            return (
              <div
                key={acc.id}
                className={`account-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectAccount(acc.id)}
              >
                <img
                  src={acc.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
                  alt={acc.name}
                  className="account-avatar"
                  onError={(e) => {
                    const image = e.currentTarget;
                    image.onerror = null;
                    image.src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
                  }}
                />
                <div className="account-info">
                  <div className="account-name">{acc.name}</div>
                  <div className="account-username">@{acc.username}</div>
                  <div style={{ marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span className={`badge-tag ${isOAuth ? 'badge-oauth' : isPat ? 'badge-pat' : 'badge-ssh'}`}>
                      {isOAuth ? 'Direct OAuth' : isPat ? 'PAT Token' : 'SSH Key'}
                    </span>
                  </div>
                </div>

                {isActive && (
                  <CheckCircle2 size={18} color="#3b82f6" style={{ minWidth: '18px' }} />
                )}

                <div className="account-actions">
                  <button
                    className="btn-icon-sm"
                    title="Delete Account"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Remove ${acc.name} (@${acc.username})?`)) {
                        onDeleteAccount(acc.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ background: 'var(--ios-input)', padding: '12px', borderRadius: '10px', fontSize: '12px', border: '1px solid var(--ios-border)' }}>
        <div style={{ fontWeight: 600, color: 'var(--ios-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} color="#30d158" /> Safe & Local
        </div>
        <div style={{ color: 'var(--ios-text-muted)', lineHeight: 1.4 }}>
          Credentials are strictly stored on your local machine and only passed directly to GitHub.
        </div>
      </div>
    </div>
  );
}
