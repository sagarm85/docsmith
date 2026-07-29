import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { FreeElement } from '@docsmith/core';
import FreeElementView from './FreeElement.svelte';

function fieldElement(overrides: Partial<FreeElement> = {}): FreeElement {
  return {
    id: 'e1',
    kind: 'field',
    x: 0,
    y: 0,
    w: 200,
    h: 18,
    label: 'Invoice #',
    binding: { source: 'header', column: 'invoice_number', format: 'text' },
    ...overrides,
  };
}

function callbacks() {
  return {
    onSelect: vi.fn(),
    onChange: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onBringForward: vi.fn(),
    onSendBack: vi.fn(),
  };
}

// jsdom has no real PointerEvent, and @testing-library's fireEvent.pointerDown
// falls back to a bare Event with no clientX/clientY in that case — dispatch a
// real MouseEvent directly instead (the component only reads clientX/clientY,
// which MouseEvent does implement properly in jsdom).
function pointerDown(el: Element, clientX: number, clientY: number) {
  el.dispatchEvent(new MouseEvent('pointerdown', { clientX, clientY, bubbles: true }));
}
function pointerMove(clientX: number, clientY: number) {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
}
function pointerUp() {
  window.dispatchEvent(new MouseEvent('pointerup'));
}

describe('FreeElement', () => {
  it('renders a field element as a bound-field chip (D-025) and is labelled for a11y', () => {
    render(FreeElementView, {
      props: { element: fieldElement(), selected: false, bandLabel: 'Report Header', ...callbacks() },
    });
    expect(screen.getByText('Invoice #')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Invoice # field, Report Header, x 0 y 0' }),
    ).toBeTruthy();
  });

  it('pointerdown selects the element and starts a drag', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement(), selected: false, bandLabel: 'Report Header', ...cb },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    pointerDown(el, 10, 10);
    expect(cb.onSelect).toHaveBeenCalledTimes(1);
    expect(cb.onDragStart).toHaveBeenCalledTimes(1);
  });

  it('dragging moves the element by the pointer delta, snapped to a 4px grid', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement({ x: 40, y: 40 }), selected: false, bandLabel: 'Report Header', ...cb },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    pointerDown(el, 100, 100);
    // 100 -> 107 is a 7px delta; snapped to the nearest 4px multiple (8).
    pointerMove(107, 100);
    expect(cb.onChange).toHaveBeenCalledWith({ x: 48, y: 40 });
    pointerUp();
    expect(cb.onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('does not go negative when dragged past the band edge', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement({ x: 10, y: 10 }), selected: false, bandLabel: 'Report Header', ...cb },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    pointerDown(el, 0, 0);
    pointerMove(-100, -100);
    const patch = cb.onChange.mock.calls[0]?.[0];
    expect(patch.x).toBe(0);
    expect(patch.y).toBe(0);
  });

  it('resize handles are only rendered when selected', () => {
    const { rerender } = render(FreeElementView, {
      props: { element: fieldElement(), selected: false, bandLabel: 'Report Header', ...callbacks() },
    });
    expect(screen.queryByRole('button', { name: /Resize/ })).toBeNull();

    rerender({ element: fieldElement(), selected: true, bandLabel: 'Report Header', ...callbacks() });
    expect(screen.getAllByRole('button', { name: /Resize/ }).length).toBe(8);
  });

  it('dragging the SE resize handle grows width and height', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement({ w: 200, h: 20 }), selected: true, bandLabel: 'Report Header', ...cb },
    });
    const handle = screen.getByRole('button', { name: 'Resize (se)' });
    pointerDown(handle, 0, 0);
    pointerMove(20, 8);
    expect(cb.onChange).toHaveBeenCalledWith({ x: 0, y: 0, w: 220, h: 28 });
  });

  it('keyboard arrows nudge by 1px, or 10px with Shift, and never go negative', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement({ x: 5, y: 5 }), selected: false, bandLabel: 'Report Header', ...cb },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    await fireEvent.keyDown(el, { key: 'ArrowRight' });
    expect(cb.onChange).toHaveBeenCalledWith({ x: 6 });
    await fireEvent.keyDown(el, { key: 'ArrowLeft', shiftKey: true });
    expect(cb.onChange).toHaveBeenCalledWith({ x: 0 }); // 5 - 10 clamped to 0
    // Each nudge is its own batched commit (drag start+end wrap it).
    expect(cb.onDragStart).toHaveBeenCalledTimes(2);
    expect(cb.onDragEnd).toHaveBeenCalledTimes(2);
  });

  it('Delete/Backspace calls onDelete; Cmd/Ctrl+D calls onDuplicate; ] and [ call z-order callbacks', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement(), selected: false, bandLabel: 'Report Header', ...cb },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    await fireEvent.keyDown(el, { key: 'Delete' });
    expect(cb.onDelete).toHaveBeenCalledTimes(1);
    await fireEvent.keyDown(el, { key: 'd', metaKey: true });
    expect(cb.onDuplicate).toHaveBeenCalledTimes(1);
    await fireEvent.keyDown(el, { key: ']' });
    expect(cb.onBringForward).toHaveBeenCalledTimes(1);
    await fireEvent.keyDown(el, { key: '[' });
    expect(cb.onSendBack).toHaveBeenCalledTimes(1);
  });

  it('inline hover toolbar buttons call the same callbacks as the keyboard shortcuts, without also selecting/dragging the element', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: { element: fieldElement(), selected: false, bandLabel: 'Report Header', ...cb },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Send back' }));
    expect(cb.onSendBack).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Bring forward' }));
    expect(cb.onBringForward).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(cb.onDuplicate).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(cb.onDelete).toHaveBeenCalledTimes(1);
    // Clicking a toolbar button must not also select/start-drag the element
    // underneath it (each button stops pointerdown/click propagation).
    expect(cb.onSelect).not.toHaveBeenCalled();
    expect(cb.onDragStart).not.toHaveBeenCalled();
  });

  it('double-click on a text element enters edit mode; blur commits via onEditText', async () => {
    const onEditText = vi.fn();
    const textEl: FreeElement = { id: 'e2', kind: 'text', x: 0, y: 0, w: 100, h: 20, text: 'Hello' };
    render(FreeElementView, {
      props: { element: textEl, selected: false, bandLabel: 'Report Header', ...callbacks(), onEditText },
    });
    const el = screen.getByRole('button', { name: 'text element, Report Header, x 0 y 0' });
    await fireEvent.dblClick(el);
    const editable = screen.getByRole('textbox');
    editable.textContent = 'Updated';
    await fireEvent.blur(editable);
    expect(onEditText).toHaveBeenCalledWith('Updated');
  });

  it('in "%" mode, the aria-label and rendered style use % instead of px', () => {
    render(FreeElementView, {
      props: {
        element: fieldElement({ x: 10, y: 20 }),
        selected: false,
        bandLabel: 'Report Header',
        unit: '%',
        contentWidthPx: 1000,
        bandHeightPx: 200,
        ...callbacks(),
      },
    });
    const el = screen.getByRole('button', { name: 'Invoice # field, Report Header, x 10% y 20%' });
    expect(el.style.left).toBe('10%');
    expect(el.style.top).toBe('20%');
  });

  it('in "%" mode, dragging moves the element by a percentage delta (memory.md D-028)', () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: {
        element: fieldElement({ x: 10, y: 10 }),
        selected: false,
        bandLabel: 'Report Header',
        unit: '%',
        contentWidthPx: 1000, // x/w basis
        bandHeightPx: 200, // y/h basis
        ...cb,
      },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    pointerDown(el, 100, 100);
    pointerMove(150, 120); // dx=50px -> 5% of 1000; dy=20px -> 10% of 200
    expect(cb.onChange).toHaveBeenCalledWith({ x: 15, y: 20 });
  });

  it('in "%" mode, resizing the SE handle grows width/height using the same percentage bases', () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: {
        element: fieldElement({ x: 0, y: 0, w: 20, h: 20 }),
        selected: true,
        bandLabel: 'Report Header',
        unit: '%',
        contentWidthPx: 1000,
        bandHeightPx: 200,
        ...cb,
      },
    });
    const handle = screen.getByRole('button', { name: 'Resize (se)' });
    pointerDown(handle, 0, 0);
    pointerMove(100, 20); // dx=100px -> 10% of 1000; dy=20px -> 10% of 200
    expect(cb.onChange).toHaveBeenCalledWith({ x: 0, y: 0, w: 30, h: 30 });
  });

  it('in "%" mode, keyboard arrows nudge by a percentage step derived from the px step', async () => {
    const cb = callbacks();
    render(FreeElementView, {
      props: {
        element: fieldElement({ x: 10, y: 10 }),
        selected: false,
        bandLabel: 'Report Header',
        unit: '%',
        contentWidthPx: 100, // 1px -> 1%
        bandHeightPx: 100, // 1px -> 1%
        ...cb,
      },
    });
    const el = screen.getByRole('button', { name: /Invoice #/ });
    await fireEvent.keyDown(el, { key: 'ArrowRight' });
    expect(cb.onChange).toHaveBeenCalledWith({ x: 11 });
    await fireEvent.keyDown(el, { key: 'ArrowDown', shiftKey: true });
    expect(cb.onChange).toHaveBeenCalledWith({ y: 20 });
  });

  it('renders an image with its src, or a placeholder when empty', () => {
    const withSrc: FreeElement = { id: 'e3', kind: 'image', x: 0, y: 0, w: 50, h: 50, src: { kind: 'url', value: 'https://example.com/logo.png' } };
    const { container, unmount } = render(FreeElementView, {
      props: { element: withSrc, selected: false, bandLabel: 'Report Header', ...callbacks() },
    });
    // alt="" is intentional (decorative canvas image) — that gives it ARIA
    // role "presentation", not "img", so query by tag instead of role.
    const img = container.querySelector('img');
    expect(img?.src).toBe('https://example.com/logo.png');
    unmount();

    const empty: FreeElement = { id: 'e4', kind: 'image', x: 0, y: 0, w: 50, h: 50 };
    render(FreeElementView, {
      props: { element: empty, selected: false, bandLabel: 'Report Header', ...callbacks() },
    });
    expect(screen.getByText('Image')).toBeTruthy();
  });
});
