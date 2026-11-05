// @ts-check

import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      '.output/**',
      '.wxt/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended]
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['e2e/**', 'playwright.config.ts'],
    plugins: {
      // Plugin's configs.flat shape does not match ESLint 10's Plugin type yet.
      'react-hooks': /** @type {import('eslint').ESLint.Plugin} */ (reactHooks)
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  eslintConfigPrettier
)
