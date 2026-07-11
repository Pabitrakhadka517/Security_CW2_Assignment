import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Allow uppercase-starting and underscore-prefixed vars to be unused
      // (React components used in JSX via member expressions like motion.div,
      //  and component props/imports like Icon, Truck, etc.)
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]|^motion$',
        argsIgnorePattern: '^[A-Z_]',
        destructuredArrayIgnorePattern: '^[A-Z_]',
        ignoreRestSiblings: true,
      }],
      // Downgrade exhaustive-deps to warning (common in most real projects)
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
])
