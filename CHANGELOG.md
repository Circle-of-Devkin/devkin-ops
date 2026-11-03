# Changelog

All notable changes to DevKin Ops will be documented here.

This project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).

## [0.2.0] - 2026-11-04

### Added
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
