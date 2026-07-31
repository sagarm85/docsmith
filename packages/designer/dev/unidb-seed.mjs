// One-command setup for the two "Live —" reference templates
// (unidb-templates.mjs) against a real, running unidb engine. Creates
// purchase_orders/po_line_items and invoices/invoice_items with column
// names that exactly match the templates' own field bindings (memory.md
// D-082) — no rebinding needed — plus a #1 document matching each
// template's own reference image, and a #2 document with 45 line items
// each for testing extended/paginated line items against real data.
//
// Usage:
//   UNIDB_JWT_SECRET=dev-secret ./scripts/gen_jwt.sh   # from the unidb repo, to get a token
//   UNIDB_URL=http://127.0.0.1:8080 UNIDB_TOKEN=<token> node packages/designer/dev/unidb-seed.mjs
//
// Assumes a fresh database — drops the four tables first if they already
// exist (so this is safe to re-run), so don't point it at a database with
// real data you want to keep under these exact table names.

const baseUrl = process.env.UNIDB_URL;
const token = process.env.UNIDB_TOKEN;
if (!baseUrl) {
  console.error('Set UNIDB_URL (e.g. http://127.0.0.1:8080)');
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sql: query }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error} — query: ${query}`);
  return json;
}

async function tryDrop(table) {
  try {
    await sql(`DROP TABLE ${table}`);
  } catch {
    // Table didn't exist — fine, this is what makes re-running safe.
  }
}

console.log('Dropping existing tables (if any)...');
await tryDrop('invoice_items');
await tryDrop('invoices');
await tryDrop('po_line_items');
await tryDrop('purchase_orders');

console.log('Creating schema...');
await sql(
  "CREATE TABLE purchase_orders (id INT PRIMARY KEY, order_number TEXT, order_date DATE, vendor_ref TEXT, vendor_company TEXT, vendor_street TEXT, vendor_postcode TEXT, vendor_attn TEXT, shipping_address TEXT, shipping_method TEXT, shipping_attn TEXT, notes TEXT, approved_by TEXT, subtotal NUMERIC(10,2), discount NUMERIC(10,2), tax NUMERIC(10,2), shipping_cost NUMERIC(10,2), total NUMERIC(10,2))",
);
await sql(
  'CREATE TABLE po_line_items (id INT PRIMARY KEY, order_id INT REFERENCES purchase_orders(id), item_code TEXT, description TEXT, quantity INT, price NUMERIC(10,2), amount NUMERIC(10,2))',
);
await sql(
  'CREATE TABLE invoices (id INT PRIMARY KEY, invoice_date DATE, invoice_number TEXT, bill_to_name TEXT, bill_to_street TEXT, bill_to_city_state_zip TEXT, bill_to_country TEXT, total NUMERIC(10,2))',
);
await sql(
  'CREATE TABLE invoice_items (id INT PRIMARY KEY, invoice_id INT REFERENCES invoices(id), quantity INT, item_code TEXT, description TEXT, unit_of_measure TEXT, price_each NUMERIC(10,2), amount_display TEXT)',
);

console.log('Seeding #1 documents (match each template\'s own reference image)...');
await sql(
  "INSERT INTO purchase_orders (id, order_number, order_date, vendor_ref, vendor_company, vendor_street, vendor_postcode, vendor_attn, shipping_address, shipping_method, shipping_attn, notes, approved_by, subtotal, discount, tax, shipping_cost, total) VALUES (1, '#100', '2024-01-10', 'SU123', 'White Paper Inc', '1 Fairfax Blvd', '123222', 'Mr W Paper', '(As above)', 'Courier', 'Warehouse Manager', '', '', 1000.00, 0.00, 100.00, 50.00, 1150.00)",
);
await sql(
  "INSERT INTO po_line_items (id, order_id, item_code, description, quantity, price, amount) VALUES (1, 1, 'HQ1234', 'High quality white paper A4', 1000, 1.00, 1000.00)",
);
await sql(
  "INSERT INTO invoices (id, invoice_date, invoice_number, bill_to_name, bill_to_street, bill_to_city_state_zip, bill_to_country, total) VALUES (1, '2021-02-09', '1005', 'Crenshaw Construction', '28 Wolfert Ave', 'Menands, NY 12204', 'USA', 18050.00)",
);
const invoiceRows1 = [
  [1, 16, 'Service Hours', '4 Employees for 4 hours', 100.0, '$1,600.00 Tax'],
  [2, 50, 'Rink liner', '10 mil 4 layered, reinforced rink liner (10 ft)', 22.0, '$1,100.00 Tax'],
  [3, 50, 'Rink floor piping', 'Rink floor piping and header system (10 ft)', 160.0, '$8,000.00 Tax'],
  [4, 50, 'Dasher Boards - Aluminum', 'Boards for college and municipal competitive hockey', 145.0, '$7,250.00 Tax'],
  [5, 50, 'Connectors', 'Board connectors curved / straight', 2.0, '$100.00 Tax'],
];
for (const [id, qty, code, desc, price, amount] of invoiceRows1) {
  await sql(
    `INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (${id}, 1, ${qty}, '${code}', '${desc}', '', ${price.toFixed(2)}, '${amount}')`,
  );
}

console.log('Seeding #2 documents (45 extended line items each)...');

// Build the row data FIRST so the header's own total is the real computed
// sum, not a placeholder — a document with $0.00 next to 45 real-looking
// line items reads as broken, not as "just test data" (reported directly).
const invoiceRows2 = Array.from({ length: 45 }, (_, i) => {
  const qty = (i % 5) + 1;
  const price = 10 + i;
  return { id: 100 + i, qty, code: `ITEM-${1000 + i}`, desc: `Line item ${i + 1} description text`, price, amount: price * qty };
});
const invoiceTotal2 = invoiceRows2.reduce((s, r) => s + r.amount, 0);

const poRows2 = Array.from({ length: 45 }, (_, i) => {
  const qty = (i % 9) + 1;
  const price = Number((1.0 + (i % 5) * 0.5).toFixed(2));
  const amount = Number((qty * price).toFixed(2));
  return { id: 100 + i, qty, code: `HQ${1000 + i}`, desc: `Product item number ${i + 1} — extended line item test`, price, amount };
});
const poSubtotal2 = poRows2.reduce((s, r) => s + r.amount, 0);
const poTax2 = Number((poSubtotal2 * 0.1).toFixed(2));
const poShipping2 = 25;
const poTotal2 = Number((poSubtotal2 + poTax2 + poShipping2).toFixed(2));

await sql(
  `INSERT INTO invoices (id, invoice_date, invoice_number, bill_to_name, bill_to_street, bill_to_city_state_zip, bill_to_country, total) VALUES (2, '2026-07-31', '1006', 'Extended Line-Item Test Co', '1 Test Street', 'Testville, NY 00000', 'USA', ${invoiceTotal2.toFixed(2)})`,
);
await sql(
  `INSERT INTO purchase_orders (id, order_number, order_date, vendor_ref, vendor_company, vendor_street, vendor_postcode, vendor_attn, shipping_address, shipping_method, shipping_attn, notes, approved_by, subtotal, discount, tax, shipping_cost, total) VALUES (2, '#101', '2026-07-31', 'SU999', 'Extended Vendor Co', '1 Test Street', '000000', 'Test Attn', '(As above)', 'Courier', 'Test Manager', '', '', ${poSubtotal2.toFixed(2)}, 0, ${poTax2.toFixed(2)}, ${poShipping2.toFixed(2)}, ${poTotal2.toFixed(2)})`,
);

for (const r of invoiceRows2) {
  await sql(
    `INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (${r.id}, 2, ${r.qty}, '${r.code}', '${r.desc}', '', ${r.price}, '$${r.amount.toFixed(2)} Tax')`,
  );
}
for (const r of poRows2) {
  const desc = r.desc.replace(/'/g, "''");
  await sql(
    `INSERT INTO po_line_items (id, order_id, item_code, description, quantity, price, amount) VALUES (${r.id}, 2, '${r.code}', '${desc}', ${r.qty}, ${r.price}, ${r.amount})`,
  );
}

console.log(`Done. Invoice #2 total: $${invoiceTotal2.toFixed(2)}. PO #2 total: $${poTotal2.toFixed(2)}. Both real computed sums, not placeholders.`);
