<script lang="ts">
  import type { FreeBand, FreeElement, ValueFormat } from '@docsmith/core';
  import { createBlockElement, createFieldElement, type BlockKind } from './template-edits.js';
  import FreeElementView from './FreeElement.svelte';

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
    onAddElement,
    onInvalidDrop,
    onSelectElement,
    onSelectBand,
    onDeselect,
    onElementLiveChange,
    onElementDragStart,
    onElementDragEnd,
    onElementDelete,
    onElementDuplicate,
    onElementBringForward,
    onElementSendBack,
    onElementEditText,
  }: {
    band: FreeBand;
    selectedElementId?: string;
    bandSelected?: boolean;
    onAddElement: (element: FreeElement) => void;
    onInvalidDrop: (reason: string) => void;
    onSelectElement: (elementId: string) => void;
    onSelectBand: () => void;
    onDeselect: () => void;
    onElementLiveChange: (elementId: string, patch: Partial<FreeElement>) => void;
    onElementDragStart: () => void;
    onElementDragEnd: () => void;
    onElementDelete: (elementId: string) => void;
    onElementDuplicate: (elementId: string) => void;
    onElementBringForward: (elementId: string) => void;
    onElementSendBack: (elementId: string) => void;
    onElementEditText: (elementId: string, text: string) => void;
  } = $props();

  let dragOver = $state(false);

  const bandLabel: Record<FreeBand['type'], string> = {
    reportHeader: 'Report Header',
    pageHeader: 'Page Header',
    totals: 'Totals',
    pageFooter: 'Page Footer',
  };

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    const blockRaw = e.dataTransfer?.getData('application/x-doc-block');
    if (blockRaw) {
      try {
        const payload = JSON.parse(blockRaw) as BlockDragPayload;
        onAddElement(createBlockElement(payload.kind, band.elements));
      } catch {
        /* malformed payload — ignore, nothing to add */
      }
      return;
    }

    const raw = e.dataTransfer?.getData('application/x-doc-field');
    if (!raw) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    if (payload.cls !== 'header') {
      onInvalidDrop('Line-item fields can only go in the items table.');
      return;
    }
    onAddElement(
      createFieldElement(
        'header',
        { name: payload.column, label: payload.label, type: payload.type },
        band.elements,
      ),
    );
  }

  function handleBodyClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onDeselect();
  }
</script>

<div class="dd-band" class:dd-band--dragover={dragOver}>
  <button
    type="button"
    class="dd-band-tab"
    class:dd-band-tab--selected={bandSelected}
    data-band-id={band.id}
    onclick={onSelectBand}
  >
    {bandLabel[band.type]}
  </button>
  <!-- Clicking empty band space to deselect is a mouse convenience; Escape
       (handled globally in Canvas.svelte) is the keyboard equivalent. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="dd-band-body"
    style="height:{band.height}px"
    role="group"
    aria-label={`${bandLabel[band.type]} band`}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    onclick={handleBodyClick}
  >
    {#if band.elements.length === 0}
      <p class="dd-band-empty">Drag header fields here, or use a field's “+” button.</p>
    {:else}
      {#each band.elements as el (el.id)}
        <FreeElementView
          element={el}
          selected={selectedElementId === el.id}
          bandLabel={bandLabel[band.type]}
          onSelect={() => onSelectElement(el.id)}
          onChange={(patch) => onElementLiveChange(el.id, patch)}
          onDragStart={onElementDragStart}
          onDragEnd={onElementDragEnd}
          onDelete={() => onElementDelete(el.id)}
          onDuplicate={() => onElementDuplicate(el.id)}
          onBringForward={() => onElementBringForward(el.id)}
          onSendBack={() => onElementSendBack(el.id)}
          onEditText={(text) => onElementEditText(el.id, text)}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .dd-band {
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-band-tab {
    display: block;
    width: 100%;
    text-align: left;
    padding: 3px 8px;
    font: inherit;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--dd-muted);
    background: var(--dd-panel-alt);
    border: none;
    cursor: pointer;
  }

  .dd-band-tab--selected {
    color: var(--dd-accent);
    box-shadow: inset 0 0 0 1px var(--dd-accent);
  }

  .dd-band-tab:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-band-body {
    position: relative;
    background: #fff;
  }

  .dd-band--dragover .dd-band-body {
    outline: 2px dashed var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-band-empty {
    margin: 0;
    padding: 10px;
    font-size: 11px;
    color: var(--dd-muted);
    font-style: italic;
  }
</style>
