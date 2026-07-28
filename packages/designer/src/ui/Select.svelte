<script lang="ts">
  type Option = { value: string; label: string };

  let {
    options,
    value = $bindable(''),
    ariaLabel,
    id,
    disabled = false,
    onchange,
  }: {
    options: Option[];
    value?: string;
    ariaLabel: string;
    id?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  } = $props();

  function handleChange(e: Event) {
    const next = (e.currentTarget as HTMLSelectElement).value;
    value = next;
    onchange?.(next);
  }
</script>

<select class="dd-select" aria-label={ariaLabel} {id} {disabled} {value} onchange={handleChange}>
  {#each options as opt (opt.value)}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>

<style>
  .dd-select {
    height: 30px;
    padding: 0 8px;
    border-radius: var(--dd-radius);
    border: 1px solid var(--dd-border);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
  }

  .dd-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dd-select:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
