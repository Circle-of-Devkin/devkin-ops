# DevKin Ops

DevKin Ops is an open-source desktop application for managing GitHub accounts, local repositories, and publishing workflows from one focused workspace.

Built and maintained by [Circle of Devkin](https://github.com/Circle-of-Devkin).

## Status

This project is in active development. The publishing workflow is usable, but the application and release process may change while the first public release is prepared.

## Features

- Manage multiple GitHub accounts locally
- Authenticate with OAuth or personal access tokens
- Inspect local Git repository status
- Apply account identity to a repository
- Publish repositories to GitHub
- Run as a desktop app on Linux, macOS, and Windows

## Development

### Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git

### Install and run

```bash
npm install
npm run dev
```

### Validate a change

```bash
npm run typecheck
npm run build
```

### Build installers

```bash
npm run dist
```

Electron Builder creates platform-specific artifacts. Builds should be produced on the target operating system, especially for macOS signing and notarization.

## Versioning and releases

DevKin Ops follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- `MAJOR`: incompatible changes to the public product or workflow
- `MINOR`: backwards-compatible features
- `PATCH`: backwards-compatible fixes and maintenance

The first public preview will use `v0.1.0`. Releases are created from version tags such as `v0.2.0` and are built for Linux, macOS, and Windows by GitHub Actions. The stable `v1.0.0` release will follow once the core workflow is dependable for regular use.

Account credentials are currently stored locally by the application. Do not use DevKin Ops on a shared or untrusted user account, and never commit exported account data or tokens. OS keychain-backed credential storage is planned before the stable release.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Do not report security vulnerabilities in public issues. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## License

DevKin Ops is available under the [MIT License](LICENSE).
