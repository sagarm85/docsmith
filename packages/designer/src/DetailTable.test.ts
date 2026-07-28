import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { StaticAdapter } from '@docsmith/adapters';
import type { DetailBand } from '@docsmith/core';
import DetailTable from './DetailTable.svelte';

// Must respect the requested MIME type (like a real DataTransfer, which returns
// '' for any type that wasn't set) since DetailTable.svelte probes for
// 'application/x-doc-block' before 'application/x-doc-field'.
function fakeDataTransfer(type: string, payload: unknown) {
  return { getData: (t: string) => (t === type ? JSON.stringify(payload) : '') };
}

function emptyDetailBand(): DetailBand {
  return { id: 'detail', type: 'detail', datasetId: 'invoice_items', columns: [], keepRowTogether: true };
}

function filledDetailBand(): DetailBand {
  return {
    id: 'detail',
    type: 'detail',
    datasetId: 'invoice_items',
    keepRowTogether: true,
    columns: [
      { column: 'description', header: 'Description', width: 200, align: 'left', format: 'text' },
      { column: 'qty', header: 'Qty', width: 60, align: 'right', format: 'number' },
    ],
  };
}

function adapterWithSample() {
  return new StaticAdapter({
    entities: [
      {
        meta: { name: 'invoice', label: 'Invoice' },
        headerFields: [],
        datasets: [{ meta: { id: 'invoice_items', label: 'Line items' }, fields: [] }],
        documents: {
          '1001': {
            header: {},
            datasets: {
              invoice_items: [
                { description: 'Widget', qty: 3 },
                { description: 'Gadget', qty: 1 },
              ],
            },
          },
        },
      },
    ],
  });
}

describe('DetailTable', () => {
  it('shows the empty hint with no columns', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(DetailTable, {
      props: {
        band: emptyDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns: vi.fn(),
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });
    expect(screen.getByText(/Drag line-item fields here/)).toBeTruthy();
  });

  it('accepts a matching dataset-field drop and appends a column', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onAddColumn = vi.fn();
    render(DetailTable, {
      props: {
        band: emptyDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn,
        onUpdateColumns: vi.fn(),
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    const dropzone = screen.getByRole('group', { name: 'Detail band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'dataset',
        datasetId: 'invoice_items',
        column: 'qty',
        type: 'int',
        label: 'Qty',
        format: 'number',
      }),
    });

    expect(onAddColumn).toHaveBeenCalledWith({
      column: 'qty',
      header: 'Qty',
      width: 100,
      align: 'right',
      format: 'number',
    });
  });

  it('rejects a header-field drop and a wrong-dataset drop', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onAddColumn = vi.fn();
    const onInvalidDrop = vi.fn();
    render(DetailTable, {
      props: {
        band: emptyDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn,
        onUpdateColumns: vi.fn(),
        onInvalidDrop,
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });
    const dropzone = screen.getByRole('group', { name: 'Detail band' });

    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'header',
        datasetId: null,
        column: 'invoice_number',
        type: 'text',
        label: 'Invoice #',
        format: 'text',
      }),
    });
    expect(onInvalidDrop).toHaveBeenCalledWith(
      'Header fields can’t become table columns — drop them on a header or totals band instead.',
    );

    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'dataset',
        datasetId: 'shipments',
        column: 'tracking',
        type: 'text',
        label: 'Tracking',
        format: 'text',
      }),
    });
    expect(onInvalidDrop).toHaveBeenCalledWith('That field belongs to a different dataset than this table.');
    expect(onAddColumn).not.toHaveBeenCalled();
  });

  it('rejects a block drop — blocks are free-form-only, never table columns', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onAddColumn = vi.fn();
    const onInvalidDrop = vi.fn();
    render(DetailTable, {
      props: {
        band: emptyDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn,
        onUpdateColumns: vi.fn(),
        onInvalidDrop,
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await fireEvent.drop(screen.getByRole('group', { name: 'Detail band' }), {
      dataTransfer: fakeDataTransfer('application/x-doc-block', { kind: 'text' }),
    });
    expect(onInvalidDrop).toHaveBeenCalledWith(
      'Blocks (text/image/line/box) can only go on a header, totals, or page band.',
    );
    expect(onAddColumn).not.toHaveBeenCalled();
  });

  it('removes a column', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onUpdateColumns = vi.fn();
    render(DetailTable, {
      props: {
        band: filledDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns,
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Remove Qty column' }));
    expect(onUpdateColumns).toHaveBeenCalledWith([
      { column: 'description', header: 'Description', width: 200, align: 'left', format: 'text' },
    ]);
  });

  it('updates a column format via its inline control', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onUpdateColumns = vi.fn();
    render(DetailTable, {
      props: {
        band: filledDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns,
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await fireEvent.change(screen.getByLabelText('Description format'), {
      target: { value: 'number' },
    });
    expect(onUpdateColumns).toHaveBeenCalledWith([
      { column: 'description', header: 'Description', width: 200, align: 'left', format: 'number' },
      { column: 'qty', header: 'Qty', width: 60, align: 'right', format: 'number' },
    ]);
  });

  it('shows real sample rows from listSampleIds → fetchDocument', async () => {
    const adapter = adapterWithSample();
    render(DetailTable, {
      props: {
        band: filledDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns: vi.fn(),
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await waitFor(() => expect(screen.getByText('Widget')).toBeTruthy());
    expect(screen.getByText('Gadget')).toBeTruthy();
  });

  it('shows a tfoot with the real sample-row aggregate when a column has one configured', async () => {
    const adapter = adapterWithSample();
    const band: DetailBand = {
      ...filledDetailBand(),
      aggregates: [{ column: 'qty', fn: 'sum', into: 'tfoot' }],
    };
    render(DetailTable, {
      props: {
        band,
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns: vi.fn(),
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await waitFor(() => expect(screen.getByText('Widget')).toBeTruthy());
    // Real sample rows are qty 3 + qty 1 = 4 — never a fabricated total.
    const tfoot = document.querySelector('tfoot');
    expect(tfoot?.textContent).toContain('4');
  });

  it('shows no tfoot when the band has no aggregates configured', async () => {
    const adapter = adapterWithSample();
    render(DetailTable, {
      props: {
        band: filledDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns: vi.fn(),
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await waitFor(() => expect(screen.getByText('Widget')).toBeTruthy());
    expect(document.querySelector('tfoot')).toBeNull();
  });

  it('shows an honest hint when the adapter has no sample-id support', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    // StaticAdapter.listSampleIds is a prototype method — shadow it with an own
    // `undefined` property to simulate an adapter that never implemented it
    // (the interface marks it optional).
    (adapter as unknown as { listSampleIds?: unknown }).listSampleIds = undefined;
    render(DetailTable, {
      props: {
        band: filledDetailBand(),
        adapter,
        entity: 'invoice',
        onAddColumn: vi.fn(),
        onUpdateColumns: vi.fn(),
        onInvalidDrop: vi.fn(),
        onSelectColumn: vi.fn(),
        onSelectBand: vi.fn(),
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/doesn't support sample rows/)).toBeTruthy(),
    );
  });
});
