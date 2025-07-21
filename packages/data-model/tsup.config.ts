import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'data-cache-types': 'src/data-cache-types.ts',
    'cache-data-keys': 'src/cache-data-keys.ts',
    'user-data-keys': 'src/user-data-keys.ts',
    'cache-data-access': 'src/cache-data-access.ts',
    'user-data-access': 'src/user-data-access.ts',
    'data-cache': 'src/data-cache.ts',
  },
  format: ['esm'],
  dts: {
    compilerOptions: {
      composite: false,
      module: 'ESNext',
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
