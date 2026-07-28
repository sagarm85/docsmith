<script lang="ts">
  import type { DataSource, DataSourceAdapter, FieldMeta } from '@docsmith/core';
  import SourceConfig from './SourceConfig.svelte';
  import FieldGroup from './FieldGroup.svelte';

  let {
    adapter,
    dataSource,
    onDataSourceChange,
    onAddField,
  }: {
    adapter: DataSourceAdapter;
    dataSource: DataSource;
    onDataSourceChange: (next: DataSource) => void;
    /**
     * Undefined until Canvas/Band/DetailTable exist to receive an add — every
     * FieldChip's keyboard "+" affordance is honestly disabled until then, the
     * same pattern used for Toolbar's Export PDF / Undo / Redo.
     */
    onAddField?: (field: FieldMeta, cls: 'header' | 'dataset', datasetId?: string) => void;
  } = $props();

  let search = $state('');
</script>

<aside class="dd-palette" aria-label="Field palette">
  <SourceConfig {adapter} {dataSource} {onDataSourceChange} />

  {#if dataSource.entity}
    <div class="dd-search">
      <label class="dd-search-label" for="dd-palette-search">Filter fields</label>
      <input
        id="dd-palette-search"
        class="dd-search-input"
        type="search"
        placeholder="Filter fields…"
        bind:value={search}
      />
    </div>

    <FieldGroup
      title="Header fields"
      cls="header"
      {adapter}
      entity={dataSource.entity}
      filter={search}
      onAddField={onAddField && ((field) => onAddField(field, 'header'))}
    />

    {#each dataSource.datasets as ds (ds.id)}
      <FieldGroup
        title={ds.label}
        cls="dataset"
        {adapter}
        entity={dataSource.entity}
        datasetId={ds.id}
        filter={search}
        onAddField={onAddField && ((field) => onAddField(field, 'dataset', ds.id))}
      />
    {/each}
  {/if}
</aside>

<style>
  .dd-palette {
    width: 240px;
    flex: none;
    height: 100%;
    overflow-y: auto;
    border-right: 1px solid var(--dd-border);
    background: var(--dd-panel);
  }

  .dd-search {
    padding: 8px 12px;
    border-top: 1px solid var(--dd-border);
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-search-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .dd-search-input {
    width: 100%;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-bg);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
  }

  .dd-search-input:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
