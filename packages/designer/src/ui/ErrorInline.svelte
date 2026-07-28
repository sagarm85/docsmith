<script lang="ts">
  let {
    message,
    onRetry,
  }: {
    message: string;
    onRetry?: () => void;
  } = $props();
</script>

<div class="dd-error-inline" role="alert">
  <span class="dd-error-icon" aria-hidden="true">&#9888;</span>
  <span class="dd-error-msg">{message}</span>
  {#if onRetry}
    <button class="dd-error-retry" onclick={onRetry}>Retry</button>
  {/if}
</div>

<style>
  .dd-error-inline {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--dd-radius);
    border: 1px solid var(--dd-danger);
    background: var(--dd-panel);
    color: var(--dd-danger);
    font-size: 13px;
  }

  .dd-error-msg {
    flex: 1;
    color: var(--dd-text);
  }

  .dd-error-retry {
    flex: none;
    border: 1px solid var(--dd-border);
    background: var(--dd-panel);
    color: var(--dd-text);
    border-radius: var(--dd-radius);
    padding: 3px 10px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .dd-error-retry:hover {
    background: var(--dd-panel-alt);
  }

  .dd-error-retry:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
