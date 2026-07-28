# memory.md — Locked decisions & rationale

> The **why** behind this project. These decisions are **settled**. Do not
> relitigate them mid-build; if one must change, it needs an explicit new entry that
> supersedes the old (with date + reason), plus matching edits to `design.md`.
> A decision here outranks any assumption an agent might otherwise make.

Format: `D-NNN — Title` · **Decision** · **Why** · **Rejected alternatives** ·
`[status: locked | superseded by D-XXX]`.

---

## Product shape

### D-001 — Standalone, ERP-agnostic, plug-and-play — NOT part of unidb-studio
**Decision:** This is its own product/repo. It coordinates with an ERP through a
data adapter and embeds via a web component. unidb-studio is only a *reference data
connector*, never the host.
**Why:** The user explicitly reframed the ask from "a Studio tab" to "a separate
plug-and-play application coordinated with an ERP system." Coupling it to one ERP or
to the Studio would defeat the purpose.
**Rejected:** building it as a unidb-studio tab; coupling to a single ERP's schema.
`[status: locked]`

### D-002 — Banded hybrid layout model
**Decision:** Fixed-order bands (`reportHeader`, `pageHeader`, `detail`, `totals`,
`pageFooter`) with free-form absolute elements inside every band **except** `detail`,
which is a column-mapped table.
**Why:** ERP docs need both pixel-nudgeable letterheads AND a line-item region that
flows across an unknown number of pages. Bands encode the pagination contract; the
`detail` table gives native page-break + repeating-header behavior.
**Rejected:** pure free-form (can't reflow N rows across pages — one template per
row-count); pure banded (clumsy letterhead editing). See `design.md` §2.
`[status: locked]`

### D-003 — Integration surface: embeddable web component + JS SDK
**Decision:** Ship `<doc-designer>` custom element (Shadow DOM) + a `DocDesigner`
SDK (`mount/registerAdapter/preview/renderPdf`). ERP integrates with a `<script>` tag.
**Why:** "Plug and play into any ERP frontend" — a custom element works in React,
Angular, server-rendered, or jQuery hosts without coupling to their framework.
**Rejected:** iframe-only (clunky data exchange), NPM-only (couples to host build),
standalone-service-only (heaviest). User chose web component + SDK.
`[status: locked]`

### D-004 — Data flow: pull via a single `DataSourceAdapter`
**Decision:** The ERP implements one adapter interface (`listEntities`, `getFields`,
`getRelatedDatasets`, `getDatasetFields`, `fetchDocument`, `listSampleIds?`). The
designer/renderer pull from it. Ship `RestAdapter`, `UnidbAdapter`, `StaticAdapter`.
**Why:** One small contract makes the tool work across ERPs; field discovery
(system + custom) and document fetch are uniform.
**Rejected:** push-only JSON (ERP does assembly, manual field discovery) — kept as an
option via `StaticAdapter`/PushAdapter but not the primary path.
`[status: locked]`

