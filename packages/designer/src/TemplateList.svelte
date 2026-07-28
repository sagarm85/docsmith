<script lang="ts">
  let {
    templates,
    currentId,
    disabled = false,
    onSelect,
    onDelete,
    onNew,
  }: {
    templates: Array<{ id: string; name: string }>;
    currentId: string;
    /** True when the host supplies `onSave` — it owns storage, so this browser's
     * localStorage list isn't authoritative and the control is disabled rather
     * than shown with potentially stale/irrelevant entries (memory.md D-010). */
    disabled?: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
  } = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | undefined>();
  let listEl = $state<HTMLUListElement | undefined>();

  function toggle() {
    if (disabled) return;
    open = !open;
  }

  function close() {
    open = false;
    triggerEl?.focus();
  }

  function select(id: string) {
    onSelect(id);
    close();
  }

  function handleDelete(e: MouseEvent, id: string) {
    e.stopPropagation();
    onDelete(id);
  }

  function handleNew() {
    onNew();
    close();
  }

  function handleTriggerKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open = true;
      queueMicrotask(() => {
        (listEl?.querySelector('[role="option"]') as HTMLElement | null)?.focus();
      });
    }
  }

  function handleListKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    const options = Array.from(listEl?.querySelectorAll('[role="option"]') ?? []) as HTMLElement[];
    const i = options.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      options[Math.min(i + 1, options.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      options[Math.max(i - 1, 0)]?.focus();
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (!open) return;
    // `e.target` is unusable here: DocDesigner renders inside a shadow root, and
    // an event that crosses a shadow boundary gets *retargeted* — a window-level
    // listener sees `target` rewritten to the shadow host, not the actual
    // element clicked, so `.contains()` would treat every click (including the
    // trigger's own) as "outside". `composedPath()` returns the real path
    // through the shadow tree, unaffected by retargeting.
    const path = e.composedPath();
    if ((triggerEl && path.includes(triggerEl)) || (listEl && path.includes(listEl))) return;
    open = false;
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="dd-template-list">
  <button
    type="button"
    class="dd-template-list-trigger"
    bind:this={triggerEl}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label="Saved templates"
    title={disabled ? 'Template list unavailable — this host manages template storage' : undefined}
    onclick={toggle}
    onkeydown={handleTriggerKeydown}
  >
    ▾
  </button>

  {#if open}
    <ul
      class="dd-template-list-popover"
      role="listbox"
      aria-label="Saved templates"
      bind:this={listEl}
      onkeydown={handleListKeydown}
    >
      <li>
        <button type="button" class="dd-template-list-new" onclick={handleNew}>+ New template</button>
      </li>
      {#if templates.length === 0}
        <li class="dd-template-list-empty">No saved templates yet.</li>
      {:else}
        {#each templates as t (t.id)}
          <li
            role="option"
            tabindex="-1"
            aria-label={t.name}
            aria-selected={t.id === currentId}
            class="dd-template-list-item"
            class:dd-template-list-item--current={t.id === currentId}
            onclick={() => select(t.id)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(t.id);
              }
            }}
          >
            <span class="dd-template-list-name">{t.name}</span>
            <button
              type="button"
              class="dd-template-list-delete"
              aria-label={`Delete ${t.name}`}
              onclick={(e) => handleDelete(e, t.id)}
            >
              &#10005;
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .dd-template-list {
    position: relative;
  }

  .dd-template-list-trigger {
    height: 30px;
    width: 24px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    cursor: pointer;
    font-size: 11px;
  }

  .dd-template-list-trigger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dd-template-list-trigger:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-template-list-trigger:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-template-list-popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 220px;
    max-height: 260px;
    overflow-y: auto;
    margin: 0;
    padding: 4px;
    list-style: none;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    box-shadow: var(--dd-shadow);
    z-index: 10;
  }

  .dd-template-list-new {
    width: 100%;
    text-align: left;
    padding: 6px 8px;
    border: none;
    background: transparent;
    color: var(--dd-accent);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 4px;
  }

  .dd-template-list-new:hover {
    background: var(--dd-panel-alt);
  }

  .dd-template-list-empty {
    padding: 6px 8px;
    font-size: 12px;
    color: var(--dd-muted);
  }

  .dd-template-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: var(--dd-text);
    cursor: pointer;
  }

  .dd-template-list-item:hover,
  .dd-template-list-item:focus-visible {
    background: var(--dd-panel-alt);
    outline: none;
  }

  .dd-template-list-item--current {
    color: var(--dd-accent);
    font-weight: 600;
  }

  .dd-template-list-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dd-template-list-delete {
    flex: none;
    border: none;
    background: transparent;
    color: var(--dd-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .dd-template-list-delete:hover {
    color: var(--dd-danger);
    background: var(--dd-panel);
  }

  .dd-template-list-delete:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
