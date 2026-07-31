import { describe, it, expect } from 'vitest';
import { renderToHtml } from './render.js';
import { newTemplate, convertLayoutUnit, convertBandArrangement } from './schema.js';
import { formatValue, numberToWords, matchesConditionalRule, resolveConditionalStyle } from './format.js';
import type { Band, DetailBand, DocumentData, FreeBand, FreeElement, Template } from './types.js';

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

describe('renderToHtml — "grid" arrangement (memory.md D-034)', () => {
  function gridTemplate(gridBorder?: string): Template {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'grid' as const,
            gridColumns: [60, 40],
            gridBorder,
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Seller', row: 0, col: 0, colSpan: 2 },
              { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Invoice #', row: 1, col: 0 },
              { id: 'c', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Date', row: 1, col: 1 },
            ] as FreeElement[],
          }
        : b,
    );
    return t;
  }

  it('renders as a real <table> with colgroup widths and a colspan for a spanning cell', () => {
    const out = renderToHtml(gridTemplate(), fatDocument(1));
    expect(out.html).toContain('class="band band-reportHeader band-grid');
    expect(out.html).toContain('<table class="grid-table">');
    expect(out.html).toContain('<col style="width:60%"/>');
    expect(out.html).toContain('<col style="width:40%"/>');
    expect(out.html).toContain('colspan="2"');
    // 2 rows in the grid table itself (not the detail table's own <tr>s):
    // the spanning "Seller" row, then "Invoice #"/"Date" side by side.
    const gridTableHtml = out.html.slice(out.html.indexOf('<table class="grid-table">'), out.html.indexOf('</table>'));
    expect((gridTableHtml.match(/<tr>/g) ?? []).length).toBe(2);
  });

  it('applies gridBorder to every cell, and omits it when unset', () => {
    const bordered = renderToHtml(gridTemplate('1px solid #1a1c22'), fatDocument(1));
    expect(bordered.html).toContain('border:1px solid #1a1c22');

    const borderless = renderToHtml(gridTemplate(undefined), fatDocument(1));
    expect(borderless.html).toContain('border:none');
    expect(borderless.html).not.toContain('border:1px solid');
  });

  it('never grids pageHeader/pageFooter even if arrangement is set (same reasoning as stack — no known height)', () => {
    const t = invoiceTemplate();
    t.bands = [
      ...t.bands,
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 40,
        enabled: true,
        arrangement: 'grid',
        gridColumns: [100],
        elements: [{ id: 'ph1', kind: 'text', x: 0, y: 0, w: 100, h: 18, text: 'Running', row: 0, col: 0 }],
      },
    ];
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).not.toContain('band-pageHeader band-grid');
  });

  it('stacks multiple elements sharing one (row, col) inside a single <td> (memory.md D-045)', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'grid' as const,
            gridColumns: [100],
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Line one', row: 0, col: 0 },
              { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Line two', row: 0, col: 0 },
            ] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    const gridTableHtml = out.html.slice(out.html.indexOf('<table class="grid-table">'), out.html.indexOf('</table>'));
    // Exactly one <tr> (both elements share row 0, col 0 — one cell, not two).
    expect((gridTableHtml.match(/<tr>/g) ?? []).length).toBe(1);
    expect((gridTableHtml.match(/<td/g) ?? []).length).toBe(1);
    expect(gridTableHtml).toContain('Line one');
    expect(gridTableHtml).toContain('Line two');
    expect(gridTableHtml.indexOf('Line one')).toBeLessThan(gridTableHtml.indexOf('Line two'));
  });

  it('renders a genuinely-absent gap column as an empty <td> so later columns keep their real position (fixed alongside D-045)', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'grid' as const,
            gridColumns: [50, 50],
            // Only column 1 is filled in this row — column 0 is a genuine gap.
            elements: [{ id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Right side', row: 0, col: 1 }] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    const gridTableHtml = out.html.slice(out.html.indexOf('<table class="grid-table">'), out.html.indexOf('</table>'));
    expect((gridTableHtml.match(/<td/g) ?? []).length).toBe(2);
    expect(gridTableHtml).toMatch(/<td[^>]*><\/td>\s*<td[^>]*>.*Right side/s);
  });
});

