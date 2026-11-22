import fs from 'fs';
import { type GetGitFn, errorMessage } from './types';

/**
 * Strict branch name validation to prevent command injection, directory traversal,
 * or malformed Git ref naming.
 */
export function validateBranchName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Branch name cannot be empty.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { valid: false, error: 'Branch name must be between 1 and 100 characters.' };
  }
  if (trimmed.startsWith('-')) {
    return { valid: false, error: 'Branch name cannot start with a hyphen (-).' };
  }
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    return { valid: false, error: 'Branch name cannot start or end with a slash (/).' };
  }
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return { valid: false, error: 'Branch name cannot start or end with a dot (.).' };
  }
  if (trimmed.endsWith('.lock')) {
    return { valid: false, error: 'Branch name cannot end with .lock.' };
  }
  if (trimmed.includes('..') || trimmed.includes('//') || trimmed.includes('@{')) {
    return { valid: false, error: 'Branch name contains forbidden character sequences (.., //, or @{).' };
  }
  const validPattern = /^[a-zA-Z0-9._/-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Branch name contains invalid characters. Use only letters, numbers, hyphens, underscores, dots, or slashes.' };
  }
  return { valid: true };
}

/**
 * Retrieve all local and remote branches for a repository.
 */
export async function getBranches(folderPath: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }

  try {
    const git = getGit(folderPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return { success: false, error: 'Not a git repository' };
    }

    const branchSummary = await git.branch(['-a']);
    const current = branchSummary.current || 'main';

    const localBranches: string[] = [];
    const remoteBranches: string[] = [];

    for (const bName of Object.keys(branchSummary.branches)) {
      if (bName.startsWith('remotes/origin/')) {
        const cleanName = bName.replace(/^remotes\/origin\//, '');
        if (cleanName !== 'HEAD' && !remoteBranches.includes(cleanName)) {
          remoteBranches.push(cleanName);
        }
      } else if (!bName.startsWith('remotes/')) {
        localBranches.push(bName);
      }
    }

    // If localBranches is empty (fresh repo with no commits yet), add current
    if (localBranches.length === 0 && current) {
      localBranches.push(current);
    }

    return {
      success: true,
      current,
      local: localBranches,
      remote: remoteBranches,
      all: branchSummary.all
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to list branches') };
  }
}

/**
 * Safely checkout a local or remote branch.
 * Protects uncommitted changes from being overwritten.
 */
export async function checkoutBranch(folderPath: string, branchName: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }

  const validation = validateBranchName(branchName);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid branch name' };
  }

  const cleanName = branchName.trim();

  try {
    const git = getGit(folderPath);
    const branchSummary = await git.branch(['-a']);

    if (branchSummary.current === cleanName) {
      return { success: true, currentBranch: cleanName, message: `Already on branch "${cleanName}"` };
    }

    const isLocal = Boolean(branchSummary.branches[cleanName]);
    const isRemote = Boolean(branchSummary.branches[`remotes/origin/${cleanName}`]);

    if (!isLocal && isRemote) {
      // Track remote branch cleanly
      await git.checkout(['-b', cleanName, '--track', `origin/${cleanName}`]);
    } else {
      await git.checkout(cleanName);
    }

    const postStatus = await git.status();
    return {
      success: true,
      currentBranch: postStatus.current || cleanName,
      message: `Switched to branch "${postStatus.current || cleanName}"`
    };
  } catch (error: any) {
    const msg = errorMessage(error, 'Failed to checkout branch');
    if (
      msg.includes('local changes to the following files would be overwritten') ||
      msg.includes('Please commit your changes or stash them')
    ) {
      return {
        success: false,
        dirtyTree: true,
        error: 'Cannot switch branch: You have uncommitted changes that would be overwritten. Please commit, stash, or review your changes before switching.'
      };
    }
    return { success: false, error: msg };
  }
}

/**
 * Safely create a new branch with naming security guards.
 */
export async function createBranch(folderPath: string, branchName: string, checkout: boolean = true, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }

  const validation = validateBranchName(branchName);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid branch name' };
  }

  const cleanName = branchName.trim();

  try {
    const git = getGit(folderPath);
    const branchSummary = await git.branch(['-a']);

    if (branchSummary.branches[cleanName]) {
      return { success: false, error: `Branch "${cleanName}" already exists.` };
    }

    if (checkout) {
      await git.checkoutLocalBranch(cleanName);
    } else {
      await git.branch([cleanName]);
    }

    const postStatus = await git.status();
    return {
      success: true,
      currentBranch: postStatus.current || cleanName,
      message: `Created and switched to branch "${cleanName}"`
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to create branch') };
  }
}
