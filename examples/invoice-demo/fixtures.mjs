// Demo fixtures for the StaticAdapter — deterministic scaffolding for local runs.
// This is DEMO data, not production truth (see designer memory.md D-015). It mimics
// the unidb demo schema (invoices → invoice_items) so the shape matches the real
// UnidbAdapter path.

export function invoiceEntity(lineCount = 60) {
  const items = Array.from({ length: lineCount }, (_, i) => ({
    id: i + 1,
    invoice_id: 1001,
    description: `Widget model X-${(100 + i).toString().padStart(4, '0')}`,
    qty: (i % 5) + 1,
    unit_price: Number((9.5 + (i % 13) * 1.25).toFixed(2)),
    line_total: Number((((i % 5) + 1) * (9.5 + (i % 13) * 1.25)).toFixed(2)),
  }));
  const total = items.reduce((s, r) => s + r.line_total, 0);

  return {
    meta: { name: 'invoice', label: 'Invoice' },
    headerFields: [
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
      { name: 'issued_at', label: 'Issued', type: 'date', kind: 'system' },
      { name: 'due_at', label: 'Due', type: 'date', kind: 'system' },
      { name: 'customer_name', label: 'Customer', type: 'text', kind: 'system' },
      { name: 'customer_city', label: 'City', type: 'text', kind: 'system' },
      { name: 'total_amount', label: 'Total', type: 'currency', kind: 'system' },
      // a "custom column" the ERP added — tagged custom by the adapter
      { name: 'po_reference', label: 'PO Reference', type: 'text', kind: 'custom' },
    ],
    datasets: [
      {
        meta: { id: 'invoice_items', label: 'invoice_items (via invoice_id)' },
        fields: [
          { name: 'description', label: 'Description', type: 'text', kind: 'system' },
          { name: 'qty', label: 'Qty', type: 'int', kind: 'system' },
          { name: 'unit_price', label: 'Unit Price', type: 'currency', kind: 'system' },
          { name: 'line_total', label: 'Amount', type: 'currency', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1001': {
        header: {
          invoice_number: 'INV-1001',
          issued_at: '2026-07-01',
          due_at: '2026-07-31',
          customer_name: 'Northwind Trading Co.',
          customer_city: 'Seattle',
          total_amount: Number(total.toFixed(2)),
          po_reference: 'PO-88213',
        },
        datasets: { invoice_items: items },
      },
    },
  };
}

export function invoiceTemplate() {
  return {
    version: 1,
    id: 'demo-invoice',
    name: 'Standard Invoice',
    docType: 'invoice',
    printSetup: {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 18, bottom: 20, left: 18 },
      unit: 'mm',
      showPageNumbers: true,
      pageNumberFormat: 'Page {page} of {pages}',
      currency: 'USD',
      locale: 'en-US',
    },
    dataSource: {
      entity: 'invoice',
      key: 'id',
      datasets: [
        {
          id: 'invoice_items',
          label: 'Line items',
          kind: 'fk',
          ref: { table: 'invoice_items', fkColumn: 'invoice_id' },
          orderBy: 'id',
        },
      ],
    },
    bands: [
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 150,
        elements: [
          { id: 'e1', kind: 'text', x: 0, y: 6, w: 300, h: 34, style: { fontSize: 26, bold: true, color: '#111' }, text: 'INVOICE' },
          { id: 'e2', kind: 'field', x: 0, y: 46, w: 320, h: 18, style: { fontSize: 12 }, label: 'Invoice #', binding: { source: 'header', column: 'invoice_number', format: 'text' } },
          { id: 'e3', kind: 'field', x: 0, y: 66, w: 320, h: 18, style: { fontSize: 12 }, label: 'PO', binding: { source: 'header', column: 'po_reference', format: 'text' } },
          { id: 'e4', kind: 'field', x: 360, y: 46, w: 200, h: 18, style: { fontSize: 12, align: 'right' }, binding: { source: 'header', column: 'issued_at', format: 'date' } },
          { id: 'e5', kind: 'field', x: 360, y: 66, w: 200, h: 18, style: { fontSize: 12, align: 'right' }, binding: { source: 'header', column: 'due_at', format: 'date' } },
          { id: 'e6', kind: 'field', x: 0, y: 104, w: 320, h: 18, style: { fontSize: 13, bold: true }, binding: { source: 'header', column: 'customer_name', format: 'text' } },
          { id: 'e7', kind: 'field', x: 0, y: 124, w: 320, h: 18, style: { fontSize: 12, color: '#555' }, binding: { source: 'header', column: 'customer_city', format: 'text' } },
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'invoice_items',
        keepRowTogether: true,
        columns: [
          { column: 'description', header: 'Description', width: 300, align: 'left', format: 'text' },
          { column: 'qty', header: 'Qty', width: 70, align: 'right', format: 'number' },
          { column: 'unit_price', header: 'Unit Price', width: 110, align: 'right', format: 'currency' },
          { column: 'line_total', header: 'Amount', width: 110, align: 'right', format: 'currency' },
        ],
        aggregates: [{ column: 'line_total', fn: 'sum', into: 'tfoot', label: 'Subtotal' }],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 110,
        elements: [
          { id: 't0', kind: 'text', x: 300, y: 12, w: 140, h: 22, style: { fontSize: 13, align: 'right' }, text: 'Grand Total' },
          { id: 't1', kind: 'field', x: 440, y: 12, w: 130, h: 22, style: { fontSize: 15, bold: true, align: 'right' }, binding: { source: 'header', column: 'total_amount', format: 'currency' } },
          { id: 't2', kind: 'text', x: 0, y: 60, w: 560, h: 40, style: { fontSize: 10, color: '#777' }, text: 'Payment due within 30 days. Thank you for your business.' },
        ],
      },
      {
        id: 'pageFooter',
        type: 'pageFooter',
        height: 30,
        enabled: true,
        elements: [
          // A thin top rule gives the footer a visible boundary from the
          // content above it — without one, plain centered gray text reads
          // as just more body copy, not a footer.
          { id: 'f0', kind: 'line', x: 0, y: 0, w: 560, h: 1, style: { border: '1px solid #e2e5e9' } },
          { id: 'f1', kind: 'text', x: 0, y: 10, w: 560, h: 16, style: { fontSize: 9, color: '#999', align: 'center' }, text: 'Northwind Trading Co.  ·  invoices@northwind.example  ·  +1 555 0100' },
        ],
      },
    ],
  };
}
