import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TemplateList from './TemplateList.svelte';

function templates() {
  return [
    { id: 'a', name: 'Invoice A' },
    { id: 'b', name: 'Quote B' },
  ];
}

describe('TemplateList', () => {
  it('is disabled when the host owns storage (onSave configured)', () => {
    render(TemplateList, {
      props: {
        templates: templates(),
        currentId: 'a',
        disabled: true,
        onSelect: vi.fn(),
        onDelete: vi.fn(),
        onNew: vi.fn(),
      },
    });
    expect((screen.getByRole('button', { name: 'Saved templates' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('opens the popover on trigger click and lists saved templates', async () => {
    render(TemplateList, {
      props: { templates: templates(), currentId: 'a', onSelect: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() },
    });
    expect(screen.queryByRole('listbox')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Invoice A' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Quote B' })).toBeTruthy();
  });

  it('shows an honest empty state when there are no saved templates', async () => {
    render(TemplateList, {
      props: { templates: [], currentId: '', onSelect: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    expect(screen.getByText('No saved templates yet.')).toBeTruthy();
  });

  it('selecting an option calls onSelect and closes the popover', async () => {
    const onSelect = vi.fn();
    render(TemplateList, {
      props: { templates: templates(), currentId: 'a', onSelect, onDelete: vi.fn(), onNew: vi.fn() },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    await fireEvent.click(screen.getByRole('option', { name: 'Quote B' }));
    expect(onSelect).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('clicking Delete on an item calls onDelete without also selecting it', async () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(TemplateList, {
      props: { templates: templates(), currentId: 'a', onSelect, onDelete, onNew: vi.fn() },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Delete Quote B' }));
    expect(onDelete).toHaveBeenCalledWith('b');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('"+ New template" calls onNew and closes the popover', async () => {
    const onNew = vi.fn();
    render(TemplateList, {
      props: { templates: templates(), currentId: 'a', onSelect: vi.fn(), onDelete: vi.fn(), onNew },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    await fireEvent.click(screen.getByRole('button', { name: '+ New template' }));
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape closes the popover', async () => {
    render(TemplateList, {
      props: { templates: templates(), currentId: 'a', onSelect: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
    await fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('marks the current template as the selected option', async () => {
    render(TemplateList, {
      props: { templates: templates(), currentId: 'b', onSelect: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Saved templates' }));
    expect(screen.getByRole('option', { name: 'Quote B' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: 'Invoice A' }).getAttribute('aria-selected')).toBe('false');
  });
});
