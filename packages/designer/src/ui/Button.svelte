<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

  let {
    variant = 'secondary',
    type = 'button',
    disabled = false,
    onclick,
    children,
  }: {
    variant?: Variant;
    type?: 'button' | 'submit';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<button class="dd-btn dd-btn--{variant}" {type} {disabled} {onclick}>
  {@render children?.()}
</button>

<style>
  .dd-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: var(--dd-radius);
    border: 1px solid transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }

  .dd-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dd-btn:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-btn--primary {
    background: var(--dd-accent);
    color: #fff;
  }
  .dd-btn--primary:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .dd-btn--secondary {
    background: var(--dd-panel);
    border-color: var(--dd-border);
    color: var(--dd-text);
  }
  .dd-btn--secondary:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-btn--ghost {
    background: transparent;
    color: var(--dd-text);
  }
  .dd-btn--ghost:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }

  .dd-btn--destructive {
    background: transparent;
    color: var(--dd-danger);
  }
  .dd-btn--destructive:hover:not(:disabled) {
    background: var(--dd-panel-alt);
  }
</style>
