import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { StaticAdapter } from '@docsmith/adapters';
import { newTemplate } from '@docsmith/core';
import Preview from './Preview.svelte';

function adapterWithDoc() {
  return new StaticAdapter({
    entities: [
      {
        meta: { name: 'invoice', label: 'Invoice' },
        headerFields: [],
        datasets: [{ meta: { id: 'invoice_items', label: 'Line items' }, fields: [] }],
        documents: {
          '1001': {
            header: { invoice_number: 'INV-1001' },
            datasets: { invoice_items: [{ description: 'Widget', qty: 3 }] },
          },
        },
      },
    ],
  });
}

function templateFor(entity: string) {
  const t = newTemplate('invoice', entity);
  return {
    ...t,
    dataSource: { ...t.dataSource, datasets: [{ id: 'invoice_items', label: 'Line items', kind: 'fk' as const, ref: { table: 'invoice_items', fkColumn: '' } }] },
    bands: t.bands.map((b) =>
      b.type === 'detail'
        ? {
            ...b,
            datasetId: 'invoice_items',
            columns: [{ column: 'description', header: 'Description', width: 200, align: 'left' as const, format: 'text' as const }],
          }
        : b,
    ),
  };
}

describe('Preview', () => {
  it('shows an honest hint when no entity is chosen', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Preview, { props: { template: newTemplate(), adapter, docId: '', onDocIdChange: vi.fn() } });
    expect(screen.getByText(/Choose an entity/)).toBeTruthy();
  });

  it('auto-selects the first sample id (via onDocIdChange) and renders the iframe once applied', async () => {
    const adapter = adapterWithDoc();
    const template = templateFor('invoice');
    const onDocIdChange = vi.fn();
    const { rerender, container } = render(Preview, {
      props: { template, adapter, docId: '', onDocIdChange },
    });

    // Preview is a controlled component — it reports the auto-selected id via
    // the callback but doesn't apply it itself; the parent (DocDesigner) does.
    await waitFor(() => expect(onDocIdChange).toHaveBeenCalledWith('1001'));
    await rerender({ template, adapter, docId: '1001', onDocIdChange });

    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('<thead>');
    expect(iframe.srcdoc).toContain('Widget');
    expect(iframe.srcdoc).toContain('@page');
  });

  it('lets free-text entry fetch a document when the adapter has no sample ids', async () => {
    const adapter = adapterWithDoc();
    (adapter as unknown as { listSampleIds?: unknown }).listSampleIds = undefined;
    const template = templateFor('invoice');
    const onDocIdChange = vi.fn();
    const { rerender, container } = render(Preview, {
      props: { template, adapter, docId: '', onDocIdChange },
    });

    expect(screen.getByText(/Enter or choose a document id/)).toBeTruthy();
    await fireEvent.input(screen.getByLabelText('Document id'), { target: { value: '1001' } });
    expect(onDocIdChange).toHaveBeenCalledWith('1001');
    await rerender({ template, adapter, docId: '1001', onDocIdChange });

    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Widget');
  });

  it('shows an error with Retry when fetchDocument rejects', async () => {
    const adapter = adapterWithDoc();
    const spy = vi.spyOn(adapter, 'fetchDocument').mockRejectedValueOnce(new Error('offline'));
    render(Preview, {
      props: { template: templateFor('invoice'), adapter, docId: '1001', onDocIdChange: vi.fn() },
    });

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('offline'));
    spy.mockRestore();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('shows an honest empty state for a missing document id (no fabricated rows)', async () => {
    const adapter = adapterWithDoc();
    (adapter as unknown as { listSampleIds?: unknown }).listSampleIds = undefined;
    const { container } = render(Preview, {
      props: {
        template: templateFor('invoice'),
        adapter,
        docId: 'does-not-exist',
        onDocIdChange: vi.fn(),
      },
    });

    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).not.toContain('Widget');
  });

  it('Print is disabled until a document has actually loaded', async () => {
    const adapter = adapterWithDoc();
    render(Preview, {
      props: { template: templateFor('invoice'), adapter, docId: '', onDocIdChange: vi.fn() },
    });
    const printBtn = screen.getByRole('button', { name: 'Print' });
    expect((printBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
