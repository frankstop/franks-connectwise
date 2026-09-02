# Contributing

## Workflow

1. Create a focused branch from `main`.
2. Make the smallest change that solves the issue.
3. Run `npm test` and `npm run package`.
4. Test runtime changes in Microsoft Edge.
5. Open a pull request describing the behavior and verification.

## Public-data safety

This is a public repository. Never commit or paste customer names, ticket contents, screenshots, credentials, private URLs, or other workplace-sensitive information. Use sanitized examples when reporting issues or writing tests.

## Releases

Keep `manifest.json`, `package.json`, and `CHANGELOG.md` on the same version. A maintainer publishes a release by pushing a matching `vX.Y.Z` tag.
