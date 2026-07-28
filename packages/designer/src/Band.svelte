<script lang="ts">
  import type { FreeBand, FreeElement, ValueFormat } from '@docsmith/core';
  import { createFieldElement } from './template-edits.js';

  type DragPayload = {
    cls: 'header' | 'dataset';
    datasetId: string | null;
    column: string;
    type: string;
    label: string;
    format: ValueFormat;
  };

  let {
    band,
    onAddElement,
    onInvalidDrop,
  }: {
    band: FreeBand;
    onAddElement: (element: FreeElement) => void;
    onInvalidDrop: (reason: string) => void;
  } = $props();

  let dragOver = $state(false);

  const bandLabel: Record<FreeBand['type'], string> = {
    reportHeader: 'Report Header',
    pageHeader: 'Page Header',
    totals: 'Totals',
    pageFooter: 'Page Footer',
  };

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const raw = e.dataTransfer?.getData('application/x-doc-field');
    if (!raw) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    if (payload.cls !== 'header') {
      onInvalidDrop('Line-item fields can only go in the items table.');
      return;
    }
    onAddElement(
      createFieldElement(
        'header',
        { name: payload.column, label: payload.label, type: payload.type },
        band.elements,
      ),
    );
  }
</script>

<div class="dd-band" class:dd-band--dragover={dragOver}>
  <div class="dd-band-tab">{bandLabel[band.type]}</div>
  <div
    class="dd-band-body"
    style="height:{band.height}px"
    role="group"
    aria-label={`${bandLabel[band.type]} band`}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if band.elements.length === 0}
      <p class="dd-band-empty">Drag header fields here, or use a field's “+” button.</p>
    {:else}
      {#each band.elements as el (el.id)}
        <div
          class="dd-el"
          style="left:{el.x}px;top:{el.y}px;width:{el.w}px;height:{el.h}px"
        >
          {#if el.kind === 'field'}
            <span class="dd-el-token">{`{${el.label ?? el.binding?.column ?? 'field'}}`}</span>
          {:else if el.kind === 'text'}
            <span>{el.text}</span>
          {:else if el.kind === 'image'}
            <span class="dd-el-placeholder">Image</span>
          {:else if el.kind === 'line'}
            <span class="dd-el-line"></span>
          {:else if el.kind === 'box'}
            <span class="dd-el-placeholder">Box</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .dd-band {
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-band-tab {
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--dd-muted);
    background: var(--dd-panel-alt);
  }

  .dd-band-body {
    position: relative;
    background: #fff;
  }

  .dd-band--dragover .dd-band-body {
    outline: 2px dashed var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-band-empty {
    margin: 0;
    padding: 10px;
    font-size: 11px;
    color: var(--dd-muted);
    font-style: italic;
  }

  .dd-el {
    position: absolute;
    overflow: hidden;
    font-size: 12px;
    color: #222;
    white-space: pre-wrap;
  }

  .dd-el-token {
    color: var(--dd-accent);
  }

  .dd-el-placeholder {
    color: var(--dd-muted);
    font-style: italic;
  }

  .dd-el-line {
    display: block;
    width: 100%;
    border-top: 1px solid #333;
  }
</style>
