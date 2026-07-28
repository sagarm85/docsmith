<script lang="ts">
  import type { Orientation, PageSize, PrintSetup } from '@docsmith/core';
  import Select from './ui/Select.svelte';
  import NumberInput from './ui/NumberInput.svelte';
  import Field from './ui/Field.svelte';
  import Icon from './ui/Icon.svelte';

  let {
    printSetup,
    onPrintSetupChange,
    keepRowTogether,
    onKeepRowTogetherChange,
    pageHeaderEnabled,
    onPageHeaderToggle,
    pageFooterEnabled,
    onPageFooterToggle,
  }: {
    printSetup: PrintSetup;
    onPrintSetupChange: (next: PrintSetup) => void;
    keepRowTogether: boolean;
    onKeepRowTogetherChange: (next: boolean) => void;
    /** Whether the `pageHeader`/`pageFooter` bands actually render (their own
     * `enabled` flag — see design.md's note on this in memory.md/progress.md:
     * `printSetup.repeatPageHeader/Footer` is never read by core.renderToHtml
     * or the render service, so this toggle controls the real switch instead
     * of writing to those inert fields). */
    pageHeaderEnabled: boolean;
    onPageHeaderToggle: (enabled: boolean) => void;
    pageFooterEnabled: boolean;
    onPageFooterToggle: (enabled: boolean) => void;
  } = $props();

  const PAGE_SIZE_OPTIONS = [
    { value: 'A4', label: 'A4' },
    { value: 'Letter', label: 'Letter' },
    { value: 'A5', label: 'A5' },
    { value: 'Legal', label: 'Legal' },
  ];
  const ORIENTATION_OPTIONS = [
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
  ];

  function patch(next: Partial<PrintSetup>) {
    onPrintSetupChange({ ...printSetup, ...next });
  }
</script>

<section class="dd-print-setup" aria-label="Print setup">
  <Field label="Page size" fieldId="dd-page-size">
    <Select
      id="dd-page-size"
      ariaLabel="Page size"
      value={printSetup.pageSize}
      options={PAGE_SIZE_OPTIONS}
      onchange={(v) => patch({ pageSize: v as PageSize })}
    />
  </Field>

  <Field label="Orientation" fieldId="dd-orientation">
    <Select
      id="dd-orientation"
      ariaLabel="Orientation"
      value={printSetup.orientation}
      options={ORIENTATION_OPTIONS}
      onchange={(v) => patch({ orientation: v as Orientation })}
    />
  </Field>

  <fieldset class="dd-margins-group">
    <legend><Icon name="margins" size={11} />Margins (mm)</legend>
    <Field label="Top" fieldId="dd-margin-top">
      <NumberInput
        id="dd-margin-top"
        ariaLabel="Top margin (mm)"
        min={0}
        max={100}
        value={printSetup.margins.top}
        onchange={(v) => patch({ margins: { ...printSetup.margins, top: v } })}
      />
    </Field>
    <Field label="Right" fieldId="dd-margin-right">
      <NumberInput
        id="dd-margin-right"
        ariaLabel="Right margin (mm)"
        min={0}
        max={100}
        value={printSetup.margins.right}
        onchange={(v) => patch({ margins: { ...printSetup.margins, right: v } })}
      />
    </Field>
    <Field label="Bottom" fieldId="dd-margin-bottom">
      <NumberInput
        id="dd-margin-bottom"
        ariaLabel="Bottom margin (mm)"
        min={0}
        max={100}
        value={printSetup.margins.bottom}
        onchange={(v) => patch({ margins: { ...printSetup.margins, bottom: v } })}
      />
    </Field>
    <Field label="Left" fieldId="dd-margin-left">
      <NumberInput
        id="dd-margin-left"
        ariaLabel="Left margin (mm)"
        min={0}
        max={100}
        value={printSetup.margins.left}
        onchange={(v) => patch({ margins: { ...printSetup.margins, left: v } })}
      />
    </Field>
  </fieldset>

  <fieldset class="dd-toggle-group">
    <legend><Icon name="repeat" size={11} />Print behaviour</legend>
    <label class="dd-toggle">
      <input
        type="checkbox"
        checked={pageHeaderEnabled}
        onchange={(e) => onPageHeaderToggle((e.currentTarget as HTMLInputElement).checked)}
      />
      Repeat page header
    </label>
    <label class="dd-toggle">
      <input
        type="checkbox"
        checked={pageFooterEnabled}
        onchange={(e) => onPageFooterToggle((e.currentTarget as HTMLInputElement).checked)}
      />
      Repeat page footer
    </label>
    <label class="dd-toggle">
      <input
        type="checkbox"
        checked={printSetup.showPageNumbers ?? false}
        onchange={(e) => patch({ showPageNumbers: (e.currentTarget as HTMLInputElement).checked })}
      />
      Show page numbers
    </label>
    <label class="dd-toggle">
      <input
        type="checkbox"
        checked={keepRowTogether}
        onchange={(e) => onKeepRowTogetherChange((e.currentTarget as HTMLInputElement).checked)}
      />
      Keep line rows together
    </label>
  </fieldset>
</section>

<style>
  .dd-print-setup {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .dd-margins-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    padding: 8px;
    margin: 0;
  }

  .dd-margins-group legend {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--dd-muted);
    padding: 0 4px;
  }

  .dd-toggle-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--dd-border);
    border-radius: var(--dd-radius);
    padding: 8px;
    margin: 0;
  }

  .dd-toggle-group legend {
    display: flex;
    align-items: center;
    gap: 5px;
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

  .dd-toggle input:focus-visible {
    outline: 2px solid var(--dd-accent);
    outline-offset: 2px;
  }
</style>
