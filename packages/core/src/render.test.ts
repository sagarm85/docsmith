import { describe, it, expect } from 'vitest';
import { renderToHtml } from './render.js';
import { newTemplate, convertLayoutUnit, convertBandArrangement } from './schema.js';
import { formatValue } from './format.js';
import type { DocumentData, FreeBand, FreeElement, Template } from './types.js';

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

describe('renderToHtml — layoutUnit (px vs %)', () => {
  it('defaults to px when layoutUnit is absent (existing templates unaffected)', () => {
    const out = renderToHtml(invoiceTemplate(), fatDocument(1));
    expect(out.html).toContain('left:12px');
    expect(out.html).toContain('top:8px');
  });

  it('emits % instead of px for every free-form element when layoutUnit is "%"', () => {
    const t = { ...invoiceTemplate(), layoutUnit: '%' as const };
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('left:12%');
    expect(out.html).toContain('top:8%');
    expect(out.html).not.toContain('left:12px');
    // Band height is always px regardless of layoutUnit — it's the outer box.
    expect(out.html).toContain('height:120px');
  });
});

describe('convertLayoutUnit', () => {
  it('is a no-op (same reference) when already in the target unit', () => {
    const t = invoiceTemplate();
    expect(convertLayoutUnit(t, 'px', 800)).toBe(t);
  });

  it('converts px -> % using contentWidthPx for x/w and band height for y/h', () => {
    const t = invoiceTemplate();
    const next = convertLayoutUnit(t, '%', 800);
    expect(next.layoutUnit).toBe('%');
    const reportHeader = next.bands.find((b) => b.id === 'reportHeader') as FreeBand;
    // e1: x=12,y=8,w=200,h=28 against contentWidthPx=800, band.height=120
    const e1 = reportHeader.elements.find((e) => e.id === 'e1')!;
    expect(e1.x).toBe(1.5); // 12/800*100
    expect(e1.w).toBe(25); // 200/800*100
    expect(e1.y).toBeCloseTo(6.67, 1); // 8/120*100
    expect(e1.h).toBeCloseTo(23.33, 1); // 28/120*100
  });

  it('round-trips px -> % -> px back to (approximately) the original values', () => {
    const t = invoiceTemplate();
    const asPercent = convertLayoutUnit(t, '%', 800);
    const backToPx = convertLayoutUnit(asPercent, 'px', 800);
    const original = (t.bands.find((b) => b.id === 'reportHeader') as FreeBand).elements[0]!;
    const roundTripped = (backToPx.bands.find((b) => b.id === 'reportHeader') as FreeBand).elements[0]!;
    expect(roundTripped.x).toBe(original.x);
    expect(roundTripped.w).toBe(original.w);
  });

  it('never converts the DetailBand (it has no free-form elements)', () => {
    const t = invoiceTemplate();
    const next = convertLayoutUnit(t, '%', 800);
    const detail = next.bands.find((b) => b.id === 'detail');
    expect(detail).toStrictEqual(t.bands.find((b) => b.id === 'detail'));
  });
});

describe('renderToHtml — "stack" arrangement (memory.md D-029)', () => {
  it('renders elements as flex rows in array order, not absolute position', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'stack' as const,
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Left', row: 0 },
              { id: 'b', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Right', row: 0 },
              { id: 'c', kind: 'text', x: 0, y: 0, w: 100, h: 20, text: 'Below' },
            ] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('class="band band-reportHeader band-stack');
    // Row grouping: "Left"/"Right" share row 0, "Below" is its own row —
    // exactly 2 <div class="stack-row"> groups.
    expect((out.html.match(/class="stack-row"/g) ?? []).length).toBe(2);
    // No absolute positioning on stack elements.
    expect(out.html).not.toContain('el-text" style="position:absolute');
    expect(out.html).toContain('flex:0 0 50%');
  });

  it('never stacks pageHeader/pageFooter even if arrangement is set (they need a known height for the fixed-position reservation)', () => {
    const t = invoiceTemplate();
    t.bands = [
      ...t.bands,
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 40,
        enabled: true,
        arrangement: 'stack',
        elements: [{ id: 'ph1', kind: 'text', x: 0, y: 0, w: 100, h: 18, text: 'Running' }],
      },
    ];
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('position:absolute');
    expect(out.html).not.toContain('band-pageHeader band-stack');
  });
});

describe('convertBandArrangement', () => {
  function band(): FreeBand {
    return {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 120,
      elements: [
        { id: 'e1', kind: 'text', x: 12, y: 40, w: 200, h: 20, text: 'Second' },
        { id: 'e2', kind: 'text', x: 12, y: 8, w: 200, h: 20, text: 'First' },
      ],
    };
  }

  it('is a no-op (same reference) when already in the target arrangement', () => {
    const b = band();
    expect(convertBandArrangement(b, 'free', 800, 'px')).toBe(b);
  });

  it('free -> stack sorts by y, gives each element its own row, and converts width to a plain percentage', () => {
    const next = convertBandArrangement(band(), 'stack', 800, 'px');
    expect(next.arrangement).toBe('stack');
    // Sorted by y: "First" (y:8) then "Second" (y:40).
    expect(next.elements.map((e) => e.text)).toStrictEqual(['First', 'Second']);
    expect(next.elements[0]?.row).toBe(0);
    expect(next.elements[1]?.row).toBe(1);
    expect(next.elements[0]?.w).toBe(25); // 200/800*100
  });

  it('stack -> free lays rows out top-to-bottom and side-by-side within a row', () => {
    const stacked: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 120,
      arrangement: 'stack',
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Left', row: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Right', row: 0 },
        { id: 'c', kind: 'text', x: 0, y: 0, w: 100, h: 20, text: 'Below' },
      ],
    };
    const next = convertBandArrangement(stacked, 'free', 800, 'px');
    expect(next.arrangement).toBe('free');
    const [left, right, below] = next.elements;
    expect(left?.x).toBe(0);
    expect(right?.x).toBe(400); // 50% of 800px
    expect(left?.y).toBe(right?.y); // same row -> same y
    expect(below?.y).toBeGreaterThan(left!.y); // next row is lower
    expect(next.elements.every((e) => e.row === undefined)).toBe(true);
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
