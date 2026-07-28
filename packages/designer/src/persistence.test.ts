import { describe, expect, it, beforeEach } from 'vitest';
import { newTemplate } from '@docsmith/core';
import {
  deleteTemplateFromLocalStorage,
  listTemplatesFromLocalStorage,
  loadTemplateFromLocalStorage,
  saveTemplateToLocalStorage,
} from './persistence.js';

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

  it('lists every saved template as {id, name}', () => {
    const a = { ...newTemplate('invoice', 'invoice'), name: 'Invoice A' };
    const b = { ...newTemplate('quote', 'quote'), name: 'Quote B' };
    saveTemplateToLocalStorage(a);
    saveTemplateToLocalStorage(b);

    const list = listTemplatesFromLocalStorage();
    expect(list).toHaveLength(2);
    expect(list).toEqual(
      expect.arrayContaining([
        { id: a.id, name: 'Invoice A' },
        { id: b.id, name: 'Quote B' },
      ]),
    );
  });

  it('skips a corrupted entry instead of throwing', () => {
    const good = newTemplate('invoice', 'invoice');
    saveTemplateToLocalStorage(good);
    localStorage.setItem('erpdoc.templates.broken', '{not json');

    expect(() => listTemplatesFromLocalStorage()).not.toThrow();
    expect(listTemplatesFromLocalStorage()).toEqual([{ id: good.id, name: good.name }]);
  });

  it('deleteTemplateFromLocalStorage removes just that entry', () => {
    const a = newTemplate('invoice', 'invoice');
    const b = newTemplate('quote', 'quote');
    saveTemplateToLocalStorage(a);
    saveTemplateToLocalStorage(b);

    deleteTemplateFromLocalStorage(a.id);

    expect(loadTemplateFromLocalStorage(a.id)).toBeNull();
    expect(loadTemplateFromLocalStorage(b.id)).toStrictEqual(b);
  });
});
