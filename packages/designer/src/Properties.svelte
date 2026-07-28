<script lang="ts">
  import {
    isDetailBand,
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

  let {
    template,
    selection,
    onElementChange,
    onElementDelete,
    onElementDuplicate,
    onElementBringForward,
    onElementSendBack,
    onColumnChange,
    onBandChange,
    printSetup,
    onPrintSetupChange,
    keepRowTogether,
    onKeepRowTogetherChange,
    pageHeaderEnabled,
    onPageHeaderToggle,
    pageFooterEnabled,
    onPageFooterToggle,
  }: {
    template: Template;
    selection: Selection;
    onElementChange: (bandId: string, elementId: string, patch: Partial<FreeElement>) => void;
    onElementDelete: (bandId: string, elementId: string) => void;
    onElementDuplicate: (bandId: string, elementId: string) => void;
    onElementBringForward: (bandId: string, elementId: string) => void;
    onElementSendBack: (bandId: string, elementId: string) => void;
    onColumnChange: (columnIndex: number, patch: Partial<DetailColumn>) => void;
    onBandChange: (bandId: string, patch: Partial<FreeBand>) => void;
    printSetup: PrintSetupType;
    onPrintSetupChange: (next: PrintSetupType) => void;
    keepRowTogether: boolean;
    onKeepRowTogetherChange: (next: boolean) => void;
    pageHeaderEnabled: boolean;
    onPageHeaderToggle: (enabled: boolean) => void;
    pageFooterEnabled: boolean;
    onPageFooterToggle: (enabled: boolean) => void;
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

  const selectedColumn = $derived.by(() => {
    if (selection?.kind !== 'column') return null;
    const detail = template.bands.find((b) => isDetailBand(b)) as DetailBand | undefined;
    return detail?.columns[selection.columnIndex] ?? null;
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
        />
      {:else if selection?.kind === 'band' && selectedBand}
        {@const bandId = selection.bandId}
        <BandProps band={selectedBand} onChange={(patch) => onBandChange(bandId, patch)} />
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
