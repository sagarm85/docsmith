<script lang="ts">
  import Icon from './ui/Icon.svelte';

  const BRAND_TOKENS: Array<{ key: string; label: string }> = [
    { key: '--dd-accent', label: 'Accent' },
    { key: '--dd-accent-strong', label: 'Accent (strong)' },
    { key: '--dd-accent-weak', label: 'Accent (weak)' },
    { key: '--dd-bg', label: 'Background' },
  ];
  const DEFAULTS: Record<string, string> = {
    '--dd-accent': '#2563eb',
    '--dd-accent-strong': '#1d4ed8',
    '--dd-accent-weak': '#dde9ff',
    '--dd-bg': '#f2f4f8',
  };

  let {
    activeTheme,
    themes,
    disabled = false,
    onTokenChange,
    onSaveCurrent,
    onApply,
    onDelete,
    onReset,
  }: {
    /** Live token overrides currently applied (memory.md D-032) — may be
     * partial/empty (no theme applied yet). */
    activeTheme: Record<string, string>;
    themes: Array<{ id: string; name: string }>;
    /** True when the host supplies `config.theme` directly — it owns
     * branding, so the in-designer editor is disabled rather than fighting
     * over the same tokens (same D-010 "host owns storage" precedent). */
    disabled?: boolean;
    onTokenChange: (key: string, value: string) => void;
    onSaveCurrent: (name: string) => void;
    onApply: (id: string) => void;
    onDelete: (id: string) => void;
    onReset: () => void;
  } = $props();

  let open = $state(false);
  let newName = $state('');
  let triggerEl = $state<HTMLButtonElement | undefined>();
  let panelEl = $state<HTMLDivElement | undefined>();

  function toggle() {
    if (disabled) return;
    open = !open;
  }

  function close() {
    open = false;
    triggerEl?.focus();
  }

  function handleSave() {
    const name = newName.trim();
    if (!name) return;
    onSaveCurrent(name);
    newName = '';
  }

  function handleApply(id: string) {
    onApply(id);
    close();
  }

  function handleDelete(e: MouseEvent, id: string) {
    e.stopPropagation();
    onDelete(id);
  }

  // Shadow-DOM-safe "click outside to close" — see memory.md D-022:
  // composedPath(), never event.target, since target gets retargeted to the
  // shadow host once an event crosses the shadow boundary.
  function handleWindowClick(e: MouseEvent) {
    if (!open) return;
    const path = e.composedPath();
    if ((triggerEl && path.includes(triggerEl)) || (panelEl && path.includes(panelEl))) return;
    open = false;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="dd-theme-list">
  <button
    type="button"
    class="dd-theme-list-trigger"
    bind:this={triggerEl}
    {disabled}
    aria-haspopup="true"
    aria-expanded={open}
    aria-label="Brand theme"
    title={disabled ? 'Theme editor unavailable — this host manages branding' : undefined}
    onclick={toggle}
  >
    <Icon name="palette" size={13} />
    Theme
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="dd-theme-list-popover"
      bind:this={panelEl}
      role="group"
      aria-label="Brand theme"
      onkeydown={(e) => e.key === 'Escape' && close()}
    >
      <h4 class="dd-theme-section-title">Brand colors</h4>
      {#each BRAND_TOKENS as token (token.key)}
        <label class="dd-theme-token-row">
          <span>{token.label}</span>
          <input
            type="color"
            aria-label={token.label}
            value={activeTheme[token.key] ?? DEFAULTS[token.key]}
            oninput={(e) => onTokenChange(token.key, (e.currentTarget as HTMLInputElement).value)}
          />
        </label>
      {/each}
      <button type="button" class="dd-theme-reset" onclick={onReset}>Reset to default</button>

      <div class="dd-theme-save-row">
        <input
          type="text"
          class="dd-theme-name-input"
          placeholder="Theme name…"
          aria-label="New theme name"
          bind:value={newName}
        />
        <button type="button" class="dd-theme-save" onclick={handleSave} disabled={!newName.trim()}>
          Save
        </button>
      </div>

      <h4 class="dd-theme-section-title">Saved themes</h4>
      {#if themes.length === 0}
        <p class="dd-theme-empty">No saved themes yet.</p>
      {:else}
        <ul class="dd-theme-items">
          {#each themes as t (t.id)}
            <li class="dd-theme-item">
              <button type="button" class="dd-theme-apply" onclick={() => handleApply(t.id)}>
                {t.name}
              </button>
              <button
                type="button"
                class="dd-theme-delete"
                aria-label={`Delete ${t.name}`}
                onclick={(e) => handleDelete(e, t.id)}
              >
                &#10005;
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dd-theme-list {
    position: relative;
  }

  .dd-theme-list-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .dd-theme-list-trigger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dd-theme-list-trigger:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-theme-list-trigger:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-theme-list-popover {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 240px;
    max-height: 340px;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    box-shadow: var(--dd-shadow);
    z-index: 10;
  }

  .dd-theme-section-title {
    margin: 4px 0 0;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--dd-muted);
  }

  .dd-theme-token-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--dd-text);
  }

  .dd-theme-reset {
    align-self: flex-start;
    border: none;
    background: transparent;
    color: var(--dd-muted);
    font-size: 11px;
    text-decoration: underline;
    cursor: pointer;
    padding: 2px 0;
  }

  .dd-theme-reset:hover {
    color: var(--dd-text);
  }

  .dd-theme-save-row {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }

  .dd-theme-name-input {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel-alt);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
  }

  .dd-theme-save {
    flex: none;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel);
    color: var(--dd-text);
    font-size: 12px;
    cursor: pointer;
  }

  .dd-theme-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dd-theme-save:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-theme-empty {
    margin: 0;
    font-size: 12px;
    color: var(--dd-muted);
  }

  .dd-theme-items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dd-theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    border-radius: 4px;
  }

  .dd-theme-item:hover {
    background: var(--dd-panel-alt);
  }

  .dd-theme-apply {
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 6px 8px;
    border: none;
    background: transparent;
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dd-theme-delete {
    flex: none;
    border: none;
    background: transparent;
    color: var(--dd-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 8px;
  }

  .dd-theme-delete:hover {
    color: var(--dd-danger);
  }

  .dd-theme-delete:focus-visible,
  .dd-theme-apply:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }
</style>
