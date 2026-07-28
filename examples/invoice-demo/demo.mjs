// End-to-end backend demo (no UI needed). Exercises core + adapters:
//   1. build a 60-line invoice via the StaticAdapter (same shape the UnidbAdapter yields),
//   2. render it with core.renderToHtml,
//   3. write out.html — open it and print-preview to SEE the repeating column header,
//   4. if a render service is running (RENDER_URL), request a real PDF too.
//
// Run:  pnpm demo         (from repo root; builds core+adapters first)
// or:   node examples/invoice-demo/demo.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { renderToHtml, validateTemplate } from '../../packages/core/dist/index.js';
import { StaticAdapter } from '../../packages/adapters/dist/index.js';
import { invoiceEntity, invoiceTemplate } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const adapter = new StaticAdapter({ entities: [invoiceEntity(60)] });
const template = invoiceTemplate();

const issues = validateTemplate(template);
if (issues.length) {
  console.error('Template invalid:', issues);
  process.exit(1);
}

// Discovery (what the designer palette would show)
const entities = await adapter.listEntities();
const fields = await adapter.getFields('invoice');
const datasets = await adapter.getRelatedDatasets('invoice');
console.log(`entities:  ${entities.map((e) => e.name).join(', ')}`);
console.log(`header fields (system|custom):`);
for (const f of fields) console.log(`  - ${f.name}  [${f.kind}]  ${f.type}`);
console.log(`line-item datasets: ${datasets.map((d) => d.id).join(', ')}`);

// Runtime bind + render
const data = await adapter.fetchDocument('invoice', '1001');
const rowCount = data.datasets.invoice_items.length;
const { html, document } = renderToHtml(template, data);

const theadCount = (html.match(/<thead>/g) ?? []).length;
const bodyRows = (html.match(/<tr style="break-inside:avoid">/g) ?? []).length;
console.log(`\nrendered: ${rowCount} line items, ${theadCount} <thead> (repeats on print), ${bodyRows} data rows`);
console.log(`@page present: ${document.includes('@page')}`);
console.log(`break-inside present: ${document.includes('break-inside: avoid')}`);

const outHtml = resolve(here, 'out.html');
writeFileSync(outHtml, document, 'utf8');
console.log(`\nwrote ${outHtml}`);
console.log('→ open it in a browser and Print-Preview to see the header repeat on page 2+.');

// Optional: real PDF from a running render service
const renderUrl = process.env.RENDER_URL;
if (renderUrl) {
  console.log(`\nrequesting PDF from ${renderUrl} …`);
  const res = await fetch(`${renderUrl.replace(/\/+$/, '')}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template, data }),
  });
  if (!res.ok) {
    console.error(`render service error ${res.status}: ${await res.text()}`);
  } else {
    const buf = Buffer.from(await res.arrayBuffer());
    const outPdf = resolve(here, 'out.pdf');
    writeFileSync(outPdf, buf);
    console.log(`wrote ${outPdf} (${buf.length} bytes) — has real "Page X of Y".`);
  }
} else {
  console.log('\n(set RENDER_URL=http://localhost:8090 and start the render service to also get out.pdf)');
}
