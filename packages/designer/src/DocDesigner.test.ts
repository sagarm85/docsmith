import { describe, expect, it, beforeEach, vi } from 'vitest';
import { waitFor, fireEvent } from '@testing-library/svelte';
import { StaticAdapter } from '@docsmith/adapters';
import type { Template } from '@docsmith/core';
import { pageDimensionsPx } from './geometry.js';
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

    const template = el.getTemplate?.() as Template;
    const reportHeader = template.bands.find((b) => b.id === 'reportHeader') as {
      elements: Array<{ kind: string; w: number; h: number }>;
    };
    expect(reportHeader.elements).toHaveLength(1);
    // A newly-dropped box always spans the band's full content width — see
    // template-edits.ts's createBlockElement doc comment.
    const contentWidthPx = pageDimensionsPx(template.printSetup).width;
    expect(reportHeader.elements[0]).toMatchObject({ kind: 'box', w: contentWidthPx, h: 60 });

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
    expect(el.shadowRoot!.querySelector('[aria-label="Band minimum height"]')).toBeTruthy();

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
              fields: [
                { name: 'description', label: 'Description', type: 'text', kind: 'system' },
                { name: 'amount', label: 'Amount', type: 'number', kind: 'system' },
              ],
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

  it('click-to-add "+" on a dataset field rejects a cross-dataset field the same way drag-drop already does (memory.md D-075)', async () => {
    const adapter = new StaticAdapter({
      entities: [
        {
          meta: { name: 'invoice', label: 'Invoice' },
          headerFields: [],
          datasets: [
            {
              meta: { id: 'invoice_items', label: 'Line items' },
              fields: [{ name: 'description', label: 'Description', type: 'text', kind: 'system' }],
            },
            {
              meta: { id: 'shipments', label: 'Shipments' },
              fields: [{ name: 'carrier', label: 'Carrier', type: 'text', kind: 'system' }],
            },
          ],
          documents: {},
        },
      ],
    });
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter };
    document.body.appendChild(el);
    await nextTick();

    const t = el.getTemplate!();
    el.setTemplate!({
      ...t,
      dataSource: {
        ...t.dataSource,
        entity: 'invoice',
        datasets: [
          { id: 'invoice_items', label: 'Line items', kind: 'fk', ref: { table: 'invoice_items', fkColumn: 'invoice_id' } },
          { id: 'shipments', label: 'Shipments', kind: 'fk', ref: { table: 'shipments', fkColumn: 'invoice_id' } },
        ],
      },
      // Detail is bound to invoice_items only — "Carrier" belongs to the OTHER dataset.
      bands: t.bands.map((b) => (b.id === 'detail' ? { ...b, datasetId: 'invoice_items' } : b)),
    });
    for (let i = 0; i < 5; i++) await nextTick();

    // Clicking + on the wrong-dataset field is rejected, not silently added.
    const carrierAddBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Add Carrier column"]');
    expect(carrierAddBtn).toBeTruthy();
    carrierAddBtn!.click();
    await nextTick();

    expect(el.shadowRoot?.textContent).toContain('That field belongs to a different dataset than this table.');
    const detailAfterReject = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      columns: Array<{ column: string }>;
    };
    expect(detailAfterReject.columns).toHaveLength(0);

    // The matching-dataset field still works normally (not over-corrected into rejecting everything).
    const descriptionAddBtn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[aria-label="Add Description column"]',
    );
    descriptionAddBtn!.click();
    await nextTick();
    const detailAfterAccept = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      columns: Array<{ column: string }>;
    };
    expect(detailAfterAccept.columns).toHaveLength(1);
    expect(detailAfterAccept.columns[0]?.column).toBe('description');

    el.remove();
  });

  it('a brand-new template\'s unbound Detail band (datasetId: "") accepts and binds to the first field added, from any entry point (memory.md D-077)', async () => {
    // newTemplate()'s real default — a genuinely fresh template, not
    // hand-authored with datasetId already set the way every fixture in
    // this repo is. Before D-077, this could NEVER accept a single
    // line-item column: '' !== any real dataset id, so the very first add
    // was rejected as a "different dataset" mismatch, from every entry
    // point (click, drag, keyboard) — confirmed live against a real
    // engine while building the dev:unidb harness.
    const el = await mountWithEntityAndDataset();
    const detailBefore = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as { datasetId: string };
    expect(detailBefore.datasetId).toBe('invoice_items'); // mountWithEntityAndDataset's own setup

    // Re-point it back to unbound to exercise the real newTemplate() case.
    const t = el.getTemplate!();
    el.setTemplate!({ ...t, bands: t.bands.map((b) => (b.id === 'detail' ? { ...b, datasetId: '' } : b)) });
    for (let i = 0; i < 5; i++) await nextTick();

    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Add Description column"]');
    expect(addBtn).toBeTruthy();
    addBtn!.click();
    await nextTick();

    // No rejection toast, real bind + add.
    expect(el.shadowRoot?.textContent).not.toContain('That field belongs to a different dataset than this table.');
    const detailAfterFirst = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      datasetId: string;
      columns: Array<{ column: string }>;
    };
    expect(detailAfterFirst.datasetId).toBe('invoice_items');
    expect(detailAfterFirst.columns).toHaveLength(1);

    // A second field from the now-bound dataset still works normally.
    const secondBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Add Amount column"]');
    secondBtn!.click();
    await nextTick();
    const detailAfterSecond = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      columns: Array<{ column: string }>;
    };
    expect(detailAfterSecond.columns).toHaveLength(2);

    el.remove();
  });

  it('setting a column aggregate writes DetailBand.aggregates keyed by column (design.md §8.5 Phase 3)', async () => {
    const el = await mountWithEntityAndDataset();

    // Aggregate/Carry-forward only show for a numeric column (Sum/Average
    // don't apply to text) — "Amount", not "Description".
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Amount column"]')!
      .click();
    await nextTick();

    el.shadowRoot!.querySelector<HTMLTableCellElement>('th')!.click();
    await nextTick();
    expect(el.shadowRoot?.textContent).toContain('Column: amount');

    const aggSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
      '[aria-label="Column aggregate"]',
    );
    expect(aggSelect).toBeTruthy();
    aggSelect!.value = 'sum';
    aggSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    const detail = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      aggregates?: Array<{ column: string; fn: string; into: string }>;
    };
    expect(detail.aggregates).toStrictEqual([{ column: 'amount', fn: 'sum', into: 'tfoot' }]);

    // Switching back to "None" removes the entry rather than leaving a stale one.
    aggSelect!.value = 'none';
    aggSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    const detailAfter = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      aggregates?: unknown[];
    };
    expect(detailAfter.aggregates).toStrictEqual([]);

    el.remove();
  });

  it('clicking Add on a dataset field already used as a detail column is a no-op, not a crash ("Line Items - not able to add field")', async () => {
    const el = await mountWithEntityAndDataset();

    // First add is real: one "Description" column.
    el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Add Description column"]')!.click();
    await nextTick();
    let detail = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      columns: Array<{ column: string }>;
    };
    expect(detail.columns).toHaveLength(1);

    // DetailTable.svelte keys its column {#each} blocks by `col.column` (the
    // field name — a DetailColumn has no other identity). Before the fix,
    // clicking Add again on the SAME already-added field threw Svelte's
    // each_key_duplicate and broke the table's rendering — reported directly
    // as "Line Items - not able to add field" for a template (like every
    // reference template) where every dataset field is already a column.
    // The chip itself now shows "added" and its button is disabled, but
    // assert the underlying guard directly rather than relying only on the
    // chip being unclickable.
    const addedBtn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      '[aria-label="Description already added"]',
    );
    expect(addedBtn).toBeTruthy();
    expect(addedBtn!.disabled).toBe(true);

    detail = el.getTemplate?.()?.bands.find((b) => b.id === 'detail') as {
      columns: Array<{ column: string }>;
    };
    expect(detail.columns).toHaveLength(1);
    expect(detail.columns[0]?.column).toBe('description');
    // The table still renders correctly — no crash, no duplicate-keyed rows.
    expect(el.shadowRoot?.textContent).toContain('Description');

    el.remove();
  });

  it('adding a conditional-formatting rule to a field element writes FreeElement.conditionalFormat (memory.md D-031)', async () => {
    const el = await mountWithEntitySelected();

    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Invoice # to report header"]')!
      .click();
    await nextTick();

    const elementBtn = Array.from(el.shadowRoot!.querySelectorAll('[role="button"]')).find((b) =>
      b.getAttribute('aria-label')?.startsWith('Invoice # field'),
    ) as HTMLElement;
    elementBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await nextTick();

    findButton(el, 'Add rule')?.click();
    await nextTick();

    const reportHeader = () =>
      el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
        elements: Array<{ conditionalFormat?: unknown[] }>;
      };
    expect(reportHeader().elements[0]?.conditionalFormat).toStrictEqual([
      { operator: 'gt', value: 0, style: { bold: true } },
    ]);

    el.remove();
  });

  it('switching the layout unit to "%" migrates existing element coordinates (memory.md D-028)', async () => {
    const el = await mountWithEntitySelected();

    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Invoice # to report header"]')!
      .click();
    await nextTick();

    const before = el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
      elements: Array<{ x: number; y: number; w: number; h: number }>;
    };
    expect(before.elements[0]?.x).toBe(0);
    expect(el.getTemplate?.()?.layoutUnit).toBeUndefined();

    const pageTab = Array.from(el.shadowRoot!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Page',
    );
    pageTab?.click();
    await nextTick();

    const unitSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
      '[aria-label="Element position/size unit"]',
    );
    expect(unitSelect?.value).toBe('px');
    unitSelect!.value = '%';
    unitSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(el.getTemplate?.()?.layoutUnit).toBe('%');
    const after = el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
      elements: Array<{ x: number; y: number; w: number; h: number }>;
    };
    // A4 portrait content width in px (geometry.ts's mm->px, 96/25.4) is
    // ~793.7 — a field element added at x:0 stays 0% regardless of basis.
    expect(after.elements[0]?.x).toBe(0);
    // width converts to a real percentage of that basis (not left as raw px).
    expect(after.elements[0]?.w).toBeGreaterThan(0);
    expect(after.elements[0]?.w).toBeLessThan(100);

    // ElementProps' Position legend reflects the new unit once selected.
    const elementBtn = Array.from(el.shadowRoot!.querySelectorAll('[role="button"]')).find((b) =>
      b.getAttribute('aria-label')?.startsWith('Invoice # field'),
    ) as HTMLElement;
    elementBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(el.shadowRoot?.textContent).toContain('Position (%)');

    el.remove();
  });

  it('switching reportHeader to "stack" arrangement (memory.md D-029) migrates elements and routes new "+" adds into a row', async () => {
    const el = await mountWithEntitySelected();

    // Select the reportHeader band (its tab) to reach BandProps.
    const reportHeaderTab = Array.from(el.shadowRoot!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Report Header',
    );
    reportHeaderTab?.click();
    await nextTick();

    const arrangementSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
      '[aria-label="Band arrangement"]',
    );
    expect(arrangementSelect?.value).toBe('free');
    arrangementSelect!.value = 'stack';
    arrangementSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    const reportHeader = () =>
      el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
        arrangement?: string;
        elements: Array<{ row?: number; w: number; x: number }>;
      };
    expect(reportHeader().arrangement).toBe('stack');
    expect(el.shadowRoot?.textContent).toContain('Stacked');

    // The palette "+" now routes through the stack constructor: row assigned,
    // width a plain percentage (100, not a leftover px value like 240).
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Invoice # to report header"]')!
      .click();
    await nextTick();
    expect(reportHeader().elements).toHaveLength(1);
    expect(reportHeader().elements[0]?.row).toBe(0);
    expect(reportHeader().elements[0]?.w).toBe(100);

    // Switching back to 'free' migrates it back to real x/y (row cleared).
    arrangementSelect!.value = 'free';
    arrangementSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(reportHeader().arrangement).toBe('free');
    expect(reportHeader().elements[0]?.row).toBeUndefined();

    el.remove();
  });

  it('switching reportHeader to "grid" arrangement (memory.md D-034) migrates elements and routes new "+" adds into a cell', async () => {
    const el = await mountWithEntitySelected();

    const reportHeaderTab = Array.from(el.shadowRoot!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Report Header',
    );
    reportHeaderTab?.click();
    await nextTick();

    const arrangementSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
      '[aria-label="Band arrangement"]',
    );
    expect(arrangementSelect?.value).toBe('free');
    arrangementSelect!.value = 'grid';
    arrangementSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    const reportHeader = () =>
      el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
        arrangement?: string;
        gridColumns?: number[];
        elements: Array<{ row?: number; col?: number; colSpan?: number }>;
      };
    expect(reportHeader().arrangement).toBe('grid');
    expect(reportHeader().gridColumns).toStrictEqual([100]);
    expect(el.shadowRoot?.textContent).toContain('Grid');

    // The palette "+" now routes through nextGridCell: lands at row 0, col 0
    // of the single default column.
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Invoice # to report header"]')!
      .click();
    await nextTick();
    expect(reportHeader().elements).toHaveLength(1);
    expect(reportHeader().elements[0]).toMatchObject({ row: 0, col: 0, colSpan: 1 });

    // A second "+" add (same field, fixture only has one) lands in the next
    // row — col 0 of row 0 is now occupied.
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add Invoice # to report header"]')!
      .click();
    await nextTick();
    expect(reportHeader().elements).toHaveLength(2);
    expect(reportHeader().elements[1]).toMatchObject({ row: 1, col: 0 });

    // Switching back to 'free' migrates it back to real x/y (col/row cleared).
    arrangementSelect!.value = 'free';
    arrangementSelect!.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(reportHeader().arrangement).toBe('free');
    expect(reportHeader().elements[0]?.row).toBeUndefined();
    expect(reportHeader().elements[0]?.col).toBeUndefined();

    el.remove();
  });

  it('toggling "Row borders" off on the detail band sets DetailBand.cellBorder to "none"', async () => {
    const el = await mountWithEntitySelected();

    const detailTab = Array.from(el.shadowRoot!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Detail (line items)',
    );
    expect(detailTab).toBeTruthy();
    detailTab!.click();
    await nextTick();

    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>(
      '.dd-band-props input[type="checkbox"]',
    );
    expect(toggle).toBeTruthy();
    expect(toggle!.checked).toBe(true); // on by default (today's row-border look)

    toggle!.click();
    await nextTick();

    const detail = () => el.getTemplate?.()?.bands.find((b) => b.type === 'detail') as { cellBorder?: string };
    expect(detail().cellBorder).toBe('none');

    toggle!.click();
    await nextTick();
    expect(detail().cellBorder).toBeUndefined();

    el.remove();
  });

  it('adding a "2 columns" Section (memory.md D-037/D-048) converts reportHeader to grid and adds a row of 2 empty cells, with its own independent column layout', async () => {
    const el = await mountWithEntitySelected();

    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add 2 columns section to report header"]')!
      .click();
    await nextTick();

    const reportHeader = () =>
      el.getTemplate?.()?.bands.find((b) => b.id === 'reportHeader') as {
        arrangement?: string;
        gridColumns?: number[];
        sectionColumns?: Record<number, number[]>;
        elements: Array<{ row?: number; col?: number }>;
      };
    expect(reportHeader().arrangement).toBe('grid');
    expect(reportHeader().sectionColumns?.[0]).toStrictEqual([50, 50]);
    expect(reportHeader().elements).toHaveLength(2);
    expect(reportHeader().elements[0]).toMatchObject({ row: 0, col: 0 });
    expect(reportHeader().elements[1]).toMatchObject({ row: 0, col: 1 });

    // Adding a second section appends another row with its OWN column
    // layout (memory.md D-048) — the first section's [50, 50] is untouched.
    el.shadowRoot!
      .querySelector<HTMLButtonElement>('[aria-label="Add 1 column section to report header"]')!
      .click();
    await nextTick();
    expect(reportHeader().sectionColumns?.[0]).toStrictEqual([50, 50]);
    expect(reportHeader().sectionColumns?.[1]).toStrictEqual([100]);
    expect(reportHeader().elements).toHaveLength(3);
    expect(reportHeader().elements[2]).toMatchObject({ row: 1, col: 0 });

    el.remove();
  });

  it('theme editor: editing a brand color applies it live, and saving/re-applying round-trips it (memory.md D-032)', async () => {
    const el = mountWithAdapter();
    await nextTick();

    const themeTrigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Brand theme"]');
    expect(themeTrigger?.disabled).toBe(false);
    // A plain `.click()` here (the pattern used elsewhere in this file)
    // doesn't reliably open this particular trigger under jsdom — its
    // button has an <Icon> SVG child, unlike TemplateList's plain-text
    // trigger, and jsdom's native `.click()` appears to build a
    // composedPath that the window-level "close on outside click" handler
    // then treats as outside, closing the popover it just opened.
    // `fireEvent.click()` (a real MouseEvent) doesn't hit this.
    await fireEvent.click(themeTrigger!);

    const accentInput = el.shadowRoot!.querySelector<HTMLInputElement>('[aria-label="Accent"]');
    expect(accentInput).toBeTruthy();
    accentInput!.value = '#00ff00';
    accentInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    // Applied live as an inline style on the shadow root (design.md §13).
    const root = el.shadowRoot!.querySelector<HTMLElement>('.dd-root');
    expect(root?.style.getPropertyValue('--dd-accent')).toBe('#00ff00');

    const popover = el.shadowRoot!.querySelector('.dd-theme-list-popover') as HTMLElement;
    const nameInput = popover.querySelector<HTMLInputElement>('[aria-label="New theme name"]');
    nameInput!.value = 'My Brand';
    nameInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    Array.from(popover.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Save')
      ?.click();
    await nextTick();

    expect(popover.textContent).toContain('My Brand');

    // Reset, then re-apply the saved theme to confirm it round-trips.
    Array.from(popover.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reset to default')
      ?.click();
    await nextTick();
    expect(root?.style.getPropertyValue('--dd-accent')).toBe('');

    Array.from(popover.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'My Brand')
      ?.click();
    await nextTick();
    expect(root?.style.getPropertyValue('--dd-accent')).toBe('#00ff00');

    el.remove();
  });

  it('theme editor is disabled when the host supplies config.theme directly', async () => {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter: new StaticAdapter({ entities: [] }), theme: { '--dd-accent': '#123456' } };
    document.body.appendChild(el);
    await nextTick();

    const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Brand theme"]');
    expect(trigger?.disabled).toBe(true);
    const root = el.shadowRoot!.querySelector<HTMLElement>('.dd-root');
    expect(root?.style.getPropertyValue('--dd-accent')).toBe('#123456');

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
