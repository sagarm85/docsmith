import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { FreeBand } from '@docsmith/core';
import Band from './Band.svelte';

// jsdom doesn't implement the DataTransfer/DragEvent APIs, so tests fake just the
// getData() surface Band.svelte actually reads — the standard pattern for testing
// native HTML5 DnD under jsdom.
function fakeDataTransfer(payload: unknown) {
  return { getData: () => JSON.stringify(payload) };
}

function emptyBand(type: FreeBand['type'] = 'reportHeader'): FreeBand {
  return { id: type, type, height: 140, elements: [] };
}

describe('Band', () => {
  it('shows the empty hint when it has no elements', () => {
    render(Band, { props: { band: emptyBand(), onAddElement: vi.fn(), onInvalidDrop: vi.fn() } });
    expect(screen.getByText(/Drag header fields here/)).toBeTruthy();
  });

  it('renders existing field elements as a {label} token', () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      elements: [
        {
          id: 'e1',
          kind: 'field',
          x: 0,
          y: 0,
          w: 200,
          h: 18,
          label: 'Invoice #',
          binding: { source: 'header', column: 'invoice_number', format: 'text' },
        },
      ],
    };
    render(Band, { props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn() } });
    expect(screen.getByText('{Invoice #}')).toBeTruthy();
  });

  it('accepts a header-field drop and appends a bound element', async () => {
    const onAddElement = vi.fn();
    render(Band, { props: { band: emptyBand(), onAddElement, onInvalidDrop: vi.fn() } });

    const dropzone = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer({
        cls: 'header',
        datasetId: null,
        column: 'invoice_number',
        type: 'text',
        label: 'Invoice #',
        format: 'text',
      }),
    });

    expect(onAddElement).toHaveBeenCalledTimes(1);
    const added = onAddElement.mock.calls[0]?.[0];
    expect(added).toMatchObject({
      kind: 'field',
      label: 'Invoice #',
      binding: { source: 'header', column: 'invoice_number', format: 'text' },
    });
  });

  it('rejects a dataset-field drop with an explanatory reason', async () => {
    const onAddElement = vi.fn();
    const onInvalidDrop = vi.fn();
    render(Band, { props: { band: emptyBand(), onAddElement, onInvalidDrop } });

    const dropzone = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer({
        cls: 'dataset',
        datasetId: 'invoice_items',
        column: 'qty',
        type: 'int',
        label: 'Qty',
        format: 'number',
      }),
    });

    expect(onAddElement).not.toHaveBeenCalled();
    expect(onInvalidDrop).toHaveBeenCalledWith('Line-item fields can only go in the items table.');
  });

  it('stacks a second added element below the first', () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      elements: [
        { id: 'e1', kind: 'field', x: 0, y: 0, w: 200, h: 18, label: 'A' },
        { id: 'e2', kind: 'field', x: 0, y: 24, w: 200, h: 18, label: 'B' },
      ],
    };
    render(Band, { props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn() } });
    expect(screen.getByText('{A}')).toBeTruthy();
    expect(screen.getByText('{B}')).toBeTruthy();
  });
});
