import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { FreeBand } from '@docsmith/core';
import Band from './Band.svelte';

// jsdom doesn't implement the DataTransfer/DragEvent APIs, so tests fake just the
// getData() surface Band.svelte actually reads — the standard pattern for testing
// native HTML5 DnD under jsdom. Must respect the requested MIME type (like a real
// DataTransfer, which returns '' for any type that wasn't set) since Band.svelte
// probes for 'application/x-doc-block' before 'application/x-doc-field'.
function fakeDataTransfer(type: string, payload: unknown) {
  return { getData: (t: string) => (t === type ? JSON.stringify(payload) : '') };
}

function emptyBand(type: FreeBand['type'] = 'reportHeader'): FreeBand {
  return { id: type, type, height: 140, elements: [] };
}

// jsdom has no real PointerEvent, and fireEvent.pointerDown falls back to a
// bare Event with no clientX/clientY — dispatch a real MouseEvent directly
// instead, same pattern as FreeElement.test.ts.
function pointerDownAt(el: Element, clientX: number, clientY: number) {
  el.dispatchEvent(new MouseEvent('pointerdown', { clientX, clientY, bubbles: true }));
}
function pointerMoveTo(clientX: number, clientY: number) {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
}
function nextTick(): Promise<void> {
  return Promise.resolve();
}

function selectionCallbacks() {
  return {
    onSelectElement: vi.fn(),
    onSelectBand: vi.fn(),
    onDeselect: vi.fn(),
    onElementLiveChange: vi.fn(),
    onElementDragStart: vi.fn(),
    onElementDragEnd: vi.fn(),
    onElementDelete: vi.fn(),
    onElementDuplicate: vi.fn(),
    onElementBringForward: vi.fn(),
    onElementSendBack: vi.fn(),
    onElementEditText: vi.fn(),
  };
}