describe('renderToHtml — FreeBand.sectionColumns, per-section independent columns (memory.md D-048)', () => {
  it('renders two sections with different column counts as two separate <table>s, each with its own <colgroup>', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'grid' as const,
            gridColumns: [100],
            sectionColumns: { 0: [50, 50] },
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Left', row: 0, col: 0 },
              { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Right', row: 0, col: 1 },
              { id: 'c', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Full width', row: 1, col: 0 },
            ] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    const tables = out.html.match(/<table class="grid-table">.*?<\/table>/gs) ?? [];
    expect(tables).toHaveLength(2);
    expect(tables[0]).toContain('<col style="width:50%"/>');
    expect(tables[0]).toContain('Left');
    expect(tables[0]).toContain('Right');
    expect(tables[1]).toContain('<col style="width:100%"/>');
    expect(tables[1]).toContain('Full width');
  });

  it('merges consecutive rows sharing the same resolved columns into ONE <table> (native border-collapse stays seamless)', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'grid' as const,
            gridColumns: [50, 50],
            sectionColumns: {},
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Row 0', row: 0, col: 0 },
              { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Row 1', row: 1, col: 0 },
            ] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    const tables = out.html.match(/<table class="grid-table">.*?<\/table>/gs) ?? [];
    expect(tables).toHaveLength(1);
    expect((tables[0]!.match(/<tr>/g) ?? []).length).toBe(2);
  });

  it('a row missing from sectionColumns falls back to gridColumns', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            arrangement: 'grid' as const,
            gridColumns: [70, 30],
            sectionColumns: { 1: [50, 50] },
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Uses gridColumns', row: 0, col: 0 },
              { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 0, text: 'Uses sectionColumns', row: 1, col: 0 },
            ] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    const tables = out.html.match(/<table class="grid-table">.*?<\/table>/gs) ?? [];
    expect(tables).toHaveLength(2);
    expect(tables[0]).toContain('<col style="width:70%"/>');
    expect(tables[1]).toContain('<col style="width:50%"/>');
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

  it('free -> grid gives each element its own row/col:0 in a single full-width column', () => {
    const next = convertBandArrangement(band(), 'grid', 800, 'px');
    expect(next.arrangement).toBe('grid');
    expect(next.gridColumns).toStrictEqual([100]);
    expect(next.elements.map((e) => e.text)).toStrictEqual(['First', 'Second']); // sorted by y
    expect(next.elements[0]).toMatchObject({ row: 0, col: 0, colSpan: 1 });
    expect(next.elements[1]).toMatchObject({ row: 1, col: 0, colSpan: 1 });
  });

  it('grid -> free reads x/w from gridColumns + col/colSpan, including a spanning cell', () => {
    const grid: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 120,
      arrangement: 'grid',
      gridColumns: [60, 40],
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Seller', row: 0, col: 0, colSpan: 2 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Invoice #', row: 1, col: 0 },
        { id: 'c', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Date', row: 1, col: 1 },
      ],
    };
    const next = convertBandArrangement(grid, 'free', 1000, 'px');
    expect(next.arrangement).toBe('free');
    const [seller, invNum, date] = next.elements;
    expect(seller?.w).toBe(1000); // 60+40% spanning both columns
    expect(invNum?.x).toBe(0);
    expect(invNum?.w).toBe(600); // 60% of 1000
    expect(date?.x).toBe(600); // starts right after the first column
    expect(date?.w).toBe(400); // 40% of 1000
    expect(invNum?.y).toBe(date?.y);
    expect(date?.y).toBeGreaterThan(seller!.y);
    expect(next.elements.every((e) => e.col === undefined && e.colSpan === undefined)).toBe(true);
  });

  it('grid -> stack drops col/colSpan and keeps row-derived width as a plain percentage', () => {
    const grid: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 120,
      arrangement: 'grid',
      gridColumns: [60, 40],
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Invoice #', row: 0, col: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Date', row: 0, col: 1 },
      ],
    };
    const next = convertBandArrangement(grid, 'stack', 1000, 'px');
    expect(next.arrangement).toBe('stack');
    expect(next.elements[0]).toMatchObject({ row: 0, w: 60 });
    expect(next.elements[1]).toMatchObject({ row: 0, w: 40 });
    expect(next.elements.every((e) => e.col === undefined && e.colSpan === undefined)).toBe(true);
  });

  it('grid -> free reads each row\'s OWN sectionColumns override, not just the band-wide gridColumns (memory.md D-048)', () => {
    const grid: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 120,
      arrangement: 'grid',
      gridColumns: [60, 40],
      // Row 1 overrides to a totally different split than the band default.
      sectionColumns: { 1: [30, 70] },
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Uses band default', row: 0, col: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Override left', row: 1, col: 0 },
        { id: 'c', kind: 'text', x: 0, y: 0, w: 0, h: 20, text: 'Override right', row: 1, col: 1 },
      ],
    };
    const next = convertBandArrangement(grid, 'free', 1000, 'px');
    const [row0, overrideLeft, overrideRight] = next.elements;
    expect(row0?.w).toBe(600); // row 0 falls back to gridColumns [60, 40] -> 60% of 1000
    expect(overrideLeft?.w).toBe(300); // row 1's own sectionColumns [30, 70] -> 30%
    expect(overrideRight?.x).toBe(300);
    expect(overrideRight?.w).toBe(700);
  });

  it('stack -> grid gives each row its own grid row in a single full-width column', () => {
    const stacked: FreeBand = {
      id: 'reportHeader',
      type: 'reportHeader',
      height: 120,
      arrangement: 'stack',
      elements: [
        { id: 'a', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Left', row: 0 },
        { id: 'b', kind: 'text', x: 0, y: 0, w: 50, h: 20, text: 'Right', row: 0 },
      ],
    };
    const next = convertBandArrangement(stacked, 'grid', 800, 'px');
    expect(next.arrangement).toBe('grid');
    expect(next.gridColumns).toStrictEqual([100]);
    // Both elements shared stack row 0 -> both land in grid row 0, col 0 (best-effort, not lossless).
    expect(next.elements[0]).toMatchObject({ row: 0, col: 0 });
    expect(next.elements[1]).toMatchObject({ row: 0, col: 0 });
  });
});

