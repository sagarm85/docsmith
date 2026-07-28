import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { StaticAdapter } from '@docsmith/adapters';
import type { FieldMeta } from '@docsmith/core';
import FieldGroup from './FieldGroup.svelte';

function makeAdapter(headerFields: FieldMeta[]) {
  return new StaticAdapter({
    entities: [
      {
        meta: { name: 'invoice', label: 'Invoice' },
        headerFields,
        datasets: [{ meta: { id: 'invoice_items', label: 'Line items' }, fields: headerFields }],
        documents: {},
      },
    ],
  });
}

describe('FieldGroup', () => {
  it('splits into System/Custom only when both kinds are present', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
      { name: 'po_reference', label: 'PO Reference', type: 'text', kind: 'custom' },
    ]);
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice' },
    });

    await waitFor(() => expect(screen.getByText('System')).toBeTruthy());
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.getByText('Invoice #')).toBeTruthy();
    expect(screen.getByText('PO Reference')).toBeTruthy();
  });

  it('renders a flat list (no System/Custom headers) when only one kind is present', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice' },
    });

    await waitFor(() => expect(screen.getByText('Invoice #')).toBeTruthy());
    expect(screen.queryByText('System')).toBeNull();
    expect(screen.queryByText('Custom')).toBeNull();
  });

  it('shows an honest empty hint when the adapter has no fields', async () => {
    const adapter = makeAdapter([]);
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice' },
    });

    await waitFor(() => expect(screen.getByText(/No fields available/)).toBeTruthy());
  });

  it('filters fields by the palette search term', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
      { name: 'customer_name', label: 'Customer', type: 'text', kind: 'system' },
    ]);
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice', filter: 'cust' },
    });

    await waitFor(() => expect(screen.getByText('Customer')).toBeTruthy());
    expect(screen.queryByText('Invoice #')).toBeNull();
  });

  it('shows an error with Retry on getFields failure', async () => {
    const adapter = makeAdapter([{ name: 'x', label: 'X', type: 'text', kind: 'system' }]);
    const spy = vi.spyOn(adapter, 'getFields').mockRejectedValueOnce(new Error('boom'));
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice' },
    });

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('boom'));
    spy.mockRestore();
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('X')).toBeTruthy());
  });

  it('calls onAddField with the field when a chip Add button is clicked', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    const onAddField = vi.fn();
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice', onAddField },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Invoice # to report header' })).toBeTruthy(),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Add Invoice # to report header' }));
    expect(onAddField).toHaveBeenCalledWith({
      name: 'invoice_number',
      label: 'Invoice #',
      type: 'text',
      kind: 'system',
    });
  });

  it('disables the Add button (honestly) when no onAddField is supplied', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice' },
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add Invoice # to report header' }),
      ).toBeTruthy(),
    );
    const btn = screen.getByRole('button', { name: 'Add Invoice # to report header' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('pressing Enter on a chip calls onPickUp with that field (design.md §12)', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    const onPickUp = vi.fn();
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice', onPickUp },
    });

    await waitFor(() => expect(screen.getByRole('group', { name: 'Invoice # field' })).toBeTruthy());
    await fireEvent.keyDown(screen.getByRole('group', { name: 'Invoice # field' }), { key: 'Enter' });
    expect(onPickUp).toHaveBeenCalledWith({
      name: 'invoice_number',
      label: 'Invoice #',
      type: 'text',
      kind: 'system',
    });
  });

  it('marks the picked-up chip via aria-label and a picked class, matching pickedUp state', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    render(FieldGroup, {
      props: {
        title: 'Header fields',
        cls: 'header',
        adapter,
        entity: 'invoice',
        pickedUp: {
          cls: 'header',
          datasetId: null,
          column: 'invoice_number',
          type: 'text',
          label: 'Invoice #',
          format: 'text',
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Invoice # field (picked up)' })).toBeTruthy(),
    );
  });
});
