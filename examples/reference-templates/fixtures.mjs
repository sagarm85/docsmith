// Reference-template fixtures — demo scaffolding (memory.md D-015), the same
// "deterministic StaticAdapter fixture" category as examples/invoice-demo, not
// shipped production truth. Each function pair (`xEntity()` / `xTemplate()`)
// recreates the STRUCTURE of a real-world reference document (a bordered sales
// contract, a shipping instruction, two purchase-order styles, a two-tone
// invoice) using DocSmith's actual primitives — grid arrangement + colSpan
// (memory.md D-034), multi-element stacked cells (memory.md D-045), detail-band
// aggregates, ElementStyle colors/borders — so opening one in the designer
// shows exactly how that look is built, not a pixel-for-pixel scan of the
// original. Logos are plain colored placeholders, never a redrawn trademark.

let _uid = 0;
function uid() {
  return `e${_uid++}`;
}

/** A static text element, ready to drop into a grid cell via `cell()` or used
 * directly (with real x/y/w/h) in a free-arrangement band. */
function t(text, style = {}) {
  return { id: uid(), kind: 'text', x: 0, y: 0, w: 0, h: 0, text, style };
}

/** A field element bound to a header column (or a dataset column when
 * `source` names one) — same zero x/y/w/h convention as `t()`, since grid
 * elements ignore them (memory.md D-034). */
function f(column, format, style = {}, source = 'header') {
  return { id: uid(), kind: 'field', x: 0, y: 0, w: 0, h: 0, binding: { source, column, format }, style };
}

/** Places a list of elements (from `t()`/`f()`) into one grid cell at
 * (row, col), stacked top-to-bottom (memory.md D-045) — the mechanism behind
 * every "label above value" pair and every multi-line address block below. */
function cell(row, col, colSpan, parts) {
  return parts.map((p) => ({ ...p, row, col, colSpan }));
}

/** A free-form absolutely-positioned element, for pageHeader/totals bands
 * that aren't grid-arranged. */
function el(kind, x, y, w, h, rest = {}) {
  return { id: uid(), kind, x, y, w, h, ...rest };
}

const LABEL_STYLE = { fontSize: 9, bold: true, color: '#666' };
const A4_PORTRAIT = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 16, right: 16, bottom: 16, left: 16 },
  unit: 'mm',
  showPageNumbers: true,
  pageNumberFormat: 'Page {page} of {pages}',
  currency: 'USD',
  locale: 'en-US',
};

// ─────────────────────────────────────────────────────────────────────────
// 1. Sales Contract — bordered metadata grid + line-item table
// ─────────────────────────────────────────────────────────────────────────

