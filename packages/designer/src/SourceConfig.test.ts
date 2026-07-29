import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { StaticAdapter } from '@docsmith/adapters';
import type { DataSource } from '@docsmith/core';
import SourceConfig from './SourceConfig.svelte';

function makeAdapter() {
  return new StaticAdapter({
    entities: [
      {
        meta: { name: 'invoice', label: 'Invoice' },
        headerFields: [],
        datasets: [
          { meta: { id: 'invoice_items', label: 'Line items' }, fields: [] },
          { meta: { id: 'shipments', label: 'Shipments' }, fields: [] },
        ],
        documents: {},
      },
    ],
  });
}

function emptyDataSource(): DataSource {
  return { entity: '', key: 'id', datasets: [] };
}

describe('SourceConfig', () => {
  it('shows a loading state, then the loaded entities', async () => {
    const adapter = makeAdapter();
    render(SourceConfig, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });

    expect(screen.getByText(/Loading entities/)).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Entity')).toBeTruthy());
  });

  it('shows an honest empty hint when the adapter has no entities', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(SourceConfig, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });

    await waitFor(() => expect(screen.getByText(/No entities available/)).toBeTruthy());
  });

  it('shows an error with Retry when listEntities rejects, and Retry recovers', async () => {
    const adapter = makeAdapter();
    const spy = vi
      .spyOn(adapter, 'listEntities')
      .mockRejectedValueOnce(new Error('network down'));
    render(SourceConfig, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });

    // Both the visually-hidden live region and the visible ErrorInline legitimately
    // render the same message — scope to the alert region specifically.
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('network down'));
    spy.mockRestore();

    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByLabelText('Entity')).toBeTruthy());
  });

  it('selecting an entity fetches its related datasets and lets you add/remove one', async () => {
    const adapter = makeAdapter();
    const onDataSourceChange = vi.fn();
    const { rerender } = render(SourceConfig, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange },
    });

    await waitFor(() => expect(screen.getByLabelText('Entity')).toBeTruthy());
    await fireEvent.change(screen.getByLabelText('Entity'), { target: { value: 'invoice' } });

    expect(onDataSourceChange).toHaveBeenCalledWith({ entity: 'invoice', key: 'id', datasets: [] });

    // Simulate the parent applying the change (real usage: template.dataSource updates).
    await rerender({
      adapter,
      dataSource: { entity: 'invoice', key: 'id', datasets: [] },
      onDataSourceChange,
    });

    await waitFor(() => expect(screen.getByText('Line items')).toBeTruthy());

    await fireEvent.click(screen.getByRole('button', { name: 'Add Line items dataset' }));
    const added = onDataSourceChange.mock.calls.at(-1)?.[0] as DataSource;
    expect(added.datasets).toStrictEqual([
      { id: 'invoice_items', label: 'Line items', kind: 'fk', ref: { table: 'invoice_items', fkColumn: '' } },
    ]);

    await rerender({ adapter, dataSource: added, onDataSourceChange });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Line items dataset' })).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Remove Line items dataset' }));
    const removed = onDataSourceChange.mock.calls.at(-1)?.[0] as DataSource;
    expect(removed.datasets).toStrictEqual([]);
  });

  async function selectInvoice(onDataSourceChange = vi.fn()) {
    const adapter = makeAdapter();
    const { rerender } = render(SourceConfig, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange },
    });
    await waitFor(() => expect(screen.getByLabelText('Entity')).toBeTruthy());
    await fireEvent.change(screen.getByLabelText('Entity'), { target: { value: 'invoice' } });
    await rerender({
      adapter,
      dataSource: { entity: 'invoice', key: 'id', datasets: [] },
      onDataSourceChange,
    });
    // The SQL dataset form lives behind the "Advanced"
    // collapsible (v2 simplification) — open it first.
    await waitFor(() => expect(screen.getByRole('button', { name: /Advanced/ })).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: /Advanced/ }));
    await waitFor(() => expect(screen.getByText('Add a custom (SQL) dataset')).toBeTruthy());
    return { adapter, rerender };
  }

  it('adds a raw-query (SQL) dataset with kind:"sql" and the given id/label/query', async () => {
    const onDataSourceChange = vi.fn();
    await selectInvoice(onDataSourceChange);

    await fireEvent.input(screen.getByPlaceholderText('e.g. top_customers'), {
      target: { value: 'top_customers' },
    });
    await fireEvent.input(screen.getByPlaceholderText('e.g. Top Customers'), {
      target: { value: 'Top Customers' },
    });
    await fireEvent.input(screen.getByPlaceholderText('SELECT ...'), {
      target: { value: 'SELECT * FROM customers ORDER BY total DESC LIMIT 5' },
    });
    await fireEvent.click(screen.getByRole('button', { name: '+ Add SQL dataset' }));

    const added = onDataSourceChange.mock.calls.at(-1)?.[0] as DataSource;
    expect(added.datasets).toStrictEqual([
      {
        id: 'top_customers',
        label: 'Top Customers',
        kind: 'sql',
        ref: { sql: 'SELECT * FROM customers ORDER BY total DESC LIMIT 5' },
      },
    ]);
  });

  it('rejects an incomplete SQL dataset form without calling onDataSourceChange', async () => {
    const onDataSourceChange = vi.fn();
    await selectInvoice(onDataSourceChange);
    onDataSourceChange.mockClear();

    await fireEvent.click(screen.getByRole('button', { name: '+ Add SQL dataset' }));

    expect(onDataSourceChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('required');
  });

  it('rejects a SQL dataset id that collides with an existing dataset', async () => {
    const onDataSourceChange = vi.fn();
    const { adapter, rerender } = await selectInvoice(onDataSourceChange);

    await rerender({
      adapter,
      dataSource: {
        entity: 'invoice',
        key: 'id',
        datasets: [{ id: 'invoice_items', label: 'Line items', kind: 'fk', ref: { table: 'invoice_items', fkColumn: '' } }],
      },
      onDataSourceChange,
    });
    onDataSourceChange.mockClear();

    await fireEvent.input(screen.getByPlaceholderText('e.g. top_customers'), {
      target: { value: 'invoice_items' },
    });
    await fireEvent.input(screen.getByPlaceholderText('e.g. Top Customers'), {
      target: { value: 'Dup' },
    });
    await fireEvent.input(screen.getByPlaceholderText('SELECT ...'), {
      target: { value: 'SELECT 1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: '+ Add SQL dataset' }));

    expect(onDataSourceChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('already exists');
  });
});