describe('styleToCss — borderRadius', () => {
  it('emits px for a number and passes a string through as-is', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            elements: [
              { id: 'a', kind: 'text', x: 0, y: 0, w: 40, h: 20, text: 'Pill', style: { borderRadius: 999 } },
              { id: 'b', kind: 'text', x: 0, y: 30, w: 40, h: 20, text: 'Rounded', style: { borderRadius: '4px 4px 0 0' } },
            ] as FreeElement[],
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('border-radius:999px');
    expect(out.html).toContain('border-radius:4px 4px 0 0');
  });
});

describe('renderToHtml — DetailBand.cellBorder', () => {
  it('leaves the table unstyled (default CSS border) when cellBorder is unset', () => {
    const out = renderToHtml(invoiceTemplate(), fatDocument(1));
    expect(out.html).not.toContain('--dd-cell-border');
  });

  it('sets the --dd-cell-border custom property to the given value, including "none"', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) => (b.type === 'detail' ? { ...(b as DetailBand), cellBorder: 'none' } : b));
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('style="--dd-cell-border:none"');
  });

  it('accepts a custom border value', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.type === 'detail' ? { ...(b as DetailBand), cellBorder: '2px dashed #999' } : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('style="--dd-cell-border:2px dashed #999"');
  });
});

describe('renderToHtml — DetailBand.stripeRows', () => {
  it('does not add the striped class or CSS rule when unset', () => {
    const out = renderToHtml(invoiceTemplate(), fatDocument(1));
    expect(out.html).not.toContain('detail--striped');
  });

  it('adds the striped class to the table and a matching CSS rule when set', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) => (b.type === 'detail' ? { ...(b as DetailBand), stripeRows: true } : b));
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('<table class="detail detail--striped"');
    expect(out.css).toContain('table.detail.detail--striped tbody tr:nth-child(even) td');
  });
});

describe('renderToHtml — DetailColumn.format:"image" (memory.md D-039)', () => {
  function imageTemplate(): Template {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.type === 'detail'
        ? {
            ...(b as DetailBand),
            columns: [
              ...(b as DetailBand).columns,
              { column: 'photo_url', header: 'Photo', width: 60, format: 'image' as const },
            ],
          }
        : b,
    );
    return t;
  }

  function docWithImages(): DocumentData {
    return {
      header: { invoice_number: 'INV-1001', total_amount: 1 },
      datasets: {
        d1: [
          { description: 'A', qty: 1, unit_price: 1, line_total: 1, photo_url: 'https://example.com/a.png' },
          { description: 'B', qty: 1, unit_price: 1, line_total: 1, photo_url: '' },
        ],
      },
    };
  }

  it('renders an <img> for a row with a value, never text-escapes the URL', () => {
    const out = renderToHtml(imageTemplate(), docWithImages());
    expect(out.html).toContain('<img src="https://example.com/a.png"');
    expect(out.html).not.toContain('&lt;img'); // sanity: not double-escaped/dropped
  });

  it('renders an empty cell (no broken-image icon) when the value is missing/empty', () => {
    const out = renderToHtml(imageTemplate(), docWithImages());
    // Row A has a photo_url, row B's is '' — exactly one <img> total.
    expect((out.html.match(/<img /g) ?? []).length).toBe(1);
  });

  it('never calls formatValue/escapes the raw URL as text for an image column', () => {
    const out = renderToHtml(imageTemplate(), docWithImages());
    expect(out.html).not.toContain('>https://example.com/a.png<');
  });
});