export function salesContractEntity() {
  return {
    meta: { name: 'salesContract', label: 'Sales Contract' },
    headerFields: [
      { name: 'contract_number', label: 'Invoice Number', type: 'text', kind: 'system' },
      { name: 'contract_date', label: 'Date', type: 'date', kind: 'system' },
      { name: 'delivery_date', label: 'Delivery Date', type: 'date', kind: 'system' },
      { name: 'seller_name', label: 'Seller Name', type: 'text', kind: 'system' },
      { name: 'seller_street', label: 'Seller Street', type: 'text', kind: 'system' },
      { name: 'seller_city', label: 'Seller City', type: 'text', kind: 'system' },
      { name: 'seller_country', label: 'Seller Country', type: 'text', kind: 'system' },
      { name: 'seller_phone', label: 'Seller Phone', type: 'text', kind: 'system' },
      { name: 'seller_tax_id', label: 'Seller Tax ID', type: 'text', kind: 'system' },
      { name: 'seller_contact', label: 'Seller Contact', type: 'text', kind: 'system' },
      { name: 'buyer_name', label: 'Buyer Name', type: 'text', kind: 'system' },
      { name: 'buyer_street', label: 'Buyer Street', type: 'text', kind: 'system' },
      { name: 'buyer_city', label: 'Buyer City', type: 'text', kind: 'system' },
      { name: 'buyer_country', label: 'Buyer Country', type: 'text', kind: 'system' },
      { name: 'buyer_phone', label: 'Buyer Phone', type: 'text', kind: 'system' },
      { name: 'buyer_contact', label: 'Buyer Contact', type: 'text', kind: 'system' },
      { name: 'method_of_dispatch', label: 'Method of Dispatch', type: 'text', kind: 'system' },
      { name: 'type_of_shipment', label: 'Type of Shipment', type: 'text', kind: 'system' },
      { name: 'port_of_loading', label: 'Port of Loading', type: 'text', kind: 'system' },
      { name: 'port_of_discharge', label: 'Port of Discharge', type: 'text', kind: 'system' },
      { name: 'terms_of_payment', label: 'Terms / Method of Payment', type: 'text', kind: 'system' },
      { name: 'total_amount', label: 'Total', type: 'currency', kind: 'system' },
      { name: 'incoterms', label: 'Incoterms', type: 'text', kind: 'system' },
      { name: 'currency_code', label: 'Currency', type: 'text', kind: 'system' },
    ],
    datasets: [
      {
        meta: { id: 'contract_items', label: 'Contract line items' },
        fields: [
          { name: 'product_code', label: 'Product Code', type: 'text', kind: 'system' },
          { name: 'description', label: 'Description of Goods', type: 'text', kind: 'system' },
          { name: 'unit_quantity', label: 'Unit Quantity', type: 'int', kind: 'system' },
          { name: 'unit_type', label: 'Unit Type', type: 'text', kind: 'system' },
          { name: 'price', label: 'Price', type: 'currency', kind: 'system' },
          { name: 'amount', label: 'Amount', type: 'currency', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1': {
        header: {
          contract_number: 'INV-34567S',
          contract_date: '2022-07-04',
          delivery_date: '2022-07-04',
          seller_name: 'ABC Exports',
          seller_street: '4300 Longbeach Blvd',
          seller_city: 'Longbeach, California, 90807',
          seller_country: 'United States',
          seller_phone: '+1 213 884 7711',
          seller_tax_id: '93377112',
          seller_contact: 'Randy Clarke',
          buyer_name: 'XYZ Imports',
          buyer_street: '410 Queen Street',
          buyer_city: 'Brisbane, Queensland, 4814',
          buyer_country: 'Australia',
          buyer_phone: '+61 404 822 536',
          buyer_contact: 'Bob Jones',
          method_of_dispatch: 'Sea',
          type_of_shipment: 'FCL',
          port_of_loading: 'Long Beach',
          port_of_discharge: 'Sydney',
          terms_of_payment: '30% deposit, balance upon bill of lading',
          total_amount: 19860,
          incoterms: 'Incoterms® 2020 — FOB Longbeach',
          currency_code: 'USD',
        },
        datasets: {
          contract_items: [
            {
              product_code: 'B-STOOL',
              description: 'Bar stool aluminium 500 x 100 x 100mm stainless steel',
              unit_quantity: 150,
              unit_type: 'EACH',
              price: 77.2,
              amount: 11580.0,
            },
            {
              product_code: 'B-TABLE',
              description: 'Bar table aluminium 1000 x 600 x 400mm stainless steel',
              unit_quantity: 75,
              unit_type: 'EACH',
              price: 110.4,
              amount: 8280.0,
            },
          ],
        },
      },
    },
  };
}

export function salesContractTemplate() {
  return {
    version: 1,
    id: 'ref-sales-contract',
    name: 'Reference — Sales Contract',
    docType: 'salesContract',
    printSetup: A4_PORTRAIT,
    dataSource: { entity: 'salesContract', key: 'id', datasets: [{ id: 'contract_items', label: 'Contract items', kind: 'fk', ref: { table: 'contract_items', fkColumn: 'contract_id' }, orderBy: 'id' }] },
    bands: [
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 30,
        enabled: true,
        elements: [
          // Width 673 matches this A4/16mm-margin template's real print
          // content width (page width minus left+right margins — see
          // core/render.ts's pageWidthPx doc comment; the same convention
          // the Invoice/Purchase Order templates' own pageHeader elements
          // already follow). It was previously 750, wider than the actual
          // page, which pushed the centered text visibly past the page's
          // right edge in both the Design canvas and print (reported
          // directly as "out of page alignment").
          el('text', 0, 4, 673, 26, { text: 'SALES CONTRACT', style: { fontSize: 19, bold: true, align: 'center' } }),
        ],
      },
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 0,
        arrangement: 'grid',
        gridColumns: [50, 50],
        gridBorder: '1px solid #444',
        elements: [
          ...cell(0, 0, 1, [
            t('Seller', { bold: true, fontSize: 10 }),
            f('seller_name', 'text', { bold: true }),
            f('seller_street', 'text'),
            f('seller_city', 'text'),
            f('seller_country', 'text'),
            f('seller_phone', 'text'),
            t('Tax ID:', LABEL_STYLE),
            f('seller_tax_id', 'text'),
            f('seller_contact', 'text'),
          ]),
          ...cell(0, 1, 1, [
            t('Invoice Number', LABEL_STYLE),
            f('contract_number', 'text', { bold: true }),
            t('Date', LABEL_STYLE),
            f('contract_date', 'date'),
          ]),
          ...cell(1, 0, 1, [
            t('Buyer', { bold: true, fontSize: 10 }),
            f('buyer_name', 'text', { bold: true }),
            f('buyer_street', 'text'),
            f('buyer_city', 'text'),
            f('buyer_country', 'text'),
            f('buyer_phone', 'text'),
            f('buyer_contact', 'text'),
          ]),
          ...cell(1, 1, 1, [t('Delivery Date', LABEL_STYLE), f('delivery_date', 'date')]),
          ...cell(2, 0, 1, [t('Method of Dispatch', LABEL_STYLE), f('method_of_dispatch', 'text')]),
          ...cell(2, 1, 1, [t('Type of Shipment', LABEL_STYLE), f('type_of_shipment', 'text')]),
          ...cell(3, 0, 1, [t('Port of Loading', LABEL_STYLE), f('port_of_loading', 'text')]),
          ...cell(3, 1, 1, [t('Port of Discharge', LABEL_STYLE), f('port_of_discharge', 'text')]),
          ...cell(4, 0, 2, [t('Terms / Method of Payment', LABEL_STYLE), f('terms_of_payment', 'text', { bold: true })]),
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'contract_items',
        keepRowTogether: true,
        columns: [
          { column: 'product_code', header: 'Product Code', width: 85, align: 'left', format: 'text' },
          { column: 'description', header: 'Description of Goods', width: 230, align: 'left', format: 'text' },
          { column: 'unit_quantity', header: 'Unit Quantity', width: 80, align: 'right', format: 'number' },
          { column: 'unit_type', header: 'Unit Type', width: 65, align: 'center', format: 'text' },
          { column: 'price', header: 'Price', width: 90, align: 'right', format: 'currency' },
          { column: 'amount', header: 'Amount', width: 100, align: 'right', format: 'currency' },
        ],
        aggregates: [{ column: 'amount', fn: 'sum', into: 'tfoot', label: 'Consignment Total' }],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 0,
        arrangement: 'grid',
        gridColumns: [55, 45],
        gridBorder: '1px solid #444',
        elements: [
          ...cell(0, 0, 1, [
            t('Conditions', LABEL_STYLE),
            t('Subject to our standard trading conditions.'),
          ]),
          ...cell(0, 1, 1, [
            t('TOTAL', LABEL_STYLE),
            f('total_amount', 'currency', { bold: true, fontSize: 15 }),
            f('incoterms', 'text'),
            f('currency_code', 'text'),
          ]),
          ...cell(1, 0, 1, [
            t('Bank Details', LABEL_STYLE),
            t('Account Name: ABC Exports'),
            t('Bank Account Number: 845590XXXX'),
            t('Bank Name: Community Federal Savings Bank'),
            t('SWIFT Code: CMFGUS33'),
          ]),
          ...cell(1, 1, 1, [
            t('Signatory Company', LABEL_STYLE),
            f('seller_name', 'text'),
            t('Name of Authorized Signatory', LABEL_STYLE),
            f('seller_contact', 'text'),
            t('Signature', LABEL_STYLE),
            t('(signed)', { italic: true, color: '#888' }),
          ]),
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Shipping Instruction — bordered metadata grid + a single-row shipment
//    summary table + a colored section divider inside the totals grid
// ─────────────────────────────────────────────────────────────────────────

export function shippingInstructionEntity() {
  return {
    meta: { name: 'shippingInstruction', label: 'Shipping Instruction' },
    headerFields: [
      { name: 'exporter_name', label: 'Exporter Name', type: 'text', kind: 'system' },
      { name: 'exporter_street', label: 'Exporter Street', type: 'text', kind: 'system' },
      { name: 'exporter_city', label: 'Exporter City', type: 'text', kind: 'system' },
      { name: 'exporter_phone', label: 'Exporter Phone', type: 'text', kind: 'system' },
      { name: 'exporter_tax_id', label: 'Exporter Tax ID', type: 'text', kind: 'system' },
      { name: 'consignee_name', label: 'Consignee Name', type: 'text', kind: 'system' },
      { name: 'consignee_street', label: 'Consignee Street', type: 'text', kind: 'system' },
      { name: 'consignee_city', label: 'Consignee City', type: 'text', kind: 'system' },
      { name: 'consignee_phone', label: 'Consignee Phone', type: 'text', kind: 'system' },
      { name: 'notify_party', label: 'Notify Party', type: 'text', kind: 'system' },
      { name: 'reference', label: 'Reference', type: 'text', kind: 'system' },
      { name: 'buyer_reference', label: 'Buyer Reference', type: 'text', kind: 'system' },
      { name: 'export_declaration_number', label: 'Export Declaration Number', type: 'text', kind: 'system' },
      { name: 'carrier_name', label: 'Carrier', type: 'text', kind: 'system' },
      { name: 'method_of_dispatch', label: 'Method of Dispatch', type: 'text', kind: 'system' },
      { name: 'type_of_shipment', label: 'Type of Shipment', type: 'text', kind: 'system' },
      { name: 'vessel_voyage_no', label: 'Vessel / Voyage No', type: 'text', kind: 'system' },
      { name: 'place_of_receipt', label: 'Place of Receipt', type: 'text', kind: 'system' },
      { name: 'port_of_loading', label: 'Port of Loading', type: 'text', kind: 'system' },
      { name: 'date_of_departure', label: 'Date of Departure', type: 'date', kind: 'system' },
      { name: 'port_of_discharge', label: 'Port of Discharge', type: 'text', kind: 'system' },
      { name: 'final_destination', label: 'Final Destination', type: 'text', kind: 'system' },
      { name: 'country_of_origin', label: 'Country of Origin', type: 'text', kind: 'system' },
      { name: 'country_of_final_destination', label: 'Country of Final Destination', type: 'text', kind: 'system' },
      { name: 'freight_charges', label: 'Freight Charges', type: 'text', kind: 'system' },
      { name: 'export_documents_instructions', label: 'Export Documents Instructions', type: 'text', kind: 'system' },
      { name: 'hazardous_goods', label: 'Hazardous Goods?', type: 'text', kind: 'system' },
      { name: 'letter_of_credit', label: 'Letter of Credit?', type: 'text', kind: 'system' },
      { name: 'special_instructions', label: 'Special Instructions', type: 'text', kind: 'system' },
      { name: 'place_and_date_of_issue', label: 'Place and Date of Issue', type: 'text', kind: 'system' },
      { name: 'signatory_name', label: 'Signatory Name', type: 'text', kind: 'system' },
    ],
    datasets: [
      {
        meta: { id: 'shipment_summary', label: 'Shipment summary' },
        fields: [
          { name: 'marks_and_numbers', label: 'Marks and Numbers', type: 'text', kind: 'system' },
          { name: 'kind_no_of_packages', label: 'Kind & No of Packages', type: 'text', kind: 'system' },
          { name: 'description_of_goods', label: 'Description of Goods', type: 'text', kind: 'system' },
          { name: 'gross_weight', label: 'Gross Weight', type: 'number', kind: 'system' },
          { name: 'measurements', label: 'Measurements (m³)', type: 'number', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1': {
        header: {
          exporter_name: 'ABC Exports',
          exporter_street: '4300 Longbeach Blvd',
          exporter_city: 'Longbeach, California, 90807',
          exporter_phone: '+1 213 884 7711',
          exporter_tax_id: '93377112',
          consignee_name: 'XYZ Imports',
          consignee_street: '410 Queen Street',
          consignee_city: 'Brisbane, Queensland, 4814',
          consignee_phone: '+61 404 822 536',
          notify_party: 'Same as consignee',
          reference: '34567',
          buyer_reference: 'PO223',
          export_declaration_number: 'X223344',
          carrier_name: 'DE Freight',
          method_of_dispatch: 'Sea',
          type_of_shipment: 'FCL',
          vessel_voyage_no: 'MAERSK · V0015',
          place_of_receipt: 'Long Beach',
          port_of_loading: 'Long Beach',
          date_of_departure: '2022-07-04',
          port_of_discharge: 'Sydney, Australia',
          final_destination: 'Sydney, Australia',
          country_of_origin: 'United States',
          country_of_final_destination: 'Australia',
          freight_charges: 'Collect',
          export_documents_instructions: 'Express Release / Waybill',
          hazardous_goods: 'No',
          letter_of_credit: 'No',
          special_instructions: '—',
          place_and_date_of_issue: 'Longbeach, 04 Jul 2022',
          signatory_name: 'Randy Clarke',
        },
        datasets: {
          shipment_summary: [
            {
              marks_and_numbers: 'XYZ IMPORTS · 34567',
              kind_no_of_packages: '16 x pallets',
              description_of_goods: 'Furniture, stainless steel bar stools and tables',
              gross_weight: 3225,
              measurements: 27,
            },
          ],
        },
      },
    },
  };
}

export function shippingInstructionTemplate() {
  return {
    version: 1,
    id: 'ref-shipping-instruction',
    name: 'Reference — Shipping Instruction',
    docType: 'shippingInstruction',
    printSetup: A4_PORTRAIT,
    dataSource: { entity: 'shippingInstruction', key: 'id', datasets: [{ id: 'shipment_summary', label: 'Shipment summary', kind: 'fk', ref: { table: 'shipment_summary', fkColumn: 'shipment_id' }, orderBy: 'id' }] },
    bands: [
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 30,
        enabled: true,
        elements: [
          // See salesContractTemplate()'s identical pageHeader element for
          // why this is 673, not the original (too-wide) 750.
          el('text', 0, 4, 673, 26, { text: 'SHIPPING INSTRUCTION', style: { fontSize: 19, bold: true, align: 'center' } }),
        ],
      },
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 0,
        arrangement: 'grid',
        gridColumns: [50, 50],
        gridBorder: '1px solid #444',
        elements: [
          ...cell(0, 0, 1, [
            t('Exporter', { bold: true, fontSize: 10 }),
            f('exporter_name', 'text', { bold: true }),
            f('exporter_street', 'text'),
            f('exporter_city', 'text'),
            f('exporter_phone', 'text'),
            t('Tax ID:', LABEL_STYLE),
            f('exporter_tax_id', 'text'),
          ]),
          ...cell(0, 1, 1, [
            t('Buyer Reference', LABEL_STYLE),
            f('buyer_reference', 'text'),
            t('Export Declaration Number', LABEL_STYLE),
            f('export_declaration_number', 'text'),
          ]),
          ...cell(1, 0, 1, [
            t('Consignee', { bold: true, fontSize: 10 }),
            f('consignee_name', 'text', { bold: true }),
            f('consignee_street', 'text'),
            f('consignee_city', 'text'),
            f('consignee_phone', 'text'),
          ]),
          ...cell(1, 1, 1, [t('Carrier', LABEL_STYLE), f('carrier_name', 'text', { bold: true })]),
          ...cell(2, 0, 1, [t('Notify Party', LABEL_STYLE), f('notify_party', 'text')]),
          ...cell(2, 1, 1, [t('Reference', LABEL_STYLE), f('reference', 'text')]),
          ...cell(3, 0, 1, [t('Method of Dispatch', LABEL_STYLE), f('method_of_dispatch', 'text')]),
          ...cell(3, 1, 1, [t('Type of Shipment', LABEL_STYLE), f('type_of_shipment', 'text')]),
          ...cell(4, 0, 1, [t('Vessel / Voyage No', LABEL_STYLE), f('vessel_voyage_no', 'text')]),
          ...cell(4, 1, 1, [t('Place of Receipt', LABEL_STYLE), f('place_of_receipt', 'text')]),
          ...cell(5, 0, 1, [t('Port of Loading', LABEL_STYLE), f('port_of_loading', 'text')]),
          ...cell(5, 1, 1, [t('Date of Departure', LABEL_STYLE), f('date_of_departure', 'date')]),
          ...cell(6, 0, 1, [t('Port of Discharge', LABEL_STYLE), f('port_of_discharge', 'text')]),
          ...cell(6, 1, 1, [t('Final Destination', LABEL_STYLE), f('final_destination', 'text')]),
          ...cell(7, 0, 1, [t('Country of Origin', LABEL_STYLE), f('country_of_origin', 'text')]),
          ...cell(7, 1, 1, [t('Country of Final Destination', LABEL_STYLE), f('country_of_final_destination', 'text')]),
          ...cell(8, 0, 1, [t('Freight Charges', LABEL_STYLE), f('freight_charges', 'text')]),
          ...cell(8, 1, 1, [t('Export Documents Instructions', LABEL_STYLE), f('export_documents_instructions', 'text')]),
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'shipment_summary',
        keepRowTogether: true,
        columns: [
          { column: 'marks_and_numbers', header: 'Marks and Numbers', width: 130, align: 'left', format: 'text' },
          { column: 'kind_no_of_packages', header: 'Kind & No of Packages', width: 120, align: 'left', format: 'text' },
          { column: 'description_of_goods', header: 'Description of Goods', width: 190, align: 'left', format: 'text' },
          { column: 'gross_weight', header: 'Gross Weight', width: 85, align: 'right', format: 'number' },
          { column: 'measurements', header: 'Measurements (m³)', width: 95, align: 'right', format: 'number' },
        ],
        aggregates: [
          { column: 'gross_weight', fn: 'sum', into: 'tfoot', label: 'Consignment Total' },
          { column: 'measurements', fn: 'sum', into: 'tfoot' },
        ],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 0,
        arrangement: 'grid',
        gridColumns: [50, 50],
        gridBorder: '1px solid #444',
        elements: [
          ...cell(0, 0, 2, [
            t('Export documents', { bold: true, fontSize: 22, align: 'center', color: '#fff', bg: '#3fae8a', padding: 10 }),
          ]),
          ...cell(1, 0, 1, [t('Does this shipment contain hazardous/dangerous goods?', LABEL_STYLE), f('hazardous_goods', 'text')]),
          ...cell(1, 1, 1, [t('Is this shipment on Letter of Credit?', LABEL_STYLE), f('letter_of_credit', 'text')]),
          ...cell(2, 0, 1, [t('Special Instructions', LABEL_STYLE), f('special_instructions', 'text')]),
          ...cell(2, 1, 1, [t('Place and Date of Issue', LABEL_STYLE), f('place_and_date_of_issue', 'text')]),
          ...cell(3, 0, 1, [t("Carrier's terms and conditions here…", { italic: true, color: '#888' })]),
          ...cell(3, 1, 1, [
            t('Signatory Company', LABEL_STYLE),
            f('exporter_name', 'text'),
            t('Name of Authorized Signatory', LABEL_STYLE),
            f('signatory_name', 'text'),
            t('Signature', LABEL_STYLE),
            t('(signed)', { italic: true, color: '#888' }),
          ]),
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 3 & 4. Purchase Orders — colored-bar Vendor/Ship-To grid + detail table,
//    two color themes sharing one builder
// ─────────────────────────────────────────────────────────────────────────

function purchaseOrderEntity(name, label) {
  return {
    meta: { name, label },
    headerFields: [
      { name: 'po_number', label: 'PO #', type: 'text', kind: 'system' },
      { name: 'po_date', label: 'Date', type: 'date', kind: 'system' },
      { name: 'vendor_contact', label: 'Vendor Contact', type: 'text', kind: 'system' },
      { name: 'vendor_company', label: 'Vendor Company', type: 'text', kind: 'system' },
      { name: 'vendor_street', label: 'Vendor Street', type: 'text', kind: 'system' },
      { name: 'vendor_city', label: 'Vendor City', type: 'text', kind: 'system' },
      { name: 'vendor_phone', label: 'Vendor Phone', type: 'text', kind: 'system' },
      { name: 'ship_to_name', label: 'Ship To Name', type: 'text', kind: 'system' },
      { name: 'ship_to_company', label: 'Ship To Company', type: 'text', kind: 'system' },
      { name: 'ship_to_street', label: 'Ship To Street', type: 'text', kind: 'system' },
      { name: 'ship_to_city', label: 'Ship To City', type: 'text', kind: 'system' },
      { name: 'ship_to_phone', label: 'Ship To Phone', type: 'text', kind: 'system' },
      { name: 'requisitioner', label: 'Requisitioner', type: 'text', kind: 'system' },
      { name: 'ship_via', label: 'Ship Via', type: 'text', kind: 'system' },
      { name: 'fob', label: 'F.O.B.', type: 'text', kind: 'system' },
      { name: 'shipping_terms', label: 'Shipping Terms', type: 'text', kind: 'system' },
      { name: 'comments', label: 'Comments', type: 'text', kind: 'system' },
      { name: 'subtotal', label: 'Subtotal', type: 'currency', kind: 'system' },
      { name: 'tax', label: 'Tax', type: 'currency', kind: 'system' },
      { name: 'shipping', label: 'Shipping', type: 'currency', kind: 'system' },
      { name: 'other', label: 'Other', type: 'currency', kind: 'system' },
      { name: 'total', label: 'Total', type: 'currency', kind: 'system' },
      { name: 'approved_by', label: 'Approved By', type: 'text', kind: 'system' },
    ],
    datasets: [
      {
        meta: { id: 'po_items', label: 'PO line items' },
        fields: [
          { name: 'item_number', label: 'Item #', type: 'text', kind: 'system' },
          { name: 'description', label: 'Description', type: 'text', kind: 'system' },
          { name: 'qty', label: 'Qty', type: 'int', kind: 'system' },
          { name: 'unit_price', label: 'Unit Price', type: 'currency', kind: 'system' },
          { name: 'total', label: 'Total', type: 'currency', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1': {
        header: {
          po_number: '123456',
          po_date: '2024-07-16',
          vendor_contact: 'Contact or Department',
          vendor_company: '[Company Name]',
          vendor_street: '[Street Address]',
          vendor_city: '[City, ST ZIP]',
          vendor_phone: '(000) 000-0000',
          ship_to_name: '[Name]',
          ship_to_company: '[Company Name]',
          ship_to_street: '[Street Address]',
          ship_to_city: '[City, ST ZIP]',
          ship_to_phone: '(000) 000-0000',
          requisitioner: '—',
          ship_via: '—',
          fob: '—',
          shipping_terms: '—',
          comments: 'If you have any questions about this purchase order, please contact [Name, Phone #, E-mail]',
          subtotal: 2325.0,
          tax: 0,
          shipping: 0,
          other: 0,
          total: 2325.0,
          approved_by: 'Full name',
        },
        datasets: {
          po_items: [
            { item_number: '23423423', description: 'Product XYZ', qty: 15, unit_price: 150.0, total: 2250.0 },
            { item_number: '45645645', description: 'Product ABC', qty: 1, unit_price: 75.0, total: 75.0 },
          ],
        },
      },
    },
  };
}

function purchaseOrderTemplate(id, name, entity, accent, accentText = '#ffffff') {
  // padding matters as soon as a label has its own background — without it
  // the text sits flush against the box edges, cramped against the color
  // (and against any corner radius, once one's set).
  const barStyle = { bold: true, color: accentText, bg: accent, fontSize: 10, padding: 4 };
  return {
    version: 1,
    id,
    name,
    docType: 'purchaseOrder',
    printSetup: A4_PORTRAIT,
    dataSource: { entity, key: 'id', datasets: [{ id: 'po_items', label: 'PO items', kind: 'fk', ref: { table: 'po_items', fkColumn: 'po_id' }, orderBy: 'id' }] },
    bands: [
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 46,
        enabled: true,
        elements: [
          el('box', 0, 4, 60, 36, { style: { bg: accent, borderRadius: 6 } }),
          el('text', 0, 14, 60, 16, { text: 'LOGO', style: { align: 'center', color: accentText, fontSize: 9, bold: true } }),
          // Right edge lands at 673px — the real print content width for this
          // A4/16mm-margin template (page width minus left+right margins;
          // see core/render.ts's pageWidthPx doc comment) — not the ~794px
          // full, unreduced page size. A pageHeader/pageFooter band is
          // `position:fixed` (painted on every printed sheet), and Chromium's
          // print auto-fit scale doesn't count fixed-position content the
          // same way it counts normal content, so anything positioned past
          // the true printable width here risks getting silently clipped.
          el('text', 260, 4, 413, 30, { text: 'PURCHASE ORDER', style: { fontSize: 20, bold: true, align: 'right', color: accent } }),
        ],
      },
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 0,
        arrangement: 'grid',
        gridColumns: [25, 25, 25, 25],
        elements: [
          ...cell(0, 0, 2, [
            t('VENDOR', barStyle),
            f('vendor_contact', 'text'),
            f('vendor_company', 'text'),
            f('vendor_street', 'text'),
            f('vendor_city', 'text'),
            f('vendor_phone', 'text'),
          ]),
          ...cell(0, 2, 2, [
            t('SHIP TO', barStyle),
            f('ship_to_name', 'text'),
            f('ship_to_company', 'text'),
            f('ship_to_street', 'text'),
            f('ship_to_city', 'text'),
            f('ship_to_phone', 'text'),
          ]),
          ...cell(1, 0, 1, [t('DATE', barStyle), f('po_date', 'date')]),
          ...cell(1, 1, 1, [t('PO #', barStyle), f('po_number', 'text')]),
          ...cell(1, 2, 1, [t('REQUISITIONER', barStyle), f('requisitioner', 'text')]),
          ...cell(1, 3, 1, [t('SHIP VIA', barStyle), f('ship_via', 'text')]),
          ...cell(2, 0, 1, [t('F.O.B.', barStyle), f('fob', 'text')]),
          ...cell(2, 1, 3, [t('SHIPPING TERMS', barStyle), f('shipping_terms', 'text')]),
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'po_items',
        keepRowTogether: true,
        columns: [
          { column: 'item_number', header: 'Item #', width: 90, align: 'left', format: 'text' },
          { column: 'description', header: 'Description', width: 260, align: 'left', format: 'text' },
          { column: 'qty', header: 'Qty', width: 60, align: 'right', format: 'number' },
          { column: 'unit_price', header: 'Unit Price', width: 100, align: 'right', format: 'currency' },
          { column: 'total', header: 'Total', width: 100, align: 'right', format: 'currency' },
        ],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 140,
        elements: [
          el('text', 0, 10, 280, 18, { text: 'Comments or Special Instructions', style: { fontSize: 10, bg: accent, color: accentText, bold: true, padding: 4 } }),
          el('field', 0, 32, 280, 50, { binding: { source: 'header', column: 'comments', format: 'text' }, style: { fontSize: 9, color: '#555' } }),
          // Label/value columns match the detail table's own Qty+Unit Price /
          // Total column boundaries (same technique as the Invoice reference
          // template's totals block — see its own comment for the full
          // reasoning): this template's detail columns are 90/260/60/100/100
          // declared px under table-layout:fixed, which act as RATIOS of the
          // real 673px print content width, not literal pixels. Qty+Unit
          // Price render at ~386-563px, Total at ~563-673px, so the label
          // column (386-563) and value column (563-673) below reproduce that
          // exactly, keeping the totals block flush with the table above it.
          el('text', 386, 10, 177, 18, { text: 'SUBTOTAL', style: { fontSize: 10, bold: true } }),
          el('field', 563, 10, 110, 18, { binding: { source: 'header', column: 'subtotal', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 386, 30, 177, 18, { text: 'TAX', style: { fontSize: 10, bold: true } }),
          el('field', 563, 30, 110, 18, { binding: { source: 'header', column: 'tax', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 386, 50, 177, 18, { text: 'SHIPPING', style: { fontSize: 10, bold: true } }),
          el('field', 563, 50, 110, 18, { binding: { source: 'header', column: 'shipping', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 386, 70, 177, 18, { text: 'OTHER', style: { fontSize: 10, bold: true } }),
          el('field', 563, 70, 110, 18, { binding: { source: 'header', column: 'other', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 386, 94, 177, 24, { text: 'TOTAL', style: { fontSize: 12, bold: true, bg: '#f4c542', padding: 4 } }),
          el('field', 563, 94, 110, 24, { binding: { source: 'header', column: 'total', format: 'currency' }, style: { fontSize: 12, bold: true, align: 'right', bg: '#f4c542', padding: 4 } }),
          el('text', 0, 116, 560, 16, { text: 'Approved by:', style: { fontSize: 9, color: '#888' } }),
          el('field', 90, 116, 200, 16, { binding: { source: 'header', column: 'approved_by', format: 'text' }, style: { fontSize: 9 } }),
        ],
      },
    ],
  };
}

export function purchaseOrderBlueEntity() {
  return purchaseOrderEntity('purchaseOrderBlue', 'Purchase Order (Blue)');
}
export function purchaseOrderBlueTemplate() {
  return purchaseOrderTemplate('ref-po-blue', 'Reference — Purchase Order (Blue)', 'purchaseOrderBlue', '#1c5fd1');
}

export function purchaseOrderPeachEntity() {
  return purchaseOrderEntity('purchaseOrderPeach', 'Purchase Order (Peach)');
}
export function purchaseOrderPeachTemplate() {
  return purchaseOrderTemplate('ref-po-peach', 'Reference — Purchase Order (Peach)', 'purchaseOrderPeach', '#f2a97e', '#5a3a20');
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Invoice — two-tone dark/orange header, borderless striped-look table
// ─────────────────────────────────────────────────────────────────────────

export function invoiceOrangeEntity() {
  return {
    meta: { name: 'invoiceOrange', label: 'Invoice (Orange)' },
    headerFields: [
      { name: 'invoice_number', label: 'Invoice No', type: 'text', kind: 'system' },
      { name: 'account_number', label: 'Account No', type: 'text', kind: 'system' },
      { name: 'invoice_date', label: 'Invoice Date', type: 'date', kind: 'system' },
      { name: 'total_due', label: 'Total Due', type: 'currency', kind: 'system' },
      { name: 'customer_name', label: 'Customer Name', type: 'text', kind: 'system' },
      { name: 'customer_street', label: 'Customer Street', type: 'text', kind: 'system' },
      { name: 'customer_city', label: 'Customer City', type: 'text', kind: 'system' },
      { name: 'customer_phone', label: 'Customer Phone', type: 'text', kind: 'system' },
      { name: 'customer_email', label: 'Customer Email', type: 'text', kind: 'system' },
      { name: 'terms', label: 'Terms & Condition', type: 'text', kind: 'system' },
      { name: 'account_number_bank', label: 'Bank Account #', type: 'text', kind: 'system' },
      { name: 'account_name', label: 'A/C Name', type: 'text', kind: 'system' },
      { name: 'bank_details', label: 'Bank Details', type: 'text', kind: 'system' },
      { name: 'subtotal', label: 'Sub Total', type: 'currency', kind: 'system' },
      { name: 'tax_vat', label: 'Tax & VAT', type: 'currency', kind: 'system' },
      { name: 'discount', label: 'Discount', type: 'currency', kind: 'system' },
      { name: 'grand_total', label: 'Grand Total', type: 'currency', kind: 'system' },
      { name: 'phone', label: 'Phone', type: 'text', kind: 'system' },
      { name: 'website', label: 'Website', type: 'text', kind: 'system' },
      { name: 'address', label: 'Address', type: 'text', kind: 'system' },
    ],
    datasets: [
      {
        meta: { id: 'invoice_lines', label: 'Invoice line items' },
        fields: [
          { name: 'sl', label: 'SL.', type: 'int', kind: 'system' },
          { name: 'item_description', label: 'Item Description', type: 'text', kind: 'system' },
          { name: 'price', label: 'Price', type: 'currency', kind: 'system' },
          { name: 'qty', label: 'Qty.', type: 'int', kind: 'system' },
          { name: 'total', label: 'Total', type: 'currency', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1': {
        header: {
          invoice_number: '123456',
          account_number: '123456',
          invoice_date: '2020-07-07',
          total_due: 210.0,
          customer_name: 'Name Surname',
          customer_street: '123 street',
          customer_city: 'City, State, Your Country, 123',
          customer_phone: '+1 234 567 890',
          customer_email: 'loremipsum@email.com',
          terms: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.',
          account_number_bank: '123 456 789',
          account_name: 'Lorem Ipsum',
          bank_details: 'Your Bank Details',
          subtotal: 220.0,
          tax_vat: 15.0,
          discount: 25.0,
          grand_total: 210.0,
          phone: 'Phone',
          website: 'Website',
          address: 'Address',
        },
        datasets: {
          invoice_lines: [
            { sl: 1, item_description: 'Lorem Ipsum Dolor', price: 80.0, qty: 1, total: 80.0 },
            { sl: 2, item_description: 'Lorem Ipsum Dolor', price: 20.0, qty: 2, total: 40.0 },
            { sl: 3, item_description: 'Lorem Ipsum Dolor', price: 30.0, qty: 3, total: 90.0 },
            { sl: 4, item_description: 'Lorem Ipsum Dolor', price: 10.0, qty: 1, total: 10.0 },
          ],
        },
      },
    },
  };
}

export function invoiceOrangeTemplate() {
  const orange = '#f5a13c';
  const dark = '#4b4b4b';
  return {
    version: 1,
    id: 'ref-invoice-orange',
    name: 'Reference — Invoice (Orange)',
    docType: 'invoiceOrange',
    printSetup: A4_PORTRAIT,
    dataSource: { entity: 'invoiceOrange', key: 'id', datasets: [{ id: 'invoice_lines', label: 'Invoice lines', kind: 'fk', ref: { table: 'invoice_lines', fkColumn: 'invoice_id' }, orderBy: 'sl' }] },
    bands: [
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 0,
        arrangement: 'grid',
        gridColumns: [55, 45],
        elements: [
          ...cell(0, 0, 1, [
            t('BRANDNAME', { bold: true, fontSize: 16, color: orange, bg: dark, padding: 10 }),
            t('Your Company Slogan', { fontSize: 9, color: '#ddd', bg: dark, padding: 6 }),
          ]),
          ...cell(0, 1, 1, [
            t('INVOICE', { bold: true, fontSize: 22, align: 'right', bg: orange, color: '#222', padding: 10 }),
          ]),
          ...cell(1, 0, 1, [
            t('Invoice To', LABEL_STYLE),
            f('customer_name', 'text', { bold: true }),
            f('customer_street', 'text'),
            f('customer_city', 'text'),
            f('customer_phone', 'text'),
            f('customer_email', 'text'),
          ]),
          ...cell(1, 1, 1, [
            t('Total Due', { fontSize: 9, color: '#666' }),
            f('total_due', 'currency', { bold: true, fontSize: 14 }),
            t('Invoice No', LABEL_STYLE),
            f('invoice_number', 'text'),
            t('Account No', LABEL_STYLE),
            f('account_number', 'text'),
            t('Invoice Date', LABEL_STYLE),
            f('invoice_date', 'date'),
          ]),
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'invoice_lines',
        keepRowTogether: true,
        cellBorder: 'none',
        columns: [
          { column: 'sl', header: 'SL.', width: 40, align: 'left', format: 'number' },
          { column: 'item_description', header: 'Item Description', width: 260, align: 'left', format: 'text' },
          { column: 'price', header: 'Price', width: 90, align: 'right', format: 'currency' },
          { column: 'qty', header: 'Qty.', width: 60, align: 'right', format: 'number' },
          { column: 'total', header: 'Total', width: 90, align: 'right', format: 'currency' },
        ],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 150,
        elements: [
          el('text', 0, 14, 280, 18, { text: 'Term & Condition', style: { fontSize: 10, bold: true, color: orange } }),
          el('field', 0, 34, 280, 50, { binding: { source: 'header', column: 'terms', format: 'text' }, style: { fontSize: 9, color: '#555' } }),
          el('text', 0, 92, 280, 16, { text: 'Payment Method', style: { fontSize: 10, bold: true, color: orange } }),
          el('text', 0, 110, 90, 16, { text: 'Account #:', style: { fontSize: 9, bold: true } }),
          el('field', 90, 110, 190, 16, { binding: { source: 'header', column: 'account_number_bank', format: 'text' }, style: { fontSize: 9 } }),
          el('text', 0, 126, 90, 16, { text: 'A/C Name:', style: { fontSize: 9, bold: true } }),
          el('field', 90, 126, 190, 16, { binding: { source: 'header', column: 'account_name', format: 'text' }, style: { fontSize: 9 } }),
          el('text', 0, 142, 90, 16, { text: 'Bank Details:', style: { fontSize: 9, bold: true } }),
          el('field', 90, 142, 190, 16, { binding: { source: 'header', column: 'bank_details', format: 'text' }, style: { fontSize: 9 } }),

          // Summary block laid out as a "sub-table" continuing the detail
          // table's last two columns, not just flush-right: the real print
          // content width for this A4/16mm-margin template is 673px (page
          // width minus left+right margins — measured directly off a real
          // generated PDF/Preview, not the ~794px full, unreduced page size),
          // and the detail table's fixed-px column widths (40/260/90/60/90,
          // table-layout:fixed) act as RATIOS of that 673px, not literal
          // pixels — Price+Qty render at 374-561px, Total at 561-673px. The
          // label column (374-561) and value column (561-673) below match
          // those exactly, so this block reads as a natural continuation of
          // the line-item table above it (values under "Total", labels under
          // "Price"/"Qty.") instead of an unrelated floating box, and its
          // right edge lands flush with the table's/header's own right edge.
          el('text', 374, 10, 187, 20, { text: 'SUB TOTAL:', style: { fontSize: 10, bold: true, bg: orange, padding: 4 } }),
          el('field', 561, 10, 112, 20, { binding: { source: 'header', column: 'subtotal', format: 'currency' }, style: { fontSize: 10, align: 'right', bold: true, bg: orange, padding: 4 } }),
          el('text', 374, 32, 187, 20, { text: 'TAX & VAT:', style: { fontSize: 10, bold: true, bg: orange, padding: 4 } }),
          el('field', 561, 32, 112, 20, { binding: { source: 'header', column: 'tax_vat', format: 'currency' }, style: { fontSize: 10, align: 'right', bold: true, bg: orange, padding: 4 } }),
          el('text', 374, 54, 187, 20, { text: 'DISCOUNT:', style: { fontSize: 10, bold: true, bg: orange, padding: 4 } }),
          el('field', 561, 54, 112, 20, { binding: { source: 'header', column: 'discount', format: 'currency' }, style: { fontSize: 10, align: 'right', bold: true, bg: orange, padding: 4 } }),
          el('text', 374, 80, 187, 30, { text: 'GRAND TOTAL', style: { fontSize: 14, bold: true, color: '#fff', bg: dark, padding: 6 } }),
          el('field', 561, 80, 112, 30, { binding: { source: 'header', column: 'grand_total', format: 'currency' }, style: { fontSize: 14, bold: true, align: 'right', color: '#fff', bg: dark, padding: 6 } }),
        ],
      },
      {
        id: 'pageFooter',
        type: 'pageFooter',
        height: 26,
        enabled: true,
        elements: [
          el('field', 0, 6, 180, 16, { binding: { source: 'header', column: 'phone', format: 'text' }, style: { fontSize: 9, align: 'center' } }),
          el('field', 190, 6, 180, 16, { binding: { source: 'header', column: 'website', format: 'text' }, style: { fontSize: 9, align: 'center' } }),
          el('field', 380, 6, 180, 16, { binding: { source: 'header', column: 'address', format: 'text' }, style: { fontSize: 9, align: 'center' } }),
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Purchase Order (Elegant) — cream rounded info-boxes, free-form title +
//    floating Order Ref box, matches a user-supplied reference document.
//
// Two real ElementStyle limits (not addressed by this template, since core's
// element model doesn't support them — see memory.md D-079 for the fuller
// writeup): no per-element font-family (the reference's script "P" and serif
// body text both render in the fixed system sans-serif stack instead), and
// no letter-spacing (the reference's tracked small-caps labels are
// approximated with literal spaces between characters via `spaced()` below,
// not real CSS letter-spacing). The detail table's own column-header row is
// ALSO a fixed light gray (`#f6f7f9`) in every template — core/render.ts's
// `table.detail thead th` rule has no per-template override — so it can't be
// cream here despite the rest of the palette matching.
// ─────────────────────────────────────────────────────────────────────────

/** Approximates letter-spaced tracking (not a real CSS property here) by
 * inserting a literal space between every character. */
function spaced(str) {
  return str.split('').join(' ');
}

export function purchaseOrderElegantEntity() {
  return {
    meta: { name: 'purchaseOrderElegant', label: 'Purchase Order (Elegant)' },
    headerFields: [
      { name: 'order_number', label: 'Order Number', type: 'text', kind: 'system' },
      { name: 'order_date', label: 'Order Date', type: 'date', kind: 'system' },
      { name: 'vendor_ref', label: 'Vendor Ref', type: 'text', kind: 'system' },
      { name: 'vendor_company', label: 'Vendor Company', type: 'text', kind: 'system' },
      { name: 'vendor_street', label: 'Vendor Street', type: 'text', kind: 'system' },
      { name: 'vendor_postcode', label: 'Vendor Postcode', type: 'text', kind: 'system' },
      { name: 'vendor_attn', label: 'Vendor Attn', type: 'text', kind: 'system' },
      { name: 'shipping_address', label: 'Shipping Address', type: 'text', kind: 'system' },
      { name: 'shipping_method', label: 'Shipping Method', type: 'text', kind: 'system' },
      { name: 'shipping_attn', label: 'Shipping Attn', type: 'text', kind: 'system' },
      { name: 'notes', label: 'Notes', type: 'text', kind: 'custom' },
      { name: 'approved_by', label: 'Approved By', type: 'text', kind: 'system' },
      { name: 'subtotal', label: 'Subtotal', type: 'currency', kind: 'system' },
      { name: 'discount', label: 'Discount', type: 'currency', kind: 'system' },
      { name: 'tax', label: 'Tax', type: 'currency', kind: 'system' },
      { name: 'shipping_cost', label: 'Shipping', type: 'currency', kind: 'system' },
      { name: 'total', label: 'Total', type: 'currency', kind: 'system' },
    ],
    datasets: [
      {
        meta: { id: 'po_line_items', label: 'PO line items' },
        fields: [
          { name: 'item_code', label: 'Item', type: 'text', kind: 'system' },
          { name: 'description', label: 'Description', type: 'text', kind: 'system' },
          { name: 'quantity', label: 'Quantity', type: 'int', kind: 'system' },
          { name: 'price', label: 'Price', type: 'currency', kind: 'system' },
          { name: 'amount', label: 'Amount', type: 'currency', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1': {
        header: {
          order_number: '#100',
          order_date: '2024-01-10',
          vendor_ref: 'SU123',
          vendor_company: 'White Paper Inc',
          vendor_street: '1 Fairfax Blvd',
          vendor_postcode: '123222',
          vendor_attn: 'Mr W Paper',
          shipping_address: '(As above)',
          shipping_method: 'Courier',
          shipping_attn: 'Warehouse Manager',
          notes: '',
          approved_by: '',
          subtotal: 1000,
          discount: 0,
          tax: 100,
          shipping_cost: 50,
          total: 1150,
        },
        datasets: {
          po_line_items: [
            { item_code: 'HQ1234', description: 'High quality white paper A4', quantity: 1000, price: 1.0, amount: 1000 },
          ],
        },
      },
    },
  };
}

export function purchaseOrderElegantTemplate() {
  const cream = '#efe9e0';
  const logoPlaceholder = '#c9a97e';
  return {
    version: 1,
    id: 'ref-po-elegant',
    name: 'Reference — Purchase Order (Elegant)',
    docType: 'purchaseOrderElegant',
    printSetup: A4_PORTRAIT,
    dataSource: { entity: 'purchaseOrderElegant', key: 'id', datasets: [{ id: 'po_line_items', label: 'PO line items', kind: 'fk', ref: { table: 'po_line_items', fkColumn: 'order_id' }, orderBy: 'id' }] },
    bands: [
      // Repeats every printed page (memory.md D-070): the issuer's own
      // letterhead — static text, not data-bound, since it's the same on
      // every PO this company sends, matching invoice-demo's pageFooter
      // convention for the issuer's own contact line.
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 90,
        enabled: true,
        elements: [
          // A real image element (not a colored box) — swap in the actual
          // logo by setting src.value to a hosted URL; no template
          // restructuring needed. Empty src renders an honest placeholder
          // (core/render.ts's el-image-empty), never a fabricated
          // trademark redraw (memory.md D-079/D-083).
          el('image', 260, 4, 150, 70, { src: { kind: 'url', value: '' }, style: { bg: logoPlaceholder, borderRadius: 8 } }),
          el('text', 423, 0, 250, 16, { text: 'Intelli Print', style: { align: 'right', fontSize: 11, bold: true } }),
          el('text', 423, 17, 250, 68, { text: "1 O'Connell St\nWestport\nCo Mayo\nIreland", style: { align: 'right', fontSize: 10, color: '#444' } }),
        ],
      },
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 400,
        elements: [
          el('text', 0, 10, 300, 90, { text: 'PURCHASE\nORDER', style: { fontSize: 34, bold: true, lineHeight: 1.05 } }),

          el('box', 400, 10, 273, 130, { style: { bg: cream, borderRadius: 12 } }),
          el('text', 400, 22, 273, 16, { text: spaced('ORDER REF'), style: { align: 'center', fontSize: 10, bold: true, color: '#555' } }),
          el('text', 420, 52, 130, 18, { text: 'Order number:', style: { fontSize: 10 } }),
          el('field', 560, 52, 95, 18, { binding: { source: 'header', column: 'order_number', format: 'text' }, style: { fontSize: 10, bold: true } }),
          el('text', 420, 80, 130, 18, { text: 'Order date:', style: { fontSize: 10 } }),
          el('field', 560, 80, 95, 18, { binding: { source: 'header', column: 'order_date', format: 'date' }, style: { fontSize: 10 } }),
          el('text', 420, 108, 130, 18, { text: 'Vendor ref:', style: { fontSize: 10 } }),
          el('field', 560, 108, 95, 18, { binding: { source: 'header', column: 'vendor_ref', format: 'text' }, style: { fontSize: 10 } }),

          el('box', 0, 170, 330, 180, { style: { bg: cream, borderRadius: 12 } }),
          el('text', 0, 182, 330, 16, { text: spaced('VENDOR'), style: { align: 'center', fontSize: 10, bold: true, color: '#555' } }),
          el('text', 20, 212, 90, 16, { text: 'Address:', style: { fontSize: 10 } }),
          el('field', 120, 212, 190, 16, { binding: { source: 'header', column: 'vendor_company', format: 'text' }, style: { fontSize: 10 } }),
          el('field', 120, 230, 190, 16, { binding: { source: 'header', column: 'vendor_street', format: 'text' }, style: { fontSize: 10 } }),
          el('field', 120, 248, 190, 16, { binding: { source: 'header', column: 'vendor_postcode', format: 'text' }, style: { fontSize: 10 } }),
          el('text', 20, 292, 90, 16, { text: 'Attn:', style: { fontSize: 10 } }),
          el('field', 120, 292, 190, 16, { binding: { source: 'header', column: 'vendor_attn', format: 'text' }, style: { fontSize: 10 } }),

          el('box', 343, 170, 330, 180, { style: { bg: cream, borderRadius: 12 } }),
          el('text', 343, 182, 330, 16, { text: spaced('SHIPPING'), style: { align: 'center', fontSize: 10, bold: true, color: '#555' } }),
          el('text', 363, 212, 90, 16, { text: 'Address:', style: { fontSize: 10 } }),
          el('field', 463, 212, 190, 16, { binding: { source: 'header', column: 'shipping_address', format: 'text' }, style: { fontSize: 10 } }),
          el('text', 363, 240, 90, 16, { text: 'Method:', style: { fontSize: 10 } }),
          el('field', 463, 240, 190, 16, { binding: { source: 'header', column: 'shipping_method', format: 'text' }, style: { fontSize: 10 } }),
          el('text', 363, 292, 90, 16, { text: 'Attn:', style: { fontSize: 10 } }),
          el('field', 463, 292, 190, 16, { binding: { source: 'header', column: 'shipping_attn', format: 'text' }, style: { fontSize: 10 } }),

          el('text', 0, 370, 300, 20, { text: spaced('ORDER DETAILS:'), style: { fontSize: 11, bold: true } }),
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'po_line_items',
        keepRowTogether: true,
        columns: [
          { column: 'item_code', header: 'Item', width: 90, align: 'left', format: 'text' },
          { column: 'description', header: 'Description', width: 253, align: 'left', format: 'text' },
          { column: 'quantity', header: 'Quantity', width: 90, align: 'right', format: 'number' },
          { column: 'price', header: 'Price', width: 90, align: 'right', format: 'currency' },
          { column: 'amount', header: 'Amount', width: 90, align: 'right', format: 'currency' },
        ],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 200,
        elements: [
          el('text', 0, 20, 150, 16, { text: 'Notes:', style: { fontSize: 10 } }),
          el('field', 0, 40, 320, 16, { binding: { source: 'header', column: 'notes', format: 'text' }, style: { fontSize: 10 } }),
          el('line', 0, 58, 320, 1, { style: { border: '1px solid #999' } }),
          el('line', 0, 90, 320, 1, { style: { border: '1px solid #999' } }),
          el('text', 0, 100, 150, 16, { text: 'Approved by:', style: { fontSize: 10 } }),
          el('field', 130, 96, 190, 20, { binding: { source: 'header', column: 'approved_by', format: 'text' }, style: { fontSize: 12, italic: true } }),
          el('line', 0, 122, 320, 1, { style: { border: '1px solid #999' } }),

          el('box', 400, 0, 273, 150, { style: { border: '1px solid #ddd' } }),
          el('text', 410, 8, 150, 20, { text: 'SUBTOTAL', style: { fontSize: 10, align: 'right' } }),
          el('field', 563, 8, 100, 20, { binding: { source: 'header', column: 'subtotal', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 410, 34, 150, 20, { text: 'DISCOUNT', style: { fontSize: 10, align: 'right' } }),
          el('field', 563, 34, 100, 20, { binding: { source: 'header', column: 'discount', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 410, 60, 150, 20, { text: 'TAX', style: { fontSize: 10, align: 'right' } }),
          el('field', 563, 60, 100, 20, { binding: { source: 'header', column: 'tax', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 410, 86, 150, 20, { text: 'SHIPPING', style: { fontSize: 10, align: 'right' } }),
          el('field', 563, 86, 100, 20, { binding: { source: 'header', column: 'shipping_cost', format: 'currency' }, style: { fontSize: 10, align: 'right' } }),
          el('text', 400, 116, 173, 30, { text: 'TOTAL', style: { fontSize: 15, bold: true, align: 'right', bg: cream, padding: 8 } }),
          el('field', 573, 116, 100, 30, { binding: { source: 'header', column: 'total', format: 'currency' }, style: { fontSize: 15, bold: true, align: 'right', bg: cream, padding: 8 } }),

          el('text', 0, 172, 673, 20, { text: spaced('PAYMENT TERMS NET 30 DAYS'), style: { align: 'center', fontSize: 11 } }),
        ],
      },
      {
        id: 'pageFooter',
        type: 'pageFooter',
        height: 30,
        enabled: true,
        elements: [
          el('box', 0, 0, 673, 30, { style: { bg: cream } }),
          el('text', 0, 8, 673, 16, { text: spaced('PLEASURE DOING BUSINESS WITH YOU'), style: { align: 'center', fontSize: 10 } }),
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Invoice (Teal) — black header bar, teal callout box, "fills the page"
//    so Total sits flush at the bottom (memory.md D-040) even on a light
//    detail table, matching a user-supplied reference document.
// ─────────────────────────────────────────────────────────────────────────

export function invoiceTealEntity() {
  return {
    meta: { name: 'invoiceTeal', label: 'Invoice (Teal)' },
    headerFields: [
      { name: 'invoice_date', label: 'Invoice Date', type: 'date', kind: 'system' },
      { name: 'invoice_number', label: 'Invoice #', type: 'text', kind: 'system' },
      { name: 'bill_to_name', label: 'Bill To Name', type: 'text', kind: 'system' },
      { name: 'bill_to_street', label: 'Bill To Street', type: 'text', kind: 'system' },
      { name: 'bill_to_city_state_zip', label: 'Bill To City/State/Zip', type: 'text', kind: 'system' },
      { name: 'bill_to_country', label: 'Bill To Country', type: 'text', kind: 'system' },
      { name: 'total', label: 'Total', type: 'currency', kind: 'system' },
    ],
    datasets: [
      {
        meta: { id: 'invoice_line_items', label: 'Invoice line items' },
        fields: [
          { name: 'quantity', label: 'Quantity', type: 'int', kind: 'system' },
          { name: 'item_code', label: 'Item Code', type: 'text', kind: 'system' },
          { name: 'description', label: 'Description', type: 'text', kind: 'system' },
          { name: 'unit_of_measure', label: 'U/M', type: 'text', kind: 'system' },
          { name: 'price_each', label: 'Price Each', type: 'currency', kind: 'system' },
          // Pre-formatted with the reference document's own "Tax" suffix
          // convention (a real per-line taxable indicator some invoicing
          // systems print this way) — text format, not currency, so the
          // literal " Tax" suffix isn't stripped by number formatting.
          { name: 'amount_display', label: 'Amount', type: 'text', kind: 'system' },
        ],
      },
    ],
    documents: {
      '1': {
        header: {
          invoice_date: '2021-02-09',
          invoice_number: '1005',
          bill_to_name: 'Crenshaw Construction',
          bill_to_street: '28 Wolfert Ave',
          bill_to_city_state_zip: 'Menands, NY 12204',
          bill_to_country: 'USA',
          total: 18050.0,
        },
        datasets: {
          invoice_line_items: [
            { quantity: 16, item_code: 'Service Hours', description: '4 Employees for 4 hours', unit_of_measure: '', price_each: 100.0, amount_display: '$1,600.00 Tax' },
            { quantity: 50, item_code: 'Rink liner', description: '10 mil 4 layered, reinforced rink liner (10 ft)', unit_of_measure: '', price_each: 22.0, amount_display: '$1,100.00 Tax' },
            { quantity: 50, item_code: 'Rink floor piping', description: 'Rink floor piping and header system (10 ft)', unit_of_measure: '', price_each: 160.0, amount_display: '$8,000.00 Tax' },
            { quantity: 50, item_code: 'Dasher Boards - Aluminum', description: 'Boards for college and municipal competitive hockey', unit_of_measure: '', price_each: 145.0, amount_display: '$7,250.00 Tax' },
            { quantity: 50, item_code: 'Connectors', description: 'Board connectors curved / straight', unit_of_measure: '', price_each: 2.0, amount_display: '$100.00 Tax' },
          ],
        },
      },
    },
  };
}

export function invoiceTealTemplate() {
  const black = '#111111';
  const teal = '#12a48a';
  return {
    version: 1,
    id: 'ref-invoice-teal',
    name: 'Reference — Invoice (Teal)',
    docType: 'invoiceTeal',
    printSetup: { ...A4_PORTRAIT, fillPage: true },
    dataSource: { entity: 'invoiceTeal', key: 'id', datasets: [{ id: 'invoice_line_items', label: 'Invoice line items', kind: 'fk', ref: { table: 'invoice_line_items', fkColumn: 'invoice_id' }, orderBy: 'id' }] },
    bands: [
      // Repeats every printed page (memory.md D-070).
      {
        id: 'pageHeader',
        type: 'pageHeader',
        height: 60,
        enabled: true,
        elements: [
          el('box', 0, 0, 673, 60, { style: { bg: black } }),
          // A real image element (not a colored box + text) — swap in the
          // actual logo (icon + wordmark together, matching how the
          // reference shows them as one lockup) by setting src.value to a
          // hosted URL; no template restructuring needed. Empty src
          // renders an honest placeholder, never a fabricated trademark
          // redraw (memory.md D-079/D-083).
          el('image', 20, 12, 300, 36, { src: { kind: 'url', value: 'data:image/png;base64,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' } }),
        ],
      },
      {
        id: 'reportHeader',
        type: 'reportHeader',
        height: 190,
        elements: [
          el('text', 0, 10, 260, 16, { text: 'Pop & Skate', style: { fontSize: 10, bold: true } }),
          el('text', 0, 26, 260, 32, { text: '4072 Packard Street,\nMenands, NY, 48108, US', style: { fontSize: 9, color: '#555' } }),

          el('text', 260, 4, 200, 30, { text: 'Invoice', style: { fontSize: 22, bold: true } }),

          el('box', 470, 4, 203, 44, { style: { border: '1px solid #333' } }),
          el('box', 573, 4, 1, 44, { style: { bg: '#333' } }),
          el('line', 470, 26, 203, 1, { style: { border: '1px solid #333' } }),
          el('text', 478, 8, 90, 18, { text: 'Date', style: { fontSize: 9, bold: true } }),
          el('text', 581, 8, 85, 18, { text: 'Invoice #', style: { fontSize: 9, bold: true } }),
          el('field', 478, 28, 90, 18, { binding: { source: 'header', column: 'invoice_date', format: 'date' }, style: { fontSize: 10 } }),
          el('field', 581, 28, 85, 18, { binding: { source: 'header', column: 'invoice_number', format: 'text' }, style: { fontSize: 10 } }),

          el('box', 0, 66, 300, 70, { style: { bg: teal } }),
          el('text', 12, 78, 276, 48, { text: 'Thank you for being a\nPop & Skate customer\nsince 1989!', style: { fontSize: 11, bold: true, color: '#fff', lineHeight: 1.3 } }),

          el('box', 340, 66, 333, 100, { style: { border: '1px solid #333' } }),
          el('text', 352, 74, 100, 16, { text: 'Bill To', style: { fontSize: 10, bold: true } }),
          el('line', 340, 94, 333, 1, { style: { border: '1px solid #333' } }),
          el('field', 352, 102, 300, 16, { binding: { source: 'header', column: 'bill_to_name', format: 'text' }, style: { fontSize: 10 } }),
          el('field', 352, 120, 300, 16, { binding: { source: 'header', column: 'bill_to_street', format: 'text' }, style: { fontSize: 10 } }),
          el('field', 352, 138, 300, 16, { binding: { source: 'header', column: 'bill_to_city_state_zip', format: 'text' }, style: { fontSize: 10 } }),
        ],
      },
      {
        id: 'detail',
        type: 'detail',
        datasetId: 'invoice_line_items',
        keepRowTogether: true,
        columns: [
          { column: 'quantity', header: 'Quantity', width: 70, align: 'left', format: 'number' },
          { column: 'item_code', header: 'Item Code', width: 130, align: 'left', format: 'text' },
          { column: 'description', header: 'Description', width: 260, align: 'left', format: 'text' },
          { column: 'unit_of_measure', header: 'U/M', width: 50, align: 'left', format: 'text' },
          { column: 'price_each', header: 'Price Each', width: 90, align: 'right', format: 'currency' },
          { column: 'amount_display', header: 'Amount', width: 100, align: 'right', format: 'text' },
        ],
      },
      {
        id: 'totals',
        type: 'totals',
        height: 34,
        elements: [
          el('line', 0, 0, 673, 1, { style: { border: '1px solid #333' } }),
          el('text', 400, 6, 173, 24, { text: 'Total', style: { fontSize: 13, bold: true, align: 'right' } }),
          el('box', 573, 4, 100, 26, { style: { border: '1px solid #333' } }),
          el('field', 573, 8, 100, 20, { binding: { source: 'header', column: 'total', format: 'currency' }, style: { fontSize: 12, bold: true, align: 'right' } }),
        ],
      },
      {
        id: 'pageFooter',
        type: 'pageFooter',
        height: 40,
        enabled: true,
        elements: [
          el('text', 0, 6, 673, 16, { text: 'Follow us:', style: { align: 'center', fontSize: 10, bold: true } }),
          el('box', 306, 26, 20, 20, { style: { bg: teal, borderRadius: 999 } }),
          el('box', 336, 26, 20, 20, { style: { bg: teal, borderRadius: 999 } }),
          el('box', 366, 26, 20, 20, { style: { bg: teal, borderRadius: 999 } }),
          el('box', 396, 26, 20, 20, { style: { bg: teal, borderRadius: 999 } }),
        ],
      },
    ],
  };
}

export function allReferenceTemplates() {
  return [
    { entity: salesContractEntity(), template: salesContractTemplate() },
    { entity: shippingInstructionEntity(), template: shippingInstructionTemplate() },
    { entity: purchaseOrderBlueEntity(), template: purchaseOrderBlueTemplate() },
    { entity: purchaseOrderPeachEntity(), template: purchaseOrderPeachTemplate() },
    { entity: invoiceOrangeEntity(), template: invoiceOrangeTemplate() },
    { entity: purchaseOrderElegantEntity(), template: purchaseOrderElegantTemplate() },
    { entity: invoiceTealEntity(), template: invoiceTealTemplate() },
  ];
}
