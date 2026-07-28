import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { FreeBand, FreeElement } from '@docsmith/core';
import StackBand from './StackBand.svelte';

// jsdom has no real DataTransfer — fake just the getData()/setData() surface
// StackBand.svelte actually reads, same pattern as Band.test.ts/DetailTable.test.ts.
function fakeDataTransfer(type: string, payload: unknown) {
  return { getData: (t: string) => (t === type ? JSON.stringify(payload) : '') };
}

// The row-reorder payload is a plain string (`String(rowIndex)`), not JSON —
// unlike the field/block chip payloads above.
function fakeRawDataTransfer(type: string, raw: string) {
  return { getData: (t: string) => (t === type ? raw : '') };
}

function emptyBand(): FreeBand {
  return { id: 'reportHeader', type: 'reportHeader', height: 140, arrangement: 'stack', elements: [] };
}

function filledBand(): FreeBand {
  return {
    id: 'reportHeader',
    type: 'reportHeader',
    height: 140,
    arrangement: 'stack',
    elements: [
      { id: 'a', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Left', row: 0 },
      { id: 'b', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Right', row: 0 },
      { id: 'c', kind: 'field', x: 0, y: 0, w: 100, h: 18, label: 'Invoice #', binding: { source: 'header', column: 'invoice_number', format: 'text' } },
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

describe('StackBand', () => {
  it('shows the empty hint when it has no elements', () => {
    render(StackBand, { props: { band: emptyBand(), ...callbacks() } });
    expect(screen.getByText(/Drag header fields here/)).toBeTruthy();
  });

  it('groups elements sharing a row side by side, and gives a rowless element its own row', () => {
    render(StackBand, { props: { band: filledBand(), ...callbacks() } });
    expect(document.querySelectorAll('.dd-stack-row').length).toBe(2);
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('Right')).toBeTruthy();
    expect(screen.getByText('Invoice #')).toBeTruthy();
  });

  it('clicking an element selects it', async () => {
    const cb = callbacks();
    render(StackBand, { props: { band: filledBand(), ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: /^“Left”/ }));
    expect(cb.onSelectElement).toHaveBeenCalledWith('a');
  });

  it('clicking Duplicate/Delete on the selected element calls the right callback without re-selecting it', async () => {
    // The action buttons are hover/focus/selected-only (CSS display:none
    // otherwise) — mark 'a' selected so they're actually visible to query,
    // the same way a real selected element reveals them without a hover.
    const cb = callbacks();
    render(StackBand, { props: { band: filledBand(), selectedElementId: 'a', ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(cb.onElementDuplicate).toHaveBeenCalledWith('a');
    expect(cb.onSelectElement).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(cb.onElementDelete).toHaveBeenCalledWith('a');
  });

  it('double-click on a text element enters edit mode; blur commits via onElementEditText', async () => {
    const cb = callbacks();
    render(StackBand, { props: { band: filledBand(), ...cb } });
    const el = screen.getByRole('button', { name: /^“Left”/ });
    await fireEvent.dblClick(el);
    const editable = screen.getByRole('textbox');
    editable.textContent = 'Updated';
    await fireEvent.blur(editable);
    expect(cb.onElementEditText).toHaveBeenCalledWith('a', 'Updated');
  });

  it('dropping a header field on empty band space creates a new full-width row', async () => {
    const cb = callbacks();
    render(StackBand, { props: { band: emptyBand(), ...cb } });
    const body = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(body, {
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
    expect(elements).toHaveLength(1);
    expect(elements[0]?.row).toBe(0);
    expect(elements[0]?.w).toBe(100);
  });

  it('dropping a header field onto an existing row merges it into that row', async () => {
    const cb = callbacks();
    const band = filledBand();
    render(StackBand, { props: { band, ...cb } });
    const rows = document.querySelectorAll('.dd-stack-row');
    await fireEvent.drop(rows[0]!, {
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
    // Row 0 now has 3 elements (Left, Right, Due at); row 1 (the field) unchanged.
    expect(elements.filter((e) => e.row === 0)).toHaveLength(3);
    expect(elements.some((e) => e.label === 'Due at')).toBe(true);
  });

  it('rejects a dataset-field drop — stack bands are free-form-only content, same rule as Band.svelte', async () => {
    const cb = callbacks();
    render(StackBand, { props: { band: emptyBand(), ...cb } });
    const body = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(body, {
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

  it('dropping a block (e.g. box) creates a new row with that block', async () => {
    const cb = callbacks();
    render(StackBand, { props: { band: emptyBand(), ...cb } });
    const body = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(body, {
      dataTransfer: fakeDataTransfer('application/x-doc-block', { kind: 'box' }),
    });
    const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
    expect(elements[0]?.kind).toBe('box');
  });

  it('reordering rows via the drag handle moves a row to a new position', async () => {
    const cb = callbacks();
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      arrangement: 'stack',
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 100, h: 20, text: 'First', row: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 100, h: 20, text: 'Second', row: 1 },
      ],
    };
    render(StackBand, { props: { band, ...cb } });
    const handles = screen.getAllByRole('button', { name: /Reorder row/ });
    const rows = document.querySelectorAll('.dd-stack-row');

    const setData = vi.fn();
    await fireEvent.dragStart(handles[1]!, { dataTransfer: { setData, effectAllowed: '' } as unknown as DataTransfer });
    expect(setData).toHaveBeenCalledWith('application/x-stack-row-index', '1');

    await fireEvent.drop(rows[0]!, {
      dataTransfer: fakeRawDataTransfer('application/x-stack-row-index', '1') as unknown as DataTransfer,
    });
    const [elements] = cb.onUpdateElements.mock.calls[0] as [FreeElement[]];
    expect(elements[0]?.text).toBe('Second');
    expect(elements[1]?.text).toBe('First');
  });
});
