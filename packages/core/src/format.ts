// @docsmith/core — value formatting. Deterministic, locale-aware, no external deps.
// Used by the renderer (and mirrored by the designer's Properties preview).

import type { ValueFormat } from './types.js';

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

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
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
