<script lang="ts">
  let {
    label,
    hint,
    error,
    fieldId,
    children,
  }: {
    label: string;
    hint?: string;
    error?: string;
    fieldId: string;
    children?: import('svelte').Snippet;
  } = $props();

  const hintId = $derived(hint ? `${fieldId}-hint` : undefined);
  const errorId = $derived(error ? `${fieldId}-error` : undefined);
  const describedBy = $derived([hintId, errorId].filter(Boolean).join(' ') || undefined);
</script>

<div class="dd-field">
  <label class="dd-field-label" for={fieldId}>{label}</label>
  <div class="dd-field-control" aria-describedby={describedBy}>
    {@render children?.()}
  </div>
  {#if hint && !error}
    <p class="dd-field-hint" id={hintId}>{hint}</p>
  {/if}
  {#if error}
    <p class="dd-field-error" id={errorId} role="alert">{error}</p>
  {/if}
</div>

<style>
  .dd-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dd-field-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--dd-muted);
  }

  .dd-field-hint {
    font-size: 11px;
    color: var(--dd-muted);
    margin: 0;
  }

  .dd-field-error {
    font-size: 11px;
    color: var(--dd-danger);
    margin: 0;
  }
</style>
