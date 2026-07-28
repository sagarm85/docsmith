<script lang="ts">
  import type { DataSourceAdapter, FieldMeta } from '@docsmith/core';
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
  } = $props();

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

  const system = $derived(filtered.filter((f) => f.kind === 'system'));
  const custom = $derived(filtered.filter((f) => f.kind === 'custom'));
  // D-013: system/custom is the adapter's truth. Only split into two sub-groups
  // when both are actually present; otherwise a single flat list (never an empty
  // "Custom" section just because the type allows it).
  const splitByKind = $derived(system.length > 0 && custom.length > 0);
</script>

<div class="dd-field-group">
  <Collapsible {title}>
    {#if state.status === 'loading'}
      <Skeleton width="100%" height="18px" />
      <Skeleton width="100%" height="18px" />
    {:else if state.status === 'error'}
      <ErrorInline message={state.message} onRetry={load} />
    {:else if state.data.length === 0}
      <p class="dd-empty-hint">No fields available from the adapter.</p>
    {:else if filtered.length === 0}
      <p class="dd-empty-hint">No fields match “{filter}”.</p>
    {:else if splitByKind}
      <div class="dd-subgroup">
        <h4 class="dd-subgroup-title">System</h4>
        {#each system as field (field.name)}
          <FieldChip {field} {cls} {datasetId} onAdd={onAddField && (() => onAddField(field))} />
        {/each}
      </div>
      <div class="dd-subgroup">
        <h4 class="dd-subgroup-title">Custom</h4>
        {#each custom as field (field.name)}
          <FieldChip {field} {cls} {datasetId} onAdd={onAddField && (() => onAddField(field))} />
        {/each}
      </div>
    {:else}
      <div class="dd-subgroup">
        {#each filtered as field (field.name)}
          <FieldChip {field} {cls} {datasetId} onAdd={onAddField && (() => onAddField(field))} />
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
    gap: 4px;
    margin-bottom: 8px;
  }

  .dd-subgroup-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--dd-muted);
    margin: 0 0 2px;
  }
</style>
