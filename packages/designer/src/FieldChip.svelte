<script lang="ts">
  import { defaultFormatForType, type FieldMeta } from '@docsmith/core';

  let {
    field,
    cls,
    datasetId,
    onAdd,
  }: {
    field: FieldMeta;
    cls: 'header' | 'dataset';
    datasetId?: string;
    onAdd?: () => void;
  } = $props();

  const format = $derived(defaultFormatForType(field.type));

  const typeGlyph = $derived(
    format === 'currency' ? '$' : format === 'date' ? '📅' : format === 'number' ? '#' : 'T',
  );

  const addLabel = $derived(
    cls === 'header' ? `Add ${field.label} to report header` : `Add ${field.label} column`,
  );

  // Native HTML5 DnD payload (design.md §5). The drop side (Canvas/Band/DetailTable)
  // doesn't exist yet — this is the drag *source* half, built ahead of it per the
  // design.md §14 component order.
  function handleDragStart(e: DragEvent) {
    const payload = {
      cls,
      datasetId: datasetId ?? null,
      column: field.name,
      type: field.type,
      label: field.label,
      format,
    };
    e.dataTransfer?.setData('application/x-doc-field', JSON.stringify(payload));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  }
</script>

<div
  class="dd-chip"
  role="group"
  aria-label={`${field.label} field`}
  draggable="true"
  ondragstart={handleDragStart}
>
  <span class="dd-chip-glyph" aria-hidden="true">{typeGlyph}</span>
  <span class="dd-chip-label">{field.label}</span>
  <button
    type="button"
    class="dd-chip-add"
    aria-label={addLabel}
    disabled={!onAdd}
    onclick={onAdd}
  >
    +
  </button>
</div>

<style>
  .dd-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    cursor: grab;
  }

  .dd-chip:active {
    cursor: grabbing;
  }

  .dd-chip-glyph {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 10px;
    font-weight: 700;
    color: var(--dd-accent);
    background: var(--dd-accent-weak);
    border-radius: 4px;
  }

  .dd-chip-label {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--dd-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dd-chip-add {
    flex: none;
    width: 18px;
    height: 18px;
    line-height: 1;
    border: 1px solid var(--dd-border);
    border-radius: 4px;
    background: var(--dd-panel);
    color: var(--dd-text);
    cursor: pointer;
    font-size: 12px;
  }

  .dd-chip-add:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .dd-chip-add:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-chip-add:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
