import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import type { FreeBand, FreeElement } from '@docsmith/core';
import GridBand from './GridBand.svelte';

// jsdom has no real DataTransfer — fake just the getData() surface GridBand.svelte
// actually reads, same pattern as StackBand.test.ts/Band.test.ts.
function fakeDataTransfer(type: string, payload: unknown) {
  return { getData: (t: string) => (t === type ? JSON.stringify(payload) : '') };
}

function emptyBand(): FreeBand {
  return { id: 'reportHeader', type: 'reportHeader', height: 140, arrangement: 'grid', gridColumns: [60, 40], elements: [] };
}

function filledBand(): FreeBand {
  return {
    id: 'reportHeader',
    type: 'reportHeader',
    height: 140,
    arrangement: 'grid',
    gridColumns: [60, 40],
    gridBorder: '1px solid #1a1c22',
    elements: [
      { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Seller', row: 0, col: 0, colSpan: 2 },
      { id: 'b', kind: 'field', x: 0, y: 0, w: 0, h: 0, row: 1, col: 0, label: 'Invoice #', binding: { source: 'header', column: 'invoice_number', format: 'text' } },
      { id: 'c', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: '', row: 1, col: 1 },
    ] as FreeElement[],
  };
}

function callbacks() {
  return {
    onUpdateElements: vi.fn(),
    onInvalidDrop: vi.fn(),
    onSelectElement: vi.fn(),
    onSelectBand: vi.fn(),
    onDeselect: vi.fn(),
    onElementDelete: vi.fn(),
    onElementDuplicate: vi.fn(),
    onElementEditText: vi.fn(),
  };
}

// Minimal fake adapter (just the one method the click-to-add picker reads,
// memory.md D-047) — a full StaticAdapter isn't needed for these tests.
function fakeAdapter(fields: Array<{ name: string; label: string; type: string; kind: 'system' | 'custom' }>) {
  return {
    listEntities: vi.fn(),
    getFields: vi.fn().mockResolvedValue(fields),
    getRelatedDatasets: vi.fn(),
    getDatasetFields: vi.fn(),
    fetchDocument: vi.fn(),
  };
}

describe('GridBand', () => {
  it('shows the empty hint when it has no rows', () => {
    render(GridBand, { props: { band: emptyBand(), ...callbacks() } });
    expect(screen.getByText(/Add a row/)).toBeTruthy();
  });

  it('renders a spanning cell and leaves gap columns as empty placeholders', () => {
    render(GridBand, { props: { band: filledBand(), ...callbacks() } });
    expect(screen.getByText('Seller')).toBeTruthy();
    expect(screen.getByText('Invoice #')).toBeTruthy();
    // Row 1, col 1 is a real-but-empty text placeholder ('c') — rendered as
    // the same dashed "Drop a field here" ghost as a truly absent cell.
    expect(screen.getAllByText('Drop a field here')).toHaveLength(1);
  });

  it('clicking a filled cell selects its element', async () => {
    const cb = callbacks();
    render(GridBand, { props: { band: filledBand(), ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: /Invoice #/ }));
    expect(cb.onSelectElement).toHaveBeenCalledWith('b');
  });

  it('clicking Duplicate/Delete on the selected cell calls the right callback', async () => {
    const cb = callbacks();
    render(GridBand, { props: { band: filledBand(), selectedElementId: 'b', ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(cb.onElementDuplicate).toHaveBeenCalledWith('b');
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(cb.onElementDelete).toHaveBeenCalledWith('b');
  });

  it('double-click on a text cell enters edit mode; blur commits via onElementEditText', async () => {
    const cb = callbacks();
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      arrangement: 'grid',
      gridColumns: [100],
      elements: [{ id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Hello', row: 0, col: 0 }],
    };
    render(GridBand, { props: { band, ...cb } });
    await fireEvent.dblClick(screen.getByText('Hello'));
    const editable = screen.getByRole('textbox');
    editable.textContent = 'Updated';
    await fireEvent.blur(editable);
    expect(cb.onElementEditText).toHaveBeenCalledWith('a', 'Updated');
  });

  it('dropping a header field on a truly-empty cell creates a new element there', async () => {
    const cb = callbacks();
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      arrangement: 'grid',
      gridColumns: [60, 40],
      elements: [{ id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Seller', row: 0, col: 0 }],
    };
    render(GridBand, { props: { band, ...cb } });
    const emptyCell = screen.getByText('Drop a field here');
    await fireEvent.drop(emptyCell, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'header',
        datasetId: null,
        column: 'invoice_number',
        type: 'text',
        label: 'Invoice #',
        format: 'text',
      }),
    });
    expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
    const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
    expect(elements).toHaveLength(2);
    const added = elements.find((e) => e.label === 'Invoice #');
    expect(added).toMatchObject({ row: 0, col: 1 });
  });

  it('dropping a header field onto an already-filled (non-placeholder) cell appends/stacks it instead of replacing (memory.md D-045)', async () => {
    const cb = callbacks();
    render(GridBand, { props: { band: filledBand(), ...cb } });
    await fireEvent.drop(screen.getByRole('button', { name: /Invoice #/ }), {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'header',
        datasetId: null,
        column: 'due_at',
        type: 'date',
        label: 'Due at',
        format: 'date',
      }),
    });
    expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
    const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
    expect(elements).toHaveLength(4); // appended, original 'b' kept
    expect(elements.some((e) => e.id === 'b')).toBe(true);
    const added = elements.find((e) => e.label === 'Due at');
    expect(added).toMatchObject({ row: 1, col: 0 });
  });

  it('dropping a header field onto a lone placeholder cell still replaces it in place (memory.md D-034/D-043/D-045)', async () => {
    const cb = callbacks();
    // filledBand()'s row 1/col 1 ('c') is a real placeholder (text:'').
    render(GridBand, { props: { band: filledBand(), ...cb } });
    const emptyCell = document.querySelector('.dd-grid-cell--empty')!;
    await fireEvent.drop(emptyCell, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'header',
        datasetId: null,
        column: 'due_at',
        type: 'date',
        label: 'Due at',
        format: 'date',
      }),
    });
    expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
    const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
    expect(elements).toHaveLength(3); // replaced the placeholder, not appended
    expect(elements.some((e) => e.id === 'c')).toBe(false);
    const replaced = elements.find((e) => e.label === 'Due at');
    expect(replaced).toMatchObject({ row: 1, col: 1 });
  });

  it('stacks multiple elements dropped into the same cell, each independently selectable (memory.md D-045)', async () => {
    const cb = callbacks();
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      arrangement: 'grid',
      gridColumns: [100],
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Line one', row: 0, col: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Line two', row: 0, col: 0 },
      ],
    };
    render(GridBand, { props: { band, ...cb } });
    expect(screen.getByText('Line one')).toBeTruthy();
    expect(screen.getByText('Line two')).toBeTruthy();

    await fireEvent.click(screen.getByText('Line two'));
    expect(cb.onSelectElement).toHaveBeenCalledWith('b');
  });

  it('rejects a dataset-field drop — grid bands are free-form-only content, same rule as Band.svelte/StackBand.svelte', async () => {
    const cb = callbacks();
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      arrangement: 'grid',
      gridColumns: [100],
      elements: [{ id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: '', row: 0, col: 0 }],
    };
    render(GridBand, { props: { band, ...cb } });
    await fireEvent.drop(screen.getByText('Drop a field here'), {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'dataset',
        datasetId: 'invoice_items',
        column: 'description',
        type: 'text',
        label: 'Description',
        format: 'text',
      }),
    });
    expect(cb.onInvalidDrop).toHaveBeenCalledWith('Line-item fields can only go in the items table.');
    expect(cb.onUpdateElements).not.toHaveBeenCalled();
  });

  it('"Add row" appends an empty placeholder starting a new row', async () => {
    const cb = callbacks();
    render(GridBand, { props: { band: filledBand(), ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
    const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
    const added = elements[elements.length - 1];
    expect(added).toMatchObject({ row: 2, col: 0, kind: 'text', text: '' });
  });

  it('a placeholder cell (from a Section/"Add row") shows a Delete row button that removes it (memory.md D-043)', async () => {
    const cb = callbacks();
    // filledBand()'s row 1/col 1 ('c') is a real placeholder (text:'') — a
    // genuinely-absent gap cell (no backing element) would show no button.
    // The button is only revealed via CSS :hover/:focus-within (no jsdom
    // real hover simulation), so query past that visibility filter, same
    // as Band.test.ts's direct `.dd-align-guide` queries for ephemeral
    // drag-only UI.
    render(GridBand, { props: { band: filledBand(), ...cb } });
    const deleteBtn = document.querySelector<HTMLButtonElement>('[aria-label="Delete row"]');
    expect(deleteBtn).toBeTruthy();
    await fireEvent.click(deleteBtn!);
    expect(cb.onElementDelete).toHaveBeenCalledWith('c');
  });

  it('dragging a column divider live-reports the row index + two adjacent widths and batches the gesture (memory.md D-044/D-048)', () => {
    const onGridColumnsChange = vi.fn();
    const onColumnResizeStart = vi.fn();
    const onColumnResizeEnd = vi.fn();
    render(GridBand, {
      props: { band: filledBand(), ...callbacks(), onGridColumnsChange, onColumnResizeStart, onColumnResizeEnd },
    });

    // filledBand()'s row 1 ("Invoice #" | "Date") uses the band's own
    // gridColumns [60, 40] (no sectionColumns override) — resize its own
    // section-scoped wrap, not the whole band.
    const handle = screen.getByRole('button', { name: 'Resize column 1 in section 2' });
    const wrap = handle.closest('.dd-grid-row-wrap') as HTMLElement;
    vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue({ width: 400 } as DOMRect);

    handle.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
    expect(onColumnResizeStart).toHaveBeenCalledTimes(1);

    // gridColumns [60, 40]; +40px of a 400px-wide wrap is +10% → [70, 30].
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140 }));
    expect(onGridColumnsChange).toHaveBeenLastCalledWith(1, [70, 30]);
    expect(onColumnResizeEnd).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(onColumnResizeEnd).toHaveBeenCalledTimes(1);
  });

  it('clamps a column divider drag so neither adjacent column shrinks below the minimum (memory.md D-044)', () => {
    const onGridColumnsChange = vi.fn();
    render(GridBand, {
      props: { band: filledBand(), ...callbacks(), onGridColumnsChange },
    });

    const handle = screen.getByRole('button', { name: 'Resize column 1 in section 2' });
    const wrap = handle.closest('.dd-grid-row-wrap') as HTMLElement;
    vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue({ width: 400 } as DOMRect);

    handle.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
    // A huge rightward drag would push the right column below the 8% floor —
    // clamped so the pair (60 + 40 = 100) still sums to 100.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100 + 4000 }));
    expect(onGridColumnsChange).toHaveBeenLastCalledWith(1, [92, 8]);
  });

  it('two sections with different column layouts each get their own independent resize handles (memory.md D-048)', () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      arrangement: 'grid',
      gridColumns: [100],
      sectionColumns: { 0: [50, 50] },
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Left', row: 0, col: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Right', row: 0, col: 1 },
        { id: 'c', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Full width', row: 1, col: 0 },
      ],
    };
    const onGridColumnsChange = vi.fn();
    render(GridBand, { props: { band, ...callbacks(), onGridColumnsChange } });

    // Section 0 has 2 columns (1 boundary); section 1 (falling back to the
    // band's single-column gridColumns) has 0 boundaries — no handle at all.
    expect(screen.getByRole('button', { name: 'Resize column 1 in section 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /in section 2/ })).toBeNull();
  });

  describe('click-to-add inline picker (memory.md D-047)', () => {
    function invoiceFields() {
      return [
        { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' as const },
        { name: 'customer_name', label: 'Customer name', type: 'text', kind: 'system' as const },
      ];
    }

    // A single-row, single-column band with one real placeholder cell (the
    // same shape "Add row" produces) — an actually-empty CELL to click, not
    // the zero-rows "Add a row…" empty state.
    function bandWithOneEmptyRow(): FreeBand {
      return {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 140,
        arrangement: 'grid',
        gridColumns: [100],
        elements: [{ id: 'ph', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: '', row: 0, col: 0 }],
      };
    }

    it('without adapter/entity, an empty cell has no button role and just says "Drop a field here"', () => {
      render(GridBand, { props: { band: bandWithOneEmptyRow(), ...callbacks() } });
      const cell = screen.getByText(/Drop a field here/);
      expect(cell.closest('[role="button"]')).toBeNull();
    });

    it('clicking an empty cell (with adapter/entity) opens a picker listing header fields', async () => {
      const adapter = fakeAdapter(invoiceFields());
      render(GridBand, { props: { band: bandWithOneEmptyRow(), ...callbacks(), adapter, entity: 'invoice' } });

      await fireEvent.click(screen.getByRole('button', { name: /Add a field or text/ }));
      expect(adapter.getFields).toHaveBeenCalledWith('invoice');
      await waitFor(() => expect(screen.getByText('Invoice #')).toBeTruthy());
      expect(screen.getByText('Customer name')).toBeTruthy();
    });

    it('picking a field replaces the placeholder at that cell', async () => {
      const adapter = fakeAdapter(invoiceFields());
      const cb = callbacks();
      render(GridBand, { props: { band: bandWithOneEmptyRow(), ...cb, adapter, entity: 'invoice' } });

      await fireEvent.click(screen.getByRole('button', { name: /Add a field or text/ }));
      await waitFor(() => expect(screen.getByText('Invoice #')).toBeTruthy());
      await fireEvent.click(screen.getByText('Invoice #'));

      expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
      const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
      expect(elements).toHaveLength(1); // replaced the placeholder, not appended
      expect(elements[0]).toMatchObject({
        kind: 'field',
        row: 0,
        col: 0,
        binding: { source: 'header', column: 'invoice_number' },
      });
    });

    it('"Type your own text" replaces the placeholder with a text element and enters edit mode immediately', async () => {
      const adapter = fakeAdapter(invoiceFields());
      const cb = callbacks();
      render(GridBand, { props: { band: bandWithOneEmptyRow(), ...cb, adapter, entity: 'invoice' } });

      await fireEvent.click(screen.getByRole('button', { name: /Add a field or text/ }));
      await fireEvent.click(screen.getByRole('button', { name: 'Type your own text' }));

      expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
      const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({ kind: 'text', text: 'Text', row: 0, col: 0 });
    });

    it('searching filters the field list', async () => {
      const adapter = fakeAdapter(invoiceFields());
      render(GridBand, { props: { band: bandWithOneEmptyRow(), ...callbacks(), adapter, entity: 'invoice' } });

      await fireEvent.click(screen.getByRole('button', { name: /Add a field or text/ }));
      await waitFor(() => expect(screen.getByText('Invoice #')).toBeTruthy());

      await fireEvent.input(screen.getByPlaceholderText('Search fields…'), { target: { value: 'customer' } });
      expect(screen.queryByText('Invoice #')).toBeNull();
      expect(screen.getByText('Customer name')).toBeTruthy();
    });

    it('clicking outside the picker closes it', async () => {
      const adapter = fakeAdapter(invoiceFields());
      render(GridBand, { props: { band: bandWithOneEmptyRow(), ...callbacks(), adapter, entity: 'invoice' } });

      await fireEvent.click(screen.getByRole('button', { name: /Add a field or text/ }));
      await waitFor(() => expect(screen.getByText('Invoice #')).toBeTruthy());

      await fireEvent.click(document.body);
      expect(screen.queryByText('Invoice #')).toBeNull();
    });
  });

  describe('section hover toolbar (memory.md D-049)', () => {
    it('"Change layout" opens a preset popover; picking one calls onSectionLayoutChange', async () => {
      const onSectionLayoutChange = vi.fn();
      render(GridBand, {
        props: { band: filledBand(), ...callbacks(), onSectionLayoutChange },
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Change layout for section 1' }));
      expect(screen.getByRole('menuitem', { name: '1 column' })).toBeTruthy();

      await fireEvent.click(screen.getByRole('menuitem', { name: 'Large + small' }));
      expect(onSectionLayoutChange).toHaveBeenCalledWith(0, [65, 35]);
    });

    it('marks the currently-matching preset as active in the popover', async () => {
      render(GridBand, {
        props: { band: filledBand(), ...callbacks(), onSectionLayoutChange: vi.fn() },
      });

      // filledBand()'s row 1 uses gridColumns [60, 40] — not an exact
      // SECTION_PRESETS match, so nothing should be marked active there.
      await fireEvent.click(screen.getByRole('button', { name: 'Change layout for section 2' }));
      const options = screen.getAllByRole('menuitem');
      expect(options.every((o) => !o.className.includes('active'))).toBe(true);
    });

    it('"Duplicate section" copies every element in that row into a new row with the same columns', async () => {
      const onDuplicateSection = vi.fn();
      render(GridBand, {
        props: { band: filledBand(), ...callbacks(), onDuplicateSection },
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Duplicate section 2' }));
      expect(onDuplicateSection).toHaveBeenCalledWith(1);
    });

    it('"Delete section" removes the whole row at once', async () => {
      const onDeleteSection = vi.fn();
      render(GridBand, {
        props: { band: filledBand(), ...callbacks(), onDeleteSection },
      });

      await fireEvent.click(screen.getByRole('button', { name: 'Delete section 2' }));
      expect(onDeleteSection).toHaveBeenCalledWith(1);
    });

    it('the toolbar is absent entirely when no section-toolbar callbacks are supplied', () => {
      render(GridBand, { props: { band: filledBand(), ...callbacks() } });
      expect(screen.queryByRole('button', { name: /Change layout|Duplicate section|Delete section/ })).toBeNull();
    });
  });

  describe('split handle for wide cells (memory.md D-050)', () => {
    it('splits a colSpan-2 cell into two: the original shrinks, a new placeholder fills the freed column', async () => {
      const cb = callbacks();
      // filledBand()'s row 0 ("Seller") spans both columns.
      render(GridBand, { props: { band: filledBand(), ...cb } });

      const handle = document.querySelector<HTMLButtonElement>("[aria-label=\"Split section 1's wide cell into two\"]");
      expect(handle).toBeTruthy();
      await fireEvent.click(handle!);

      expect(cb.onUpdateElements).toHaveBeenCalledTimes(1);
      const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
      const seller = elements.find((e) => e.id === 'a');
      expect(seller).toMatchObject({ colSpan: 1 }); // 2 -> floor(2/2) = 1
      const newPlaceholder = elements.find((e) => e.row === 0 && e.col === 1 && e.id !== 'a');
      expect(newPlaceholder).toMatchObject({ kind: 'text', text: '', row: 0, col: 1 });
    });

    it('has no split handle on a single-column (colSpan 1) cell', () => {
      render(GridBand, { props: { band: filledBand(), ...callbacks() } });
      // filledBand()'s row 1 cells ("Invoice #", the col:1 placeholder) are
      // both colSpan 1 — no split handle should exist for either.
      expect(document.querySelectorAll('.dd-split-handle')).toHaveLength(1); // only "Seller"
    });
  });
});
