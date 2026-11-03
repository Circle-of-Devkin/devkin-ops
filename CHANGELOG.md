# Changelog

All notable changes to DevKin Ops will be documented here.

This project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).

## Unreleased

- **Workflow Modes**: Introduced a 3-tier progressive interface (`Basic`, `Pro`, `Advanced`) featuring an Apple-style segmented control in the workspace header and dedicated configuration view in Settings.
- **Scroll & Compositing Performance**: Disabled Chromium's artificial smooth scrolling flag in Electron (`disable-smooth-scrolling`) to restore crisp, 1:1 instant native wheel scrolling across Linux, Windows, and macOS.
- **Responsive Layout & Visual Polish**: Optimized card box-shadow blur radius for 60+ FPS hardware rasterization and added responsive media queries for laptop screens (768p/800p) and compact windows.
- Prepared the project for public open-source development under Circle of Devkin.
- Added contribution, security, and community documentation.
- Added cross-platform Electron Builder packaging configuration.
