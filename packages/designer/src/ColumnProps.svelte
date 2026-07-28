<script lang="ts">
  import type { Align, DetailColumn, ValueFormat } from '@docsmith/core';
  import Field from './ui/Field.svelte';
  import NumberInput from './ui/NumberInput.svelte';
  import Select from './ui/Select.svelte';

  let {
    column,
    onChange,
  }: {
    column: DetailColumn;
    onChange: (patch: Partial<DetailColumn>) => void;
  } = $props();

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
</script>

<div class="dd-column-props">
  <h3 class="dd-props-title">Column: {column.column}</h3>

  <Field label="Header text" fieldId="dd-col-header">
    <input
      id="dd-col-header"
      class="dd-col-text-input"
      type="text"
      value={column.header}
      oninput={(e) => onChange({ header: (e.currentTarget as HTMLInputElement).value })}
    />
  </Field>

  <Field label="Width (px)" fieldId="dd-col-width">
    <NumberInput
      id="dd-col-width"
      ariaLabel="Column width"
      min={20}
      max={800}
      value={column.width}
      onchange={(v) => onChange({ width: v })}
    />
  </Field>

  <Field label="Align" fieldId="dd-col-align">
    <Select
      id="dd-col-align"
      ariaLabel="Column alignment"
      value={column.align ?? 'left'}
      options={ALIGN_OPTIONS}
      onchange={(v) => onChange({ align: v as Align })}
    />
  </Field>

  <Field label="Format" fieldId="dd-col-format">
    <Select
      id="dd-col-format"
      ariaLabel="Column format"
      value={column.format ?? 'text'}
      options={FORMAT_OPTIONS}
      onchange={(v) => onChange({ format: v as ValueFormat })}
    />
  </Field>
</div>

<style>
  .dd-column-props {
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
    word-break: break-all;
  }

  .dd-col-text-input {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
  }
</style>
