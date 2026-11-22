import fs from 'fs';
import path from 'path';
import {
  type SensitiveFileMatch,
  type SensitiveFileReason,
  type GetGitFn,
  errorMessage
} from './types';

export const SENSITIVE_FILE_RULES: Array<{
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

export async function addToGitignore(folderPath: string, filesOrPatterns: string[], getGit: GetGitFn) {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder does not exist' };
    }

    const gitignorePath = path.join(folderPath, '.gitignore');
    const currentContent = fs.existsSync(gitignorePath)
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
      const git = getGit(folderPath);
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
