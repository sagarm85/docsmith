import { describe, expect, it, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/svelte';
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
    // the real Preview component instead of Canvas. No entity chosen yet on a
    // fresh template, so Preview shows its honest "choose an entity" hint.
    expect(el.shadowRoot?.textContent).toContain('Choose an entity');
    expect(el.shadowRoot?.textContent).not.toContain('Report Header');
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

  it('PrintSetup in the properties rail (Page tab) edits the live template', async () => {
    const el = mountWithAdapter();
    await nextTick();

    const pageTab = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Page',
    );
    pageTab?.click();
    await nextTick();
    expect(el.shadowRoot?.textContent).toContain('Margins (mm)');

    const pageSize = el.shadowRoot?.querySelector<HTMLSelectElement>(
      '[aria-label="Page size"]',
    );
    expect(pageSize).toBeTruthy();
    pageSize!.value = 'Letter';
    pageSize!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(el.getTemplate?.()?.printSetup.pageSize).toBe('Letter');
    el.remove();
  });

  function adapterWithDoc() {
    return new StaticAdapter({
      entities: [
        {
          meta: { name: 'invoice', label: 'Invoice' },
          headerFields: [],
          datasets: [{ meta: { id: 'invoice_items', label: 'Line items' }, fields: [] }],
          documents: {
            '1001': { header: {}, datasets: { invoice_items: [{ description: 'Widget' }] } },
          },
        },
      ],
    });
  }

  async function mountInPreviewWithDoc(config: Record<string, unknown>): Promise<DocDesignerEl> {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = config;
    document.body.appendChild(el);
    await nextTick();

    const t = el.getTemplate!();
    el.setTemplate!({ ...t, dataSource: { ...t.dataSource, entity: 'invoice' } });
    await nextTick();

    const previewBtn = Array.from(el.shadowRoot!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Preview',
    );
    previewBtn?.click();
    // Auto-select-first-sample-id → fetchDocument → render is a few microtask
    // hops; a handful of nextTick()s reliably drains that chain in jsdom.
    for (let i = 0; i < 5; i++) await nextTick();
    return el;
  }

  function findButton(el: DocDesignerEl, label: string): HTMLButtonElement | undefined {
    return Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
  }

  it('Export PDF stays disabled without a renderServiceUrl, even with an entity+doc-id', async () => {
    const el = await mountInPreviewWithDoc({ adapter: adapterWithDoc() });
    expect(findButton(el, 'Export PDF')?.disabled).toBe(true);
    el.remove();
  });

  it('Export PDF posts {template, data} (push mode) and downloads the PDF', async () => {
    const pdfBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(pdfBlob),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });
    // jsdom doesn't implement real navigation; the component only needs the
    // click to happen, not to actually navigate.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const el = await mountInPreviewWithDoc({
      adapter: adapterWithDoc(),
      renderServiceUrl: 'http://localhost:8090',
    });

    const exportBtn = findButton(el, 'Export PDF');
    expect(exportBtn?.disabled).toBe(false);
    exportBtn?.click();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8090/render');
    const body = JSON.parse(init.body as string);
    expect(body.template.id).toBe(el.getTemplate?.()?.id);
    expect(body.data).toStrictEqual({ header: {}, datasets: { invoice_items: [{ description: 'Widget' }] } });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(el.shadowRoot?.textContent).toContain('Exported'));

    vi.unstubAllGlobals();
    el.remove();
  });

  it('Export PDF shows an error toast (and suggests Print) when the service is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to fetch')),
    );

    const el = await mountInPreviewWithDoc({
      adapter: adapterWithDoc(),
      renderServiceUrl: 'http://localhost:8090',
    });

    findButton(el, 'Export PDF')?.click();

    await waitFor(() => expect(el.shadowRoot?.textContent).toContain('Export failed'));
    expect(el.shadowRoot?.textContent).toContain('Print');

    vi.unstubAllGlobals();
    el.remove();
  });

  function adapterWithHeaderField() {
    return new StaticAdapter({
      entities: [
        {
          meta: { name: 'invoice', label: 'Invoice' },
          headerFields: [
            { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
          ],
          datasets: [],
          documents: {},
        },
      ],
    });
  }

  async function mountWithEntitySelected(): Promise<DocDesignerEl> {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter: adapterWithHeaderField() };
    document.body.appendChild(el);
    await nextTick();

    const t = el.getTemplate!();
    el.setTemplate!({ ...t, dataSource: { ...t.dataSource, entity: 'invoice' } });
    // Let SourceConfig/Palette/FieldGroup's async listEntities/getFields chain
    // resolve and render the field chip.
    for (let i = 0; i < 5; i++) await nextTick();
    return el;
  }

  it('adding an element via a FieldChip "+" is undoable and redoable', async () => {
    const el = await mountWithEntitySelected();

    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[aria-label="Add Invoice # to report header"]',
    );
    expect(addBtn).toBeTruthy();
    expect(addBtn!.disabled).toBe(false);

    addBtn!.click();
    await nextTick();
    const reportHeader = () =>
      el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as { elements: unknown[] };
    expect(reportHeader().elements).toHaveLength(1);

    const undoBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Undo"]');
    expect(undoBtn?.disabled).toBe(false);
    undoBtn!.click();
    await nextTick();
    expect(reportHeader().elements).toHaveLength(0);

    const redoBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Redo"]');
    expect(redoBtn?.disabled).toBe(false);
    redoBtn!.click();
    await nextTick();
    expect(reportHeader().elements).toHaveLength(1);

    el.remove();
  });

  it('adding a Blocks element via its "+" appends a real element to reportHeader', async () => {
    const el = await mountWithEntitySelected();

    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[aria-label="Add Box to report header"]',
    );
    expect(addBtn).toBeTruthy();
    addBtn!.click();
    await nextTick();

    const reportHeader = el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
      elements: Array<{ kind: string; w: number; h: number }>;
    };
    expect(reportHeader.elements).toHaveLength(1);
    expect(reportHeader.elements[0]).toMatchObject({ kind: 'box', w: 100, h: 60 });

    el.remove();
  });

  it('selecting an element shows ElementProps, and editing its position is one undo step', async () => {
    const el = await mountWithEntitySelected();
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Invoice # to report header"]')!
      .click();
    await nextTick();

    const elementBtn = Array.from(el.shadowRoot!.querySelectorAll('[role="button"]')).find((b) =>
      b.getAttribute('aria-label')?.startsWith('Invoice # field'),
    ) as HTMLElement;
    expect(elementBtn).toBeTruthy();
    elementBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await nextTick();

    expect(el.shadowRoot?.textContent).toContain('field element');
    const xInput = el.shadowRoot!.querySelector<HTMLInputElement>('[aria-label="X position"]');
    expect(xInput).toBeTruthy();

    xInput!.value = '40';
    xInput!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    const bandEl = () =>
      (el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
        elements: Array<{ x: number }>;
      }).elements[0];
    expect(bandEl()?.x).toBe(40);

    const undoBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Undo"]');
    undoBtn!.click();
    await nextTick();
    // One undo step undoes the whole position edit, back to x: 0 — the element
    // itself must still exist (undoing the edit, not the earlier add).
    expect(bandEl()?.x).toBe(0);

    el.remove();
  });

  it('selecting a band (its tab) shows BandProps with a height field', async () => {
    const el = await mountWithEntitySelected();

    // Query all band tabs and click the one labelled "Totals".
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('button')).filter((b) =>
      ['Report Header', 'Totals'].includes(b.textContent?.trim() ?? ''),
    );
    const totals = tabs.find((b) => b.textContent?.trim() === 'Totals');
    expect(totals).toBeTruthy();
    totals!.click();
    await nextTick();

    expect(el.shadowRoot?.textContent).toContain('Totals band');
    expect(el.shadowRoot!.querySelector('[aria-label="Band height"]')).toBeTruthy();

    el.remove();
  });

  it('"Repeat page header" creates the pageHeader band and shows it on the canvas', async () => {
    const el = await mountWithEntitySelected();
    expect(el.getTemplate?.()?.bands.some((b) => b.type === 'pageHeader')).toBe(false);

    // Switch to the Page tab.
    const pageTab = Array.from(el.shadowRoot!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Page',
    );
    pageTab?.click();
    await nextTick();

    const repeatHeaderCheckbox = Array.from(
      el.shadowRoot!.querySelectorAll('label'),
    ).find((l) => l.textContent?.includes('Repeat page header'))?.querySelector('input');
    expect(repeatHeaderCheckbox).toBeTruthy();

    (repeatHeaderCheckbox as HTMLInputElement).click();
    await nextTick();

    const pageHeaderBand = el.getTemplate?.()?.bands.find((b) => b.type === 'pageHeader') as
      | { enabled?: boolean }
      | undefined;
    expect(pageHeaderBand?.enabled).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('Page Header');

    el.remove();
  });

  it('template list: Save adds an entry, the list shows it, and selecting another loads it', async () => {
    const el = mountWithAdapter();
    await nextTick();
    const firstId = el.getTemplate!()!.id;

    findButton(el, 'Save')?.click();
    await waitFor(() => expect(el.shadowRoot?.textContent).toContain('Template saved.'));

    const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Saved templates"]');
    expect(trigger?.disabled).toBe(false);
    trigger?.click();
    await nextTick();
    expect(el.shadowRoot?.querySelector('[role="option"]')).toBeTruthy();

    // Rename + save again so there are two distinguishable saved templates.
    const nameInput = el.shadowRoot!.querySelector<HTMLInputElement>('#dd-template-name');
    nameInput!.value = 'Second Template';
    nameInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    findButton(el, '+ New template')?.click();
    await nextTick();
    expect(el.getTemplate?.()?.id).not.toBe(firstId);

    trigger?.click();
    await nextTick();
    const firstOption = Array.from(el.shadowRoot!.querySelectorAll('[role="option"]')).find((o) =>
      o.getAttribute('aria-label') !== 'Second Template',
    ) as HTMLElement;
    firstOption.click();
    await nextTick();
    expect(el.getTemplate?.()?.id).toBe(firstId);

    el.remove();
  });

  it('template list is disabled when the host supplies onSave (D-010: host owns storage)', async () => {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter: new StaticAdapter({ entities: [] }), onSave: vi.fn() };
    document.body.appendChild(el);
    await nextTick();

    const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Saved templates"]');
    expect(trigger?.disabled).toBe(true);

    el.remove();
  });

  it('deleting a saved template removes it from the list', async () => {
    const el = mountWithAdapter();
    await nextTick();
    findButton(el, 'Save')?.click();
    await waitFor(() => expect(el.shadowRoot?.textContent).toContain('Template saved.'));

    const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Saved templates"]');
    trigger?.click();
    await nextTick();
    expect(el.shadowRoot?.querySelector('[role="option"]')).toBeTruthy();

    const deleteBtn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label')?.startsWith('Delete '),
    ) as HTMLButtonElement;
    deleteBtn.click();
    await nextTick();

    // The popover's own Delete button stopPropagation()s the click, so it
    // never triggers the "click outside closes it" handler — it's still open.
    expect(el.shadowRoot?.textContent).toContain('No saved templates yet.');

    el.remove();
  });

  function adapterWithHeaderAndDatasetFields() {
    return new StaticAdapter({
      entities: [
        {
          meta: { name: 'invoice', label: 'Invoice' },
          headerFields: [
            { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
          ],
          datasets: [
            {
              meta: { id: 'invoice_items', label: 'Line items' },
              fields: [{ name: 'description', label: 'Description', type: 'text', kind: 'system' }],
            },
          ],
          documents: {},
        },
      ],
    });
  }

  async function mountWithEntityAndDataset(): Promise<DocDesignerEl> {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter: adapterWithHeaderAndDatasetFields() };
    document.body.appendChild(el);
    await nextTick();

    const t = el.getTemplate!();
    el.setTemplate!({
      ...t,
      dataSource: {
        ...t.dataSource,
        entity: 'invoice',
        datasets: [
          {
            id: 'invoice_items',
            label: 'Line items',
            kind: 'fk',
            ref: { table: 'invoice_items', fkColumn: 'invoice_id' },
          },
        ],
      },
      bands: t.bands.map((b) => (b.id === 'detail' ? { ...b, datasetId: 'invoice_items' } : b)),
    });
    for (let i = 0; i < 5; i++) await nextTick();
    return el;
  }

  function bandTab(el: DocDesignerEl, bandId: string): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>(`[data-band-id="${bandId}"]`)!;
  }

  it('keyboard drag-alternative: pick up a header chip, Tab to a band, Enter drops it (design.md §12)', async () => {
    const el = await mountWithEntityAndDataset();

    const chip = el.shadowRoot!.querySelector<HTMLElement>('[aria-label="Invoice # field"]');
    expect(chip).toBeTruthy();
    chip!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await nextTick();

    expect(el.shadowRoot?.textContent).toContain('Invoice # field picked up.');
    expect(el.shadowRoot!.querySelector('[aria-label="Invoice # field (picked up)"]')).toBeTruthy();

    const reportHeaderTab = bandTab(el, 'reportHeader');
    reportHeaderTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await nextTick();

    const reportHeader = el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
      elements: Array<{ binding?: { column: string } }>;
    };
    expect(reportHeader.elements).toHaveLength(1);
    expect(reportHeader.elements[0]?.binding?.column).toBe('invoice_number');
    // Pickup state clears after a successful drop.
    expect(el.shadowRoot!.querySelector('[aria-label="Invoice # field (picked up)"]')).toBeNull();

    el.remove();
  });

  it('keyboard drag-alternative: Escape cancels the pickup without adding anything', async () => {
    const el = await mountWithEntityAndDataset();

    const chip = el.shadowRoot!.querySelector<HTMLElement>('[aria-label="Invoice # field"]');
    chip!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await nextTick();
    expect(el.shadowRoot!.querySelector('[aria-label="Invoice # field (picked up)"]')).toBeTruthy();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(el.shadowRoot!.querySelector('[aria-label="Invoice # field (picked up)"]')).toBeNull();
    const reportHeader = el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as { elements: unknown[] };
    expect(reportHeader.elements).toHaveLength(0);

    el.remove();
  });

  it('keyboard drag-alternative: dropping a dataset field on a free band is rejected with the same message as mouse drag-drop', async () => {
    const el = await mountWithEntityAndDataset();

    const chip = el.shadowRoot!.querySelector<HTMLElement>('[aria-label="Description field"]');
    expect(chip).toBeTruthy();
    chip!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await nextTick();

    const reportHeaderTab = bandTab(el, 'reportHeader');
    reportHeaderTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await nextTick();

    expect(el.shadowRoot?.textContent).toContain('Line-item fields can only go in the items table.');
    const reportHeader = el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as { elements: unknown[] };
    expect(reportHeader.elements).toHaveLength(0);
    // The rejected drop leaves the pickup active — the user can retry on a valid band.
    expect(el.shadowRoot!.querySelector('[aria-label="Description field (picked up)"]')).toBeTruthy();

    const detailTab = bandTab(el, 'detail');
    detailTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await nextTick();

    const detail = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      columns: Array<{ column: string }>;
    };
    expect(detail.columns).toHaveLength(1);
    expect(detail.columns[0]?.column).toBe('description');

    el.remove();
  });

  it('calls config.onChange (debounced) after an edit, not on every keystroke', async () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      const el = document.createElement('doc-designer') as DocDesignerEl;
      el.config = { adapter: new StaticAdapter({ entities: [] }), onChange };
      document.body.appendChild(el);
      await nextTick();

      const nameInput = el.shadowRoot!.querySelector<HTMLInputElement>('#dd-template-name');
      nameInput!.value = 'A';
      nameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();
      nameInput!.value = 'Ab';
      nameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();

      expect(onChange).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(800);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ab' }));

      el.remove();
    } finally {
      vi.useRealTimers();
    }
  });
});
