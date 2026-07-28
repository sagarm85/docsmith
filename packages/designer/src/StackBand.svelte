<script lang="ts">
  import type { FreeBand, FreeElement, ValueFormat } from '@docsmith/core';
  import {
    createStackBlockElement,
    createStackFieldElement,
    nextStackRow,
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
  }: {
    band: FreeBand;
    selectedElementId?: string;
    bandSelected?: boolean;
    /** Replaces the band's whole `elements` array — every stack edit (add,
     * reorder, delete) is expressed this way, same pattern as
     * DetailTable.svelte's `onUpdateColumns` (memory.md D-029). */
    onUpdateElements: (elements: FreeElement[]) => void;
    onInvalidDrop: (reason: string) => void;
    onSelectElement: (elementId: string) => void;
    onSelectBand: () => void;
    onDeselect: () => void;
    onElementDelete: (elementId: string) => void;
    onElementDuplicate: (elementId: string) => void;
    onElementEditText: (elementId: string, text: string) => void;
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

  // Groups elements into rows exactly the way core's renderer does (same
  // grouping rule, re-implemented here since it's a tiny pure function and
  // the designer doesn't import core's render.ts internals).
  const rows = $derived.by(() => {
    const groups: FreeElement[][] = [];
    const indexByKey = new Map<string, number>();
    let solo = 0;
    for (const el of band.elements) {
      const key = el.row !== undefined ? `r:${el.row}` : `solo:${solo++}`;
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        idx = groups.length;
        indexByKey.set(key, idx);
        groups.push([]);
      }
      groups[idx]!.push(el);
    }
    return groups;
  });

  // Renumbers rows 0..n-1 contiguously whenever the array is rebuilt — row
  // numbers are opaque per the type's contract, so there's no reason to
  // preserve old values once the grouping is already known.
  function rowsToElements(rowGroups: FreeElement[][]): FreeElement[] {
    return rowGroups.flatMap((row, i) => row.map((el) => ({ ...el, row: i })));
  }

  let dragOverRow = $state<number | null>(null);
  let dragOverBand = $state(false);
  let reorderFromRow: number | null = null;

  function addToNewRow(element: FreeElement) {
    onUpdateElements([...band.elements, { ...element, row: nextStackRow(band.elements) }]);
  }

  function addToRow(element: FreeElement, rowIndex: number) {
    const next = rows.map((row, i) => (i === rowIndex ? [...row, element] : row));
    onUpdateElements(rowsToElements(next));
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

  function elementFromDrop(e: DragEvent, row: number): FreeElement | 'invalid' | null {
    const block = parseBlockPayload(e);
    if (block) return createStackBlockElement(block.kind, row);
    const field = parseFieldPayload(e);
    if (!field) return null;
    if (field.cls !== 'header') return 'invalid';
    return createStackFieldElement('header', { name: field.column, label: field.label, type: field.type }, row);
  }

  function handleBandDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOverBand = true;
  }
  function handleBandDragLeave() {
    dragOverBand = false;
  }
  function handleBandDrop(e: DragEvent) {
    e.preventDefault();
    dragOverBand = false;
    const el = elementFromDrop(e, nextStackRow(band.elements));
    if (el === 'invalid') {
      onInvalidDrop('Line-item fields can only go in the items table.');
      return;
    }
    if (el) addToNewRow(el);
  }

  function handleRowDragOver(e: DragEvent, rowIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOverRow = rowIndex;
  }
  function handleRowDragLeave() {
    dragOverRow = null;
  }
  function handleRowDrop(e: DragEvent, rowIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    dragOverRow = null;

    const reorderRaw = e.dataTransfer?.getData('application/x-stack-row-index');
    // Some browsers restrict reading dataTransfer during dragover for
    // security, only reliably available on 'drop' — reorderFromRow (set at
    // dragstart) is the fallback, same pattern as DetailTable.svelte's
    // column reorder.
    const from = reorderRaw !== undefined && reorderRaw !== '' ? Number(reorderRaw) : reorderFromRow;
    if (from !== null) {
      reorderFromRow = null;
      if (from === rowIndex) return;
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      if (!moved) return;
      next.splice(rowIndex, 0, moved);
      onUpdateElements(rowsToElements(next));
      return;
    }

    const el = elementFromDrop(e, rowIndex);
    if (el === 'invalid') {
      onInvalidDrop('Line-item fields can only go in the items table.');
      return;
    }
    if (el) addToRow(el, rowIndex);
  }

  function handleRowHandleDragStart(e: DragEvent, rowIndex: number) {
    reorderFromRow = rowIndex;
    e.dataTransfer?.setData('application/x-stack-row-index', String(rowIndex));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
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

  // Distinguishes same-kind elements by content (not just "text element" x N)
  // — both a real screen-reader improvement and what makes each element
  // reliably targetable, matching FreeElement.svelte's x/y-based uniqueness
  // in free-form bands (stack elements have no x/y to use instead).
  function elementAriaLabel(el: FreeElement): string {
    if (el.kind === 'field') return `${el.label ?? el.binding?.column ?? 'field'} field, ${bandLabel[band.type]}`;
    if (el.kind === 'text') return `“${(el.text ?? '').slice(0, 40)}” text, ${bandLabel[band.type]}`;
    return `${el.kind} element ${el.id}, ${bandLabel[band.type]}`;
  }
</script>

<div class="dd-band dd-band--{bandVariant[band.type]}" class:dd-band--dragover={dragOverBand}>
  <button type="button" class="dd-band-tab" class:dd-band-tab--selected={bandSelected} data-band-id={band.id} onclick={onSelectBand}>
    <Icon name={bandIcon[band.type]} size={12} />
    {bandLabel[band.type]}
    <span class="dd-stack-badge">Stacked</span>
  </button>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="dd-stack-body"
    role="group"
    aria-label={`${bandLabel[band.type]} band`}
    ondragover={handleBandDragOver}
    ondragleave={handleBandDragLeave}
    ondrop={handleBandDrop}
    onclick={handleBodyClick}
  >
    {#if rows.length === 0}
      <p class="dd-band-empty">
        <Icon name="plus" size={13} />
        Drag header fields here, or use a field's “+” button — each lands in its own row.
      </p>
    {:else}
      {#each rows as row, rowIndex (row.map((el) => el.id).join('-'))}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="dd-stack-row"
          class:dd-stack-row--dragover={dragOverRow === rowIndex}
          ondragover={(e) => handleRowDragOver(e, rowIndex)}
          ondragleave={handleRowDragLeave}
          ondrop={(e) => handleRowDrop(e, rowIndex)}
        >
          <span
            class="dd-row-handle"
            role="button"
            tabindex="0"
            aria-label={`Reorder row ${rowIndex + 1}`}
            draggable="true"
            ondragstart={(e) => handleRowHandleDragStart(e, rowIndex)}
          >
            <Icon name="repeat" size={11} />
          </span>
          {#each row as el (el.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="dd-stack-el"
              class:dd-stack-el--selected={selectedElementId === el.id}
              style="flex:0 0 {el.w}%;max-width:{el.w}%"
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
        </div>
      {/each}
    {/if}
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

  .dd-band--hero .dd-stack-body { background: var(--dd-hero-weak); }
  .dd-band--run .dd-stack-body { background: var(--dd-run-weak); }
  .dd-band--totals .dd-stack-body { background: var(--dd-totals-weak); }

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

  .dd-stack-body {
    position: relative;
    background: #fff;
    padding: 10px 10px 10px 13px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .dd-band--dragover .dd-stack-body {
    outline: 2px dashed var(--dd-accent);
    outline-offset: -2px;
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

  .dd-stack-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
    border-radius: var(--dd-radius-sm);
  }

  .dd-stack-row--dragover {
    outline: 2px dashed var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-row-handle {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    color: var(--dd-muted);
    cursor: grab;
  }

  .dd-row-handle:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-stack-el {
    position: relative;
    min-width: 0;
    padding: 4px 6px;
    border: 1px solid transparent;
    border-radius: var(--dd-radius-sm);
    font-size: 12px;
    color: #222;
    cursor: pointer;
  }

  .dd-stack-el:hover {
    border-color: var(--dd-border);
  }

  .dd-stack-el:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-stack-el--selected {
    border-color: var(--dd-accent);
    box-shadow: 0 0 0 3px var(--dd-accent-weak);
  }

  .dd-stack-el-actions {
    position: absolute;
    top: -10px;
    right: 2px;
    display: none;
    gap: 3px;
  }

  .dd-stack-el:hover .dd-stack-el-actions,
  .dd-stack-el:focus-within .dd-stack-el-actions,
  .dd-stack-el--selected .dd-stack-el-actions {
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
</style>
