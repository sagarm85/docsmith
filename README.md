# DocSmith

A **standalone, plug-and-play document & report template designer** — a
Mailchimp-style drag-and-drop authoring UI for Invoices, Sales/Purchase Orders,
Quotes, Delivery Notes, statements, certificates, or **any** document you can bind to
data. It reads from **any** data source (system columns **and** custom columns, plus
line-item datasets) through a small pull adapter, handles **multi-page line-item lists
with repeating column headers and page breaks**, and produces **archival PDFs** via a
headless-Chromium render service.

It is **not** tied to any one application, ERP, or engine. A host integrates it by
implementing one small data adapter and dropping a web component into its frontend.
(ERP documents are the lead example throughout; the unidb engine is one supported
adapter, not a requirement.)

```
┌─────────────┐   pull    ┌──────────────────┐   template+data   ┌──────────────────┐
│  Your app / │◀─adapter──│  <doc-designer>  │──renderToHtml────▶│  Live preview     │
│  ERP / DB   │           │  (web component) │                   │  (browser print)  │
└─────────────┘           └────────┬─────────┘                   └──────────────────┘
                                   │ Export PDF (template + entity/id)
                                   ▼
                          ┌──────────────────┐   same renderToHtml + Puppeteer
                          │  render-service  │──────────────────▶  archival PDF
                          │ (Node+Fastify)   │                     (real "Page X of Y")
                          └──────────────────┘
```

## Design decisions (locked)

- **Integration:** embeddable **web component `<doc-designer>` + JS SDK** — drops into
  any ERP frontend via a script tag.
- **Data flow:** **pull via a single `DataSourceAdapter`** the ERP implements once.
- **Rendering:** **hybrid** — client-side design + live preview (zero backend to use),
  server-side PDF for batch/email/archival and reliable page numbering.
- **PDF engine:** **headless Chromium (Puppeteer)** renders the *same* HTML as the
  preview → perfect design↔output parity.
- **Layout model:** **banded hybrid** — free-form elements in header/totals/footer
  bands; the line-item `detail` band is a real `<table><thead>` so browsers repeat
  the column header on every printed page natively.

Full rationale in `packages/designer/memory.md`.

## Monorepo layout

```
packages/
  core/            @docsmith/core          — types, template schema, THE renderToHtml, formatting
  adapters/        @docsmith/adapters      — DataSourceAdapter + Static / Rest / Unidb adapters
  designer/        @docsmith/designer      — Svelte 5 → <doc-designer> custom element (built in Antigravity IDE)
  sdk/             @docsmith/sdk           — mount(), preview(), renderPdf() embedding entry
  render-service/  @docsmith/render-service— Fastify + Puppeteer PDF service
examples/
  invoice-demo/        runnable backend demo + embed illustration
```

> The **frontend designer** (`packages/designer`) is developed in **Antigravity IDE**,
> governed by four docs in that folder: `design.md` (the spec), `claude.md` (agent
> rules), `progress.md` (status), `memory.md` (locked decisions). Read those before
> touching the frontend.

## Quick start (backend, runnable now)

```bash
corepack enable
pnpm install
pnpm demo          # builds core+adapters, renders a 60-line invoice → examples/invoice-demo/out.html
```

Open `examples/invoice-demo/out.html` and **Print-Preview** it: the line-item column
header repeats on page 2+, rows never split across a page break.

### Real PDF

```bash
pnpm --filter @docsmith/render-service build
node packages/render-service/dist/server.js        # listens on :8090
RENDER_URL=http://localhost:8090 pnpm demo         # also writes out.pdf with "Page X of Y"
```

Docker: `docker build -f packages/render-service/Dockerfile -t erpdoc-render .`

## Quick start (frontend designer, in progress)

```bash
pnpm install
pnpm --filter @docsmith/designer dev
```

Opens a local Vite dev server (`packages/designer/dev`) that mounts the real
`<doc-designer>` custom element against the same `StaticAdapter` 60-line invoice
fixture the backend demo uses (`examples/invoice-demo/fixtures.mjs`) — no ERP or
render service needed. Toolbar, Palette (entity/dataset picker, field groups) are
built; Canvas/Preview/Export PDF are still landing (see
`packages/designer/progress.md` for exact status).

```bash
pnpm --filter @docsmith/designer lint        # eslint
pnpm --filter @docsmith/designer typecheck   # svelte-check
pnpm --filter @docsmith/designer test        # vitest
pnpm --filter @docsmith/designer build       # → packages/designer/dist/doc-designer.js
```

## Integrating with your ERP

1. Implement `DataSourceAdapter` (or configure `RestAdapter` against your existing
   endpoints; `UnidbAdapter` is a worked example over a SQL catalog).
2. Embed the designer:
   ```js
   import '@docsmith/designer';                 // registers <doc-designer>
   import { DocDesigner } from '@docsmith/sdk';
   DocDesigner.mount(el, { adapter, renderServiceUrl, onSave: saveTemplateJson });
   ```
3. At print time, either browser-print the preview or `DocDesigner.renderPdf(...)`
   for an archival PDF.

## Status

Backend (`core`, `adapters`, `sdk`, `render-service`) — scaffolded and testable.
Frontend (`designer`) — Phase 0 scaffold plus the first several Phase 1 components
(Toolbar, Palette/SourceConfig, FieldGroup/FieldChip) are built and green; Canvas,
DetailTable, Preview, and Export PDF are still to come. Exact status lives in
`packages/designer/progress.md` (see its "Now / Next / Notes" block); the four
governance docs in that folder (`design.md`, `claude.md`, `memory.md`,
`progress.md`) remain the source of truth — read them before touching the code.
