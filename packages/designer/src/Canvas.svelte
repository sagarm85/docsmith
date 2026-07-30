<script lang="ts">
  import { isDetailBand, type DataSourceAdapter, type DetailBand, type DetailColumn, type FreeBand, type FreeElement, type Template } from '@docsmith/core';
  import type { PickedUp, Selection } from './types.js';
  import Band from './Band.svelte';
  import StackBand from './StackBand.svelte';
  import GridBand from './GridBand.svelte';
  import DetailTable from './DetailTable.svelte';
  import Toast from './ui/Toast.svelte';
  import { pageDimensionsPx, marginsPx } from './geometry.js';

  let {
    template,
    adapter,
    selection,
    onAddElement,
    onAddSection,
    onSectionLayoutChange,
    onDuplicateSection,
    onDeleteSection,
    onGridColumnsChange,
    onColumnResizeStart,
    onColumnResizeEnd,
    onUpdateElements,
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
    pickedUp = null,
    onKeyboardDrop,
    onCancelPickup,
  }: {
    template: Template;
    adapter: DataSourceAdapter;
    selection: Selection;
    onAddElement: (bandId: string, element: FreeElement) => void;
    /** Dragging a "Sections" chip directly onto a band (memory.md D-037/
     * D-043) — only reportHeader/totals accept it (the two bands grid
     * arrangement is offered on; same scope as the arrangement toggle in
     * BandProps.svelte). */
    onAddSection: (bandId: string, columns: number[]) => void;
    /** Section hover toolbar (memory.md D-049) — same reportHeader/totals-
     * only scope as onAddSection above. */
    onSectionLayoutChange: (bandId: string, row: number, columns: number[]) => void;
    onDuplicateSection: (bandId: string, row: number) => void;
    onDeleteSection: (bandId: string, row: number) => void;
    /** Cursor-drag column resize (memory.md D-044) — same reportHeader/
     * totals-only scope as onAddSection above. */
    onGridColumnsChange: (bandId: string, row: number, columns: number[]) => void;
    onColumnResizeStart: () => void;
    onColumnResizeEnd: () => void;
    /** Stack-arrangement bands replace their whole `elements` array per edit
     * (memory.md D-029), same "whole collection" pattern as `onUpdateColumns`. */
    onUpdateElements: (bandId: string, elements: FreeElement[]) => void;
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
    /** Keyboard drag-alternative (design.md §12: "select a chip, press Enter to
     * pick up, [Tab to] a band, Enter to drop"). Tab already moves focus between
     * band tab buttons natively (each is a real, individually focusable
     * <button> in DOM order) — no custom roving-focus code needed. */
    pickedUp?: PickedUp;
    onKeyboardDrop: (bandId: string) => void;
    onCancelPickup: () => void;
  } = $props();

  let dropError = $state<string | null>(null);

  function handleInvalidDrop(reason: string) {
    dropError = reason;
  }

  function handleDeskClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onDeselect();
  }

  // Escape is the keyboard equivalent of "click empty canvas to deselect" —
  // and, when a chip is picked up, cancels the pickup instead (takes priority,
  // since it's the more specific/recent action).
  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (pickedUp) onCancelPickup();
    else onDeselect();
  }

  // Enter, while a band tab button has focus and something is picked up,
  // completes the drop — the actual "Enter to drop" half of design.md §12.
  // Validation mirrors Band.svelte/DetailTable.svelte's mouse-drop handlers
  // (same rejection messages) since Canvas already has the band/dataset
  // context needed to judge a target; onKeyboardDrop only ever fires for a
  // drop already known to be valid, so DocDesigner can construct+commit
  // without re-checking.
  function handlePageKeydown(e: KeyboardEvent) {
    if (!pickedUp || e.key !== 'Enter') return;
    const bandId = (e.target as HTMLElement).dataset?.bandId;
    if (!bandId) return;
    e.preventDefault();

    const isDetailTarget = detail !== undefined && bandId === detail.id;
    if (pickedUp.cls === 'dataset') {
      if (!isDetailTarget) {
        handleInvalidDrop('Line-item fields can only go in the items table.');
        return;
      }
      if (pickedUp.datasetId !== detail?.datasetId) {
        handleInvalidDrop('That field belongs to a different dataset than this table.');
        return;
      }
    } else if (pickedUp.cls === 'header' && isDetailTarget) {
      handleInvalidDrop('Header fields can’t become table columns — drop them on a header or totals band instead.');
      return;
    } else if (pickedUp.cls === 'block' && isDetailTarget) {
      handleInvalidDrop('Blocks (text/image/line/box) can only go on a header, totals, or page band.');
      return;
    }
    onKeyboardDrop(bandId);
  }

  const pickedUpLabel = $derived(
    pickedUp ? (pickedUp.cls === 'block' ? `${pickedUp.kind} block` : `${pickedUp.label} field`) : '',
  );

  const page = $derived(pageDimensionsPx(template.printSetup));
  const margins = $derived(marginsPx(template.printSetup));
  const layoutUnit = $derived(template.layoutUnit ?? 'px');
  // The content box every free-form element's x/w is relative to in '%' mode
  // (memory.md D-028) is `page.width`, which is now ITSELF the printable
  // width (memory.md D-054) — `pageDimensionsPx` already subtracts the
  // left+right margins, matching `core/render.ts`'s `.page` width exactly,
  // so `.dd-page`'s own right edge below IS the safe boundary (no separate
  // left/right inset needed — see `.dd-margins`, which only shows top/bottom
  // guides now).
  const contentWidthPx = $derived(page.width);

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
  <div class="dd-visually-hidden" aria-live="polite">
    {#if pickedUp}
      {pickedUpLabel} picked up. Tab to a band, Enter to drop, Escape to cancel.
    {/if}
  </div>

  {#if dropError}
    <div class="dd-canvas-toast">
      <Toast variant="error" message={dropError} onDismiss={() => (dropError = null)} />
    </div>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dd-desk" onclick={handleDeskClick}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="dd-page"
      style="width:{page.width}px;height:{page.height}px"
      onkeydown={handlePageKeydown}
    >
      <!-- Top/bottom only: `.dd-page`'s own left/right edges already ARE the
           safe printable boundary (page.width is margin-reduced, D-054) — an
           extra left/right inset here would double it. Height is still the
           full page, so top/bottom margins remain a guide only. -->
      <div class="dd-margins" style="top:{margins.top}px;right:0;bottom:{margins.bottom}px;left:0"></div>

      {#if pageHeader}
        <div class="dd-optional-band" class:dd-optional-band--disabled={pageHeader.enabled === false}>
          <Band
            band={pageHeader}
          unit={layoutUnit}
          {contentWidthPx}
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
        {#if reportHeader.arrangement === 'stack'}
          <StackBand
            band={reportHeader}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'reportHeader' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'reportHeader'}
            onUpdateElements={(els) => onUpdateElements('reportHeader', els)}
            onInvalidDrop={handleInvalidDrop}
            onSelectElement={(id) => onSelectElement('reportHeader', id)}
            onSelectBand={() => onSelectBand('reportHeader')}
            {onDeselect}
            onElementDelete={(id) => onElementDelete('reportHeader', id)}
            onElementDuplicate={(id) => onElementDuplicate('reportHeader', id)}
            onElementEditText={(id, text) => onElementEditText('reportHeader', id, text)}
          />
        {:else if reportHeader.arrangement === 'grid'}
          <GridBand
            band={reportHeader}
            {adapter}
            entity={template.dataSource.entity}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'reportHeader' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'reportHeader'}
            onUpdateElements={(els) => onUpdateElements('reportHeader', els)}
            onInvalidDrop={handleInvalidDrop}
            onSelectElement={(id) => onSelectElement('reportHeader', id)}
            onSelectBand={() => onSelectBand('reportHeader')}
            {onDeselect}
            onElementDelete={(id) => onElementDelete('reportHeader', id)}
            onElementDuplicate={(id) => onElementDuplicate('reportHeader', id)}
            onElementEditText={(id, text) => onElementEditText('reportHeader', id, text)}
            onGridColumnsChange={(row, cols) => onGridColumnsChange('reportHeader', row, cols)}
            onSectionLayoutChange={(row, cols) => onSectionLayoutChange('reportHeader', row, cols)}
            onDuplicateSection={(row) => onDuplicateSection('reportHeader', row)}
            onDeleteSection={(row) => onDeleteSection('reportHeader', row)}
            {onColumnResizeStart}
            {onColumnResizeEnd}
          />
        {:else}
          <Band
            band={reportHeader}
            unit={layoutUnit}
            {contentWidthPx}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'reportHeader' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'reportHeader'}
            onAddElement={(el) => onAddElement('reportHeader', el)}
            onAddSection={(columns) => onAddSection('reportHeader', columns)}
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
        {#if totals.arrangement === 'stack'}
          <StackBand
            band={totals}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'totals' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'totals'}
            onUpdateElements={(els) => onUpdateElements('totals', els)}
            onInvalidDrop={handleInvalidDrop}
            onSelectElement={(id) => onSelectElement('totals', id)}
            onSelectBand={() => onSelectBand('totals')}
            {onDeselect}
            onElementDelete={(id) => onElementDelete('totals', id)}
            onElementDuplicate={(id) => onElementDuplicate('totals', id)}
            onElementEditText={(id, text) => onElementEditText('totals', id, text)}
          />
        {:else if totals.arrangement === 'grid'}
          <GridBand
            band={totals}
            {adapter}
            entity={template.dataSource.entity}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'totals' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'totals'}
            onUpdateElements={(els) => onUpdateElements('totals', els)}
            onInvalidDrop={handleInvalidDrop}
            onSelectElement={(id) => onSelectElement('totals', id)}
            onSelectBand={() => onSelectBand('totals')}
            {onDeselect}
            onElementDelete={(id) => onElementDelete('totals', id)}
            onElementDuplicate={(id) => onElementDuplicate('totals', id)}
            onElementEditText={(id, text) => onElementEditText('totals', id, text)}
            onGridColumnsChange={(row, cols) => onGridColumnsChange('totals', row, cols)}
            onSectionLayoutChange={(row, cols) => onSectionLayoutChange('totals', row, cols)}
            onDuplicateSection={(row) => onDuplicateSection('totals', row)}
            onDeleteSection={(row) => onDeleteSection('totals', row)}
            {onColumnResizeStart}
            {onColumnResizeEnd}
          />
        {:else}
          <Band
            band={totals}
            unit={layoutUnit}
            {contentWidthPx}
            selectedElementId={selection?.kind === 'element' && selection.bandId === 'totals' ? selection.elementId : undefined}
            bandSelected={selection?.kind === 'band' && selection.bandId === 'totals'}
            onAddElement={(el) => onAddElement('totals', el)}
            onAddSection={(columns) => onAddSection('totals', columns)}
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
      {/if}
      {#if pageFooter}
        <div class="dd-optional-band" class:dd-optional-band--disabled={pageFooter.enabled === false}>
          <Band
            band={pageFooter}
          unit={layoutUnit}
          {contentWidthPx}
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

  .dd-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
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
