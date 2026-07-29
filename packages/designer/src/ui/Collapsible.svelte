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
    {#if icon}
      <span class="dd-collapsible-icon" aria-hidden="true"><Icon name={icon} size={14} /></span>
    {/if}
    <span class="dd-collapsible-title">{title}</span>
    <span class="dd-collapsible-chevron" class:dd-collapsible-chevron--open={open} aria-hidden="true">
      <Icon name="chevronDown" size={13} />
    </span>
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
    gap: 10px;
    width: 100%;
    padding: 10px 8px;
    background: transparent;
    border: none;
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--dd-radius-sm);
  }

  .dd-collapsible-trigger:hover {
    background: var(--dd-panel-alt);
  }

  .dd-collapsible-trigger:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: -2px;
  }

  .dd-collapsible-chevron {
    display: inline-flex;
    margin-left: auto;
    color: var(--dd-muted);
    transition: transform 140ms ease;
    transform: rotate(-90deg);
  }

  .dd-collapsible-chevron--open {
    transform: rotate(0deg);
  }

  .dd-collapsible-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 26px;
    height: 26px;
    color: var(--dd-accent);
    background: var(--dd-accent-weak);
    border-radius: var(--dd-radius-sm);
  }

  .dd-collapsible-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dd-collapsible-content {
    padding: 2px 8px 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .dd-collapsible-chevron {
      transition: none;
    }
  }
</style>
