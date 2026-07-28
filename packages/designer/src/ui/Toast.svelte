<script lang="ts">
  type Variant = 'info' | 'success' | 'error';

  let {
    message,
    variant = 'info',
    onDismiss,
  }: {
    message: string;
    variant?: Variant;
    onDismiss?: () => void;
  } = $props();

  const role = $derived(variant === 'error' ? 'alert' : 'status');
</script>

<div class="dd-toast dd-toast--{variant}" {role} aria-live={variant === 'error' ? 'assertive' : 'polite'}>
  <span class="dd-toast-icon" aria-hidden="true">
    {#if variant === 'error'}
      &#9888;
    {:else if variant === 'success'}
      &#10003;
    {:else}
      &#8505;
    {/if}
  </span>
  <span class="dd-toast-msg">{message}</span>
  {#if onDismiss}
    <button class="dd-toast-close" aria-label="Dismiss notification" onclick={onDismiss}>
      &#10005;
    </button>
  {/if}
</div>

<style>
  .dd-toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--dd-radius);
    border: 1px solid var(--dd-border);
    background: var(--dd-panel);
    color: var(--dd-text);
    box-shadow: var(--dd-shadow);
    font-size: 13px;
  }

  .dd-toast--error {
    border-color: var(--dd-danger);
  }
  .dd-toast--success {
    border-color: var(--dd-ok);
  }
  .dd-toast--info {
    border-color: var(--dd-accent);
  }

  .dd-toast-icon {
    flex: none;
  }

  .dd-toast-msg {
    flex: 1;
  }

  .dd-toast-close {
    flex: none;
    border: none;
    background: transparent;
    color: var(--dd-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: var(--dd-radius);
  }

  .dd-toast-close:hover {
    background: var(--dd-panel-alt);
  }

  .dd-toast-close:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
