import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist', '**/node_modules', '**/.wrangler', '**/coverage'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Worker: dozwolone tylko strukturalne logowanie błędów serwera (Cloudflare Observability).
    files: ['worker/src/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    rules: {
      // Przewijane regiony (role="region") muszą przyjmować fokus, by obsłużyć je klawiaturą.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'Zakaz dangerouslySetInnerHTML - treść dokumentu renderujemy wyłącznie jako tekst.',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Skrypty statyczne serwowane wprost do przeglądarki (np. inicjalizacja motywu).
    files: ['web/public/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  prettier,
);
