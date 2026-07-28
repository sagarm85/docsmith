import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { newTemplate } from '@docsmith/core';
import PrintSetup from './PrintSetup.svelte';

function setup(overrides: Partial<{ keepRowTogether: boolean }> = {}) {
  const template = newTemplate('invoice', 'invoice');
  const onPrintSetupChange = vi.fn();
  const onKeepRowTogetherChange = vi.fn();
  render(PrintSetup, {
    props: {
      printSetup: template.printSetup,
      onPrintSetupChange,
      keepRowTogether: overrides.keepRowTogether ?? true,
      onKeepRowTogetherChange,
    },
  });
  return { template, onPrintSetupChange, onKeepRowTogetherChange };
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

  it('toggles repeatPageHeader/repeatPageFooter/showPageNumbers', async () => {
    const { template, onPrintSetupChange } = setup();
    await fireEvent.click(screen.getByLabelText('Repeat page header'));
    expect(onPrintSetupChange).toHaveBeenCalledWith({ ...template.printSetup, repeatPageHeader: true });
  });

  it('toggles keep-rows-together independently of printSetup', async () => {
    const { onKeepRowTogetherChange, onPrintSetupChange } = setup({ keepRowTogether: true });
    await fireEvent.click(screen.getByLabelText('Keep line rows together'));
    expect(onKeepRowTogetherChange).toHaveBeenCalledWith(false);
    expect(onPrintSetupChange).not.toHaveBeenCalled();
  });
});
