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
