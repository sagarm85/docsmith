<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { FreeElement } from '@docsmith/core';
  import Icon from './ui/Icon.svelte';

  const GRID = 4;
  const MIN_SIZE = 10;

  function snap(n: number): number {
    return Math.round(n / GRID) * GRID;
  }

  let {
    element,
    selected,
    zoom = 1,
    bandLabel,
    onSelect,
    onChange,
    onDragStart,
    onDragEnd,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBack,
    onEditText,
  }: {
    element: FreeElement;
    selected: boolean;
    /** Design-canvas zoom factor. Zoom UI itself is deferred (Phase 2 note in
     * progress.md); the math is written correctly against it regardless, per
     * design.md §8.3's "drag delta divided by zoom" — reusing the same pattern
     * as unidb-studio's SchemaVisualizer. */
    zoom?: number;
    /** Name of the containing band, for the accessible label (design.md §12:
     * "Invoice # field, report header, x 12 y 48"). */
    bandLabel: string;
    onSelect: () => void;
    /** Called continuously during a move/resize drag — the parent applies this
     * live (no history push) so undo/redo sees the whole drag as one step. */
    onChange: (patch: Partial<FreeElement>) => void;
    /** Fired once when a move/resize drag begins/ends, so the parent can batch
     * the whole gesture into a single undo step (see DocDesigner's
     * handleElementDragStart/End + core's `commitFrom`). */
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onBringForward: () => void;
    onSendBack: () => void;
    onEditText?: (text: string) => void;
  } = $props();

  type DragState =
    | { kind: 'move'; startX: number; startY: number; ox: number; oy: number }
    | {
        kind: 'resize';
        handle: string;
        startX: number;
        startY: number;
        ox: number;
        oy: number;
        ow: number;
        oh: number;
        aspect: number;
      };

  let drag: DragState | null = null;
  let editingText = $state(false);

  function handlePointerDownMove(e: PointerEvent) {
    if (editingText) return;
    e.stopPropagation();
    onSelect();
    onDragStart?.();
    drag = { kind: 'move', startX: e.clientX, startY: e.clientY, ox: element.x, oy: element.y };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerDownResize(e: PointerEvent, handle: string) {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    onDragStart?.();
    drag = {
      kind: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      ox: element.x,
      oy: element.y,
      ow: element.w,
      oh: element.h,
      aspect: element.w / (element.h || 1),
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / zoom;
    const dy = (e.clientY - drag.startY) / zoom;

    if (drag.kind === 'move') {
      onChange({ x: Math.max(0, snap(drag.ox + dx)), y: Math.max(0, snap(drag.oy + dy)) });
      return;
    }

    const { handle, ox, oy, ow, oh, aspect } = drag;
    let x = ox;
    let y = oy;
    let w = ow;
    let h = oh;

    const lockAspect = e.shiftKey && element.kind === 'image';

    if (handle.includes('w')) {
      w = Math.max(MIN_SIZE, ow - dx);
      x = ox + (ow - w);
    }
    if (handle.includes('e')) {
      w = Math.max(MIN_SIZE, ow + dx);
    }
    if (handle.includes('n')) {
      h = Math.max(MIN_SIZE, oh - dy);
      y = oy + (oh - h);
    }
    if (handle.includes('s')) {
      h = Math.max(MIN_SIZE, oh + dy);
    }

    if (lockAspect && (handle.length === 2)) {
      // Corner handle: derive height from width to keep the original aspect.
      h = Math.max(MIN_SIZE, w / aspect);
      if (handle.includes('n')) y = oy + (oh - h);
    }

    onChange({ x: snap(x), y: snap(y), w: snap(w), h: snap(h) });
  }

  function handlePointerUp() {
    if (drag) onDragEnd?.();
    drag = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  // If this element is destroyed mid-drag (e.g. deleted while being dragged),
  // the window listeners above would otherwise never be removed — a real leak
  // and a crash risk (a stale closure firing after Svelte tears the component
  // down). Belt-and-braces cleanup regardless of how the drag ended.
  onDestroy(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  });

  // Each key-nudge is its own discrete undo step (unlike a pointer drag, which
  // is a single continuous gesture batched via onDragStart/onDragEnd).
  function nudge(patch: Partial<FreeElement>) {
    onDragStart?.();
    onChange(patch);
    onDragEnd?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        nudge({ y: Math.max(0, element.y - step) });
        break;
      case 'ArrowDown':
        e.preventDefault();
        nudge({ y: element.y + step });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nudge({ x: Math.max(0, element.x - step) });
        break;
      case 'ArrowRight':
        e.preventDefault();
        nudge({ x: element.x + step });
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onDelete();
        break;
      case 'd':
      case 'D':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          onDuplicate();
        }
        break;
      case ']':
        e.preventDefault();
        onBringForward();
        break;
      case '[':
        e.preventDefault();
        onSendBack();
        break;
    }
  }

  function handleDblClick() {
    if (element.kind !== 'text' || !onEditText) return;
    editingText = true;
  }

  function commitTextEdit(e: Event) {
    editingText = false;
    onEditText?.((e.currentTarget as HTMLElement).textContent ?? '');
  }

  const displayLabel = $derived(
    element.kind === 'field' ? (element.label ?? element.binding?.column ?? 'field') : undefined,
  );

  const ariaLabel = $derived(
    `${element.kind === 'field' ? `${displayLabel} field` : `${element.kind} element`}, ${bandLabel}, x ${element.x} y ${element.y}`,
  );

  const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
