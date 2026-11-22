import fs from 'fs';
import path from 'path';
import { type GetGitFn, errorMessage } from './types';

/**
 * Stage a specific file in the repository index.
 */
export async function stageFile(folderPath: string, filePath: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }
  const normalizedFolderPath = path.resolve(folderPath);
  const resolvedFilePath = path.resolve(normalizedFolderPath, filePath);
  if (!resolvedFilePath.startsWith(normalizedFolderPath)) {
    return { success: false, error: 'Path traversal blocked: Cannot access files outside the repository' };
  }

  try {
    const git = getGit(folderPath);
    await git.add(filePath);
    return { success: true, filePath, message: `Staged ${filePath}` };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to stage file') };
  }
}

/**
 * Unstage a specific file from the repository index.
 */
export async function unstageFile(folderPath: string, filePath: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }
  const normalizedFolderPath = path.resolve(folderPath);
  const resolvedFilePath = path.resolve(normalizedFolderPath, filePath);
  if (!resolvedFilePath.startsWith(normalizedFolderPath)) {
    return { success: false, error: 'Path traversal blocked: Cannot access files outside the repository' };
  }

  try {
    const git = getGit(folderPath);
    const branchSummary = await git.branch();
    if (!branchSummary.current) {
      await git.rm(['--cached', '--', filePath]);
    } else {
      await git.reset(['HEAD', '--', filePath]);
    }
    return { success: true, filePath, message: `Unstaged ${filePath}` };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to unstage file') };
  }
}

/**
 * Stage all changes in working tree.
 */
export async function stageAll(folderPath: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }
  try {
    const git = getGit(folderPath);
    await git.add('.');
    return { success: true, message: 'All files staged' };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to stage all files') };
  }
}

/**
 * Unstage all files in index.
 */
export async function unstageAll(folderPath: string, getGit: GetGitFn) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }
  try {
    const git = getGit(folderPath);
    await git.reset(['HEAD']);
    return { success: true, message: 'All files unstaged' };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to unstage all files') };
  }
}

/**
 * Safely discard changes in a file (revert to last commit or delete untracked file).
 * Strict path traversal jail ensures only files within repository can be modified.
 */
export async function discardFileChanges(
  folderPath: string,
  filePath: string,
  isUntracked: boolean = false,
  getGit: GetGitFn
) {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, error: 'Folder does not exist' };
  }
  const normalizedFolderPath = path.resolve(folderPath);
  const resolvedFilePath = path.resolve(normalizedFolderPath, filePath);
  if (!resolvedFilePath.startsWith(normalizedFolderPath)) {
    return { success: false, error: 'Path traversal blocked: Cannot access files outside the repository' };
  }

  try {
    const git = getGit(folderPath);

    if (isUntracked) {
      if (fs.existsSync(resolvedFilePath)) {
        const stat = fs.statSync(resolvedFilePath);
        if (stat.isDirectory()) {
          fs.rmSync(resolvedFilePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(resolvedFilePath);
        }
      }
    } else {
      // Reset from index first if staged, then checkout from HEAD
      try {
        await git.reset(['HEAD', '--', filePath]);
      } catch (e) {}
      await git.checkout(['--', filePath]);
    }

    return { success: true, filePath, message: `Discarded changes in ${filePath}` };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to discard changes') };
  }
}
