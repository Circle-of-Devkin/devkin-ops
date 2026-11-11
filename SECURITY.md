# Security Policy

## Supported versions

Security fixes are currently provided for the latest default branch and the latest published release.

## Security Architecture & Best Practices

DevKin Ops is designed with privacy-first and offline-first principles:

### 1. Secret Shield & Smart `.gitignore` Guard
DevKin Ops includes an automated Secret Shield scanner that inspects local uncommitted and staged files before publishing. It flags:
- Environment variable files (`.env`, `.env.local`, `.env.*`)
- SSH and SSL private keys (`id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.keystore`)
- Cloud service credentials (`*credentials*.json`, `*client_secret*.json`, `service-account*.json`, `.aws/credentials`)
- Tokens and sensitive API configurations (`token.json`)

When sensitive files are detected, publishing is proactively blocked, and a 1-click **"Add to .gitignore & Untrack"** action is provided to unstage the files (`git rm --cached`) without deleting your local copies.

### 2. Token Redaction & Git Configuration Safety
- GitHub Personal Access Tokens (PAT) and OAuth access tokens are **never** stored in plaintext inside local `.git/config` URLs.
- Git push operations inject authentication in-memory during execution only.
- In the event of network or Git errors, all error messages and logs automatically redact access tokens with `***` to prevent leakage into screenshots, terminals, or logs.
- `GIT_TERMINAL_PROMPT=0` is enforced to prevent child processes from hanging or requesting passwords via interactive terminal prompts.

### 3. Local Credential Storage
Account credentials (tokens and metadata) are currently stored in the user's local operating system application data directory (`~/.config/devkin-ops` on Linux, `%APPDATA%\devkin-ops` on Windows, `~/Library/Application Support/devkin-ops` on macOS).
- Do not run DevKin Ops on untrusted or shared multi-user operating system accounts.
- Never commit exported account files or JSON dumps to public repositories.
- OS keychain-backed credential encryption (`safeStorage`) is in active development for the v1.0.0 milestone.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Until a dedicated security contact is configured for the organization, contact the Circle of Devkin maintainers privately through the organization's GitHub security channel.

Include a clear description, affected version or commit, reproduction steps, and potential impact. Do not include real access tokens or private keys; redact secrets before sending any report.

We will acknowledge valid reports, investigate them, and coordinate a fix and disclosure timeline with the reporter.
