<script lang="ts">
  import type { FreeBand, FreeElement, ValueFormat } from '@docsmith/core';
  import { createBlockElement, createFieldElement, type BlockKind } from './template-edits.js';
  import FreeElementView from './FreeElement.svelte';
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
    unit = 'px',
    contentWidthPx = 0,
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
    /** Template-global layout unit (memory.md D-028), passed through to every
     * FreeElement so its drag/resize math and rendered position use the
     * right basis. */
    unit?: 'px' | '%';
    contentWidthPx?: number;
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

  // D-025: each band type reads as a distinct card (tint + accent edge + icon)
  // rather than just a small gray tab label.
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

<div class="dd-band dd-band--{bandVariant[band.type]}" class:dd-band--dragover={dragOver}>
  <button
    type="button"
    class="dd-band-tab"
    class:dd-band-tab--selected={bandSelected}
    data-band-id={band.id}
    onclick={onSelectBand}
  >
    <Icon name={bandIcon[band.type]} size={12} />
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
      <p class="dd-band-empty">
        <Icon name="plus" size={13} />
        Drag header fields here, or use a field's “+” button.
      </p>
    {:else}
      {#each band.elements as el (el.id)}
        <FreeElementView
          element={el}
          selected={selectedElementId === el.id}
          bandLabel={bandLabel[band.type]}
          {unit}
          {contentWidthPx}
          bandHeightPx={band.height}
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

  .dd-band--hero .dd-band-body { background: var(--dd-hero-weak); }
  .dd-band--run .dd-band-body { background: var(--dd-run-weak); }
  .dd-band--totals .dd-band-body { background: var(--dd-totals-weak); }

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

  .dd-band-body {
    position: relative;
    background: #fff;
    padding-left: 3px;
  }

  .dd-band--dragover .dd-band-body {
    outline: 2px dashed var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-band-empty {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 10px 10px 10px 13px;
    font-size: 11px;
    color: var(--dd-muted);
    font-style: italic;
  }
</style>
