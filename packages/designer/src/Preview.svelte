<script lang="ts">
  import { renderToHtml, type DataSourceAdapter, type DocumentData, type Template } from '@docsmith/core';
  import Select from './ui/Select.svelte';
  import Skeleton from './ui/Skeleton.svelte';
  import ErrorInline from './ui/ErrorInline.svelte';

  let {
    template,
    adapter,
  }: {
    template: Template;
    adapter: DataSourceAdapter;
  } = $props();

  type IdsState =
    | { status: 'unavailable' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; ids: Array<{ id: string; label: string }> };

  type DocState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: DocumentData };

  let idsState = $state<IdsState>({ status: 'loading' });
  let docState = $state<DocState>({ status: 'idle' });
  let manualId = $state('');
  let idsGen = 0;
  let docGen = 0;

  async function loadIds() {
    const gen = ++idsGen;
    if (!adapter.listSampleIds) {
      idsState = { status: 'unavailable' };
      return;
    }
    idsState = { status: 'loading' };
    try {
      const ids = await adapter.listSampleIds(template.dataSource.entity);
      if (gen !== idsGen) return;
      idsState = { status: 'ready', ids };
      if (ids[0] && !manualId) manualId = ids[0].id;
    } catch (err) {
      if (gen !== idsGen) return;
      idsState = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load sample documents.',
      };
    }
  }

  async function loadDocument(entity: string, id: string) {
    const gen = ++docGen;
    if (!id) {
      docState = { status: 'idle' };
      return;
    }
    docState = { status: 'loading' };
    try {
      const data = await adapter.fetchDocument(entity, id);
      if (gen !== docGen) return;
      docState = { status: 'ready', data };
    } catch (err) {
      if (gen !== docGen) return;
      docState = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load the document.',
      };
    }
  }

  $effect(() => {
    void adapter;
    void template.dataSource.entity;
    loadIds();
  });

  $effect(() => {
    loadDocument(template.dataSource.entity, manualId);
  });

  const previewDocument = $derived(
    docState.status === 'ready' ? renderToHtml(template, docState.data).document : undefined,
  );

  function handleIdChange(id: string) {
    manualId = id;
  }

  function handleManualInput(e: Event) {
    manualId = (e.currentTarget as HTMLInputElement).value;
  }
</script>

<div class="dd-preview">
  <div class="dd-preview-toolbar">
    {#if idsState.status === 'ready' && idsState.ids.length > 0}
      <Select
        ariaLabel="Sample document"
        value={manualId}
        options={idsState.ids.map((i) => ({ value: i.id, label: i.label }))}
        onchange={handleIdChange}
      />
    {:else}
      <label class="dd-preview-id-label" for="dd-preview-doc-id">Document id</label>
      <input
        id="dd-preview-doc-id"
        class="dd-preview-id-input"
        type="text"
        placeholder="Enter a document id…"
        value={manualId}
        oninput={handleManualInput}
      />
    {/if}
  </div>

  <div class="dd-preview-body">
    {#if !template.dataSource.entity}
      <p class="dd-preview-hint">Choose an entity in the Palette to preview a document.</p>
    {:else if docState.status === 'idle'}
      <p class="dd-preview-hint">Enter or choose a document id to preview.</p>
    {:else if docState.status === 'loading'}
      <div class="dd-preview-loading">
        <Skeleton width="60%" height="24px" />
        <Skeleton width="100%" height="200px" />
      </div>
    {:else if docState.status === 'error'}
      <ErrorInline
        message={docState.message}
        onRetry={() => loadDocument(template.dataSource.entity, manualId)}
      />
    {:else if previewDocument}
      <iframe class="dd-preview-frame" title="Document preview" srcdoc={previewDocument}></iframe>
    {/if}
  </div>
</div>

<style>
  .dd-preview {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--dd-panel-alt);
  }

  .dd-preview-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--dd-border);
    background: var(--dd-panel);
  }

  .dd-preview-id-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .dd-preview-id-input {
    height: 30px;
    min-width: 220px;
    padding: 0 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
  }

  .dd-preview-id-input:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-preview-body {
    flex: 1;
    min-height: 0;
    padding: 16px;
  }

  .dd-preview-hint {
    margin: 0;
    color: var(--dd-muted);
    font-size: 13px;
  }

  .dd-preview-loading {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dd-preview-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
  }
</style>
