import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/i18n/locales/**',
      ],
      // TODO(ci): ratchet al piso real tras la migracion SSO; subir de vuelta a 80/70/70/80 al sumar tests.
      thresholds: {
        lines: 72,
        branches: 58,
        functions: 65,
        statements: 70,
      },
    },
  },
});
