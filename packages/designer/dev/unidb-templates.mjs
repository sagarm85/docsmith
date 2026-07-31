// The two "Live —" reference templates seeded by dev/main.ts when
// VITE_ADAPTER=unidb (memory.md D-082) — same visual design as
// examples/reference-templates/fixtures.mjs's purchaseOrderElegantTemplate()/
// invoiceTealTemplate(), rebound to the real live schema dev/unidb-seed.mjs
// creates, instead of StaticAdapter fixture entities.
//
// Column names in that schema deliberately match these templates' own field
// bindings exactly, so — except where noted below — nothing needed
// rebinding, only dataSource.entity/dataset table names.
import { purchaseOrderElegantTemplate, invoiceTealTemplate } from '../../../examples/reference-templates/fixtures.mjs';

export function livePurchaseOrderElegantTemplate() {
  const t = purchaseOrderElegantTemplate();
  t.id = 'live-po-elegant';
  t.name = 'Live — Purchase Order (Elegant)';
  t.dataSource.entity = 'purchase_orders';
  t.dataSource.datasets[0].ref.fkColumn = 'order_id';
  // dataset id / ref.table / detail.datasetId are already 'po_line_items',
  // matching the real live child table name exactly — no rebinding needed.
  return t;
}

export function liveInvoiceTealTemplate() {
  const t = invoiceTealTemplate();
  t.id = 'live-invoice-teal';
  t.name = 'Live — Invoice (Teal)';
  t.dataSource.entity = 'invoices';
  // The fixture's own dataset id/ref.table is 'invoice_line_items' (a
  // label chosen for the demo, not a real table name) — the live schema's
  // real child table is 'invoice_items', so THIS one genuinely needs
  // rebinding to match what UnidbAdapter.getRelatedDatasets() actually
  // returns (datasetId == real child table name).
  t.dataSource.datasets[0].id = 'invoice_items';
  t.dataSource.datasets[0].ref.table = 'invoice_items';
  t.dataSource.datasets[0].ref.fkColumn = 'invoice_id';
  t.bands.find((b) => b.id === 'detail').datasetId = 'invoice_items';
  return t;
}
