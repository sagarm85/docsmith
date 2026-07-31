-- Schema + sample data for the two "Live —" reference templates
-- (dev/unidb-templates.mjs), matching packages/designer/dev/main.ts's
-- VITE_ADAPTER=unidb path. Run this once against a fresh unidb instance:
--
--   TOKEN=$(UNIDB_JWT_SECRET=dev-secret ./scripts/gen_jwt.sh)
--   while IFS= read -r stmt; do
--     [ -z "$stmt" ] && continue
--     curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
--       -X POST http://127.0.0.1:8080/sql -d "{\"sql\":\"$(echo "$stmt" | sed 's/"/\\"/g')\"}"
--   done < <(grep -v '^--' packages/designer/dev/unidb-schema.sql | grep -v '^$')
--
-- (or paste each statement into your own SQL client — one statement per
-- line, no trailing semicolons, matching unidb's /sql endpoint contract.)
--
-- Column names deliberately match the templates' own field bindings
-- exactly (memory.md D-082) — no rebinding needed after running this.
-- Assumes a fresh database; drop the four tables first if re-running.

CREATE TABLE purchase_orders (id INT PRIMARY KEY, order_number TEXT, order_date DATE, vendor_ref TEXT, vendor_company TEXT, vendor_street TEXT, vendor_postcode TEXT, vendor_attn TEXT, shipping_address TEXT, shipping_method TEXT, shipping_attn TEXT, notes TEXT, approved_by TEXT, subtotal NUMERIC(10,2), discount NUMERIC(10,2), tax NUMERIC(10,2), shipping_cost NUMERIC(10,2), total NUMERIC(10,2))
CREATE TABLE po_line_items (id INT PRIMARY KEY, order_id INT REFERENCES purchase_orders(id), item_code TEXT, description TEXT, quantity INT, price NUMERIC(10,2), amount NUMERIC(10,2))
CREATE TABLE invoices (id INT PRIMARY KEY, invoice_date DATE, invoice_number TEXT, bill_to_name TEXT, bill_to_street TEXT, bill_to_city_state_zip TEXT, bill_to_country TEXT, total NUMERIC(10,2))
CREATE TABLE invoice_items (id INT PRIMARY KEY, invoice_id INT REFERENCES invoices(id), quantity INT, item_code TEXT, description TEXT, unit_of_measure TEXT, price_each NUMERIC(10,2), amount_display TEXT)

INSERT INTO purchase_orders (id, order_number, order_date, vendor_ref, vendor_company, vendor_street, vendor_postcode, vendor_attn, shipping_address, shipping_method, shipping_attn, notes, approved_by, subtotal, discount, tax, shipping_cost, total) VALUES (1, '#100', '2024-01-10', 'SU123', 'White Paper Inc', '1 Fairfax Blvd', '123222', 'Mr W Paper', '(As above)', 'Courier', 'Warehouse Manager', '', '', 1000.00, 0.00, 100.00, 50.00, 1150.00)
INSERT INTO po_line_items (id, order_id, item_code, description, quantity, price, amount) VALUES (1, 1, 'HQ1234', 'High quality white paper A4', 1000, 1.00, 1000.00)

INSERT INTO invoices (id, invoice_date, invoice_number, bill_to_name, bill_to_street, bill_to_city_state_zip, bill_to_country, total) VALUES (1, '2021-02-09', '1005', 'Crenshaw Construction', '28 Wolfert Ave', 'Menands, NY 12204', 'USA', 18050.00)
INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (1, 1, 16, 'Service Hours', '4 Employees for 4 hours', '', 100.00, '$1,600.00 Tax')
INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (2, 1, 50, 'Rink liner', '10 mil 4 layered, reinforced rink liner (10 ft)', '', 22.00, '$1,100.00 Tax')
INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (3, 1, 50, 'Rink floor piping', 'Rink floor piping and header system (10 ft)', '', 160.00, '$8,000.00 Tax')
INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (4, 1, 50, 'Dasher Boards - Aluminum', 'Boards for college and municipal competitive hockey', '', 145.00, '$7,250.00 Tax')
INSERT INTO invoice_items (id, invoice_id, quantity, item_code, description, unit_of_measure, price_each, amount_display) VALUES (5, 1, 50, 'Connectors', 'Board connectors curved / straight', '', 2.00, '$100.00 Tax')

-- A second document on each (id=2) with 45 line items, for testing
-- extended/paginated line items against real data, is deliberately NOT
-- included here: its header row's own total/subtotal need the REAL sum of
-- those 45 rows, not a 0 placeholder — a document with $0.00 next to 45
-- real-looking line items reads as broken (reported directly, memory.md
-- D-083). Computing that by hand in plain SQL isn't worth it — run
-- `node packages/designer/dev/unidb-seed.mjs` instead (env vars
-- UNIDB_URL/UNIDB_TOKEN), which does this whole file's schema AND both
-- documents (including the correctly-summed #2) in one command.
