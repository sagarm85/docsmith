<script lang="ts">
  import type { Align, FreeElement, ValueFormat } from '@docsmith/core';
  import Field from './ui/Field.svelte';
  import NumberInput from './ui/NumberInput.svelte';
  import Select from './ui/Select.svelte';
  import Button from './ui/Button.svelte';
  import Icon from './ui/Icon.svelte';
  import type { IconName } from './ui/icons.js';
  import ConditionalRulesEditor from './ConditionalRulesEditor.svelte';

  const ELEMENT_ICON: Record<FreeElement['kind'], IconName> = {
    field: 'field',
    text: 'text',
    image: 'image',
    line: 'line',
    box: 'box',
  };

  let {
    element,
    unit = 'px',
    arrangement = 'free',
    onChange,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBack,
  }: {
    element: FreeElement;
    /** Template-global layout unit (memory.md D-028) — changes the Position/
     * Size field labels and numeric ranges; the values themselves are always
     * already in this unit (DocDesigner converts the whole template up front
     * when the unit toggles, so this component never converts anything). */
    unit?: 'px' | '%';
    /** The containing band's arrangement (memory.md D-029, D-034). 'stack'
     * and 'grid' both hide X/Y (position is row/cell, not coordinates) and
     * z-order (reordering is the drag-handle in StackBand.svelte / cell
     * position in GridBand.svelte, not bring-forward/send-back — "forward/
     * back" doesn't have a meaning without overlap to resolve). Width is
     * always a row percentage in 'stack'; in 'grid', width comes from the
     * band's `gridColumns` + this element's `colSpan`, never set directly. */
    arrangement?: 'free' | 'stack' | 'grid';
    onChange: (patch: Partial<FreeElement>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onBringForward: () => void;
    onSendBack: () => void;
  } = $props();

  const posMax = $derived(unit === '%' ? 100 : undefined);
  const posStep = $derived(unit === '%' ? 0.5 : 1);

  const FORMAT_OPTIONS = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' },
    { value: 'date', label: 'Date' },
    { value: 'words', label: 'Words (e.g. amount in words)' },
  ];
  const ALIGN_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  function patchStyle(patch: Partial<NonNullable<FreeElement['style']>>) {
    onChange({ style: { ...element.style, ...patch } });
  }
</script>

