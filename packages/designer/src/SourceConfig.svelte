<script lang="ts">
  import { datasetFromMeta, type DataSource, type DataSourceAdapter, type DatasetMeta, type EntityMeta } from '@docsmith/core';
  import Select from './ui/Select.svelte';
  import Skeleton from './ui/Skeleton.svelte';
  import ErrorInline from './ui/ErrorInline.svelte';

  let {
    adapter,
    dataSource,
    onDataSourceChange,
  }: {
    adapter: DataSourceAdapter;
    dataSource: DataSource;
    onDataSourceChange: (next: DataSource) => void;
  } = $props();

  type AsyncState<T> =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: T };

  let entitiesState = $state<AsyncState<EntityMeta[]>>({ status: 'loading' });
  let relatedState = $state<AsyncState<DatasetMeta[]>>({ status: 'ready', data: [] });

  // Generation counters make each fetch effectively cancellable: a result from a
  // stale request (superseded by a newer entity/adapter change before it resolved)
  // is discarded instead of clobbering newer state.
  let entitiesGen = 0;
  let relatedGen = 0;

  async function loadEntities() {
    const gen = ++entitiesGen;
    entitiesState = { status: 'loading' };
    try {
      const data = await adapter.listEntities();
      if (gen !== entitiesGen) return;
      entitiesState = { status: 'ready', data };
    } catch (err) {
      if (gen !== entitiesGen) return;
      entitiesState = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load entities.',
      };
    }
  }

  async function loadRelatedDatasets(entity: string) {
    const gen = ++relatedGen;
    if (!entity) {
      relatedState = { status: 'ready', data: [] };
      return;
    }
    relatedState = { status: 'loading' };
    try {
      const data = await adapter.getRelatedDatasets(entity);
      if (gen !== relatedGen) return;
      relatedState = { status: 'ready', data };
    } catch (err) {
      if (gen !== relatedGen) return;
      relatedState = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load related datasets.',
      };
    }
  }

  $effect(() => {
    // Re-run whenever `adapter` identity changes (host swapped adapters).
    void adapter;
    loadEntities();
  });

  $effect(() => {
    loadRelatedDatasets(dataSource.entity);
  });

  function handleEntityChange(entity: string) {
    onDataSourceChange({ ...dataSource, entity, datasets: [] });
  }

  function addDataset(meta: DatasetMeta) {
    const next = datasetFromMeta(meta, { table: meta.id, fkColumn: '' });
    onDataSourceChange({ ...dataSource, datasets: [...dataSource.datasets, next] });
  }

  function removeDataset(id: string) {
    onDataSourceChange({ ...dataSource, datasets: dataSource.datasets.filter((d) => d.id !== id) });
  }

  const availableDatasets = $derived(
    relatedState.status === 'ready'
      ? relatedState.data.filter((m) => !dataSource.datasets.some((d) => d.id === m.id))
      : [],
  );
</script>

<section class="dd-source-config" aria-label="Data source">
  <div class="dd-live" aria-live="polite">
    {#if entitiesState.status === 'loading'}
      Loading entities…
    {:else if entitiesState.status === 'error'}
      {entitiesState.message}
    {:else if entitiesState.status === 'ready'}
      Loaded {entitiesState.data.length} entit{entitiesState.data.length === 1 ? 'y' : 'ies'}.
    {/if}
  </div>

  <div class="dd-field-row">
    <span class="dd-label">Entity</span>
    {#if entitiesState.status === 'loading'}
      <Skeleton width="140px" height="30px" />
    {:else if entitiesState.status === 'error'}
      <ErrorInline message={entitiesState.message} onRetry={loadEntities} />
    {:else if entitiesState.data.length === 0}
      <span class="dd-empty-hint">No entities available from the adapter.</span>
    {:else}
      <Select
        ariaLabel="Entity"
        value={dataSource.entity}
        options={entitiesState.data.map((e) => ({ value: e.name, label: e.label }))}
        onchange={handleEntityChange}
      />
    {/if}
  </div>

  {#if dataSource.entity}
    <div class="dd-datasets">
      <h3 class="dd-section-title">Line-item datasets</h3>

      {#if dataSource.datasets.length > 0}
        <ul class="dd-dataset-list">
          {#each dataSource.datasets as ds (ds.id)}
            <li class="dd-dataset-item">
              <span>{ds.label}</span>
              <button
                type="button"
                class="dd-dataset-remove"
                aria-label={`Remove ${ds.label} dataset`}
                onclick={() => removeDataset(ds.id)}
              >
                &#10005;
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      {#if relatedState.status === 'loading'}
        <Skeleton width="100%" height="20px" />
        <Skeleton width="100%" height="20px" />
      {:else if relatedState.status === 'error'}
        <ErrorInline
          message={relatedState.message}
          onRetry={() => loadRelatedDatasets(dataSource.entity)}
        />
      {:else if availableDatasets.length === 0 && dataSource.datasets.length === 0}
        <p class="dd-empty-hint">No related line-item datasets for this entity.</p>
      {:else}
        <ul class="dd-dataset-list">
          {#each availableDatasets as meta (meta.id)}
            <li class="dd-dataset-item">
              <span>{meta.label}</span>
              <button
                type="button"
                class="dd-dataset-add"
                aria-label={`Add ${meta.label} dataset`}
                onclick={() => addDataset(meta)}
              >
                + Add
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</section>

<style>
  .dd-source-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .dd-live {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .dd-field-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dd-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--dd-muted);
  }

  .dd-empty-hint {
    font-size: 12px;
    color: var(--dd-muted);
    margin: 0;
  }

  .dd-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--dd-muted);
    margin: 0 0 6px;
  }

  .dd-dataset-list {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dd-dataset-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    font-size: 12px;
    color: var(--dd-text);
  }

  .dd-dataset-add,
  .dd-dataset-remove {
    flex: none;
    border: none;
    background: transparent;
    color: var(--dd-accent);
    font-size: 12px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: var(--dd-radius);
  }

  .dd-dataset-remove {
    color: var(--dd-muted);
  }

  .dd-dataset-add:hover,
  .dd-dataset-remove:hover {
    background: var(--dd-panel-alt);
  }

  .dd-dataset-add:focus-visible,
  .dd-dataset-remove:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
