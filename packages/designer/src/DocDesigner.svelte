<svelte:options customElement={{ tag: 'doc-designer', shadow: 'open' }} />

<script lang="ts">
  import type { Template } from '@docsmith/core';
  import type { DocDesignerConfig } from './types.js';
  import ErrorInline from './ui/ErrorInline.svelte';

  let { config }: { config?: DocDesignerConfig } = $props();

  // Seed once from the initial config; `template` is independent mutable state
  // afterward (see getTemplate/setTemplate below), so we deliberately don't want
  // this to track later `config` changes.
  // svelte-ignore state_referenced_locally
  let template = $state<Template | null>(config?.template ?? null);

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

  export function getTemplate(): Template | null {
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
    <div class="dd-scaffold">
      <p>
        DocSmith designer — Phase 0 scaffold mounted against a live adapter. Toolbar,
        Palette, and Canvas land in Phase 1.
      </p>
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

  .dd-empty,
  .dd-scaffold {
    padding: 16px;
  }

  .dd-scaffold p {
    margin: 0;
    color: var(--dd-muted);
  }
</style>