describe('Band', () => {
  it('shows the empty hint when it has no elements', () => {
    render(Band, {
      props: {
        band: emptyBand(),
        onAddElement: vi.fn(),
        onInvalidDrop: vi.fn(),
        ...selectionCallbacks(),
      },
    });
    expect(screen.getByText(/Drag header fields here/)).toBeTruthy();
  });

  it('renders existing field elements as a bound-field chip', () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      elements: [
        {
          id: 'e1',
          kind: 'field',
          x: 0,
          y: 0,
          w: 200,
          h: 18,
          label: 'Invoice #',
          binding: { source: 'header', column: 'invoice_number', format: 'text' },
        },
      ],
    };
    render(Band, {
      props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...selectionCallbacks() },
    });
    expect(screen.getByText('Invoice #')).toBeTruthy();
  });

  it('accepts a header-field drop and appends a bound element', async () => {
    const onAddElement = vi.fn();
    render(Band, {
      props: {
        band: emptyBand(),
        onAddElement,
        onInvalidDrop: vi.fn(),
        ...selectionCallbacks(),
      },
    });

    const dropzone = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'header',
        datasetId: null,
        column: 'invoice_number',
        type: 'text',
        label: 'Invoice #',
        format: 'text',
      }),
    });

    expect(onAddElement).toHaveBeenCalledTimes(1);
    const added = onAddElement.mock.calls[0]?.[0];
    expect(added).toMatchObject({
      kind: 'field',
      label: 'Invoice #',
      binding: { source: 'header', column: 'invoice_number', format: 'text' },
    });
  });

  it('rejects a dataset-field drop with an explanatory reason', async () => {
    const onAddElement = vi.fn();
    const onInvalidDrop = vi.fn();
    render(Band, {
      props: { band: emptyBand(), onAddElement, onInvalidDrop, ...selectionCallbacks() },
    });

    const dropzone = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-field', {
        cls: 'dataset',
        datasetId: 'invoice_items',
        column: 'qty',
        type: 'int',
        label: 'Qty',
        format: 'number',
      }),
    });

    expect(onAddElement).not.toHaveBeenCalled();
    expect(onInvalidDrop).toHaveBeenCalledWith('Line-item fields can only go in the items table.');
  });

  it('accepts a block drop (Text/Image/Line/Box) and appends the right element kind', async () => {
    const onAddElement = vi.fn();
    render(Band, {
      props: {
        band: emptyBand(),
        contentWidthPx: 793.7,
        onAddElement,
        onInvalidDrop: vi.fn(),
        ...selectionCallbacks(),
      },
    });

    const dropzone = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-block', { kind: 'box' }),
    });

    expect(onAddElement).toHaveBeenCalledTimes(1);
    // A newly-dropped box always spans the band's full content width — see
    // template-edits.ts's createBlockElement doc comment.
    expect(onAddElement.mock.calls[0]?.[0]).toMatchObject({ kind: 'box', w: 793.7, h: 60 });
  });

  it('accepts a Sections drop and forwards its columns to onAddSection (memory.md D-043)', async () => {
    const onAddSection = vi.fn();
    render(Band, {
      props: {
        band: emptyBand(),
        onAddElement: vi.fn(),
        onAddSection,
        onInvalidDrop: vi.fn(),
        ...selectionCallbacks(),
      },
    });

    const dropzone = screen.getByRole('group', { name: 'Report Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-section', { columns: [50, 50] }),
    });

    expect(onAddSection).toHaveBeenCalledWith([50, 50]);
  });

  it('rejects a Sections drop with an honest reason when the band has no onAddSection (e.g. pageHeader/pageFooter, memory.md D-043)', async () => {
    const onAddSection = vi.fn();
    const onInvalidDrop = vi.fn();
    render(Band, {
      props: {
        band: emptyBand('pageHeader'),
        onAddElement: vi.fn(),
        onInvalidDrop,
        ...selectionCallbacks(),
      },
    });

    const dropzone = screen.getByRole('group', { name: 'Page Header band' });
    await fireEvent.drop(dropzone, {
      dataTransfer: fakeDataTransfer('application/x-doc-section', { columns: [50, 50] }),
    });

    expect(onAddSection).not.toHaveBeenCalled();
    expect(onInvalidDrop).toHaveBeenCalledWith('Sections can only go on the Report Header or Totals band.');
  });

  it('stacks a second added element below the first', () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      elements: [
        { id: 'e1', kind: 'field', x: 0, y: 0, w: 200, h: 18, label: 'A' },
        { id: 'e2', kind: 'field', x: 0, y: 24, w: 200, h: 18, label: 'B' },
      ],
    };
    render(Band, {
      props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...selectionCallbacks() },
    });
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('selecting an element and pressing Delete removes it', async () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      elements: [{ id: 'e1', kind: 'field', x: 0, y: 0, w: 200, h: 18, label: 'A' }],
    };
    const callbacks = selectionCallbacks();
    render(Band, { props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...callbacks } });

    const el = screen.getByRole('button', { name: /A field, Report Header/ });
    await fireEvent.pointerDown(el);
    expect(callbacks.onSelectElement).toHaveBeenCalledWith('e1');

    await fireEvent.keyDown(el, { key: 'Delete' });
    expect(callbacks.onElementDelete).toHaveBeenCalledWith('e1');
  });

  it('clicking the band tab selects the band', async () => {
    const callbacks = selectionCallbacks();
    render(Band, {
      props: { band: emptyBand(), onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...callbacks },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Report Header' }));
    expect(callbacks.onSelectBand).toHaveBeenCalledTimes(1);
  });

  it('clicking empty band space deselects', async () => {
    const callbacks = selectionCallbacks();
    render(Band, {
      props: { band: emptyBand(), onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...callbacks },
    });
    await fireEvent.click(screen.getByRole('group', { name: 'Report Header band' }));
    expect(callbacks.onDeselect).toHaveBeenCalledTimes(1);
  });

  it('renders an alignment guide line while dragging one element toward another\'s edge, and removes it on drop (memory.md D-038)', async () => {
    const band: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 140,
      elements: [
        { id: 'a', kind: 'field', x: 40, y: 40, w: 100, h: 20, label: 'A' },
        { id: 'b', kind: 'field', x: 102, y: 200, w: 100, h: 20, label: 'Sibling' },
      ],
    };
    render(Band, {
      props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...selectionCallbacks() },
    });

    expect(document.querySelector('.dd-align-guide')).toBeNull();

    const el = screen.getByRole('button', { name: /A field, Report Header/ });
    pointerDownAt(el, 100, 100);
    pointerMoveTo(100 + (102 - 40), 100); // drags element a's left edge onto b's left edge (102)
    await nextTick();

    const guide = document.querySelector('.dd-align-guide--v') as HTMLElement | null;
    expect(guide).toBeTruthy();
    expect(guide!.style.left).toBe('102px');

    window.dispatchEvent(new MouseEvent('pointerup'));
    await nextTick();
    expect(document.querySelector('.dd-align-guide')).toBeNull();
  });

  it('renders at its stored height when content fits, and grows past it when content extends lower (memory.md D-066)', () => {
    const band: FreeBand = {
      id: 'totals',
      type: 'totals',
      height: 90,
      elements: [{ id: 'a', kind: 'field', x: 0, y: 150, w: 100, h: 20, label: 'Note' }],
    };
    render(Band, {
      props: { band, onAddElement: vi.fn(), onInvalidDrop: vi.fn(), ...selectionCallbacks() },
    });
    const body = screen.getByRole('group', { name: 'Totals band' }) as HTMLElement;
    // y:150 + h:20 = 170, past the stored height:90 -> renders at 170, the
    // exact same growth core.renderToHtml's freeBandHeightPx would produce
    // for the same band, so the canvas matches the real output.
    expect(body.style.height).toBe('170px');
  });
});
