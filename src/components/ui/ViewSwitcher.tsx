import React from 'react';
import { UploadCloud, FolderGit2 } from 'lucide-react';
import './viewSwitcher.css';

export type ActiveAppView = 'publish' | 'repositories';

interface ViewSwitcherProps {
  activeView: ActiveAppView;
  onSelectView: (view: ActiveAppView) => void;
  activeUsername?: string;
}

export default function ViewSwitcher({
  activeView,
  onSelectView,
  activeUsername
}: ViewSwitcherProps) {
  return (
    <div className="view-switcher-bar">
      <div className="view-segmented-control" role="tablist" aria-label="Main View Switcher">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'publish'}
          className={`view-segment-btn ${activeView === 'publish' ? 'active active-publish' : ''}`}
          onClick={() => onSelectView('publish')}
        >
          <UploadCloud size={14} className="view-btn-icon" />
          <span>Publish Project</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'repositories'}
          className={`view-segment-btn ${activeView === 'repositories' ? 'active active-repos' : ''}`}
          onClick={() => onSelectView('repositories')}
        >
          <FolderGit2 size={14} className="view-btn-icon" />
          <span>Remote Repositories</span>
          {activeUsername && (
            <span className="view-account-pill">@{activeUsername}</span>
          )}
        </button>
      </div>
    </div>
  );
}
