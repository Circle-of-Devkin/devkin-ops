import fs from 'fs';
import path from 'path';
import githubService from '../githubService';
import {
  type PublishOptions,
  type GetGitFn,
  errorMessage
} from './types';
import { detectSensitiveFiles } from './secretsGuard';
import { applyAccountToRepo } from './statusOps';

/**
 * Full publish pipeline:
 * Accurately handles new repository creation when user changes repository name.
 */
export async function publishRepo(options: PublishOptions, getGit: GetGitFn) {
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
    const git = getGit(folderPath, account);

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
    await applyAccountToRepo(folderPath, account, targetRemoteUrl, getGit);

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
      // If user selectively staged changes, respect index; otherwise stage all
      if (currentStatus.staged.length === 0 || !hasCommits) {
        await git.add('.');
      }
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
