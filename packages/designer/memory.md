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

### D-037 — "Sections" palette group: ready-made column layouts that create/extend a grid band; click-to-add only in v1
**Decision:** A new "Sections" `Collapsible` group in `Palette.svelte`
(hidden entirely — not just disabled — when no `onAddSection` handler is
supplied, matching the honest-capability precedent elsewhere), offering
three presets (`SECTION_PRESETS` in `template-edits.ts`: 1 column, 2
columns, Large + small). Clicking a preset's "+" always targets
`reportHeader` (same D-018 default-target rule as header fields/Blocks):
if the band isn't already `'grid'`-arranged, it's converted first (existing
elements migrated via the already-generalized `convertBandArrangement`);
either way, `gridColumns` is set/replaced to the chosen preset and one new
row of empty placeholder cells (`createSectionRow`, reusing the existing
`createGridPlaceholderElement`) is appended. No drag-and-drop onto other
bands in v1 — `Band.svelte`/`GridBand.svelte` don't yet handle the
`application/x-doc-section` payload the chip sets on `dragstart`; an
unrecognized payload is a silent no-op drop, not an error, so this is a
safe, honest scope cut rather than a broken half-feature.
**Why:** This is the concrete deliverable for "categorized/icon-forward
palette" from the design-review thread — on closer inspection, the palette
already had collapsible icon-labeled groups (`Collapsible.svelte`) and
per-type field glyphs (`FieldChip.svelte`) before this session touched it;
the actual, real gap was the MailerLite-style "drag in a layout skeleton"
interaction, which needed the Grid arrangement (D-034) as its foundation.
**Rejected:** auto-detecting/preserving a band's existing column widths
when a second Section is dropped on an already-grid band (replaces
`gridColumns` outright instead) — same "not lossless, best-effort default"
framing as every other arrangement conversion in this project; wiring full
drag-to-any-band support in v1 (real scope for a convenience that
click-to-add-then-manually-move already covers, and none of the reference
templates in the original conversation needed it on a non-default band).
`[status: locked]`

