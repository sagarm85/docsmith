<script lang="ts">
  import type { FreeBand, FreeElement, ValueFormat } from '@docsmith/core';
  import {
    createGridBlockElement,
    createGridFieldElement,
    createGridPlaceholderElement,
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

  const numCols = $derived(band.gridColumns?.length ? band.gridColumns.length : 1);
  const colWidths = $derived(band.gridColumns?.length ? band.gridColumns : [100]);
  const gridTemplateColumns = $derived(colWidths.map((w) => `${w}%`).join(' '));
  const bordered = $derived(Boolean(band.gridBorder));

  type Cell = { kind: 'element'; el: FreeElement; span: number } | { kind: 'empty'; row: number; col: number };

  // One entry per (row, col) — an element starting there (spanning `colSpan`
  // grid columns via CSS `grid-column`), or an "empty" placeholder cell for
  // any column no element covers. Re-implements the same row/col grouping
  // core.renderGridBand uses (col occupancy from row+col+colSpan), since the
  // designer doesn't import core's render.ts internals.
  const rows = $derived.by(() => {
    const byRowCol = new Map<string, FreeElement>();
    let maxRow = -1;
    for (const el of band.elements) {
      const r = el.row ?? 0;
      const c = el.col ?? 0;
      byRowCol.set(`${r}:${c}`, el);
      maxRow = Math.max(maxRow, r);
    }
    const out: Cell[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: Cell[] = [];
      let c = 0;
      while (c < numCols) {
        const el = byRowCol.get(`${r}:${c}`);
        if (el) {
          const span = Math.max(1, Math.min(el.colSpan ?? 1, numCols - c));
          row.push({ kind: 'element', el, span });
          c += span;
        } else {
          row.push({ kind: 'empty', row: r, col: c });
          c += 1;
        }
      }
      out.push(row);
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
  function handleCellDrop(e: DragEvent, row: number, col: number, replacingId: string | null) {
    e.preventDefault();
    e.stopPropagation();
    dragOverKey = null;
    const el = elementFromDrop(e, row, col);
    if (el === 'invalid') {
      onInvalidDrop('Line-item fields can only go in the items table.');
      return;
    }
    if (!el) return;
    if (replacingId) {
      onUpdateElements(band.elements.map((existing) => (existing.id === replacingId ? el : existing)));
    } else {
      onUpdateElements([...band.elements, el]);
    }
  }

  function handleAddRow() {
    onUpdateElements([...band.elements, createGridPlaceholderElement(nextRowIndex(), 0)]);
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

  function elementAriaLabel(el: FreeElement): string {
    if (isPlaceholder(el)) return `Empty cell, ${bandLabel[band.type]}`;
    if (el.kind === 'field') return `${el.label ?? el.binding?.column ?? 'field'} field, ${bandLabel[band.type]}`;
    if (el.kind === 'text') return `“${(el.text ?? '').slice(0, 40)}” text, ${bandLabel[band.type]}`;
    return `${el.kind} element ${el.id}, ${bandLabel[band.type]}`;
  }
</script>

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
      {#each rows as row, rowIndex (rowIndex)}
        <div class="dd-grid-row" style="grid-template-columns:{gridTemplateColumns}">
          {#each row as cell (cell.kind === 'element' ? cell.el.id : `${cell.row}:${cell.col}`)}
            {#if cell.kind === 'element' && !isPlaceholder(cell.el)}
              {@const el = cell.el}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div
                class="dd-grid-cell dd-grid-cell--filled"
                class:dd-grid-cell--bordered={bordered}
                class:dd-grid-cell--selected={selectedElementId === el.id}
                class:dd-grid-cell--dragover={dragOverKey === `${rowIndex}:${el.col ?? 0}`}
                style="grid-column: span {cell.span}"
                role="button"
                tabindex="0"
                aria-label={elementAriaLabel(el)}
                aria-pressed={selectedElementId === el.id}
                onclick={(e) => {
                  e.stopPropagation();
                  onSelectElement(el.id);
                }}
                ondblclick={() => handleDblClick(el)}
                ondragover={(e) => handleCellDragOver(e, rowIndex, el.col ?? 0)}
                ondragleave={handleCellDragLeave}
                ondrop={(e) => handleCellDrop(e, rowIndex, el.col ?? 0, el.id)}
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
            {:else}
              {@const emptyRow = cell.kind === 'empty' ? cell.row : rowIndex}
              {@const emptyCol = cell.kind === 'empty' ? cell.col : (cell.el.col ?? 0)}
              {@const placeholderId = cell.kind === 'element' ? cell.el.id : null}
              <!-- A placeholder cell (real `text:''` element, e.g. from "Add
                   row"/a Sections drop) is deletable like any other element —
                   a genuinely-absent gap cell (no backing element, from a
                   neighboring colSpan not reaching this column) has nothing
                   to delete (memory.md D-043). -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="dd-grid-cell dd-grid-cell--empty"
                class:dd-grid-cell--bordered={bordered}
                class:dd-grid-cell--dragover={dragOverKey === `${emptyRow}:${emptyCol}`}
                aria-label={`Empty cell, ${bandLabel[band.type]}, drop a field here`}
                ondragover={(e) => handleCellDragOver(e, emptyRow, emptyCol)}
                ondragleave={handleCellDragLeave}
                ondrop={(e) => handleCellDrop(e, emptyRow, emptyCol, placeholderId)}
              >
                Drop a field here
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
              </div>
            {/if}
          {/each}
        </div>
      {/each}
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

  .dd-grid-row {
    display: grid;
    gap: 8px;
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

  .dd-grid-cell--filled {
    cursor: pointer;
  }

  .dd-grid-cell--filled:hover {
    border-color: var(--dd-border);
  }

  .dd-grid-cell--filled:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-grid-cell--selected {
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
  }

  .dd-grid-cell--empty:hover .dd-stack-el-actions,
  .dd-grid-cell--empty:focus-within .dd-stack-el-actions {
    display: flex;
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

  .dd-grid-cell--filled:hover .dd-stack-el-actions,
  .dd-grid-cell--filled:focus-within .dd-stack-el-actions,
  .dd-grid-cell--selected .dd-stack-el-actions {
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
