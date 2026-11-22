import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export interface SensitiveFileMatch {
  path: string;
  reason: string;
  severity: 'critical' | 'warning';
  recommendedPattern: string;
}

interface SecretShieldAlertProps {
  sensitiveFiles: SensitiveFileMatch[];
  isProtecting: boolean;
  onProtect: () => void;
}

export default function SecretShieldAlert({
  sensitiveFiles,
  isProtecting,
  onProtect
}: SecretShieldAlertProps) {
  if (!sensitiveFiles || sensitiveFiles.length === 0) {
    return null;
  }

  return (
    <div className="secret-shield-card">
      <div className="secret-shield-top">
        <div className="secret-shield-title">
          <ShieldAlert size={16} className="secret-shield-icon" />
          <span>Secret Shield Alert: Sensitive files detected</span>
        </div>
        <button
          type="button"
          className="btn-protect-secrets"
          onClick={onProtect}
          disabled={isProtecting}
        >
          <ShieldCheck size={13} />
          <span>{isProtecting ? 'Protecting...' : 'Add to .gitignore & Untrack'}</span>
        </button>
      </div>
      <div className="secret-shield-body">
        The following {sensitiveFiles.length} file(s) may contain private credentials or secrets. Protect them before publishing to GitHub:
      </div>
      <div className="secret-shield-chips">
        {sensitiveFiles.map((s) => (
          <span key={s.path} className={`secret-chip secret-chip-${s.severity}`}>
            <code>{s.path}</code>
            <small>{s.reason}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
