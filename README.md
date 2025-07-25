# Flow Reference Wallet Core Packages

This repository contains the core packages for the Flow Reference Wallet (FRW) ecosystem. These packages provide shared functionality, types, and utilities used across FRW applications.

## Packages

- **[@onflow/frw-shared](./packages/shared/README.md)** - Common types, constants, and utilities
- **[@onflow/frw-core](./packages/core/README.md)** - Core business logic and services
- **[@onflow/frw-reducers](./packages/reducers/README.md)** - State management reducers
- **[@onflow/frw-data-model](./packages/data-model/README.md)** - Cache data model implementation
- **[@onflow/frw-extension-shared](./packages/extension-shared/README.md)** - Extension-specific shared utilities

## Installation

### Prerequisites

1. Node.js version v22.11 or later
2. pnpm package manager

### Quick Start

1. `npm install --global corepack@latest`
2. `corepack enable pnpm`
3. `pnpm i`
4. `pnpm build`

## Documentation

- [Rules of React](docs/react-rules.md): React coding guidelines
- [Architecture Separation](docs/architecture-separation.md): Folder structure, import rules, and architectural boundaries enforced by ESLint.
- [Wallet Account Structure](docs/wallet-account-structure.md): Overview of wallet account organization and structure.
- [Cache Data Model](docs/cache-data-model.md): Details on the extension's cache data structure and usage.
- [Cadence Scripts Usage Analysis](docs/cadence-scripts-usage-analysis.md): Analysis of Cadence script usage in the extension.
- [Import Profile/Accounts from Mobile](docs/import-from-mobile.md): How to import profiles and accounts from the mobile app using WalletConnect.

### Detailed Installation

#### Mac / Linux

```bash
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Install Node.js version v22.11 or later
nvm install 22
nvm use 22

# install pnpm
corepack enable pnpm

# install dependencies
pnpm i
```

#### Windows

```bash
# installs fnm (Fast Node Manager)
winget install Schniz.fnm

# configure fnm environment
fnm env --use-on-cd | Out-String | Invoke-Expression

# download and install Node.js
fnm use --install-if-missing 22

# install pnpm
corepack enable pnpm

# install dependencies
pnpm i
```

## Development

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm -F @onflow/frw-shared build
pnpm -F @onflow/frw-core build

# Build with watch mode
pnpm -F <package-name> build:watch
```

### Testing & Development

```bash
# Run tests across all packages
pnpm test

# Run tests for specific package
pnpm -F <package-name> test

# Linting
pnpm lint
pnpm lint:fix

# Format code
pnpm format:fix
```

### Project Structure

```
/
├── packages/
│   ├── core/           # Core business logic and services
│   ├── data-model/     # Cache data model implementation
│   ├── extension-shared/ # Extension-specific shared utilities
│   ├── reducers/       # State management reducers
│   └── shared/         # Common types, constants, and utilities
├── docs/               # Documentation
├── scripts/            # Build and development scripts
└── pnpm-workspace.yaml # Workspace configuration
```

Each package follows a standard structure:
- `src/` - TypeScript source code
- `lib/` - Compiled JavaScript output
- `tsconfig.json` - TypeScript configuration
- `package.json` - Package configuration

### Workflow

We work on the `dev` branch of the repository. Before you start working on the extension, create a branch for the feature you're working on from the `dev` branch. We then have a Github project that co-ordinates features between the iOS, Android, and web extension teams. Please link the issue to the Flow Wallet project and update status as you work on the feature.

1. Always create a new branch from the `dev` branch.
2. When you're ready to merge your branch into `dev`, create a pull request from your branch to the `dev` branch.
3. When the pull request is approved, merge it into the `dev` branch.
4. When you're ready to release a new version of the extension, create a pull request from the `dev` branch to the `master` branch.
5. When the pull request is approved, merge it into the `master` branch.
6. When the release is ready to be built, the `master` branch will be built and released to the Chrome Web Store.

## Publishing

Packages are published to npm under the @onflow organization scope.

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Publish packages (requires npm publish permissions)
pnpm publish -r
```

## Analyzing High Priority Issues

This repository includes tools to analyze high-priority issues across repositories. To use these tools:

1. Install GitHub CLI if you haven't already:

   ```bash
   # macOS
   brew install gh

   # Windows
   winget install --id GitHub.cli

   ```

2. Login to GitHub CLI with project permissions:

   ```bash
   pnpm gh:login
   ```

   Follow the prompts to complete authentication. Make sure to:
   - Choose "GitHub.com" for the account
   - Choose "HTTPS" for the protocol
   - Choose "Y" to authenticate Git with your GitHub credentials
   - Choose "Login with a web browser" for authentication method

3. Run the analysis:
   ```bash
   pnpm analyze:priority
   ```

The analysis will generate several files in the `.github-data` directory:

- `index.html`: Overview of all repositories with high-priority issues
- For each repository with high-priority issues:
  - `{repo-name}-bug-heatmap.html`: Interactive visualization of bug hotspots
  - `{repo-name}-high-priority-report.md`: Detailed markdown report
  - `{repo-name}-high-priority-changes.json`: Raw data for further analysis
