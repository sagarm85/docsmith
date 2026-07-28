<script lang="ts">
  import { isDetailBand, type DataSourceAdapter, type DetailBand, type DetailColumn, type FreeBand, type FreeElement, type Template } from '@docsmith/core';
  import Band from './Band.svelte';
  import DetailTable from './DetailTable.svelte';
  import Toast from './ui/Toast.svelte';
  import { pageDimensionsPx, marginsPx } from './geometry.js';

  let {
    template,
    adapter,
    onAddElement,
    onAddColumn,
    onUpdateColumns,
  }: {
    template: Template;
    adapter: DataSourceAdapter;
    onAddElement: (bandId: string, element: FreeElement) => void;
    onAddColumn: (column: DetailColumn) => void;
    onUpdateColumns: (columns: DetailColumn[]) => void;
  } = $props();

  let dropError = $state<string | null>(null);

  function handleInvalidDrop(reason: string) {
    dropError = reason;
  }

  const page = $derived(pageDimensionsPx(template.printSetup));
  const margins = $derived(marginsPx(template.printSetup));

  const reportHeader = $derived(
    template.bands.find((b) => b.id === 'reportHeader' && !isDetailBand(b)) as FreeBand | undefined,
  );
  const detail = $derived(template.bands.find((b) => isDetailBand(b)) as DetailBand | undefined);
  const totals = $derived(
    template.bands.find((b) => b.id === 'totals' && !isDetailBand(b)) as FreeBand | undefined,
  );
</script>

<div class="dd-canvas">
  {#if dropError}
    <div class="dd-canvas-toast">
      <Toast variant="error" message={dropError} onDismiss={() => (dropError = null)} />
    </div>
  {/if}

  <div class="dd-desk">
    <div class="dd-page" style="width:{page.width}px;height:{page.height}px">
      <div
        class="dd-margins"
        style="top:{margins.top}px;right:{margins.right}px;bottom:{margins.bottom}px;left:{margins.left}px"
      ></div>

      {#if reportHeader}
        <Band band={reportHeader} onAddElement={(el) => onAddElement('reportHeader', el)} onInvalidDrop={handleInvalidDrop} />
      {/if}
      {#if detail}
        <DetailTable
          band={detail}
          {adapter}
          entity={template.dataSource.entity}
          {onAddColumn}
          {onUpdateColumns}
          onInvalidDrop={handleInvalidDrop}
        />
      {/if}
      {#if totals}
        <Band band={totals} onAddElement={(el) => onAddElement('totals', el)} onInvalidDrop={handleInvalidDrop} />
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
</style>
