import React from 'react';
import { Sparkles } from 'lucide-react';

export default function QuickHelp() {
  return (
    <div style={{ background: 'var(--ios-card)', border: '1px solid var(--ios-border)', borderRadius: '12px', padding: '18px 24px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ios-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <Sparkles size={16} color="#007aff" />
        <span>Simple 3-Step Process</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '12px', color: 'var(--ios-text-muted)' }}>
        <div>
          <strong style={{ color: 'var(--ios-text-primary)' }}>1. Add Account:</strong> Add account via Direct Login, PAT Token, or SSH.
        </div>
        <div>
          <strong style={{ color: 'var(--ios-text-primary)' }}>2. Pick Folder:</strong> Select or Drag & Drop local project directory.
        </div>
        <div>
          <strong style={{ color: 'var(--ios-text-primary)' }}>3. Publish:</strong> Click Publish to stage, commit, and push automatically.
        </div>
      </div>
    </div>
  );
}
