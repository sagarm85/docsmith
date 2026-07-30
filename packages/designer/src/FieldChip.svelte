<script lang="ts">
  import { defaultFormatForType, type FieldMeta } from '@docsmith/core';
  import Icon from './ui/Icon.svelte';

  let {
    field,
    cls,
    datasetId,
    onAdd,
    picked = false,
    onPickUp,
    added = false,
  }: {
    field: FieldMeta;
    cls: 'header' | 'dataset';
    datasetId?: string;
    onAdd?: () => void;
    /** True while this exact chip is the "held" one in the keyboard
     * drag-alternative (design.md §12). */
    picked?: boolean;
    onPickUp?: () => void;
    /** True when this dataset field is already a detail column — shown as
     * "added" (a check, not a "+") instead of a control that would silently
     * no-op or, worse, crash the table's keyed rendering on a duplicate
     * (DocDesigner's handleAddColumn guard; see FieldGroup.svelte). */
    added?: boolean;
  } = $props();

  const addLabel = $derived(
    added
      ? `${field.label} already added`
      : cls === 'header'
        ? `Add ${field.label} to report header`
        : `Add ${field.label} column`,
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
      format: defaultFormatForType(field.type),
    };
    e.dataTransfer?.setData('application/x-doc-field', JSON.stringify(payload));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && onPickUp) {
      e.preventDefault();
      onPickUp();
    }
  }
</script>

<!-- role="group" is the accurate semantic (a label + a nested "+" button) —
     the chip itself is ALSO the keyboard pickup target per design.md §12
     ("select a chip, press Enter to pick up"), an intentional widget pattern,
     not a plain static element. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="dd-chip"
  class:dd-chip--picked={picked}
  class:dd-chip--added={added}
  role="group"
  aria-label={`${field.label} field${picked ? ' (picked up)' : added ? ' (already added)' : ''}`}
  tabindex={onPickUp ? 0 : -1}
  draggable="true"
  ondragstart={handleDragStart}
  onkeydown={handleKeydown}
>
  <span class="dd-chip-label">{field.label}</span>
  <span class="dd-chip-badge dd-chip-badge--{field.kind}">{field.kind}</span>
  <button
    type="button"
    class="dd-chip-add"
    class:dd-chip-add--added={added}
    aria-label={addLabel}
    disabled={!onAdd}
    onclick={onAdd}
  >
    <Icon name={added ? 'check' : 'plus'} size={12} />
  </button>
</div>

<style>
  .dd-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: var(--dd-radius-sm);
    cursor: grab;
  }

  .dd-chip:hover {
    background: var(--dd-panel-alt);
  }

  .dd-chip:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-chip--picked {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
    background: var(--dd-accent-weak);
  }

  /* Quiet, not dimmed like a normal disabled control — this chip isn't
     unavailable, it's already done (memory.md: DetailColumn's only identity
     is its field name, so a second one would crash the table's keyed
     rendering; this is the honest "nothing to add" state, not a broken +). */
  .dd-chip--added {
    opacity: 0.75;
  }

  .dd-chip-add--added:disabled {
    opacity: 1;
    color: var(--dd-accent-strong);
  }

  .dd-chip:active {
    cursor: grabbing;
  }

  .dd-chip-label {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--dd-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dd-chip-badge {
    flex: none;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--dd-muted);
    background: var(--dd-panel-alt);
    padding: 2px 7px;
    border-radius: 999px;
  }

  .dd-chip-badge--custom {
    color: var(--dd-accent-strong);
    background: var(--dd-accent-weak);
  }

  .dd-chip-add {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--dd-muted);
    cursor: pointer;
  }

  .dd-chip-add:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .dd-chip-add:hover:not(:disabled) {
    background: var(--dd-panel);
    color: var(--dd-accent-strong);
  }

  .dd-chip-add:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }
</style>
