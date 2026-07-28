<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from './icons.js';

  let {
    title,
    icon,
    open = $bindable(true),
    children,
  }: {
    title: string;
    icon?: IconName;
    open?: boolean;
    children?: import('svelte').Snippet;
  } = $props();

  const contentId = `dd-collapsible-${crypto.randomUUID()}`;

  function toggle() {
    open = !open;
  }
</script>

<div class="dd-collapsible">
  <button
    class="dd-collapsible-trigger"
    aria-expanded={open}
    aria-controls={contentId}
    onclick={toggle}
  >
    <span class="dd-collapsible-chevron" class:dd-collapsible-chevron--open={open} aria-hidden="true">
      &#9656;
    </span>
    {#if icon}
      <span class="dd-collapsible-icon" aria-hidden="true"><Icon name={icon} size={12} /></span>
    {/if}
    <span class="dd-collapsible-title">{title}</span>
  </button>
  {#if open}
    <div class="dd-collapsible-content" id={contentId}>
      {@render children?.()}
    </div>
  {/if}
</div>

<style>
  .dd-collapsible {
    border-bottom: 1px solid var(--dd-border);
  }

  .dd-collapsible-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 4px;
    background: transparent;
    border: none;
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    cursor: pointer;
  }

  .dd-collapsible-trigger:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-collapsible-chevron {
    display: inline-flex;
    color: var(--dd-muted);
    transition: transform 140ms ease;
  }

  .dd-collapsible-chevron--open {
    transform: rotate(90deg);
  }

  .dd-collapsible-icon {
    display: inline-flex;
    color: var(--dd-accent);
  }

  .dd-collapsible-content {
    padding: 0 4px 8px;
  }

  @media (prefers-reduced-motion: reduce) {
    .dd-collapsible-chevron {
      transition: none;
    }
  }
</style>
