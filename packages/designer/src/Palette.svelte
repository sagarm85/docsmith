<script lang="ts">
  import type { DataSource, DataSourceAdapter, FieldMeta } from '@docsmith/core';
  import { SECTION_PRESETS, type BlockKind } from './template-edits.js';
  import type { PickedUp } from './types.js';
  import SourceConfig from './SourceConfig.svelte';
  import FieldGroup from './FieldGroup.svelte';
  import Collapsible from './ui/Collapsible.svelte';
  import Icon from './ui/Icon.svelte';
  import type { IconName } from './ui/icons.js';

  let {
    adapter,
    dataSource,
    onDataSourceChange,
    onAddField,
    onAddBlock,
    onAddSection,
    pickedUp = null,
    onPickUpField,
    onPickUpBlock,
    addedDatasetColumns,
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
    /** "Sections" — draggable column-layout skeletons (memory.md D-034/
     * D-037). Same D-018 click-to-add default target as Blocks
     * (reportHeader) — no keyboard drag-alternative for sections in v1,
     * matching the scope note on `createSectionRow`. */
    onAddSection?: (columns: number[]) => void;
    /** Keyboard drag-alternative (design.md §12), lifted to DocDesigner. */
    pickedUp?: PickedUp;
    onPickUpField?: (field: FieldMeta, cls: 'header' | 'dataset', datasetId?: string) => void;
    onPickUpBlock?: (kind: BlockKind) => void;
    /** Field names already present as a detail column — shown as "added"
     * in the dataset FieldGroups rather than a "+" that silently no-ops
     * (DocDesigner's handleAddColumn duplicate guard: a DetailColumn's only
     * identity is its field name, so a second one crashes the table's keyed
     * `{#each}`). Never applies to header fields, which have no such limit. */
    addedDatasetColumns?: Set<string>;
  } = $props();

  let search = $state('');

  const BLOCKS: Array<{ kind: BlockKind; label: string; icon: IconName }> = [
    { kind: 'text', label: 'Text', icon: 'text' },
    { kind: 'image', label: 'Image', icon: 'image' },
    { kind: 'line', label: 'Line', icon: 'line' },
    { kind: 'box', label: 'Box', icon: 'box' },
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
    <Collapsible title="Blocks" icon="palette">
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
          <span class="dd-chip-glyph" aria-hidden="true"><Icon name={block.icon} size={13} /></span>
          <span class="dd-chip-label">{block.label}</span>
          <button
            type="button"
            class="dd-chip-add"
            aria-label={`Add ${block.label} to report header`}
            disabled={!onAddBlock}
            onclick={() => onAddBlock?.(block.kind)}
          >
            <Icon name="plus" size={12} />
          </button>
        </div>
      {/each}
    </Collapsible>
  </div>

  {#if onAddSection}
    <div class="dd-blocks">
      <Collapsible title="Sections" icon="table">
        {#each SECTION_PRESETS as preset (preset.label)}
          <div
            class="dd-section-chip"
            role="group"
            aria-label={`${preset.label} section`}
            draggable="true"
            ondragstart={(e) => {
              e.dataTransfer?.setData('application/x-doc-section', JSON.stringify({ columns: preset.columns }));
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <span class="dd-section-thumb" aria-hidden="true">
              {#each preset.columns as w, i (i)}
                <span class="dd-section-thumb-col" style="flex:{w}"></span>
              {/each}
            </span>
            <span class="dd-chip-label">{preset.label}</span>
            <button
              type="button"
              class="dd-chip-add"
              aria-label={`Add ${preset.label} section to report header`}
              onclick={() => onAddSection?.(preset.columns)}
            >
              <Icon name="plus" size={12} />
            </button>
          </div>
        {/each}
      </Collapsible>
    </div>
  {/if}

  {#if dataSource.entity}
    <div class="dd-search">
      <label class="dd-search-label" for="dd-palette-search">Filter fields</label>
      <span class="dd-search-icon" aria-hidden="true"><Icon name="search" size={14} /></span>
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
        {addedDatasetColumns}
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
    position: relative;
    padding: 10px 12px;
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

  .dd-search-icon {
    position: absolute;
    left: 24px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    color: var(--dd-muted);
    pointer-events: none;
  }

  .dd-search-input {
    width: 100%;
    height: 34px;
    padding: 0 10px 0 32px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
  }

  .dd-search-input:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-blocks {
    padding: 0 4px;
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    margin-bottom: 1px;
    border-radius: var(--dd-radius-sm);
    cursor: grab;
  }

  .dd-chip:hover {
    background: var(--dd-panel-alt);
  }

  .dd-chip:active {
    cursor: grabbing;
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

  .dd-chip-glyph {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: var(--dd-accent);
    background: var(--dd-accent-weak);
    border-radius: var(--dd-radius-sm);
  }

  .dd-chip-label {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--dd-text);
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

  .dd-section-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    margin-bottom: 1px;
    border-radius: var(--dd-radius-sm);
    cursor: grab;
  }

  .dd-section-chip:hover {
    background: var(--dd-panel-alt);
  }

  .dd-section-chip:active {
    cursor: grabbing;
  }

  .dd-section-thumb {
    flex: none;
    display: flex;
    gap: 3px;
    width: 34px;
    height: 20px;
  }

  .dd-section-thumb-col {
    background: var(--dd-accent-weak);
    border: 1px solid var(--dd-accent);
    border-radius: 2px;
  }
</style>
