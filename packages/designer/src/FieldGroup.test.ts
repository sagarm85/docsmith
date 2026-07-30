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
  it('renders a flat list with each field showing its own system/custom badge, system fields first', async () => {
    const adapter = makeAdapter([
      { name: 'po_reference', label: 'PO Reference', type: 'text', kind: 'custom' },
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    render(FieldGroup, {
      props: { title: 'Header fields', cls: 'header', adapter, entity: 'invoice' },
    });

    await waitFor(() => expect(screen.getByText('Invoice #')).toBeTruthy());
    expect(screen.getByText('PO Reference')).toBeTruthy();
    // Per-item badges (memory.md D-042), not a separate subheader/subgroup.
    const badges = document.querySelectorAll('.dd-chip-badge');
    expect(Array.from(badges).map((b) => b.textContent)).toStrictEqual(['system', 'custom']);
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

  it('shows a dataset field already used as a detail column as "added" — no Add/pick-up, a check instead of a +', async () => {
    const adapter = makeAdapter([
      { name: 'description', label: 'Description', type: 'text', kind: 'system' },
      { name: 'qty', label: 'Qty', type: 'int', kind: 'system' },
    ]);
    const onAddField = vi.fn();
    const onPickUp = vi.fn();
    render(FieldGroup, {
      props: {
        title: 'Line items',
        cls: 'dataset',
        adapter,
        entity: 'invoice',
        datasetId: 'invoice_items',
        onAddField,
        onPickUp,
        addedDatasetColumns: new Set(['description']),
      },
    });

    await waitFor(() => expect(screen.getByText('Qty')).toBeTruthy());

    // Already-added field: disabled, labeled distinctly, not pickable.
    const addedBtn = screen.getByRole('button', { name: 'Description already added' });
    expect((addedBtn as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.keyDown(screen.getByRole('group', { name: 'Description field (already added)' }), {
      key: 'Enter',
    });
    expect(onPickUp).not.toHaveBeenCalled();

    // Still-addable field: unaffected.
    const addBtn = screen.getByRole('button', { name: 'Add Qty column' });
    expect((addBtn as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(addBtn);
    expect(onAddField).toHaveBeenCalledWith({ name: 'qty', label: 'Qty', type: 'int', kind: 'system' });
  });

  it('never treats header fields as "added", even if addedDatasetColumns happens to contain the name', async () => {
    const adapter = makeAdapter([
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
    ]);
    render(FieldGroup, {
      props: {
        title: 'Header fields',
        cls: 'header',
        adapter,
        entity: 'invoice',
        onAddField: vi.fn(),
        addedDatasetColumns: new Set(['invoice_number']),
      },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Invoice # to report header' })).toBeTruthy(),
    );
  });
});
