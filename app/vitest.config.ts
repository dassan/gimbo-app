import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['node_modules', 'e2e'],
      coverage: {
        provider: 'v8',
        include: [
          'src/lib/storage/schema.ts',
          'src/lib/storage/indexedDb.ts',
          'src/lib/storage/fileSystem.ts',
          'src/lib/storage/merge.ts',
          'src/lib/storage/sync.ts',
          'src/lib/utils.ts',
          'src/store/useDataStore.ts',
        ],
        thresholds: { lines: 80, functions: 80 },
      },
    },
  }),
)