describe('renderToHtml — screen-only pageHeader/pageFooter fixed positioning matches .page\'s width (memory.md D-068/D-070)', () => {
  it('gives the screen-only .band-pageHeader/.band-pageFooter rule an explicit width and auto margin matching .page\'s own width', () => {
    const t = invoiceTemplate();
    t.bands.unshift({
      id: 'pageHeader',
      type: 'pageHeader',
      height: 30,
      enabled: true,
      elements: [{ id: 'ph1', kind: 'text', x: 0, y: 4, w: 100, h: 20, text: 'Logo' }],
    });
    const out = renderToHtml(t, fatDocument(1));
    const pageWidthMatch = out.css.match(/\.page \{ width: (\d+)px; \}/);
    expect(pageWidthMatch).toBeTruthy();
    const pageWidth = pageWidthMatch![1];
    expect(out.css).toContain(
      `.band-pageHeader, .band-pageFooter { position: fixed; left: 0; right: 0; width: ${pageWidth}px; margin: 0 auto; }`,
    );
  });
});

describe('renderToHtml — screen-only pageHeader/pageFooter top/bottom offset matches .page\'s own margin (memory.md D-072)', () => {
  it('band-pageHeader\'s top and .page\'s margin-top are the same value — a repeating header must not float above/below the page it runs across', () => {
    const t = invoiceTemplate();
    t.bands.unshift({
      id: 'pageHeader',
      type: 'pageHeader',
      height: 30,
      enabled: true,
      elements: [{ id: 'ph1', kind: 'text', x: 0, y: 4, w: 100, h: 20, text: 'Logo' }],
    });
    t.bands.push({
      id: 'pageFooter',
      type: 'pageFooter',
      height: 20,
      enabled: true,
      elements: [{ id: 'pf1', kind: 'text', x: 0, y: 2, w: 100, h: 16, text: 'Footer' }],
    });
    const out = renderToHtml(t, fatDocument(1));

    const pageMarginMatch = out.css.match(/\.page \{ background: #fff; margin: (\d+)px auto;/);
    expect(pageMarginMatch).toBeTruthy();
    const margin = pageMarginMatch![1];

    // Before the fix these were independently 0/0 — a plain 0 fixes the bar
    // to the iframe viewport's literal edge, ignoring that .page itself
    // sits `margin`px in from that edge, so a repeating pageHeader visibly
    // overhung above .page's own white background instead of running flush
    // across its top (reported directly: "header top position at 0 but
    // preview is showing not in the top").
    expect(out.css).toContain(`.band-pageHeader { top: ${margin}px; }`);
    expect(out.css).toContain(`.band-pageFooter { bottom: ${margin}px; }`);
  });
});

describe('renderToHtml — pageHeader/pageFooter repeat via a real <thead>/<tfoot>, not position:fixed, in print (memory.md D-070)', () => {
  function templateWithRunningBands() {
    const t = invoiceTemplate();
    t.bands.unshift({
      id: 'pageHeader',
      type: 'pageHeader',
      height: 30,
      enabled: true,
      elements: [{ id: 'ph1', kind: 'text', x: 0, y: 4, w: 100, h: 20, text: 'Running header' }],
    });
    t.bands.push({
      id: 'pageFooter',
      type: 'pageFooter',
      height: 20,
      enabled: true,
      elements: [{ id: 'pf1', kind: 'text', x: 0, y: 2, w: 100, h: 16, text: 'Running footer' }],
    });
    return t;
  }

  it('wraps the page in a table with pageHeader as <thead> and pageFooter as <tfoot>', () => {
    const out = renderToHtml(templateWithRunningBands(), fatDocument(1));
    expect(out.html).toContain('<table class="page-table">');
    expect(out.html).toMatch(/<thead><tr><td>[^]*Running header[^]*<\/td><\/tr><\/thead>/);
    expect(out.html).toMatch(/<tfoot><tr><td>[^]*Running footer[^]*<\/td><\/tr><\/tfoot>/);
    // The in-flow content (reportHeader/detail/totals) is the <tbody>, not fixed-position.
    expect(out.html).toMatch(/<tbody><tr><td><div class="doc-flow">/);
  });

  it('never emits position:fixed in the default (print) stylesheet — only inside @media screen', () => {
    const out = renderToHtml(templateWithRunningBands(), fatDocument(1));
    const screenBlockMatch = out.css.match(/@media screen \{[^]*\}\s*$/);
    expect(screenBlockMatch).toBeTruthy();
    const printOnlyCss = out.css.slice(0, screenBlockMatch!.index);
    expect(printOnlyCss).not.toContain('position: fixed');
  });

  it('a template with neither pageHeader nor pageFooter keeps the plain .page > .doc-flow shape (no page-table)', () => {
    const out = renderToHtml(invoiceTemplate(), fatDocument(1));
    expect(out.html).not.toContain('page-table');
    expect(out.html).toMatch(/<div class="page"><div class="doc-flow">/);
  });
});

describe('renderToHtml — free-arrangement band height is a minimum, not a ceiling (memory.md D-066)', () => {
  it('renders the band at its stored height when content fits within it', () => {
    const out = renderToHtml(invoiceTemplate(), fatDocument(1));
    // totals: height 90, element t1 at y:8 h:22 -> extent 30, well under 90.
    expect(out.html).toContain('band band-totals');
    expect(out.html).toMatch(/band-totals[^>]*style="[^"]*height:90px/);
  });

  it('grows past the stored height when an element extends beyond it', () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.type === 'totals'
        ? { ...(b as FreeBand), elements: [...(b as FreeBand).elements, { id: 't2', kind: 'text', x: 0, y: 150, w: 100, h: 20, text: 'Note' }] }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    // y:150 + h:20 = 170, past the band's stored height:90 -> renders at 170.
    expect(out.html).toMatch(/band-totals[^>]*style="[^"]*height:170px/);
  });

  it('reserves matching .doc-flow padding when a pageFooter grows past its stored height', () => {
    const t = invoiceTemplate();
    t.bands.push({
      id: 'pageFooter',
      type: 'pageFooter',
      height: 20,
      enabled: true,
      elements: [{ id: 'f1', kind: 'text', x: 0, y: 40, w: 100, h: 20, text: 'Footer' }],
    });
    const out = renderToHtml(t, fatDocument(1));
    // y:40 + h:20 = 60, past the stored height:20 -> both the footer's own
    // box AND the reserved .doc-flow padding-bottom must use 60, not 20.
    expect(out.html).toMatch(/band-pageFooter[^>]*style="[^"]*height:60px/);
    expect(out.css).toContain('padding-bottom: 60px');
  });
});

