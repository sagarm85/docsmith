import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { DetailColumn } from '@docsmith/core';
import ColumnProps from './ColumnProps.svelte';

function column(): DetailColumn {
  return { column: 'qty', header: 'Qty', width: 60, align: 'right', format: 'number' };
}

describe('ColumnProps — aggregate (design.md §8.5 Phase 3)', () => {
  it('defaults the aggregate select to "None" when no aggregate prop is given', () => {
    render(ColumnProps, { props: { column: column(), onChange: vi.fn() } });
    const select = screen.getByLabelText('Column aggregate') as HTMLSelectElement;
    expect(select.value).toBe('none');
  });

  it('reflects a given aggregate value', () => {
    render(ColumnProps, { props: { column: column(), onChange: vi.fn(), aggregate: 'sum' } });
    const select = screen.getByLabelText('Column aggregate') as HTMLSelectElement;
    expect(select.value).toBe('sum');
  });

  it('calls onAggregateChange with the chosen function', async () => {
    const onAggregateChange = vi.fn();
    render(ColumnProps, {
      props: { column: column(), onChange: vi.fn(), onAggregateChange },
    });
    await fireEvent.change(screen.getByLabelText('Column aggregate'), {
      target: { value: 'avg' },
    });
    expect(onAggregateChange).toHaveBeenCalledWith('avg');
  });

  it('calls onAggregateChange with null when switching back to "None"', async () => {
    const onAggregateChange = vi.fn();
    render(ColumnProps, {
      props: { column: column(), onChange: vi.fn(), aggregate: 'sum', onAggregateChange },
    });
    await fireEvent.change(screen.getByLabelText('Column aggregate'), {
      target: { value: 'none' },
    });
    expect(onAggregateChange).toHaveBeenCalledWith(null);
  });

  it('hides Aggregate/Carry-forward entirely for a non-numeric column (Sum/Average don\'t apply to text/date)', () => {
    render(ColumnProps, {
      props: { column: { ...column(), format: 'text' }, onChange: vi.fn() },
    });
    expect(screen.queryByLabelText('Column aggregate')).toBeNull();
    expect(screen.queryByLabelText('Column carry-forward across page breaks')).toBeNull();
  });

  it('shows Aggregate/Carry-forward for a currency column too', () => {
    render(ColumnProps, {
      props: { column: { ...column(), format: 'currency' }, onChange: vi.fn() },
    });
    expect(screen.getByLabelText('Column aggregate')).toBeTruthy();
  });
});
