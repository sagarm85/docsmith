<svelte:options customElement={{ tag: 'doc-designer', shadow: 'open' }} />

<script lang="ts">
  import {
    isDetailBand,
    newTemplate,
    type DataSource,
    type DetailColumn,
    type FieldMeta,
    type FreeBand,
    type FreeElement,
    type Template,
  } from '@docsmith/core';
  import type { DocDesignerConfig } from './types.js';
  import { saveTemplateToLocalStorage } from './persistence.js';
  import { createFieldElement, createDetailColumn } from './template-edits.js';
  import ErrorInline from './ui/ErrorInline.svelte';
  import Toast from './ui/Toast.svelte';
  import Toolbar from './Toolbar.svelte';
  import Palette from './Palette.svelte';
  import Canvas from './Canvas.svelte';

  let { config }: { config?: DocDesignerConfig } = $props();

  // Seed once from the initial config (or a fresh, valid, empty template from
  // `core.newTemplate()` — never hand-rolled here, per "business logic lives in
  // core"); `template` is independent mutable state afterward (see
  // getTemplate/setTemplate below), so we deliberately don't want this to track
  // later `config` changes.
  // svelte-ignore state_referenced_locally
  let template = $state<Template>(config?.template ?? newTemplate());

  let mode = $state<'design' | 'preview'>('design');
  let saving = $state(false);
  let saveToast = $state<{ variant: 'success' | 'error'; message: string } | null>(null);

  // Host-page theme overrides (design.md §13 `theme`) are applied as inline custom
  // properties on the shadow-root's own top-level element, so they cascade to every
  // --dd-* consumer beneath while still falling back to the :host defaults in
  // tokens.css for anything not overridden.
  const themeStyle = $derived(
    config?.theme
      ? Object.entries(config.theme)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ')
      : undefined,
  );

  function handleNameChange(name: string) {
    template = { ...template, name };
  }

  function handleDataSourceChange(next: DataSource) {
    template = { ...template, dataSource: next };
  }

  function handleAddElement(bandId: string, element: FreeElement) {
    template = {
      ...template,
      bands: template.bands.map((b) =>
        b.id === bandId && !isDetailBand(b) ? { ...b, elements: [...b.elements, element] } : b,
      ),
    };
  }

  function handleAddColumn(column: DetailColumn) {
    template = {
      ...template,
      bands: template.bands.map((b) => (isDetailBand(b) ? { ...b, columns: [...b.columns, column] } : b)),
    };
  }

  function handleUpdateColumns(columns: DetailColumn[]) {
    template = {
      ...template,
      bands: template.bands.map((b) => (isDetailBand(b) ? { ...b, columns } : b)),
    };
  }

  // The click-to-add "+" on a FieldChip has no "selected band" concept in Phase 1
  // (no free-form selection yet — that's Phase 2). Header fields default to
  // reportHeader; dataset fields have only one legal destination, the detail
  // band. Dragging a chip directly onto the totals band remains possible and
  // gives the other placement.
  function handlePaletteAddField(field: FieldMeta, cls: 'header' | 'dataset', datasetId?: string) {
    if (cls === 'dataset') {
      handleAddColumn(createDetailColumn(field));
      return;
    }
    const reportHeader = template.bands.find((b) => b.id === 'reportHeader') as FreeBand | undefined;
    handleAddElement('reportHeader', createFieldElement('header', field, reportHeader?.elements ?? []));
    void datasetId;
  }

  async function handleSave() {
    saving = true;
    saveToast = null;
    try {
      if (config?.onSave) {
        await config.onSave(template);
      } else {
        saveTemplateToLocalStorage(template);
      }
      saveToast = { variant: 'success', message: 'Template saved.' };
    } catch (err) {
      saveToast = {
        variant: 'error',
        message: err instanceof Error ? err.message : 'Failed to save template.',
      };
    } finally {
      saving = false;
    }
  }

  export function getTemplate(): Template {
    return template;
  }

  export function setTemplate(next: Template): void {
    template = next;
  }
</script>

<div class="dd-root" style={themeStyle}>
  {#if !config?.adapter}
    <div class="dd-empty">
      <ErrorInline
        message="No data adapter configured. Pass an adapter via DocDesigner.mount(el, options)."
      />
    </div>
  {:else}
    <!-- The outer #if already proved config.adapter is set; the ! here is just
         narrowing config itself, which Svelte's template analysis can't infer
         across the block boundary the way plain TS control flow would. -->
    {@const adapter = config!.adapter}
    <div class="dd-shell">
      <Toolbar
        templateName={template.name}
        onNameChange={handleNameChange}
        {mode}
        onModeChange={(next) => (mode = next)}
        {saving}
        onSave={handleSave}
      />
      {#if saveToast}
        <div class="dd-toast-slot">
          <Toast
            variant={saveToast.variant}
            message={saveToast.message}
            onDismiss={() => (saveToast = null)}
          />
        </div>
      {/if}
      <div class="dd-workspace">
        {#if mode === 'design'}
          <Palette
            {adapter}
            dataSource={template.dataSource}
            onDataSourceChange={handleDataSourceChange}
            onAddField={handlePaletteAddField}
          />
          <Canvas
            {template}
            {adapter}
            onAddElement={handleAddElement}
            onAddColumn={handleAddColumn}
            onUpdateColumns={handleUpdateColumns}
          />
        {:else}
          <div class="dd-canvas-placeholder">
            <p>Preview lands later in Phase 1.</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  @import './ui/tokens.css';

  :host {
    display: block;
    height: 100%;
    font-family: var(--dd-font);
    font-size: 13px;
    color: var(--dd-text);
    background: var(--dd-bg);
  }

  .dd-root {
    height: 100%;
  }

  .dd-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .dd-toast-slot {
    padding: 8px 12px 0;
  }

  .dd-empty {
    padding: 16px;
  }

  .dd-workspace {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .dd-canvas-placeholder {
    flex: 1;
    padding: 16px;
  }

  .dd-canvas-placeholder p {
    margin: 0;
    color: var(--dd-muted);
  }
</style>
