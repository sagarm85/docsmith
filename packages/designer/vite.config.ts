import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// Single custom-element bundle: everything (svelte runtime output + @docsmith/core +
// @docsmith/adapters) is bundled into one ES module so a host ERP can embed it with
// one <script type="module"> tag. Only DocDesigner.svelte declares
// <svelte:options customElement="doc-designer" />, so it alone compiles to a custom
// element; every other .svelte file compiles as a normal component (testable with
// @testing-library/svelte).
//
// `pnpm dev` serves ./dev (a local harness against the real StaticAdapter fixture
// shared with the backend demo) instead of the library build; `pnpm build` uses the
// lib entry below. Same plugin/config either way — only the Vite root differs.
export default defineConfig(({ command }) => ({
  plugins: [svelte({ compilerOptions: { customElement: true } })],
  root: command === 'serve' && !process.env.VITEST ? 'dev' : undefined,
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: () => 'doc-designer.js',
    },
    cssCodeSplit: false,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
}));
