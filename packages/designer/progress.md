# progress.md — `<doc-designer>` frontend

> Living checklist. **Update this in the same change that lands work.** Status keys:
> `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
> Keep the "Now / Next / Notes" block at the top current so any session can resume.

---

## Now / Next / Notes

- **Now:** backend is ready. `@docsmith/core` (`renderToHtml`, `types.ts`, `schema.ts`,
  `format.ts`), `@docsmith/adapters` (Static/Rest/Unidb), `@docsmith/sdk`, and
  `@docsmith/render-service` are built and passing tests (8/8) + an end-to-end demo that
  renders a 60-line invoice to a 3-page PDF with a repeating header. The frontend
  (`packages/designer`) is unblocked and can start P0/P1.
- **Next:** P1 MVP shell — custom element + SDK mount → Source picker → fixed bands
  → detail column picker → Preview iframe via `core.renderToHtml` → Export PDF
  (POST to render-service at `/render`).
- **Notes / open questions:**
  - Repo not yet created on GitHub (see root plan "repo authorization"). The whole
    project currently lives locally at `/home/user/erp-doc-designer`.
  - Import types from `@docsmith/core` — do NOT redefine `Template`, `FieldMeta`,
    `DataSourceAdapter`. Preview/PDF MUST call `core.renderToHtml` (single renderer).
  - Reference the runnable backend: `pnpm demo` at repo root → `examples/invoice-demo/out.html`.

---

## Phase 0 — Scaffold

- [ ] pnpm workspace joined; `packages/designer` builds a `doc-designer` custom element
- [ ] TypeScript strict, ESLint, Prettier, Vitest configured; `pnpm lint/typecheck/test` green
- [ ] `src/ui/tokens.css` with the full `--dd-*` token set (light + dark)
- [ ] `src/ui/` primitives: `Button`, `Select`, `NumberInput`, `Field`, `Toast`,
      `Skeleton`, `ErrorInline`, `Collapsible`
- [ ] `DocDesigner.svelte` root mounts, reads `{ adapter, template, onSave, ... }`
- [ ] `StaticAdapter` wired in `examples/invoice-demo` for local dev

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

- _(none yet — scaffold pending repo creation)_
