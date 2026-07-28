<script lang="ts">
  import type { DataSource, DataSourceAdapter, FieldMeta } from '@docsmith/core';
  import type { BlockKind } from './template-edits.js';
  import type { PickedUp } from './types.js';
  import SourceConfig from './SourceConfig.svelte';
  import FieldGroup from './FieldGroup.svelte';
  import Collapsible from './ui/Collapsible.svelte';

  let {
    adapter,
    dataSource,
    onDataSourceChange,
    onAddField,
    onAddBlock,
    pickedUp = null,
    onPickUpField,
    onPickUpBlock,
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
    onAddBlock?: (kind: BlockKind) => void;
    /** Keyboard drag-alternative (design.md §12), lifted to DocDesigner. */
    pickedUp?: PickedUp;
    onPickUpField?: (field: FieldMeta, cls: 'header' | 'dataset', datasetId?: string) => void;
    onPickUpBlock?: (kind: BlockKind) => void;
  } = $props();

  let search = $state('');

  const BLOCKS: Array<{ kind: BlockKind; label: string; glyph: string }> = [
    { kind: 'text', label: 'Text', glyph: 'T' },
    { kind: 'image', label: 'Image', glyph: '🖼' },
    { kind: 'line', label: 'Line', glyph: '―' },
    { kind: 'box', label: 'Box', glyph: '▭' },
  ];

  function handleBlockDragStart(e: DragEvent, kind: BlockKind) {
    e.dataTransfer?.setData('application/x-doc-block', JSON.stringify({ kind }));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  }

  function handleBlockKeydown(e: KeyboardEvent, kind: BlockKind) {
    if ((e.key === 'Enter' || e.key === ' ') && onPickUpBlock) {
      e.preventDefault();
      onPickUpBlock(kind);
    }
  }

  function isBlockPicked(kind: BlockKind): boolean {
    return pickedUp?.cls === 'block' && pickedUp.kind === kind;
  }
</script>

<aside class="dd-palette" aria-label="Field palette">
  <SourceConfig {adapter} {dataSource} {onDataSourceChange} />

  <div class="dd-blocks">
    <Collapsible title="Blocks">
      {#each BLOCKS as block (block.kind)}
        <!-- Same intentional pattern as FieldChip.svelte: role="group" is
             accurate, and the chip is ALSO the keyboard pickup target per
             design.md §12. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="dd-chip"
          class:dd-chip--picked={isBlockPicked(block.kind)}
          role="group"
          aria-label={`${block.label} block${isBlockPicked(block.kind) ? ' (picked up)' : ''}`}
          tabindex={onPickUpBlock ? 0 : -1}
          draggable="true"
          ondragstart={(e) => handleBlockDragStart(e, block.kind)}
          onkeydown={(e) => handleBlockKeydown(e, block.kind)}
        >
          <span class="dd-chip-glyph" aria-hidden="true">{block.glyph}</span>
          <span class="dd-chip-label">{block.label}</span>
          <button
            type="button"
            class="dd-chip-add"
            aria-label={`Add ${block.label} to report header`}
            disabled={!onAddBlock}
            onclick={() => onAddBlock?.(block.kind)}
          >
            +
          </button>
        </div>
      {/each}
    </Collapsible>
  </div>

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
      {pickedUp}
      onPickUp={onPickUpField && ((field) => onPickUpField(field, 'header'))}
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
        {pickedUp}
        onPickUp={onPickUpField && ((field) => onPickUpField(field, 'dataset', ds.id))}
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

  .dd-blocks {
    padding: 0 8px;
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    margin-bottom: 4px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    cursor: grab;
  }

  .dd-chip:active {
    cursor: grabbing;
  }

  .dd-chip:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-chip--picked {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
    background: var(--dd-accent-weak);
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
