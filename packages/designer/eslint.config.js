// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  customElements: 'readonly',
  HTMLElement: 'readonly',
  CustomEvent: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  AbortController: 'readonly',
  requestAnimationFrame: 'readonly',
  matchMedia: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: { ...browserGlobals, describe: 'readonly', it: 'readonly', expect: 'readonly' },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // TypeScript itself catches undefined identifiers; `no-undef` can't tell a
      // DOM lib type (HTMLInputElement, MouseEvent, ...) used in a type position
      // from an undeclared runtime value, so typescript-eslint's own docs say to
      // turn it off wherever TS is in the pipeline (every file in this package).
      'no-undef': 'off',
    },
  },
);
