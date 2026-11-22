import React from 'react';
import { GitBranch, GitCommit, User } from 'lucide-react';

interface RepoStatusPillsProps {
  currentBranch?: string;
  totalUncommitted?: number;
  userName?: string;
}

export default function RepoStatusPills({
  currentBranch = 'main',
  totalUncommitted = 0,
  userName
}: RepoStatusPillsProps) {
  return (
    <div className="status-pills-row">
      <div className="status-pill">
        <div className="status-pill-label">Branch</div>
        <div className="status-pill-value">
          <GitBranch size={14} color="#388bfd" />
          {currentBranch}
        </div>
      </div>

      <div className="status-pill">
        <div className="status-pill-label">Changes</div>
        <div className="status-pill-value">
          <GitCommit size={14} color={totalUncommitted > 0 ? '#d29922' : '#3fb950'} />
          {totalUncommitted > 0 ? `${totalUncommitted} modified` : 'Clean'}
        </div>
      </div>

      <div className="status-pill">
        <div className="status-pill-label">Configured Git Identity</div>
        <div className="status-pill-value" style={{ fontSize: '12px' }}>
          <User size={14} color="#a371f7" />
          {userName ? userName : 'Will be set on Publish'}
        </div>
      </div>
    </div>
  );
}