describe('renderToHtml — printSetup.fillPage (memory.md D-040)', () => {
  it('is a no-op (no flex/min-height CSS at all) when unset', () => {
    const out = renderToHtml(invoiceTemplate(), fatDocument(1));
    expect(out.css).not.toContain('min-height');
    expect(out.css).not.toContain('margin-top: auto');
  });

  it('emits a min-height on .doc-flow matching the page content height, and a margin-top:auto rule for the last flow child', () => {
    const t = invoiceTemplate();
    t.printSetup = { ...t.printSetup, fillPage: true };
    const out = renderToHtml(t, fatDocument(1));
    // A4 portrait, default 20/18/20/18mm margins (from newTemplate) — but
    // invoiceTemplate() only overrides bands, so printSetup keeps
    // newTemplate()'s DEFAULT_PRINT_SETUP margins (20mm top/bottom).
    // Content height = (297 - 20 - 20) * 96/25.4 ≈ 971.34px.
    expect(out.css).toMatch(/\.doc-flow \{ display: flex; flex-direction: column; min-height: 9\d\d\.\d+px; \}/);
    expect(out.css).toContain('.doc-flow > *:last-child { margin-top: auto; }');
  });

  it('accounts for landscape orientation (uses the shorter dimension as page height)', () => {
    const t = invoiceTemplate();
    t.printSetup = { ...t.printSetup, fillPage: true, orientation: 'landscape' };
    const out = renderToHtml(t, fatDocument(1));
    // A4 landscape: page height becomes 210mm (the shorter side) instead of 297mm.
    // Content height = (210 - 20 - 20) * 96/25.4 ≈ 641.9px.
    expect(out.css).toMatch(/min-height: 6\d\d\.\d+px/);
  });

  it('subtracts pageHeader/pageFooter height from the min-height (memory.md D-080)', () => {
    // Reproduced directly: fillPage's min-height forces .doc-flow to the FULL
    // printable page height, but when pageHeader/pageFooter also exist they
    // occupy REAL space on that same physical page (a <thead>/<tfoot> sharing
    // it, per D-070) — not accounting for that pushed a genuinely one-page
    // document (5 short detail rows) onto an unwanted page 2, since the
    // combined height of pageHeader + the full-page-forced .doc-flow +
    // pageFooter exceeded one page's actual printable height.
    const t = invoiceTemplate();
    t.printSetup = { ...t.printSetup, fillPage: true };
    t.bands.unshift({
      id: 'pageHeader',
      type: 'pageHeader',
      height: 60,
      enabled: true,
      elements: [{ id: 'ph1', kind: 'text', x: 0, y: 4, w: 100, h: 20, text: 'Header' }],
    });
    t.bands.push({
      id: 'pageFooter',
      type: 'pageFooter',
      height: 40,
      enabled: true,
      elements: [{ id: 'pf1', kind: 'text', x: 0, y: 2, w: 100, h: 16, text: 'Footer' }],
    });
    const withRunning = renderToHtml(t, fatDocument(1));

    const tNoRunning = invoiceTemplate();
    tNoRunning.printSetup = { ...tNoRunning.printSetup, fillPage: true };
    const withoutRunning = renderToHtml(tNoRunning, fatDocument(1));

    const minHeightOf = (css: string) => Number(css.match(/min-height: ([\d.]+)px/)![1]);
    // Same page, same printSetup — the ONLY difference is pageHeader (60) +
    // pageFooter (40) now also sharing that page's height budget, so the
    // min-height must shrink by exactly that much (100px).
    expect(minHeightOf(withoutRunning.css) - minHeightOf(withRunning.css)).toBeCloseTo(100, 5);
  });
});

