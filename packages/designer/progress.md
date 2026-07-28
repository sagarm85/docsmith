# progress.md — `<doc-designer>` frontend

> Living checklist. **Update this in the same change that lands work.** Status keys:
> `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
> Keep the "Now / Next / Notes" block at the top current so any session can resume.

---

## Now / Next / Notes

- **Now:** Phase 0 scaffold is done and green. `packages/designer` joined the pnpm
  workspace, builds `<doc-designer>` as one custom-element bundle
  (`dist/doc-designer.js`, ~80KB / ~24KB gzip — svelte + `@docsmith/core` +
  `@docsmith/adapters` all bundled, zero extra runtime deps), and
  `pnpm lint && pnpm typecheck && pnpm test && pnpm build` are all green for the
  package. `DocDesigner.svelte` mounts, reads `{ adapter, template, onSave,
  onChange, renderServiceUrl, theme }`, exposes `getTemplate`/`setTemplate` for the
  SDK, and shows an honest empty state when no adapter is configured — no fabricated
  data. `pnpm --filter @docsmith/designer dev` serves a local harness
  (`packages/designer/dev`) against the same `StaticAdapter` 60-line invoice fixture
  the backend `pnpm demo` uses.
- **Next:** P1 MVP shell — Toolbar → Palette/SourceConfig → FieldGroup/FieldChip →
  Canvas (fixed bands from `printSetup`) → DetailTable (real sample rows via
  `listSampleIds`→`fetchDocument`) → PrintSetup → Preview (iframe via
  `core.renderToHtml`) → Export PDF. Build in the `design.md` §14 order; Phase 1 is
  done only when the pagination gate (`claude.md` §8) passes.
- **Notes / open questions:**
  - `pnpm` was not preinstalled in this environment; installed globally via
    `npm install -g pnpm@9.12.0` (matches the repo's pinned `packageManager`).
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
  - Pre-existing, not touched (out of scope for this frontend-only change):
    `pnpm -r test` fails on `@docsmith/adapters` — it declares a `test` script but
    has no test files yet, so `vitest run` exits 1. `packages/designer`'s own
    `pnpm test` is unaffected and green.
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

- [ ] `Toolbar.svelte` — name, Design/Preview toggle, Save, Export PDF (undo/redo stubbed)
- [ ] `Palette.svelte` + `SourceConfig.svelte` — entity dropdown from `listEntities`;
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
- [ ] localStorage default persistence when no `onSave` supplied

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
