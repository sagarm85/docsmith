import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { StaticAdapter } from '@docsmith/adapters';
import type { DataSource } from '@docsmith/core';
import Palette from './Palette.svelte';

function emptyDataSource(): DataSource {
  return { entity: '', key: 'id', datasets: [] };
}

describe('Palette — Blocks group', () => {
  it('always shows the Blocks group, even with no entity chosen', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });
    expect(screen.getByText('Blocks')).toBeTruthy();
    expect(screen.getByText('Text')).toBeTruthy();
    expect(screen.getByText('Image')).toBeTruthy();
    expect(screen.getByText('Line')).toBeTruthy();
    expect(screen.getByText('Box')).toBeTruthy();
  });

  it('disables each block\'s "+" button when no onAddBlock is supplied (honest, not hidden)', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });
    const btn = screen.getByRole('button', { name: 'Add Text to report header' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('clicking a block\'s "+" calls onAddBlock with its kind', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onAddBlock = vi.fn();
    render(Palette, {
      props: {
        adapter,
        dataSource: emptyDataSource(),
        onDataSourceChange: vi.fn(),
        onAddBlock,
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add Image to report header' }));
    expect(onAddBlock).toHaveBeenCalledWith('image');
  });

  it('sets the application/x-doc-block payload on dragstart', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });
    const chip = screen.getByRole('group', { name: 'Line block' });
    const setData = vi.fn();
    fireEvent.dragStart(chip, { dataTransfer: { setData, effectAllowed: '' } as unknown as DataTransfer });
    expect(setData).toHaveBeenCalledWith('application/x-doc-block', JSON.stringify({ kind: 'line' }));
  });

  it('pressing Enter on a block chip calls onPickUpBlock with its kind (design.md §12)', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onPickUpBlock = vi.fn();
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn(), onPickUpBlock },
    });
    await fireEvent.keyDown(screen.getByRole('group', { name: 'Box block' }), { key: 'Enter' });
    expect(onPickUpBlock).toHaveBeenCalledWith('box');
  });

  it('marks the picked-up block chip via aria-label, matching pickedUp state', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Palette, {
      props: {
        adapter,
        dataSource: emptyDataSource(),
        onDataSourceChange: vi.fn(),
        pickedUp: { cls: 'block', kind: 'box' },
      },
    });
    expect(screen.getByRole('group', { name: 'Box block (picked up)' })).toBeTruthy();
  });
});

describe('Palette — Sections group (memory.md D-034/D-037)', () => {
  it('is hidden entirely when no onAddSection is supplied (not just disabled)', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn() },
    });
    expect(screen.queryByText('Sections')).toBeNull();
  });

  it('shows all three presets and calls onAddSection with the right columns on "+"', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const onAddSection = vi.fn();
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn(), onAddSection },
    });
    expect(screen.getByText('1 column')).toBeTruthy();
    expect(screen.getByText('2 columns')).toBeTruthy();
    expect(screen.getByText('Large + small')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Add 2 columns section to report header' }));
    expect(onAddSection).toHaveBeenCalledWith([50, 50]);
  });

  it('sets the application/x-doc-section payload on dragstart', () => {
    const adapter = new StaticAdapter({ entities: [] });
    render(Palette, {
      props: { adapter, dataSource: emptyDataSource(), onDataSourceChange: vi.fn(), onAddSection: vi.fn() },
    });
    const chip = screen.getByRole('group', { name: 'Large + small section' });
    const setData = vi.fn();
    fireEvent.dragStart(chip, { dataTransfer: { setData, effectAllowed: '' } as unknown as DataTransfer });
    expect(setData).toHaveBeenCalledWith('application/x-doc-section', JSON.stringify({ columns: [65, 35] }));
  });
});
