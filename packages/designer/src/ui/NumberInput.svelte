<script lang="ts">
  let {
    value = $bindable(0),
    min,
    max,
    step = 1,
    ariaLabel,
    id,
    disabled = false,
    onchange,
  }: {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    ariaLabel: string;
    id?: string;
    disabled?: boolean;
    onchange?: (value: number) => void;
  } = $props();

  function clamp(n: number): number {
    let out = n;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  }

  function handleChange(e: Event) {
    const raw = Number((e.currentTarget as HTMLInputElement).value);
    const next = clamp(Number.isFinite(raw) ? raw : 0);
    value = next;
    onchange?.(next);
  }
</script>

<input
  class="dd-number"
  type="number"
  aria-label={ariaLabel}
  {id}
  {min}
  {max}
  {step}
  {disabled}
  {value}
  onchange={handleChange}
/>

<style>
  .dd-number {
    height: 30px;
    width: 100%;
    padding: 0 8px;
    border-radius: var(--dd-radius);
    border: 1px solid var(--dd-border);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
  }

  .dd-number:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dd-number:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
