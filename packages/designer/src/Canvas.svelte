<script lang="ts">
  import { isDetailBand, type DataSourceAdapter, type DetailBand, type DetailColumn, type FreeBand, type FreeElement, type Template } from '@docsmith/core';
  import type { Selection } from './types.js';
  import Band from './Band.svelte';
  import DetailTable from './DetailTable.svelte';
  import Toast from './ui/Toast.svelte';
  import { pageDimensionsPx, marginsPx } from './geometry.js';

  let {
    template,
    adapter,
    selection,
    onAddElement,
    onAddColumn,
    onUpdateColumns,
    onSelectElement,
    onSelectBand,
    onSelectColumn,
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
    template: Template;
    adapter: DataSourceAdapter;
    selection: Selection;
    onAddElement: (bandId: string, element: FreeElement) => void;
    onAddColumn: (column: DetailColumn) => void;
    onUpdateColumns: (columns: DetailColumn[]) => void;
    onSelectElement: (bandId: string, elementId: string) => void;
    onSelectBand: (bandId: string) => void;
    onSelectColumn: (columnIndex: number) => void;
    onDeselect: () => void;
    onElementLiveChange: (bandId: string, elementId: string, patch: Partial<FreeElement>) => void;
    onElementDragStart: () => void;
    onElementDragEnd: () => void;
    onElementDelete: (bandId: string, elementId: string) => void;
    onElementDuplicate: (bandId: string, elementId: string) => void;
    onElementBringForward: (bandId: string, elementId: string) => void;
    onElementSendBack: (bandId: string, elementId: string) => void;
    onElementEditText: (bandId: string, elementId: string, text: string) => void;
  } = $props();

  let dropError = $state<string | null>(null);

  function handleInvalidDrop(reason: string) {
    dropError = reason;
  }

  function handleDeskClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onDeselect();
  }

  // Escape is the keyboard equivalent of "click empty canvas to deselect".
  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onDeselect();
  }

  const page = $derived(pageDimensionsPx(template.printSetup));
  const margins = $derived(marginsPx(template.printSetup));

  // pageHeader/pageFooter are optional (design.md §2) — absent from a fresh
  // template until enabled from the Page tab. Shown here whenever they exist
  // (dimmed if currently disabled) so their content stays editable even while
  // toggled off, matching design.md §8.2's "toggle on/off" (not "delete").
  const pageHeader = $derived(template.bands.find((b) => b.type === 'pageHeader') as FreeBand | undefined);
  const reportHeader = $derived(
    template.bands.find((b) => b.id === 'reportHeader' && !isDetailBand(b)) as FreeBand | undefined,
  );
  const detail = $derived(template.bands.find((b) => isDetailBand(b)) as DetailBand | undefined);
  const totals = $derived(
    template.bands.find((b) => b.id === 'totals' && !isDetailBand(b)) as FreeBand | undefined,
  );
  const pageFooter = $derived(template.bands.find((b) => b.type === 'pageFooter') as FreeBand | undefined);
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="dd-canvas">
  {#if dropError}
    <div class="dd-canvas-toast">
      <Toast variant="error" message={dropError} onDismiss={() => (dropError = null)} />
    </div>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dd-desk" onclick={handleDeskClick}>
    <div class="dd-page" style="width:{page.width}px;height:{page.height}px">
      <div
        class="dd-margins"
        style="top:{margins.top}px;right:{margins.right}px;bottom:{margins.bottom}px;left:{margins.left}px"
      ></div>

      {#if pageHeader}
        <div class="dd-optional-band" class:dd-optional-band--disabled={pageHeader.enabled === false}>
          <Band
            band={pageHeader}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'pageHeader' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'pageHeader'}
            onAddElement={(el) => onAddElement('pageHeader', el)}
            onInvalidDrop={handleInvalidDrop}
            onSelectElement={(id) => onSelectElement('pageHeader', id)}
            onSelectBand={() => onSelectBand('pageHeader')}
            {onDeselect}
            onElementLiveChange={(id, patch) => onElementLiveChange('pageHeader', id, patch)}
            {onElementDragStart}
            {onElementDragEnd}
            onElementDelete={(id) => onElementDelete('pageHeader', id)}
            onElementDuplicate={(id) => onElementDuplicate('pageHeader', id)}
            onElementBringForward={(id) => onElementBringForward('pageHeader', id)}
            onElementSendBack={(id) => onElementSendBack('pageHeader', id)}
            onElementEditText={(id, text) => onElementEditText('pageHeader', id, text)}
          />
        </div>
      {/if}
      {#if reportHeader}
        <Band
          band={reportHeader}
          selectedElementId={selection?.kind === 'element' && selection.bandId === 'reportHeader' ? selection.elementId : undefined}
          bandSelected={selection?.kind === 'band' && selection.bandId === 'reportHeader'}
          onAddElement={(el) => onAddElement('reportHeader', el)}
          onInvalidDrop={handleInvalidDrop}
          onSelectElement={(id) => onSelectElement('reportHeader', id)}
          onSelectBand={() => onSelectBand('reportHeader')}
          {onDeselect}
          onElementLiveChange={(id, patch) => onElementLiveChange('reportHeader', id, patch)}
          {onElementDragStart}
          {onElementDragEnd}
          onElementDelete={(id) => onElementDelete('reportHeader', id)}
          onElementDuplicate={(id) => onElementDuplicate('reportHeader', id)}
          onElementBringForward={(id) => onElementBringForward('reportHeader', id)}
          onElementSendBack={(id) => onElementSendBack('reportHeader', id)}
          onElementEditText={(id, text) => onElementEditText('reportHeader', id, text)}
        />
      {/if}
      {#if detail}
        <DetailTable
          band={detail}
          {adapter}
          entity={template.dataSource.entity}
          selectedColumnIndex={selection?.kind === 'column' ? selection.columnIndex : undefined}
          bandSelected={selection?.kind === 'band' && selection.bandId === 'detail'}
          {onAddColumn}
          {onUpdateColumns}
          onInvalidDrop={handleInvalidDrop}
          {onSelectColumn}
          onSelectBand={() => onSelectBand('detail')}
        />
      {/if}
      {#if totals}
        <Band
          band={totals}
          selectedElementId={selection?.kind === 'element' && selection.bandId === 'totals' ? selection.elementId : undefined}
          bandSelected={selection?.kind === 'band' && selection.bandId === 'totals'}
          onAddElement={(el) => onAddElement('totals', el)}
          onInvalidDrop={handleInvalidDrop}
          onSelectElement={(id) => onSelectElement('totals', id)}
          onSelectBand={() => onSelectBand('totals')}
          {onDeselect}
          onElementLiveChange={(id, patch) => onElementLiveChange('totals', id, patch)}
          {onElementDragStart}
          {onElementDragEnd}
          onElementDelete={(id) => onElementDelete('totals', id)}
          onElementDuplicate={(id) => onElementDuplicate('totals', id)}
          onElementBringForward={(id) => onElementBringForward('totals', id)}
          onElementSendBack={(id) => onElementSendBack('totals', id)}
          onElementEditText={(id, text) => onElementEditText('totals', id, text)}
        />
      {/if}
      {#if pageFooter}
        <div class="dd-optional-band" class:dd-optional-band--disabled={pageFooter.enabled === false}>
          <Band
            band={pageFooter}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'pageFooter' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'pageFooter'}
            onAddElement={(el) => onAddElement('pageFooter', el)}
            onInvalidDrop={handleInvalidDrop}
            onSelectElement={(id) => onSelectElement('pageFooter', id)}
            onSelectBand={() => onSelectBand('pageFooter')}
            {onDeselect}
            onElementLiveChange={(id, patch) => onElementLiveChange('pageFooter', id, patch)}
            {onElementDragStart}
            {onElementDragEnd}
            onElementDelete={(id) => onElementDelete('pageFooter', id)}
            onElementDuplicate={(id) => onElementDuplicate('pageFooter', id)}
            onElementBringForward={(id) => onElementBringForward('pageFooter', id)}
            onElementSendBack={(id) => onElementSendBack('pageFooter', id)}
            onElementEditText={(id, text) => onElementEditText('pageFooter', id, text)}
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .dd-canvas {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--dd-panel-alt);
  }

  .dd-canvas-toast {
    padding: 8px 12px 0;
  }

  .dd-desk {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }

  .dd-page {
    position: relative;
    margin: 0 auto;
    background: #fff;
    box-shadow: var(--dd-shadow);
  }

  .dd-margins {
    position: absolute;
    border: 1px dashed #c6cbd2;
    pointer-events: none;
  }

  .dd-optional-band--disabled {
    opacity: 0.45;
  }
</style>
