# progress.md — `<doc-designer>` frontend

> Living checklist. **Update this in the same change that lands work.** Status keys:
> `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
> Keep the "Now / Next / Notes" block at the top current so any session can resume.

---

## Now / Next / Notes

- **Now:** Phase 2's core WYSIWYG loop landed: free-form select/move/resize,
  the full `Properties` panel, and the undo/redo command stack, all wired
  together. `core/history.ts` is a new, generic, framework-agnostic
  `HistoryState<T>` reducer (`commit`/`commitFrom`/`undo`/`redo`), per
  `design.md` §8.7's explicit direction to keep history logic in `core`.
  `FreeElement.svelte` gives every free-form element real click-to-select,
  pointer move (4px grid snap), 8-handle resize (shift-locks aspect for
  images), keyboard arrow-nudge (1px/10px shift, never negative), Delete,
  Cmd/Ctrl+D duplicate, `]`/`[` z-order, and double-click-to-edit for text —
  all correctly cleaned up via `onDestroy` if the element unmounts mid-drag
  (a real bug caught by testing, not just a test artifact — see notes).
  `Properties.svelte` + `ElementProps`/`ColumnProps`/`BandProps` are the
  Selection tab (design.md §10); `PrintSetup` moved under a `Page` tab in the
  same panel. Selection is a three-way discriminated union (`element` |
  `column` | `band`) owned by `DocDesigner`; Escape or clicking empty canvas
  space deselects. D-020 in `memory.md` records the undo/redo granularity
  decision (one step per completed drag/nudge; one step per field-change
  event — not debounced). `pnpm lint && pnpm typecheck && pnpm test && pnpm
  build` all green (`dist/doc-designer.js` ~236KB / ~59KB gzip; 64 tests).
- **Now (2):** `pageHeader`/`pageFooter` bands are wired. `PrintSetup`'s
  "Repeat page header/footer" toggles create the band (`height: 40`, empty
  `elements`, `enabled: true`) on first enable, or flip an existing band's
  `enabled` — the real switch `core.renderToHtml` reads. **Found and fixed a
  latent bug while wiring this:** these two checkboxes previously wrote to
  `printSetup.repeatPageHeader`/`repeatPageFooter`, fields that neither
  `core/render.ts` nor the render service's `pdf.ts` ever read — a
  functionally inert control since Phase 1. Recorded as D-021 in `memory.md`.
  `Canvas.svelte` now renders `pageHeader` above `reportHeader` and
  `pageFooter` below `totals` whenever the band exists (dimmed at 45% opacity
  when currently disabled, so content stays editable while toggled off,
  per design.md §8.2 "toggle on/off" — not delete). 67 tests pass (was 64);
  lint/typecheck/build green (`dist/doc-designer.js` ~243KB / ~60KB gzip).
- **Now (3):** The static "Blocks" palette group (Text/Image/Line/Box, design.md
  §5) is live — the last piece needed to actually *create* non-data elements.
  `Palette.svelte` shows it unconditionally (blocks aren't data, so no entity
  needs to be chosen first), each block a draggable chip (dragstart sets a new
  `application/x-doc-block` MIME payload `{ kind }`) plus a keyboard "+"
  (disabled until wired, same honesty pattern as everywhere else). Added
  `createBlockElement`/`BlockKind` to `template-edits.ts` with per-kind
  defaults (text 200×20 w/ `text:'Text'`; image 120×60 w/ empty URL; line
  200×1; box 100×60). `Band.svelte` now checks for a block payload before a
  field payload on drop; `DetailTable.svelte` rejects block drops outright
  (blocks are free-form-only, never table columns — line-item tables are
  strictly column-mapped). Click-to-add defaults to `reportHeader`, same D-018
  rule as header fields (no "selected band" concept for a plain click).
  74 tests pass (was 67); lint/typecheck/build green (`dist/doc-designer.js`
  ~246KB / ~61KB gzip).
- **Now (4):** Template list/rename/delete + debounced `onChange` autosave are
  done. New `TemplateList.svelte` is the "[Template name ▾]" dropdown from
  `design.md` §4's toolbar mockup: lists every `erpdoc.templates.*` entry
  (standalone/localStorage mode only — disabled with an explanatory `title`
  when the host supplies `onSave`, since then the host owns storage and this
  browser's list isn't authoritative, per D-010), click to load
  (`setTemplate`, resets undo history same as any host-driven replacement),
  a delete button per entry, and "+ New template". Rename was already fully
  working (the existing name input + Save) — this adds list/switch/delete/new.
  `persistence.ts` gained `listTemplatesFromLocalStorage`/
  `deleteTemplateFromLocalStorage`. `DocDesigner` now also debounces
  `config.onChange(template)` at 800ms behind any edit (design.md §13),
  distinct from the explicit-click `onSave`.
  **Found and fixed a real Shadow DOM bug, not a test artifact:** the
  popover's "click outside to close" handler used
  `triggerEl.contains(e.target)` from a `window`-level listener — but Shadow
  DOM event retargeting rewrites `e.target` to the shadow host once an event
  crosses the shadow boundary, so this closed the popover on *every* click,
  including the trigger's own. Fixed with `e.composedPath()`, which isn't
  retargeted. Recorded as D-022 in `memory.md` — applies to any future
  dropdown/popover in this codebase. 89 tests pass (was 74); lint/typecheck/
  build green (`dist/doc-designer.js` ~256KB / ~63KB gzip).
- **Now (5):** The keyboard drag-alternative (design.md §12: "select a chip,
  press Enter to pick up, [Tab to] a band, Enter to drop") is wired end-to-end
  — **Phase 2 is fully done.** `FieldChip`/the Blocks chips in `Palette` are
  keyboard-focusable (`tabindex=0` when a pick-up handler is supplied) and
  respond to Enter/Space by calling `onPickUp`; `types.ts` gained a `PickedUp`
  discriminated union (`header`/`dataset` field or `block`), threaded down
  through `FieldGroup`/`Palette` and lifted to `DocDesigner.svelte` as
  `pickedUp` state. `Band.svelte`/`DetailTable.svelte`'s tab `<button>`s got
  `data-band-id` so a focused tab can be identified on Enter. Validation of
  the drop target lives in `Canvas.svelte`'s `handlePageKeydown` — deliberately
  mirroring (and reusing the exact same rejection strings as)
  `Band.svelte`/`DetailTable.svelte`'s existing mouse-drop validation, so
  keyboard and mouse drops are indistinguishable in outcome; `onKeyboardDrop`
  only ever fires for an already-valid target, so `DocDesigner.handleKeyboardDrop`
  just constructs+commits via the same `template-edits.ts` helpers
  `handlePaletteAddField`/`handlePaletteAddBlock` already use. Escape cancels
  an active pick-up (takes priority over its existing "deselect" role); an
  `aria-live="polite"` region announces "{label} picked up. Tab to a band,
  Enter to drop, Escape to cancel." Deliberately did **not** build custom
  arrow-key roving-focus between band tabs — native Tab/Shift+Tab already
  moves focus between them (each is a real, individually focusable `<button>`
  in DOM order), so `design.md`'s "[Tab to] a band" is satisfied for free.
  96 tests pass (was 89); lint/typecheck/build all green
  (`dist/doc-designer.js` ~263KB / ~64KB gzip).
- **Now (Phase 3, in progress):** Started on the ERP-grade checklist. Two items
  done so far — raw-query (SQL) dataset authoring in `SourceConfig.svelte`,
  and per-column aggregates (`ColumnProps.svelte` + a real-sample-data
  `<tfoot>` preview in `DetailTable.svelte`), both mostly UI-only since `core`
  already had the underlying types/rendering (`TemplateDataset.kind:'sql'`,
  `DetailBand.aggregates` → `renderDetailBand`'s `<tfoot>`) — see D-024.
  106 tests pass (was 96); lint/typecheck/build all green
  (`dist/doc-designer.js` ~271KB / ~66KB gzip). Continuing down the Phase 3
  list next (i18n locale/currency picker, amount-in-words, conditional
  formatting, saved themes). **Two remaining Phase 3 items — barcode/QR and
  carried-forward subtotals — trip `claude.md` §9's "stop and flag" rule**
  (barcode/QR generation has no correct hand-rollable implementation without a
  new dependency; carried-forward subtotals need break positions only the
  render-service's Puppeteer step can see, i.e. a second computation path
  beyond `core.renderToHtml` — design.md §9 itself already flags this one as
  "server-only, Phase 3"). Flagging these to the user for a decision rather
  than guessing; not silently skipped.
  Also still carried forward from Phase 1/2: wiring `doc-save`/`doc-change`
  `CustomEvent` dispatch (see Phase 1 notes below — `onChange` now has a
  real callback-based path via `config.onChange`, but the DOM `CustomEvent`
  variant for host frameworks that prefer events isn't wired yet); asset
  upload for the Image element (memory.md O-1, still open — URL-based images
  work today).
- **Pagination gate evidence (claude.md §8, 2026-07-28):** Built
  `@docsmith/render-service`, started it locally, and ran
  `RENDER_URL=http://localhost:8090 pnpm demo` to render the real 60-line
  `StaticAdapter` invoice fixture through the actual Puppeteer pipeline (the
  same `core.renderToHtml` the designer's `Preview.svelte`/Export PDF call —
  D-009 single renderer — so this transitively verifies the designer's own
  pipeline, not just the backend in isolation). Parsed the resulting
  `out.pdf` with `pdfjs-dist` (installed ad hoc in the scratchpad directory
  for this verification only — never added to any package.json) instead of
  trusting a raw-bytes string search, since Chromium's PDF text uses
  glyph-indexed subset fonts that don't contain literal ASCII in the raw
  stream bytes:
  - **3 pages.** Page 1: 26 rows (100–125) + "INVOICE"/"INV-1001"
    (`reportHeader`) + the "Description" column header. Page 2: 32 rows
    (126–157) + "Description" header **repeats**, no `reportHeader` text.
    Page 3: 2 rows (158–159) + "Description" header repeats again + "Payment
    due within 30 days" (`totals` text, printing once, after the last row).
  - **No split/duplicated/dropped rows:** extracted all 60
    `Widget model X-NNNN` row markers across all 3 pages — 60 unique values,
    contiguous 100→159, zero gaps, zero duplicates.
  - **Geometry actually changes:** re-rendered the same template+data via
    the render service with different `printSetup`s and measured real PDF
    page dimensions with `pdfjs-dist`: A4 portrait → 210.2×297.0mm (3
    pages); Letter landscape → 279.4×215.9mm, correctly swapped (4 pages —
    less vertical room per page, a real geometry-driven page-count change);
    A4 portrait with 40mm margins → same page size (correct — margins don't
    change page dimensions) but a different row distribution (26/33/1 vs.
    the base 26/32/2), confirming margins do change the usable content area.
    All three variants still passed the same zero-gaps/zero-duplicates row
    check independently.
  - Scripts used were throwaway (`/tmp`, scratchpad) and are not part of this
    change; reproduce via `pnpm --filter @docsmith/render-service build`,
    run `node packages/render-service/dist/server.js`, then
    `RENDER_URL=http://localhost:8090 pnpm demo` and inspect `out.pdf` with
    any PDF text-extraction tool.
- **Notes / open questions:**
  - Real bug caught by `FreeElement.test.ts`, not just a test artifact:
    `FreeElement.svelte` added `window`-level `pointermove`/`pointerup`
    listeners on drag-start but never removed them if the component was
    destroyed mid-drag (e.g. deleted while being dragged) — a real leak and a
    crash risk (a stale closure firing after Svelte tears the component down;
    reproduced as "Cannot convert a Symbol value to a number" once a
    destroyed component's prop was read from an old listener). Fixed with an
    `onDestroy` cleanup removing both listeners unconditionally.
  - `pnpm` was not preinstalled in this environment; installed globally via
    `npm install -g pnpm@9.12.0` (matches the repo's pinned `packageManager`).
  - jsdom has no `DataTransfer`/`DragEvent` data channel implementation, so
    `Band.test.ts`/`DetailTable.test.ts` use `fireEvent.drop(el, { dataTransfer:
    { getData: () => json } })` — a plain fake object, not a real
    `DataTransfer` — which is the standard way to test HTML5 DnD under jsdom.
  - Deferred, tracked niceties (none block Phase 1's DoD): the mm ruler along the
    canvas edges (`design.md` §8.1); dragover-time valid/invalid highlighting
    before drop (would need a second, class-specific MIME type per chip class to
    inspect during `dragover`, since `dataTransfer.getData` is only readable on
    `drop`); zoom/pan (§8.6, naturally pairs with Phase 2's free-form move/resize,
    since "guides must be zoom-correct" only matters once move/resize exist);
    band-height resize handles; column-width drag-handles (Phase 1 uses a
    `NumberInput` instead — still meets "resize columns," just not via a drag
    handle).
  - The static "Blocks" palette group (Text/Image/Line/Box, per `design.md` §5/§14
    mockup) is deliberately **not built yet** — it only makes sense once
    `FreeElement.svelte` exists to receive a block drop, and that's explicitly
    Phase 2 (`design.md` §17). Not forgotten, just sequenced correctly.
  - D-017 (`memory.md`): `getRelatedDatasets` returns only `{id, label}`, no FK
    column, so `SourceConfig` builds `ref: { table: meta.id, fkColumn: '' }` when
    adding a dataset rather than guessing a naming convention. Confirmed by grep
    that `TemplateDataset.ref` is unused by `core`/adapters at runtime — authoring
    metadata only. Revisit if a real consumer of `.ref` is ever added.
  - vitest+`@testing-library/svelte` gotcha: `render()` initially failed with
    `mount(...) is not available on the server` — Vite/vitest was resolving
    svelte's server/SSR export condition even under `environment: 'jsdom'`. Fixed
    with `resolve.conditions: ['browser']` when `process.env.VITEST` is set (see
    `vite.config.ts`). Also needed `@testing-library/svelte/vitest` (auto
    `cleanup()` between tests) in `test-setup.ts`, or `screen` queries leak DOM
    across tests in the same file and produce false "multiple elements" failures.
  - Doc-update ritual applied: `svelte-check` and `jsdom` added to the approved
    dev-dependency list (dev-only; zero runtime/bundle impact) to unblock TS
    type-checking of `.svelte` files and vitest's DOM environment for
    `@testing-library/svelte`. See `memory.md` D-016, `claude.md` §3, `design.md` §3.
  - `$host()` hit a real typing issue against the installed Svelte 5.56.8 (`svelte-check`
    reported "used before its declaration" / implicit `any`). Sidestepped it: the
    `theme` config option is applied as inline CSS custom properties on the
    shadow-root's top-level `<div>` instead of via `$host()`, which cascades to every
    `--dd-*` consumer just the same. Revisit if a later Svelte version fixes `$host()`
    typings, but no behavior is lost with the current approach.
  - vitest+jsdom quirk: neither this jsdom version nor Node 22's own experimental
    global `localStorage` (undefined without `--localstorage-file`) gave a working
    `Storage` in tests. Added `src/test-setup.ts`, a minimal in-memory `Storage`
    polyfill wired via `vite.config.ts` `test.setupFiles` — test-only, excluded from
    `dist` via `tsconfig.build.json`. `persistence.ts` itself just uses the ambient
    `localStorage` global, which is real in any actual browser.
  - `doc-save`/`doc-change` DOM `CustomEvent` dispatch (design.md §13's secondary
    channel "for host frameworks that prefer events over callbacks") is **not yet
    wired** — only the callback path (`config.onSave`) works so far. The SDK's
    `mount()` already listens for these events, so this is a real gap to close,
    likely alongside `onChange`/autosave in Phase 2, not silently dropped.
  - Export PDF and Undo/Redo are visible in the toolbar but intentionally disabled:
    Export needs an entity+doc-id source that doesn't exist until `Preview`/`SourceConfig`
    land; Undo/Redo needs the Phase 2 command stack. Disabling (not hiding) keeps the
    full toolbar layout visible per `design.md` §4 while staying honest about what's
    implemented.
  - Pre-existing, not touched (out of scope for this frontend-only change):
    `pnpm -r test` fails on `@docsmith/adapters` — it declares a `test` script but
    has no test files yet, so `vitest run` exits 1. `packages/designer`'s own
    `pnpm test` is unaffected and green.
  - `@playwright/test` is intentionally NOT installed yet — `claude.md` §1 scopes it
    to "Phase 2+"; UI verification for Phase 0/1 so far is via `@testing-library`-style
    jsdom tests that mount the real compiled custom element (click buttons, type into
    inputs, assert shadow DOM text) plus manual `pnpm dev` + curl smoke checks. No
    pixel-level/visual browser check has been done — say so rather than claim it.
  - Import types from `@docsmith/core` — do NOT redefine `Template`, `FieldMeta`,
    `DataSourceAdapter`. Preview/PDF MUST call `core.renderToHtml` (single renderer).
  - Reference the runnable backend: `pnpm demo` at repo root → `examples/invoice-demo/out.html`.

---

## Phase 0 — Scaffold

- [x] pnpm workspace joined; `packages/designer` builds a `doc-designer` custom element
- [x] TypeScript strict, ESLint, Prettier, Vitest configured; `pnpm lint/typecheck/test` green
- [x] `src/ui/tokens.css` with the full `--dd-*` token set (light + dark)
- [x] `src/ui/` primitives: `Button`, `Select`, `NumberInput`, `Field`, `Toast`,
      `Skeleton`, `ErrorInline`, `Collapsible`
- [x] `DocDesigner.svelte` root mounts, reads `{ adapter, template, onSave, ... }`
- [x] `StaticAdapter` wired for local dev — `pnpm --filter @docsmith/designer dev`
      serves `packages/designer/dev`, which imports the same
      `examples/invoice-demo/fixtures.mjs` (60-line invoice) the backend demo uses

## Phase 1 — MVP shell (end-to-end, real data, multi-page PDF) — ✅ DONE 2026-07-28

- [x] `Toolbar.svelte` — name, Design/Preview toggle, Save, Export PDF (undo/redo stubbed)
- [x] `Palette.svelte` + `SourceConfig.svelte` — entity dropdown from `listEntities`;
      add/remove datasets from `getRelatedDatasets`
- [x] `FieldGroup.svelte` + `FieldChip.svelte` — System/Custom/dataset groups from
      `getFields`/`getDatasetFields`; loading/empty/error states
- [x] `Canvas.svelte` — page geometry from `printSetup`; **fixed bands** rendered
- [x] `Band.svelte` — report/totals bands accept header fields via add-list (drag optional in P1)
- [x] `DetailTable.svelte` — add/reorder/resize/format columns from dataset fields;
      real sample rows via `listSampleIds`→`fetchDocument`
- [x] `PrintSetup.svelte` — page size/orientation/margins + repeat/keep toggles → `printSetup`
- [x] `Preview.svelte` — doc-id control; iframe renders `core.renderToHtml(template,data)`
- [x] Browser **Print** works; **Export PDF** posts to render service and downloads
- [x] **Pagination gate passed** (claude.md §8): ≥40-row doc, header repeats, no split row
- [x] localStorage default persistence when no `onSave` supplied

## Phase 2 — Full WYSIWYG

- [x] Free-form drag/move/resize (`FreeElement.svelte`) with grid snap
      (smart guides-to-siblings and multi-select/marquee are deferred — see
      notes above; single-select move/resize/keyboard is fully real)
- [x] `Properties.svelte` + `ElementProps`/`ColumnProps`/`BandProps` — full editors
- [x] `pageHeader`/`pageFooter` bands (toggle on/off; `position:fixed` running bands)
- [x] Image/logo element (URL) — `ElementProps` has the URL field, `FreeElement`
      renders `<img>`, and the Blocks group adds one. Upload-via-host/adapter is
      still open (memory.md O-1: asset storage API isn't decided yet)
- [x] Undo/redo command stack (≥50 steps, `core.DEFAULT_MAX_HISTORY`) wired
      through all mutations
- [x] Template list / rename / delete; `onChange` autosave (debounced)
- [x] Keyboard drag-alternative (pick up chip → Tab to band → Enter to drop)

**Phase 2 is DONE (2026-07-28).**

## Phase 3 — ERP-grade

- [x] Multiple datasets + raw-query datasets — `SourceConfig.svelte` gained an
      "Add a custom (SQL) dataset" form (id/label/SQL query), building a
      `kind:'sql'` `TemplateDataset` via `core.datasetFromMeta`. Multiple
      datasets already worked at the template level (`dataSource.datasets[]`);
      this closes the "raw-query" half — declarative authoring metadata only,
      never executed by the designer (same contract as D-017's FK `ref`).
- [x] Per-column aggregates → `<tfoot>` (sum/count/avg) — `ColumnProps.svelte`
      gained an "Aggregate (footer)" select reading/writing
      `DetailBand.aggregates` (D-024); `DetailTable.svelte`'s canvas now shows
      a live `<tfoot>` preview computed via `core.aggregate()` against the same
      real sample rows already loaded (never fabricated). `core.renderToHtml`
      already rendered this — only the authoring UI was missing.
- [ ] Conditional formatting (declarative rules)
- [ ] Barcode / QR element
- [ ] i18n + locale currency; amount-in-words
- [ ] Carried-forward subtotals (server-assisted)
- [ ] Saved themes / brand presets

---

## Cross-cutting (must hold at every phase)

- [ ] A11y: keyboard, focus rings, SR labels, contrast, reduced-motion
- [ ] Light + dark correct; only `--dd-*` tokens
- [ ] Every async surface: loading + empty + error
- [ ] No fabricated data anywhere
- [ ] No new runtime dependency added without the doc-update ritual
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green

---

## Decision log pointer

New decisions made while building go into **`memory.md`** (not here). This file
tracks *status*; `memory.md` tracks *why*.

---

## Changelog (newest first)

- **2026-07-28 — Phase 3 started: raw-query datasets + per-column aggregates.**
  `SourceConfig.svelte` gained an "Add a custom (SQL) dataset" form (dataset
  id, label, SQL query text) building a `kind:'sql'` `TemplateDataset` via
  `core.datasetFromMeta` — validates id/label/query are non-empty and the id
  doesn't collide with an existing dataset, but never executes the query
  itself (purely declarative authoring metadata the adapter's `fetchDocument`
  is expected to honor by id, same contract as D-017). `ColumnProps.svelte`
  gained an "Aggregate (footer)" select (None/Sum/Count/Average) reading/
  writing `DetailBand.aggregates` — recorded as D-024 (aggregates stay keyed
  on the band, never denormalized onto `DetailColumn`, since `core` already
  owned that shape before Phase 3 and it's already fully wired into
  `render.ts`'s real `<tfoot>` output). `DetailTable.svelte`'s canvas now
  shows a live sample-data `<tfoot>` preview via `core.aggregate()` — computed
  against the same real sample rows already loaded for the row-preview strip,
  shown only once those rows are actually ready (never a fabricated total).
  10 new tests (`SourceConfig` +3, `ColumnProps` new file +4, `DetailTable`
  +2, `DocDesigner` +1). 106 tests pass (was 96); lint/typecheck/build all
  green (`dist/doc-designer.js` ~271KB / ~66KB gzip).
- **2026-07-28 — Keyboard drag-alternative — Phase 2 DONE.** Implemented
  design.md §12's "select a chip, press Enter to pick up, [Tab to] a band,
  Enter to drop" for both field chips and the Blocks group. New `PickedUp`
  union in `types.ts`; `FieldChip.svelte`/`Palette.svelte`'s block chips gain
  keyboard focus + Enter/Space pick-up (`picked`/`onPickUp` props, an
  `aria-label` suffix and `.dd-chip--picked` style while held);
  `FieldGroup.svelte` threads `pickedUp`/`onPickUp` down via an `isPicked()`
  helper. `Band.svelte`/`DetailTable.svelte` tab buttons gained
  `data-band-id` so `Canvas.svelte` can read which band tab has focus on
  Enter. All pick-up/drop state (`pickedUp`) is owned by `DocDesigner.svelte`;
  `Canvas.svelte`'s `handlePageKeydown` validates the target band before ever
  calling `onKeyboardDrop`, reusing the identical rejection strings
  `Band`/`DetailTable`'s mouse-drop handlers already use ("Line-item fields
  can only go in the items table.", "That field belongs to a different
  dataset than this table.", "Header fields can't become table columns…",
  "Blocks…can only go on a header, totals, or page band.") — so keyboard and
  mouse drops reject identically, and `DocDesigner.handleKeyboardDrop` never
  re-validates, just constructs+commits via the same `template-edits.ts`
  helpers used everywhere else. Escape cancels an active pick-up (now takes
  priority over Escape's pre-existing "deselect" role); an `aria-live` status
  region announces the pick-up and its instructions. Deliberately relied on
  native Tab/Shift+Tab between band tab `<button>`s instead of building
  custom arrow-key roving focus — every tab is already a real, individually
  focusable element in DOM order. 7 new tests (2 in `Palette.test.ts`, 2 in
  `FieldGroup.test.ts`, 3 end-to-end in `DocDesigner.test.ts` covering a
  successful drop, Escape-cancel, and a rejected-then-retried drop). 96 tests
  pass (was 89); lint/typecheck/build all green
  (`dist/doc-designer.js` ~263KB / ~64KB gzip). **This closes out Phase 2 —
  every Phase 2 checklist item is now checked off.**
- **2026-07-28 — Template list/rename/delete + debounced `onChange` autosave.**
  New `TemplateList.svelte`: the "[Template name ▾]" dropdown from `design.md`
  §4, listing `erpdoc.templates.*` (standalone-mode only — disabled when the
  host supplies `onSave`, per D-010), with click-to-load, per-entry delete,
  and "+ New template". `persistence.ts` gained
  `listTemplatesFromLocalStorage`/`deleteTemplateFromLocalStorage` (+ tests).
  `DocDesigner` debounces `config.onChange(template)` at 800ms on every edit
  (design.md §13), separate from the explicit `onSave` click. **Found and
  fixed a real Shadow DOM bug** (not a test artifact): the popover's
  click-outside-to-close handler used `triggerEl.contains(e.target)` from a
  `window`-level listener, but Shadow DOM event retargeting rewrites
  `e.target` to the shadow host once an event crosses the shadow boundary —
  so it closed the popover on *every* click, including the trigger's own.
  Fixed with `e.composedPath()`. Recorded as D-022 in `memory.md` — applies to
  any future dropdown/popover in this codebase. 89 tests pass (was 74);
  lint/typecheck/build green.
- **2026-07-28 — Blocks palette group (Text/Image/Line/Box).** Added the static
  "Blocks" group to `Palette.svelte` (design.md §5), shown unconditionally since
  blocks aren't data-bound. Each is a draggable chip (`application/x-doc-block`
  MIME payload `{ kind }`) plus a keyboard "+" (honestly disabled until
  `onAddBlock` is wired). Added `createBlockElement`/`BlockKind` to
  `template-edits.ts` with sensible per-kind defaults. `Band.svelte` checks for
  a block payload before a field payload on drop; `DetailTable.svelte` rejects
  block drops outright with an explanatory reason (free-form-only, never table
  columns). Click-to-add defaults to `reportHeader` (D-018's established
  no-selected-band rule). This closes the "Image/logo element" Phase 2 item
  for the URL-based path (upload-via-adapter is still open, memory.md O-1).
  74 tests pass (was 67); lint/typecheck/build green.
- **2026-07-28 — `pageHeader`/`pageFooter` bands.** `PrintSetup`'s "Repeat page
  header/footer" toggles now create/enable the actual `pageHeader`/`pageFooter`
  `FreeBand` (`DocDesigner.handleTogglePageBand`), which `Canvas.svelte` renders
  above `reportHeader`/below `totals` whenever present (dimmed when disabled,
  content stays editable). Found and fixed a real latent bug while wiring
  this: the toggles previously wrote to `printSetup.repeatPageHeader/Footer`,
  fields neither `core.renderToHtml` nor the render service's Puppeteer PDF
  generation ever read — confirmed by grep, a functionally inert control since
  Phase 1. Recorded as D-021 in `memory.md`. `BandProps`'s existing "Show this
  band" toggle (built during the Properties-panel work) now has bands to
  actually toggle. 67 tests pass (was 64); lint/typecheck/build green.
- **2026-07-28 — Phase 2: free-form select/move/resize + Properties + undo/redo.**
  Added `packages/core/src/history.ts` (`HistoryState<T>`, `commit`/`commitFrom`/
  `undo`/`redo`/`canUndo`/`canRedo`, `DEFAULT_MAX_HISTORY = 50`) — generic, pure,
  framework-agnostic, per `design.md` §8.7. `DocDesigner.svelte`'s `template` is
  now `$derived(history.present)`; every existing mutation handler routes through
  a new `commitTemplate()` instead of direct assignment. Added
  `FreeElement.svelte`: click-select, pointer move (4px grid snap, matches
  unidb-studio's `SchemaVisualizer` drag-delta-over-zoom pattern), 8 resize
  handles (shift locks aspect ratio for images), keyboard arrow-nudge (1px,
  10px with shift, clamped ≥0), Delete/Backspace, Cmd/Ctrl+D duplicate, `]`/`[`
  z-order, double-click-to-edit for text elements — fully accessible
  (`role="button"`, descriptive `aria-label` per design.md §12's
  `"{label} field, {band}, x {x} y {y}"` pattern, real keyboard operability).
  Drag/resize gestures batch into exactly one undo step via
  `onDragStart`/`onChange` (live, unbatched)/`onDragEnd` (folds the pre-drag
  snapshot into history via `commitFrom`); each keyboard nudge is its own
  step. Recorded D-020 in `memory.md` for this granularity choice. Added
  `Properties.svelte` (Selection/Page tabs) + `ElementProps.svelte` +
  `ColumnProps.svelte` + `BandProps.svelte`; `PrintSetup` now lives under the
  Page tab. Selection is a new `Selection` union type (`element`/`column`/
  `band`) in `types.ts`, owned by `DocDesigner`; clicking empty canvas space or
  pressing Escape deselects. `Band.svelte`/`DetailTable.svelte` updated for
  click-to-select on their tabs/columns. Real bug caught by testing (not a
  test artifact): `FreeElement.svelte`'s `window` pointermove/pointerup
  listeners were never cleaned up if the component unmounted mid-drag — fixed
  with an `onDestroy` handler. 64 tests pass (was 48, +7 in `core` for
  `history.test.ts`); lint/typecheck/build all green (`dist/doc-designer.js`
  ~236KB / ~59KB gzip).
- **2026-07-28 — Phase 1 (MVP shell) DONE — pagination gate passed.** Verified
  the `claude.md` §8 gate with real evidence, not a manual eyeball check: built
  `@docsmith/render-service`, rendered the 60-row `StaticAdapter` invoice
  fixture through the actual Puppeteer pipeline (same `core.renderToHtml` the
  designer's own `Preview`/Export PDF call — D-009), and parsed the resulting
  PDF with `pdfjs-dist` (ad hoc, scratchpad-only, not added to any
  package.json). Result: 3 pages; column header repeats on every page;
  `reportHeader` appears only on page 1; `totals` appears only on the last
  page; all 60 line-item rows present exactly once, contiguous, no
  splits/duplicates/gaps. Re-rendered with A4 portrait / Letter landscape / A4
  with 40mm margins and confirmed real PDF page dimensions and row
  distribution actually change accordingly. Full details and repro steps in
  the "Pagination gate evidence" note above. All 11 Phase 1 checklist items
  are now checked off.
- **2026-07-28 — Export PDF + browser Print.** `docId` state moved from
  `Preview` up to `DocDesigner` (now a controlled `docId`/`onDocIdChange` prop
  pair on `Preview`) so the Toolbar's Export PDF button can share it.
  `handleExportPdf` re-fetches the document via the adapter and `POST`s
  `{ template, data }` to `` `${renderServiceUrl}/render` `` — push mode, not the
  `{ template, entity, id }` shape `claude.md` §10 summarizes, because the
  server's pull mode additionally needs a serialized `RestConfig` that only
  `RestAdapter` has (D-019 in `memory.md`). Downloads the returned PDF blob via
  a temporary `<a download>`; shows a success/error `Toast` (error message
  suggests Print as a fallback, per `design.md` §9). The button itself is
  disabled — not hidden — until `renderServiceUrl` + `entity` + `docId` are all
  present. Added a `Print` button inside `Preview.svelte` (disabled until a
  document has loaded) calling `iframe.contentWindow.print()` directly, since
  Preview is the only component holding the iframe reference. 48 tests pass
  (was 44); lint/typecheck/build green (`dist/doc-designer.js` ~189KB / ~50KB
  gzip). This closes out Phase 1's MVP-shell component list — only the
  pagination gate verification remains before Phase 1 is done.
- **2026-07-28 — `Preview.svelte`.** Preview mode calls the real
  `core.renderToHtml(template, data)` — the single-renderer requirement (D-009)
  — and injects the result into a same-origin `<iframe srcdoc>`. Doc-id control:
  `<Select>` from `listSampleIds` (auto-selects the first result) when the
  adapter implements it, free-text `<input>` fallback otherwise. Loading/error
  (+Retry)/honest-empty-id states throughout; a missing document id renders an
  honest empty table via the adapter's own `{header:{}, datasets:{}}` fallback,
  never a fabricated row. `previewDocument` is `$derived` from both `template`
  and the fetched data, so Design-mode edits show up next time you switch to
  Preview with no extra plumbing. Wired into `DocDesigner`'s preview-mode
  branch, replacing the placeholder. 44 tests pass (was 39); lint/typecheck/build
  green (`dist/doc-designer.js` ~185KB / ~49KB gzip).
- **2026-07-28 — `PrintSetup.svelte`.** Page size/orientation `<Select>`s, four
  margin `NumberInput`s, and four toggles (repeat page header/footer, show page
  numbers, keep rows together) all patch `template.printSetup` live via
  `onPrintSetupChange`; keep-rows-together patches the `detail` band's own
  `keepRowTogether` via a separate `onKeepRowTogetherChange` (it's a per-band
  field in the data model, not part of `PrintSetup`, even though `design.md` §10
  groups it into the same tab). Wired into `DocDesigner` as a design-mode-only
  right rail. 39 tests pass (was 33); lint/typecheck/build green
  (`dist/doc-designer.js` ~173KB / ~45KB gzip).
- **2026-07-28 — `Canvas.svelte` + `Band.svelte` + `DetailTable.svelte`.** The
  authoring loop is now real: drag a chip (or click its "+") and it becomes a
  template element/column. Added `src/geometry.ts` (page-size mm→px, design-time
  canvas geometry only — `core.renderToHtml` keeps using real `mm`) and
  `src/template-edits.ts` (`createFieldElement`/`createDetailColumn`, shared pure
  helpers so the click-add and native-DnD paths build identical structures).
  `Band.svelte` renders `reportHeader`/`totals`, accepts header-field drops
  (rejects dataset fields with a toast), shows elements as `{label}` tokens
  stacked automatically. `DetailTable.svelte` accepts dataset-field drops scoped
  to its own dataset (rejects header fields and other datasets), full column
  add/remove/reorder(drag)/format+align+width, and real sample rows via
  `listSampleIds`→`fetchDocument`. `DocDesigner.handlePaletteAddField` wires
  `Palette.onAddField` for real; recorded D-018 in `memory.md` (header-field "+"
  defaults to `reportHeader`, dataset-field "+" always targets `detail` — its
  only legal destination). Discovered jsdom has no `DataTransfer` — tests fake
  just the `getData()` surface via `fireEvent.drop`. 33 tests pass (was 21);
  lint/typecheck/build green (`dist/doc-designer.js` ~164KB / ~44KB gzip).
- **2026-07-28 — `FieldGroup.svelte` + `FieldChip.svelte`.** `FieldGroup` is
  self-contained: it fetches its own field list (`getFields` for the header group,
  `getDatasetFields(entity, datasetId)` per dataset group — decided by its `cls`
  prop), with the same loading/empty/error+Retry triad and generation-counter
  cancellation as `SourceConfig`. It splits System/Custom sub-groups only when
  both kinds are present (D-013 — never an empty "Custom" header). `FieldChip`
  renders the native HTML5 DnD drag source (`application/x-doc-field` MIME
  payload per `design.md` §5, format defaulted via `core.defaultFormatForType`)
  plus a keyboard "+" affordance, `aria-label`led per field, disabled whenever no
  `onAdd` is supplied. `Palette.svelte` adds the field-search box (filters every
  `FieldGroup`) and now renders one header `FieldGroup` plus one per
  `dataSource.datasets` entry, plus a new `onAddField` prop threaded through but
  left unwired from `DocDesigner` — there's no Canvas/Band/DetailTable yet to
  receive an add, so every chip's "+" is honestly disabled for now, same pattern
  as Toolbar's Export PDF/Undo/Redo. Also updated root `README.md`: it previously
  said the frontend was "spec complete, not yet implemented" — now documents
  `pnpm --filter @docsmith/designer dev/lint/typecheck/test/build`. 21 tests pass
  (was 14); lint/typecheck/build all green (`dist/doc-designer.js` ~141KB / ~39KB
  gzip). The static "Blocks" palette group (Text/Image/Line/Box) is deliberately
  deferred to Phase 2, when `FreeElement.svelte` exists to receive it.
- **2026-07-28 — `Palette.svelte` + `SourceConfig.svelte`.** `SourceConfig` drives
  `template.dataSource` against the real adapter: entity `<Select>` from
  `listEntities()`, related-dataset add/remove from `getRelatedDatasets(entity)`
  using `core.datasetFromMeta` (never hand-rolled), full loading/empty/error
  triads (Skeleton/ErrorInline+Retry/honest empty hint), a visually-hidden
  `aria-live` region announcing load results, and generation-counter guards so a
  stale fetch (superseded by a fast entity switch) can't clobber newer state.
  `Palette` is a thin left-rail wrapper. `DocDesigner.svelte` now renders a real
  two-region workspace: design mode shows `Palette` + a Canvas placeholder,
  preview mode shows its own placeholder and hides the Palette. Recorded D-017 in
  `memory.md` (placeholder `ref` for added datasets — `getRelatedDatasets` doesn't
  expose FK column names, and `ref` is confirmed unused by `core`/adapters at
  runtime). Fixed a real `@testing-library/svelte` + vitest resolution gap
  (`resolve.conditions: ['browser']`) and added `@testing-library/svelte/vitest`
  auto-cleanup to `test-setup.ts`. 14 tests pass (was 10); lint/typecheck/build
  green (`dist/doc-designer.js` ~124KB / ~35KB gzip).
- **2026-07-28 — `Toolbar.svelte` (Phase 1, first component).** `DocDesigner.svelte`
  now seeds `template` via `core.newTemplate()` instead of `null`, owns `mode`
  ('design'|'preview') state, and renders `Toolbar`: editable name input, Design/
  Preview toggle, Save (host `onSave` or `localStorage` default per D-010, with a
  `Toast`), Undo/Redo + Export PDF present but disabled (no command stack / no
  doc-id source yet). Added `src/persistence.ts` (+ test) for the localStorage
  path. Added `src/test-setup.ts` to work around a vitest+jsdom+Node22
  `localStorage` gap (see notes above). 10 tests pass (was 4); lint/typecheck/build
  all green. `doc-save`/`doc-change` CustomEvent dispatch is a known, tracked gap
  (see notes) — not yet wired.
- **2026-07-28 — Phase 0 scaffold landed.** `packages/designer` joined the pnpm
  workspace: Vite lib build compiling `DocDesigner.svelte` to the single
  `doc-designer` custom element (Shadow DOM, `<svelte:options customElement=...>`,
  `compilerOptions.customElement: true` in both `vite.config.ts` and
  `svelte.config.js` — svelte-check reads the latter independently); TS strict,
  ESLint (flat config) + Prettier, Vitest (jsdom) all configured and green;
  `src/ui/tokens.css` (full `--dd-*` set, light/dark + host theme-override
  variants); 8 `src/ui/` primitives; `DocDesigner.svelte` reads `config` (adapter,
  template, onSave, onChange, renderServiceUrl, theme), exposes
  `getTemplate`/`setTemplate`, shows an honest empty state with no adapter, and
  applies `theme` overrides as inline custom properties (not `$host()` — see notes
  above). Added `packages/designer/dev/` as a local harness reusing the backend's
  `StaticAdapter` fixture. Recorded D-016 in `memory.md` (added `svelte-check` +
  `jsdom` to the approved dev-dependency list) per the `claude.md` §9 doc-update
  ritual. Toolbar/Palette/Canvas/Preview are Phase 1, not yet started.
