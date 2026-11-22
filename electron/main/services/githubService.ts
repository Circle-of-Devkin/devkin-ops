import { Octokit } from '@octokit/rest';

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

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

class GitHubService {
  /**
   * Validate PAT token and return GitHub user profile
   */
  async validateToken(token: string) {
    if (!token || !token.trim()) {
      return { success: false, error: 'Token cannot be empty.' };
    }

    const cleanToken = token.trim();

    try {
      // Direct fetch call for ultra-reliable response handling
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'User-Agent': 'DevKin-Ops-App',
          'Accept': 'application/vnd.github+json'
        }
      });

      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid GitHub Token (Bad credentials). Check if you copied the full token starting with ghp_ or github_pat_'
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'Token access forbidden or rate limit exceeded.'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `GitHub API error (Status ${response.status}): ${response.statusText}`
        };
      }

      const user = await response.json();

      // Fetch primary email if user public email is null
      let email = user.email;
      if (!email) {
        try {
          const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `Bearer ${cleanToken}`,
              'User-Agent': 'DevKin-Ops-App',
              'Accept': 'application/vnd.github+json'
            }
          });
          if (emailResponse.ok) {
            const emails = await emailResponse.json();
            const primaryEmail = emails.find((email: { primary?: boolean }) => email.primary) || emails[0];
            if (primaryEmail) {
              email = primaryEmail.email;
            }
          }
        } catch (e) {
          // ignore email fetch failure
        }
      }

      return {
        success: true,
        user: {
          username: user.login,
          name: user.name || user.login,
          email: email || `${user.login}@users.noreply.github.com`,
          avatarUrl: user.avatar_url,
          htmlUrl: user.html_url
        }
      };
    } catch (error) {
      console.error('GitHub token validation failed:', error);
      return {
        success: false,
        error: `Connection error: ${errorMessage(error, 'Unable to connect to GitHub. Check internet connection.')}`
      };
    }
  }

  /**
   * Create a new remote repository under the authenticated user
   */
  async createRepository(token: string, repoName: string, description = '', isPrivate = false) {
    try {
      const octokit = new Octokit({ auth: token.trim() });
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: description,
        private: isPrivate,
        auto_init: false
      });

      return {
        success: true,
        repo: {
          name: repo.name,
          cloneUrlHttps: repo.clone_url,
          cloneUrlSsh: repo.ssh_url,
          htmlUrl: repo.html_url
        }
      };
    } catch (error) {
      console.error('Failed to create repository:', errorMessage(error, 'Unknown error'));
      return {
        success: false,
        error: errorMessage(error, 'Failed to create repository on GitHub')
      };
    }
  }

  /**
   * List all repositories for the authenticated user
   */
  async listRepositories(token: string, perPage = 100, page = 1) {
    if (!token || !token.trim()) {
      return { success: false, error: 'Token is required' };
    }
    const cleanToken = token.trim();
    try {
      const response = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'User-Agent': 'DevKin-Ops-App',
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Unauthorized: GitHub token has expired or is invalid.' };
        }
        return { success: false, error: `GitHub API error (${response.status}): ${response.statusText}` };
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return { success: false, error: 'Unexpected response format from GitHub' };
      }

      const repos: RemoteRepository[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner?.login || '',
        isPrivate: Boolean(r.private),
        htmlUrl: r.html_url,
        cloneUrlHttps: r.clone_url,
        cloneUrlSsh: r.ssh_url,
        description: r.description || '',
        isFork: Boolean(r.fork),
        language: r.language || null,
        starsCount: r.stargazers_count || 0,
        forksCount: r.forks_count || 0,
        updatedAt: r.updated_at,
        defaultBranch: r.default_branch || 'main'
      }));

      return { success: true, repos };
    } catch (error) {
      console.error('Failed to list repositories:', error);
      return { success: false, error: errorMessage(error, 'Failed to fetch repositories from GitHub') };
    }
  }

  /**
   * Delete a remote repository permanently from GitHub
   */
  async deleteRepository(token: string, owner: string, repo: string) {
    if (!token || !token.trim()) {
      return { success: false, error: 'Token is required' };
    }
    if (!owner || !repo) {
      return { success: false, error: 'Owner and repository name are required' };
    }
    const cleanToken = token.trim();
    try {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'User-Agent': 'DevKin-Ops-App',
          'Accept': 'application/vnd.github+json'
        }
      });

      if (response.status === 204) {
        return { success: true, message: `Repository ${owner}/${repo} was deleted permanently from GitHub.` };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'Permission denied: Your GitHub token is missing the "delete_repo" scope. Please edit your token on GitHub and enable "delete_repo" to allow deleting repositories.'
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: `Repository ${owner}/${repo} was not found on GitHub (it may have already been deleted).`
        };
      }

      return {
        success: false,
        error: `GitHub API error (${response.status}): ${response.statusText}`
      };
    } catch (error) {
      console.error('Failed to delete repository:', error);
      return { success: false, error: errorMessage(error, 'Failed to delete repository from GitHub') };
    }
  }

  /**
   * Check whether a repository exists on GitHub (probe)
   */
  async checkRepoExists(token: string, owner: string, repo: string) {
    if (!owner || !repo) {
      return { success: false, error: 'Owner and repo required' };
    }
    const cleanToken = token ? token.trim() : '';
    const headers: Record<string, string> = {
      'User-Agent': 'DevKin-Ops-App',
      'Accept': 'application/vnd.github+json'
    };
    if (cleanToken) {
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        headers
      });

      if (response.status === 200) {
        const data = await response.json();
        return { success: true, exists: true, repo: data };
      }
      if (response.status === 404) {
        return { success: true, exists: false, status: 404 };
      }
      if (response.status === 403) {
        return { success: false, error: 'Rate limit or forbidden', status: 403 };
      }
      return { success: false, error: `GitHub API error (${response.status})`, status: response.status };
    } catch (error) {
      return { success: false, error: errorMessage(error, 'Failed to probe repository') };
    }
  }

  /**
   * Start GitHub Device Flow for 1-Click OAuth Login
   */
  async startDeviceFlow() {
    try {
      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'DevKin-Ops-App'
        },
        body: JSON.stringify({
          client_id: '178c6fc778ccc68e1d6a',
          scope: 'repo user'
        })
      });

      const data = await response.json();
      if (data.device_code) {
        return {
          success: true,
          deviceCode: data.device_code,
          userCode: data.user_code,
          verificationUri: data.verification_uri || 'https://github.com/login/device',
          expiresIn: data.expires_in,
          interval: data.interval || 5
        };
      }

      return {
        success: false,
        error: data.error_description || data.error || 'Failed to start GitHub device flow'
      };
    } catch (error) {
      console.error('startDeviceFlow error:', error);
      return { success: false, error: errorMessage(error, 'Network error') };
    }
  }

  /**
   * Poll GitHub OAuth access token endpoint
   */
  async pollDeviceToken(deviceCode: string) {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'DevKin-Ops-App'
        },
        body: JSON.stringify({
          client_id: '178c6fc778ccc68e1d6a',
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const data = await response.json();
      if (data.access_token) {
        return { success: true, accessToken: data.access_token };
      }

      if (data.error === 'authorization_pending') {
        return { success: false, pending: true };
      }

      if (data.error === 'slow_down') {
        return { success: false, pending: true, slowDown: true, nextInterval: data.interval || 10 };
      }

      return {
        success: false,
        error: data.error_description || data.error || 'Authorization failed'
      };
    } catch (error) {
      return { success: false, error: errorMessage(error, 'Network error polling token') };
    }
  }
}

export default new GitHubService();