<div class="dd-element-props">
  <h3 class="dd-props-title"><Icon name={ELEMENT_ICON[element.kind]} size={13} />{element.kind} element</h3>

  {#if arrangement === 'stack'}
    <fieldset class="dd-props-grid">
      <legend>Row width (%)</legend>
      <Field label="Width" fieldId="dd-el-w">
        <NumberInput id="dd-el-w" ariaLabel="Width" min={5} max={100} step={5} value={element.w} onchange={(v) => onChange({ w: v })} />
      </Field>
      {#if element.kind !== 'text' && element.kind !== 'field'}
        <Field label="Height (px)" fieldId="dd-el-h">
          <NumberInput id="dd-el-h" ariaLabel="Height" min={1} value={element.h} onchange={(v) => onChange({ h: v })} />
        </Field>
      {/if}
    </fieldset>
  {:else if arrangement === 'grid'}
    <fieldset class="dd-props-grid">
      <legend>Cell</legend>
      <Field label="Column span" fieldId="dd-el-colspan">
        <NumberInput
          id="dd-el-colspan"
          ariaLabel="Column span"
          min={1}
          max={12}
          value={element.colSpan ?? 1}
          onchange={(v) => onChange({ colSpan: v })}
        />
      </Field>
    </fieldset>
  {:else}
    <fieldset class="dd-props-grid">
      <legend>Position ({unit})</legend>
      <Field label="X" fieldId="dd-el-x">
        <NumberInput id="dd-el-x" ariaLabel="X position" min={0} max={posMax} step={posStep} value={element.x} onchange={(v) => onChange({ x: v })} />
      </Field>
      <Field label="Y" fieldId="dd-el-y">
        <NumberInput id="dd-el-y" ariaLabel="Y position" min={0} max={posMax} step={posStep} value={element.y} onchange={(v) => onChange({ y: v })} />
      </Field>
      <Field label="Width" fieldId="dd-el-w">
        <NumberInput id="dd-el-w" ariaLabel="Width" min={unit === '%' ? 0.5 : 1} max={posMax} step={posStep} value={element.w} onchange={(v) => onChange({ w: v })} />
      </Field>
      <Field label="Height" fieldId="dd-el-h">
        <NumberInput id="dd-el-h" ariaLabel="Height" min={unit === '%' ? 0.5 : 1} max={posMax} step={posStep} value={element.h} onchange={(v) => onChange({ h: v })} />
      </Field>
    </fieldset>
  {/if}

  {#if element.kind === 'text' || element.kind === 'field'}
    <fieldset class="dd-props-grid">
      <legend>Typography</legend>
      <Field label="Size" fieldId="dd-el-fontsize">
        <NumberInput
          id="dd-el-fontsize"
          ariaLabel="Font size"
          min={6}
          max={96}
          value={element.style?.fontSize ?? 12}
          onchange={(v) => patchStyle({ fontSize: v })}
        />
      </Field>
      <Field label="Align" fieldId="dd-el-align">
        <Select
          id="dd-el-align"
          ariaLabel="Text align"
          value={element.style?.align ?? 'left'}
          options={ALIGN_OPTIONS}
          onchange={(v) => patchStyle({ align: v as Align })}
        />
      </Field>
    </fieldset>
    <label class="dd-toggle">
      <input
        type="checkbox"
        checked={element.style?.bold ?? false}
        onchange={(e) => patchStyle({ bold: (e.currentTarget as HTMLInputElement).checked })}
      />
      Bold
    </label>
    <label class="dd-toggle">
      <input
        type="checkbox"
        checked={element.style?.italic ?? false}
        onchange={(e) => patchStyle({ italic: (e.currentTarget as HTMLInputElement).checked })}
      />
      Italic
    </label>
    <Field label="Color" fieldId="dd-el-color">
      <input
        id="dd-el-color"
        type="color"
        value={element.style?.color ?? '#111111'}
        oninput={(e) => patchStyle({ color: (e.currentTarget as HTMLInputElement).value })}
      />
    </Field>
  {/if}

  {#if element.kind === 'text'}
    <Field label="Text" fieldId="dd-el-text">
      <textarea
        id="dd-el-text"
        class="dd-el-textarea"
        value={element.text ?? ''}
        oninput={(e) => onChange({ text: (e.currentTarget as HTMLTextAreaElement).value })}
      ></textarea>
    </Field>
  {/if}

  {#if element.kind === 'field'}
    <Field label="Format" fieldId="dd-el-format">
      <Select
        id="dd-el-format"
        ariaLabel="Field format"
        value={element.binding?.format ?? 'text'}
        options={FORMAT_OPTIONS}
        onchange={(v) =>
          onChange({
            binding: element.binding
              ? { ...element.binding, format: v as ValueFormat }
              : undefined,
          })}
      />
    </Field>

    <ConditionalRulesEditor
      rules={element.conditionalFormat ?? []}
      onChange={(rules) => onChange({ conditionalFormat: rules })}
    />
  {/if}

  {#if element.kind === 'image'}
    <Field label="Image URL" fieldId="dd-el-src">
      <input
        id="dd-el-src"
        class="dd-el-text-input"
        type="text"
        placeholder="https://…"
        value={element.src?.value ?? ''}
        oninput={(e) =>
          onChange({ src: { kind: 'url', value: (e.currentTarget as HTMLInputElement).value } })}
      />
    </Field>
  {/if}

  {#if element.kind === 'box'}
    <Field label="Background" fieldId="dd-el-bg">
      <input
        id="dd-el-bg"
        type="color"
        value={element.style?.bg ?? '#ffffff'}
        oninput={(e) => patchStyle({ bg: (e.currentTarget as HTMLInputElement).value })}
      />
    </Field>
    <Field label="Corner radius (px)" fieldId="dd-el-radius">
      <NumberInput
        id="dd-el-radius"
        ariaLabel="Corner radius"
        min={0}
        max={999}
        value={typeof element.style?.borderRadius === 'number' ? element.style.borderRadius : 0}
        onchange={(v) => patchStyle({ borderRadius: v })}
      />
    </Field>
  {/if}

  {#if arrangement === 'free'}
    <div class="dd-props-actions">
      <Button variant="secondary" onclick={onSendBack}>Send Back [</Button>
      <Button variant="secondary" onclick={onBringForward}>Bring Forward ]</Button>
    </div>
  {/if}
  <div class="dd-props-actions">
    <Button variant="secondary" onclick={onDuplicate}>Duplicate ⌘D</Button>
    <Button variant="destructive" onclick={onDelete}>Delete</Button>
  </div>
</div>

<style>
  .dd-element-props {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }

  .dd-props-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    color: var(--dd-text);
  }

  .dd-props-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    padding: 8px;
    margin: 0;
  }

  .dd-props-grid legend {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--dd-muted);
    padding: 0 4px;
  }

  .dd-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--dd-text);
  }

  .dd-toggle input {
    accent-color: var(--dd-accent);
  }

  .dd-el-textarea {
    width: 100%;
    min-height: 60px;
    padding: 6px 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
    resize: vertical;
  }

  .dd-el-text-input {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 12px;
  }

  .dd-props-actions {
    display: flex;
    gap: 8px;
  }

  .dd-props-actions :global(button) {
    flex: 1;
  }
</style>
