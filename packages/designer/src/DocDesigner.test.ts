import { describe, expect, it, beforeEach } from 'vitest';
import { StaticAdapter } from '@docsmith/adapters';
import type { Template } from '@docsmith/core';
import './DocDesigner.svelte'; // side effect: registers <doc-designer>

// Svelte's custom-element wrapper defers instantiation by one microtask on
// connectedCallback (to let slotted children mount first) — see
// svelte/src/internal/client/dom/elements/custom-element.js. Tests must await that
// tick before inspecting shadowRoot content or calling exposed methods.
function nextTick(): Promise<void> {
  return Promise.resolve();
}

type DocDesignerEl = HTMLElement & {
  config?: unknown;
  getTemplate?: () => Template;
  setTemplate?: (t: Template) => void;
};

function mountWithAdapter(): DocDesignerEl {
  const adapter = new StaticAdapter({ entities: [] });
  const el = document.createElement('doc-designer') as DocDesignerEl;
  el.config = { adapter };
  document.body.appendChild(el);
  return el;
}

describe('<doc-designer>', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers the custom element tag', () => {
    expect(customElements.get('doc-designer')).toBeDefined();
  });

  it('shows an honest empty state when mounted without an adapter', async () => {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    document.body.appendChild(el);
    await nextTick();

    const shadowText = el.shadowRoot?.textContent ?? '';
    expect(shadowText).toContain('No data adapter configured');
    el.remove();
  });

  it('renders the toolbar and Palette (design mode) against a real adapter', async () => {
    const el = mountWithAdapter();
    await nextTick();

    const shadowText = el.shadowRoot?.textContent ?? '';
    expect(shadowText).not.toContain('No data adapter configured');
    expect(shadowText).toContain('Report Header');
    expect(shadowText).toContain('Entity');
    el.remove();
  });

  it('exposes getTemplate/setTemplate seeded from core.newTemplate()', async () => {
    const el = mountWithAdapter();
    await nextTick();

    const initial = el.getTemplate?.();
    expect(initial?.version).toBe(1);
    expect(Array.isArray(initial?.bands)).toBe(true);

    const fake = { ...initial, name: 'Renamed' } as Template;
    el.setTemplate?.(fake);
    expect(el.getTemplate?.()).toStrictEqual(fake);
    el.remove();
  });

  it('toggles Design/Preview mode via the toolbar', async () => {
    const el = mountWithAdapter();
    await nextTick();
    expect(el.shadowRoot?.textContent).toContain('Report Header');
    expect(el.shadowRoot?.textContent).toContain('Entity');

    const previewBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Preview',
    );
    previewBtn?.click();
    await nextTick();

    // Preview mode hides the Palette (Design-mode-only per design.md §4) and shows
    // its own placeholder instead of the Canvas one.
    expect(el.shadowRoot?.textContent).toContain('Preview lands later in Phase 1.');
    expect(el.shadowRoot?.textContent).not.toContain('Entity');
    el.remove();
  });

  it('renaming via the toolbar input updates the template', async () => {
    const el = mountWithAdapter();
    await nextTick();

    const input = el.shadowRoot?.querySelector<HTMLInputElement>('#dd-template-name');
    expect(input).toBeTruthy();
    input!.value = 'My Invoice';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(el.getTemplate?.()?.name).toBe('My Invoice');
    el.remove();
  });

  it('Save persists to localStorage when no onSave is configured (D-010)', async () => {
    const el = mountWithAdapter();
    await nextTick();
    const template = el.getTemplate?.();

    const saveBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Save',
    );
    saveBtn?.click();
    await nextTick();
    await nextTick();

    expect(localStorage.getItem(`erpdoc.templates.${template?.id}`)).not.toBeNull();
    expect(el.shadowRoot?.textContent).toContain('Template saved.');
    el.remove();
  });

  it('Save calls the host onSave instead of localStorage when provided', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const saved: Template[] = [];
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter, onSave: (t: Template) => void saved.push(t) };
    document.body.appendChild(el);
    await nextTick();
    const template = el.getTemplate?.();

    const saveBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Save',
    );
    saveBtn?.click();
    await nextTick();
    await nextTick();

    expect(saved).toStrictEqual([template]);
    expect(localStorage.getItem(`erpdoc.templates.${template?.id}`)).toBeNull();
    el.remove();
  });
});
