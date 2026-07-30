<script lang="ts">
  import type { DataSourceAdapter, FieldMeta } from '@docsmith/core';
  import type { PickedUp } from './types.js';
  import Collapsible from './ui/Collapsible.svelte';
  import Skeleton from './ui/Skeleton.svelte';
  import ErrorInline from './ui/ErrorInline.svelte';
  import FieldChip from './FieldChip.svelte';

  let {
    title,
    cls,
    adapter,
    entity,
    datasetId,
    filter = '',
    onAddField,
    pickedUp = null,
    onPickUp,
    addedDatasetColumns,
  }: {
    title: string;
    cls: 'header' | 'dataset';
    adapter: DataSourceAdapter;
    entity: string;
    /** Required when cls === 'dataset'. */
    datasetId?: string;
    /** Palette-wide search term; matches on field label/name (case-insensitive). */
    filter?: string;
    onAddField?: (field: FieldMeta) => void;
    /** Keyboard drag-alternative (design.md §12) state, lifted to DocDesigner. */
    pickedUp?: PickedUp;
    onPickUp?: (field: FieldMeta) => void;
    /** Field names already present as a detail column (cls === 'dataset' only —
     * see Palette.svelte's doc comment for why). */
    addedDatasetColumns?: Set<string>;
  } = $props();

  function isPicked(field: FieldMeta): boolean {
    return (
      pickedUp?.cls === cls &&
      pickedUp.column === field.name &&
      pickedUp.datasetId === (datasetId ?? null)
    );
  }

  function isAdded(field: FieldMeta): boolean {
    return cls === 'dataset' && (addedDatasetColumns?.has(field.name) ?? false);
  }

  type AsyncState<T> =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: T };

  let state = $state<AsyncState<FieldMeta[]>>({ status: 'loading' });
  let generation = 0;

  async function load() {
    const gen = ++generation;
    const currentEntity = entity;
    const currentDatasetId = datasetId;
    state = { status: 'loading' };
    try {
      const data =
        cls === 'header'
          ? await adapter.getFields(currentEntity)
          : await adapter.getDatasetFields(currentEntity, currentDatasetId as string);
      if (gen !== generation) return;
      state = { status: 'ready', data };
    } catch (err) {
      if (gen !== generation) return;
      state = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load fields.',
      };
    }
  }

  $effect(() => {
    void adapter;
    void entity;
    void datasetId;
    void cls;
    load();
  });

  const filtered = $derived(
    state.status === 'ready'
      ? state.data.filter((f) => {
          const q = filter.trim().toLowerCase();
          if (!q) return true;
          return f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
        })
      : [],
  );

  // D-013: system/custom is the adapter's truth, shown per-item via
  // FieldChip's own kind badge rather than a separate subheader/subgroup —
  // system fields listed first, then custom, one flat list either way.
  const ordered = $derived([
    ...filtered.filter((f) => f.kind === 'system'),
    ...filtered.filter((f) => f.kind === 'custom'),
  ]);
</script>

<div class="dd-field-group">
  <Collapsible {title} icon={cls === 'header' ? 'doc' : 'database'}>
    {#if state.status === 'loading'}
      <Skeleton width="100%" height="18px" />
      <Skeleton width="100%" height="18px" />
    {:else if state.status === 'error'}
      <ErrorInline message={state.message} onRetry={load} />
    {:else if state.data.length === 0}
      <p class="dd-empty-hint">No fields available from the adapter.</p>
    {:else if filtered.length === 0}
      <p class="dd-empty-hint">No fields match “{filter}”.</p>
    {:else}
      <div class="dd-subgroup">
        {#each ordered as field (field.name)}
          <FieldChip
            {field}
            {cls}
            {datasetId}
            onAdd={onAddField && !isAdded(field) ? () => onAddField(field) : undefined}
            picked={isPicked(field)}
            onPickUp={onPickUp && !isAdded(field) ? () => onPickUp(field) : undefined}
            added={isAdded(field)}
          />
        {/each}
      </div>
    {/if}
  </Collapsible>
</div>

<style>
  .dd-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 8px;
  }

  .dd-empty-hint {
    font-size: 12px;
    color: var(--dd-muted);
    margin: 0 0 8px;
  }

  .dd-subgroup {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 4px;
  }
</style>
