<script lang="ts">
  import type { Align, FreeElement, ValueFormat } from '@docsmith/core';
  import Field from './ui/Field.svelte';
  import NumberInput from './ui/NumberInput.svelte';
  import Select from './ui/Select.svelte';
  import Button from './ui/Button.svelte';
  import Icon from './ui/Icon.svelte';
  import Collapsible from './ui/Collapsible.svelte';
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
    contentWidthPx = 0,
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
    /** The real printable page width in px (memory.md D-073) — clamps the
     * typed X/Width fields to the page's actual right edge, the same
     * boundary FreeElement.svelte's drag/resize already respects (D-057).
     * Only X/Width are bounded this way, never Y/Height: a band's height is
     * a minimum that auto-grows to fit content (D-066), so there's no fixed
     * bottom edge to clamp against, same asymmetry FreeElement.svelte's own
     * drag clamp already has. */
    contentWidthPx?: number;
    onChange: (patch: Partial<FreeElement>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onBringForward: () => void;
    onSendBack: () => void;
  } = $props();

  const posMax = $derived(unit === '%' ? 100 : undefined);
  const posStep = $derived(unit === '%' ? 0.5 : 1);

  // Same basis as FreeElement.svelte's maxXBasis (D-057): 100 in '%' mode,
  // the real page content width in 'px' mode. `|| Infinity` only matters if
  // a caller ever fails to pass a real contentWidthPx — never clamps to 0.
  const maxXBasis = $derived(unit === '%' ? 100 : contentWidthPx || Infinity);
  const maxXInput = $derived(
    maxXBasis === Infinity ? undefined : Math.max(0, maxXBasis - element.w),
  );
  const maxWInput = $derived(
    maxXBasis === Infinity ? undefined : Math.max(unit === '%' ? 0.5 : 1, maxXBasis - element.x),
  );

  const FORMAT_OPTIONS = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' },
    { value: 'date', label: 'Date' },
    { value: 'words', label: 'Words (e.g. amount in words)' },
  ];

  // Icon buttons instead of a dropdown (v2 simplification) — same three
  // values design.md/core have always supported, just a visual picker.
  const ALIGN_BUTTONS: Array<{ value: Align; icon: IconName; label: string }> = [
    { value: 'left', icon: 'alignLeft', label: 'Align left' },
    { value: 'center', icon: 'alignCenter', label: 'Align center' },
    { value: 'right', icon: 'alignRight', label: 'Align right' },
  ];

  // Fixed hex values, NOT `var(--dd-*)` tokens (memory.md D-062): these are
  // saved into `element.style.color` — real template DATA, serialized into
  // the template JSON and rendered by core.renderToHtml into a completely
  // separate, standalone HTML document (the Preview iframe's srcdoc, or the
  // exported PDF). That document never defines `--dd-*` (those only exist
  // inside the designer custom element's own shadow root), so
  // color:var(--dd-accent) was silently invalid there and fell back to
  // inherited/default black — the swatch looked right in the Design canvas
  // and wrong everywhere it actually mattered. claude.md's "never a
  // hardcoded hex" rule is about the designer's OWN UI chrome (buttons,
  // panels — real component style blocks that live inside the shadow
  // root); it was mis-applied here to document CONTENT the end user is
  // choosing, which must be portable, resolved, literal CSS the same way
  // the template's own bg/border values already are (see e.g. the
  // reference Invoice (Orange) template's bg: '#f5a13c'). Values match
  // ui/tokens.css's light-mode --dd-text/--dd-accent/--dd-ok/--dd-danger/
  // --dd-warn — chosen once as sensible content-color defaults, not meant
  // to track the designer app's own theme going forward (document color is
  // the author's choice, independent of what theme they happen to be
  // editing in).
  const COLOR_PRESETS: Array<{ value: string; label: string }> = [
    { value: '#14161b', label: 'Default text' },
    { value: '#2563eb', label: 'Accent' },
    { value: '#1a7f37', label: 'Green' },
    { value: '#b3261e', label: 'Red' },
    { value: '#9a6700', label: 'Amber' },
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
    <Collapsible title="Position & layout" icon="layers" open={false}>
      <Field label="Width across columns" fieldId="dd-el-colspan" hint="How many of this section's columns this element spans">
        <NumberInput
          id="dd-el-colspan"
          ariaLabel="Width across columns"
          min={1}
          max={12}
          value={element.colSpan ?? 1}
          onchange={(v) => onChange({ colSpan: v })}
        />
      </Field>
    </Collapsible>
  {:else}
    <fieldset class="dd-props-grid">
      <legend>Position ({unit})</legend>
      <Field label="X" fieldId="dd-el-x">
        <NumberInput id="dd-el-x" ariaLabel="X position" min={0} max={maxXInput} step={posStep} value={element.x} onchange={(v) => onChange({ x: v })} />
      </Field>
      <Field label="Y" fieldId="dd-el-y">
        <NumberInput id="dd-el-y" ariaLabel="Y position" min={0} max={posMax} step={posStep} value={element.y} onchange={(v) => onChange({ y: v })} />
      </Field>
      <Field label="Width" fieldId="dd-el-w">
        <NumberInput id="dd-el-w" ariaLabel="Width" min={unit === '%' ? 0.5 : 1} max={maxWInput} step={posStep} value={element.w} onchange={(v) => onChange({ w: v })} />
      </Field>
      <Field label="Height" fieldId="dd-el-h">
        <NumberInput id="dd-el-h" ariaLabel="Height" min={unit === '%' ? 0.5 : 1} max={posMax} step={posStep} value={element.h} onchange={(v) => onChange({ h: v })} />
      </Field>
    </fieldset>
  {/if}

  {#if element.kind === 'text' || element.kind === 'field'}
    {@const currentAlign = element.style?.align ?? 'left'}
    <div class="dd-group-label">Alignment</div>
    <div class="dd-align-row" role="group" aria-label="Text alignment">
      {#each ALIGN_BUTTONS as btn (btn.value)}
        <button
          type="button"
          class="dd-icon-toggle"
          class:active={currentAlign === btn.value}
          aria-label={btn.label}
          aria-pressed={currentAlign === btn.value}
          title={btn.label}
          onclick={() => patchStyle({ align: btn.value })}
        >
          <Icon name={btn.icon} size={15} />
        </button>
      {/each}
    </div>

    <div class="dd-group-label">Text style</div>
    <div class="dd-style-row">
      <div class="dd-size-stepper">
        <button
          type="button"
          aria-label="Decrease font size"
          onclick={() => patchStyle({ fontSize: Math.max(6, (element.style?.fontSize ?? 12) - 1) })}
        >−</button>
        <input
          class="dd-size-value"
          type="number"
          aria-label="Font size"
          min="6"
          max="96"
          value={element.style?.fontSize ?? 12}
          onchange={(e) => patchStyle({ fontSize: Number((e.currentTarget as HTMLInputElement).value) || 12 })}
        />
        <button
          type="button"
          aria-label="Increase font size"
          onclick={() => patchStyle({ fontSize: Math.min(96, (element.style?.fontSize ?? 12) + 1) })}
        >+</button>
      </div>
      <button
        type="button"
        class="dd-icon-toggle dd-style-toggle dd-style-toggle--bold"
        class:active={element.style?.bold ?? false}
        aria-label="Bold"
        aria-pressed={element.style?.bold ?? false}
        title="Bold"
        onclick={() => patchStyle({ bold: !(element.style?.bold ?? false) })}
      >B</button>
      <button
        type="button"
        class="dd-icon-toggle dd-style-toggle dd-style-toggle--italic"
        class:active={element.style?.italic ?? false}
        aria-label="Italic"
        aria-pressed={element.style?.italic ?? false}
        title="Italic"
        onclick={() => patchStyle({ italic: !(element.style?.italic ?? false) })}
      >I</button>
    </div>

    <div class="dd-group-label">Color</div>
    <div class="dd-swatch-row" role="group" aria-label="Text color">
      {#each COLOR_PRESETS as preset (preset.value)}
        <button
          type="button"
          class="dd-swatch"
          class:active={(element.style?.color ?? '#14161b') === preset.value}
          style="background:{preset.value}"
          aria-label={preset.label}
          aria-pressed={(element.style?.color ?? '#14161b') === preset.value}
          title={preset.label}
          onclick={() => patchStyle({ color: preset.value })}
        ></button>
      {/each}
      <label class="dd-swatch dd-swatch--custom" title="Custom color">
        <Icon name="plus" size={12} />
        <input
          type="color"
          aria-label="Custom color"
          value={element.style?.color?.startsWith('#') ? element.style.color : '#111111'}
          oninput={(e) => patchStyle({ color: (e.currentTarget as HTMLInputElement).value })}
        />
      </label>
    </div>

    <div class="dd-group-label">Background</div>
    <div class="dd-swatch-row" role="group" aria-label="Background color">
      <button
        type="button"
        class="dd-swatch dd-swatch--none"
        class:active={!element.style?.bg}
        aria-label="No fill"
        aria-pressed={!element.style?.bg}
        title="No fill"
        onclick={() => patchStyle({ bg: undefined })}
      ></button>
      {#each COLOR_PRESETS as preset (preset.value)}
        <button
          type="button"
          class="dd-swatch"
          class:active={element.style?.bg === preset.value}
          style="background:{preset.value}"
          aria-label={`${preset.label} background`}
          aria-pressed={element.style?.bg === preset.value}
          title={`${preset.label} background`}
          onclick={() => patchStyle({ bg: preset.value })}
        ></button>
      {/each}
      <label class="dd-swatch dd-swatch--custom" title="Custom background color">
        <Icon name="plus" size={12} />
        <input
          type="color"
          aria-label="Custom background color"
          value={element.style?.bg?.startsWith('#') ? element.style.bg : '#ffffff'}
          oninput={(e) => patchStyle({ bg: (e.currentTarget as HTMLInputElement).value })}
        />
      </label>
    </div>

    <Field label="Corner radius (px)" fieldId="dd-el-text-radius">
      <NumberInput
        id="dd-el-text-radius"
        ariaLabel="Corner radius"
        min={0}
        max={999}
        value={typeof element.style?.borderRadius === 'number' ? element.style.borderRadius : 0}
        onchange={(v) => patchStyle({ borderRadius: v })}
      />
    </Field>

    <Field
      label="Padding (px)"
      fieldId="dd-el-padding"
      hint="Space between the text and its box edges — matters most once a background color is set."
    >
      <NumberInput
        id="dd-el-padding"
        ariaLabel="Padding"
        min={0}
        max={99}
        value={element.style?.padding ?? 0}
        onchange={(v) => patchStyle({ padding: v })}
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
    <Collapsible title="Layer order" icon="layers" open={false}>
      <div class="dd-props-actions">
        <Button variant="secondary" onclick={onSendBack}>
          <span title="Send back (keyboard: [)">Send backward</span>
        </Button>
        <Button variant="secondary" onclick={onBringForward}>
          <span title="Bring forward (keyboard: ])">Bring forward</span>
        </Button>
      </div>
    </Collapsible>
  {/if}
  <div class="dd-props-actions">
    <Button variant="secondary" onclick={onDuplicate}>
      <Icon name="doc" size={13} /> <span title="Duplicate (keyboard: ⌘D)">Duplicate</span>
    </Button>
    <Button variant="destructive" onclick={onDelete}>
      <Icon name="trash" size={13} /> Delete
    </Button>
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

  .dd-group-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--dd-muted);
    margin: 2px 0 -2px;
  }

  .dd-align-row {
    display: flex;
    gap: 6px;
  }

  .dd-icon-toggle {
    flex: 1;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    background: var(--dd-panel);
    color: var(--dd-muted);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
  }

  .dd-icon-toggle:hover {
    background: var(--dd-panel-alt);
  }

  .dd-icon-toggle:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 1px;
  }

  .dd-icon-toggle.active {
    border-color: var(--dd-accent);
    background: var(--dd-accent-weak);
    color: var(--dd-accent-strong);
  }

  .dd-style-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dd-size-stepper {
    flex: 1;
    display: flex;
    align-items: center;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius-sm);
    overflow: hidden;
  }

  .dd-size-stepper button {
    width: 26px;
    height: 32px;
    border: none;
    background: var(--dd-panel-alt);
    color: var(--dd-text);
    font-size: 14px;
    cursor: pointer;
  }

  .dd-size-stepper button:hover {
    background: var(--dd-border);
  }

  .dd-size-value {
    flex: 1;
    min-width: 0;
    height: 32px;
    text-align: center;
    border: none;
    background: var(--dd-panel);
    color: var(--dd-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .dd-size-value::-webkit-outer-spin-button,
  .dd-size-value::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .dd-style-toggle {
    flex: none;
    width: 34px;
  }

  .dd-style-toggle--italic {
    font-style: italic;
  }

  .dd-swatch-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dd-swatch {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--dd-panel);
    box-shadow: 0 0 0 1px var(--dd-border);
    cursor: pointer;
    padding: 0;
  }

  .dd-swatch:hover {
    box-shadow: 0 0 0 1px var(--dd-accent);
  }

  .dd-swatch:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }

  .dd-swatch.active {
    box-shadow: 0 0 0 2px var(--dd-accent);
  }

  .dd-swatch--custom {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--dd-panel-alt);
    color: var(--dd-muted);
    border: 1.5px dashed var(--dd-border);
    box-shadow: none;
  }

  /* "No fill" — a diagonal line through an otherwise blank swatch, the
     standard convention for "transparent/none" in design tools. */
  .dd-swatch--none {
    background: var(--dd-panel);
    background-image: linear-gradient(
      to top right,
      transparent calc(50% - 1px),
      var(--dd-danger),
      transparent calc(50% + 1px)
    );
  }

  .dd-swatch--custom:hover {
    color: var(--dd-accent-strong);
    border-color: var(--dd-accent);
    box-shadow: none;
  }

  .dd-swatch--custom input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
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
