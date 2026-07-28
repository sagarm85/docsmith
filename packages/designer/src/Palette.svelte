<script lang="ts">
  import type { DataSource, DataSourceAdapter } from '@docsmith/core';
  import SourceConfig from './SourceConfig.svelte';

  let {
    adapter,
    dataSource,
    onDataSourceChange,
  }: {
    adapter: DataSourceAdapter;
    dataSource: DataSource;
    onDataSourceChange: (next: DataSource) => void;
  } = $props();
</script>

<aside class="dd-palette" aria-label="Field palette">
  <SourceConfig {adapter} {dataSource} {onDataSourceChange} />
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
</style>
