import type { SimpleGit } from 'simple-git';

export type GitAccount = {
  name?: string;
  username?: string;
  email?: string;
  authType?: string;
  patToken?: string;
  sshKeyPath?: string;
};

export type PublishOptions = {
  folderPath: string;
  account: GitAccount;
  commitMessage?: string;
  branchName?: string;
  createNewRemote?: boolean;
  remoteRepoName?: string;
  isPrivate?: boolean;
  description?: string;
  bypassSecretShield?: boolean;
};

export type SensitiveFileReason =
  | 'Environment & Secret Config'
  | 'Private Key or Certificate'
  | 'Service Account or API Credentials'
  | 'Build Artifacts or Dependencies';

export interface SensitiveFileMatch {
  path: string;
  reason: SensitiveFileReason;
  severity: 'critical' | 'warning';
  recommendedPattern: string;
}

export interface DiffLine {
  type: 'add' | 'del' | 'normal' | 'header';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  success: boolean;
  filePath: string;
  isBinary?: boolean;
  isTooLarge?: boolean;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  raw?: string;
  message?: string;
  error?: string;
}

export type GetGitFn = (folderPath: string, account?: GitAccount) => SimpleGit;

export const errorMessage = (error: unknown, fallback: string): string => (
  error instanceof Error ? error.message : fallback
);
