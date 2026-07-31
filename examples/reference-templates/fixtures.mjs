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
          el('box', 260, 4, 150, 70, { style: { bg: logoPlaceholder, borderRadius: 8 } }),
          el('text', 260, 30, 150, 20, { text: 'LOGO', style: { align: 'center', color: '#fff', fontSize: 11, bold: true } }),
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
          el('box', 20, 15, 34, 30, { style: { bg: teal, borderRadius: 4 } }),
          el('text', 66, 16, 300, 30, { text: 'POP & SKATE', style: { fontSize: 20, bold: true, color: '#fff' } }),
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
