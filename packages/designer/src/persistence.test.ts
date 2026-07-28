import { describe, expect, it, beforeEach } from 'vitest';
import { newTemplate } from '@docsmith/core';
import { loadTemplateFromLocalStorage, saveTemplateToLocalStorage } from './persistence.js';

describe('localStorage default persistence (D-010)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a template under the erpdoc.templates.* key', () => {
    const template = newTemplate('invoice', 'invoice');
    saveTemplateToLocalStorage(template);

    expect(localStorage.getItem(`erpdoc.templates.${template.id}`)).not.toBeNull();
    expect(loadTemplateFromLocalStorage(template.id)).toStrictEqual(template);
  });

  it('returns null for an id that was never saved', () => {
    expect(loadTemplateFromLocalStorage('does-not-exist')).toBeNull();
  });
});
