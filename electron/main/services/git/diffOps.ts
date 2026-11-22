import fs from 'fs';
import path from 'path';
import {
  type DiffLine,
  type DiffResult,
  type GetGitFn,
  errorMessage
} from './types';

export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.bmp', '.tiff',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.mp3', '.mp4', '.wav', '.mov', '.avi', '.mkv',
  '.woff', '.woff2', '.ttf', '.eot',
  '.lockb', '.pyc', '.class', '.jar', '.vsix'
]);

export function parseUnifiedDiff(diffText: string): { additions: number; deletions: number; lines: DiffLine[] } {
  const rawLines = diffText.split(/\r?\n/);
  const resultLines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let oldLine = 0;
  let newLine = 0;

  for (const line of rawLines) {
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff --git') || line.startsWith('index ')) {
      continue;
    }
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      resultLines.push({ type: 'header', text: line });
      continue;
    }
    if (line.startsWith('+')) {
      additions++;
      resultLines.push({ type: 'add', text: line.substring(1), newLineNumber: newLine++ });
    } else if (line.startsWith('-')) {
      deletions++;
      resultLines.push({ type: 'del', text: line.substring(1), oldLineNumber: oldLine++ });
    } else if (line.startsWith(' ')) {
      resultLines.push({ type: 'normal', text: line.substring(1), oldLineNumber: oldLine++, newLineNumber: newLine++ });
    }
  }
  return { additions, deletions, lines: resultLines };
}

/**
 * Safe file diff retrieval:
 * Protects against path traversal, skips binary files, caps at 2MB,
 * and accurately handles staged, unstaged, and untracked files.
 */
export async function getFileDiff(
  folderPath: string,
  filePath: string,
  staged: boolean = false,
  getGit: GetGitFn
): Promise<DiffResult> {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, filePath, additions: 0, deletions: 0, lines: [], error: 'Folder does not exist' };
  }

  if (!filePath || typeof filePath !== 'string') {
    return { success: false, filePath: '', additions: 0, deletions: 0, lines: [], error: 'File path cannot be empty' };
  }

  // 1. Path Traversal Jail
  const normalizedFolderPath = path.resolve(folderPath);
  const resolvedFilePath = path.resolve(normalizedFolderPath, filePath);
  if (!resolvedFilePath.startsWith(normalizedFolderPath)) {
    return { success: false, filePath, additions: 0, deletions: 0, lines: [], error: 'Path traversal blocked: Cannot access files outside the repository' };
  }

  // 2. Binary File Guard
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return {
      success: true,
      filePath,
      isBinary: true,
      additions: 0,
      deletions: 0,
      lines: [],
      message: 'Binary file cannot be viewed as a text diff.'
    };
  }

  // 3. Size Limit Guard (2MB)
  try {
    if (fs.existsSync(resolvedFilePath)) {
      const stat = fs.statSync(resolvedFilePath);
      if (stat.size > 2 * 1024 * 1024) {
        return {
          success: true,
          filePath,
          isTooLarge: true,
          additions: 0,
          deletions: 0,
          lines: [],
          message: 'File size exceeds 2MB limit. Diff viewing is disabled to prevent browser freezing.'
        };
      }
    }
  } catch (e) {}

  // 4. Git Diff Execution
  try {
    const git = getGit(folderPath);
    const diffArgs = staged
      ? ['--cached', '--', filePath]
      : ['--', filePath];

    const rawDiff = await git.diff(diffArgs);

    // If diff is not empty, parse unified diff
    if (rawDiff && rawDiff.trim().length > 0) {
      const parsed = parseUnifiedDiff(rawDiff);
      return {
        success: true,
        filePath,
        additions: parsed.additions,
        deletions: parsed.deletions,
        lines: parsed.lines,
        raw: rawDiff
      };
    }

    // If rawDiff is empty and file is untracked/new on disk
    if (fs.existsSync(resolvedFilePath)) {
      const content = fs.readFileSync(resolvedFilePath, 'utf8');
      const rawLines = content.split(/\r?\n/);
      const lines: DiffLine[] = [
        { type: 'header', text: `@@ -0,0 +1,${rawLines.length} @@ (New file)` }
      ];
      rawLines.forEach((text, idx) => {
        lines.push({
          type: 'add',
          text,
          newLineNumber: idx + 1
        });
      });
      return {
        success: true,
        filePath,
        additions: rawLines.length,
        deletions: 0,
        lines,
        raw: content
      };
    }

    return {
      success: true,
      filePath,
      additions: 0,
      deletions: 0,
      lines: [],
      message: 'No changes detected in this file.'
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      additions: 0,
      deletions: 0,
      lines: [],
      error: errorMessage(error, 'Failed to generate file diff')
    };
  }
}
