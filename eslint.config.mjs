import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'frontend/**',
      'coverage/**',
      'logs/**',
      'db/**',
      'vitest.config.js',
    ],
  },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { sourceType: 'module' },
    },
    rules: {
      // Criterio pragmático: el baseline no está limpio, por lo que las reglas
      // de mayor volumen quedan como warning para no romper el flujo actual.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
      // Ampliación de tipos de Express (`declare global { namespace Express }`)
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-console': 'warn',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'prefer-const': 'warn',
    },
  },
);
