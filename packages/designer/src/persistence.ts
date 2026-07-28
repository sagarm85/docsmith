// Standalone-mode default persistence (memory.md D-010): only used when the host
// does not supply `onSave`. Templates are pure JSON, so this is a thin storage
// shim, not template business logic.
import type { Template } from '@docsmith/core';

const STORAGE_PREFIX = 'erpdoc.templates.';

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
