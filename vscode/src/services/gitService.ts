import { simpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';
import githubService from './githubService';

type GitAccount = {
  name?: string;
  username?: string;
  email?: string;
  authType?: string;
  patToken?: string;
  sshKeyPath?: string;
};

type PublishOptions = {
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

const SENSITIVE_FILE_RULES: Array<{
  regex: RegExp;
  reason: SensitiveFileReason;
  severity: 'critical' | 'warning';
  pattern: string;
}> = [
  // Environment files: .env, .env.local, .env.development, etc.
  { regex: /(^|\/)\.env(\.[a-zA-Z0-9._-]+)*$/i, reason: 'Environment & Secret Config', severity: 'critical', pattern: '.env*' },
  // Private keys & Certificates
  { regex: /(^|\/)(id_rsa|id_dsa|id_ed25519|id_ecdsa)(\.pub)?$/i, reason: 'Private Key or Certificate', severity: 'critical', pattern: 'id_*' },
  { regex: /\.(pem|key|pfx|p12|pkcs12|keystore)$/i, reason: 'Private Key or Certificate', severity: 'critical', pattern: '*.pem' },
  // Cloud & API Credentials
  { regex: /(credentials|client_secret|service[-_]account|serviceAccountKey|firebase[-_]adminsdk).*\.json$/i, reason: 'Service Account or API Credentials', severity: 'critical', pattern: '*credentials*.json' },
  { regex: /(^|\/)\.aws\/(credentials|config)/i, reason: 'Service Account or API Credentials', severity: 'critical', pattern: '.aws/' },
  { regex: /(^|\/)token\.json$/i, reason: 'Service Account or API Credentials', severity: 'critical', pattern: 'token.json' },
  // Heavy dependency directories accidentally unignored
  { regex: /(^|\/)node_modules\//i, reason: 'Build Artifacts or Dependencies', severity: 'warning', pattern: 'node_modules/' },
  { regex: /(^|\/)(venv|\.venv)\//i, reason: 'Build Artifacts or Dependencies', severity: 'warning', pattern: '.venv/' },
];

export function detectSensitiveFiles(filePaths: string[]): SensitiveFileMatch[] {
  const matches: SensitiveFileMatch[] = [];
  const seen = new Set<string>();

  for (const filePath of filePaths) {
    const normalized = filePath.replace(/\\/g, '/');
    for (const rule of SENSITIVE_FILE_RULES) {
      if (rule.regex.test(normalized)) {
        if (!seen.has(normalized)) {
          seen.add(normalized);
          matches.push({
            path: normalized,
            reason: rule.reason,
            severity: rule.severity,
            recommendedPattern: rule.pattern
          });
        }
        break;
      }
    }
  }

  return matches;
}

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

class GitService {
  /**
   * Internal helper to create properly configured simple-git instance
   */
  getGit(folderPath: string, account?: GitAccount) {
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

  /**
   * Get Git status details for a folder
   */
  async getFolderGitStatus(folderPath: string) {
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
      const git = this.getGit(folderPath);
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

        return {
          path: file.path,
          type,
          status: statusCode || 'M'
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

  /**
   * Initialize a new git repository in folder
   */
  async initRepo(folderPath: string) {
    try {
      const git = this.getGit(folderPath);
      await git.init();
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error, 'Failed to initialize Git repository') };
    }
  }

  /**
   * Configure Git identity and remote auth for the folder
   */
  async applyAccountToRepo(folderPath: string, account: GitAccount, remoteUrlOverride: string | null = null) {
    try {
      const git = this.getGit(folderPath, account);

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
        await this.setRemoteOrigin(folderPath, this.stripCredentialsFromRemoteUrl(remoteUrlOverride));
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
          await this.setRemoteOrigin(folderPath, this.stripCredentialsFromRemoteUrl(currentRemote));
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to configure repo account:', error);
      return { success: false, error: errorMessage(error, 'Failed to configure repository account') };
    }
  }

  /**
   * Keep credentials out of the repository's local Git configuration.
   */
  stripCredentialsFromRemoteUrl(remoteUrl: string) {
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
  async setRemoteOrigin(folderPath: string, remoteUrl: string) {
    try {
      const git = this.getGit(folderPath);
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
   * Add sensitive patterns or specific files to .gitignore and untrack from Git index
   */
  async addToGitignore(folderPath: string, filesOrPatterns: string[]) {
    try {
      if (!folderPath || !fs.existsSync(folderPath)) {
        return { success: false, error: 'Folder does not exist' };
      }

      const gitignorePath = path.join(folderPath, '.gitignore');
      let currentContent = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf8')
        : '';

      const lines = currentContent.split('\n').map((l) => l.trim());
      const newPatterns: string[] = [];

      for (const item of filesOrPatterns) {
        const pattern = item.startsWith('.env') ? '.env*' : item;
        if (!lines.includes(pattern) && !newPatterns.includes(pattern)) {
          newPatterns.push(pattern);
        }
      }

      if (newPatterns.length > 0) {
        let updated = currentContent;
        if (updated && !updated.endsWith('\n')) {
          updated += '\n';
        }
        updated += `\n# DevKin Ops Secret Shield\n${newPatterns.join('\n')}\n`;
        fs.writeFileSync(gitignorePath, updated, 'utf8');
      }

      // Untrack from Git index if git repo exists
      const gitDir = path.join(folderPath, '.git');
      if (fs.existsSync(gitDir)) {
        const git = this.getGit(folderPath);
        for (const item of filesOrPatterns) {
          try {
            await git.raw(['rm', '--cached', '-r', '--ignore-unmatch', item]);
          } catch (e) {}
        }
      }

      return {
        success: true,
        addedPatterns: newPatterns,
        message: `Successfully protected ${filesOrPatterns.length} file(s) in .gitignore`
      };
    } catch (error) {
      console.error('addToGitignore error:', error);
      return {
        success: false,
        error: errorMessage(error, 'Failed to update .gitignore')
      };
    }
  }

  /**
   * Full publish pipeline:
   * Accurately handles new repository creation when user changes repository name.
   */
  async publishRepo(options: PublishOptions) {
    const {
      folderPath,
      account,
      commitMessage = 'Initial commit',
      branchName = 'main',
      createNewRemote = false,
      remoteRepoName = '',
      isPrivate = false,
      description = '',
      bypassSecretShield = false
    } = options;

    try {
      const git = this.getGit(folderPath, account);

      // 0. Secret Shield Guard: prevent accidental leaks of .env, keys, or credentials
      if (!bypassSecretShield) {
        const preCheckStatus = await git.status();
        const detectedSecrets = detectSensitiveFiles(preCheckStatus.files.map((f) => f.path));
        if (detectedSecrets.length > 0) {
          const secretNames = detectedSecrets.map((s) => s.path).join(', ');
          return {
            success: false,
            blockedBySecretShield: true,
            sensitiveFiles: detectedSecrets,
            error: `🛡️ Secret Shield Blocked: Sensitive file(s) (${secretNames}) detected. Add them to .gitignore before publishing to keep secrets safe.`
          };
        }
      }

      // 1. Ensure repository is initialized
      const isGit = fs.existsSync(path.join(folderPath, '.git'));
      if (!isGit) {
        await git.init();
      }

      // 2. Handle GitHub Remote Repository creation or detection
      let targetRemoteUrl = '';
      let repoAlreadyExisted = false;

      if (createNewRemote && remoteRepoName) {
        if (!account.patToken) {
          throw new Error('Creating a new remote repository requires an account configured with a GitHub OAuth or PAT token.');
        }

        const createRes = await githubService.createRepository(
          account.patToken,
          remoteRepoName,
          description,
          isPrivate
        );

        if (!createRes.success) {
          if (createRes.error && createRes.error.includes('name already exists on this account')) {
            repoAlreadyExisted = true;
            targetRemoteUrl = `https://github.com/${account.username}/${remoteRepoName}.git`;
          } else {
            throw new Error(`GitHub Remote Creation Error: ${createRes.error}`);
          }
        } else if (createRes.repo) {
          targetRemoteUrl = account.authType === 'ssh' ? createRes.repo.cloneUrlSsh : createRes.repo.cloneUrlHttps;
        } else {
          throw new Error('GitHub returned no repository details.');
        }
      }

      // 3. Apply account identity & remote settings
      await this.applyAccountToRepo(folderPath, account, targetRemoteUrl);

      // 4. Ensure directory structure and at least one commit exists
      let hasCommits = false;
      try {
        await git.raw(['rev-parse', '--verify', 'HEAD']);
        hasCommits = true;
      } catch (e) {
        hasCommits = false;
      }

      // Preserve empty directories by adding .gitkeep so Git tracks them
      try {
        const keepEmptyDirs = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
              const sub = path.join(dir, entry.name);
              const subEntries = fs.readdirSync(sub);
              if (subEntries.length === 0) {
                fs.writeFileSync(path.join(sub, '.gitkeep'), '');
              } else {
                keepEmptyDirs(sub);
              }
            }
          }
        };
        keepEmptyDirs(folderPath);
      } catch (e) {}

      let committedNewFiles = false;
      const status = await git.status();

      // If repo has no commits and no files to commit, create an initial README.md
      if (!hasCommits && status.files.length === 0) {
        const repoNameFinal = remoteRepoName || path.basename(folderPath);
        const readmePath = path.join(folderPath, 'README.md');
        if (!fs.existsSync(readmePath)) {
          const defaultReadme = `# ${repoNameFinal}\n\nProject initialized with DevKin Ops.\n`;
          fs.writeFileSync(readmePath, defaultReadme, 'utf8');
        }
      }

      // 5. Stage & Commit files
      const currentStatus = await git.status();
      if (currentStatus.files.length > 0 || !currentStatus.isClean() || !hasCommits) {
        await git.add('.');
        try {
          await git.commit(commitMessage || 'Initial commit');
          committedNewFiles = true;
          hasCommits = true;
        } catch (commitErr) {
          if (!hasCommits) {
            throw commitErr;
          }
        }
      }

      // 6. Checkout / rename branch to requested branchName (e.g. main)
      try {
        await git.branch(['-M', branchName]);
      } catch (e) {}

      // 6. Push to origin
      let pushUrl = '';
      try {
        pushUrl = await git.getConfig('remote.origin.url', 'local').then((res: { value?: string | null }) => res.value || '');
      } catch (e) {}

      if (!pushUrl && !targetRemoteUrl) {
        throw new Error('No remote origin URL configured. Please check "Create new repository on GitHub" or specify a remote origin.');
      }

      let isUpToDate = false;
      const effectivePushUrl = pushUrl || targetRemoteUrl;
      const usesTokenAuth = (account.authType === 'pat' || account.authType === 'oauth')
        && Boolean(account.patToken)
        && effectivePushUrl.startsWith('https://');

      // Ensure Git never hangs on stdin waiting for interactive terminal credentials
      process.env.GIT_TERMINAL_PROMPT = '0';

      try {
        if (usesTokenAuth && account.patToken) {
          const parsed = new URL(effectivePushUrl);
          parsed.username = encodeURIComponent(account.username || 'x-access-token');
          parsed.password = encodeURIComponent(account.patToken.trim());
          const pushResult = await git.push(parsed.toString(), branchName);
          if (pushResult && Array.isArray(pushResult.pushed) && pushResult.pushed.length > 0 && pushResult.pushed.every((p) => p.alreadyUpdated)) {
            isUpToDate = true;
          }

          // Update tracking refs so local branch cleanly tracks origin/branch
          try {
            await git.raw(['update-ref', `refs/remotes/origin/${branchName}`, `refs/heads/${branchName}`]);
            await git.addConfig(`branch.${branchName}.remote`, 'origin', false, 'local');
            await git.addConfig(`branch.${branchName}.merge`, `refs/heads/${branchName}`, false, 'local');
          } catch (trackErr) {
            console.warn('Failed to set upstream branch tracking:', trackErr);
          }
        } else {
          const pushResult = await git.push(['-u', 'origin', branchName]);
          if (pushResult && Array.isArray(pushResult.pushed) && pushResult.pushed.length > 0 && pushResult.pushed.every((p) => p.alreadyUpdated)) {
            isUpToDate = true;
          }
        }
      } catch (pushErr) {
        const pushError = errorMessage(pushErr, '');
        if (pushError.includes('Everything up-to-date') || pushError.includes('up to date')) {
          isUpToDate = true;
        } else {
          throw pushErr;
        }
      }

      // 7. Explicit User Status Messages
      const repoNameFinal = remoteRepoName || path.basename(folderPath);
      const publicRepoUrl = `https://github.com/${account.username}/${repoNameFinal}`;

      let userMsg = '';
      if (createNewRemote && !repoAlreadyExisted) {
        userMsg = `🚀 Successfully created new GitHub repository '${repoNameFinal}' and published code!`;
      } else if (repoAlreadyExisted) {
        if (!committedNewFiles && (isUpToDate || status.isClean())) {
          userMsg = `Repository '${repoNameFinal}' already exists on your GitHub account (@${account.username}) and all files are already up-to-date!`;
        } else {
          userMsg = `Repository '${repoNameFinal}' already exists on your GitHub account (@${account.username}). Successfully pushed new changes!`;
        }
      } else if (!committedNewFiles && (isUpToDate || status.isClean())) {
        userMsg = `All files are already published and up-to-date on GitHub (@${account.username}). No new changes to push!`;
      } else {
        userMsg = `Successfully pushed code to GitHub (@${account.username}/${repoNameFinal})!`;
      }

      return {
        success: true,
        message: userMsg,
        repoUrl: publicRepoUrl,
        branchName
      };
    } catch (error) {
      console.error('Publish repository error:', error);
      let errStr = errorMessage(error, 'Failed to publish repository');
      if (account.patToken) {
        const rawToken = account.patToken.trim();
        errStr = errStr.split(rawToken).join('***');
        errStr = errStr.split(encodeURIComponent(rawToken)).join('***');
      }
      return {
        success: false,
        error: errStr
      };
    }
  }
}

export default new GitService();
