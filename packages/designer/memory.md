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

### D-016 — `svelte-check` and `jsdom` approved as dev-only tooling
**Decision:** Add `svelte-check` and `jsdom` to the approved dev dependency list
(`claude.md` §3), scoped strictly to dev-only tooling — never runtime/bundle deps.
**Why:** Phase 0 scaffold hit a gap `design.md`/`claude.md` didn't cover: `tsc` alone
cannot type-check `<script lang="ts">` inside `.svelte` files (it has no `.svelte`
parser), so `pnpm typecheck` needs `svelte-check` (the official Svelte tool, itself
built on `typescript`). Likewise the approved-list choice `@testing-library/svelte`
requires a DOM implementation for vitest to mount components against — `jsdom` is
the standard companion. Both are devDependencies only; they never ship in the
`doc-designer` custom-element bundle, so D-008 (zero extra *runtime* deps) is
unaffected. Recorded per the `claude.md` §9 rule: fill genuine doc gaps and log the
decision rather than guessing silently.
**Rejected:** skipping `.svelte` type-checking entirely (defeats "TS strict mode");
`happy-dom` instead of `jsdom` (jsdom is the more established/complete choice and
already implied by testing-library's own docs as the default pairing).
`[status: locked]`

### D-017 — Placeholder `TemplateDataset.ref` when adding a dataset from the palette
**Decision:** When `SourceConfig` adds a dataset the adapter offered via
`getRelatedDatasets` (which returns only `{ id, label }` — no table/column info), it
constructs `ref: { table: meta.id, fkColumn: '' }` (kind stays `'fk'`, semantically
correct — it *is* a related dataset), leaving `fkColumn` honestly empty rather than
guessing a naming convention (e.g. `` `${entity}_id` ``).
**Why:** `DataSourceAdapter` has no method that returns a dataset's real FK column,
and `TemplateDataset.ref` is confirmed **unused** by `core.renderToHtml` or any
adapter at runtime (grepped `packages/core/src` and `packages/adapters/src` — the
only reference is the type definition and the `datasetFromMeta` helper itself;
render/fetch matches datasets by `datasetId` string only). So `ref` is authoring-time
metadata, not a functional binding — guessing `fkColumn` would fabricate apparent
schema knowledge the adapter never confirmed, which §0.1 forbids even for
"cosmetic" defaults.
**Rejected:** guessing `fkColumn: `${entity}_id`` from the fixture's naming
convention (works for the demo fixture, not guaranteed for any real ERP schema —
exactly the kind of assumption D-013/§0.1 warn against); using `kind: 'sql'` with an
empty string instead (mislabels a genuine FK-relationship dataset as a raw-query
one). If a real render/query path ever starts consuming `ref`, this decision must be
revisited — it currently holds only because `ref` is inert.
`[status: locked]`

### D-018 — Click-to-add target: header fields default to `reportHeader`
**Decision:** `FieldChip`'s keyboard "+" affordance has no "selected band" concept
in Phase 1 (free-form selection is Phase 2). A dataset field's "+" has only one
legal destination (the `detail` band) so there's no ambiguity. A header field's
"+" always appends to `reportHeader`. Dragging the same chip directly onto the
`totals` band (native HTML5 DnD, implemented in `Band.svelte`) is the only way to
place a header field there in Phase 1.
**Why:** `design.md` §12 offers "select a chip, press Enter to pick up, arrow to a
band, Enter to drop" **or** "a `+ Add to band` affordance" as alternatives for the
same requirement (a keyboard path to every drag-drop outcome) — but the full
pick-up/arrow/drop flow is explicitly Phase 2 (`progress.md` Phase 2 checklist).
Given only two free-form bands exist in Phase 1 (`reportHeader`, `totals`), and no
per-band "make this the add target" UI exists yet, defaulting the button to the
band most fields belong on (letterhead/header data) while leaving drag available
for the other case is a reasonable, implementable interpretation of an
underspecified case, per `claude.md` §9.
**Rejected:** a band-picker dropdown next to each chip (adds UI complexity for a
two-band edge case that Phase 2's real selection model will supersede anyway);
making "+" a no-op until Phase 2 (regresses the mandatory keyboard-alternative gate
in `design.md` §12 for the one case that already has a sensible default).
`[status: locked]`

### D-019 — Export PDF uses push mode: `POST /render { template, data }`
**Decision:** `DocDesigner`'s Export PDF handler fetches the document itself
(`adapter.fetchDocument(entity, docId)`, the same call `Preview` already makes)
and POSTs `{ template, data }` to `` `${renderServiceUrl}/render` `` — not
`{ template, entity, id }` as `claude.md` §10 summarizes the contract.
**Why:** Reading the actual server (`packages/render-service/src/server.ts`), pull
mode (`{ template, entity, id }`) additionally requires `body.adapter`, a
serialized `RestConfig` — the server reconstructs a `RestAdapter` from it
server-side. That only works when the designer's real adapter happens to be a
`RestAdapter` with a serializable config; `StaticAdapter`/`UnidbAdapter` (and any
other adapter a host supplies) have no such shape. Since the designer already has
the resolved `DocumentData` on hand (or one fetch away, via the exact same
adapter method `Preview` calls), push mode is the only path that works
regardless of which adapter the host configured, and it matches what `claude.md`
§10 actually cares about (the frontend depends on the adapter interface + this
HTTP contract, "owned in `@docsmith/core`/`@docsmith/adapters` and the backend
package" — the request *shape* is an implementation detail of satisfying that,
not a separate locked decision).
**Rejected:** serializing a `RestConfig` and always requiring `RestAdapter` for
Export PDF to work (would silently break Export PDF for every other adapter,
including the `StaticAdapter` demo/dev path); adding a second render-service
endpoint (unnecessary — push mode already exists and is simpler).
`[status: locked]`

### D-020 — Undo/redo granularity: one step per drag/nudge, one step per field change
**Decision:** `core/history.ts` (`HistoryState<T>`, `commit`/`commitFrom`/`undo`/
`redo`) is the generic reducer, per `design.md` §8.7's explicit direction to keep
it in `core`. On top of it, `DocDesigner` batches granularity per interaction
type:
- A pointer drag (move or resize, via `FreeElement`'s `onDragStart`/`onChange`/
  `onDragEnd`) is **one** undo step for the whole gesture — `onChange` updates
  `history.present` directly (no push) on every tick; `onDragEnd` folds the
  pre-drag snapshot into `past` once via `commitFrom`.
- A keyboard arrow nudge is **one** undo step **per key press** (wrapped in its
  own synchronous `onDragStart`→`onChange`→`onDragEnd`), since each press is
  already a discrete action, not a continuous gesture.
- Text/number field edits (template name, margins, column width/format/align,
  band height, element position via `Properties`) commit **on every
  change/input event**, same as Phase 1 — i.e. typing produces multiple undo
  steps, one per change event.
**Why:** Design.md §8.7 only says "every mutation is an undoable command," not
how finely to batch continuous gestures — left as an implementation judgment
call under `claude.md` §9. Drag/resize pointer events fire on every pixel of
movement; committing history on every tick would make undo require dozens of
presses to undo one visual move, which fails the actual intent of "undo my last
action." Key presses and form-field changes are already discrete, bounded
events, so no batching is needed there — the literal per-event granularity
already matches "one action, one undo step" for those.
**Rejected:** committing on every drag tick (technically "every mutation is
undoable" but makes undo useless for drags); debouncing/blur-committing text
inputs too (adds meaningful complexity — a controlled-input/live-value split —
for a UX nicety that isn't required by any doc; can reconsider if it becomes a
real pain point once used).
`[status: locked]`

### D-021 — `printSetup.repeatPageHeader`/`repeatPageFooter` are dead fields; the real switch is `band.enabled`
**Decision:** `PrintSetup`'s "Repeat page header/footer" checkboxes no longer
write to `printSetup.repeatPageHeader`/`repeatPageFooter`. They now control the
`pageHeader`/`pageFooter` `FreeBand`'s own `enabled` flag directly (creating the
band with sensible defaults — `height: 40`, empty `elements`, `enabled: true` —
on first toggle-on, since a fresh `core.newTemplate()` has neither band).
**Why:** Found while wiring Phase 2's `pageHeader`/`pageFooter` support: grepped
`packages/core/src/render.ts` and `packages/render-service/src/pdf.ts` and
confirmed `repeatPageHeader`/`repeatPageFooter` are **never read** anywhere —
`render.ts` gates a running band purely on `band.enabled !== false`, and
`pdf.ts`'s Puppeteer header/footer templates are a completely separate
mechanism driven by `showPageNumbers`/`pageNumberFormat` (real "Page X of Y",
D-012), unrelated to whether the pageHeader/pageFooter *bands* render. The
Phase 1 `PrintSetup.svelte` (before Phase 2 added real pageHeader/pageFooter
bands to wire against) wrote these checkboxes to the inert `printSetup` fields
— a control that looked functional but silently did nothing, which is exactly
the kind of dishonesty §0.1 forbids for data and should equally not apply to a
UI affordance. Fixed rather than left in place once discovered, per `claude.md`
§9 ("never fabricate... to make the screen look finished").
**Rejected:** leaving the inert toggle as-is now that a real mechanism
(`band.enabled`) exists to back it (would keep shipping a fake control);
removing `repeatPageHeader`/`repeatPageFooter` from `core`'s `PrintSetup` type
entirely (out of scope for a designer-only change — those fields are part of
the shipped backend contract; simply no longer written to by this UI).
`[status: locked]`

### D-022 — "Click outside to close" must use `composedPath()`, never `event.target`, inside the shadow root
**Decision:** Any future dropdown/popover/menu that closes on an outside click
must detect "outside" via `e.composedPath().includes(anchorEl)`, never
`anchorEl.contains(e.target)`, for a `window`-level (or any listener attached
outside the component's own shadow subtree) click handler.
**Why:** Found while building `TemplateList.svelte`'s popover: a `<svelte:window
onclick>` handler checking `triggerEl.contains(e.target)` closed the popover on
*every* click, including clicks on the trigger button itself that was supposed
to open it. Root cause is Shadow DOM **event retargeting**: `doc-designer` is a
shadow-DOM custom element (design.md §3), and per spec, once an event that
originated inside a shadow root crosses the shadow boundary, `event.target` as
seen by listeners *outside* that shadow root is rewritten to the shadow host
element — never the actual element the user clicked. So `.contains(e.target)`
is structurally unable to recognize "the click was inside my own popover" once
the listener lives above the shadow boundary (which a `window` listener always
does). `composedPath()` returns the true, un-retargeted path through the
shadow tree and isn't affected. This is a correctness bug that would have
shipped to production (not a jsdom-only artifact) — jsdom happened to be what
surfaced it, via `DocDesigner.test.ts`'s real custom-element integration tests
that other unit tests (rendering `TemplateList` standalone, outside a shadow
root) couldn't catch.
**Rejected:** scoping the listener to the component's own root via
`getRootNode()` instead of `window` (works, but `composedPath()` is simpler,
is the standard fix cited in web-components accessibility guides, and doesn't
require plumbing the root node through).
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
