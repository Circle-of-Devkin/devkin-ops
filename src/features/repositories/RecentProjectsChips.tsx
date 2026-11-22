import React from 'react';
import { History, Folder, X } from 'lucide-react';

interface RecentProjectsChipsProps {
  recentProjects: string[];
  activeFolderPath: string;
  onSelectProject?: (path: string) => void;
  onRemoveProject?: (path: string) => void;
  onClearProjects?: () => void;
}

export default function RecentProjectsChips({
  recentProjects,
  activeFolderPath,
  onSelectProject,
  onRemoveProject,
  onClearProjects
}: RecentProjectsChipsProps) {
  if (!recentProjects || recentProjects.length === 0) {
    return null;
  }

  return (
    <div className="recent-projects-bar">
      <div className="recent-projects-header">
        <div className="recent-projects-title">
          <History size={12} color="var(--ios-blue)" />
          <span>Recent Projects</span>
        </div>
        {onClearProjects && (
          <button
            type="button"
            className="btn-clear-recent"
            onClick={onClearProjects}
            title="Clear all recent projects"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="recent-projects-list">
        {recentProjects.map((p) => {
          const name = p.split('/').filter(Boolean).pop() || p;
          const isActive = p === activeFolderPath;
          return (
            <div
              key={p}
              className={`recent-project-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectProject?.(p)}
              title={p}
            >
              <Folder size={12} className="recent-pill-icon" />
              <span className="recent-pill-name">{name}</span>
              {onRemoveProject && (
                <button
                  type="button"
                  className="recent-pill-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveProject(p);
                  }}
                  title="Remove from recent"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
