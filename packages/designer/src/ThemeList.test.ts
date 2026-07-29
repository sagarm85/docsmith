import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ThemeList from './ThemeList.svelte';

function callbacks() {
  return {
    onTokenChange: vi.fn(),
    onSaveCurrent: vi.fn(),
    onApply: vi.fn(),
    onDelete: vi.fn(),
    onReset: vi.fn(),
  };
}

function themes() {
  return [
    { id: 'a', name: 'Acme Brand' },
    { id: 'b', name: 'Beta Corp' },
  ];
}

describe('ThemeList (memory.md D-032)', () => {
  it('is disabled when the host supplies config.theme directly', () => {
    render(ThemeList, {
      props: { activeTheme: {}, themes: [], disabled: true, ...callbacks() },
    });
    expect((screen.getByRole('button', { name: 'Brand theme' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens the popover on trigger click and lists saved themes', async () => {
    render(ThemeList, { props: { activeTheme: {}, themes: themes(), ...callbacks() } });
    expect(screen.queryByText('Saved themes')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    expect(screen.getByText('Acme Brand')).toBeTruthy();
    expect(screen.getByText('Beta Corp')).toBeTruthy();
  });

  it('shows an honest empty state when there are no saved themes', async () => {
    render(ThemeList, { props: { activeTheme: {}, themes: [], ...callbacks() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    expect(screen.getByText('No saved themes yet.')).toBeTruthy();
  });

  it('editing a brand color calls onTokenChange with the token key', async () => {
    const cb = callbacks();
    render(ThemeList, { props: { activeTheme: {}, themes: [], ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    await fireEvent.input(screen.getByLabelText('Accent'), { target: { value: '#00ff00' } });
    expect(cb.onTokenChange).toHaveBeenCalledWith('--dd-accent', '#00ff00');
  });

  it('"Save" is disabled until a name is typed, then calls onSaveCurrent', async () => {
    const cb = callbacks();
    render(ThemeList, { props: { activeTheme: { '--dd-accent': '#ff0000' }, themes: [], ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);

    await fireEvent.input(screen.getByLabelText('New theme name'), { target: { value: 'My Brand' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(cb.onSaveCurrent).toHaveBeenCalledWith('My Brand');
  });

  it('clicking a saved theme applies it and closes the popover', async () => {
    const cb = callbacks();
    render(ThemeList, { props: { activeTheme: {}, themes: themes(), ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Beta Corp' }));
    expect(cb.onApply).toHaveBeenCalledWith('b');
    expect(screen.queryByText('Saved themes')).toBeNull();
  });

  it('clicking Delete on a theme calls onDelete without applying it', async () => {
    const cb = callbacks();
    render(ThemeList, { props: { activeTheme: {}, themes: themes(), ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Delete Beta Corp' }));
    expect(cb.onDelete).toHaveBeenCalledWith('b');
    expect(cb.onApply).not.toHaveBeenCalled();
  });

  it('"Reset to default" calls onReset', async () => {
    const cb = callbacks();
    render(ThemeList, { props: { activeTheme: { '--dd-accent': '#ff0000' }, themes: [], ...cb } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(cb.onReset).toHaveBeenCalledTimes(1);
  });

  it('Escape closes the popover', async () => {
    render(ThemeList, { props: { activeTheme: {}, themes: [], ...callbacks() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Brand theme' }));
    expect(screen.getByRole('group', { name: 'Brand theme' })).toBeTruthy();
    await fireEvent.keyDown(screen.getByRole('group', { name: 'Brand theme' }), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Brand theme' })).toBeNull();
  });
});
