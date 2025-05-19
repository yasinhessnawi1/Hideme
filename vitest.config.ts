/// <reference types="vitest" />
import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(async () => {
  const resolvedViteConfig = await viteConfig;
  return mergeConfig(
    resolvedViteConfig,
    {
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './setup.ts',
        // Increase timeout to prevent tests from hanging
        testTimeout: 300000,
        // Add hook timeout to prevent hanging in setup/teardown
        hookTimeout: 100000,
        // Use proper sequence configuration
        sequence: {
          hooks: 'stack',
        },
        // Run tests sequentially to avoid concurrency issues
        fileParallelism: false,
        sequential: true,
        // Force single-threaded execution
        pool: 'forks',
        poolOptions: {
          forks: {
            singleFork: true,
            maxWorkers: 1,
          },
        },
        // Enable debugging and verbose output
        logHeapUsage: true,
        // Cache to speed up subsequent runs
        cache: {
          dir: '.vitest-cache',
        },
      }
    }
  );
});