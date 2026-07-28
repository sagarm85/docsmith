// Local dev harness for `pnpm --filter @docsmith/designer dev`. Registers
// <doc-designer> and mounts it directly against the SAME StaticAdapter fixture the
// backend `pnpm demo` uses (examples/invoice-demo/fixtures.mjs) — a 60-line invoice,
// deterministic scaffolding per memory.md D-015, not real ERP data.
//
// This bypasses @docsmith/sdk on purpose: the designer package's approved runtime
// deps (claude.md §3) are svelte + @docsmith/core + @docsmith/adapters only, so the
// dev harness talks to the custom element the same low-level way the SDK's
// mount() does internally, without adding an sdk→designer dependency edge.
import '../src/main.js';
import type { DocDesignerConfig } from '../src/types.js';
import { StaticAdapter } from '@docsmith/adapters';
import { invoiceEntity, invoiceTemplate } from '../../../examples/invoice-demo/fixtures.mjs';

const adapter = new StaticAdapter({ entities: [invoiceEntity(60)] });

const el = document.createElement('doc-designer') as HTMLElement & {
  config?: DocDesignerConfig;
};
el.config = { adapter, template: invoiceTemplate() };
el.style.display = 'block';
el.style.height = '100%';

document.getElementById('app')!.appendChild(el);
