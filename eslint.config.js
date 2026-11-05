// @ts-check

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['.output/**', '.wxt/**', 'node_modules/**', 'dist/**', 'coverage/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      // Plugin's configs.flat shape does not match ESLint 10's Plugin type yet.
      'react-hooks': /** @type {import('eslint').ESLint.Plugin} */ (reactHooks),
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
