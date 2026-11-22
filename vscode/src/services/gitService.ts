import { simpleGit, type SimpleGit } from 'simple-git';
import {
  type GitAccount,
  type PublishOptions,
  type SensitiveFileReason,
  type SensitiveFileMatch,
  type DiffLine,
  type DiffResult
} from './git/types';
import { detectSensitiveFiles, addToGitignore } from './git/secretsGuard';
import { validateBranchName, getBranches, checkoutBranch, createBranch } from './git/branchOps';
import { parseUnifiedDiff, getFileDiff } from './git/diffOps';
import { stageFile, unstageFile, stageAll, unstageAll, discardFileChanges } from './git/stagingOps';
import { syncRemote, pullRepo } from './git/syncOps';
import {
  getFolderGitStatus,
  initRepo,
  applyAccountToRepo,
  setRemoteOrigin,
  stripCredentialsFromRemoteUrl
} from './git/statusOps';
import { publishRepo } from './git/publishOps';

export type {
  GitAccount,
  PublishOptions,
  SensitiveFileReason,
  SensitiveFileMatch,
  DiffLine,
  DiffResult
};

export {
  detectSensitiveFiles,
  validateBranchName,
  parseUnifiedDiff
};

class GitService {
  /**
   * Internal helper to create properly configured simple-git instance
   */
  getGit(folderPath: string, _account?: GitAccount): SimpleGit {
    process.env.GIT_TERMINAL_PROMPT = '0';

    const options: Parameters<typeof simpleGit>[0] = {
      baseDir: folderPath,
      unsafe: {
        allowUnsafeSshCommand: true,
        allowUnsafeAskPass: true
      }
    };

    return simpleGit(options);
  }

  getFolderGitStatus(folderPath: string) {
    return getFolderGitStatus(folderPath, (f, a) => this.getGit(f, a));
  }

  initRepo(folderPath: string) {
    return initRepo(folderPath, (f, a) => this.getGit(f, a));
  }

  applyAccountToRepo(folderPath: string, account: GitAccount, remoteUrlOverride: string | null = null) {
    return applyAccountToRepo(folderPath, account, remoteUrlOverride, (f, a) => this.getGit(f, a));
  }

  stripCredentialsFromRemoteUrl(remoteUrl: string) {
    return stripCredentialsFromRemoteUrl(remoteUrl);
  }

  setRemoteOrigin(folderPath: string, remoteUrl: string) {
    return setRemoteOrigin(folderPath, remoteUrl, (f, a) => this.getGit(f, a));
  }

  addToGitignore(folderPath: string, filesOrPatterns: string[]) {
    return addToGitignore(folderPath, filesOrPatterns, (f, a) => this.getGit(f, a));
  }

  syncRemote(folderPath: string, account?: GitAccount) {
    return syncRemote(folderPath, account, (f, a) => this.getGit(f, a));
  }

  pullRepo(options: { folderPath: string; account?: GitAccount; branchName?: string }) {
    return pullRepo(options, (f, a) => this.getGit(f, a));
  }

  getBranches(folderPath: string) {
    return getBranches(folderPath, (f, a) => this.getGit(f, a));
  }

  checkoutBranch(folderPath: string, branchName: string) {
    return checkoutBranch(folderPath, branchName, (f, a) => this.getGit(f, a));
  }

  createBranch(folderPath: string, branchName: string, checkout: boolean = true) {
    return createBranch(folderPath, branchName, checkout, (f, a) => this.getGit(f, a));
  }

  getFileDiff(folderPath: string, filePath: string, staged: boolean = false) {
    return getFileDiff(folderPath, filePath, staged, (f, a) => this.getGit(f, a));
  }

  stageFile(folderPath: string, filePath: string) {
    return stageFile(folderPath, filePath, (f, a) => this.getGit(f, a));
  }

  unstageFile(folderPath: string, filePath: string) {
    return unstageFile(folderPath, filePath, (f, a) => this.getGit(f, a));
  }

  stageAll(folderPath: string) {
    return stageAll(folderPath, (f, a) => this.getGit(f, a));
  }

  unstageAll(folderPath: string) {
    return unstageAll(folderPath, (f, a) => this.getGit(f, a));
  }

  discardFileChanges(folderPath: string, filePath: string, isUntracked: boolean = false) {
    return discardFileChanges(folderPath, filePath, isUntracked, (f, a) => this.getGit(f, a));
  }

  publishRepo(options: PublishOptions) {
    return publishRepo(options, (f, a) => this.getGit(f, a));
  }
}

export default new GitService();
