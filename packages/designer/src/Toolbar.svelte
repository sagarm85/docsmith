<script lang="ts">
  import Button from './ui/Button.svelte';

  type Mode = 'design' | 'preview';

  let {
    templateName,
    onNameChange,
    mode,
    onModeChange,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    saving = false,
    onSave,
    exporting = false,
    onExportPdf,
    brand,
  }: {
    templateName: string;
    onNameChange: (name: string) => void;
    mode: Mode;
    onModeChange: (mode: Mode) => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    saving?: boolean;
    onSave: () => void;
    exporting?: boolean;
    onExportPdf?: () => void;
    brand?: import('svelte').Snippet;
  } = $props();

  function handleNameInput(e: Event) {
    onNameChange((e.currentTarget as HTMLInputElement).value);
  }
</script>

<div class="dd-toolbar">
  <div class="dd-toolbar-section dd-toolbar-brand">
    {@render brand?.()}
    <label class="dd-toolbar-name-label" for="dd-template-name">Template name</label>
    <input
      id="dd-template-name"
      class="dd-toolbar-name"
      type="text"
      value={templateName}
      oninput={handleNameInput}
    />
  </div>

  <div class="dd-toolbar-section dd-toolbar-mode" role="group" aria-label="View mode">
    <button
      type="button"
      class="dd-mode-btn"
      class:dd-mode-btn--active={mode === 'design'}
      aria-pressed={mode === 'design'}
      onclick={() => onModeChange('design')}
    >
      Design
    </button>
    <button
      type="button"
      class="dd-mode-btn"
      class:dd-mode-btn--active={mode === 'preview'}
      aria-pressed={mode === 'preview'}
      onclick={() => onModeChange('preview')}
    >
      Preview
    </button>
  </div>

  <div class="dd-toolbar-section dd-toolbar-actions">
    <button
      type="button"
      class="dd-icon-btn"
      aria-label="Undo"
      disabled={!canUndo || !onUndo}
      onclick={onUndo}
    >
      &#8630;
    </button>
    <button
      type="button"
      class="dd-icon-btn"
      aria-label="Redo"
      disabled={!canRedo || !onRedo}
      onclick={onRedo}
    >
      &#8631;
    </button>
    <Button variant="secondary" disabled={saving} onclick={onSave}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
    <Button variant="primary" disabled={!onExportPdf || exporting} onclick={onExportPdf}>
      {exporting ? 'Exporting…' : 'Export PDF'}
    </Button>
  </div>
</div>

<style>
  .dd-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    height: 48px;
    padding: 0 12px;
    border-bottom: 1px solid var(--dd-border);
    background: var(--dd-panel);
  }

  .dd-toolbar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dd-toolbar-brand {
    flex: 1;
    min-width: 0;
  }

  .dd-toolbar-name-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .dd-toolbar-name {
    height: 30px;
    min-width: 160px;
    padding: 0 8px;
    border-radius: var(--dd-radius);
    border: 1px solid transparent;
    background: transparent;
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
  }

  .dd-toolbar-name:hover {
    border-color: var(--dd-border);
  }

  .dd-toolbar-name:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
    border-color: var(--dd-border);
  }

  .dd-toolbar-mode {
    flex: none;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    padding: 2px;
  }

  .dd-mode-btn {
    height: 26px;
    padding: 0 12px;
    border: none;
    border-radius: calc(var(--dd-radius) - 2px);
    background: transparent;
    color: var(--dd-muted);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .dd-mode-btn--active {
    background: var(--dd-accent-weak);
    color: var(--dd-accent);
  }

  .dd-mode-btn:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-toolbar-actions {
    flex: none;
  }

  .dd-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    cursor: pointer;
    font-size: 14px;
  }

  .dd-icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dd-icon-btn:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-icon-btn:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
