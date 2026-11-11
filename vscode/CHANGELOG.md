# Changelog

All notable changes to DevKin Ops will be documented here.

This project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).

## [0.2.1] - 2026-11-11

### Added
- **Recent Projects Quick Switcher (Step 2.1)**: Apple-style pill chips displaying the last 5 opened project repositories with 1-click switching and individual removal (`✕`) buttons.
- **Quick Action Launchers (Step 2.2)**: Direct 1-click launchers in the folder header to open any project in **VS Code** (`code <path>`) or the operating system's native **File Manager** (Nautilus, Finder, Windows Explorer).
- **Secret Shield & Smart `.gitignore` Guard (Step 2.3)**: Real-time security engine detecting `.env` files, private keys (`id_rsa`, `*.pem`, `*.key`), cloud service account credentials (`*credentials*.json`), and bloated dependencies.
- **1-Click Secret Protection**: Prominent Secret Shield banner with a 1-click "Add to .gitignore & Untrack" action that automatically appends patterns to `.gitignore` and runs `git rm --cached` without touching local files.
- **Pre-Publish Safety Shield**: Active verification guard before publishing that prevents accidental pushes of unignored secrets to public GitHub repositories, with an optional explicit bypass checkbox.
- **Empty Repository Auto-Scaffolding**: Automatically creates a starter `README.md` and `.gitkeep` for empty subfolders when initializing brand new projects, preventing Git `src refspec main does not match any` errors.

### Fixed
- **Terminal Prompt Hang & Git Basic Auth Push**: Fixed an issue where HTTPS pushes could freeze waiting for terminal `Username for 'https://github.com':` prompts by streaming credentials via in-memory basic authentication and enforcing `GIT_TERMINAL_PROMPT=0`.
- **`GIT_ASKPASS` Error**: Resolved `Use of "GIT_ASKPASS" is not permitted without enabling allowUnsafeAskPass` error by eliminating unsafe process environment overrides in `simple-git`.
- **Automated Upstream Tracking**: Fixed remote branch association so publishing automatically links local branches with `origin/main` without saving secret tokens to `.git/config`.
- **Credential Masking**: Sanitized all error output and status messages to mask GitHub PAT and OAuth tokens with `***`.
- **TypeScript Node Definitions**: Resolved TS2591 missing name errors on `fs`, `path`, and `process` in VS Code by establishing `electron/tsconfig.json` and adding `node` type definitions.

## [0.2.0] - 2026-11-04

### Added
- **VS Code Extension**: Full integration of DevKin Ops inside Visual Studio Code. Run the entire dashboard in an Editor Tab or Primary Sidebar with automatic active workspace detection.
- **VS Code Status Bar & Account Switcher**: Status bar item showing the active GitHub profile (`$(mark-github) DevKin: @username`) with a Quick Pick menu to switch accounts and apply Git identities to open workspaces.
- **Hybrid Bridge Architecture**: Introduced `DevKinViewProvider` and Webview bridge shim allowing both the Electron desktop app and the VS Code extension to share the exact same React UI and core Git/GitHub services.
- **VS Code Packaging Scripts**: Added `build:vscode` and `package:vscode` for 1-command `.vsix` extension bundle generation.
- **Workflow Modes**: Introduced a 3-tier progressive interface (`Basic`, `Pro`, `Advanced`) with an Apple-style segmented control in the workspace header and dedicated configuration view in Settings.

### Performance
- **Instant Native Scroll**: Disabled Chromium's artificial smooth scrolling flag (`disable-smooth-scrolling`) in Electron to restore crisp, 1:1 instant native wheel scrolling across Linux, Windows, and macOS.
- **GPU Optimization**: Optimized card box-shadow blur radius to reduce compositor paint overhead and eliminate scroll stutter.

### Changed
- **Responsive Multi-Device Layout**: Added responsive media queries and adaptive padding for laptop screens (768p/800p) and compact windows.

## [0.1.0] - 2026-10-30

- Initial open-source preview release of DevKin Ops.
- Multi-account management with GitHub OAuth Device Flow, PAT, and SSH key authentication.
- Local Git repository status inspection, identity alignment, and 1-click publishing.
- Contribution guidelines, code of conduct, security policy, and cross-platform packaging.
