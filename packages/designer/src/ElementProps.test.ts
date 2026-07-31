import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { FreeElement } from '@docsmith/core';
import ElementProps from './ElementProps.svelte';

function textElement(overrides: Partial<FreeElement> = {}): FreeElement {
  return { id: 'e1', kind: 'text', x: 260, y: 4, w: 413, h: 30, text: 'PURCHASE ORDER', ...overrides };
}

const noop = { onChange: vi.fn(), onDelete: vi.fn(), onDuplicate: vi.fn(), onBringForward: vi.fn(), onSendBack: vi.fn() };

describe('ElementProps — X/Width clamp to the real page width in px mode (memory.md D-073)', () => {
  it('caps the Width field\'s max at the page\'s right edge minus the element\'s current X', () => {
    render(ElementProps, {
      props: { element: textElement(), unit: 'px', contentWidthPx: 673, ...noop },
    });
    const widthInput = screen.getByLabelText('Width') as HTMLInputElement;
    // 673 (page content width) - 260 (element.x) = 413 — exactly flush, matching
    // the reference Purchase Order template's own numbers.
    expect(Number(widthInput.max)).toBeCloseTo(413, 5);
  });

  it('caps the X field\'s max at the page\'s right edge minus the element\'s current Width', () => {
    render(ElementProps, {
      props: { element: textElement(), unit: 'px', contentWidthPx: 673, ...noop },
    });
    const xInput = screen.getByLabelText('X position') as HTMLInputElement;
    expect(Number(xInput.max)).toBeCloseTo(260, 5);
  });

  it('actually clamps a typed Width that would push the element past the page — not just a UI hint', async () => {
    const onChange = vi.fn();
    render(ElementProps, {
      props: { element: textElement(), unit: 'px', contentWidthPx: 673, ...noop, onChange },
    });
    // Reported directly: typing a wide Width for a pageHeader label rendered
    // it visibly outside the page — before this fix, Width had NO max at all
    // in 'px' mode, only '%' mode did, even though drag/resize (D-057)
    // already clamped to this exact boundary.
    await fireEvent.change(screen.getByLabelText('Width'), { target: { value: '600' } });
    expect(onChange).toHaveBeenCalledWith({ w: 413 });
  });

  it('actually clamps a typed X that would push the element past the page', async () => {
    const onChange = vi.fn();
    render(ElementProps, {
      props: { element: textElement(), unit: 'px', contentWidthPx: 673, ...noop, onChange },
    });
    await fireEvent.change(screen.getByLabelText('X position'), { target: { value: '900' } });
    expect(onChange).toHaveBeenCalledWith({ x: 260 });
  });

  it('does not clamp Y/Height by contentWidthPx — a band\'s height is a minimum that auto-grows (D-066), not a fixed ceiling', () => {
    render(ElementProps, {
      props: { element: textElement(), unit: 'px', contentWidthPx: 673, ...noop },
    });
    expect(screen.getByLabelText('Y position').getAttribute('max')).toBeNull();
    expect(screen.getByLabelText('Height').getAttribute('max')).toBeNull();
  });

  it('leaves X/Width unbounded when contentWidthPx is not supplied (safe default, matches prior behavior)', () => {
    render(ElementProps, {
      props: { element: textElement(), unit: 'px', ...noop },
    });
    expect(screen.getByLabelText('Width').getAttribute('max')).toBeNull();
    expect(screen.getByLabelText('X position').getAttribute('max')).toBeNull();
  });

  it('in \'%\' layout mode, X/Width stay capped at 100 regardless of contentWidthPx', () => {
    render(ElementProps, {
      props: { element: textElement({ x: 20, w: 30 }), unit: '%', contentWidthPx: 673, ...noop },
    });
    expect(Number((screen.getByLabelText('Width') as HTMLInputElement).max)).toBe(100 - 20);
    expect(Number((screen.getByLabelText('X position') as HTMLInputElement).max)).toBe(100 - 30);
  });
});
