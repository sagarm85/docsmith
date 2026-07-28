import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { newTemplate } from '@docsmith/core';
import PrintSetup from './PrintSetup.svelte';

function setup(
  overrides: Partial<{
    keepRowTogether: boolean;
    pageHeaderEnabled: boolean;
    pageFooterEnabled: boolean;
    layoutUnit: 'px' | '%';
  }> = {},
) {
  const template = newTemplate('invoice', 'invoice');
  const onPrintSetupChange = vi.fn();
  const onKeepRowTogetherChange = vi.fn();
  const onPageHeaderToggle = vi.fn();
  const onPageFooterToggle = vi.fn();
  const onLayoutUnitChange = vi.fn();
  render(PrintSetup, {
    props: {
      printSetup: template.printSetup,
      onPrintSetupChange,
      keepRowTogether: overrides.keepRowTogether ?? true,
      onKeepRowTogetherChange,
      pageHeaderEnabled: overrides.pageHeaderEnabled ?? false,
      onPageHeaderToggle,
      pageFooterEnabled: overrides.pageFooterEnabled ?? false,
      onPageFooterToggle,
      layoutUnit: overrides.layoutUnit ?? 'px',
      onLayoutUnitChange,
    },
  });
  return {
    template,
    onPrintSetupChange,
    onKeepRowTogetherChange,
    onPageHeaderToggle,
    onPageFooterToggle,
    onLayoutUnitChange,
  };
}

describe('PrintSetup', () => {
  it('changing page size patches printSetup without touching other fields', async () => {
    const { template, onPrintSetupChange } = setup();
    await fireEvent.change(screen.getByLabelText('Page size'), { target: { value: 'Letter' } });
    expect(onPrintSetupChange).toHaveBeenCalledWith({ ...template.printSetup, pageSize: 'Letter' });
  });

  it('changing orientation patches printSetup', async () => {
    const { template, onPrintSetupChange } = setup();
    await fireEvent.change(screen.getByLabelText('Orientation'), { target: { value: 'landscape' } });
    expect(onPrintSetupChange).toHaveBeenCalledWith({
      ...template.printSetup,
      orientation: 'landscape',
    });
  });

  it('changing a margin patches only that margin', async () => {
    const { template, onPrintSetupChange } = setup();
    await fireEvent.change(screen.getByLabelText('Top margin (mm)'), { target: { value: '30' } });
    expect(onPrintSetupChange).toHaveBeenCalledWith({
      ...template.printSetup,
      margins: { ...template.printSetup.margins, top: 30 },
    });
  });

  it('defaults locale/currency to en-US/USD and patches printSetup on change', async () => {
    const { template, onPrintSetupChange } = setup();
    expect((screen.getByLabelText('Locale') as HTMLSelectElement).value).toBe('en-US');
    expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('USD');

    await fireEvent.change(screen.getByLabelText('Locale'), { target: { value: 'en-IN' } });
    expect(onPrintSetupChange).toHaveBeenCalledWith({ ...template.printSetup, locale: 'en-IN' });

    await fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'INR' } });
    expect(onPrintSetupChange).toHaveBeenCalledWith({ ...template.printSetup, currency: 'INR' });
  });

  it('toggles showPageNumbers via printSetup', async () => {
    // core's newTemplate() default is showPageNumbers: true, so a click unchecks it.
    const { template, onPrintSetupChange } = setup();
    expect(template.printSetup.showPageNumbers).toBe(true);
    await fireEvent.click(screen.getByLabelText('Show page numbers'));
    expect(onPrintSetupChange).toHaveBeenCalledWith({ ...template.printSetup, showPageNumbers: false });
  });

  it('defaults the layout-unit select to "Fixed (px)"', () => {
    setup();
    const select = screen.getByLabelText('Element position/size unit') as HTMLSelectElement;
    expect(select.value).toBe('px');
  });

  it('calls onLayoutUnitChange with "%" when switched to Relative', async () => {
    const { onLayoutUnitChange } = setup();
    await fireEvent.change(screen.getByLabelText('Element position/size unit'), {
      target: { value: '%' },
    });
    expect(onLayoutUnitChange).toHaveBeenCalledWith('%');
  });

  it('"Repeat page header/footer" calls onPageHeaderToggle/onPageFooterToggle, NOT onPrintSetupChange', async () => {
    // These toggles used to write to printSetup.repeatPageHeader/Footer, fields
    // neither core.renderToHtml nor the render service ever read — a functionally
    // inert control. They now drive the actual pageHeader/pageFooter band's
    // `enabled` flag instead (see memory.md/progress.md).
    const { onPageHeaderToggle, onPageFooterToggle, onPrintSetupChange } = setup();
    await fireEvent.click(screen.getByLabelText('Repeat page header'));
    expect(onPageHeaderToggle).toHaveBeenCalledWith(true);
    await fireEvent.click(screen.getByLabelText('Repeat page footer'));
    expect(onPageFooterToggle).toHaveBeenCalledWith(true);
    expect(onPrintSetupChange).not.toHaveBeenCalled();
  });

  it('reflects the current pageHeader/pageFooter enabled state', () => {
    setup({ pageHeaderEnabled: true, pageFooterEnabled: false });
    expect((screen.getByLabelText('Repeat page header') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Repeat page footer') as HTMLInputElement).checked).toBe(false);
  });

  it('toggles keep-rows-together independently of printSetup', async () => {
    const { onKeepRowTogetherChange, onPrintSetupChange } = setup({ keepRowTogether: true });
    await fireEvent.click(screen.getByLabelText('Keep line rows together'));
    expect(onKeepRowTogetherChange).toHaveBeenCalledWith(false);
    expect(onPrintSetupChange).not.toHaveBeenCalled();
  });
});
