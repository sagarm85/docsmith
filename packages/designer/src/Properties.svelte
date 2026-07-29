<script lang="ts">
  import {
    isDetailBand,
    type Aggregate,
    type DetailBand,
    type DetailColumn,
    type FreeBand,
    type FreeElement,
    type PrintSetup as PrintSetupType,
    type Template,
  } from '@docsmith/core';
  import type { Selection } from './types.js';
  import ElementProps from './ElementProps.svelte';
  import ColumnProps from './ColumnProps.svelte';
  import BandProps from './BandProps.svelte';
  import PrintSetup from './PrintSetup.svelte';
  import Icon from './ui/Icon.svelte';

  let {
    template,
    selection,
    onElementChange,
    onElementDelete,
    onElementDuplicate,
    onElementBringForward,
    onElementSendBack,
    onColumnChange,
    onColumnAggregateChange,
    onColumnCarryForwardChange,
    onBandChange,
    onBandArrangementChange,
    printSetup,
    onPrintSetupChange,
    keepRowTogether,
    onKeepRowTogetherChange,
    pageHeaderEnabled,
    onPageHeaderToggle,
    pageFooterEnabled,
    onPageFooterToggle,
    onLayoutUnitChange,
  }: {
    template: Template;
    selection: Selection;
    onElementChange: (bandId: string, elementId: string, patch: Partial<FreeElement>) => void;
    onElementDelete: (bandId: string, elementId: string) => void;
    onElementDuplicate: (bandId: string, elementId: string) => void;
    onElementBringForward: (bandId: string, elementId: string) => void;
    onElementSendBack: (bandId: string, elementId: string) => void;
    onColumnChange: (columnIndex: number, patch: Partial<DetailColumn>) => void;
    onColumnAggregateChange: (columnIndex: number, fn: Aggregate['fn'] | null) => void;
    /** memory.md D-033 — independent from the tfoot aggregate above. */
    onColumnCarryForwardChange: (columnIndex: number, fn: Aggregate['fn'] | null) => void;
    onBandChange: (bandId: string, patch: Partial<FreeBand>) => void;
    /** Free<->stack migration (memory.md D-029), offered only for
     * reportHeader/totals — see BandProps.svelte's onArrangementChange doc. */
    onBandArrangementChange: (bandId: string, arrangement: 'free' | 'stack' | 'grid') => void;
    printSetup: PrintSetupType;
    onPrintSetupChange: (next: PrintSetupType) => void;
    keepRowTogether: boolean;
    onKeepRowTogetherChange: (next: boolean) => void;
    pageHeaderEnabled: boolean;
    onPageHeaderToggle: (enabled: boolean) => void;
    pageFooterEnabled: boolean;
    onPageFooterToggle: (enabled: boolean) => void;
    /** Template.layoutUnit (memory.md D-028) migration — DocDesigner performs
     * the actual px<->% conversion via core.convertLayoutUnit before
     * committing. */
    onLayoutUnitChange: (unit: 'px' | '%') => void;
  } = $props();

  let activeTab = $state<'selection' | 'page'>('selection');

  // Jump to the Selection tab whenever a new selection is made, so picking
  // something on the canvas doesn't get hidden behind the Page tab.
  $effect(() => {
    if (selection) activeTab = 'selection';
  });

  const selectedElement = $derived.by(() => {
    if (selection?.kind !== 'element') return null;
    const band = template.bands.find((b) => b.id === selection.bandId);
    if (!band || isDetailBand(band)) return null;
    return band.elements.find((e) => e.id === selection.elementId) ?? null;
  });

  const selectedElementArrangement = $derived.by(() => {
    if (selection?.kind !== 'element') return 'free' as const;
    const band = template.bands.find((b) => b.id === selection.bandId);
    if (!band || isDetailBand(band)) return 'free' as const;
    return band.arrangement ?? 'free';
  });

  const selectedColumn = $derived.by(() => {
    if (selection?.kind !== 'column') return null;
    const detail = template.bands.find((b) => isDetailBand(b)) as DetailBand | undefined;
    return detail?.columns[selection.columnIndex] ?? null;
  });

  const selectedColumnAggregate = $derived.by(() => {
    if (selection?.kind !== 'column') return null;
    const detail = template.bands.find((b) => isDetailBand(b)) as DetailBand | undefined;
    const col = detail?.columns[selection.columnIndex];
    if (!col) return null;
    return detail?.aggregates?.find((a) => a.column === col.column && a.into === 'tfoot')?.fn ?? null;
  });

  const selectedColumnCarryForward = $derived.by(() => {
    if (selection?.kind !== 'column') return null;
    const detail = template.bands.find((b) => isDetailBand(b)) as DetailBand | undefined;
    const col = detail?.columns[selection.columnIndex];
    if (!col) return null;
    return detail?.aggregates?.find((a) => a.column === col.column && a.into === 'carryForward')?.fn ?? null;
  });

  const selectedBand = $derived.by(() => {
    if (selection?.kind !== 'band') return null;
    return template.bands.find((b) => b.id === selection.bandId) ?? null;
  });
