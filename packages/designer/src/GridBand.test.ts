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

  it('dropping a header field onto a filled cell replaces that element in place (same row/col)', async () => {
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
    expect(elements).toHaveLength(3); // replaced, not appended
    expect(elements.some((e) => e.id === 'b')).toBe(false);
    const replaced = elements.find((e) => e.label === 'Due at');
    expect(replaced).toMatchObject({ row: 1, col: 0 });
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
});
