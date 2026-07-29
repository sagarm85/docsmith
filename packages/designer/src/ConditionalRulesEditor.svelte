<script lang="ts">
  import type { ConditionalRule, ConditionOperator } from '@docsmith/core';
  import Select from './ui/Select.svelte';
  import Icon from './ui/Icon.svelte';

  let {
    rules = [],
    onChange,
  }: {
    rules?: ConditionalRule[];
    /** Replaces the whole rules array per edit — same "whole collection"
     * pattern as onUpdateColumns/onUpdateElements elsewhere (memory.md D-031). */
    onChange: (rules: ConditionalRule[]) => void;
  } = $props();

  const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string }> = [
    { value: 'eq', label: 'is equal to' },
    { value: 'neq', label: 'is not equal to' },
    { value: 'gt', label: 'is greater than' },
    { value: 'gte', label: 'is greater than or equal to' },
    { value: 'lt', label: 'is less than' },
    { value: 'lte', label: 'is less than or equal to' },
    { value: 'contains', label: 'contains' },
    { value: 'empty', label: 'is empty' },
    { value: 'notEmpty', label: 'is not empty' },
  ];

  const NUMERIC_OPERATORS = new Set<ConditionOperator>(['gt', 'gte', 'lt', 'lte']);

  function needsValue(op: ConditionOperator): boolean {
    return op !== 'empty' && op !== 'notEmpty';
  }

  function updateRule(index: number, patch: Partial<ConditionalRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateRuleStyle(index: number, patch: Partial<ConditionalRule['style']>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, style: { ...r.style, ...patch } } : r)));
  }

  function addRule() {
    onChange([...rules, { operator: 'gt', value: 0, style: { bold: true } }]);
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }

  function handleValueInput(index: number, raw: string, operator: ConditionOperator) {
    updateRule(index, { value: NUMERIC_OPERATORS.has(operator) ? Number(raw) || 0 : raw });
  }
</script>

<div class="dd-cond-rules">
  <div class="dd-cond-rules-title">
    <Icon name="palette" size={12} />
    Conditional formatting
  </div>
  {#if rules.length === 0}
    <p class="dd-cond-empty">No rules yet — formatting always uses the base style above.</p>
  {/if}
  {#each rules as rule, i (i)}
    <div class="dd-cond-rule">
      <div class="dd-cond-rule-row">
        <Select
          ariaLabel={`Rule ${i + 1} operator`}
          value={rule.operator}
          options={OPERATOR_OPTIONS}
          onchange={(v) => updateRule(i, { operator: v as ConditionOperator })}
        />
        {#if needsValue(rule.operator)}
          <input
            class="dd-cond-value"
            type="text"
            aria-label={`Rule ${i + 1} value`}
            value={rule.value ?? ''}
            oninput={(e) => handleValueInput(i, (e.currentTarget as HTMLInputElement).value, rule.operator)}
          />
        {/if}
        <button
          type="button"
          class="dd-cond-remove"
          aria-label={`Remove rule ${i + 1}`}
          onclick={() => removeRule(i)}
        >
          <Icon name="close" size={11} />
        </button>
      </div>
      <div class="dd-cond-rule-row">
        <label class="dd-cond-swatch-label">
          Text
          <input
            type="color"
            aria-label={`Rule ${i + 1} text color`}
            value={rule.style.color ?? '#111111'}
            oninput={(e) => updateRuleStyle(i, { color: (e.currentTarget as HTMLInputElement).value })}
          />
        </label>
        <label class="dd-cond-swatch-label">
          Background
          <input
            type="color"
            aria-label={`Rule ${i + 1} background color`}
            value={rule.style.bg ?? '#ffffff'}
            oninput={(e) => updateRuleStyle(i, { bg: (e.currentTarget as HTMLInputElement).value })}
          />
        </label>
        <label class="dd-cond-bold-label">
          <input
            type="checkbox"
            aria-label={`Rule ${i + 1} bold`}
            checked={rule.style.bold ?? false}
            onchange={(e) => updateRuleStyle(i, { bold: (e.currentTarget as HTMLInputElement).checked })}
          />
          Bold
        </label>
      </div>
    </div>
  {/each}
  <button type="button" class="dd-cond-add" onclick={addRule}>
    <Icon name="plus" size={12} />
    Add rule
  </button>
</div>

<style>
  .dd-cond-rules {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--dd-border);
  }

  .dd-cond-rules-title {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--dd-muted);
  }

  .dd-cond-empty {
    margin: 0;
    font-size: 11px;
    color: var(--dd-muted);
    font-style: italic;
  }

  .dd-cond-rule {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel-alt);
  }

  .dd-cond-rule-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dd-cond-value {
    flex: 1;
    height: 30px;
    min-width: 0;
    padding: 0 8px;
    border-radius: var(--dd-radius);
    border: 1px solid var(--dd-border);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
  }

  .dd-cond-value:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-cond-remove {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel);
    color: var(--dd-muted);
    cursor: pointer;
  }

  .dd-cond-remove:hover {
    color: var(--dd-danger);
    background: var(--dd-panel-alt);
  }

  .dd-cond-remove:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-cond-swatch-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--dd-muted);
  }

  .dd-cond-bold-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--dd-text);
    margin-left: auto;
  }

  .dd-cond-add {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--dd-border);
    background: var(--dd-panel);
    color: var(--dd-text);
    border-radius: var(--dd-radius-sm);
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
  }

  .dd-cond-add:hover {
    background: var(--dd-panel-alt);
  }

  .dd-cond-add:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
