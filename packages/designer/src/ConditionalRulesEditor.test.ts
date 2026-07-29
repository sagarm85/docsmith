import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { ConditionalRule } from '@docsmith/core';
import ConditionalRulesEditor from './ConditionalRulesEditor.svelte';

describe('ConditionalRulesEditor (memory.md D-031)', () => {
  it('shows an honest empty hint when there are no rules', () => {
    render(ConditionalRulesEditor, { props: { rules: [], onChange: vi.fn() } });
    expect(screen.getByText(/No rules yet/)).toBeTruthy();
  });

  it('"Add rule" appends a default rule', async () => {
    const onChange = vi.fn();
    render(ConditionalRulesEditor, { props: { rules: [], onChange } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(onChange).toHaveBeenCalledWith([{ operator: 'gt', value: 0, style: { bold: true } }]);
  });

  it('changing the operator updates that rule only', async () => {
    const onChange = vi.fn();
    const rules: ConditionalRule[] = [
      { operator: 'gt', value: 10, style: { bold: true } },
      { operator: 'eq', value: 'x', style: { color: '#ff0000' } },
    ];
    render(ConditionalRulesEditor, { props: { rules, onChange } });
    await fireEvent.change(screen.getByLabelText('Rule 1 operator'), { target: { value: 'lt' } });
    expect(onChange).toHaveBeenCalledWith([
      { operator: 'lt', value: 10, style: { bold: true } },
      { operator: 'eq', value: 'x', style: { color: '#ff0000' } },
    ]);
  });

  it('hides the value input for "is empty"/"is not empty" (no value needed)', () => {
    const rules: ConditionalRule[] = [{ operator: 'empty', style: {} }];
    render(ConditionalRulesEditor, { props: { rules, onChange: vi.fn() } });
    expect(screen.queryByLabelText('Rule 1 value')).toBeNull();
  });

  it('parses the value as a number for numeric operators', async () => {
    const onChange = vi.fn();
    const rules: ConditionalRule[] = [{ operator: 'gt', value: 0, style: {} }];
    render(ConditionalRulesEditor, { props: { rules, onChange } });
    await fireEvent.input(screen.getByLabelText('Rule 1 value'), { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith([{ operator: 'gt', value: 42, style: {} }]);
  });

  it('keeps the value as a string for non-numeric operators', async () => {
    const onChange = vi.fn();
    const textRules: ConditionalRule[] = [{ operator: 'contains', value: '', style: {} }];
    render(ConditionalRulesEditor, { props: { rules: textRules, onChange } });
    await fireEvent.input(screen.getByLabelText('Rule 1 value'), { target: { value: 'overdue' } });
    expect(onChange).toHaveBeenCalledWith([{ operator: 'contains', value: 'overdue', style: {} }]);
  });

  it('updates text color, background color, and bold on the rule style', async () => {
    const onChange = vi.fn();
    const rules: ConditionalRule[] = [{ operator: 'gt', value: 0, style: {} }];
    render(ConditionalRulesEditor, { props: { rules, onChange } });

    await fireEvent.input(screen.getByLabelText('Rule 1 text color'), { target: { value: '#b3261e' } });
    expect(onChange).toHaveBeenCalledWith([{ operator: 'gt', value: 0, style: { color: '#b3261e' } }]);

    onChange.mockClear();
    await fireEvent.input(screen.getByLabelText('Rule 1 background color'), { target: { value: '#fee2e2' } });
    expect(onChange).toHaveBeenCalledWith([{ operator: 'gt', value: 0, style: { bg: '#fee2e2' } }]);

    onChange.mockClear();
    await fireEvent.click(screen.getByLabelText('Rule 1 bold'));
    expect(onChange).toHaveBeenCalledWith([{ operator: 'gt', value: 0, style: { bold: true } }]);
  });

  it('removes only the targeted rule', async () => {
    const onChange = vi.fn();
    const rules: ConditionalRule[] = [
      { operator: 'gt', value: 1, style: {} },
      { operator: 'lt', value: 2, style: {} },
    ];
    render(ConditionalRulesEditor, { props: { rules, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: 'Remove rule 1' }));
    expect(onChange).toHaveBeenCalledWith([{ operator: 'lt', value: 2, style: {} }]);
  });
});
