import { describe, it, expect } from 'vitest';
import { renderToHtml } from './render.js';
import { newTemplate } from './schema.js';
import { formatValue } from './format.js';
import type { DocumentData, Template } from './types.js';

function invoiceTemplate(): Template {
  const t = newTemplate('invoice', 'invoice');
  t.dataSource.datasets = [
    { id: 'd1', label: 'Line items', kind: 'fk', ref: { table: 'invoice_items', fkColumn: 'invoice_id' }, orderBy: 'id' },
  ];
  t.bands = [
    {
      id: 'reportHeader', type: 'reportHeader', height: 120,
      elements: [
        { id: 'e1', kind: 'text', x: 12, y: 8, w: 200, h: 28, style: { fontSize: 22, bold: true }, text: 'INVOICE' },
        { id: 'e2', kind: 'field', x: 12, y: 44, w: 240, h: 18, binding: { source: 'header', column: 'invoice_number', format: 'text' } },
      ],
    },
    {
      id: 'detail', type: 'detail', datasetId: 'd1', keepRowTogether: true,
      columns: [
        { column: 'description', header: 'Description', width: 260, align: 'left', format: 'text' },
        { column: 'qty', header: 'Qty', width: 60, align: 'right', format: 'number' },
        { column: 'unit_price', header: 'Unit Price', width: 90, align: 'right', format: 'currency' },
        { column: 'line_total', header: 'Amount', width: 90, align: 'right', format: 'currency' },
      ],
      aggregates: [{ column: 'line_total', fn: 'sum', into: 'tfoot' }],
    },
    {
      id: 'totals', type: 'totals', height: 90,
      elements: [
        { id: 't1', kind: 'field', x: 320, y: 8, w: 200, h: 22, style: { bold: true, align: 'right' }, binding: { source: 'header', column: 'total_amount', format: 'currency' } },
      ],
    },
  ];
  return t;
}

function fatDocument(n: number): DocumentData {
  const rows = Array.from({ length: n }, (_, i) => ({
    description: `Product ${i + 1}`,
    qty: (i % 5) + 1,
    unit_price: 9.99 + i,
    line_total: ((i % 5) + 1) * (9.99 + i),
  }));
  return {
    header: { invoice_number: 'INV-1001', total_amount: 12345.67 },
    datasets: { d1: rows },
  };
}

describe('renderToHtml — pagination primitives', () => {
  const out = renderToHtml(invoiceTemplate(), fatDocument(60));

  it('renders the detail band as a real table with a repeating <thead>', () => {
    expect(out.html).toContain('<table class="detail"');
    expect(out.html).toContain('<thead>');
    // the header cells must be present
    expect(out.html).toContain('>Description<');
    expect(out.html).toContain('>Amount<');
    // thead must remain a table-header-group so browsers repeat it per page
    expect(out.css).toContain('table.detail thead { display: table-header-group; }');
  });

  it('injects @page from printSetup (size, orientation, margins)', () => {
    expect(out.css).toContain('@page { size: A4 portrait; margin: 20mm 18mm 20mm 18mm; }');
  });

  it('keeps line rows together across page breaks', () => {
    expect(out.css).toContain('table.detail tr { break-inside: avoid; }');
    expect(out.html).toContain('break-inside:avoid'); // per-row when keepRowTogether
  });

  it('prints the report header once and totals once (in-flow, not fixed)', () => {
    expect((out.html.match(/data-band="reportHeader"/g) ?? []).length).toBe(1);
    expect((out.html.match(/data-band="totals"/g) ?? []).length).toBe(1);
  });

  it('emits one <tr> per real data row (no fabricated rows)', () => {
    const bodyRows = (out.html.match(/<tr style="break-inside:avoid">/g) ?? []).length;
    expect(bodyRows).toBe(60);
  });

  it('renders a tfoot aggregate for line_total', () => {
    expect(out.html).toContain('<tfoot>');
  });

  it('produces a standalone document string for Puppeteer', () => {
    expect(out.document.startsWith('<!doctype html>')).toBe(true);
    expect(out.document).toContain('INVOICE');
  });
});

describe('formatValue', () => {
  it('formats currency, number, date, text and null', () => {
    expect(formatValue(1234.5, 'currency', { currency: 'USD', locale: 'en-US' })).toContain('1,234.5');
    expect(formatValue(1234567, 'number', { locale: 'en-US' })).toBe('1,234,567');
    expect(formatValue('2026-01-15', 'date', { locale: 'en-US' })).toMatch(/Jan/);
    expect(formatValue(null, 'text')).toBe('');
    expect(formatValue('hello', 'text')).toBe('hello');
  });
});
