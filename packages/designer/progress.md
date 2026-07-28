# progress.md — `<doc-designer>` frontend

> Living checklist. **Update this in the same change that lands work.** Status keys:
> `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
> Keep the "Now / Next / Notes" block at the top current so any session can resume.

---

## Now / Next / Notes

- **Now:** Phase 0 scaffold, `Toolbar.svelte`, and `Palette.svelte` +
  `SourceConfig.svelte` are done and green. `DocDesigner.svelte` renders a real
  two-region workspace in design mode: `Palette` (left) + a Canvas placeholder
  (center); preview mode shows its own placeholder and hides the Palette.
  `SourceConfig` drives `template.dataSource` end-to-end against the adapter:
  entity dropdown from `listEntities`, related-dataset add/remove from
  `getRelatedDatasets` (via `core.datasetFromMeta`), full loading/empty/error
  triads with Retry, and de-duped/cancellable fetches (generation-counter guard
  against stale entity switches). `pnpm lint && pnpm typecheck && pnpm test &&
  pnpm build` all green (`dist/doc-designer.js` ~124KB / ~35KB gzip; 14 tests).
- **Next:** `FieldGroup.svelte` + `FieldChip.svelte` (System/Custom/dataset field
  groups from `getFields`/`getDatasetFields`), then `Canvas.svelte` (page geometry
  from `printSetup`, fixed bands). Build in the `design.md` §14 order; Phase 1 is
  done only when the pagination gate (`claude.md` §8) passes.
- **Notes / open questions:**
  - `pnpm` was not preinstalled in this environment; installed globally via
    `npm install -g pnpm@9.12.0` (matches the repo's pinned `packageManager`).
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
- [ ] `FieldGroup.svelte` + `FieldChip.svelte` — System/Custom/dataset groups from
      `getFields`/`getDatasetFields`; loading/empty/error states
- [ ] `Canvas.svelte` — page geometry from `printSetup`; **fixed bands** rendered
- [ ] `Band.svelte` — report/totals bands accept header fields via add-list (drag optional in P1)
- [ ] `DetailTable.svelte` — add/reorder/resize/format columns from dataset fields;
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
