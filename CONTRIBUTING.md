# Contributing to DevKin Ops

Thank you for contributing to Circle of Devkin and DevKin Ops.

## Before you start

1. Search existing issues before opening a new one.
2. For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
3. Keep pull requests focused and explain the user-facing impact.

## Local setup

```bash
npm install
npm run dev
```

Before submitting a pull request, run:

```bash
npm run typecheck
npm run build
```

## Versioning

This project follows Semantic Versioning. Maintainers update the version in `package.json` and create a matching Git tag using the `vMAJOR.MINOR.PATCH` format, such as `v0.1.0`. During the `0.x` phase, compatible behavior is preferred but breaking changes may still occur before `1.0.0`.

## Pull requests

- Use a clear title that describes the change.
- Include testing steps and screenshots for UI changes.
- Update documentation when behavior or setup changes.
- Do not commit tokens, private keys, build output, or local configuration.
- Preserve the Electron security boundary and validate new IPC inputs.

By contributing, you agree that your contributions may be distributed under the repository's MIT License.
