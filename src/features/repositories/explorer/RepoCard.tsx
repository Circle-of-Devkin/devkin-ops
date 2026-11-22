import React from 'react';
import {
  Lock,
  Globe,
  Star,
  GitFork,
  ExternalLink,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export interface RemoteRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  htmlUrl: string;
  cloneUrlHttps: string;
  cloneUrlSsh: string;
  description: string;
  isFork: boolean;
  language: string | null;
  starsCount: number;
  forksCount: number;
  updatedAt: string;
  defaultBranch: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Shell: '#89e051',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB'
};

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

interface RepoCardProps {
  repo: RemoteRepository;
  isCurrentProjectRemote?: boolean;
  onOpenExternal: (url: string) => void;
  onDelete: (repo: RemoteRepository) => void;
}

export default function RepoCard({
  repo,
  isCurrentProjectRemote = false,
  onOpenExternal,
  onDelete
}: RepoCardProps) {
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || '#8b949e' : null;

  return (
    <div className={`repo-card ${isCurrentProjectRemote ? 'is-current-active' : ''}`}>
      <div className="repo-card-top">
        <div className="repo-card-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="repo-card-name"
              title={repo.fullName}
              onClick={() => onOpenExternal(repo.htmlUrl)}
              style={{ cursor: 'pointer' }}
            >
              {repo.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
            {repo.isPrivate ? (
              <span className="repo-badge-private">
                <Lock size={10} /> Private
              </span>
            ) : (
              <span className="repo-badge-public">
                <Globe size={10} /> Public
              </span>
            )}
            {repo.isFork && (
              <span className="repo-badge-public" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.25)' }}>
                <GitFork size={10} /> Fork
              </span>
            )}
            {isCurrentProjectRemote && (
              <span className="repo-badge-current" title="This remote is linked to your currently open local folder">
                <CheckCircle2 size={10} /> Linked Local
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="repo-card-desc">
        {repo.description || 'No description provided.'}
      </p>

      <div className="repo-card-meta">
        {repo.language && (
          <div className="repo-language">
            <span className="repo-lang-dot" style={{ background: langColor || '#8b949e' }} />
            <span>{repo.language}</span>
          </div>
        )}

        {repo.starsCount > 0 && (
          <div className="repo-card-stat" title={`${repo.starsCount} stars`}>
            <Star size={12} color="#fbbf24" fill="#fbbf24" />
            <span>{repo.starsCount}</span>
          </div>
        )}

        {repo.forksCount > 0 && (
          <div className="repo-card-stat" title={`${repo.forksCount} forks`}>
            <GitFork size={12} />
            <span>{repo.forksCount}</span>
          </div>
        )}

        <span style={{ marginLeft: 'auto' }}>
          Updated {formatRelativeTime(repo.updatedAt)}
        </span>
      </div>

      <div className="repo-card-actions">
        <button
          type="button"
          className="btn-repo-action"
          title="Open repository in browser"
          onClick={() => onOpenExternal(repo.htmlUrl)}
        >
          <ExternalLink size={13} />
          <span>GitHub</span>
        </button>

        <button
          type="button"
          className="btn-repo-action btn-repo-delete"
          title="Delete this repository on GitHub"
          onClick={() => onDelete(repo)}
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