</script>

<div
  class="dd-el"
  class:dd-el--selected={selected}
  style="left:{element.x}px;top:{element.y}px;width:{element.w}px;height:{element.h}px"
  role="button"
  tabindex="0"
  aria-label={ariaLabel}
  aria-pressed={selected}
  onpointerdown={handlePointerDownMove}
  onkeydown={handleKeydown}
  ondblclick={handleDblClick}
>
  {#if element.kind === 'field'}
    <span class="dd-el-token">
      <Icon name="field" size={10} />
      {displayLabel}
    </span>
  {:else if element.kind === 'text'}
    {#if editingText}
      <!-- onclick only stops the click bubbling into the parent's drag/select
           handler; the element's own keyboard editing comes from
           contenteditable + tabindex, not from this click handler. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <span
        class="dd-el-text-edit"
        role="textbox"
        aria-label={`Edit text for ${bandLabel} element`}
        tabindex="0"
        contenteditable="true"
        onblur={commitTextEdit}
        onclick={(e) => e.stopPropagation()}
      >{element.text}</span>
    {:else}
      <span>{element.text}</span>
    {/if}
  {:else if element.kind === 'image'}
    {#if element.src?.value}
      <img class="dd-el-image" src={element.src.value} alt="" />
    {:else}
      <span class="dd-el-placeholder">
        <Icon name="image" size={16} />
        Image
      </span>
    {/if}
  {:else if element.kind === 'line'}
    <span class="dd-el-line"></span>
  {:else if element.kind === 'box'}
    <span class="dd-el-box"></span>
  {/if}

  {#if selected}
    {#each HANDLES as handle (handle)}
      <span
        class="dd-handle dd-handle--{handle}"
        role="button"
        tabindex="-1"
        aria-label={`Resize (${handle})`}
        onpointerdown={(e) => handlePointerDownResize(e, handle)}
      ></span>
    {/each}
  {/if}
</div>

<style>
  .dd-el {
    position: absolute;
    overflow: hidden;
    font-size: 12px;
    color: #222;
    white-space: pre-wrap;
    cursor: grab;
  }

  .dd-el:active {
    cursor: grabbing;
  }

  .dd-el:hover:not(.dd-el--selected) {
    outline: 1px dashed var(--dd-border);
  }

  .dd-el:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-el--selected {
    outline: 1.5px solid var(--dd-accent);
    box-shadow: 0 0 0 3px var(--dd-accent-weak);
  }

  .dd-el-token {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--dd-accent-strong);
    background: var(--dd-accent-weak);
    border: 1px solid var(--dd-accent);
    border-radius: var(--dd-radius-sm);
    padding: 1px 6px;
    font-family: var(--dd-mono);
    font-size: 11px;
    max-width: 100%;
  }

  .dd-el-token :global(svg) {
    flex: none;
    opacity: 0.8;
  }

  .dd-el-text-edit {
    display: block;
    outline: none;
    cursor: text;
  }

  .dd-el-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    color: var(--dd-muted);
    font-style: italic;
    background: var(--dd-panel-alt);
    border: 1px dashed var(--dd-border);
    border-radius: var(--dd-radius-sm);
  }

  .dd-el-line {
    display: block;
    width: 100%;
    border-top: 1px solid #333;
  }

  .dd-el-box {
    display: block;
    width: 100%;
    height: 100%;
    border: 1px solid #333;
    border-radius: 2px;
  }

  .dd-el-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .dd-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--dd-accent);
    border: 1px solid #fff;
    border-radius: 2px;
  }

  .dd-handle--nw {
    left: -4px;
    top: -4px;
    cursor: nwse-resize;
  }
  .dd-handle--n {
    left: 50%;
    top: -4px;
    transform: translateX(-50%);
    cursor: ns-resize;
  }
  .dd-handle--ne {
    right: -4px;
    top: -4px;
    cursor: nesw-resize;
  }
  .dd-handle--w {
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: ew-resize;
  }
  .dd-handle--e {
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: ew-resize;
  }
  .dd-handle--sw {
    left: -4px;
    bottom: -4px;
    cursor: nesw-resize;
  }
  .dd-handle--s {
    left: 50%;
    bottom: -4px;
    transform: translateX(-50%);
    cursor: ns-resize;
  }
  .dd-handle--se {
    right: -4px;
    bottom: -4px;
    cursor: nwse-resize;
  }
</style>