describe('matchesConditionalRule / resolveConditionalStyle (memory.md D-031)', () => {
  it('evaluates every operator', () => {
    expect(matchesConditionalRule({ operator: 'eq', value: 'x', style: {} }, 'x')).toBe(true);
    expect(matchesConditionalRule({ operator: 'eq', value: 'x', style: {} }, 'y')).toBe(false);
    expect(matchesConditionalRule({ operator: 'neq', value: 'x', style: {} }, 'y')).toBe(true);
    expect(matchesConditionalRule({ operator: 'gt', value: 10, style: {} }, 11)).toBe(true);
    expect(matchesConditionalRule({ operator: 'gt', value: 10, style: {} }, 10)).toBe(false);
    expect(matchesConditionalRule({ operator: 'gte', value: 10, style: {} }, 10)).toBe(true);
    expect(matchesConditionalRule({ operator: 'lt', value: 10, style: {} }, 9)).toBe(true);
    expect(matchesConditionalRule({ operator: 'lte', value: 10, style: {} }, 10)).toBe(true);
    expect(matchesConditionalRule({ operator: 'contains', value: 'due', style: {} }, 'Overdue Invoice')).toBe(true);
    expect(matchesConditionalRule({ operator: 'empty', style: {} }, '')).toBe(true);
    expect(matchesConditionalRule({ operator: 'empty', style: {} }, 'x')).toBe(false);
    expect(matchesConditionalRule({ operator: 'notEmpty', style: {} }, 'x')).toBe(true);
  });

  it('never crashes on an unparseable numeric comparison — just no match', () => {
    expect(matchesConditionalRule({ operator: 'gt', value: 10, style: {} }, 'not a number')).toBe(false);
  });

  it('merges only matching rules over the base style, in array order (later wins)', () => {
    const base = { fontSize: 12 };
    const rules = [
      { operator: 'gt' as const, value: 100, style: { color: 'red', bold: true } },
      { operator: 'lt' as const, value: 100, style: { color: 'green' } },
      { operator: 'gt' as const, value: 0, style: { italic: true } },
    ];
    expect(resolveConditionalStyle(base, rules, 150)).toStrictEqual({
      fontSize: 12,
      color: 'red',
      bold: true,
      italic: true,
    });
  });

  it('returns the exact same base-style reference when there are no rules or none match', () => {
    const base = { fontSize: 12 };
    expect(resolveConditionalStyle(base, undefined, 150)).toBe(base);
    expect(resolveConditionalStyle(base, [{ operator: 'eq', value: 'x', style: { color: 'red' } }], 'y')).toBe(base);
  });
});

