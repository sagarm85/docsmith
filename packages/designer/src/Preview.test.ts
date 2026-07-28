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
    render(Preview, { props: { template: newTemplate(), adapter } });
    expect(screen.getByText(/Choose an entity/)).toBeTruthy();
  });

  it('auto-selects the first sample id and renders the iframe from core.renderToHtml', async () => {
    const adapter = adapterWithDoc();
    const { container } = render(Preview, { props: { template: templateFor('invoice'), adapter } });

    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('<thead>');
    expect(iframe.srcdoc).toContain('Widget');
    expect(iframe.srcdoc).toContain('@page');
  });

  it('lets free-text entry fetch a document when the adapter has no sample ids', async () => {
    const adapter = adapterWithDoc();
    (adapter as unknown as { listSampleIds?: unknown }).listSampleIds = undefined;
    const { container } = render(Preview, { props: { template: templateFor('invoice'), adapter } });

    expect(screen.getByText(/Enter or choose a document id/)).toBeTruthy();
    await fireEvent.input(screen.getByLabelText('Document id'), { target: { value: '1001' } });

    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Widget');
  });

  it('shows an error with Retry when fetchDocument rejects', async () => {
    const adapter = adapterWithDoc();
    const spy = vi.spyOn(adapter, 'fetchDocument').mockRejectedValueOnce(new Error('offline'));
    render(Preview, { props: { template: templateFor('invoice'), adapter } });

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('offline'));
    spy.mockRestore();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('shows an honest empty state for a missing document id (no fabricated rows)', async () => {
    const adapter = adapterWithDoc();
    (adapter as unknown as { listSampleIds?: unknown }).listSampleIds = undefined;
    const { container } = render(Preview, { props: { template: templateFor('invoice'), adapter } });

    await fireEvent.input(screen.getByLabelText('Document id'), { target: { value: 'does-not-exist' } });
    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.srcdoc).not.toContain('Widget');
  });
});
