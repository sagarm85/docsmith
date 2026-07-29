<script lang="ts">
  import { isDetailBand, type Band, type DetailBand, type FreeBand } from '@docsmith/core';
  import Field from './ui/Field.svelte';
  import NumberInput from './ui/NumberInput.svelte';
  import Select from './ui/Select.svelte';
  import Icon from './ui/Icon.svelte';
  import type { IconName } from './ui/icons.js';

  let {
    band,
    onChange,
    onArrangementChange,
  }: {
    band: Band;
    onChange: (patch: Partial<FreeBand>) => void;
    /** Free/stack/grid migration (memory.md D-029, D-034) — DocDesigner
     * performs the actual layout conversion via core.convertBandArrangement
     * before committing, same pattern as onLayoutUnitChange. Only offered
     * for reportHeader/totals: pageHeader/pageFooter need a *known* height
     * to reserve `.doc-flow` padding for their fixed position, which a
     * 'stack'/'grid' band's intrinsic/auto height can't guarantee. */
    onArrangementChange?: (arrangement: 'free' | 'stack' | 'grid') => void;
  } = $props();

  const ARRANGEMENT_OPTIONS = [
    { value: 'free', label: 'Free-form' },
    { value: 'stack', label: 'Stacked' },
    { value: 'grid', label: 'Grid' },
  ];

  const DEFAULT_GRID_BORDER = '1px solid #1a1c22';

  function gridColumnsOf(free: FreeBand): number[] {
    return free.gridColumns?.length ? free.gridColumns : [100];
  }

  function addGridColumn(free: FreeBand) {
    const cols = [...gridColumnsOf(free)];
    const last = cols[cols.length - 1] ?? 100;
    const half = Math.round(last / 2);
    cols[cols.length - 1] = last - half;
    cols.push(half);
    onChange({ gridColumns: cols });
  }

  function removeGridColumn(free: FreeBand, index: number) {
    const cols = [...gridColumnsOf(free)];
    if (cols.length <= 1) return;
    cols.splice(index, 1);
    onChange({ gridColumns: cols });
  }

  function updateGridColumnWidth(free: FreeBand, index: number, value: number) {
    const cols = [...gridColumnsOf(free)];
    cols[index] = value;
    onChange({ gridColumns: cols });
  }

  const BAND_LABEL: Record<Band['type'], string> = {
    reportHeader: 'Report Header',
    pageHeader: 'Page Header',
    detail: 'Detail (line items)',
    totals: 'Totals',
    pageFooter: 'Page Footer',
  };

  const BAND_ICON: Record<Band['type'], IconName> = {
    reportHeader: 'doc',
    pageHeader: 'repeat',
    detail: 'table',
    totals: 'calculator',
    pageFooter: 'repeat',
  };

  const isOptional = $derived(band.type === 'pageHeader' || band.type === 'pageFooter');
</script>

<div class="dd-band-props">
  <h3 class="dd-props-title"><Icon name={BAND_ICON[band.type]} size={13} />{BAND_LABEL[band.type]} band</h3>

  {#if isDetailBand(band)}
    {@const detail = band as DetailBand}
    <p class="dd-props-hint">
      Columns are added and edited directly on the canvas (drag a line-item
      field, or use its “+” button). Height flows automatically with row
      count.
    </p>
    <p class="dd-props-hint">
      Dataset: <strong>{detail.datasetId || '(none)'}</strong> · Columns: {detail.columns.length}
    </p>
  {:else}
    {@const free = band as FreeBand}
    {#if onArrangementChange}
      <Field label="Arrangement" fieldId="dd-band-arrangement">
        <Select
          id="dd-band-arrangement"
          ariaLabel="Band arrangement"
          value={free.arrangement ?? 'free'}
          options={ARRANGEMENT_OPTIONS}
          onchange={(v) => onArrangementChange?.(v as 'free' | 'stack' | 'grid')}
        />
      </Field>
      {#if free.arrangement === 'stack'}
        <p class="dd-props-hint">
          Elements flow top-to-bottom automatically; height is intrinsic. Drag
          the row handle to reorder.
        </p>
      {/if}
      {#if free.arrangement === 'grid'}
        <p class="dd-props-hint">
          An explicit row/column table — drop fields into cells, "Add row" on
          the canvas for a new one. Height is intrinsic.
        </p>
        <Field label="Columns (%)" fieldId="dd-band-grid-columns">
          <div class="dd-grid-columns">
            {#each gridColumnsOf(free) as width, i (i)}
              <div class="dd-grid-column-row">
                <NumberInput
                  id={`dd-band-grid-col-${i}`}
                  ariaLabel={`Column ${i + 1} width percent`}
                  min={5}
                  max={95}
                  value={width}
                  onchange={(v) => updateGridColumnWidth(free, i, v)}
                />
                <button
                  type="button"
                  class="dd-grid-col-remove"
                  aria-label={`Remove column ${i + 1}`}
                  disabled={gridColumnsOf(free).length <= 1}
                  onclick={() => removeGridColumn(free, i)}
                >
                  <Icon name="close" size={11} />
                </button>
              </div>
            {/each}
            <button type="button" class="dd-grid-col-add" onclick={() => addGridColumn(free)}>
              <Icon name="plus" size={11} />
              Add column
            </button>
          </div>
        </Field>
        <label class="dd-toggle">
          <input
            type="checkbox"
            checked={Boolean(free.gridBorder)}
            onchange={(e) =>
              onChange({ gridBorder: (e.currentTarget as HTMLInputElement).checked ? DEFAULT_GRID_BORDER : undefined })}
          />
          Cell borders
        </label>
      {/if}
    {/if}

    {#if (free.arrangement ?? 'free') === 'free'}
      <Field label="Height (px)" fieldId="dd-band-height">
        <NumberInput
          id="dd-band-height"
          ariaLabel="Band height"
          min={20}
          max={2000}
          value={free.height}
          onchange={(v) => onChange({ height: v })}
        />
      </Field>
    {/if}

    <Field label="Background" fieldId="dd-band-bg">
      <input
        id="dd-band-bg"
        type="color"
        value={free.style?.bg ?? '#ffffff'}
        oninput={(e) =>
          onChange({ style: { ...free.style, bg: (e.currentTarget as HTMLInputElement).value } })}
      />
    </Field>

    {#if isOptional}
      <label class="dd-toggle">
        <input
          type="checkbox"
          checked={free.enabled ?? true}
          onchange={(e) => onChange({ enabled: (e.currentTarget as HTMLInputElement).checked })}
        />
        Show this band
      </label>
    {/if}
  {/if}
</div>

<style>
  .dd-band-props {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }

  .dd-props-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--dd-text);
  }

  .dd-props-hint {
    margin: 0;
    font-size: 12px;
    color: var(--dd-muted);
  }

  .dd-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--dd-text);
  }

  .dd-toggle input {
    accent-color: var(--dd-accent);
  }

  .dd-grid-columns {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dd-grid-column-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dd-grid-column-row :global(.dd-number) {
    flex: 1;
  }

  .dd-grid-col-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel);
    color: var(--dd-muted);
    cursor: pointer;
  }

  .dd-grid-col-remove:hover:not(:disabled) {
    background: var(--dd-danger-weak, var(--dd-panel-alt));
    color: var(--dd-danger);
  }

  .dd-grid-col-remove:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dd-grid-col-add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--dd-accent-strong);
    background: var(--dd-accent-weak);
    border: 1px dashed var(--dd-accent);
    border-radius: var(--dd-radius-sm);
    cursor: pointer;
  }
</style>
