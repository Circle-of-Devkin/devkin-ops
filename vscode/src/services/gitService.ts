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
};

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

class GitService {
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
      return {
        success: true,
        isGitRepo: false,
        folderPath,
        folderName: path.basename(folderPath)
      };
    }

    try {
      const git = simpleGit(folderPath);
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
      const git = simpleGit(folderPath);
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
      const git = simpleGit(folderPath);

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
      const git = simpleGit(folderPath);
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
      description = ''
    } = options;

    try {
      const git = simpleGit(folderPath);

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

      // 4. Checkout / rename branch
      try {
        await git.branch(['-M', branchName]);
      } catch (e) {}

      // 5. Stage & Commit files
      let committedNewFiles = false;
      const status = await git.status();
      if (status.files.length > 0 || !status.isClean()) {
        await git.add('.');
        await git.commit(commitMessage);
        committedNewFiles = true;
      }

      // 6. Push to origin
      let pushUrl = '';
      try {
        pushUrl = await git.getConfig('remote.origin.url', 'local').then((res: { value?: string | null }) => res.value || '');
      } catch (e) {}

      if (!pushUrl && !targetRemoteUrl) {
        throw new Error('No remote origin URL configured. Please check "Create new repository on GitHub" or specify a remote origin.');
      }

      let isUpToDate = false;
      try {
        const usesTokenAuth = (account.authType === 'pat' || account.authType === 'oauth')
          && Boolean(account.patToken)
          && pushUrl.startsWith('https://');
        if (usesTokenAuth) {
          const gitWithAuth = git.env({
            ...process.env,
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'http.extraheader',
            GIT_CONFIG_VALUE_0: `Authorization: Bearer ${account.patToken}`
          });
          await gitWithAuth.push(['-u', 'origin', branchName]);
        } else {
          await git.push(['-u', 'origin', branchName]);
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
      return {
        success: false,
        error: errorMessage(error, 'Failed to publish repository')
      };
    }
  }
}

export default new GitService();
