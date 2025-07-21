# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flow Reference Wallet Core (FRW-core) contains the core packages for the Flow Reference Wallet ecosystem. These packages provide shared functionality, types, and utilities used across FRW applications.

The project is organized as a **pnpm monorepo** with the following structure:

- `packages/shared/` - Shared types, constants, and utilities (`@onflow/frw-shared`)
- `packages/core/` - Core business logic and services (`@onflow/frw-core`)
- `packages/reducers/` - State management reducers (`@onflow/frw-reducers`)
- `packages/data-model/` - Cache data model implementation (`@onflow/frw-data-model`)
- `packages/extension-shared/` - Extension-specific shared utilities (`@onflow/frw-extension-shared`)

## Development Commands

### Build Commands

All commands run from the root directory:

- **Build All**: `pnpm build` - Builds all packages
- **Build Specific Package**: `pnpm -F <package-name> build`
- **Build with Watch**: `pnpm -F <package-name> build:watch`

Example:
```bash
pnpm -F @onflow/frw-shared build
pnpm -F @onflow/frw-core build:watch
```

### Testing & Quality

- **Unit Tests**: `pnpm test` - Runs tests across all workspaces
- **Test Specific Package**: `pnpm -F <package-name> test`
- **Linting**: `pnpm lint` - Lints root and all workspaces
- **Linting Fix**: `pnpm lint:fix` - Auto-fix linting issues
- **Format**: `pnpm format:fix` - Format code with Prettier across all workspaces

## Architecture Overview

### Monorepo Structure

```
/
├── packages/
│   ├── shared/            # @onflow/frw-shared
│   │   ├── src/
│   │   │   ├── types/     # TypeScript type definitions
│   │   │   ├── constant/  # Shared constants
│   │   │   └── utils/     # Utility functions
│   │   └── package.json
│   ├── core/              # @onflow/frw-core
│   │   ├── src/           # Core business logic
│   │   └── package.json
│   ├── reducers/          # @onflow/frw-reducers
│   │   ├── src/           # State reducers
│   │   └── package.json
│   ├── data-model/        # @onflow/frw-data-model
│   │   ├── src/           # Cache data model
│   │   └── package.json
│   └── extension-shared/  # @onflow/frw-extension-shared
│       ├── src/           # Extension utilities
│       └── package.json
├── docs/                  # Documentation
├── scripts/               # Build scripts
└── pnpm-workspace.yaml    # Workspace configuration
```

### Package Structure

1. **Shared Package** (`packages/shared/`)
   - Common types, utilities, and constants
   - Published as `@onflow/frw-shared`
   - Foundation for all other packages

2. **Core Package** (`packages/core/`)
   - Core business logic and services
   - Wallet services, blockchain interactions
   - Published as `@onflow/frw-core`

3. **Reducers Package** (`packages/reducers/`)
   - State management reducers
   - Published as `@onflow/frw-reducers`
   - Pure functions for predictable state management

4. **Data Model Package** (`packages/data-model/`)
   - Cache data model implementation
   - Published as `@onflow/frw-data-model`
   - Handles data caching strategies

5. **Extension Shared Package** (`packages/extension-shared/`)
   - Extension-specific utilities and helpers
   - Published as `@onflow/frw-extension-shared`
   - Used by browser extension implementations

### State Management

- Pure reducer functions for predictable state updates
- No global state management library dependencies
- Designed to work with any state management solution
- Type-safe state transformations

## Environment Setup

1. **Prerequisites**:
   - Node.js >= 22.11.0
   - pnpm >= 9.0.0 (enforced version: 10.12.4)
   - Install dependencies: `pnpm install` (from root)

2. **Development Setup**:
   ```bash
   # Install dependencies
   pnpm install
   
   # Build all packages
   pnpm build
   
   # Run tests
   pnpm test
   ```

## Critical Patterns

### Package Design Principles

- **Zero Platform Dependencies**: Packages work in any JavaScript environment
- **Type Safety**: Full TypeScript support with strict mode
- **Tree Shakeable**: Optimized for bundle size
- **No Side Effects**: Pure functions and predictable behavior

### Security Considerations

- Packages handle sensitive data structures safely
- No direct cryptographic operations in packages
- Designed for secure wallet implementations

### Multi-Account Architecture

- Types and utilities support multiple Flow accounts
- Child account structures supported
- EVM address linking capabilities
- Flexible account management patterns

## Common Development Tasks

### Adding New Types or Utilities

1. Add type definitions in `packages/shared/src/types/`
2. Add utility functions in appropriate package
3. Export from package index
4. Build and test the package

### Import Patterns

```typescript
// Import from shared package
import { SomeType } from '@onflow/frw-shared/types';
import { formatAddress } from '@onflow/frw-shared/utils';

// Import from core package
import { WalletService } from '@onflow/frw-core';

// Import from reducers package
import { accountReducer } from '@onflow/frw-reducers';

// Import from data model
import { CacheModel } from '@onflow/frw-data-model';
```

### Flow Blockchain Integration

- Types for @onflow/fcl interactions
- Transaction building utilities
- Account key management structures
- Multi-sig support types

## Build System

- TypeScript with strict mode
- CommonJS and ESM builds
- Source maps for debugging
- Tree-shaking optimized

## Testing Strategy

- Unit tests with Vitest
- Type checking with TypeScript
- Linting with ESLint
- Formatting with Prettier

## Data Cache Model

The data-model package provides a sophisticated caching system:

### Cache Architecture

- **Storage Agnostic**: Works with any storage backend
- **TTL Support**: Configurable expiry timestamps
- **Type Safe**: Full TypeScript support
- **Batch Operations**: Efficient bulk updates

### Key Features

- Flexible cache key patterns
- Automatic expiry handling
- Event-driven architecture
- Optimized for performance

## Workspace Management

### Package Dependencies

- Root workspace manages shared dev dependencies
- Each package has its own dependencies
- Use workspace protocol: `"@onflow/frw-shared": "workspace:*"`

### Common Tasks

```bash
# Install dependencies for all workspaces
pnpm install

# Add dependency to specific package
pnpm -F @onflow/frw-shared add <package-name>
pnpm -F @onflow/frw-core add <package-name>

# Run command in specific workspace
pnpm -F <workspace-name> <command>

# Build all workspaces
pnpm -r build

# Run tests across all workspaces
pnpm test

# Publish packages (with proper npm permissions)
pnpm publish -r
```

### Architecture Rules

Packages maintain strict dependency rules:

1. **Shared Package**:
   - No dependencies on other FRW packages
   - Foundation for all other packages

2. **Core Package**:
   - Can import from shared package only
   - No UI or platform-specific code

3. **Reducers Package**:
   - Can import from shared package only
   - Pure functions only

4. **Data Model Package**:
   - Can import from shared package only
   - Storage agnostic implementation

5. **Extension Shared Package**:
   - Can import from shared and core packages
   - Browser extension specific utilities

## Package Development Guidelines

- Keep packages focused and single-purpose
- Maintain backward compatibility
- Document all public APIs
- Include comprehensive tests
- Follow semantic versioning
