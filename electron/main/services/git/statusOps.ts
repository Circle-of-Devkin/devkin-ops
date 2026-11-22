import fs from 'fs';
import path from 'path';
import {
  type GitAccount,
  type SensitiveFileMatch,
  type GetGitFn,
  errorMessage
} from './types';
import { detectSensitiveFiles } from './secretsGuard';

/**
 * Keep credentials out of the repository's local Git configuration.
 */
export function stripCredentialsFromRemoteUrl(remoteUrl: string): string {
  if (!remoteUrl || !remoteUrl.startsWith('https://')) return remoteUrl;

  try {
    const parsedUrl = new URL(remoteUrl);
    parsedUrl.username = '';
    parsedUrl.password = '';
    return parsedUrl.toString().replace(/\/$/, '');
  } catch (error) {
    return remoteUrl.replace(/^https:\/\/[^@]+@/, 'https://');
  }
}

/**
 * Set or update remote origin URL
 */
export async function setRemoteOrigin(folderPath: string, remoteUrl: string, getGit: GetGitFn) {
  try {
    const git = getGit(folderPath);
    const remotes = await git.getRemotes();
    const originExists = remotes.some((r) => r.name === 'origin');

    if (originExists) {
      await git.remote(['set-url', 'origin', remoteUrl]);
    } else {
      await git.addRemote('origin', remoteUrl);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to set Git remote') };
  }
}

/**
 * Configure Git identity and remote auth for the folder
 */
export async function applyAccountToRepo(
  folderPath: string,
  account: GitAccount,
  remoteUrlOverride: string | null = null,
  getGit: GetGitFn
) {
  try {
    const git = getGit(folderPath, account);

    // Set user.name & user.email for local repo
    const gitUserName = account.name || account.username;
    if (gitUserName) {
      await git.addConfig('user.name', gitUserName, false, 'local');
    }
    if (account.email) {
      await git.addConfig('user.email', account.email, false, 'local');
    }

    // Handle Authentication (PAT vs SSH)
    if (remoteUrlOverride) {
      await setRemoteOrigin(folderPath, stripCredentialsFromRemoteUrl(remoteUrlOverride), getGit);
    }

    if (account.authType === 'ssh' && account.sshKeyPath) {
      const sshCmd = `ssh -i "${account.sshKeyPath.replace(/\\/g, '/')}" -o StrictHostKeyChecking=accept-new`;
      await git.addConfig('core.sshCommand', sshCmd, false, 'local');
    } else if ((account.authType === 'pat' || account.authType === 'oauth') && account.patToken) {
      try {
        await git.raw(['config', '--local', '--unset', 'core.sshCommand']);
      } catch (e) {}

      let currentRemote = remoteUrlOverride;
      if (!currentRemote) {
        try {
          currentRemote = await git.getConfig('remote.origin.url', 'local').then((res: { value?: string | null }) => res.value || '');
        } catch (e) {}
      }

      if (currentRemote) {
        await setRemoteOrigin(folderPath, stripCredentialsFromRemoteUrl(currentRemote), getGit);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to configure repo account:', error);
    return { success: false, error: errorMessage(error, 'Failed to configure repository account') };
  }
}

/**
 * Initialize a new git repository in folder
 */
export async function initRepo(folderPath: string, getGit: GetGitFn) {
  try {
    const git = getGit(folderPath);
    await git.init();
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to initialize Git repository') };
  }
}

/**
 * Get Git status details for a folder
 */
export async function getFolderGitStatus(folderPath: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }

  const gitDir = path.join(folderPath, '.git');
  const isGitRepo = fs.existsSync(gitDir);

  if (!isGitRepo) {
    let sensitiveFiles: SensitiveFileMatch[] = [];
    try {
      const topLevel = fs.readdirSync(folderPath);
      sensitiveFiles = detectSensitiveFiles(topLevel);
    } catch (e) {}

    return {
      success: true,
      isGitRepo: false,
      folderPath,
      folderName: path.basename(folderPath),
      hasSensitiveFiles: sensitiveFiles.length > 0,
      sensitiveFiles
    };
  }

  try {
    const git = getGit(folderPath);
    const status = await git.status();

    let userName = '';
    let userEmail = '';
    let remoteUrl = '';

    try {
      userName = await git.getConfig('user.name', 'local').then((res: { value?: string | null }) => res.value || '');
    } catch (e) {}

    try {
      userEmail = await git.getConfig('user.email', 'local').then((res: { value?: string | null }) => res.value || '');
    } catch (e) {}

    try {
      remoteUrl = await git.getConfig('remote.origin.url', 'local').then((res: { value?: string | null }) => res.value || '');
    } catch (e) {}

    const changes = status.files.map((file) => {
      const indexStatus = file.index || '';
      const workingStatus = file.working_dir || '';
      const statusCode = `${indexStatus}${workingStatus}`;
      const type = statusCode.includes('D') ? 'deleted' :
        statusCode.includes('?') || statusCode.includes('A') ? 'added' : 'modified';
      const isStaged = Boolean(file.index && file.index !== ' ' && file.index !== '?');
      const isUntracked = file.index === '?' || file.working_dir === '?';

      return {
        path: file.path,
        type,
        status: statusCode || 'M',
        staged: isStaged,
        isUntracked
      };
    });

    const sensitiveFiles = detectSensitiveFiles(status.files.map((f) => f.path));

    return {
      success: true,
      isGitRepo: true,
      folderPath,
      folderName: path.basename(folderPath),
      currentBranch: status.current || 'main',
      stagedCount: status.staged.length,
      modifiedCount: status.modified.length,
      notAddedCount: status.not_added.length,
      totalUncommitted: status.files.length,
      changes,
      changeCounts: {
        added: changes.filter((change) => change.type === 'added').length,
        modified: changes.filter((change) => change.type === 'modified').length,
        deleted: changes.filter((change) => change.type === 'deleted').length
      },
      hasSensitiveFiles: sensitiveFiles.length > 0,
      sensitiveFiles,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      tracking: status.tracking || null,
      userName,
      userEmail,
      remoteUrl,
      isClean: status.isClean()
    };
  } catch (error) {
    console.error('Error fetching git status:', error);
    return {
      success: false,
      error: errorMessage(error, 'Failed to inspect Git status')
    };
  }
}
