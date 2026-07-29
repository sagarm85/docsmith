// Standalone-mode default persistence (memory.md D-010): only used when the host
// does not supply `onSave`. Templates are pure JSON, so this is a thin storage
// shim, not template business logic.
import type { Template } from '@docsmith/core';

const STORAGE_PREFIX = 'erpdoc.templates.';
const THEME_STORAGE_PREFIX = 'erpdoc.themes.';

export function saveTemplateToLocalStorage(template: Template): void {
  localStorage.setItem(`${STORAGE_PREFIX}${template.id}`, JSON.stringify(template));
}

export function loadTemplateFromLocalStorage(id: string): Template | null {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as Template;
}

export function deleteTemplateFromLocalStorage(id: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
}

/** Lists every template this browser has saved (standalone mode only — see
 * D-010). A malformed/corrupted entry is skipped rather than thrown, since one
 * bad localStorage row shouldn't break the whole list. */
export function listTemplatesFromLocalStorage(): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    try {
      const template = JSON.parse(localStorage.getItem(key) as string) as Template;
      out.push({ id: template.id, name: template.name });
    } catch {
      /* skip a corrupted entry */
    }
  }
  return out;
}

/**
 * Saved theme/brand presets (memory.md D-032) — a named, saved set of
 * `--dd-*` token overrides, the exact same mechanism design.md §13's
 * `config.theme` already documents (host-supplied CSS custom property
 * overrides applied to the shadow root). This just lets the *author* save
 * and re-apply one from inside the designer, same standalone/localStorage
 * scoping as templates (D-010) — disabled when the host supplies
 * `config.theme` directly, since then the host owns branding.
 */
export type SavedTheme = { id: string; name: string; tokens: Record<string, string> };

export function saveThemeToLocalStorage(theme: SavedTheme): void {
  localStorage.setItem(`${THEME_STORAGE_PREFIX}${theme.id}`, JSON.stringify(theme));
}

export function loadThemeFromLocalStorage(id: string): SavedTheme | null {
  const raw = localStorage.getItem(`${THEME_STORAGE_PREFIX}${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as SavedTheme;
}

export function deleteThemeFromLocalStorage(id: string): void {
  localStorage.removeItem(`${THEME_STORAGE_PREFIX}${id}`);
}

export function listThemesFromLocalStorage(): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(THEME_STORAGE_PREFIX)) continue;
    try {
      const theme = JSON.parse(localStorage.getItem(key) as string) as SavedTheme;
      out.push({ id: theme.id, name: theme.name });
    } catch {
      /* skip a corrupted entry */
    }
  }
  return out;
}
