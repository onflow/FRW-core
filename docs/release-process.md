# Release Process

This document describes how to release packages in the FRW-core monorepo.

## Overview

FRW-core uses [Changesets](https://github.com/changesets/changesets) to manage releases. This provides:

- Automated version bumping
- Changelog generation
- GitHub release creation
- npm publishing

## Prerequisites

- Push access to the `main` branch
- npm publish permissions for `@onflow/frw-*` packages
- GitHub repository secrets configured:
  - `NPM_TOKEN`: npm token with publish access
  - `GITHUB_TOKEN`: automatically provided by GitHub Actions

## Creating a Changeset

When you make changes that should be released:

1. Create a changeset:
   ```bash
   pnpm changeset
   ```

2. Select the packages that have changed
3. Choose the version bump type:
   - `patch`: Bug fixes and minor changes (0.0.x)
   - `minor`: New features (0.x.0)
   - `major`: Breaking changes (x.0.0)
4. Write a summary of your changes

The changeset will be saved in `.changeset/` directory.

## Release Workflow

### Automatic Process

1. **Push to main**: When changesets are pushed to the `main` branch, the GitHub Action creates a "Release PR"

2. **Release PR**: This PR:
   - Aggregates all pending changesets
   - Updates package versions
   - Updates changelogs
   - Updates internal dependencies

3. **Merge to publish**: When you merge the Release PR:
   - Packages are built and published to npm
   - GitHub releases are created with changelogs
   - Changesets are consumed (deleted)

### Manual Release

If needed, you can release manually:

```bash
# Update versions
pnpm changeset version

# Build and publish
pnpm release
```

## Example Workflow

```bash
# 1. Make your changes
git checkout -b feature/my-changes

# 2. Create a changeset
pnpm changeset

# 3. Commit everything
git add .
git commit -m "feat: add new feature"

# 4. Push to GitHub
git push origin feature/my-changes

# 5. Create and merge PR to main

# 6. GitHub Action creates Release PR automatically

# 7. Review and merge Release PR to publish
```

## Package Configuration

Each package in `packages/*/package.json` should have:

- Proper `name` field (e.g., `@onflow/frw-shared`)
- Correct `version` field
- `"publishConfig": { "access": "public" }` for public packages

## Troubleshooting

### Release PR not created
- Check GitHub Actions for errors
- Ensure changesets exist in `.changeset/`
- Verify you're pushing to `main` branch

### Publishing fails
- Verify `NPM_TOKEN` secret is valid
- Check package names are correct
- Ensure no duplicate versions exist on npm

### Version conflicts
- Run `pnpm changeset version` locally
- Resolve any conflicts
- Push the resolved versions

## Notes

- Only changes with changesets will be released
- Packages without changes won't be published
- GitHub releases include full changelogs
- All packages use independent versioning