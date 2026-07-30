<script lang="ts">
  import { onDestroy } from 'svelte';
  import { styleToCss, type FreeElement } from '@docsmith/core';
  import Icon from './ui/Icon.svelte';

  const GRID = 4;
  const MIN_SIZE = 10;

  let {
    element,
    selected,
    zoom = 1,
    bandLabel,
    unit = 'px',
    contentWidthPx = 0,
    bandHeightPx = 0,
    siblings = [],
    suppressToolbar = false,
    onSelect,
    onChange,
    onDragStart,
    onDragEnd,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBack,
    onEditText,
    onGuides,
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
    /** Template-global layout unit (memory.md D-028). x/w are relative to
     * `contentWidthPx`; y/h are relative to `bandHeightPx` — both required
     * (and used) only when unit === '%'; ignored in 'px' mode. */
    unit?: 'px' | '%';
    contentWidthPx?: number;
    bandHeightPx?: number;
    /** Every other element in the same band (this element included — filtered
     * out by id) — used only to compute alignment guides while dragging
     * (memory.md D-038). Already in the same unit as `element.x/y/w/h`, so
     * no conversion needed to compare edges. */
    siblings?: FreeElement[];
    /** True while ANY element in the band is being dragged (memory.md
     * D-043), not just this one — the band's cursor is often hovering over a
     * neighboring element mid-drag (elements overlap while being repositioned),
     * which would otherwise reveal THAT element's own hover toolbar even
     * though nothing about it is selected or being interacted with. */
    suppressToolbar?: boolean;
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
    /** Fired on every move-drag tick with the current alignment-guide
     * positions (already in `unit`-space, ready to use as a CSS left/top
     * value), and once more with `{x:null,y:null}` on drag end. The parent
     * (Band.svelte) renders the actual guide-line overlay — ephemeral,
     * drag-time-only, never written to the template. */
    onGuides?: (guides: { x: number | null; y: number | null }) => void;
  } = $props();

  // px<->% conversion (memory.md D-028). No-ops in 'px' mode. x/w use the
  // band's content width as their basis; y/h use the band's own height —
  // same split core.convertLayoutUnit uses for the one-time migration.
  function toPx(value: number, basisPx: number): number {
    return unit === '%' ? (value / 100) * basisPx : value;
  }
  function fromPx(value: number, basisPx: number): number {
    return unit === '%' ? (value / basisPx) * 100 : value;
  }
  function snapX(n: number): number {
    return unit === '%' ? Math.round(n * 2) / 2 : Math.round(n / GRID) * GRID;
  }
  function snapY(n: number): number {
    return unit === '%' ? Math.round(n * 2) / 2 : Math.round(n / GRID) * GRID;
  }
  const minW = $derived(fromPx(MIN_SIZE, contentWidthPx));
  const minH = $derived(fromPx(MIN_SIZE, bandHeightPx));
  // The right edge of the free-form coordinate space (memory.md D-054: this
  // IS the real printable width in 'px' mode, 100% in '%' mode) — dragging
  // or resizing must not be able to push an element's x+w past it. Only X
  // is clamped this way, not Y: bands stack/flow vertically and several
  // (reportHeader with height:0, e.g.) auto-grow to fit their content, so
  // there's no single fixed "bottom" the way the page's real width is a
  // single fixed right edge. `contentWidthPx || Infinity`: it defaults to 0
  // (an "unset/unknown" sentinel, not "the page is 0px wide") whenever a
  // caller doesn't pass a real page width — a real 0 would otherwise clamp
  // every element to x:0, unable to move at all.
  const maxXBasis = $derived(unit === '%' ? 100 : contentWidthPx || Infinity);

  // Alignment guides while dragging (memory.md D-038): snap-to-sibling on
  // left/center/right (x) and top/center/bottom (y) edges independently —
  // matching Figma/Sketch-style smart guides. Tolerance is in `unit`-space
  // (same idea as snapX/snapY's own px-vs-% split above) since edges in the
  // same band already share one basis (contentWidthPx for x, bandHeightPx
  // for y), so comparing raw stored values works with no conversion.
  // 4px (memory.md D-038's original value) needs near-pixel-perfect mouse
  // positioning to ever trigger by hand — confirmed the guide mechanism
  // itself fires correctly under a smooth simulated drag, but a real mouse
  // gesture rarely lands within 4px of a sibling edge on the way past it
  // (memory.md D-059). Widened to a still-tight-feeling but achievable 8px.
  const ALIGN_TOLERANCE = $derived(unit === '%' ? 1.2 : 8);

  function computeAlignSnap(
    x: number,
    y: number,
    w: number,
    h: number,
  ): { x: number | null; y: number | null; snappedX: number; snappedY: number } {
    const myXs = [x, x + w / 2, x + w];
    const myYs = [y, y + h / 2, y + h];
    let bestX: { guide: number; delta: number } | null = null;
    let bestY: { guide: number; delta: number } | null = null;
    for (const sib of siblings) {
      if (sib.id === element.id) continue;
      const sibXs = [sib.x, sib.x + sib.w / 2, sib.x + sib.w];
      const sibYs = [sib.y, sib.y + sib.h / 2, sib.y + sib.h];
      for (const mx of myXs) {
        for (const sx of sibXs) {
          const delta = sx - mx;
          if (Math.abs(delta) <= ALIGN_TOLERANCE && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
            bestX = { guide: sx, delta };
          }
        }
      }
      for (const my of myYs) {
        for (const sy of sibYs) {
          const delta = sy - my;
          if (Math.abs(delta) <= ALIGN_TOLERANCE && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
            bestY = { guide: sy, delta };
          }
        }
      }
    }
    return {
      x: bestX ? bestX.guide : null,
      y: bestY ? bestY.guide : null,
      snappedX: bestX ? x + bestX.delta : x,
      snappedY: bestY ? y + bestY.delta : y,
    };
  }

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

  // $state (not a plain let) so the toolbar can hide reactively while a
  // drag is in progress (see dd-el-toolbar--visible below) — it's read
  // from the template, not just from event-handler closures.
  let drag: DragState | null = $state(null);
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
      // Visual (true px-equivalent) aspect ratio — w/h alone would be wrong
      // in '%' mode since x/w and y/h use different bases (content width vs
      // band height); see memory.md D-028.
      aspect: toPx(element.w, contentWidthPx) / (toPx(element.h, bandHeightPx) || 1),
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drag) return;
    const dxRaw = (e.clientX - drag.startX) / zoom;
    const dyRaw = (e.clientY - drag.startY) / zoom;
    const dx = fromPx(dxRaw, contentWidthPx);
    const dy = fromPx(dyRaw, bandHeightPx);

    const maxX = Math.max(0, maxXBasis - element.w);

    if (drag.kind === 'move') {
      const rawX = Math.min(maxX, Math.max(0, drag.ox + dx));
      const rawY = Math.max(0, drag.oy + dy);
      const align = computeAlignSnap(rawX, rawY, element.w, element.h);
      onGuides?.({ x: align.x, y: align.y });
      onChange({
        x: Math.min(maxX, Math.max(0, align.x !== null ? align.snappedX : snapX(rawX))),
        y: Math.max(0, align.y !== null ? align.snappedY : snapY(rawY)),
      });
      return;
    }

    const { handle, ox, oy, ow, oh, aspect } = drag;
    let x = ox;
    let y = oy;
    let w = ow;
    let h = oh;

    const lockAspect = e.shiftKey && element.kind === 'image';

    // Neither handle can push x (west) below 0 or x+w (east) past
    // maxXBasis — the real page's right edge (memory.md D-054/D-057).
    if (handle.includes('w')) {
      w = Math.min(Math.max(minW, ow - dx), ox + ow);
      x = Math.max(0, ox + (ow - w));
    }
    if (handle.includes('e')) {
      w = Math.max(minW, Math.min(ow + dx, maxXBasis - ox));
    }
    if (handle.includes('n')) {
      h = Math.max(minH, oh - dy);
      y = oy + (oh - h);
    }
    if (handle.includes('s')) {
      h = Math.max(minH, oh + dy);
    }

    if (lockAspect && (handle.length === 2)) {
      // Corner handle: derive height from width to keep the original visual
      // aspect ratio (in true px terms, then converted back to this unit).
      const visualW = toPx(w, contentWidthPx);
      h = Math.max(minH, fromPx(visualW / aspect, bandHeightPx));
      if (handle.includes('n')) y = oy + (oh - h);
    }

    onChange({ x: snapX(x), y: snapY(y), w: snapX(w), h: snapY(h) });
  }

  function handlePointerUp() {
    if (drag) onDragEnd?.();
    if (drag?.kind === 'move') onGuides?.({ x: null, y: null });
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
    // Also close out the drag itself (memory.md D-043) — Band.svelte's
    // `anyDragging` toolbar-suppression flag would otherwise stay stuck
    // true forever (no matching onDragEnd) if the dragged element is
    // destroyed mid-gesture.
    if (drag) onDragEnd?.();
    if (drag?.kind === 'move') onGuides?.({ x: null, y: null });
  });

  // Each key-nudge is its own discrete undo step (unlike a pointer drag, which
  // is a single continuous gesture batched via onDragStart/onDragEnd).
  function nudge(patch: Partial<FreeElement>) {
    onDragStart?.();
    onChange(patch);
    onDragEnd?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    const stepPx = e.shiftKey ? 10 : 1;
    const stepX = fromPx(stepPx, contentWidthPx);
    const stepY = fromPx(stepPx, bandHeightPx);
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        nudge({ y: Math.max(0, element.y - stepY) });
        break;
      case 'ArrowDown':
        e.preventDefault();
        nudge({ y: element.y + stepY });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nudge({ x: Math.max(0, element.x - stepX) });
        break;
      case 'ArrowRight':
        e.preventDefault();
        nudge({ x: Math.min(Math.max(0, maxXBasis - element.w), element.x + stepX) });
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

  // design.md §12's documented pattern is "x {x} y {y}" (no unit suffix) —
  // preserved exactly for the default 'px' case; '%' appends the suffix so
  // the two modes aren't ambiguous to a screen-reader user.
  const posSuffix = $derived(unit === '%' ? '%' : '');
  const ariaLabel = $derived(
    `${element.kind === 'field' ? `${displayLabel} field` : `${element.kind} element`}, ${bandLabel}, x ${element.x}${posSuffix} y ${element.y}${posSuffix}`,
  );

  const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
</script>

<div
  class="dd-el"
  class:dd-el--selected={selected}
  class:dd-el--toolbar-suppressed={suppressToolbar}
  style="left:{element.x}{unit};top:{element.y}{unit};width:{element.w}{unit};height:{element.h}{unit}"
  role="button"
  tabindex="0"
  aria-label={ariaLabel}
  aria-pressed={selected}
  onpointerdown={handlePointerDownMove}
  onkeydown={handleKeydown}
  ondblclick={handleDblClick}
>
  <!-- Inline hover/focus/selected toolbar — the four most common actions
       (already all wired via props for Properties panel buttons/keyboard
       shortcuts) right at the cursor instead of only in the right rail.
       Mirrors StackBand.svelte/GridBand.svelte's existing hover-reveal
       element actions, extended here to free-form elements. -->
  <div class="dd-el-toolbar" class:dd-el-toolbar--visible={selected && !suppressToolbar}>
    <button
      type="button"
      class="dd-el-toolbar-btn"
      aria-label="Send back"
      title="Send back ["
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => {
        e.stopPropagation();
        onSendBack();
      }}
    >
      <Icon name="chevronDown" size={12} />
    </button>
    <button
      type="button"
      class="dd-el-toolbar-btn"
      aria-label="Bring forward"
      title="Bring forward ]"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => {
        e.stopPropagation();
        onBringForward();
      }}
    >
      <Icon name="chevronUp" size={12} />
    </button>
    <span class="dd-el-toolbar-sep"></span>
    <button
      type="button"
      class="dd-el-toolbar-btn"
      aria-label="Duplicate"
      title="Duplicate ⌘D"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => {
        e.stopPropagation();
        onDuplicate();
      }}
    >
      <Icon name="doc" size={12} />
    </button>
    <button
      type="button"
      class="dd-el-toolbar-btn dd-el-toolbar-btn--danger"
      aria-label="Delete"
      title="Delete"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      <Icon name="close" size={12} />
    </button>
  </div>

  <!-- Content lives in its own overflow:hidden layer so long text/oversized
       images clip to the element's box without also clipping the toolbar
       (top:-34px, outside the box) or the resize handles (small negative
       offsets) — both siblings of this, direct children of .dd-el itself.
       The element's own style (bg/bold/italic/align/color/fontSize/padding)
       is applied here via core's styleToCss — the SAME function Preview/PDF
       use — so background color, alignment, and formatting are visible
       while editing, not just after switching to Preview. -->
  <div class="dd-el-body" style={styleToCss(element.style)}>
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
  </div>

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
    font-size: 12px;
    color: #222;
    cursor: grab;
  }

  /* white-space:pre-wrap lives here, not on .dd-el, and this is not just
     cosmetic scoping: .dd-el's children include this content div AND the
     toolbar div, both separated by an ordinary whitespace/newline text node
     from the template. white-space:pre-wrap makes that whitespace
     SIGNIFICANT (like a <pre>) — on .dd-el itself, that stray newline
     rendered as a real preserved line break, silently pushing this whole
     content box down by one line-height, which desynced the element's
     visible content from its own selection outline/resize handles/hover
     toolbar position (all sized against .dd-el's real, unshifted box).
     Scoping the property to just this leaf avoids the whitespace-between-
     siblings hazard entirely, and is also more correct: the toolbar's icon
     buttons never needed multi-line text preservation, only actual
     free-form text content does. */
  .dd-el-body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    white-space: pre-wrap;
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

  .dd-el-toolbar {
    position: absolute;
    top: -34px;
    left: 0;
    display: flex;
    align-items: center;
    gap: 2px;
    background: #1a1c22;
    border-radius: 8px;
    padding: 3px;
    box-shadow: var(--dd-shadow);
    opacity: 0;
    transform: translateY(4px) scale(0.97);
    pointer-events: none;
    transition: opacity 0.12s ease, transform 0.12s ease;
    z-index: 6;
    cursor: default;
  }

  .dd-el:hover .dd-el-toolbar,
  .dd-el:focus-within .dd-el-toolbar,
  .dd-el-toolbar--visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  /* A `!important` override, not just a class/specificity fight — while
     ANY element in the band is being dragged, the toolbar must stay hidden
     even though the pointer is physically hovering the element the whole
     time (its own drag) or ends up over a DIFFERENT element it was dragged
     onto (elements overlap mid-move), both of which keep `:hover`/
     `:focus-within` matching regardless of source order (memory.md D-043). */
  .dd-el--toolbar-suppressed .dd-el-toolbar {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .dd-el-toolbar {
      transition: none;
    }
  }

  .dd-el-toolbar-sep {
    width: 1px;
    height: 16px;
    background: #35383f;
    margin: 0 2px;
  }

  .dd-el-toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #b7bcc6;
    cursor: pointer;
  }

  .dd-el-toolbar-btn:hover {
    background: #2b2e36;
    color: #fff;
  }

  .dd-el-toolbar-btn:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-el-toolbar-btn--danger:hover {
    background: #4a1f1d;
    color: #ff8a83;
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
