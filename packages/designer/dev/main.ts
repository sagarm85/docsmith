// Local dev harness for `pnpm --filter @docsmith/designer dev`. Registers
// <doc-designer> and, by default, mounts it against the SAME StaticAdapter fixture
// the backend `pnpm demo` uses (examples/invoice-demo/fixtures.mjs) — a 60-line
// invoice, deterministic scaffolding per memory.md D-015, not real ERP data.
//
// Set VITE_ADAPTER=unidb (see `pnpm dev:unidb` below, or a `.env.local` copied from
// `.env.local.example`) to mount against a REAL unidb engine instead — memory.md
// D-076. This is the ONLY switch: everything else (custom element registration,
// mount call) is identical between the two paths, since DataSourceAdapter is the
// one seam the whole designer is built against (claude.md §0.1).
//
// This bypasses @docsmith/sdk on purpose: the designer package's approved runtime
// deps (claude.md §3) are svelte + @docsmith/core + @docsmith/adapters only, so the
// dev harness talks to the custom element the same low-level way the SDK's
// mount() does internally, without adding an sdk→designer dependency edge.
import '../src/main.js';
import type { DocDesignerConfig } from '../src/types.js';
import { newTemplate, type DataSourceAdapter } from '@docsmith/core';
import { StaticAdapter, UnidbAdapter } from '@docsmith/adapters';
import { invoiceEntity, invoiceTemplate } from '../../../examples/invoice-demo/fixtures.mjs';
import { allReferenceTemplates } from '../../../examples/reference-templates/fixtures.mjs';

let adapter: DataSourceAdapter;
let startingTemplate: ReturnType<typeof newTemplate>;

if (import.meta.env.VITE_ADAPTER === 'unidb') {
  // Real engine (memory.md D-076) — no fixture entities to seed (they're
  // StaticAdapter-shaped and don't exist in a real unidb database), so the
  // designer starts from a genuinely blank template. Pick your own entity
  // via the Source panel once mounted; new tables/related datasets show up
  // automatically (UnidbAdapter queries information_schema live — no
  // restart, no config edit needed when your schema changes).
  const baseUrl = import.meta.env.VITE_UNIDB_URL as string | undefined;
  if (!baseUrl) {
    throw new Error(
      'VITE_ADAPTER=unidb requires VITE_UNIDB_URL (e.g. http://localhost:8080). ' +
        'Copy dev/.env.local.example to .env.local and fill it in, or set the env var directly.',
    );
  }
  const token = import.meta.env.VITE_UNIDB_TOKEN as string | undefined;
  adapter = new UnidbAdapter({ baseUrl, token });
  startingTemplate = newTemplate();
} else {
  const staticAdapter = new StaticAdapter({
    entities: [invoiceEntity(60), ...allReferenceTemplates().map((r) => r.entity)],
  });
  // Seed the five reference templates (memory.md D-046) into "Saved templates"
  // so they're pickable from the Toolbar without any extra setup — but only
  // once each: if the author already saved over one via the real Save button,
  // their edit wins on every later reload, never silently overwritten by the
  // fixture again.
  for (const { template } of allReferenceTemplates()) {
    const key = `erpdoc.templates.${template.id}`;
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(template));
  }
  adapter = staticAdapter;
  startingTemplate = invoiceTemplate();
}

const el = document.createElement('doc-designer') as HTMLElement & {
  config?: DocDesignerConfig;
};
el.config = { adapter, template: startingTemplate };
el.style.display = 'block';
el.style.height = '100%';

document.getElementById('app')!.appendChild(el);
