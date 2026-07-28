# progress.md — `<doc-designer>` frontend

> Living checklist. **Update this in the same change that lands work.** Status keys:
> `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
> Keep the "Now / Next / Notes" block at the top current so any session can resume.

---

## Now / Next / Notes

- **Now:** `Canvas.svelte` + `Band.svelte` + `DetailTable.svelte` are done and
  green — Phase 1's core authoring loop is now real end-to-end: drag a field chip
  (or click its "+") from the Palette and it lands in the template. `Canvas`
  draws the page at real px dimensions from `printSetup` (`src/geometry.ts`,
  design-time-only mm→px conversion — never used by `core.renderToHtml`, which
  stays in real `mm`) with a margins guide, and stacks `reportHeader` → `detail`
  → `totals` in fixed order. `Band` accepts native-DnD header-field drops
  (rejects dataset fields with a toast, per `design.md` §8.4) and renders
  existing elements as `{label}` tokens, stacked automatically. `DetailTable`
  accepts dataset-field drops scoped to its own `datasetId` (rejects header
  fields and other datasets' fields), renders real add/remove/reorder(drag
  column headers)/format+align+width controls, and shows real sample rows via
  `listSampleIds`→`fetchDocument` (honest hints when the adapter can't or the
  sample set is empty). `DocDesigner`'s `handlePaletteAddField` finally wires
  `Palette`'s `onAddField` for real (D-018: header-field "+" defaults to
  `reportHeader`; dataset-field "+" always targets `detail`, its only legal
  destination). Shared, tested pure helpers in `src/template-edits.ts`
  (`createFieldElement`/`createDetailColumn`) keep the click-add and drag-drop
  paths consistent. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all
  green (`dist/doc-designer.js` ~164KB / ~44KB gzip; 33 tests).
- **Next:** `PrintSetup.svelte` (page size/orientation/margins + repeat/keep
  toggles bound to `template.printSetup`, live-updating `Canvas`'s geometry), then
  `Preview.svelte` (doc-id control + iframe via `core.renderToHtml`) and wiring
  Export PDF for real (POST `{template, entity, id}` to `renderServiceUrl`/render
  per `claude.md` §10 — plain `fetch`, NOT importing `@docsmith/sdk`, which isn't
  on the designer's approved dependency list). Phase 1 is done only when the
  pagination gate (`claude.md` §8) passes against a ≥40-row document.
- **Notes / open questions:**
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

## Phase 1 — MVP shell (end-to-end, real data, multi-page PDF)

- [x] `Toolbar.svelte` — name, Design/Preview toggle, Save, Export PDF (undo/redo stubbed)
- [x] `Palette.svelte` + `SourceConfig.svelte` — entity dropdown from `listEntities`;
      add/remove datasets from `getRelatedDatasets`
- [x] `FieldGroup.svelte` + `FieldChip.svelte` — System/Custom/dataset groups from
      `getFields`/`getDatasetFields`; loading/empty/error states
- [x] `Canvas.svelte` — page geometry from `printSetup`; **fixed bands** rendered
- [x] `Band.svelte` — report/totals bands accept header fields via add-list (drag optional in P1)
- [x] `DetailTable.svelte` — add/reorder/resize/format columns from dataset fields;
      real sample rows via `listSampleIds`→`fetchDocument`
- [ ] `PrintSetup.svelte` — page size/orientation/margins + repeat/keep toggles → `printSetup`
- [ ] `Preview.svelte` — doc-id control; iframe renders `core.renderToHtml(template,data)`
- [ ] Browser **Print** works; **Export PDF** posts to render service and downloads
- [ ] **Pagination gate passed** (claude.md §8): ≥40-row doc, header repeats, no split row
- [x] localStorage default persistence when no `onSave` supplied

## Phase 2 — Full WYSIWYG

- [ ] Free-form drag/move/resize (`FreeElement.svelte`) with grid snap + smart guides
- [ ] `Properties.svelte` + `ElementProps`/`ColumnProps`/`BandProps` — full editors
- [ ] `pageHeader`/`pageFooter` bands (toggle on/off; `position:fixed` running bands)
- [ ] Image/logo element (URL, then upload via host/adapter)
- [ ] Undo/redo command stack (≥50 steps) wired through all mutations
- [ ] Template list / rename / delete; `onChange` autosave (debounced)
- [ ] Keyboard drag-alternative (pick up chip → arrow to band → drop)

## Phase 3 — ERP-grade

- [ ] Multiple datasets + raw-query datasets
- [ ] Per-column aggregates → `<tfoot>` (sum/count/avg)
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
