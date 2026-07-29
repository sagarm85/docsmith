// @docsmith/core — value formatting. Deterministic, locale-aware, no external deps.
// Used by the renderer (and mirrored by the designer's Properties preview).

import type { ConditionalRule, ElementStyle, ValueFormat } from './types.js';

export type FormatOptions = {
  locale?: string; // e.g. 'en-US', 'en-IN'
  currency?: string; // ISO 4217, e.g. 'USD', 'INR'
};

/** Pick a sensible default format from an adapter field `type` string. */
export function defaultFormatForType(type: string | undefined): ValueFormat {
  const t = (type ?? '').toLowerCase();
  if (/(decimal|numeric|money|currency|price|amount)/.test(t)) return 'currency';
  if (/(date|time|timestamp)/.test(t)) return 'date';
  if (/(int|integer|float|double|real|number|numeric|decimal)/.test(t)) return 'number';
  return 'text';
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function threeDigitsToWords(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(ONES[Math.floor(n / 100)]!, 'Hundred');
    n %= 100;
  }
  if (n >= 20) {
    let word = TENS[Math.floor(n / 10)]!;
    if (n % 10) word += `-${ONES[n % 10]}`;
    parts.push(word);
  } else if (n > 0) {
    parts.push(ONES[n]!);
  }
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const groups: string[] = [];
  let scaleIdx = 0;
  let rest = n;
  while (rest > 0) {
    const group = rest % 1000;
    if (group > 0) {
      const scale = SCALES[scaleIdx];
      groups.unshift(scale ? `${threeDigitsToWords(group)} ${scale}` : threeDigitsToWords(group));
    }
    rest = Math.floor(rest / 1000);
    scaleIdx += 1;
  }
  return groups.join(' ');
}

/**
 * Spell a number out in English words — design.md's "amount-in-words", the
 * classic line under a `totals` band's grand total (e.g. "One Thousand Two
 * Hundred Thirty-Four and 56/100"). English-only by design: a real
 * multi-locale number-to-words system has genuinely different grammar per
 * language (gendered forms, different large-number groupings like Indian
 * lakh/crore) — a much bigger feature than reusing `Intl` the way every
 * other format here does, so it's out of scope rather than faked. The
 * fractional part renders as "and NN/100" (the standard check-writing
 * convention), never a second round of word-spelling.
 */
export function numberToWords(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  let words = integerToWords(whole);
  if (cents > 0) words += ` and ${String(cents).padStart(2, '0')}/100`;
  return (negative ? 'Negative ' : '') + words;
}

/**
 * Format one value for display. Never throws — an unformattable value falls back
 * to its string form so a template can't crash a render. NULL/undefined → ''.
 */
export function formatValue(
  value: unknown,
  format: ValueFormat | undefined,
  opts: FormatOptions = {},
): string {
  if (value === null || value === undefined) return '';
  const locale = opts.locale || 'en-US';

  switch (format) {
    case 'currency': {
      const n = toNumber(value);
      if (n === null) return String(value);
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: opts.currency || 'USD',
        }).format(n);
      } catch {
        return n.toFixed(2);
      }
    }
    case 'number': {
      const n = toNumber(value);
      if (n === null) return String(value);
      return new Intl.NumberFormat(locale).format(n);
    }
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(d.getTime())) return String(value);
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(d);
    }
    case 'words': {
      const n = toNumber(value);
      if (n === null) return String(value);
      return numberToWords(n);
    }
    case 'text':
    default:
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
  }
}

/** Aggregate a column of records (used for <tfoot> totals). */
export function aggregate(
  rows: Array<Record<string, unknown>>,
  column: string,
  fn: 'sum' | 'count' | 'avg',
): number {
  if (fn === 'count') return rows.length;
  let sum = 0;
  let seen = 0;
  for (const r of rows) {
    const n = toNumber(r[column]);
    if (n !== null) {
      sum += n;
      seen += 1;
    }
  }
  if (fn === 'avg') return seen ? sum / seen : 0;
  return sum;
}

/** Tests one conditional-formatting rule against a raw (unformatted) value —
 * memory.md D-031. Never throws: an unparseable numeric comparison or an
 * unknown operator simply doesn't match, the same "never crash a render"
 * posture as `formatValue`. */
export function matchesConditionalRule(rule: ConditionalRule, raw: unknown): boolean {
  const isEmpty = raw === null || raw === undefined || raw === '';
  switch (rule.operator) {
    case 'empty':
      return isEmpty;
    case 'notEmpty':
      return !isEmpty;
    case 'eq':
      return String(raw ?? '') === String(rule.value ?? '');
    case 'neq':
      return String(raw ?? '') !== String(rule.value ?? '');
    case 'contains':
      return String(raw ?? '').toLowerCase().includes(String(rule.value ?? '').toLowerCase());
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const n = toNumber(raw);
      const v = toNumber(rule.value ?? null);
      if (n === null || v === null) return false;
      if (rule.operator === 'gt') return n > v;
      if (rule.operator === 'gte') return n >= v;
      if (rule.operator === 'lt') return n < v;
      return n <= v;
    }
    default:
      return false;
  }
}

/** Merges every matching rule's `style` over `baseStyle`, in array order
 * (later matches win for overlapping properties — a simple CSS-cascade-like
 * merge, per memory.md D-031). Returns `baseStyle` unchanged (same
 * reference) when there are no rules or none match, so callers can skip
 * extra work cheaply. */
export function resolveConditionalStyle(
  baseStyle: ElementStyle | undefined,
  rules: ConditionalRule[] | undefined,
  raw: unknown,
): ElementStyle | undefined {
  if (!rules?.length) return baseStyle;
  let style = baseStyle;
  for (const rule of rules) {
    if (matchesConditionalRule(rule, raw)) style = { ...style, ...rule.style };
  }
  return style;
}