### D-005 — Rendering posture: hybrid (client preview, server PDF)
**Decision:** Designer + live preview are 100% client-side (zero backend to *use* the
tool). A separate render service produces the real PDF.
**Why:** Fast, backend-free authoring; but ERPs need batch/email/archival PDFs and
reliable "Page X of Y" that pure browser print can't give. User chose hybrid.
**Rejected:** pure client (no batch/archival/PageXofY); full server render (every
preview a round-trip; can't design offline).
`[status: locked]`

### D-006 — PDF engine: headless Chromium via Puppeteer
**Decision:** The render service loads the **same** `core.renderToHtml` output into
Puppeteer and calls `page.pdf(...)`; "Page X of Y" via Puppeteer header/footer
templates.
**Why:** One rendering path → perfect design↔output parity. Puppeteer renders the
exact HTML/CSS the browser preview shows.
**Rejected:** pdfmake/WeasyPrint (re-implements layout away from HTML/CSS → preview
and output drift); Gotenberg (viable alt, less programmatic control — noted, not chosen).
`[status: locked]`

---

## Frontend engineering

### D-007 — Stack: Svelte 5 + Vite + TypeScript, compiled to one custom element
**Decision:** Svelte 5 runes, Vite, strict TS; the whole designer is one
`doc-designer` custom element with Shadow DOM.
**Why:** Team already knows Svelte; it excels at a drag-heavy canvas (no VDOM
overhead); a single custom-element boundary avoids per-component web-component
friction while keeping Shadow-DOM isolation. Frontend developed in **Antigravity IDE**.
**Rejected:** React island (ships a second runtime), Lit (lower-level for a big drag
UI; noted as the fallback if per-component web-component purity is ever required),
full framework-agnostic vanilla (too much plumbing).
`[status: locked]`

### D-008 — Zero extra runtime dependencies (small embed bundle)
**Decision:** Only `svelte` + `@docsmith/core` + adapter types at runtime. Drag/drop,
move/resize, state, formatting, dates are hand-rolled or in `core`.
**Why:** The bundle is embedded into other people's ERPs; every dependency is weight
and risk. The reference host (unidb-studio) proudly ships zero runtime deps.
**Rejected:** dnd-kit/interact.js, Redux/Pinia/XState, lodash, moment/dayjs,
Tailwind/UI kits. Adding any requires the doc-update ritual (claude.md §0.4).
`[status: locked]`

### D-009 — Single renderer (`core.renderToHtml`) for preview AND PDF
**Decision:** The designer never renders final output itself. Preview and server PDF
both call `core.renderToHtml`. The canvas `DetailTable` is a *design-time editor*
only, not the output source.
**Why:** Guarantees WYSIWYG↔PDF parity; one place to fix pagination bugs.
**Rejected:** a designer-local renderer for speed (would drift from server output).
`[status: locked]`

### D-010 — Templates are pure JSON data, storage-agnostic
**Decision:** A template is JSON with no code. The designer calls `onSave`; the host
decides storage. Standalone default: `localStorage` (`erpdoc.templates.*`) only when
no `onSave` is provided.
**Why:** Portable, diffable, emailable, safe; the ERP owns persistence/permissions.
**Rejected:** designer choosing a database/bucket (couples to one backend);
executable/expression templates in v1 (security + portability). Declarative computed
fields are deferred to P3.
`[status: locked]`

### D-011 — Native browser primitives for pagination
**Decision:** `detail` = real `<table><thead>`; `@page` from `printSetup`;
`break-inside: avoid` on rows/totals; `position: fixed` for running page header/footer.
No JS pagination engine in the client.
**Why:** Browsers repeat `<thead>` per printed page for free — this *is* the
"repeat column headers" requirement, with zero JS and full server parity.
**Rejected:** paged.js/JS pagination in the client (dependency + complexity; only the
server needs deterministic Page X of Y, which Puppeteer handles).
`[status: locked]`

### D-012 — "Page X of Y" and carried-forward subtotals are server-side
**Decision:** Client preview may omit "of Y"; the render service supplies real page
totals (Puppeteer footer template). Carried-forward subtotals are server/P3.
**Why:** Chrome can't do `@page` margin-box counters; faking a total would violate
the no-fabrication rule. Be honest in the UI; let the service do it properly.
**Rejected:** measuring layout in JS to guess totals (fragile, dependency-heavy).
`[status: locked]`

### D-013 — System vs Custom fields come from the adapter, never guessed
**Decision:** `FieldMeta.kind` ('system'|'custom') is set by the adapter. If absent,
show one "Fields" group. The designer never infers or fabricates the distinction.
**Why:** Only the ERP knows which columns are user-defined. A generic SQL catalog
(e.g. unidb) has no such flag, so the adapter derives it from the ERP's own metadata.
**Rejected:** heuristic guessing by name/prefix in the designer.
`[status: locked]`

---

## Process

### D-014 — Governance docs are canon; code follows docs
**Decision:** `design.md` (what) + `claude.md` (how) + `progress.md` (status) +
`memory.md` (why) govern the frontend. On conflict, docs win — update the doc first.
**Why:** The frontend is built in Antigravity IDE by an agent; these docs are the
guardrails that prevent drift across sessions and tools.
`[status: locked]`

### D-015 — `StaticAdapter` fixtures are test scaffolding, not shipped truth
**Decision:** `StaticAdapter` provides deterministic fixture data for local dev/tests
and demos. It is clearly demo scaffolding — it is NOT a license to show fabricated
business data as if it came from a real ERP in production.
**Why:** We need something to develop against without a live ERP, without weakening
the no-fabrication rule for real deployments.
`[status: locked]`

---

## Open items (decide, then move to a D-entry)

- **O-1 — Asset/logo storage (P2):** where uploaded logos live (host callback vs
  adapter method vs render-service asset store). Lean: an optional adapter
  `putAsset()`/`getAssetUrl()` so it stays ERP-owned. Decide before building image upload.
- **O-2 — Multi-dataset joins (P3):** whether a detail table can join two datasets
  (e.g. items + product master) or must be a single dataset the adapter pre-joins.
  Lean: adapter pre-joins (keeps the client dumb). Confirm at P3.
- **O-3 — Theming API surface:** exact shape of the `theme` token-override object
  passed to `mount`. Lean: a flat `{ '--dd-accent': '#…' }` map. Confirm at P2.
