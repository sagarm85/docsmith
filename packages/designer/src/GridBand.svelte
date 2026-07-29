<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { DataSourceAdapter, FieldMeta, FreeBand, FreeElement, ValueFormat } from '@docsmith/core';
  import {
    createGridBlockElement,
    createGridFieldElement,
    createGridPlaceholderElement,
    SECTION_PRESETS,
    type BlockKind,
  } from './template-edits.js';
  import Icon from './ui/Icon.svelte';
  import type { IconName } from './ui/icons.js';

  type DragPayload = {
    cls: 'header' | 'dataset';
    datasetId: string | null;
    column: string;
    type: string;
    label: string;
    format: ValueFormat;
  };
  type BlockDragPayload = { kind: BlockKind };

  let {
    band,
    selectedElementId,
    bandSelected,
    onUpdateElements,
    onInvalidDrop,
    onSelectElement,
    onSelectBand,
    onDeselect,
    onElementDelete,
    onElementDuplicate,
    onElementEditText,
    onGridColumnsChange,
    onColumnResizeStart,
    onColumnResizeEnd,
    onSectionLayoutChange,
    onDuplicateSection,
    onDeleteSection,
    adapter,
    entity,
  }: {
    band: FreeBand;
    selectedElementId?: string;
    bandSelected?: boolean;
    /** Replaces the band's whole `elements` array — every grid edit (fill a
     * cell, replace a cell, delete, add a row) is expressed this way, same
     * pattern as StackBand.svelte (memory.md D-034). */
    onUpdateElements: (elements: FreeElement[]) => void;
    onInvalidDrop: (reason: string) => void;
    onSelectElement: (elementId: string) => void;
    onSelectBand: () => void;
    onDeselect: () => void;
    onElementDelete: (elementId: string) => void;
    onElementDuplicate: (elementId: string) => void;
    onElementEditText: (elementId: string, text: string) => void;
    /** Cursor-drag column resize (memory.md D-044, the "Confluence-style
     * column divider" affordance) — called continuously during a drag with
     * the row index and its whole new columns array so the parent can
     * live-apply it to that row's own `sectionColumns` entry (memory.md
     * D-048; no history push per tick, same pattern as FreeElement's
     * onChange). Undefined disables the resize handles entirely (matches
     * the BandProps.svelte column-width editor also being the only way to
     * resize when this isn't wired). */
    onGridColumnsChange?: (row: number, columns: number[]) => void;
    /** Batches the whole resize gesture into one undo step, same
     * onDragStart/onDragEnd pattern FreeElement.svelte uses for move/resize
     * (memory.md D-020) — DocDesigner reuses its existing element-drag
     * snapshot/commit handlers for this since they don't care what
     * changed, only when the gesture starts/ends. */
    onColumnResizeStart?: () => void;
    onColumnResizeEnd?: () => void;
    /** Section hover toolbar (memory.md D-049) — "change layout" swaps a
     * row's own `sectionColumns` entry to a different preset (existing
     * elements keep their content, clamped into the new column count
     * rather than disappearing); duplicate/delete act on the whole row at
     * once. Undefined hides the toolbar entirely (same honest-disable
     * pattern as every other optional capability here). */
    onSectionLayoutChange?: (row: number, columns: number[]) => void;
    onDuplicateSection?: (row: number) => void;
    onDeleteSection?: (row: number) => void;
    /** Powers the click-to-add inline field/text picker (memory.md D-047) —
     * undefined disables the picker entirely (an empty cell falls back to
     * drag-and-drop only), matching every other "honestly disabled until
     * the capability exists" affordance in this codebase. Only header
     * fields are offered (same D-018 rule as the palette's own header vs.
     * dataset split — a grid band is never the detail table). */
    adapter?: DataSourceAdapter;
    entity?: string;
  } = $props();

  const bandLabel: Record<FreeBand['type'], string> = {
    reportHeader: 'Report Header',
    pageHeader: 'Page Header',
    totals: 'Totals',
    pageFooter: 'Page Footer',
  };
  const bandVariant: Record<FreeBand['type'], 'hero' | 'run' | 'totals'> = {
    reportHeader: 'hero',
    pageHeader: 'run',
    totals: 'totals',
    pageFooter: 'run',
  };
  const bandIcon: Record<FreeBand['type'], IconName> = {
    reportHeader: 'doc',
    pageHeader: 'repeat',
    totals: 'calculator',
    pageFooter: 'repeat',
  };

  const bordered = $derived(Boolean(band.gridBorder));

  // Each row ("section", memory.md D-037/D-048) can have its own independent
  // column layout — a row missing from `sectionColumns` falls back to the
  // band's own `gridColumns` (or a single 100% column), same fallback
  // core.renderGridBand uses.
  function resolveRowColumns(row: number): number[] {
    const cols = band.sectionColumns?.[row];
    if (cols?.length) return cols;
    return band.gridColumns?.length ? band.gridColumns : [100];
  }

  // Cumulative left-edge percent of each internal column boundary (between
  // column i and i+1) within ONE row's own columns — where that row's resize
  // handle overlay sits (memory.md D-044/D-048).
  function boundariesFor(cols: number[]): number[] {
    const cum: number[] = [];
    let sum = 0;
    for (let i = 0; i < cols.length - 1; i++) {
      sum += cols[i] as number;
      cum.push(sum);
    }
    return cum;
  }

  // A cell can hold more than one stacked element (memory.md D-045, "add
  // multiple fields to one section column") — grouped by (row, col), not one
  // element each.
  type Cell = { kind: 'group'; elements: FreeElement[]; span: number } | { kind: 'empty'; row: number; col: number };
  type Row = { cols: number[]; cells: Cell[] };

  // One entry per (row, col) — the group of elements starting there (all
  // sharing the first element's `colSpan` via CSS `grid-column`), or an
  // "empty" placeholder cell for any column no element covers. Re-implements
  // the same row/col grouping core.renderGridBand uses, since the designer
  // doesn't import core's render.ts internals. Each row resolves its OWN
  // column count independently (memory.md D-048).
  const rows = $derived.by(() => {
    const byRowCol = new Map<string, FreeElement[]>();
    let maxRow = -1;
    for (const el of band.elements) {
      const r = el.row ?? 0;
      const c = el.col ?? 0;
      const key = `${r}:${c}`;
      const group = byRowCol.get(key);
      if (group) group.push(el);
      else byRowCol.set(key, [el]);
      maxRow = Math.max(maxRow, r);
    }
    const out: Row[] = [];
    for (let r = 0; r <= maxRow; r++) {
      const cols = resolveRowColumns(r);
      const cells: Cell[] = [];
      let c = 0;
      while (c < cols.length) {
        const group = byRowCol.get(`${r}:${c}`);
        if (group && group.length > 0) {
          const span = Math.max(1, Math.min(group[0]!.colSpan ?? 1, cols.length - c));
          cells.push({ kind: 'group', elements: group, span });
          c += span;
        } else {
          cells.push({ kind: 'empty', row: r, col: c });
          c += 1;
        }
      }
      out.push({ cols, cells });
    }
    return out;
  });

  function nextRowIndex(): number {
    return rows.length;
  }

  function parseFieldPayload(e: DragEvent): DragPayload | null {
    const raw = e.dataTransfer?.getData('application/x-doc-field');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  }

  function parseBlockPayload(e: DragEvent): BlockDragPayload | null {
    const raw = e.dataTransfer?.getData('application/x-doc-block');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BlockDragPayload;
    } catch {
      return null;
    }
  }

  function elementFromDrop(e: DragEvent, row: number, col: number): FreeElement | 'invalid' | null {
    const block = parseBlockPayload(e);
    if (block) return createGridBlockElement(block.kind, row, col);
    const field = parseFieldPayload(e);
    if (!field) return null;
    if (field.cls !== 'header') return 'invalid';
    return createGridFieldElement('header', { name: field.column, label: field.label, type: field.type }, row, col);
  }

  let dragOverKey = $state<string | null>(null);

  function handleCellDragOver(e: DragEvent, row: number, col: number) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOverKey = `${row}:${col}`;
  }
  function handleCellDragLeave() {
    dragOverKey = null;
  }
  // Dropping onto a cell that already holds a lone, untouched placeholder
  // (from "Add row"/a Section) replaces it in place — that's the whole point
  // of a placeholder. Dropping onto a cell with REAL content instead appends
  // (stacks) the new element alongside it (memory.md D-045) — the mechanism
  // behind "add multiple fields to one section column". Shared by both the
  // drag-and-drop path and the click-to-add picker (memory.md D-047).
  function placeElement(group: FreeElement[] | null, el: FreeElement) {
    const solePlaceholder = group?.length === 1 && isPlaceholder(group[0]!) ? group[0]! : null;
    if (solePlaceholder) {
      onUpdateElements(band.elements.map((existing) => (existing.id === solePlaceholder.id ? el : existing)));
    } else {
      onUpdateElements([...band.elements, el]);
    }
  }

  function handleCellDrop(e: DragEvent, row: number, col: number, group: FreeElement[] | null) {
    e.preventDefault();
    e.stopPropagation();
    dragOverKey = null;
    const el = elementFromDrop(e, row, col);
    if (el === 'invalid') {
      onInvalidDrop('Line-item fields can only go in the items table.');
      return;
    }
    if (!el) return;
    placeElement(group, el);
  }

  function handleAddRow() {
    onUpdateElements([...band.elements, createGridPlaceholderElement(nextRowIndex(), 0)]);
  }

  // Splits a wide (colSpan > 1) cell into two side by side (memory.md
  // D-050) — a direct canvas alternative to typing a new "Width across
  // columns" number in Properties. The existing content keeps roughly half
  // its original span; the freed columns become a genuine new placeholder
  // cell, not a phantom gap.
  function handleSplitCell(rowIndex: number, group: FreeElement[], span: number, groupCol: number) {
    if (span < 2) return;
    const leftSpan = Math.floor(span / 2);
    const rightSpan = span - leftSpan;
    const rightCol = groupCol + leftSpan;
    const groupIds = new Set(group.map((el) => el.id));
    const shrunk = band.elements.map((el) => (groupIds.has(el.id) ? { ...el, colSpan: leftSpan } : el));
    const placeholder = createGridPlaceholderElement(rowIndex, rightCol);
    onUpdateElements([...shrunk, { ...placeholder, colSpan: rightSpan > 1 ? rightSpan : undefined }]);
  }

  // ── Section hover toolbar (memory.md D-049) ─────────────────────────────
  let layoutPopoverRow = $state<number | null>(null);

  function toggleLayoutPopover(row: number) {
    layoutPopoverRow = layoutPopoverRow === row ? null : row;
  }

  function chooseLayout(row: number, columns: number[]) {
    onSectionLayoutChange?.(row, columns);
    layoutPopoverRow = null;
  }

  function sameColumns(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((w, i) => w === b[i]);
  }

  // ── Click-to-add inline picker (memory.md D-047) ────────────────────────
  // An easier alternative to drag-and-drop: click any empty cell to search
  // header fields or add plain text, without needing to drag anything.
  type PickerState = { row: number; col: number; group: FreeElement[] | null };
  let picker = $state<PickerState | null>(null);
  let pickerSearch = $state('');

  type FieldsState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: FieldMeta[] };
  let fieldsState = $state<FieldsState>({ status: 'idle' });
  let fieldsGen = 0;

  async function ensureFieldsLoaded() {
    if (!adapter || !entity) return;
    if (fieldsState.status === 'ready' || fieldsState.status === 'loading') return;
    const gen = ++fieldsGen;
    fieldsState = { status: 'loading' };
    try {
      const data = await adapter.getFields(entity);
      if (gen !== fieldsGen) return;
      fieldsState = { status: 'ready', data };
    } catch (err) {
      if (gen !== fieldsGen) return;
      fieldsState = { status: 'error', message: err instanceof Error ? err.message : 'Failed to load fields.' };
    }
  }

  const filteredPickerFields = $derived.by(() => {
    if (fieldsState.status !== 'ready') return [];
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return fieldsState.data;
    return fieldsState.data.filter((f) => f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
  });

  function openPicker(row: number, col: number, group: FreeElement[] | null) {
    picker = { row, col, group };
    pickerSearch = '';
    void ensureFieldsLoaded();
  }

  function closePicker() {
    picker = null;
    pickerSearch = '';
  }

  function pickField(field: FieldMeta) {
    if (!picker) return;
    const el = createGridFieldElement('header', { name: field.name, label: field.label, type: field.type }, picker.row, picker.col);
    placeElement(picker.group, el);
    closePicker();
  }

  function pickTypeText() {
    if (!picker) return;
    const el = createGridBlockElement('text', picker.row, picker.col);
    placeElement(picker.group, el);
    editingId = el.id;
    closePicker();
  }

  function handlePickerKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePicker();
    }
  }

  // Close on any outside click — composedPath() (not e.target) since this
  // runs inside a shadow root (memory.md D-022). Clicking any empty cell
  // (including the one that's opening/reopening the picker) is exempted so
  // the same click that opens a picker can't also immediately close it.
  function handleWindowClick(e: MouseEvent) {
    const path = e.composedPath();
    if (picker) {
      const clickedEmptyCell = path.some((n) => n instanceof Element && n.classList.contains('dd-grid-cell--empty'));
      if (!clickedEmptyCell) closePicker();
    }
    if (layoutPopoverRow !== null) {
      const clickedToolbar = path.some((n) => n instanceof Element && n.classList.contains('dd-section-toolbar'));
      if (!clickedToolbar) layoutPopoverRow = null;
    }
  }

  function handleBodyClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onDeselect();
  }

  let editingId = $state<string | null>(null);

  function handleDblClick(el: FreeElement) {
    if (el.kind !== 'text') return;
    editingId = el.id;
  }

  function commitTextEdit(el: FreeElement, e: Event) {
    editingId = null;
    onElementEditText(el.id, (e.currentTarget as HTMLElement).textContent ?? '');
  }

  function isPlaceholder(el: FreeElement): boolean {
    return el.kind === 'text' && !el.text;
  }

  // ── Cursor-drag column resize (memory.md D-044/D-048) ───────────────────
  // Resizing is per-row/"section" now — each row has its own independent
  // columns, so a drag only ever touches the one row it started on.
  const MIN_COL_PERCENT = 8;
  type ResizeState = {
    rowIndex: number;
    colIndex: number;
    startX: number;
    leftOriginal: number;
    rightOriginal: number;
    wrapWidthPx: number;
    baseCols: number[];
  };
  let resizing = $state<ResizeState | null>(null);

  function handleResizePointerDown(e: PointerEvent, rowIndex: number, colIndex: number, cols: number[]) {
    e.preventDefault();
    e.stopPropagation();
    const wrapEl = (e.currentTarget as HTMLElement).closest('.dd-grid-row-wrap');
    if (!wrapEl) return;
    resizing = {
      rowIndex,
      colIndex,
      startX: e.clientX,
      leftOriginal: cols[colIndex] as number,
      rightOriginal: cols[colIndex + 1] as number,
      wrapWidthPx: wrapEl.getBoundingClientRect().width,
      baseCols: cols,
    };
    onColumnResizeStart?.();
    window.addEventListener('pointermove', handleResizePointerMove);
    window.addEventListener('pointerup', handleResizePointerUp);
  }

  function handleResizePointerMove(e: PointerEvent) {
    if (!resizing) return;
    const deltaPercent = ((e.clientX - resizing.startX) / resizing.wrapWidthPx) * 100;
    const pairTotal = resizing.leftOriginal + resizing.rightOriginal;
    const newLeft = Math.max(
      MIN_COL_PERCENT,
      Math.min(pairTotal - MIN_COL_PERCENT, resizing.leftOriginal + deltaPercent),
    );
    const next = [...resizing.baseCols];
    next[resizing.colIndex] = Math.round(newLeft * 10) / 10;
    next[resizing.colIndex + 1] = Math.round((pairTotal - newLeft) * 10) / 10;
    onGridColumnsChange?.(resizing.rowIndex, next);
  }

  function handleResizePointerUp() {
    if (resizing) onColumnResizeEnd?.();
    resizing = null;
    window.removeEventListener('pointermove', handleResizePointerMove);
    window.removeEventListener('pointerup', handleResizePointerUp);
  }

  onDestroy(() => {
    window.removeEventListener('pointermove', handleResizePointerMove);
    window.removeEventListener('pointerup', handleResizePointerUp);
    if (resizing) onColumnResizeEnd?.();
  });

  function elementAriaLabel(el: FreeElement): string {
    if (isPlaceholder(el)) return `Empty cell, ${bandLabel[band.type]}`;
    if (el.kind === 'field') return `${el.label ?? el.binding?.column ?? 'field'} field, ${bandLabel[band.type]}`;
    if (el.kind === 'text') return `“${(el.text ?? '').slice(0, 40)}” text, ${bandLabel[band.type]}`;
    return `${el.kind} element ${el.id}, ${bandLabel[band.type]}`;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="dd-band dd-band--{bandVariant[band.type]}">
  <button type="button" class="dd-band-tab" class:dd-band-tab--selected={bandSelected} data-band-id={band.id} onclick={onSelectBand}>
    <Icon name={bandIcon[band.type]} size={12} />
    {bandLabel[band.type]}
    <span class="dd-stack-badge">Grid</span>
  </button>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="dd-grid-body" role="group" aria-label={`${bandLabel[band.type]} band`} onclick={handleBodyClick}>
    {#if rows.length === 0}
      <p class="dd-band-empty">
        <Icon name="plus" size={13} />
        Add a row, then drag header fields into its cells.
      </p>
    {:else}
      <div class="dd-grid-rows-wrap">
      {#each rows as row, rowIndex (rowIndex)}
        {@const rowBoundaries = boundariesFor(row.cols)}
        <div class="dd-grid-row-wrap">
        {#if onSectionLayoutChange || onDuplicateSection || onDeleteSection}
          <!-- Section hover toolbar (memory.md D-049) — revealed on hover/
               focus-within, same visual language as FreeElement's D-036
               toolbar. -->
          <div class="dd-section-toolbar">
            {#if onSectionLayoutChange}
              <button
                type="button"
                class="dd-section-toolbar-btn"
                aria-label={`Change layout for section ${rowIndex + 1}`}
                title="Change layout"
                onclick={() => toggleLayoutPopover(rowIndex)}
              >
                <Icon name="layers" size={12} />
              </button>
            {/if}
            {#if onDuplicateSection}
              <button
                type="button"
                class="dd-section-toolbar-btn"
                aria-label={`Duplicate section ${rowIndex + 1}`}
                title="Duplicate section"
                onclick={() => onDuplicateSection?.(rowIndex)}
              >
                <Icon name="doc" size={12} />
              </button>
            {/if}
            {#if onDeleteSection}
              <button
                type="button"
                class="dd-section-toolbar-btn dd-section-toolbar-btn--danger"
                aria-label={`Delete section ${rowIndex + 1}`}
                title="Delete section"
                onclick={() => onDeleteSection?.(rowIndex)}
              >
                <Icon name="trash" size={12} />
              </button>
            {/if}
            {#if layoutPopoverRow === rowIndex}
              <div class="dd-layout-popover" role="menu" aria-label="Choose a layout">
                {#each SECTION_PRESETS as preset (preset.label)}
                  <button
                    type="button"
                    role="menuitem"
                    class="dd-layout-popover-option"
                    class:active={sameColumns(row.cols, preset.columns)}
                    onclick={() => chooseLayout(rowIndex, preset.columns)}
                  >
                    {preset.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        <div class="dd-grid-row" style="grid-template-columns:{row.cols.map((w) => `${w}%`).join(' ')}">
          {#each row.cells as cell (cell.kind === 'group' ? cell.elements[0]!.id : `${cell.row}:${cell.col}`)}
            {#if cell.kind === 'group' && !(cell.elements.length === 1 && isPlaceholder(cell.elements[0]!))}
              {@const group = cell.elements}
              {@const groupCol = group[0]!.col ?? 0}
              <!-- A cell can hold more than one stacked element (memory.md
                   D-045) — the cell itself is just a drop target for
                   appending another one; each sub-item below is its own
                   independently selectable/editable/deletable element. -->
              <div
                class="dd-grid-cell dd-grid-cell--filled"
                class:dd-grid-cell--bordered={bordered}
                class:dd-grid-cell--dragover={dragOverKey === `${rowIndex}:${groupCol}`}
                style="grid-column: span {cell.span}"
                role="group"
                aria-label={`${bandLabel[band.type]} cell`}
                ondragover={(e) => handleCellDragOver(e, rowIndex, groupCol)}
                ondragleave={handleCellDragLeave}
                ondrop={(e) => handleCellDrop(e, rowIndex, groupCol, group)}
              >
                {#each group as el (el.id)}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div
                    class="dd-grid-subitem"
                    class:dd-grid-subitem--selected={selectedElementId === el.id}
                    role="button"
                    tabindex="0"
                    aria-label={elementAriaLabel(el)}
                    aria-pressed={selectedElementId === el.id}
                    onclick={(e) => {
                      e.stopPropagation();
                      onSelectElement(el.id);
                    }}
                    ondblclick={() => handleDblClick(el)}
                  >
                    {#if el.kind === 'field'}
                      <span class="dd-stack-token">
                        <Icon name="field" size={10} />
                        {el.label ?? el.binding?.column}
                      </span>
                    {:else if el.kind === 'text'}
                      {#if editingId === el.id}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <span
                          class="dd-stack-text-edit"
                          role="textbox"
                          aria-label={`Edit text for ${bandLabel[band.type]} element`}
                          tabindex="0"
                          contenteditable="true"
                          onblur={(e) => commitTextEdit(el, e)}
                          onclick={(e) => e.stopPropagation()}
                        >{el.text}</span>
                      {:else}
                        <span>{el.text}</span>
                      {/if}
                    {:else if el.kind === 'image'}
                      {#if el.src?.value}
                        <img class="dd-stack-image" src={el.src.value} alt="" />
                      {:else}
                        <span class="dd-stack-placeholder">
                          <Icon name="image" size={16} />
                          Image
                        </span>
                      {/if}
                    {:else if el.kind === 'line'}
                      <span class="dd-stack-line"></span>
                    {:else if el.kind === 'box'}
                      <span class="dd-stack-box"></span>
                    {/if}

                    <span class="dd-stack-el-actions">
                      <button
                        type="button"
                        class="dd-stack-el-action"
                        aria-label="Duplicate"
                        onclick={(e) => {
                          e.stopPropagation();
                          onElementDuplicate(el.id);
                        }}
                      >
                        <Icon name="doc" size={11} />
                      </button>
                      <button
                        type="button"
                        class="dd-stack-el-action dd-stack-el-action--danger"
                        aria-label="Delete"
                        onclick={(e) => {
                          e.stopPropagation();
                          onElementDelete(el.id);
                        }}
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </span>
                  </div>
                {/each}
                {#if cell.span > 1}
                  <button
                    type="button"
                    class="dd-split-handle"
                    aria-label={`Split section ${rowIndex + 1}'s wide cell into two`}
                    title="Split into two columns"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleSplitCell(rowIndex, group, cell.span, groupCol);
                    }}
                  >
                    <Icon name="grip" size={12} />
                  </button>
                {/if}
              </div>
            {:else}
              {@const emptyRow = cell.kind === 'empty' ? cell.row : rowIndex}
              {@const emptyCol = cell.kind === 'empty' ? cell.col : (cell.elements[0]!.col ?? 0)}
              {@const placeholderGroup = cell.kind === 'group' ? cell.elements : null}
              {@const placeholderId = placeholderGroup ? placeholderGroup[0]!.id : null}
              <!-- A placeholder cell (real `text:''` element, e.g. from "Add
                   row"/a Sections drop) is deletable like any other element —
                   a genuinely-absent gap cell (no backing element, from a
                   neighboring colSpan not reaching this column) has nothing
                   to delete (memory.md D-043). role/tabindex are genuinely
                   conditional on adapter+entity being available (the
                   click-to-add picker, memory.md D-047) — the linter can't
                   see that they're always set together. -->
              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <div
                class="dd-grid-cell dd-grid-cell--empty"
                class:dd-grid-cell--bordered={bordered}
                class:dd-grid-cell--dragover={dragOverKey === `${emptyRow}:${emptyCol}`}
                role={adapter && entity ? 'button' : undefined}
                tabindex={adapter && entity ? 0 : undefined}
                aria-label={adapter && entity ? `Add a field or text, ${bandLabel[band.type]}` : `Empty cell, ${bandLabel[band.type]}, drop a field here`}
                ondragover={(e) => handleCellDragOver(e, emptyRow, emptyCol)}
                ondragleave={handleCellDragLeave}
                ondrop={(e) => handleCellDrop(e, emptyRow, emptyCol, placeholderGroup)}
                onclick={() => {
                  if (adapter && entity) openPicker(emptyRow, emptyCol, placeholderGroup);
                }}
                onkeydown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && adapter && entity) {
                    e.preventDefault();
                    openPicker(emptyRow, emptyCol, placeholderGroup);
                  }
                }}
              >
                {#if adapter && entity}
                  <span class="dd-grid-add-ghost"><Icon name="plus" size={11} /> Add a field</span>
                {:else}
                  Drop a field here
                {/if}
                {#if placeholderId}
                  <span class="dd-stack-el-actions">
                    <button
                      type="button"
                      class="dd-stack-el-action dd-stack-el-action--danger"
                      aria-label="Delete row"
                      onclick={(e) => {
                        e.stopPropagation();
                        onElementDelete(placeholderId);
                      }}
                    >
                      <Icon name="close" size={11} />
                    </button>
                  </span>
                {/if}

                {#if picker && picker.row === emptyRow && picker.col === emptyCol}
                  <div
                    class="dd-cell-picker"
                    role="group"
                    aria-label="Add a field or text"
                    onclick={(e) => e.stopPropagation()}
                    onkeydown={handlePickerKeydown}
                  >
                    <button type="button" class="dd-cell-picker-text" onclick={pickTypeText}>
                      <Icon name="text" size={12} /> Type your own text
                    </button>
                    <input
                      class="dd-cell-picker-search"
                      type="search"
                      placeholder="Search fields…"
                      aria-label="Search fields"
                      bind:value={pickerSearch}
                    />
                    <div class="dd-cell-picker-list">
                      {#if fieldsState.status === 'loading'}
                        <p class="dd-cell-picker-hint">Loading fields…</p>
                      {:else if fieldsState.status === 'error'}
                        <p class="dd-cell-picker-hint">{fieldsState.message}</p>
                      {:else if filteredPickerFields.length === 0}
                        <p class="dd-cell-picker-hint">No fields match.</p>
                      {:else}
                        {#each filteredPickerFields as field (field.name)}
                          <button type="button" class="dd-cell-picker-option" onclick={() => pickField(field)}>
                            {field.label}
                          </button>
                        {/each}
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
        {#if onGridColumnsChange && rowBoundaries.length > 0}
          <!-- Confluence-style column-resize dividers: a wide invisible
               pointer target with a thin line revealed on hover/drag
               (memory.md D-044) — scoped to THIS row/section's own columns,
               since each one is independent (memory.md D-048). -->
          <div class="dd-grid-resize-overlay">
            {#each rowBoundaries as leftPercent, i (i)}
              <button
                type="button"
                class="dd-grid-resize-handle"
                class:dd-grid-resize-handle--active={resizing?.rowIndex === rowIndex && resizing?.colIndex === i}
                style="left:{leftPercent}%"
                aria-label={`Resize column ${i + 1} in section ${rowIndex + 1}`}
                onpointerdown={(e) => handleResizePointerDown(e, rowIndex, i, row.cols)}
              ></button>
            {/each}
          </div>
        {/if}
        </div>
      {/each}
      </div>
    {/if}
    <button type="button" class="dd-grid-add-row" onclick={handleAddRow}>
      <Icon name="plus" size={12} />
      Add row
    </button>
  </div>
</div>

<style>
  .dd-band {
    position: relative;
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-band::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
  }

  .dd-band--hero::before { background: var(--dd-hero); }
  .dd-band--run::before { background: var(--dd-run); }
  .dd-band--totals::before { background: var(--dd-totals); }

  .dd-band--hero .dd-grid-body { background: var(--dd-hero-weak); }
  .dd-band--run .dd-grid-body { background: var(--dd-run-weak); }
  .dd-band--totals .dd-grid-body { background: var(--dd-totals-weak); }

  .dd-band-tab {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    text-align: left;
    padding: 4px 8px 4px 10px;
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--dd-muted);
    background: var(--dd-panel-alt);
    border: none;
    cursor: pointer;
  }

  .dd-band--hero .dd-band-tab { color: var(--dd-hero); }
  .dd-band--run .dd-band-tab { color: var(--dd-run); }
  .dd-band--totals .dd-band-tab { color: var(--dd-totals); }

  .dd-band-tab--selected {
    box-shadow: inset 0 0 0 1px currentColor;
  }

  .dd-band-tab:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-stack-badge {
    margin-left: auto;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--dd-muted);
    background: var(--dd-panel);
    border-radius: 4px;
    padding: 1px 5px;
    text-transform: none;
  }

  .dd-grid-body {
    position: relative;
    background: #fff;
    padding: 10px 10px 10px 13px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .dd-band-empty {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 11px;
    color: var(--dd-muted);
    font-style: italic;
  }

  .dd-grid-rows-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Each row/"section" (memory.md D-048) owns its own resize overlay,
     scoped to its own columns — sections are independent, not one shared
     column grid for the whole band. */
  .dd-grid-row-wrap {
    position: relative;
  }

  /* Section hover toolbar (memory.md D-049) — same reveal language as
     FreeElement.svelte's D-036 element toolbar. */
  .dd-section-toolbar {
    position: absolute;
    top: -30px;
    right: 0;
    display: flex;
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
  }

  .dd-grid-row-wrap:hover .dd-section-toolbar,
  .dd-grid-row-wrap:focus-within .dd-section-toolbar {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .dd-section-toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #fff;
    cursor: pointer;
  }

  .dd-section-toolbar-btn:hover {
    background: #2b2e36;
  }

  .dd-section-toolbar-btn--danger:hover {
    background: rgba(255, 107, 100, 0.2);
    color: #ff8a80;
  }

  .dd-layout-popover {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 140px;
    background: var(--dd-panel);
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    box-shadow: var(--dd-shadow);
    padding: 4px;
    z-index: 6;
  }

  .dd-layout-popover-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border: none;
    border-radius: var(--dd-radius-sm);
    background: transparent;
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .dd-layout-popover-option:hover {
    background: var(--dd-panel-alt);
  }

  .dd-layout-popover-option.active {
    color: var(--dd-accent-strong);
    font-weight: 600;
    background: var(--dd-accent-weak);
  }

  .dd-grid-row {
    display: grid;
    gap: 8px;
  }

  /* Confluence-style column-resize dividers (memory.md D-044): a wide
     invisible pointer target (::after) with a thin accent line revealed on
     hover/drag, spanning this row's own height only. */
  .dd-grid-resize-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .dd-grid-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 12px;
    margin-left: -6px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: col-resize;
    pointer-events: auto;
  }

  .dd-grid-resize-handle::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    margin-left: -1px;
    background: var(--dd-accent);
    border-radius: 1px;
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .dd-grid-resize-handle:hover::after,
  .dd-grid-resize-handle:focus-visible::after,
  .dd-grid-resize-handle--active::after {
    opacity: 1;
  }

  .dd-grid-resize-handle:focus-visible {
    outline: none;
  }

  .dd-grid-cell {
    position: relative;
    min-width: 0;
    min-height: 34px;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: var(--dd-radius-sm);
    font-size: 12px;
    color: #222;
    display: flex;
    align-items: center;
  }

  .dd-grid-cell--bordered {
    border-color: #b8bdc6;
    border-radius: 2px;
  }

  /* A filled cell is a passive container — each stacked element inside it
     (.dd-grid-subitem) is its own independently selectable/hoverable item
     (memory.md D-045). */
  .dd-grid-cell--filled {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  /* Split handle for a wide (colSpan > 1) cell (memory.md D-050) —
     revealed on hover, positioned at the cell's own horizontal center
     regardless of how many columns it spans. */
  .dd-split-handle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: none;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1.5px solid var(--dd-accent);
    border-radius: 50%;
    background: var(--dd-panel);
    color: var(--dd-accent-strong);
    box-shadow: var(--dd-shadow);
    cursor: pointer;
    z-index: 3;
  }

  .dd-grid-cell--filled:hover .dd-split-handle,
  .dd-grid-cell--filled:focus-within .dd-split-handle {
    display: flex;
  }

  .dd-grid-subitem {
    position: relative;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: var(--dd-radius-sm);
    padding: 2px 4px;
  }

  .dd-grid-subitem:hover {
    border-color: var(--dd-border);
  }

  .dd-grid-subitem:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-grid-subitem--selected {
    border-color: var(--dd-accent) !important;
    box-shadow: 0 0 0 3px var(--dd-accent-weak);
  }

  .dd-grid-cell--empty {
    position: relative;
    justify-content: center;
    color: var(--dd-muted);
    font-style: italic;
    font-size: 11px;
    border: 1.5px dashed var(--dd-border);
    background: var(--dd-panel-alt);
    cursor: default;
  }

  .dd-grid-cell--empty[role='button'] {
    cursor: pointer;
  }

  .dd-grid-cell--empty[role='button']:hover {
    border-color: var(--dd-accent);
    background: var(--dd-accent-weak);
  }

  .dd-grid-cell--empty[role='button']:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-grid-cell--empty:hover .dd-stack-el-actions,
  .dd-grid-cell--empty:focus-within .dd-stack-el-actions {
    display: flex;
  }

  .dd-grid-add-ghost {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-style: normal;
  }

  .dd-cell-picker {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 5;
    width: 220px;
    background: var(--dd-panel);
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    box-shadow: var(--dd-shadow);
    padding: 8px;
    text-align: left;
    font-style: normal;
    cursor: default;
  }

  .dd-cell-picker-text {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 7px 8px;
    margin-bottom: 6px;
    border: none;
    border-radius: var(--dd-radius-sm);
    background: var(--dd-accent-weak);
    color: var(--dd-accent-strong);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .dd-cell-picker-text:hover {
    filter: brightness(0.97);
  }

  .dd-cell-picker-search {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    margin-bottom: 6px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
  }

  .dd-cell-picker-search:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-cell-picker-list {
    max-height: 180px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .dd-cell-picker-option {
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border: none;
    border-radius: var(--dd-radius-sm);
    background: transparent;
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .dd-cell-picker-option:hover {
    background: var(--dd-panel-alt);
  }

  .dd-cell-picker-hint {
    margin: 4px 0;
    font-size: 11.5px;
    color: var(--dd-muted);
    font-style: normal;
  }

  .dd-grid-cell--dragover {
    outline: 2px dashed var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-stack-el-actions {
    position: absolute;
    top: -10px;
    right: 2px;
    display: none;
    gap: 3px;
  }

  .dd-grid-subitem:hover .dd-stack-el-actions,
  .dd-grid-subitem:focus-within .dd-stack-el-actions,
  .dd-grid-subitem--selected .dd-stack-el-actions {
    display: flex;
  }

  .dd-stack-el-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 1px solid var(--dd-border);
    border-radius: 4px;
    background: var(--dd-panel);
    color: var(--dd-muted);
    cursor: pointer;
  }

  .dd-stack-el-action:hover {
    background: var(--dd-panel-alt);
  }

  .dd-stack-el-action--danger:hover {
    color: var(--dd-danger);
  }

  .dd-stack-token {
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
  }

  .dd-stack-text-edit {
    display: block;
    outline: none;
    cursor: text;
  }

  .dd-stack-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    width: 100%;
    color: var(--dd-muted);
    font-style: italic;
    background: var(--dd-panel-alt);
    border: 1px dashed var(--dd-border);
    border-radius: var(--dd-radius-sm);
  }

  .dd-stack-image {
    display: block;
    max-width: 100%;
    max-height: 80px;
  }

  .dd-stack-line {
    display: block;
    width: 100%;
    border-top: 1px solid #333;
    margin: 8px 0;
  }

  .dd-stack-box {
    display: block;
    width: 100%;
    height: 40px;
    border: 1px solid #333;
    border-radius: 2px;
  }

  .dd-grid-add-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    align-self: flex-start;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--dd-accent-strong);
    background: var(--dd-accent-weak);
    border: 1px dashed var(--dd-accent);
    border-radius: var(--dd-radius-sm);
    cursor: pointer;
  }

  .dd-grid-add-row:hover {
    background: var(--dd-accent-weak);
    filter: brightness(0.97);
  }

  .dd-grid-add-row:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }
</style>