describe('renderToHtml — conditional formatting on a field element (memory.md D-031)', () => {
  it("applies a matching rule's style, merged over the element's base style", () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            elements: (b as FreeBand).elements.map((e) =>
              e.id === 'e2'
                ? {
                    ...e,
                    conditionalFormat: [
                      { operator: 'eq' as const, value: 'INV-1001', style: { color: '#b3261e', bold: true } },
                    ],
                  }
                : e,
            ),
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).toContain('color:#b3261e');
    expect(out.html).toContain('font-weight:700');
  });

  it("skips a non-matching rule — the field keeps its plain base style", () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      b.id === 'reportHeader'
        ? {
            ...(b as FreeBand),
            elements: (b as FreeBand).elements.map((e) =>
              e.id === 'e2'
                ? { ...e, conditionalFormat: [{ operator: 'eq' as const, value: 'NOT-THIS', style: { color: 'red' } }] }
                : e,
            ),
          }
        : b,
    );
    const out = renderToHtml(t, fatDocument(1));
    expect(out.html).not.toContain('color:red');
  });
});

describe('renderToHtml — conditional formatting on a detail column (memory.md D-031)', () => {
  it("highlights only the rows whose value in that column matches", () => {
    const t = invoiceTemplate();
    t.bands = t.bands.map((b) =>
      isDetailBandForTest(b)
        ? {
            ...b,
            columns: b.columns.map((c) =>
              c.column === 'qty'
                ? { ...c, conditionalFormat: [{ operator: 'gt' as const, value: 3, style: { bold: true, bg: '#fee' } }] }
                : c,
            ),
          }
        : b,
    );
    // fatDocument's qty cycles 1..5 across 5 rows; only qty:4 and qty:5 rows should be bold.
    // Scope the count to <tbody> only — reportHeader/totals elements in this
    // fixture are independently bold, which would otherwise pollute the count.
    const out = renderToHtml(t, fatDocument(5));
    const tbody = out.html.slice(out.html.indexOf('<tbody>'), out.html.indexOf('</tbody>'));
    const boldCells = (tbody.match(/font-weight:700/g) ?? []).length;
    expect(boldCells).toBe(2);
  });

  function isDetailBandForTest(b: Band): b is DetailBand {
    return b.type === 'detail';
  }
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

describe('numberToWords — "amount in words" (design.md §2 totals band)', () => {
  it('spells whole numbers, including scale words (thousand/million)', () => {
    expect(numberToWords(0)).toBe('Zero');
    expect(numberToWords(7)).toBe('Seven');
    expect(numberToWords(19)).toBe('Nineteen');
    expect(numberToWords(42)).toBe('Forty-Two');
    expect(numberToWords(100)).toBe('One Hundred');
    expect(numberToWords(1234)).toBe('One Thousand Two Hundred Thirty-Four');
    expect(numberToWords(1000000)).toBe('One Million');
    expect(numberToWords(2500000)).toBe('Two Million Five Hundred Thousand');
  });

  it('renders a fractional part as "and NN/100", not a second round of words', () => {
    expect(numberToWords(1234.56)).toBe('One Thousand Two Hundred Thirty-Four and 56/100');
    expect(numberToWords(9.5)).toBe('Nine and 50/100');
    expect(numberToWords(10)).toBe('Ten'); // no ".00" suffix when there's no fraction
  });

  it('prefixes negative values with "Negative"', () => {
    expect(numberToWords(-42)).toBe('Negative Forty-Two');
  });

  it('is wired into formatValue via the "words" ValueFormat', () => {
    expect(formatValue(1234.56, 'words')).toBe('One Thousand Two Hundred Thirty-Four and 56/100');
    expect(formatValue(null, 'words')).toBe('');
    expect(formatValue('not a number', 'words')).toBe('not a number');
  });
});