</script>

<div class="dd-properties-panel">
  <div class="dd-tabs" role="tablist" aria-label="Properties">
    <button
      type="button"
      role="tab"
      class="dd-tab"
      class:dd-tab--active={activeTab === 'selection'}
      aria-selected={activeTab === 'selection'}
      onclick={() => (activeTab = 'selection')}
    >
      <Icon name="field" size={12} />
      Selection
    </button>
    <button
      type="button"
      role="tab"
      class="dd-tab"
      class:dd-tab--active={activeTab === 'page'}
      aria-selected={activeTab === 'page'}
      onclick={() => (activeTab = 'page')}
    >
      <Icon name="page" size={12} />
      Page
    </button>
  </div>

  <div class="dd-tab-panel">
    {#if activeTab === 'selection'}
      {#if selection?.kind === 'element' && selectedElement}
        {@const bandId = selection.bandId}
        {@const elementId = selection.elementId}
        <ElementProps
          element={selectedElement}
          unit={template.layoutUnit ?? 'px'}
          arrangement={selectedElementArrangement}
          onChange={(patch) => onElementChange(bandId, elementId, patch)}
          onDelete={() => onElementDelete(bandId, elementId)}
          onDuplicate={() => onElementDuplicate(bandId, elementId)}
          onBringForward={() => onElementBringForward(bandId, elementId)}
          onSendBack={() => onElementSendBack(bandId, elementId)}
        />
      {:else if selection?.kind === 'column' && selectedColumn}
        {@const columnIndex = selection.columnIndex}
        <ColumnProps
          column={selectedColumn}
          onChange={(patch) => onColumnChange(columnIndex, patch)}
          aggregate={selectedColumnAggregate}
          onAggregateChange={(fn) => onColumnAggregateChange(columnIndex, fn)}
          carryForward={selectedColumnCarryForward}
          onCarryForwardChange={(fn) => onColumnCarryForwardChange(columnIndex, fn)}
        />
      {:else if selection?.kind === 'band' && selectedBand}
        {@const bandId = selection.bandId}
        <BandProps
          band={selectedBand}
          onChange={(patch) => onBandChange(bandId, patch)}
          onArrangementChange={selectedBand.type === 'reportHeader' || selectedBand.type === 'totals'
            ? (arrangement) => onBandArrangementChange(bandId, arrangement)
            : undefined}
        />
      {:else}
        <p class="dd-empty-hint">
          Select an element, column, or band on the canvas to edit its properties.
        </p>
      {/if}
    {:else}
      <PrintSetup
        {printSetup}
        {onPrintSetupChange}
        {keepRowTogether}
        {onKeepRowTogetherChange}
        {pageHeaderEnabled}
        {onPageHeaderToggle}
        {pageFooterEnabled}
        {onPageFooterToggle}
        layoutUnit={template.layoutUnit ?? 'px'}
        {onLayoutUnitChange}
      />
    {/if}
  </div>
</div>

<style>
  .dd-properties-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .dd-tabs {
    display: flex;
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex: 1;
    height: 34px;
    border: none;
    background: transparent;
    color: var(--dd-muted);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .dd-tab--active {
    color: var(--dd-accent);
    box-shadow: inset 0 -2px 0 var(--dd-accent);
  }

  .dd-tab:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-tab-panel {
    flex: 1;
    overflow-y: auto;
  }

  .dd-empty-hint {
    margin: 0;
    padding: 16px 12px;
    font-size: 12px;
    color: var(--dd-muted);
  }
</style>
