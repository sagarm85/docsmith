import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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

  it('dragging a column divider live-reports the two adjacent widths and batches the gesture (memory.md D-044)', () => {
    const onGridColumnsChange = vi.fn();
    const onColumnResizeStart = vi.fn();
    const onColumnResizeEnd = vi.fn();
    render(GridBand, {
      props: { band: filledBand(), ...callbacks(), onGridColumnsChange, onColumnResizeStart, onColumnResizeEnd },
    });

    const wrap = document.querySelector('.dd-grid-rows-wrap') as HTMLElement;
    vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue({ width: 400 } as DOMRect);

    const handle = screen.getByRole('button', { name: 'Resize column 1' });
    handle.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
    expect(onColumnResizeStart).toHaveBeenCalledTimes(1);

    // gridColumns [60, 40]; +40px of a 400px-wide wrap is +10% → [70, 30].
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140 }));
    expect(onGridColumnsChange).toHaveBeenLastCalledWith([70, 30]);
    expect(onColumnResizeEnd).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(onColumnResizeEnd).toHaveBeenCalledTimes(1);
  });

  it('clamps a column divider drag so neither adjacent column shrinks below the minimum (memory.md D-044)', () => {
    const onGridColumnsChange = vi.fn();
    render(GridBand, {
      props: { band: filledBand(), ...callbacks(), onGridColumnsChange },
    });

    const wrap = document.querySelector('.dd-grid-rows-wrap') as HTMLElement;
    vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue({ width: 400 } as DOMRect);

    const handle = screen.getByRole('button', { name: 'Resize column 1' });
    handle.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true }));
    // A huge rightward drag would push the right column below the 8% floor —
    // clamped so the pair (60 + 40 = 100) still sums to 100.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100 + 4000 }));
    expect(onGridColumnsChange).toHaveBeenLastCalledWith([92, 8]);
  });
});
