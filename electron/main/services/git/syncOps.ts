import fs from 'fs';
import { type GitAccount, type GetGitFn, errorMessage } from './types';

/**
 * Safe remote synchronization (fetch):
 * Updates remote tracking refs and computes ahead/behind counts with in-memory auth.
 */
export async function syncRemote(folderPath: string, account: GitAccount | undefined, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }

  try {
    const git = getGit(folderPath, account);
    const remotes = await git.getRemotes();
    const hasOrigin = remotes.some((r) => r.name === 'origin');

    if (!hasOrigin) {
      return { success: true, hasRemote: false, ahead: 0, behind: 0, message: 'No remote configured' };
    }

    let remoteUrl = '';
    try {
      remoteUrl = await git.getConfig('remote.origin.url', 'local').then((res: { value?: string | null }) => res.value || '');
    } catch (e) {}

    const branchInfo = await git.branch();
    const currentBranch = branchInfo.current || 'main';

    process.env.GIT_TERMINAL_PROMPT = '0';

    const usesTokenAuth = account
      && (account.authType === 'pat' || account.authType === 'oauth')
      && Boolean(account.patToken)
      && remoteUrl.startsWith('https://');

    if (usesTokenAuth && account?.patToken) {
      const parsed = new URL(remoteUrl);
      parsed.username = encodeURIComponent(account.username || 'x-access-token');
      parsed.password = encodeURIComponent(account.patToken.trim());
      await git.raw(['fetch', parsed.toString(), `refs/heads/${currentBranch}:refs/remotes/origin/${currentBranch}`]);
    } else {
      await git.fetch(['origin', currentBranch]);
    }

    const status = await git.status();
    return {
      success: true,
      hasRemote: true,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      currentBranch,
      tracking: status.tracking || null
    };
  } catch (error) {
    console.warn('syncRemote error:', error);
    let errStr = errorMessage(error, 'Failed to sync with remote');
    if (account?.patToken) {
      const rawToken = account.patToken.trim();
      errStr = errStr.split(rawToken).join('***');
      errStr = errStr.split(encodeURIComponent(rawToken)).join('***');
    }
    return { success: false, error: errStr };
  }
}

/**
 * Safe 1-Click Pull Engine:
 * Protects local uncommitted work and merges incoming GitHub commits cleanly.
 */
export async function pullRepo(
  options: { folderPath: string; account?: GitAccount; branchName?: string },
  getGit: GetGitFn
) {
  const { folderPath, account, branchName } = options;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }

  try {
    const git = getGit(folderPath, account);

    // 1. Guard against dirty working tree data loss
    const status = await git.status();
    if (!status.isClean()) {
      return {
        success: false,
        dirtyTree: true,
        error: `Cannot pull with uncommitted local changes (${status.files.length} modified/untracked files). Please commit or stash your work first to prevent data loss.`
      };
    }

    // 2. Identify target branch
    const currentBranch = branchName || status.current || 'main';

    // 3. Identify remote URL
    let remoteUrl = '';
    try {
      remoteUrl = await git.getConfig('remote.origin.url', 'local').then((res: { value?: string | null }) => res.value || '');
    } catch (e) {}

    if (!remoteUrl) {
      return { success: false, error: 'No remote origin configured to pull from.' };
    }

    process.env.GIT_TERMINAL_PROMPT = '0';

    const usesTokenAuth = account
      && (account.authType === 'pat' || account.authType === 'oauth')
      && Boolean(account.patToken)
      && remoteUrl.startsWith('https://');

    let pullResult;
    if (usesTokenAuth && account?.patToken) {
      const parsed = new URL(remoteUrl);
      parsed.username = encodeURIComponent(account.username || 'x-access-token');
      parsed.password = encodeURIComponent(account.patToken.trim());
      pullResult = await git.pull(parsed.toString(), currentBranch);
    } else {
      pullResult = await git.pull('origin', currentBranch);
    }

    const postStatus = await git.status();

    return {
      success: true,
      summary: pullResult.summary,
      files: pullResult.files,
      ahead: postStatus.ahead || 0,
      behind: postStatus.behind || 0,
      message: pullResult.files.length === 0
        ? 'Already up-to-date with remote!'
        : `Successfully pulled remote changes! (${pullResult.files.length} file(s) updated, +${pullResult.summary.insertions} -${pullResult.summary.deletions})`
    };
  } catch (error) {
    console.error('pullRepo error:', error);
    let errStr = errorMessage(error, 'Failed to pull changes from remote');
    if (account?.patToken) {
      const rawToken = account.patToken.trim();
      errStr = errStr.split(rawToken).join('***');
      errStr = errStr.split(encodeURIComponent(rawToken)).join('***');
    }
    return { success: false, error: errStr };
  }
}
