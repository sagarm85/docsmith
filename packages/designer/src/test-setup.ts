// Registers automatic cleanup() between tests for @testing-library/svelte, so
// render() calls in one test don't leak DOM into the next (screen queries are
// document-wide, so leftover nodes cause false "multiple elements" failures).
import '@testing-library/svelte/vitest';

// Neither this jsdom version nor Node's own experimental global `localStorage`
// (which requires --localstorage-file and otherwise reads back as `undefined`)
// gives vitest a working Storage here. Swap in a minimal in-memory polyfill for
// tests only — persistence.ts just uses the ambient `localStorage` global, which
// is real in any actual browser; this is test-environment scaffolding, not part of
// the shipped bundle.
class MemoryStorage implements Storage {
  #store = new Map<string, string>();

  get length(): number {
    return this.#store.size;
  }

  clear(): void {
    this.#store.clear();
  }

  getItem(key: string): string | null {
    return this.#store.has(key) ? (this.#store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.#store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});
