<script lang="ts">
  import { aggregate, formatValue, type Align, type DataSourceAdapter, type DetailBand, type DetailColumn, type ValueFormat } from '@docsmith/core';
  import { createDetailColumn } from './template-edits.js';
  import Select from './ui/Select.svelte';
  import NumberInput from './ui/NumberInput.svelte';
  import Skeleton from './ui/Skeleton.svelte';
  import ErrorInline from './ui/ErrorInline.svelte';
  import Icon from './ui/Icon.svelte';

  type DragPayload = {
    cls: 'header' | 'dataset';
    datasetId: string | null;
    column: string;
    type: string;
    label: string;
    format: ValueFormat;
  };

  let {
    band,
    adapter,
    entity,
    selectedColumnIndex,
    bandSelected,
    onAddColumn,
    onUpdateColumns,
    onInvalidDrop,
    onSelectColumn,
    onSelectBand,
  }: {
    band: DetailBand;
    adapter: DataSourceAdapter;
    entity: string;
    selectedColumnIndex?: number;
    bandSelected?: boolean;
    onAddColumn: (column: DetailColumn) => void;
    onUpdateColumns: (columns: DetailColumn[]) => void;
    onInvalidDrop: (reason: string) => void;
    onSelectColumn: (index: number) => void;
    onSelectBand: () => void;
  } = $props();

  let dragOver = $state(false);
  let reorderFrom = $state<number | null>(null);

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

    if (e.dataTransfer?.getData('application/x-doc-block')) {
      onInvalidDrop('Blocks (text/image/line/box) can only go on a header, totals, or page band.');
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
    if (payload.cls !== 'dataset') {
      onInvalidDrop('Header fields can’t become table columns — drop them on a header or totals band instead.');
      return;
    }
    if (payload.datasetId !== band.datasetId) {
      onInvalidDrop('That field belongs to a different dataset than this table.');
      return;
    }
    onAddColumn(createDetailColumn({ name: payload.column, label: payload.label, type: payload.type }));
  }

  function removeColumn(index: number) {
    onUpdateColumns(band.columns.filter((_, i) => i !== index));
  }

  function updateColumn(index: number, patch: Partial<DetailColumn>) {
    onUpdateColumns(band.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function handleColumnDragStart(e: DragEvent, index: number) {
    reorderFrom = index;
    e.dataTransfer?.setData('application/x-doc-column-index', String(index));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleColumnDrop(e: DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer?.getData('application/x-doc-column-index');
    const from = raw !== undefined && raw !== '' ? Number(raw) : reorderFrom;
    reorderFrom = null;
    if (from === null || from === index) return;
    const cols = [...band.columns];
    const [moved] = cols.splice(from, 1);
    if (!moved) return;
    cols.splice(index, 0, moved);
    onUpdateColumns(cols);
  }

  const FORMAT_OPTIONS = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' },
    { value: 'date', label: 'Date' },
  ];
  const ALIGN_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  // Sample rows (design.md §8.5): a handful of real rows from the adapter, purely
  // to show real shape while designing — never fabricated.
  type SampleState =
    | { status: 'unavailable' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; rows: Array<Record<string, unknown>> };

  let sampleState = $state<SampleState>({ status: 'loading' });
  let sampleGen = 0;

  async function loadSample() {
    const gen = ++sampleGen;
    if (!adapter.listSampleIds) {
      sampleState = { status: 'unavailable' };
      return;
    }
    sampleState = { status: 'loading' };
    try {
      const ids = await adapter.listSampleIds(entity);
      if (gen !== sampleGen) return;
      const first = ids[0];
      if (!first) {
        sampleState = { status: 'ready', rows: [] };
        return;
      }
      const doc = await adapter.fetchDocument(entity, first.id);
      if (gen !== sampleGen) return;
      sampleState = { status: 'ready', rows: (doc.datasets[band.datasetId] ?? []).slice(0, 3) };
    } catch (err) {
      if (gen !== sampleGen) return;
      sampleState = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load sample rows.',
      };
    }
  }

  $effect(() => {
    void adapter;
    void entity;
    void band.datasetId;
    loadSample();
  });
</script>

<div class="dd-band dd-detail">
  <button
    type="button"
    class="dd-band-tab"
    class:dd-band-tab--selected={bandSelected}
    data-band-id={band.id}
    onclick={onSelectBand}
  >
    <Icon name="table" size={12} />
    Detail (line items)
  </button>
  <div
    class="dd-detail-body"
    class:dd-detail-body--dragover={dragOver}
    role="group"
    aria-label="Detail band"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if band.columns.length === 0}
      <p class="dd-band-empty">
        <Icon name="plus" size={13} />
        Drag line-item fields here, or use a field's “+” button, to add table columns.
      </p>
    {:else}
      <table class="dd-detail-table">
        <thead>
          <tr>
            {#each band.columns as col, i (col.column)}
              <th
                class:dd-col--selected={selectedColumnIndex === i}
                draggable="true"
                ondragstart={(e) => handleColumnDragStart(e, i)}
                ondragover={(e) => e.preventDefault()}
                ondrop={(e) => handleColumnDrop(e, i)}
                onclick={() => onSelectColumn(i)}
              >
                <div class="dd-col-header">
                  <span class="dd-col-title">{col.header}</span>
                  <button
                    type="button"
                    class="dd-col-remove"
                    aria-label={`Remove ${col.header} column`}
                    onclick={() => removeColumn(i)}
                  >
                    &#10005;
                  </button>
                </div>
                <div class="dd-col-controls">
                  <div class="dd-ctrl">
                    <span class="dd-ctrl-label">Format</span>
                    <Select
                      ariaLabel={`${col.header} format`}
                      value={col.format ?? 'text'}
                      options={FORMAT_OPTIONS}
                      onchange={(v) => updateColumn(i, { format: v as ValueFormat })}
                    />
                  </div>
                  <div class="dd-ctrl">
                    <span class="dd-ctrl-label">Align</span>
                    <Select
                      ariaLabel={`${col.header} alignment`}
                      value={col.align ?? 'left'}
                      options={ALIGN_OPTIONS}
                      onchange={(v) => updateColumn(i, { align: v as Align })}
                    />
                  </div>
                  <div class="dd-ctrl">
                    <span class="dd-ctrl-label">Width (px)</span>
                    <NumberInput
                      ariaLabel={`${col.header} width`}
                      value={col.width}
                      min={20}
                      max={800}
                      onchange={(v) => updateColumn(i, { width: v })}
                    />
                  </div>
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        {#if band.aggregates?.length && sampleState.status === 'ready'}
          <!-- Real sample-row aggregate preview (never fabricated) — matches
               core.renderToHtml's thead/tfoot/tbody source order; the browser
               renders tfoot at the bottom regardless (native table semantics),
               same as the printed output will. -->
          <tfoot>
            <tr>
              {#each band.columns as col (col.column)}
                {@const agg = band.aggregates?.find((a) => a.column === col.column)}
                <td style="text-align:{col.align ?? 'left'};font-weight:700">
                  {#if agg}
                    {formatValue(aggregate(sampleState.rows, agg.column, agg.fn), col.format ?? 'number')}
                  {/if}
                </td>
              {/each}
            </tr>
          </tfoot>
        {/if}
        <tbody>
          {#if sampleState.status === 'loading'}
            <tr>
              <td colspan={band.columns.length}><Skeleton width="100%" height="16px" /></td>
            </tr>
          {:else if sampleState.status === 'error'}
            <tr>
              <td colspan={band.columns.length}>
                <ErrorInline message={sampleState.message} onRetry={loadSample} />
              </td>
            </tr>
          {:else if sampleState.status === 'unavailable'}
            <tr>
              <td colspan={band.columns.length} class="dd-sample-hint">
                This adapter doesn't support sample rows (no `listSampleIds`).
              </td>
            </tr>
          {:else if sampleState.rows.length === 0}
            <tr>
              <td colspan={band.columns.length} class="dd-sample-hint">
                No sample document available yet.
              </td>
            </tr>
          {:else}
            {#each sampleState.rows as row, i (i)}
              <tr>
                {#each band.columns as col (col.column)}
                  <td style="text-align:{col.align ?? 'left'}">{String(row[col.column] ?? '')}</td>
                {/each}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
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
    background: var(--dd-accent);
  }

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
    color: var(--dd-accent);
    background: var(--dd-panel-alt);
    border: none;
    cursor: pointer;
  }

  .dd-band-tab--selected {
    box-shadow: inset 0 0 0 1px var(--dd-accent);
  }

  .dd-band-tab:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-col--selected {
    box-shadow: inset 0 0 0 2px var(--dd-accent);
  }

  .dd-detail-body {
    background: #fff;
    padding: 8px 8px 8px 11px;
  }

  .dd-detail-body--dragover {
    outline: 2px dashed var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-band-empty {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 10px;
    font-size: 11px;
    color: var(--dd-muted);
    font-style: italic;
  }

  .dd-detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .dd-detail-table th {
    border: 1px solid var(--dd-border);
    padding: 4px 6px;
    vertical-align: top;
    background: var(--dd-panel-alt);
    cursor: grab;
  }

  .dd-detail-table td {
    border: 1px solid var(--dd-border);
    padding: 4px 6px;
    color: #222;
  }

  .dd-col-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 4px;
  }

  .dd-col-title {
    font-weight: 600;
    color: var(--dd-text);
  }

  .dd-col-remove {
    border: none;
    background: transparent;
    color: var(--dd-muted);
    cursor: pointer;
    font-size: 11px;
  }

  .dd-col-remove:hover {
    color: var(--dd-danger);
  }

  .dd-col-remove:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-col-controls {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .dd-ctrl {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dd-ctrl-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--dd-muted);
  }

  .dd-sample-hint {
    color: var(--dd-muted);
    font-style: italic;
    text-align: left;
  }
</style>
