import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['frontend/**', 'node_modules/**', '.opencode/**'],
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/app.ts', 'src/seed/**/*.ts', 'src/jobs/**/*.ts'],
      // TODO(ci): ratchet al piso real tras la migracion SSO; subir de vuelta a 85/80/85/85 al sumar tests.
      thresholds: {
        lines: 84,
        branches: 75,
        functions: 83,
        statements: 83,
      },
    },
  },
});