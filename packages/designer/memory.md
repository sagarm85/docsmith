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

### D-023 — Keyboard-drop target validation lives in `Canvas.svelte`, not `DocDesigner.svelte`
**Decision:** For the keyboard drag-alternative (design.md §12), the check of
whether a picked-up chip is legal to drop on a given band lives in
`Canvas.svelte`'s `handlePageKeydown`, which rejects an invalid target (via
its existing `dropError`/Toast state) and only calls the `onKeyboardDrop(bandId)`
prop — owned by `DocDesigner.svelte` — once the target is already known-valid.
`DocDesigner.handleKeyboardDrop` therefore never re-validates; it just
constructs the element/column and commits it, mirroring
`handlePaletteAddField`/`handlePaletteAddBlock`.
**Why:** `Band.svelte`/`DetailTable.svelte` already self-validate *mouse*
drops this same way (check the payload against the band, call `onInvalidDrop`
on rejection, `onAddElement`/`onAddColumn` only on success) using rejection
strings owned by Canvas's `dropError` Toast. Keyboard drops needed the exact
same three rejection cases (dataset field on a free band; dataset field for
the wrong dataset; header/block on the detail band) — putting validation in
`Canvas.svelte` let it reuse the *identical* strings and the *identical*
`dropError` display mechanism already wired there, so keyboard and mouse
drops are indistinguishable in outcome and there's exactly one place that
knows what's droppable where. The alternative (validating in `DocDesigner`)
would have needed either a second, DocDesigner-owned Toast for this one case,
or a new prop just to shuttle a rejection reason back down into Canvas's
existing Toast — both add a seam for no benefit, since Canvas already has
every fact it needs (`detail`'s `datasetId`, which band is the detail band)
via its own `$derived`s.
**Rejected:** validating inside `DocDesigner.handleKeyboardDrop` and passing
a rejection reason back down to Canvas through a new prop (works, but
duplicates logic/strings that already exist in `Band.svelte`/`DetailTable.svelte`
and would need a second display path); validating in `Band.svelte`/
`DetailTable.svelte` themselves via a shared `onKeyboardDrop` reaching all
the way down there (works, but they don't currently know about `pickedUp` at
all, and plumbing it that deep just to duplicate the one check `Canvas`
already needed anyway would spread the same rule across three files instead
of one).
`[status: locked]`

### D-024 — Per-column aggregate config lives on `DetailBand.aggregates`, never denormalized onto `DetailColumn`
**Decision:** `ColumnProps.svelte`'s new "Aggregate (footer)" select reads/writes
`DetailBand.aggregates` (an `Aggregate[]` keyed by `column`), not a new field on
`DetailColumn` itself. `DocDesigner.handleColumnAggregateChange(columnIndex, fn)`
looks up the column's name, then replaces (or removes) its one entry in
`aggregates` by that name.
**Why:** `core`'s `Aggregate` type (`{ column, fn, into: 'tfoot', label? }`) and
`DetailBand.aggregates` already existed and were already fully wired into
`render.ts`'s `renderDetailBand` (rendered into a real `<tfoot>`) before any
designer UI touched this — only the authoring UI was missing. Respecting the
existing core shape (rather than inventing a parallel `DetailColumn.aggregate`
field) keeps `core` the single source of truth for the template shape, per
`claude.md` §2's "types are imported from `@docsmith/core` — do not redefine."
The canvas's `DetailTable.svelte` shows a live `<tfoot>` preview computed via
`core.aggregate()` against the same real sample rows already loaded for the
row-preview strip — never a fabricated total — shown only once sample rows are
actually `ready` (not during loading/error/unavailable).
**Rejected:** adding an `aggregate?: Aggregate['fn']` field directly to
`DetailColumn` (simpler to wire in `ColumnProps`, but would create two sources
of truth for the same fact and require a migration/sync step keeping a
denormalized column field consistent with `DetailBand.aggregates` — `core`
already made the "keyed array on the band" choice before Phase 3 started).
`[status: locked]`

### D-025 — Visual design system revised for approachability (supersedes design.md §11's original "calm/restrained" framing)
**Decision:** The designer chrome's visual language moves from "Figma/Linear
restraint, not a colorful SaaS dashboard" to **approachable and
self-explanatory at a glance** — closer to how a polished consumer builder
(the user's reference point: Mailchimp's email designer) presents structure.
Concretely: bound-field elements get a visible chip treatment instead of bare
`{label}` text; every band gets a card (tint background + accent edge, not
just a small tab label); detail-table column controls (Format/Align/Width)
get visible captions instead of stacking unlabeled; toolbar/palette/band
entries get inline-SVG icons alongside labels. Full detail in `design.md` §11
(now annotated with this decision at the top).
**Why:** Real usage (a screenshot of the live designer, reviewed 2026-07-28)
showed the original restrained style reading as bare/confusing rather than
calm: raw `{Invoice #}`-style tokens looked like unrendered template code, the
detail-table header packed `Text ▾ / Left ▾ / 300` with no labels so a
first-time user had no way to know those were format/align/width controls,
and bands were separated only by a small gray uppercase tab with no visual
card boundary. The user explicitly asked for a fuller redesign toward a more
approachable feel rather than only patching those three specific spots.
**Scope boundary (what did NOT change):** the banded-hybrid layout *model*
(D-002) is untouched — this is a color/spacing/labeling/iconography pass
only, not an architecture change. No CSS framework or UI kit was added (§3's
forbidden-dependency list is unaffected) — richer visuals are still hand-rolled
token CSS + component `<style>` blocks, same as before. Light/dark theming via
`--dd-*` custom properties and host `theme` overrides still work exactly as
before; new tokens (`--dd-accent-strong`, `--dd-band-tint`, `--dd-radius-sm`)
were *added* to the existing sheet, not a replacement of it.
**Rejected:** a narrower "targeted usability fixes" pass (label the controls,
chip the tokens, add band borders, stop there) — offered as a lower-risk
option but explicitly not what the user chose; a literal free-form
Mailchimp-style *layout* (rejected outright — that's D-002's territory, which
stays locked, since a document's line-item table still needs the banded
pagination contract a free-form email canvas can't express).
`[status: locked]`

### D-026 — Band-tint tokens (`--dd-hero`/`--dd-run`/`--dd-totals` and their `-weak` variants) never redefine for dark mode
**Decision:** The new D-025 band-card tint tokens are defined exactly once
(in `:host`'s base block) and are **not** redefined under `@media
(prefers-color-scheme: dark)` or either `:host([data-dd-theme=...])`
override block. `--dd-ok` itself is untouched and stays theme-reactive as
before (Toast still needs a brighter green in dark mode); the totals band
uses its own new `--dd-totals`/`--dd-totals-weak` pair instead of reusing
`--dd-ok`/`--dd-ok-weak` directly, so the two uses (canvas paper vs. app
chrome) can have independent theming rules under one token each.
**Why:** Caught by an actual dark-mode screenshot (not just code review):
`--dd-ok-weak`'s dark value is a near-black green, and `FreeElement.svelte`'s
text elements have always used a hardcoded `color: #222` (never a `--dd-*`
token) — safe only because every band body was previously hardcoded
`background: #fff` regardless of theme. Making the totals-band tint
theme-reactive silently made "Grand Total" text invisible in dark mode. Root
cause was violating design.md §11's pre-existing, still-true principle: "the
canvas page is pure white... regardless of theme (a document is white
paper)" — band tints are part of that paper, not the surrounding app chrome,
so they must stay visually constant even when the rest of the UI goes dark.
**Rejected:** making `FreeElement.svelte`'s text color theme-reactive instead
(would fix the immediate bug, but implies the canvas itself becomes a
dark-mode surface, contradicting the "paper is always paper" principle and
requiring the whole canvas rendering to become theme-aware, not just tints).
`[status: locked]`

### D-027 — Component `<style>` `@import` for tokens.css only works reliably in the production build; the local `pnpm dev` harness needs a same-shape redirect shim
**Decision:** `DocDesigner.svelte`'s `<style>` block keeps a plain `@import
'./ui/tokens.css';` (unchanged — this is what a real host consuming the
published `dist/doc-designer.js` actually gets, and it works correctly
there). For **this repo's own** `pnpm --filter @docsmith/designer dev`
harness only, added `packages/designer/dev/ui/tokens.css` containing a single
`@import '../../src/ui/tokens.css';` redirect line — dev-only scaffolding,
excluded from the published package (`package.json`'s `files` is
`["dist","src"]`, `dev/` isn't in it).
**Why:** Found by finally taking a real screenshot of the dev harness (never
done in any prior session — `progress.md`'s Phase 1 notes even flagged this
gap explicitly). Every `--dd-*` token silently resolved to nothing there —
all text black, no accent colors, no band tints — with zero console errors
to point at the cause. Root cause: `vite-plugin-svelte`'s custom-element
compilation embeds a component's `<style>` content as a literal JS string
that gets appended into the shadow root at runtime; only `vite build`
performs the CSS-bundling pass that resolves and inlines `@import` into that
string ahead of time. In `pnpm dev`, the `@import` text survives verbatim
into the browser, which then resolves its relative URL against **the page's
own location** (not `DocDesigner.svelte`'s location) — and because
`vite.config.ts` sets `root: 'dev'` for the serve command, the page lives at
`packages/designer/dev/index.html`, so `./ui/tokens.css` resolves to
`packages/designer/dev/ui/tokens.css`, not the real file at
`packages/designer/src/ui/tokens.css`. That path didn't exist, so Vite's
dev-server SPA-fallback silently served `index.html` there instead — a plain
200 response with HTML content, which the CSS parser discards as invalid
with no visible error. The redirect shim works because a *directly-requested*
`.css` file (as opposed to one embedded inside a compiled JS string) genuinely
goes through Vite's own CSS-transform pipeline, which resolves nested
`@import`s correctly even in dev-serve mode.
**Rejected:** importing tokens.css as a string in `DocDesigner.svelte`'s
`<script>` (via `?inline`/`?raw`) and injecting a real `<style>` element at
runtime via a Svelte action — functionally would have worked and avoids the
dev/build asymmetry entirely, but broke `svelte-check`: its `vite-preprocess`
step appears to scan the *whole compiled file* (script comments included, not
just markup) for CSS content whenever a `.css`-suffixed import exists
anywhere in the script block, and throws confusing PostCSS parse errors on
ordinary English words in unrelated comments. Not worth fighting given the
dev-only shim is simpler, smaller, and fixes the actual problem without
touching the component that ships to real hosts at all.
`[status: locked]`

### D-028 — `Template.layoutUnit` is a global px/% toggle, not a per-element choice; x/w use content width, y/h use band height
**Decision:** A new optional `Template.layoutUnit?: 'px' | '%'` field (absent
= `'px'`, fully backward-compatible) switches **every** free-form element's
x/y/w/h at once — never a per-element unit choice. x/w convert against the
band's full content width (bands span edge-to-edge; `printSetup.margins` is a
print-only `@page` concept, never a box-model inset — confirmed by reading
both `Canvas.svelte`'s markup and `core.renderToHtml`'s output, where bands
are direct children of the page div with no margin/padding applied for
`printSetup.margins`). y/h convert against each band's own `height` (always
px — the outer box, never itself relative to something else). `core`'s new
`convertLayoutUnit(template, targetUnit, contentWidthPx)` performs the
one-time migration when the toggle flips (in the same undo step, via
`DocDesigner.handleLayoutUnitChange`); `core.renderToHtml` emits the matching
CSS unit; the canvas (`FreeElement.svelte`'s drag/resize math, threaded
`unit`/`contentWidthPx`/`bandHeightPx` props down through
`Canvas.svelte`→`Band.svelte`) converts mouse-pixel deltas into the active
unit so dragging/resizing/keyboard-nudging all feel native regardless of
mode. The image aspect-lock (shift-drag a corner) computes the *true visual*
aspect ratio (converting both w and h to a common px-equivalent basis first)
rather than the raw stored-unit ratio, since x/w and y/h use different bases
in `%` mode and a naive `w/h` ratio would silently distort images.
**Why:** The user asked specifically for a **global per-template** setting
(not per-element) when offered the choice, and for "elements to realign
based on the outer box" when switching page size/orientation — `x:100px` on
an A4 page physically stays at 100px on a narrower A5 page today (px is a
fixed physical unit, ~96px/inch, identical in the canvas and the real PDF),
which can crowd the margin or overflow; `%` fixes that by construction, via
plain CSS percentage resolution against the containing block — no manual
recomputation needed at render time.
**Verified:** unit tests for `convertLayoutUnit` (px→%, round-trip, DetailBand
untouched) and `renderToHtml`'s emitted CSS unit in `core`; drag/resize/
keyboard-nudge percentage math in `FreeElement.test.ts`; a full
DocDesigner.test.ts integration test toggling the unit and checking migrated
values plus the ElementProps label update; and a real-browser screenshot
(Puppeteer against the production build) confirming a template converted to
`%` renders pixel-identical to its `px` original — proving the CSS
percentage resolution actually matches the assumed content-width basis, not
just that the numbers compute correctly in isolation.
**Rejected:** a per-element unit (offered as an option, not chosen — would
let mixed px/% elements coexist, but adds real complexity — every
drag/resize/render path would need to branch per element instead of once per
template — for a use case the user didn't ask for); converting x/w against
content-width-minus-margins (an earlier draft of this decision, caught and
fixed before landing — margins don't actually inset anything in the HTML box
model here, only in the print/PDF engine's `@page` handling).
`[status: locked]`

### D-029 — Per-band `arrangement: 'free' | 'stack'`; stack rows via each element's `row`, width always a row percentage; never offered for pageHeader/pageFooter
**Decision:** A new optional `FreeBand.arrangement?: 'free' | 'stack'`
(absent = `'free'`, fully backward-compatible) lets a band auto-flow its
elements top-to-bottom in array order instead of absolute x/y — a
MailerLite-editor-style stack, offered **per band** (not a whole-template
setting, unlike `layoutUnit`). Elements sharing a `FreeElement.row` number
render side by side, in array order; an element with no `row` is its own
row. Width in a `'stack'` band is **always** a plain percentage of the row —
never `layoutUnit`-dependent — since the entire point of stacking is to
never need a unit choice for that band. The toggle is only ever exposed
(`BandProps.svelte`'s `onArrangementChange`, wired only in
`Properties.svelte` for `reportHeader`/`totals`) for the two **in-flow**
bands; `pageHeader`/`pageFooter` never get it, and `core.renderFreeBand`
defensively ignores `arrangement: 'stack'` for those two types even if a
hand-edited template sets it.
**Why:** The user showed a MailerLite popup-builder screenshot as reference
UX (stack blocks, drag-handle reorder, hover duplicate/delete) and — when
asked — wanted (a) elements able to share a row, not strictly single-column,
and (b) the choice per-band, not template-wide (a free-form letterhead next
to a stacked totals block should be expressible in one template).
`pageHeader`/`pageFooter` are excluded because `core.renderToHtml` reserves
`.doc-flow` padding equal to `pageHeader.height`/`pageFooter.height` for
their `position:fixed` placement — a `'stack'` band's height is intrinsic/
auto (the whole point), which can't be known ahead of the browser actually
laying out the content, so a running band that outgrew its stated `height`
would silently overlap the flowing document. Reusing `FreeElement` (adding
just one optional `row` field) rather than a parallel `StackRow[]` structure
keeps one element type and one array to reorder/undo/select against, at the
cost of `x`/`y` sitting unused on stack elements (harmless — never read by
`renderStackBand` or `StackBand.svelte`).
**New designer component:** `StackBand.svelte` (parallel to `Band.svelte`,
swapped in by `Canvas.svelte` when `band.arrangement === 'stack'`) owns row
grouping/rendering, drag-handle row reordering (`application/x-stack-row-index`,
same native-HTML5-DnD pattern as `DetailTable.svelte`'s column reorder),
merge-into-row on drop, and hover/focus/selected-reveal duplicate/delete
actions. `ElementProps.svelte` hides X/Y (no coordinates in stack mode) and
z-order (bring-forward/send-back have no meaning without overlap to
resolve — reordering is the drag-handle) when the selected element's band is
`'stack'`.
**Rejected:** a whole-template arrangement setting (offered as an option,
not chosen — the user specifically wanted per-band mixing); strictly
single-column stacking, i.e. no shared rows (offered, not chosen — the user
wanted side-by-side pairs like "Invoice # | Issued at" to remain expressible
in stack mode); a parallel `rows: FreeElement[][]` field on `FreeBand`
instead of reusing `FreeElement[]` + `row` (would need a second array to
keep in sync with selection/undo/duplicate/delete, for no real benefit over
one flat array plus a grouping key).
`[status: locked]`

### D-030 — `numberToWords`/`'words'` format is English-only
**Decision:** `core.numberToWords()` and the `'words'` `ValueFormat` spell
numbers out in English only, regardless of `printSetup.locale`. A fractional
part renders as `"and NN/100"` (the check-writing convention), not a second
round of word-spelling.
**Why:** design.md §2 lists "amount-in-words" as expected `totals`-band
content, and every other format (`number`/`currency`/`date`) is already
genuinely locale-aware via `Intl` at no extra cost — but number-to-words has
no `Intl` equivalent, and real multi-locale support means implementing
actual per-language grammar (gendered forms, and structurally different
large-number groupings like Indian lakh/crore, not just different word
lists) — a materially bigger feature than every other formatter in this
file, so it's out of scope for now rather than faked as "supported."
**Rejected:** silently ignoring `locale` was considered risky without saying
so — the doc comment on `ValueFormat` and this entry are the "say so."
`[status: locked]`

### D-031 — Conditional formatting tests an element/column's OWN value only, style rules merge in array order, never a general expression language
**Decision:** New `ConditionalRule = { operator, value?, style }` (operators:
`eq`/`neq`/`gt`/`gte`/`lt`/`lte`/`contains`/`empty`/`notEmpty`) on
`FreeElement` (`conditionalFormat?`, `kind:'field'` only) and `DetailColumn`
(`conditionalFormat?`). Each rule tests **only that element's/column's own
bound value** — never another field, never a computed expression. Multiple
rules all evaluate independently against the same value; every *matching*
rule's `style` merges over the base style in array order (later rules win
for overlapping properties, like a CSS cascade) — not "first match wins."
`core.resolveConditionalStyle()`/`matchesConditionalRule()` (in
`format.ts`, alongside every other value-formatting helper) do the work;
`render.ts` calls them for a field element's own style and per-cell in the
detail table, using the raw (pre-`formatValue`) value.
**Why:** claude.md's prime directives already settled that templates are
"pure JSON... no functions" and that "computed expressions are Phase 3, and
even then declarative" — a general expression/scripting engine (`row.qty *
row.price > 100`, arbitrary cross-field logic) was never on the table.
Restricting to "this element's own value, compared to a literal" keeps the
feature fully declarative/JSON-serializable and trivially safe to evaluate
(no `eval`, no sandboxing question) while still covering the overwhelming
majority of real invoice/report needs (highlight overdue, negative amounts,
large quantities, etc.). The designer UI (`ConditionalRulesEditor.svelte`,
shared by `ElementProps.svelte`'s field-kind branch and `ColumnProps.svelte`)
intentionally exposes only 3 style properties (text color, background,
bold) rather than all of `ElementStyle` — the highest-value subset for
"highlight this," not full styling control, to keep the rule-editor UI small.
**Rejected:** a general field-to-field or expression-based rule engine
(rejected outright — directly against claude.md's prime directives, and a
real security/complexity surface for no v1 requirement); "first match wins"
instead of merge-in-order (rejected — merging lets an author layer a
"negative → red" rule with an unrelated "large → bold" rule without them
fighting over which fires first, since they usually touch different style
properties).
`[status: locked]`

### D-032 — Saved themes are author-editable, saved sets of the *existing* `theme` token-override mechanism — not a new template-model concept
**Decision:** "Saved themes / brand presets" reuses design.md §13's already-
documented `config.theme` mechanism (host-supplied `--dd-*` CSS custom
property overrides, applied inline on the shadow root) rather than inventing
a new per-template branding concept. The Toolbar's new **Theme** control lets
the author live-edit 4 tokens (`--dd-accent`, `--dd-accent-strong`,
`--dd-accent-weak`, `--dd-bg` — the ones that most visibly read as "brand
color" in the chrome) and save/name/apply/delete named sets, persisted to
`localStorage` under `erpdoc.themes.*` (new `SavedTheme = {id, name,
tokens}`, alongside the existing template persistence functions in the same
file). `DocDesigner.svelte` now owns `activeTheme` state seeded from
`config?.theme` (rather than reading `config.theme` directly for the applied
style), so in-designer edits can change it live; the control disables itself
when the host supplies `config.theme` (host owns branding then — same
precedent as `onSave` disabling the template list, D-010).
**Why:** design.md §13 already fully specced a token-override mechanism for
exactly this purpose (host-supplied branding); "saved themes" is naturally
"let the author do what a host script could already do, and remember it,"
not a request for a second, template-embedded styling system. Reusing it
keeps the feature small (a persistence layer + a small editor UI, mirroring
`TemplateList.svelte`'s already-proven list/save/apply/delete pattern)
instead of inventing new `Template` fields, new render.ts branches, or a
second place colors can come from.
**Scope boundary:** only 4 of the full `--dd-*` token set are exposed for
editing — the highest-value "this is our brand" subset — not a full theme
editor for every token; other tokens still only change via `config.theme`
(host) or the fixed light/dark defaults in `tokens.css`.
**Rejected:** a per-template "brand color" concept embedded in `Template`
itself, affecting the *printed document's* rendered colors (rejected — the
`--dd-*` tokens are explicitly the designer chrome's own tokens per
`tokens.css`'s header comment, never read by `core.renderToHtml`; making
saved themes affect print output would require a genuinely new template-model
field and renderer change, which the "saved themes" ask didn't call for and
`ElementStyle`/`conditionalFormat` (D-031) already cover per-element color
authoring for the actual document).
`[status: locked]`

### D-033 — Carried-forward subtotals computed and injected by `@docsmith/render-service`, not `core`; a single-pass best-effort approximation
**Decision:** `core.Aggregate.into` widens from the literal `'tfoot'` to
`'tfoot' | 'carryForward'`. A `'carryForward'` entry is a SECOND, independent
`Aggregate` for the same column (a column can have both a grand total and a
running per-page subtotal at once) — never a replacement for the existing
`'tfoot'` entry. `core.renderToHtml` never renders carry-forward rows: it has
no concept of page breaks (they don't exist until a browser/print engine
actually lays the page out), so this stays a render-service-only, PDF-only
post-layout pass — a post-processing mutation of the SAME DOM `core` already
produced (analogous to Puppeteer's own header/footer templates already being
a post-processing layer), not a second renderer, preserving D-009.
`packages/render-service/src/pagination.ts`'s `applyCarryForward(page,
template, data)` runs right after `page.setContent()` and before `page.pdf()`
in `pdf.ts`: it resizes the Puppeteer page to the real print content width
(page width minus `printSetup.margins`, converted via a small duplicated
`MM_TO_PX` constant — see `packages/designer/src/geometry.ts`'s own copy and
comment for why this is duplicated rather than shared), measures the actual
rendered heights of `reportHeader`, `<thead>`, `<tfoot>`, and every detail
row, then greedily simulates page breaks against the printable height
budget, and finally injects "Carried forward"/"Brought forward" `<tr>` rows
into the live DOM. Cumulative values are computed via `core.aggregate()`
against the real `DocumentData` rows sliced at each break point — never by
scraping rendered text. The pair is forced onto different pages via CSS
`break-after:page` on the "Carried forward" row.
**Why:** The user was asked (`AskUserQuestion`, since this genuinely trips
claude.md §9's "requires a forbidden dependency or a second renderer, stop
and flag it" rule) and chose "Implement via render-service (Puppeteer)" —
explicitly scoped as real backend work, a post-layout measurement pass that
queries rendered row positions and injects running-total rows. Two real bugs
were caught only by rendering an actual multi-page PDF and inspecting it
(not by code review or unit tests):
1. Relying on natural CSS reflow to land the page break exactly between the
   injected "Carried forward" and "Brought forward" rows doesn't work — both
   rows can land on the same page if there happens to be room, since nothing
   about their DOM adjacency forces a split. Fixed by forcing the break via
   `break-after:page` on the first row.
2. `<tfoot>` is `display:table-footer-group`, which — like `<thead>` — 
   repeats on **every** printed page once a `'tfoot'` aggregate exists, not
   just the last page. The initial page-budget math only reserved space for
   `reportHeader`/`<thead>`, silently eating the safety margin meant to hold
   the injected carry-forward row and causing it to spill onto its own
   near-empty page. Fixed by reserving `<tfoot>` height on every page too.
Because the measurement pass is an ordinary (non-print) Puppeteer layout —
not `page.pdf()`'s own internal print pipeline — resized to what should be
the matching content width, it can still drift from Chromium's true print
layout by a small amount (observed, not fully root-caused to the pixel). A
1.5× row-height safety margin around the injected rows' reserved space
absorbs that drift in practice (verified against the 60-row invoice
fixture). This is accepted as a genuine, documented approximation — single
measurement pass, not iterative refinement — the same practical tradeoff
real-world reporting tools make, per the user's explicit framing when
choosing this approach.
**Verified:** the real 60-row `StaticAdapter` invoice fixture, rendered
through the actual `renderPdf()` Puppeteer pipeline with a `carryForward`
aggregate added, parsed with `pdfjs-dist` (installed ad hoc in the
scratchpad only, same throwaway pattern as the original Phase 1
pagination-gate verification — never added to any `package.json`): 3 pages
(same page count as the identical fixture without carry-forward — the
feature doesn't inflate page count when the budget is right), correct
"Carried forward"/"Brought forward" values at both page breaks, and the
running values independently cross-checked against the fixture's own row
data (sum of the last 6 rows = grand total − last carried-forward value).
**Rejected:** computing carry-forward client-side/in `core` (structurally
impossible — page breaks don't exist before a print engine lays the page
out, per D-012's "carried-forward subtotals are server/P3" which already
anticipated this); an iterative refinement loop that re-measures after each
injection to converge on pixel-perfect breaks (real complexity for a feature
already explicitly scoped as "best-effort" by the user's own framing of the
chosen option); denormalizing the carry-forward flag onto `DetailColumn`
instead of a second `Aggregate` entry (would fight D-024's "aggregate config
lives on `DetailBand.aggregates`, never denormalized onto `DetailColumn`").
`[status: locked]`

---

## Post-Phase-3 (design-review-driven)

Phase 3 (`progress.md`) was already DONE when this work started. The following
decisions came out of an open-ended design-review conversation (the user
sharing reference invoice/document templates — MailerLite's editor, several
commercial invoice templates — and asking "is this possible?") rather than
`design.md`'s phase checklist. Recorded with the same rigor as any other
decision; `design.md`/`progress.md` updated in the same change.

### D-034 — A third band arrangement, `'grid'`: explicit row/column table via `row`/`col`/`colSpan`, rendered as a real `<table>`; plus `ElementStyle.borderRadius`
**Decision:** `FreeBand.arrangement` widens to `'free' | 'stack' | 'grid'`
(memory.md D-029 already established free/stack). `'grid'` bands get two new
optional fields: `gridColumns?: number[]` (column widths as percentages,
default a single 100% column) and `gridBorder?: string` (a CSS `border`
shorthand applied to every cell; absent/empty means no visible cell borders
— the "Sections"/column-layout look). `FreeElement` gets `col?: number` and
`colSpan?: number` (alongside the existing `row`, shared with stack), placing
an element into one grid cell, optionally spanning multiple columns (so one
row can hold a full-width cell like "Seller" while the next splits into
narrower ones like "Invoice #"/"Date" — the bordered-form-header pattern
common in commercial invoice/shipping-document templates). `core`'s new
`renderGridBand` renders a real HTML `<table>` — deliberately NOT CSS Grid —
so native `border-collapse` gives perfectly shared single-pixel cell borders
and native `colspan` handles spanning, both for free, without the author
hand-matching border thickness/position per element the way approximating
the same look with individually-bordered free-form boxes would require.
Separately, `ElementStyle` gains `borderRadius?: number | string` (px for a
number, or any CSS `<length>` string, e.g. `"999px"` for a full pill) —
small and independent of the grid work, but enables the rounded/pill visual
style (rounded table headers, pill-shaped total badges) requested in the
same conversation; only wired into the designer for `kind:'box'` elements in
v1 (Corner radius field next to Background).
**Designer:** `GridBand.svelte` (parallel to `StackBand.svelte`, swapped in
by `Canvas.svelte`): click a cell to select; dragging a field/block chip
onto an empty cell creates an element there, onto a filled cell replaces it
in place (same `row`/`col`/`colSpan`); "Add row" appends one row via a real,
empty `text` element (`text: ''`) at `col: 0` — genuine template data an
author can select/delete, not a phantom UI-only row — with the rest of that
row's columns rendering as the same dashed "Drop a field here" ghost cell
used for any truly-absent cell. `BandProps.svelte` gained the third
arrangement option plus (grid only) a column-width editor (add/remove/
resize columns, each a `NumberInput`) and a "Cell borders" checkbox.
`ElementProps.svelte` shows "Column span" instead of x/y/z-order for a
selected grid-band element (same reasoning as stack: position is the cell,
not coordinates; z-order has no meaning without overlap to resolve).
`core.convertBandArrangement` (already generalized for D-029) extended to a
3-way normalize-through-one-shared-intermediate-representation conversion
(rows of `{ el, xPercent, wPercent }`) rather than a bespoke function per
pair — converting INTO grid always starts single-column (`gridColumns:
[100]`), one element per row; auto-detecting a sensible multi-column split
from existing free/stack content is NOT attempted (rows can have arbitrarily
different widths; a grid needs one column set shared by the whole band), so
the author adds columns/colSpan afterward — same "best-effort, not lossless"
framing as every other arrangement conversion.
**Why:** The user shared several real invoice/shipping-document/contract
template screenshots (a sales contract with a fully bordered metadata grid —
"Seller"/"Buyer"/"Invoice Number"/"Date" etc. as literal attached table
cells; a rounded-pill-styled invoice) and asked whether DocSmith could
produce the same. Two answers were possible: approximate it by hand-matching
free-form element borders/positions (works today, fragile — exactly the
"align marker" gap the user separately flagged), or add a real primitive.
Offered as a genuine architecture decision (a new template-model concept,
not a style tweak) via `AskUserQuestion`; the user chose the unified
primitive, explicitly connecting it to the earlier "Sections" (MailerLite
2-column/3-column layout) request as the same underlying need with borders
toggled off — one primitive instead of two features.
**Verified:** core unit tests (real `<table>`/`colgroup`/`colspan` output,
`gridBorder` on/off, pageHeader/pageFooter never grid for the same "no known
height" reason stack excludes them, all 4 arrangement-conversion pairs
touching grid, `borderRadius` CSS output for both a number and a string); a
dedicated `GridBand.test.ts` (9 tests: empty state, spanning cell + gap
placeholder, select, duplicate/delete, text-edit, fill-empty-cell,
replace-filled-cell, dataset-field rejection, add-row); a `DocDesigner.test.ts`
integration test (toggle to grid, palette "+" routes through `nextGridCell`,
toggle back to free migrates coordinates); and real-browser screenshots of
both the design canvas (grid band with a spanning cell + empty placeholder)
and the actual Preview output (confirming `core.renderToHtml`'s real
`<table>` renders correctly, not just the designer's approximation of it).
**Rejected:** CSS Grid instead of a real `<table>` for `renderGridBand`
(would need hand-rolled border-doubling avoidance and a `colSpan`-to-
`grid-column` translation the browser already does for free with `<table>`
+ `colspan`); auto-detecting multi-column splits when converting free/stack
content into grid (genuinely ambiguous — rows can have different widths;
punted to manual authoring, consistent with every other arrangement
conversion's "best-effort" framing); per-cell drag reordering in v1 (real
scope for marginal value over the existing "replace in place" + manual
row-order-via-array-position — noted as a possible follow-up, not silently
dropped); a nested/recursive "grid block containing child elements" element
kind instead of extending `FreeBand`/`FreeElement` (more powerful — a grid
anywhere, even floating inside a free band — but a materially bigger
structural change for a need `FreeBand.arrangement` already covers, same
reasoning D-029 used against a parallel `rows: FreeElement[][]` field).
`[status: locked]`

### D-035 — `DetailBand.cellBorder` overrides the line-items table's row border via a CSS custom property, not a full table-style system
**Decision:** `DetailBand` gains `cellBorder?: string` (a CSS `border-bottom`
shorthand, e.g. `"none"` or a custom color/weight). `core`'s base stylesheet
changes `table.detail th, table.detail td { border-bottom: 1px solid
#e2e5e9; }` to `border-bottom: var(--dd-cell-border, 1px solid #e2e5e9);`,
and `renderDetailBand` sets `style="--dd-cell-border:{value}"` on the
`<table>` only when `cellBorder` is set — absent leaves the existing default
completely untouched (no output change for any existing template). The
header row's own divider (`table.detail thead th`'s separate, more specific
rule) is intentionally NOT governed by this — a borderless body still reads
better with a visible header edge, matching every borderless-table reference
image shown in the design-review conversation. Designer: a single "Row
borders" checkbox in `BandProps.svelte` when the detail band is selected
(on/undefined = today's default border; off = `cellBorder: 'none'`), wired
through a dedicated `onCellBorderChange` handler — not the generic
`onBandChange`, since `DocDesigner`'s `handleBandChange` explicitly excludes
the detail band (same precedent as `keepRowTogether`'s own dedicated
handler, since `DetailBand` isn't a `FreeBand`).
**Why:** Asked directly ("product table without table border") against
several reference invoice templates. A CSS custom property is the smallest
change that fully satisfies it — no new render branch, no risk to the
existing default look, and the value is free-form so an author isn't
limited to on/off (a custom border weight/color works too, just not
surfaced as a separate designer control in v1).
**Rejected:** a full per-cell/per-column border style system (the reference
images only ever needed "on" vs "off," not per-column variation — YAGNI for
v1); also removing the header's border when the body goes borderless
(every reference image that went borderless in the body still kept a clear
header divider).
`[status: locked]`

### D-036 — Inline hover toolbar on free-form elements, reusing existing action callbacks; found and fixed a real overflow-clipping bug while building it
**Decision:** `FreeElement.svelte` gained a floating toolbar (send-back,
bring-forward, duplicate, delete) shown on hover/focus/selected — the exact
same visual treatment and reveal behavior `StackBand.svelte`/
`GridBand.svelte` already use for their own per-cell actions, extended to
free-form elements. It calls the same `onSendBack`/`onBringForward`/
`onDuplicate`/`onDelete` props already wired to the Properties panel's
buttons and the existing `]`/`[`/⌘D/Delete keyboard shortcuts — purely a new
surface for actions that already existed, not new behavior. Two new icons
(`chevronUp` alongside the existing `chevronDown`) for the z-order buttons,
matching house SVG-path style.
**Why real work, not styling:** Building it surfaced a genuine layout bug:
`.dd-el` had `overflow:hidden` (clipping oversized text/images to the
element's box), which would have silently clipped the new toolbar
(`top:-34px`, entirely outside the box) and — on inspection — the *existing*
resize handles too (small negative offsets like `-4px`), since CSS
`overflow:hidden` clips all descendants positioned relative to that
containing block, including already-shipped absolutely-positioned children.
Fixed by splitting element content into an inner `.dd-el-body` (owns the
clip) and leaving the outer `.dd-el` unclipped for its decorations (toolbar
+ handles) — verified with a real-browser screenshot showing both the
toolbar and resize handles rendering fully, not just passing tests (jsdom
doesn't lay out real box geometry, so this class of clipping bug is
invisible to the existing test suite).
**Rejected:** a drag-handle icon in the toolbar (offered no value — the
whole element is already draggable via pointerdown, unlike
`StackBand`/`GridBand` rows which need an explicit grip since dragging the
row itself would conflict with selecting individual cells inside it).
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
- **O-4 — Barcode/QR element (P3, skipped):** design.md §2/§14 lists a barcode/QR
  element among Phase 3's ERP-grade features, but no correct Code128/QR
  encoder can be hand-rolled without a new dependency — trips claude.md §9's
  "requires a forbidden dependency, stop and flag it" rule. Flagged to the
  user via `AskUserQuestion`; chosen answer was "Skip for now — leave it
  undone in progress.md as a known gap, revisit later" (not "never" — just
  not decided yet). Revisit if/when a barcode/QR dependency is proposed and
  approved through the doc-update ritual (claude.md §0.4): would need a
  license-compatible, tree-shakeable encoder (e.g. a minimal Code128/QR-only
  library, not a general imaging toolkit) added to the approved dependency
  list in `claude.md` §3, plus a new `ElementKind` (or a `kind:'image'`
  variant whose `src` is generated rather than a URL/asset) in `core`.