### D-038 — Alignment guides: left/center/right + top/center/bottom edge matching against band siblings, computed in `FreeElement.svelte`, rendered by `Band.svelte`
**Decision:** `FreeElement.svelte` gains a `siblings` prop (the containing
band's full `elements` array — already in the same unit as the dragged
element's own `x`/`y`/`w`/`h`, so no conversion is needed to compare edges
directly, unlike position math elsewhere that has to account for D-028's
px/% split). On every move-drag `pointermove` tick, the dragged element's
three X edges (left, center, right) and three Y edges (top, center, bottom)
are compared against the same six edges of every other element in the
band; the closest match within a tolerance (4px in `'px'` mode, 0.6% in
`'%'` mode — deliberately smaller than the existing 4px/0.5%-step grid
snap, so a genuine alignment always wins over the coarser grid when both
apply) snaps that axis to the sibling's exact position, bypassing the
ordinary grid-snap for that axis only. The computed guide position (or
`null`) is reported on every tick via a new `onGuides` callback, and once
more with `{x:null,y:null}` on drag end (both the normal `pointerup` path
and the `onDestroy` mid-drag-unmount path, mirroring the existing window-
listener cleanup). `Band.svelte` owns the actual guide-line rendering: a
single `$state` slot (only one element can be dragging at a time) fed by
every `FreeElementView`'s `onGuides`, rendered as one absolutely-positioned
pink (`#ec4899`) line per axis spanning the full band. Purely a drag-time
visual aid — never written to the template, same "ephemeral" framing as
the original mockup's own caption. Only applies to free-form bands; grid
cells are already auto-aligned by construction (D-034) and stack rows have
no x/y to align.
**Why:** The user showed a reference screenshot (Figma/Sketch-style pink
snap line + a ghost of the original position) and asked for exactly this
after the earlier design-review mockup had proposed it. Left/center/right
(not just left-to-left) matches every real case shown across the
conversation's reference images, including centering a title over a column
of fields, not just left-aligning a column of labels.
**Verified:** `FreeElement.test.ts` (snap-to-sibling-edge with the exact
snapped value and reported guide position; falls back to the ordinary grid
snap when no sibling is within tolerance), `Band.test.ts` (the actual
`.dd-align-guide` line renders during a drag with the correct `left`
position, and is removed from the DOM on drop) — and a real-browser
Puppeteer mouse-drag screenshot (jsdom's synthetic events can't be trusted
for real drag-and-drop visual verification) confirming the pink line
renders at exactly the sibling's edge, matching the reference image
pixel-for-pixel in spirit.
**Rejected:** a fixed single-edge-type match (left-to-left only) — real
tools and the reference images both needed center/right matching too, and
the extra comparisons are cheap (a handful of siblings × 3 edges × 3
edges, recomputed only on pointermove, not every frame); showing a
numeric gap-distance chip next to the guide line (present in the original
mockup's illustration) — deferred as a pure polish addition with no
functional value beyond the line itself, not required for the feature to
work, can be added later without changing the underlying snap logic.
`[status: locked]`

### D-039 — Product images per line item: `ValueFormat:'image'`, a real per-row bound value, special-cased in `renderDetailBand` before `formatValue`
**Decision:** `core.ValueFormat` gains `'image'` as a sixth value. Unlike
`FreeElement`'s image kind (`src: { kind: 'url'|'assetId', value }`, needed
because a free-form image isn't bound to a per-row dataset value), a
`DetailColumn` with `format: 'image'` reads its bound value exactly like
any other column — a plain string per row (a URL), same shape the adapter
already returns for text/currency/date columns — so no new binding shape
was needed. `renderDetailBand`'s cell loop checks `c.format === 'image'`
*before* calling `formatValue` (which stays untouched — it's never invoked
for an image cell in the real render path) and emits
`<img src="{value}" style="max-width:100%;max-height:60px;object-fit:
contain">` instead of escaped text; a missing/empty value renders a
genuinely empty `<td>`, never a broken-image icon (no fabricated
placeholder in the actual printed/PDF output — that's a canvas-only
authoring aid, see below). Designer: `ColumnProps.svelte`/
`DetailTable.svelte`'s format `<Select>`s gained "Image" (not
`ElementProps.svelte` — a header/totals-band field element has no
per-row concept, so 'image' is meaningless there; the shared `ValueFormat`
union carries the option regardless, filtered per-surface the same way
`'words'` already is). `DetailTable.svelte`'s real-sample-row preview
renders an actual `<img>` thumbnail for a row with a value, or a dashed
placeholder icon (honestly labeled as empty, not a fabricated image) for
one without — matching the "no fabricated data" prime directive for the
one case where an empty cell needs *some* visual affordance to still read
as "this is an image column" while designing.
**Why:** Asked directly ("Is it possible to generate an invoice with
product image as well?") — answered honestly as a real, un-shipped
`core` gap at the time (no image format existed on `DetailColumn`), then
built once the user confirmed they wanted the whole pending list done.
**Verified:** three core tests (`<img>` renders for a real value, never
double-escapes/drops the URL, exactly the right count of `<img>` tags
when one row's value is empty); a `DetailTable.test.ts` test (real
thumbnail for a row with a value, placeholder icon for the empty one);
and a real-browser screenshot of both the canvas preview and the actual
Preview-mode output (`core.renderToHtml`, via data-URI test images so the
screenshot doesn't depend on external network access) — confirming the
feature works through the real render pipeline, not just the designer's
own approximation of it.
**Rejected:** a `{kind,value}` wrapper matching `FreeElement.src` (adds a
migration/authoring-shape mismatch for zero benefit — a detail column's
value is always adapter-bound, so it's always "the raw value," never a
choice between a URL and an uploaded asset the way a static free-form
image element is); inferring `format:'image'` automatically from an
adapter field's type string (no reliable signal — `FieldMeta.type` is a
DB-ish type like `text`/`varchar`, not a semantic hint, and guessing from
a name pattern like "url"/"photo" risks false positives on an ordinary
text column that happens to be named that).
`[status: locked]`

### D-040 — `printSetup.fillPage`: single/last-page CSS flex-fill, explicitly NOT page-break-aware
**Decision:** New `PrintSetup.fillPage?: boolean` (default false/unset —
today's behavior, totals sits directly after the last row, is completely
unchanged). When true, `core.renderToHtml` gives `.doc-flow` `display:flex;
flex-direction:column; min-height:{page content height in px}` and adds
`.doc-flow > *:last-child { margin-top: auto; }` — a pure CSS selector, so
no JS logic is needed to know which band is actually last (some templates
omit `totals` entirely). The min-height is computed from a small,
intentionally duplicated `MM_TO_PX`/`PAGE_SIZES_MM` pair in `render.ts`
itself (same acceptable-duplication precedent as `packages/designer/src/
geometry.ts` and `packages/render-service/src/pagination.ts`, D-033) —
`core` needed this specific conversion for the first time here; `pageCss()`
itself never needed it since `@page {size:A4}` lets the browser handle
physical page dimensions natively. A checkbox ("Fill page height (pin
totals to the bottom)") in `PrintSetup.svelte`'s existing "Print behaviour"
fieldset, patched through the already-generic `onPrintSetupChange` (unlike
`keepRowTogether`/`layoutUnit`, `fillPage` is a real `PrintSetup` field, so
no dedicated handler was needed).
**Why:** Asked directly, with an explicit acknowledgment up front that the
*full* version (page-pinned on every page of a multi-page document) needs
render-service-side page-break awareness — the same class of problem as
carried-forward subtotals (D-033) — and was out of scope for this pass.
This ships the half that's genuinely simple: exact and correct for a
single-page document or the last page of a multi-page one, honestly not
attempting more.
**Verified:** three core tests (no CSS emitted when unset; correct
min-height for A4 portrait; correct min-height for landscape, using the
shorter dimension as page height) and a `PrintSetup.test.ts` toggle test.
**Rejected:** attempting the multi-page-aware version now (a real,
separate, bigger piece of work — flagged honestly rather than either
skipping the easy win entirely or half-building the hard version).
`[status: locked]`

### D-041 — Real bug found while verifying D-040: `white-space:pre-wrap` on `.dd-el` preserved a template-whitespace text node as a rendered line break, desyncing content from the selection box
**Decision:** `FreeElement.svelte`'s `.dd-el` no longer sets
`white-space: pre-wrap`; it moved to `.dd-el-body` (the actual content
wrapper introduced by D-036), which is where it belongs semantically (only
free-form text content needs multi-line whitespace preservation — the
toolbar's icon buttons never did).
**Why:** The user reported "weird selection" while dragging a field —
screenshots showed the selection outline/resize handles anchored correctly
to the element's real box, while the *visible chip content* rendered
~14px below it, looking like a duplicate/offset selection. Root-caused via
a real-browser Puppeteer reproduction (not a code-reading guess): a plain
HTML/CSS file constructed from the *actual compiled* markup/CSS extracted
live from the running app confirmed `.dd-el-body.offsetTop === 14`,
matching one line-height. `.dd-el`'s DOM has a toolbar `<div>` and a
content `<div>` as siblings, separated in Svelte's compiled template
output by an ordinary whitespace/newline text node — normally invisible
(collapsed) in default `white-space:normal` block layout, but D-036's
toolbar addition put `.dd-el-body` after that toolbar div for the first
time, and `.dd-el`'s pre-existing `white-space:pre-wrap` (needed since
Phase 2, for multi-line text elements) made that inter-element whitespace
*significant* — rendered as a real preserved line break, pushing the
content box down by ~one line-height while the selection outline/handles/
toolbar (all sized directly against `.dd-el`'s own, unshifted CSS box)
stayed correctly positioned. This is exactly why jsdom-based component
tests (all passing throughout) never caught it: jsdom doesn't perform real
box-model/whitespace-collapsing layout, so `offsetTop` there is always 0
regardless of this class of bug — only an actual browser layout engine
reveals it, which is why this session's practice of a real-browser
Puppeteer visual pass before calling a UI change done has repeatedly
caught bugs (D-025's dark-mode band tint, D-027's dev-mode `@import`, and
now this) that the automated test suite structurally cannot.
**Verified:** the same real-browser Puppeteer reproduction, re-run after
the fix, confirms `.dd-el` and `.dd-el-body`'s `getBoundingClientRect()`
now match exactly, and a screenshot of the exact drag interaction the user
reported shows the selection box, resize handles, and visible content all
correctly aligned. No test suite regression (171 designer tests still
pass, since jsdom can't observe this bug either way).
**Rejected:** template-level whitespace management (deleting the newline/
indentation between the toolbar and content markup) — technically also
fixes it, but fragile: any future edit reformatting the template could
silently reintroduce the exact same class of bug. Scoping the CSS property
to only where it's semantically needed is the durable fix.
`[status: locked]`

### D-042 — Palette visual pass: per-item kind badge replaces System/Custom subheaders; icon-badge Collapsible headers; borderless chip rows; search icon
**Decision:** Closing a visual gap the user flagged directly by comparing an
"actual" screenshot of the live Palette against the earlier design-review
Artifact mockup ("this is mock" / "I liked mocked one"). Four components
restyled, no behavior change:
- `Collapsible.svelte`: the leading icon becomes a filled 26×26 badge
  (`background:var(--dd-accent-weak); border-radius:var(--dd-radius-sm)`,
  matching the badge treatment D-034/D-036 already use elsewhere) instead of
  a bare icon; the chevron moved to a real `Icon name="chevronDown"` (was a
  literal `&#9656;` glyph) at the trigger's far right via
  `margin-left:auto`, rotating open/closed instead of swapping glyphs;
  dropped `text-transform:uppercase` on the title (sentence case, matching
  the mock).
- `FieldChip.svelte`: removed the per-type glyph (T/calendar/hash/$ icon)
  entirely — `field.kind` ('system'|'custom', D-013) now renders as a small
  pill badge (`.dd-chip-badge`) next to the label instead. The row itself
  goes borderless (`background`/`border` removed, `:hover` reveals
  `--dd-panel-alt`), matching the mock's flat-list look.
- `FieldGroup.svelte`: the old System/Custom split (two `<h4>` subheaders,
  one `<div>` per kind) collapses to one flat list, system fields first —
  `ordered = [...system, ...custom]` — since the kind is now visible
  per-chip via D-042's own badge, a separate subheader was redundant
  chrome the mock didn't have.
- `Palette.svelte`: added a search icon inside `.dd-search` (absolutely
  positioned, `pointer-events:none`, input gets `padding-left:32px` to make
  room); Blocks/Sections chips restyled to the same borderless-row +
  icon-badge treatment as `FieldChip` for visual consistency across the
  whole palette (all three chip types — field, block, section — now share
  one look); literal `+` button text replaced with the existing `Icon
  name="plus"` (was already used elsewhere, just not here).
**Why:** Direct, repeated user feedback that the shipped UI "does not look
slick and modern" and, on a side-by-side actual-vs-mock comparison, that
the mock was preferred — specifically pointing at the Palette / Header
Fields section. The System/Custom subheader split was the biggest concrete
gap: the mock never had subheaders, just one list with each item's kind
legible inline. All four changes are pure presentation — no new props, no
new template fields, no adapter/render-service change — consistent with
`claude.md` §0's "business logic lives in core" (nothing here is business
logic) and `design.md` §11's existing token-driven color system (`--dd-*`
throughout, no new hex).
**Verified:** `FieldGroup.test.ts`'s two old header-text assertions
(`getByText('System')`/`getByText('Custom')`) replaced with one test
asserting `.dd-chip-badge` elements render `['system','custom']` in that
order for a mixed-kind field set (the behavior actually changed — subheader
text no longer exists — so the old assertions were correctly failing, not
a case for a compat shim). Full designer suite green (170 tests, net −1
from consolidating the two subheader tests into one badge test — no
coverage lost, since the single new test still proves both the ordering
and the per-item kind signal the old two tests checked separately). Real-
browser Puppeteer screenshots of both the top of the Palette (Entity/
dataset picker, Blocks, Sections, search bar) and, scrolled down, the
Header Fields section with the new badge treatment — confirmed against the
mock side by side.
**Rejected:** keeping subheaders and only restyling their chrome (smaller
diff, but leaves the actual structural gap — two grouped lists vs. one
flat list — that the mock's layout depends on); a colored left-border
accent per kind instead of a text badge (considered, but a text badge
("system"/"custom") is unambiguous at a glance without requiring the
reader to already know a color-coding convention, and matches the badge
pattern already established for D-034 grid-band controls).
`[status: locked]`

### D-043 — Four real usability bugs found via live dogfooding: drag toolbar bleed-through, non-functional Sections drag-drop, undeletable grid placeholders, invisible grid Text blocks
**Decision:** Four independent, real (not cosmetic) bugs surfaced by the user
actually using the app, fixed together since each was caught in the same
verification pass:
1. **Toolbar visible during a drag.** `FreeElement.svelte`'s D-036 hover
   toolbar reveal (`:hover`/`:focus-within`) doesn't stop applying just
   because a drag is in progress — the pointer is physically over an element
   (its own, or a neighbor it's been dragged onto, since elements overlap
   mid-move) for the whole gesture. New `suppressToolbar` prop, driven by a
   `Band.svelte`-owned `anyDragging` flag (set by wrapping the existing
   `onElementDragStart`/`onElementDragEnd` props, one flag per band, not
   per-element — any element dragging suppresses every toolbar in that
   band). Enforced via `!important` in CSS (`.dd-el--toolbar-suppressed
   .dd-el-toolbar`) since a class-specificity fix alone loses the tie
   against `:hover`'s three-class selector. `FreeElement.svelte`'s
   `onDestroy` now also fires `onDragEnd` (it previously only cleared
   guides) so a mid-drag unmount can't leave `anyDragging` stuck true.
2. **Sections drag-and-drop was a silent no-op.** D-037 explicitly scoped
   Sections to click-to-add only, but the palette chip was still built
   `draggable="true"` with a real dataTransfer payload — an honest-looking
   affordance that did nothing when dropped, the same class of bug as
   D-021's inert toggle. `Band.svelte` now handles
   `application/x-doc-section` in its existing `handleDrop`, via a new
   optional `onAddSection` prop wired only for `reportHeader`/`totals`'s
   free-arrangement branch in `Canvas.svelte` → `DocDesigner`'s existing
   `addSectionToBand` (the same function the click path already used — drag
   and click now converge on one code path). `pageHeader`/`pageFooter`
   (excluded from grid arrangement, same reasoning as D-029/D-034) reject
   with an honest `onInvalidDrop` message instead of a silent drop.
   Dropping onto an already-`'grid'` or `'stack'` band (GridBand.svelte/
   StackBand.svelte have no band-wide drop target, only per-cell) remains
   out of scope — same "best-effort" framing D-037 already established, now
   just true specifically for the free-arrangement case that was reported.
3. **No way to remove a Section once added.** A placeholder cell
   (`createGridPlaceholderElement`, `kind:'text', text:''`) is a real,
   deletable element per D-034's own doc comment — but `GridBand.svelte`
   only ever rendered its hover delete/duplicate actions on
   `.dd-grid-cell--filled` cells; a placeholder renders through the
   "empty cell" branch (`isPlaceholder()`), which had no button at all.
   Added a Delete action to the empty-cell branch, shown only when the cell
   is backed by a real element (`placeholderId`, as opposed to a genuinely
   absent gap cell from a neighboring `colSpan`), matching the filled-cell
   danger-button style. No "duplicate" — duplicating an empty placeholder
   has no value. Deleting every cell in a row makes the row disappear on
   its own (`rows` is derived from remaining elements' `row` values), same
   as a filled row today — no separate "delete whole row" concept needed.
4. **A "Text" block dropped into a grid cell was invisible and un-editable.**
   `createGridBlockElement('text', ...)` defaulted to `text: ''` — identical
   in shape to a placeholder cell, so `GridBand.svelte`'s `isPlaceholder()`
   heuristic couldn't tell a genuinely-just-dropped Text block apart from
   an untouched row placeholder, and rendered it as the same inert "Drop a
   field here" ghost (no double-click-to-edit, since that only exists on
   the filled-cell branch). The free-form (`createBlockElement`) and stack
   (`createStackBlockElement`) equivalents already default new Text blocks
   to `text: 'Text'` for exactly this reason; `createGridBlockElement` was
   the one inconsistent path. Fixed to match.
**Why:** All four were reported directly by the user while actually using
the app (not found via code review) — "I don't want this black tool[bar]
while dragging," a screenshot of a "2 columns" Sections chip doing nothing
when dropped onto Report Header, "how to remove section once added?", and
"I am not able to add Text in section." Each traces to the same root
pattern this project has hit before (D-021, D-041): an affordance that
*looks* functional (draggable, hoverable, droppable) but silently does
nothing or produces indistinguishable-from-broken output. Bundled into one
decision because all four were found and fixed in one continuous
real-browser verification pass, not because they're conceptually related.
**Verified:** `Band.test.ts` gained two tests (Sections drop forwards to
`onAddSection`; rejects with the honest message when absent, e.g.
pageHeader). Designer suite: 172 tests (was 170). Real-browser Puppeteer
verification for all four: (1) dragging an element mid-gesture — every
`.dd-el-toolbar` in the band reads `opacity:0`/`pointer-events:none` via
`getComputedStyle`, confirmed against a screenshot showing no floating
toolbar; (2) a real native-DragEvent sequence (`dragstart`→`dragover`→
`drop`, a genuine `DataTransfer`, run in an actual browser rather than
jsdom's synthetic-only DnD) dropping "2 columns" onto an empty
`reportHeader` converts it to `arrangement:'grid'`/`gridColumns:[50,50]`
and appends 2 elements, confirmed via `getTemplate()` and a screenshot;
(3) after adding a section, both new placeholder cells exposed a working
"Delete row" button whose click reduced the band's element count from 7 to
5; (4) dropping a Text block via the same real-DragEvent method produced a
`{kind:'text', text:'Text', ...}` element that renders as visible text in
the cell (screenshot), not an indistinguishable ghost cell.
**Rejected:** persisting an explicit `isPlaceholder: true` flag on the
element instead of inferring it from empty text (would need a new
`FreeElement` field that's meaningless outside the designer's own UI logic
and never read by `core.renderToHtml` — pure authoring-time state living in
the real template JSON, which D-010 reserves for genuine document
content); extending Sections drag support to already-`'grid'`/`'stack'`
bands in this same pass (real added scope — a whole new band-wide drop
target on components that currently only expose per-cell drop zones —
deferred as a known, honestly-scoped gap rather than attempted piecemeal).
`[status: locked]`

### D-044 — Confluence-style cursor-drag column resize for grid bands, live-applied and batched into one undo step
**Decision:** `GridBand.svelte` renders a thin, invisible-until-hovered
divider handle between every pair of adjacent columns (a wide `::after`-lined
hit target, same visual pattern as Confluence's/Notion's own column-resize
affordance) — dragging one adjusts only the two neighboring columns'
percentages, clamped to a minimum 8% each, the rest of `gridColumns`
untouched. New `onGridColumnsChange`/`onColumnResizeStart`/
`onColumnResizeEnd` props: the first is called on every pointermove tick
with the whole `gridColumns` array (`DocDesigner`'s new
`handleGridColumnsLiveChange` live-applies it directly to `history.present`,
no push, same as `handleElementLiveChange`); the other two are the *existing*
`handleElementDragStart`/`handleElementDragEnd` snapshot/commit pair reused
as-is (they don't care what changed, only when the gesture starts/ends), so
resizing a column divider is exactly one undo step regardless of how many
pixels it moved. Wired only for the **grid**-arrangement `GridBand`
instances of `reportHeader`/`totals` (same scope boundary as D-037/D-043's
Sections drag: `pageHeader`/`pageFooter` never get grid arrangement at
all).
**Why:** Asked directly ("like Confluence doc, these sections should be
adjustable from the cursor") after the Sections feature (D-034/D-037)
shipped only a numeric width editor in `BandProps.svelte` — real, but not
the direct-manipulation interaction a column layout implies. Cumulative
boundary percentages are computed from `gridColumns` itself (no duplicated
column-width math); the resize math converts a raw pixel delta to a percent
delta against the rows-wrap's own measured width, matching the same
technique `FreeElement.svelte` already uses for drag math in `'%'` layout-
unit mode (memory.md D-028).
**Verified:** three new `GridBand.test.ts` tests (live `onGridColumnsChange`
calls with the correct two adjacent widths; the minimum-width clamp; start/
end batching), mocking `getBoundingClientRect` since jsdom has no real
layout (same limitation this project has hit repeatedly, e.g. D-041). A
real-browser Puppeteer mouse-drag confirmed the visible divider line, the
live width change during the drag, and — critically — that the whole
gesture is exactly **one** undo step (`gridColumns` reverted fully on a
single Undo click), not one step per pixel.
**Rejected:** a keyboard-resize equivalent (arrow keys to nudge column
width) — offered no existing precedent to match against, since this
codebase's own free-form element resize handles (`FreeElement.svelte`) are
also mouse/pointer-only with no keyboard alternative for continuous resize
(only move has a keyboard nudge); adding one here would be new scope beyond
parity with what already ships. The BandProps.svelte numeric editor remains
as the keyboard-operable path for exact values.
`[status: locked]`

### D-045 — Grid cells can hold more than one stacked element; dropping onto real content appends instead of replacing; fixed a latent gap-column rendering bug found while widening the model
**Decision:** A grid cell (row, col) is no longer restricted to exactly one
element. `core.render.ts` gains `buildGridRows()` (replacing the ad hoc
row-only `groupIntoRows` call `renderGridBand` used to make) — groups
`band.elements` by `` `${row}:${col}` ``, not just `row`, so multiple
elements sharing a cell render as multiple stacked `<div>`s inside one
`<td>` (each keeping its own conditional-formatting style, previously
applied directly to the shared `<td>`). `GridBand.svelte`'s own `rows`
$derived (re-implemented independently per the existing D-034 precedent,
since the designer doesn't import core's render.ts internals) widens the
same way, from `Map<string, FreeElement>` to `Map<string, FreeElement[]>`.
Dropping a field/block onto a cell: if it holds exactly one untouched
placeholder (`isPlaceholder`), the drop still **replaces** it in place —
that's the whole point of a placeholder; onto any REAL content (one or more
elements), it now **appends** instead of replacing, which is the actual
mechanism behind "add multiple fields to one section column". Selection/
duplicate/delete all move from the cell to each stacked sub-item
(`.dd-grid-subitem`, a new independently focusable/selectable/hoverable
element per stack entry) — the outer cell becomes a passive container that
only owns the drop target and the colspan/border styling.
**Real bug found and fixed alongside this:** widening `buildGridRows` to be
(row, col)-aware surfaced that the OLD `renderGridBand` never actually
looked at `col` at all — it emitted exactly one `<td>` per element in a row
in array order, with no gap-filling for a column no element covered. A row
with content only in column 2 (column 1 genuinely empty) would render as a
single first-position `<td>`, landing in column 1's visual slot instead of
column 2's — silently misaligned relative to what the design canvas (which
*did* already gap-fill correctly) showed. `buildGridRows` fixes this for
free as part of the same (row, col) grouping change: a genuinely-absent
column now emits an empty `<td>` so column position and `<colgroup>` widths
stay correct.
**Why:** Asked directly ("And user can add multiple fields / placeholders
in each section") once column-resize (D-044) was working — the underlying
one-element-per-cell model was the actual blocker, since "Sections" is a
real `<table>` (D-034) precisely so column/row semantics come free from the
browser, and a `<td>` has always been able to hold more than one block of
content; only this designer's own occupancy map (keyed exclusively by a
single owning element) prevented it.
**Verified:** two new core tests (multiple elements sharing one (row, col)
render as one `<tr>`/one `<td>` with both text contents present, in
insertion order; a genuine gap column renders as an empty `<td>` so a later
real column keeps its true position) — 57 core tests pass (was 55). Four
`GridBand.test.ts` tests replaced/added (append-not-replace onto real
content; replace-still-works onto a lone placeholder; two stacked elements
each independently clickable) — 177 designer tests pass (was 175, net +2
after replacing the old "always replaces" test). A real-browser Puppeteer
pass confirmed: dropping a second field onto an already-filled section cell
stacks rather than replaces (in the actual live app, through native
DragEvent dispatch, not just the designer's own model); both stacked fields
render correctly in **Preview mode** (`core.renderToHtml`'s real output,
not just the canvas approximation) as two `<div>`s inside one `<td>`. This
verification pass caught a real process gap worth naming: the first
attempt showed the bug BEFORE it was actually fixed, because `@docsmith/core`
had not been rebuilt after editing `render.ts` — `@docsmith/designer`
bundles from `packages/core/dist`, not `core/src`, so a designer-only
`pnpm build` silently keeps testing the OLD renderer. `packages/core`
must be rebuilt first whenever `core/src` changes and the designer bundle
is about to be manually verified.
**Rejected:** a per-stack-entry explicit "+" button to add another item to
a specific cell (drag-and-drop append already covers it, and duplicating an
existing sub-item — already free, since a grid element's `row`/`col` are
preserved by the generic duplicate action — lands in the same cell too;
a dedicated button would be a second way to do the same thing for no clear
gain); keyboard-only insertion into a specific pre-existing cell (no
existing keyboard-drop mechanism targets a *chosen* cell at all — the
keyboard drag-alternative's `nextGridCell` always lands in the first
genuinely-empty cell, unchanged by this decision, since appending onto an
already-filled cell via a keyboard path with no visual target confirmation
would be a surprising, hard-to-predict landing spot).
`[status: locked]`

### D-046 — Five reference-document templates seeded as Saved Templates in the dev harness, matching real-world screenshots the user shared
**Decision:** New `examples/reference-templates/fixtures.mjs` (same
"deterministic StaticAdapter fixture, not shipped truth" category as
`examples/invoice-demo/fixtures.mjs`, D-015) — five real `Template` JSON
objects recreating five reference document screenshots the user shared: a
bordered Sales Contract, a Shipping Instruction (bordered grid + a colored
"Export documents" divider row), two Purchase Order color themes sharing
one builder function (blue, peach), and a two-tone orange/dark Invoice.
Each is built entirely from existing DocSmith primitives — grid arrangement
with `colSpan` (D-034), multi-element stacked cells for label/value and
multi-line address blocks (D-045), `DetailBand` + aggregates for the
line-item tables, `ElementStyle.bg`/`color`/`borderRadius` for the colored
bars and total boxes — no new core/designer code, only fixture data.
Logos are plain colored placeholder boxes, never a redrawn trademark.
`packages/designer/dev/main.ts` (the harness `pnpm --filter @docsmith/designer
dev` runs) registers all five entities into the same `StaticAdapter` the
existing invoice demo already uses, and seeds each template into
`localStorage['erpdoc.templates.<id>']` — but only if that key is empty, so
a real edit+Save by the author is never silently overwritten by the fixture
on a later reload. This makes all five appear in the Toolbar's "Saved
templates" picker (already wired to read that exact localStorage key,
`persistence.ts`) with zero new UI.
**Why:** Asked directly — the user attached five reference images and
wanted a way to "select any one and see how it is implemented." Since
"Saved templates" already exists and is driven purely by localStorage
(no schema change needed), seeding it in the dev harness's bootstrap script
was the smallest change that makes all five selectable without any new UI
surface, matching the existing `invoiceEntity()`/`invoiceTemplate()`
precedent in `examples/invoice-demo` exactly.
**Real bug found and fixed while verifying:** the Purchase Order builder's
"Comments or Special Instructions" label element was given `h: 60` (a leftover
copy-paste from a differently-sized element) instead of a short label
height — since it also carried a solid background color, the oversized box
visually overlapped the comment text positioned just below it, rendering
dark text on the same dark background and making it unreadable. Caught via
a real-browser Preview-mode screenshot (not code review) and fixed by
shrinking the label to its actual content height.
**Verified:** a standalone Node script called `core.renderToHtml` on all
five fixtures directly, confirming each renders without throwing. Real-
browser Puppeteer verification against **the actual `pnpm --filter
@docsmith/designer dev` server** (not just the scratchpad harness) confirmed
all five appear in "Saved templates" and load correctly; Design-view and
Preview-mode screenshots of every template were visually compared against
the original reference images.
**Rejected:** pixel-perfect reproduction of every reference detail (e.g. a
real logo mark, a nested sub-grid within a single grid cell, alternating
table-row shading) — out of scope for what these are: structural
demonstrations of DocSmith's own primitives (grid + colSpan + stacking +
colors + detail-band aggregates), not a pixel-matching exercise against
someone else's copyrighted template; shipping these as seeded fixtures
inside the actual `@docsmith/designer` package's runtime (rather than only
in the dev harness) — rejected, since D-008's zero-extra-runtime-deps
posture and D-015's "StaticAdapter fixtures are demo scaffolding, never
shipped truth" both argue against baking sample business documents into
what ships to a real host ERP; the dev harness is the correct, existing
home for exactly this kind of scaffolding.
`[status: locked]`

---

## v2 — usability redesign (design-review-driven, second round)

Prompted by a screenshot of the Properties panel ("Column span" under a
"CELL" group, a raw SQL textarea sitting above the palette's actual
fields) with direct feedback that it was "very complicated" for an
end-user audience, plus a proposal to reconsider the whole stack. A
mockup Artifact was built and approved before any code changed (learning
from D-042's earlier "mock didn't match actual" complaint), and a `v2`
branch was created off `main` for the work. Entries below are numbered in
the order they were implemented; D-051 (the Properties/Palette
simplification pass) happened first but is recorded last since its
write-up was finished after D-047–D-050.

### D-047 — Click-to-add inline field/text picker for grid cells, alongside drag-and-drop
**Decision:** An empty grid cell is now clickable (when `GridBand.svelte`
is given `adapter`/`entity` props, threaded from `Canvas.svelte`, same
optional-capability pattern as everywhere else in this codebase): a small
popover offers a search box over the entity's header fields plus a
"Type your own text" option that immediately enters edit mode. Selecting
a field or typing text reuses the exact same `placeElement()` replace-vs-
append logic (memory.md D-045) the drag-and-drop path already used —
dropping and clicking now converge on one code path. Drag-and-drop
itself is completely unchanged; the picker is a second, easier way to
reach the same result, not a replacement.
**Why:** The v2 mockup showed this directly as an "easier in v2" scenario
in response to "how are fields/text easily added" — dragging a chip
across the screen is a real barrier for a user who isn't drag-comfortable
or is on a trackpad; clicking and searching/typing is a much lower floor.
**Verified:** `GridBand.test.ts` gained 6 tests (opens on click and loads
fields, picking a field replaces the placeholder, "Type your own text"
replaces it with an editable text element, search filters the list,
outside-click closes it, and the old no-adapter behavior is unchanged).
Verified visually in a real browser: clicking an empty section cell in
the actual running app shows the same search-box + "Type your own text"
popover the mockup depicted.
**Rejected:** replacing drag-and-drop with the picker — both stay, since
dragging is still the faster path once a user is comfortable with it.
`[status: locked]`

### D-048 — Per-section independent column layout
**Decision:** `FreeBand` gains `sectionColumns?: Record<number, number[]>`
— per-row column widths, keyed by row index. A row missing an entry
falls back to the band's existing `gridColumns` (then a single 100%
column), so every template saved before this existed keeps rendering
identically. `core.renderGridBand` now renders each row as its own
`<table>` (a native `<colgroup>` can't express two different column
grids in one table) — consecutive rows that resolve to the *same*
columns are merged back into one `<table>` so `border-collapse` stays
seamless for the common case (a whole block of sections sharing one
layout), and only a genuine layout change between adjacent sections
starts a new `<table>`. `GridBand.svelte`'s column-resize handles
(D-044) became per-row: each section gets its own divider overlay and
resize state, and dragging one only ever touches that row's own
`sectionColumns` entry. `addSectionToBand` (the "Sections" palette
click-to-add path, D-037) now writes into `sectionColumns[newRow]`
instead of overwriting the band-wide `gridColumns` for every row.
**Why:** Flagged as an honest architecture note in the approved v2 mockup
— today, all sections in a band shared one column setup, so dropping a
new layout silently changed every existing row too, not just the one
being added to. The mockup's own "add a section" storyboard showed a
1-column and a 2-column section sitting side by side, which the old
model structurally couldn't express.
**Real bug found and fixed alongside this:** `convertBandArrangement`
(schema.ts)'s `current === 'grid'` branch read the band-wide
`gridColumns` for every row regardless of any per-row override, AND
matched rows by their array position in `groupIntoRows`'s output rather
than their actual `row` value (harmless before `sectionColumns` existed,
since every row shared one column set either way — row numbers need not
be contiguous or ordered per the type's own doc comment). Fixed to
resolve each row's own columns by its real `row` value.
**Verified:** core gained 4 tests (two sections with different column
counts render as two separate `<table>`s with correct `<colgroup>`s;
consecutive same-column rows merge into one `<table>`; a row missing from
`sectionColumns` falls back to `gridColumns`; `convertBandArrangement`
grid→free reads each row's own override, not just the band default) — 61
core tests pass (was 60). `GridBand.test.ts`'s existing D-044 resize
tests updated for the new per-row callback signature, plus one new test
confirming two sections get independent resize handles. Verified
end-to-end: a real column-resize drag on one section left a sibling
section's columns untouched, and Preview mode's actual output showed two
separate `<table>`s each with the right `<colgroup>`.
**Rejected:** trying to express independent per-row columns within one
shared `<table>`/`<colgroup>` via a common-denominator column count
(e.g. a 6-column grid where 2-col uses colspan 3+3, 3-col uses colspan
2+2+2) — technically possible but fragile and confusing to reason about
compared to genuinely separate tables, which native `border-collapse`
already handles correctly for the common same-layout case.
`[status: locked]`

### D-049 — Section hover toolbar: change layout, duplicate, delete
**Decision:** Hovering a section (a grid-band row) reveals a small dark
toolbar — same visual language as `FreeElement.svelte`'s existing D-036
element toolbar. "Change layout" opens a popover of `SECTION_PRESETS` (1
column / 2 columns / Large + small, the same list the palette's
"Sections" group already uses) and swaps just that section's own
`sectionColumns` entry (D-048); if the new column count is smaller,
existing elements are clamped into the last valid column rather than
disappearing (stacking there via D-045 if more than one lands in the
same cell) — "existing fields keep their content and just reflow," as
the mockup promised. "Duplicate section" copies every element in the row
into a new row with the same column layout. "Delete section" removes the
whole row (every element in it, plus its `sectionColumns` entry) in one
action — previously only per-field delete existed. All three are one
undo step each.
**Why:** Directly requested in "how sections can be added/break/replace/
deleted" — the mockup's storyboard showed all three as "new in v2"
scenarios, contrasted with per-field delete (already real, D-043) and
adding a section (already real, D-037).
**Verified:** `GridBand.test.ts` gained 5 tests (layout popover opens and
lists presets, picking one calls the callback with the right columns, the
currently-matching preset is marked active, duplicate/delete call their
callbacks with the right row index, and the toolbar is entirely absent
when the callbacks aren't supplied). Verified end-to-end in a real
browser: hovering a section reveals the toolbar, changing "2 columns" to
"Large + small" correctly updates `sectionColumns` while keeping both
fields' content, duplicate produces an identical second section, and
delete removes it.
**Rejected:** none — this closes out the add/replace/delete trio from the
original question directly (split is D-050, its own decision).
`[status: locked]`

### D-050 — Split handle for wide (colSpan > 1) grid cells
**Decision:** A cell spanning more than one column shows a small circular
split handle at its horizontal center on hover. Clicking it halves the
cell: the existing content's `colSpan` shrinks (rounded down), and the
freed columns become a genuine new placeholder cell — not a phantom gap
— ready to drop a field into or click-to-add (D-047). This is a second,
more direct way to change a cell's span alongside the existing
"Width across columns" stepper in Properties (memory.md D-047's
ElementProps simplification) — both remain.
**Why:** The mockup's "split a wide cell" storyboard showed this as a
direct canvas alternative to typing a number, in response to wanting
rich, visual ways to adjust layout without digging into a side panel.
**Verified:** `GridBand.test.ts` gained 2 tests (splitting a colSpan-2
cell produces the shrunk original plus a correctly-positioned new
placeholder; a colSpan-1 cell shows no split handle). Verified
end-to-end in a real browser: splitting a full-width "Seller" cell in a
2-column section produced the original content on the left and an empty
"Add a field" placeholder on the right.
**Rejected:** a drag-based split (dragging the handle to choose an
uneven split point, rather than a fixed halfway click) — offered no
clear value over the simpler click-to-halve interaction for a v1, and
the resulting uneven split can already be reached afterward via the
"Width across columns" stepper on either half.
`[status: locked]`

### D-051 — v2 kickoff: reaffirmed Svelte over React; simplified Properties panel and Palette for a non-technical audience
**Decision:** Asked directly whether to migrate the whole designer to
React for simplicity. Declined, reaffirming D-007: the actual complaint
(too many visible technical controls, developer-facing language) is an
information-architecture problem, not a framework limitation — switching
frameworks would reproduce the identical UX issues in different syntax
while re-introducing the exact "second runtime shipped into a host page"
risk D-007 rejected React for in the first place, since `<doc-designer>`
embeds as one script tag into arbitrary ERP pages that may already run
their own React. Proceeded instead with a UI-only redesign on a new `v2`
branch (created off `main` after pushing everything through D-046):
- `ElementProps.svelte`: the Align dropdown became three icon buttons
  (left/center/right); Bold/Italic checkboxes became "B"/"I" toggle
  buttons; the raw color `<input type=color>` became a row of
  theme-token swatches (`var(--dd-text)`, `--dd-accent`, `--dd-ok`,
  `--dd-danger`, `--dd-warn`) plus a "Custom" swatch that still opens the
  native picker; "Column span" was renamed "Width across columns" and,
  along with "Send backward"/"Bring forward", moved into a collapsed
  "Position & layout"/"Layer order" section (closed by default, using
  the existing `Collapsible` component) — rarely-needed controls tucked
  away rather than always visible.
- `SourceConfig.svelte`: the raw SQL dataset-id/label/query form (the
  single most technical-looking thing in the whole palette) moved behind
  a new "Advanced" `Collapsible`, closed by default. The Entity picker
  and the related-dataset add/remove list stay visible by default (still
  needed for ordinary template setup, not power-user-only).
No capability was removed anywhere — every change is re-labeling,
re-grouping, or a friendlier control for the exact same underlying
`onChange`/style data shape.
**Why:** Direct, specific feedback on a Properties-panel screenshot,
plus an explicit ask to reconsider the framework. Also explicitly asked
to see mock screens before any real code changed this time, given the
earlier D-042 "mock vs actual didn't match" complaint — a static,
clearly-labeled Artifact mockup was built and approved first.
**Verified:** 184 designer tests passing at this point (was 177 before
this pass — SourceConfig's SQL-form tests updated to open the Advanced
toggle first; no ElementProps test file existed to update, since its
controls were only ever exercised indirectly via DocDesigner.test.ts's
`X position` field, unaffected since free-arrangement Position stayed
visible). Verified visually in a real browser against the approved
mockup: icon align buttons, B/I toggles, color swatches, and the
collapsed Advanced/Position sections all render and behave as mocked.
**Rejected:** migrating to React (see Decision above — reaffirms D-007,
does not supersede it); hiding the Entity picker behind Advanced too —
considered, but a brand-new template genuinely needs it to bootstrap
Header Fields/Line-item datasets at all, unlike the SQL form which is
purely additive/optional.
`[status: locked]`

---

### D-052 — Fixed a real `position:fixed` regression in `core/render.ts`: pageHeader/pageFooter were silently `position:relative`, never actually fixed
**Decision:** `renderFreeBand`'s non-grid/non-stack branch unconditionally
put `position:relative` in the returned `<div>`'s inline `style`, even for
a `pageHeader`/`pageFooter` band (`extraClass` containing `running`/
`running-top`/`running-bottom`). An inline style always wins specificity
over a class rule, so the `.running { position: fixed }` CSS (further
down the same stylesheet) was silently dead — the band still LOOKED
correctly positioned on a single-page document by coincidence (it's the
first thing in the DOM, rendering at normal-flow position (0,0) which
happens to equal where a `top:0` fixed header would sit too), but a
`pageFooter` (`bottom:0`) rendered in normal flow at the very TOP of the
document instead of the bottom — reported by the user as "phone/website/
address" (the invoice's pageFooter fields) appearing above the header —
and neither pageHeader nor pageFooter actually repeated on page 2+ of a
multi-page document (verified via a real generated PDF: a 40-row Sales
Contract's "SALES CONTRACT" pageHeader was present on page 1 only).
Fixed: `posCss` is only `'position:relative'` for non-running bands; a
running band gets no inline `position` at all, letting `.running`'s
`position:fixed` apply.
**Why:** Found while investigating the user's screenshot-based complaint
about the Invoice (Orange) template ("phone/website and address come at
the above header"). Confirmed via `page.pdf()` content-stream inspection
(inflating the PDF's FlateDecode stream and reading the raw `cm`/`re`
operators) and a real multi-page PDF screenshot — not guessed.
**Known follow-up (not fixed this pass):** after this fix, a repeating
pageHeader visually OVERLAPS the top of page 2+'s in-flow content (e.g.
the detail table's repeating `<thead>`) — `.doc-flow`'s
`padding-top:${runningTop}px` only reserves that space once, at the very
start of the whole (unbroken) flow box, i.e. only on page 1; there's no
per-physical-page equivalent for a one-time CSS padding property. Tried
widening `@page`'s CSS margin by the header/footer height + a matching
negative offset on the running band to compensate — made it WORSE (the
repeating header ended up misplaced near the bottom of page 1 instead of
the top of page 2) and was reverted; not chased further given `claude.md`
§8's own pagination gate does NOT actually require pageHeader/pageFooter
to repeat (only the detail `<thead>`, `reportHeader` once, `totals`
once) — this is a real but lower-severity gap in a separate, optional
feature. The architecturally correct fix is almost certainly Puppeteer's
native `page.pdf({ headerTemplate, footerTemplate })` (already used for
page numbers in `render-service/src/pdf.ts`) instead of the CSS
`position:fixed` trick, since that mechanism is guaranteed to repeat
per-physical-page without any margin/overlap ambiguity — worth a focused
follow-up, not attempted here given the risk of a wider change under time
pressure.
`[status: locked]`

---

### D-053 — `.page` now has an explicit CSS width (the true printable width); Invoice (Orange) totals repositioned to match the detail table's real column boundaries
**Decision:** `core/render.ts`'s `.page` had no CSS `width` at all — it
filled whatever container rendered it. On screen this meant Preview
stretched `.page` edge-to-edge to fill an arbitrarily wide panel (no
visible page boundary at all, part of what the user meant by "pdf does
not look like having default page margin"). In print, measured directly
off a real generated PDF's content stream: Chromium's headless
`page.pdf()` auto-fits the ENTIRE page to whichever `position:absolute`
free-form element's `x + w` happens to be largest — a completely
content-dependent, silently-varying scale with no fixed reference width
at all (two test documents with different rightmost elements printed at
two different effective CSS-px-to-pt ratios). Added `pageWidthPx()`
(page width minus left+right margins — the SAME "true print content
width" `render-service/src/pagination.ts`'s `printableAreaPx` already
computes for its own row-height measurement pass) and set `.page { width:
<that>px }` unconditionally (screen AND print).
**Verified/limitation:** this makes on-screen Preview show a properly
bounded, correctly-proportioned page (verified: `.page`'s computed width
in a real Preview iframe is exactly 673px for an A4/16mm-margins
template, was previously stretching to fill the panel) — a real, checked
win. It does NOT, however, make Chromium's print-time auto-fit scale
itself deterministic — tried `overflow:hidden` on `.page` and a hidden
`position:absolute` width-marker div to force the auto-fit reference;
neither changed the measured print scale, and `overflow:hidden`
introduced new, different unpredictable clipping. Not chased further
past this point — a real, separate Chromium print-layout behavior,
flagged here rather than "fixed" under time pressure. `geometry.ts`
(`pageDimensionsPx`, the Design canvas) was deliberately NOT changed to
match — it still shows the full, unreduced page width, per its own
existing design intent (`Canvas.svelte`'s comment: the margin guide is
"purely a visual overlay, not a real content inset"); changing it would
also require reworking the margin-guide rendering to not double-inset,
out of scope here.
**Fixture fallout, found and fixed in the same pass:** this exposed two
concrete bugs, both fixed in `examples/reference-templates/fixtures.mjs`:
1. The Invoice (Orange) totals band's SUB TOTAL/TAX & VAT/DISCOUNT/GRAND
   TOTAL block was positioned assuming ~794px of available width (the
   full, unreduced page), not the real 673px. Detail table columns
   (`table-layout:fixed`, `width:100%`) render as RATIOS of the container,
   not literal declared pixels, so at 673px the real "Total" column
   renders at 561–673px and "Price"+"Qty." together at 374–561px.
   Repositioned the totals value column to x=561/w=112 and the label
   column to x=374/w=187 — the block now reads as a genuine continuation
   of the line-item table (values under "Total", labels under "Price"/
   "Qty.") instead of a floating, independently-sized box, and its right
   edge lands flush with the header's/table's own right edge — this is
   what the user asked for as items #1 ("summary/header backgrounds not
   aligned"), #2 ("line items and summary right side alignment"), and #3
   ("sub-table... aligned with line item total, labels aligned").
2. The Purchase Order (Blue/Peach) pageHeader's "PURCHASE ORDER" text (x=
   260, w=490, ending at 750px) was ALWAYS wider than the true 673px
   printable width — previously masked because the D-052 bug made it
   `position:relative` (in normal flow, contributing to whatever the
   auto-fit measured, so it happened to fit). Fixing D-052 correctly made
   it `position:fixed` — and Chromium's auto-fit does NOT count
   `position:fixed` content the same way, so with D-052 fixed alone, this
   text started getting clipped ("PURCHASE" instead of "PURCHASE ORDER")
   — a real interaction between two independent, previously-hidden bugs.
   Fixed by narrowing the text element to w=413 (ends at 673px).
**Why:** User reported 5 specific complaints on the Invoice (Orange)
template's Preview screenshot (backgrounds not aligned, line items/
summary right-alignment, wanted a sub-table look, footer fields above
the header, and PDF not looking like it had a margin) — all traced to
real bugs rather than pure taste, verified with real generated PDFs and a
live Preview screenshot before AND after each fix, not just described.
**Verified:** 61 core tests, 191 designer tests, `pnpm -r typecheck`, and
designer `pnpm lint` all green. All 5 reference templates (`examples/
reference-templates/fixtures.mjs`) re-rendered to real PDFs and
screenshotted after every change in this pass to confirm no other
template regressed.
`[status: locked]`

---

### D-054 — Design canvas's coordinate space now matches the real printable width (`pageDimensionsPx` is margin-reduced, like D-053)
**Decision:** User hit the exact gap D-053 flagged and deliberately left
unfixed: dragging the Invoice (Orange) totals field in the Design canvas
pushed it visibly outside the page in Preview. `geometry.ts`'s
`pageDimensionsPx().width` (the canvas's ENTIRE free-form coordinate
space — every x/y/w/h in `'px'` mode, and the `contentWidthPx` basis for
`'%'` mode, D-028) was the full, unreduced page width, while
`core/render.ts`'s real `.page` width (D-053) is margin-reduced — the
canvas let you position an element anywhere the render engine would
never actually have room for. Changed `pageDimensionsPx` to subtract
left+right margins, matching `core/render.ts`'s `pageWidthPx` exactly.
Every consumer (`Canvas.svelte`, `DocDesigner.svelte`'s layoutUnit/
arrangement conversions, `FreeElement.svelte`'s drag/resize clamps,
`template-edits.ts`'s default full-width block) derives from this one
function, so the fix is single-source and required no changes anywhere
else. Also fixed `Canvas.svelte`'s `.dd-margins` guide div, which
previously inset ANOTHER margin's-worth from `.dd-page`'s edges — now
that `.dd-page` itself IS the printable width, that would have doubled
the visual inset; the guide's left/right are now `0` (page edge = safe
boundary), top/bottom unchanged (height wasn't touched, matching D-053's
width-only scope).
**Why:** Direct user report — "when I adjust total summary it goes out
of page" — is exactly the WYSIWYG gap D-053's own writeup named as a
deliberately-deferred limitation ("`geometry.ts` was deliberately NOT
changed to match"). Confirmed it's genuinely just this one function by
grepping every `pageDimensionsPx`/`marginsPx`/`contentWidthPx` call site
in the designer package before changing anything.
**Verified:** 191 designer tests still pass unmodified (no test
hard-codes geometry.ts's actual computed number — `DocDesigner.test.ts`
derives its expectation from the function itself; `Band.test.ts`/
`FreeElement.test.ts` pass `contentWidthPx` as a literal test prop,
independent of geometry.ts). `pnpm -r typecheck` and designer `pnpm
lint` green. Screenshotted the live Design canvas via Puppeteer: `.dd-page`
measures 672.75px (A4/16mm margins) with zero left/right margin-guide
inset, matching Preview's `.page` exactly.
`[status: locked]`

---

### D-055 — Design canvas never applied `ElementStyle` at all (bg/bold/italic/align/color/fontSize/padding) — only position/size; now reuses core's `styleToCss`
**Decision:** User reported not seeing background color, alignment, or
formatting while editing — only in Preview — and being unable to judge
how much area a label actually covers. Root cause, found by grepping for
`styleToCss`/`el.style` across the three free-form renderers: NONE of
`FreeElement.svelte`, `GridBand.svelte`, or `StackBand.svelte` ever
applied an element's own `style` to anything — only `left/top/width/
height` (`FreeElement`) or `flex-basis`/grid `colspan` (`GridBand`/
`StackBand`). A `bg:orange, bold, align:right` field rendered as
unstyled plain black left-aligned text in the canvas and only looked
right after switching to Preview — the exact "earlier mock and actual
didn't match" pattern from D-042/D-051, but for every template's actual
runtime styling, not just the chrome around the editor.
Exported `styleToCss` from `packages/core/src/render.ts` (was a private
function) — per claude.md's "one renderer" rule, the designer must reuse
core's own style-to-CSS conversion rather than hand-roll a second one
that could drift. Wired it into: `FreeElement.svelte`'s `.dd-el-body`
(the content layer, kept separate from `.dd-el` itself so the
selection/hover outline isn't fought by an element `border` style);
`GridBand.svelte`'s `.dd-grid-subitem`; `StackBand.svelte`'s
`.dd-stack-el` (appended after the existing `flex:0 0 {el.w}%` inline
style).
**Why:** Confirmed via a live Puppeteer screenshot of the Invoice
(Orange) template before/after: reportHeader's BRANDNAME/INVOICE blocks
now show their real dark/orange backgrounds and right-alignment, and the
totals block's SUB TOTAL/TAX & VAT/DISCOUNT/GRAND TOTAL rows show their
real orange/dark backgrounds directly in Design view — closely matching
Preview for the first time.
**Verified:** 191 designer tests pass unmodified (no test asserted the
ABSENCE of inline styling, so adding it wasn't a breaking change to any
existing assertion). `pnpm -r typecheck` and designer `pnpm lint` green.
`[status: locked]`

---

### D-056 — `examples/invoice-demo` pageFooter got a visual separator (thin top rule)
**Decision:** User reported the demo invoice's pageFooter ("Northwind
Trading Co. · invoices@northwind.example · +1 555 0100") "does not look
like footer but contents" — it was plain small gray centered text with
no border/background, indistinguishable from a continuation of body
copy once printed. Added a `kind:'line'` element (already a supported
element kind — renders as a `border-top` div) directly above the footer
text. This is a fixture-only change (`examples/invoice-demo/
fixtures.mjs`, not app code) — the underlying capability (a `line`
element, arbitrary per-element `style.border`) already existed; this
template just hadn't used it for its footer.
**Verified:** re-rendered the demo template to a real 3-page PDF via
Puppeteer and screenshotted page 1 — the footer now shows a clear thin
rule above it, visually distinct from the totals row directly above.
`[status: locked]`

---

### D-057 — Free-form drag/resize can no longer push an element past the page's real right edge
**Decision:** User reported dragging a totals field (`total_amount`)
visibly outside the page. `FreeElement.svelte` clamped `x`/`y` to `>= 0`
(left/top edge) in both pointer-drag and keyboard-nudge, but had NO
upper bound at all — nothing stopped `x + w` from exceeding
`contentWidthPx` (D-054's now-correct, real printable width). Added
`maxXBasis` (`unit === '%' ? 100 : contentWidthPx || Infinity` — the
`|| Infinity` matters: `contentWidthPx` defaults to `0` as an
"unset/unknown" sentinel for callers that don't pass a real page width,
not literally "the page is 0px wide"; without it every unclamped test
caller would have frozen every element at `x:0`) and clamped: the move
handler's `x`, the `w`/`n`/`e` resize handles' `x`/`w`, and the
`ArrowRight` keyboard nudge. Deliberately Y/height-UNbounded (only X):
bands stack/flow vertically and several (`reportHeader` with
`height:0`, e.g.) auto-grow to fit their content, so there's no single
fixed "bottom" the way the page's real width is one fixed right edge.
**Why:** Direct, concrete report — "dragging should not be allowed after
page border" — immediately following the D-054 fix that made the
canvas's coordinate space accurate; accuracy alone doesn't stop you from
dragging past it, just makes the overflow visible/predictable.
**Verified:** added a new test ("does not go past the page's right edge
when dragged or resized past it") exercising both the move and east-
resize-handle paths against an explicit `contentWidthPx`. Two PRE-
EXISTING `'%'`-mode tests started failing and were fixed, not reverted:
`fieldElement()`'s shared test-fixture default (`w: 200`) is a `'px'`-
oriented placeholder that means "200%" once reused under `unit:'%'`
(already wider than the whole page) — those two tests now pass an
explicit, realistic `w: 20` override. 18 designer FreeElement tests (was
17), 192 designer tests total, `pnpm -r typecheck` and designer `pnpm
lint` green.
`[status: locked]`

---

### D-058 — Design canvas gets a light reference grid (20px, blend-mode overlay) for judging alignment
**Decision:** User asked for a light background grid to help "check and
adjust vertical/horizontal" while editing. A plain `background-image` on
`.dd-page` sits BEHIND band content — and every band type already paints
its own translucent-but-opaque tint over its full area (`.dd-band-body`'s
`--dd-hero-weak`/`--dd-run-weak`/`--dd-totals-weak`, `Band.svelte`),
which hid a page-level grid almost everywhere it would have actually
been useful (confirmed by cropping a real Puppeteer screenshot: the grid
was only visible in the thin non-band gaps). Used a full-page overlay
div instead (`.dd-grid-overlay`, last child of `.dd-page` so it paints on
top, `pointer-events:none` so it never blocks selection/drag) with
`mix-blend-mode: multiply` — the grid lines subtly darken whatever's
beneath (content, every band tint, the white page background) rather
than covering any of it. Fixed light gray (`#e7eaee`), not a `--dd-*`
token — same established reason as `.dd-page`'s own `#fff`/the margin
guide's `#c6cbd2`: the page is a literal sheet of paper, always white,
independent of the app's light/dark theme. 20px spacing.
**Verified:** cropped a real Puppeteer screenshot of an empty page region
before/after — grid lines now run continuously through it instead of
fading into a solid band-tint color a few pixels in. `pnpm -r typecheck`
and designer `pnpm lint` green (pure CSS/markup change, no test file
covers canvas background rendering).
`[status: locked]`

---

### D-059 — Alignment guide (D-038) tolerance widened 4px → 8px; grid overlay (D-058) pinned to a low z-index so it can never sit above it
**Decision:** User reported dragging an element near siblings in
REPORT HEADER showed no alignment guide line at all. Reproduced via
Puppeteer: a smooth, simulated drag DOES correctly fire the guide (the
mechanism itself is not broken), but `ALIGN_TOLERANCE` (4px / 0.6% —
D-038's original value) requires landing within 4px of a sibling's edge,
which a real, un-assisted mouse drag rarely does by chance while passing
through. Confirmed directly: a drag landing 6px off a sibling's edge
(inside the old 4px miss zone) showed no guide before this change, and
does after. Widened to 8px / 1.2% — still tight enough to feel deliberate,
loose enough to actually trigger by hand. Separately, and defensively:
D-058's new `.dd-grid-overlay` is the LAST DOM child of `.dd-page`,
`position:absolute` with no z-index of its own — an unstacked
later sibling renders above an earlier one by CSS stacking rules
REGARDLESS of that earlier element's own NESTED z-index (the align
guide's `z-index:8` lives inside `.dd-band-body`'s own local stacking
context, a different comparison than "z-index 1 vs 8" might suggest).
Investigated whether this was actually hiding the guide (unlikely to be
the FULL explanation, since `mix-blend-mode:multiply` darkens rather than
occludes, and the guide was confirmed present in the DOM either way) but
pinned `.dd-grid-overlay` to an explicit low `z-index:1` regardless, so
the relationship is unambiguous and doesn't rely on DOM-order stacking
subtleties holding up under future changes.
**Verified:** 192 designer tests pass unmodified (both existing alignment-
guide tests use either an exact 0px delta or a sibling positioned far
enough away that neither is sensitive to the exact tolerance value).
`pnpm -r typecheck` and designer `pnpm lint` green. Live Puppeteer
verification: a controlled 6px-offset drag (inside the old miss zone)
now shows the guide.
`[status: locked]`

---

### D-060 — Alignment guide compares content edges, not raw box edges, for text/field elements
**Decision:** Immediately after D-059's tolerance fix, user reported the
guide was "not helpful" — pin-pointed precisely via follow-up
`AskUserQuestion`s: "field is of 200px but label is 50px, then vertical
alignment help line does not helpful." `computeAlignSnap` compared THREE
edges per element (`[x, x+w/2, x+w]`) regardless of that element's own
`style.align` — but a right-aligned field whose box is wider than its
content only ever visually sits flush against `x+w`; its box's left edge
and center are empty space, not anything the eye lines up against. The
guide was firing for box-geometry coincidences that didn't correspond to
where any text actually was, which is exactly what made it feel
unhelpful/wrong rather than just imprecise (D-059's problem).
Added `contentXEdges(el, x, w)`: for `'text'`/`'field'` kinds, returns
ONLY the one edge that element's own `align` (`'left'`/`'center'`/
`'right'`, default `'left'`) anchors its content to; other kinds
(image/line/box, no text to anchor) keep all three box edges as before.
Applied to both the dragged element and every sibling. Y-axis (top/
middle/bottom) is unchanged — there's no vertical-align style in
`ElementStyle` for this to apply to, only horizontal `align`.
**Verified:** new test drags an element onto a right-aligned, wider-
than-content sibling's box-left edge (200) — confirms NO guide fires —
then onto that same sibling's real content edge (`x+w` = 400) — confirms
the guide DOES fire there. 193 designer tests (was 192), `pnpm -r
typecheck` and designer `pnpm lint` green.
`[status: locked]`

---

### D-061 — Column "Aggregate (footer)"/"Carry forward" only shown for number/currency columns
**Decision:** User clarified their earlier "total row should be
configurable" ask: the Aggregate control was already correctly
per-column and off-by-default (D-046 era), but it showed for EVERY
column regardless of format — Sum/Average on a `'text'`/`'date'` column
never made sense (only Count arguably would, and even that's a rarer
need not worth keeping the whole control visible for). `ColumnProps.svelte`
now wraps both the "Aggregate (footer)" and "Carry forward (page breaks)"
`Field`s in `{#if column.format === 'number' || column.format === 'currency'}`
— hidden entirely (not just disabled) for Text/Date/Words/Image, exactly
matching the direct request ("it only applicable to number field").
**Why:** Two-step conversation: user first thought the total-row toggle
didn't exist at all (already confirmed working end-to-end, D-058's
changelog entry), then — once shown where it lives — refined the actual
ask to "shouldn't be offered on non-numeric columns," which is the real,
separate gap this closes.
**Verified:** two new `ColumnProps.test.ts` cases (hidden for `'text'`,
shown for `'currency'`); one existing `DocDesigner.test.ts` integration
test previously exercised the aggregate flow against a `'text'`
("description") column — switched to a newly-added numeric ("amount")
dataset field, since summing a text column was never a real scenario,
just a convenient pre-existing fixture. 195 designer tests (was 193),
`pnpm -r typecheck` and designer `pnpm lint` green. Live Puppeteer check
against the real Invoice (Orange) template confirms: hidden for "Item
Description" (text), shown for "Total" (currency).
`[status: locked]`

---

### D-062 — Fixed a real color bug: `ElementProps`'s color presets used `var(--dd-*)` tokens, which silently don't exist in the rendered document
**Decision:** While investigating an unrelated question ("how do I set a
background color for a text field"), found that `ElementProps.svelte`'s
`COLOR_PRESETS` saved literal strings like `'var(--dd-accent)'` into
`element.style.color` — real template DATA, serialized into the
template JSON. `core.renderToHtml` renders that value into a completely
separate, standalone HTML document (the Preview iframe's `srcdoc`, or
the exported PDF) which never defines `--dd-*` anywhere (those only
exist inside the designer custom element's own shadow root). Per CSS
spec, `color:var(--dd-accent)` with an undefined custom property and no
fallback is invalid at computed-value time, so it silently fell back to
the inherited/default color (`#111`, near-black) — **every element
styled with any preset except the raw hex custom-picker rendered wrong
in Preview and PDF**, while looking correct in the Design canvas (whose
shadow root DOES define these tokens). Confirmed directly: injected an
element with `color:'var(--dd-accent)'` and read Preview's own
`getComputedStyle` — `rgb(17,17,17)`, not the intended blue. Fixed:
`COLOR_PRESETS` now uses the tokens' literal light-mode hex values
(`#14161b`/`#2563eb`/`#1a7f37`/`#b3261e`/`#9a6700`) instead of `var()`
references. claude.md's "never a hardcoded hex, always a `--dd-*` token"
rule is about the designer's OWN UI chrome (real component `<style>`
blocks inside the shadow root) — it was mis-applied to a picker for
DOCUMENT content the end user chooses, which must be portable, resolved
CSS the same way the template's own `bg`/`border` values already are.
**Why:** Not a cosmetic nit — this affected every template using the
Color swatch row (the primary, most-used way to pick a color in the
whole redesigned Properties panel from D-051 onward) for anything but
the custom picker. Confirmed via `getComputedStyle` in the actual
Preview iframe, not just re-reading the code.
**Verified:** `pnpm -r typecheck` and designer `pnpm lint` green (no
dedicated `ElementProps` test file exists yet — same gap noted in
D-051). Live check: an element styled `color:'#2563eb'` now computes to
`rgb(37, 99, 235)` in the real Preview iframe.
`[status: locked]`

---

### D-063 — Background color now settable for text/field elements (was box-only)
**Decision:** Direct question — "how to set background color for text
field" — surfaced that `ElementProps.svelte`'s "Background" swatch row
only ever rendered for `element.kind === 'box'`, even though
`ElementStyle.bg` is a general property `core.renderToHtml` already
applies to every element kind, and the reference Invoice (Orange)
template itself relies on `bg` extensively on `text` elements (the
orange/dark SUB TOTAL/GRAND TOTAL boxes). Added the same swatch-row
pattern used for `Color` (reusing `COLOR_PRESETS`, D-062's fixed literal
hex values) to the `text`/`field` block, plus a "No fill" swatch
(diagonal line through a blank circle — the standard "transparent/none"
convention) since, unlike a `box` element which defaults to white,
plain text usually wants no fill at all.
**Verified:** live Puppeteer check confirms the Background row renders
for a `text` element and correctly shows no swatch as "active" for a
`bg` value (orange) that doesn't match any preset — not a false
positive. `pnpm -r typecheck`, designer `pnpm lint`, and the full 195
designer tests all green (no existing test asserted the ABSENCE of this
control).
`[status: locked]`

---

### D-064 — Detail band: optional alternating (zebra) row shading
**Decision:** User-approved addition (of two offered: this and per-side
borders — this one first). New `DetailBand.stripeRows?: boolean`
(`core/types.ts`), off by default so it never silently changes an
existing template's already-reviewed output. `core/render.ts`'s
`renderDetailBand` adds a `detail--striped` class when set; base CSS
adds `table.detail.detail--striped tbody tr:nth-child(even) td { background:
#f6f7f9 }` — `tbody`-scoped only, so the repeating `<thead>`/`<tfoot>`
are never affected. Fixed, non-configurable tint (not a color picker) to
keep this a one-toggle decision, matching `cellBorder`'s existing
precedent. Wired end-to-end: `BandProps.svelte` toggle ("Alternating row
shading", next to the existing "Row borders" toggle) →
`DocDesigner.svelte`'s `handleDetailStripeRowsChange` (same dedicated-
handler precedent as `cellBorder`) → `Properties.svelte` forwarding.
`DetailTable.svelte` (Design canvas) mirrors the identical CSS rule so
the canvas shows the same tint Preview/PDF will.
**Verified:** two new `render.test.ts` cases (class/CSS absent when
unset, present when set — 63 core tests, was 61). Live Puppeteer
check: toggled the checkbox, confirmed `DetailBand.stripeRows` flips to
`true` in the live template, and Preview visibly shows alternating row
tint (row 2 of 3 tinted, rows 1/3 white).
`[status: locked]`

---

### D-065 — Grid sections get an always-visible boundary and a whole-cell background fill
**Decision:** Direct report, with screenshot: two stacked "Text" elements
in a grid section, no visible boundary at all, no way to select "the
section" to configure it as a whole or give it one background. Two
fixes:
1. `.dd-grid-cell--filled` gets a light dashed boundary
   (`var(--dd-border)`) whenever the template's own `gridBorder` (the
   REAL printed border) isn't set — Design-canvas-only, purely decorative,
   never serialized. Previously a section with no printed border was
   completely invisible as a shape in the canvas; only the individual
   elements stacked inside it showed at all.
2. A "Fill" button (revealed on cell hover/focus, same reveal pattern as
   the D-050 split handle) opens a small swatch popover and batch-applies
   ONE `bg` to every element currently stacked in that cell at once, via
   the existing `onUpdateElements` batch-replace callback — no new data
   model needed. This is exactly the mechanism the reference templates
   already use to make a cell read as one solid block (the Invoice
   (Orange) header's BRANDNAME + slogan only LOOK like one dark box
   because both elements independently share the same `bg`, D-063); this
   just makes doing that to a whole cell at once a single action instead
   of setting each element's background one at a time. Presets are the
   same fixed hex palette as `ElementProps`' `COLOR_PRESETS` (D-062), plus
   "No fill" and a custom picker.
**Verified:** two new `GridBand.test.ts` cases — clicking a preset swatch
batch-applies it to every element in that cell's group (and leaves a
DIFFERENT row's elements untouched); "No fill" clears `bg` back to
`undefined`. 197 designer tests (was 195), `pnpm -r typecheck` and
designer `pnpm lint` green. Live Puppeteer check confirmed the fill
button and popover render and the batch-apply visibly recolors every
stacked element in the targeted cell together.
`[status: locked]`

---

### D-066 — Free-form band `height` is now a MINIMUM, not a fixed ceiling — auto-grows to fit content past it
**Decision:** Direct report: the totals band's box felt "restricted" —
content placed below its stored height (150px, e.g.) wasn't blocked
(nothing ever clamped Y — a deliberate D-057 choice), but it rendered
past the band's own colored background into whatever came next, looking
broken. Asked back explicitly (a real architecture choice, not a small
implementation detail) whether to (a) auto-grow like `reportHeader`
already effectively does under `grid`/`stack` arrangement, (b) keep a
fixed height but add a drag-to-resize handle, or (c) something else.
User picked auto-grow.
Added `freeBandHeightPx(band)` (exported from `core/render.ts`):
`Math.max(band.height, contentHeight)` where `contentHeight =
max(el.y + el.h)` across the band's own elements. `arrangement:'grid'`/
`'stack'` bands already auto-size natively (table/flex) and never called
this; it only affects the default `'free'` path — `reportHeader`-if-free,
`totals`, `pageHeader`, `pageFooter`. Wired into:
- `renderFreeBand`'s own `<div>` height (the real rendered output).
- `renderToHtml`'s `runningTop`/`runningBottom` (the `.doc-flow` padding
  reserved for a pageHeader/pageFooter's fixed position) — these MUST
  track the same grown height, or a grown pageFooter would overlap the
  content above it instead of being reserved space for.
- `render-service/pagination.ts`'s `pageBudgetPx` (the carry-forward
  row-placement budget) — same reasoning, must match what `page.pdf()`
  will actually produce.
- Design canvas's `Band.svelte` (both the visual box height AND
  `bandHeightPx` fed to `FreeElement`'s `'%'`-mode conversions) — so
  editing shows the exact same effective height the real output uses.
`DetailBand.height` doesn't exist (detail is always native-table
auto-height already) — out of scope, nothing to change there.
`BandProps.svelte`'s "Height (px)" field relabeled "Minimum height (px)"
with a hint, since it's no longer the actual rendered height once
content exceeds it.
**Verified:** 3 new `render.test.ts` cases (66 core tests, was 63) —
content-fits-within-stored-height is unchanged; content past it grows
the band's own `<div>`; a grown pageFooter reserves matching
`.doc-flow` padding-bottom. 1 new `Band.test.ts` case confirms the
canvas computes the identical grown height. 198 designer tests (was
197). `pnpm -r typecheck`, designer `pnpm lint`, and render-service
`typecheck` all green. Live Puppeteer check: pushed an element to
y:300 in the Invoice (Orange) totals band (stored height 150) —
Design canvas box grew to 320px exactly, and the real Preview shows
the note fully, with the page footer correctly pushed below it with
no overlap.
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
