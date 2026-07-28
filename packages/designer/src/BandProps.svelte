<script lang="ts">
  import { isDetailBand, type Band, type DetailBand, type FreeBand } from '@docsmith/core';
  import Field from './ui/Field.svelte';
  import NumberInput from './ui/NumberInput.svelte';

  let {
    band,
    onChange,
  }: {
    band: Band;
    onChange: (patch: Partial<FreeBand>) => void;
  } = $props();

  const BAND_LABEL: Record<Band['type'], string> = {
    reportHeader: 'Report Header',
    pageHeader: 'Page Header',
    detail: 'Detail (line items)',
    totals: 'Totals',
    pageFooter: 'Page Footer',
  };

  const isOptional = $derived(band.type === 'pageHeader' || band.type === 'pageFooter');
</script>

<div class="dd-band-props">
  <h3 class="dd-props-title">{BAND_LABEL[band.type]} band</h3>

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
</style>
