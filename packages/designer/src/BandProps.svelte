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
    /** Free<->stack migration (memory.md D-029) — DocDesigner performs the
     * actual layout conversion via core.convertBandArrangement before
     * committing, same pattern as onLayoutUnitChange. Only offered for
     * reportHeader/totals: pageHeader/pageFooter need a *known* height to
     * reserve `.doc-flow` padding for their fixed position, which a
     * 'stack' band's intrinsic/auto height can't guarantee. */
    onArrangementChange?: (arrangement: 'free' | 'stack') => void;
  } = $props();

  const ARRANGEMENT_OPTIONS = [
    { value: 'free', label: 'Free-form' },
    { value: 'stack', label: 'Stacked' },
  ];

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
          onchange={(v) => onArrangementChange?.(v as 'free' | 'stack')}
        />
      </Field>
      {#if free.arrangement === 'stack'}
        <p class="dd-props-hint">
          Elements flow top-to-bottom automatically; height is intrinsic. Drag
          the row handle to reorder.
        </p>
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
</style>
