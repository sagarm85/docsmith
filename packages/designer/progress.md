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
- **Now (Phase 3 interlude) — cross-cutting visual redesign (D-025/D-026/D-027).**
  The user flagged the UI as unapproachable versus a polished consumer builder
  (a real screenshot showed raw `{Invoice #}`-style tokens, unlabeled stacked
  detail-column controls, and bands distinguished only by a tiny gray tab).
  Shown a static mockup of the proposed direction first and got explicit
  approval for a *fuller* redesign (not just the 3 spot-fixes) before touching
  any component. Landed: new shared `src/ui/Icon.svelte` + `icons.ts`
  (hand-authored stroke-based SVG paths, house style, no icon
  library/dependency); bound-field elements now render as a real chip
  (icon + label, `--dd-mono`, accent-tinted) instead of bare `{label}` text
  (`FreeElement.svelte`); every band is now a card — tinted background +
  colored left-edge bar + icon in its tab (`Band.svelte`/`DetailTable.svelte`,
  new tokens `--dd-hero`/`--dd-run`/`--dd-totals` + `-weak` pairs); detail-table
  column controls got visible "Format"/"Align"/"Width (px)" captions instead of
  stacking unlabeled; Toolbar/Palette/Properties/PrintSetup/ElementProps/
  ColumnProps/BandProps all gained icons and tighter section grouping.
  **Two real bugs caught only by actually looking at rendered output** (not
  just jsdom tests, which don't visually render CSS): (1) the new band tints
  went theme-reactive and made "Grand Total" text invisible in dark mode
  against a near-black totals-band background, since `FreeElement.svelte`'s
  text has always been a hardcoded `#222` — fixed by making band-tint tokens
  theme-*constant* (D-026), consistent with design.md §11's pre-existing "the
  canvas page is white paper regardless of theme" rule; (2) `pnpm --filter
  @docsmith/designer dev` turned out to have been completely unstyled this
  entire project (every `--dd-*` token silently failed to resolve, zero console
  errors) — `DocDesigner.svelte`'s `@import './ui/tokens.css'` only gets
  inlined by `vite build`; in dev-serve mode the browser tries to resolve it
  against the *page's* URL, hits Vite's SPA-fallback `index.html` instead of
  the real file, and silently discards the bogus "CSS." Fixed with a dev-only
  redirect shim at `packages/designer/dev/ui/tokens.css` (D-027) — the
  published component and its consumers were never affected, only this
  repo's own local dev command. Verified visually with real browser
  screenshots (Puppeteer, already a transitive dependency via
  `@docsmith/render-service` — no new dependency added) against both the
  production build and the fixed dev harness, light and dark, before and
  after the fixes. 106 tests pass (unchanged — this was markup/CSS only, one
  test's stale `{label}` assertion updated); lint/typecheck/build all green
  (`dist/doc-designer.js` ~281KB / ~69KB gzip).
- **Now — percentage-based layout, a global px/% toggle (D-028).** User
  feedback: an element positioned at a fixed pixel offset physically stays
  there when the page size/orientation changes (px is ~96/inch, identical in
  the canvas and the real PDF), which can crowd the margin or overflow on a
  narrower page — asked for elements to "realign based on the outer box"
  instead, as one global per-template setting (not per-element, when asked).
  New `Template.layoutUnit?: 'px' | '%'` (absent = 'px', fully backward-
  compatible); `core.renderToHtml` emits the matching CSS unit; new
  `core.convertLayoutUnit(template, targetUnit, contentWidthPx)` migrates
  every element in one pass (x/w against the band's full content width, y/h
  against the band's own height — bands span edge-to-edge, margins are a
  print-only `@page` concept, never a box-model inset). `FreeElement.svelte`'s
  drag/resize/keyboard-nudge math is now unit-aware (`unit`/`contentWidthPx`/
  `bandHeightPx` props threaded down through `Canvas.svelte`→`Band.svelte`),
  including a corrected *true visual* aspect-ratio calc for the image
  shift-lock (x/w and y/h use different bases in `%` mode, so the naive
  ratio would have silently distorted images). New toggle in
  `PrintSetup.svelte`'s Page tab (same "lives elsewhere, grouped here"
  pattern as `keepRowTogether`); `ElementProps.svelte`'s Position/Size fields
  relabel and re-range (0–100, 0.5 step) in `%` mode. Verified with unit
  tests (core conversion + render output, canvas drag/resize/keyboard math,
  a full DocDesigner integration test) **and** a real-browser screenshot
  confirming a template converted to `%` renders pixel-identical to its `px`
  original. 22 core tests pass (was 16); 113 designer tests pass (was 106);
  lint/typecheck/build all green (`dist/doc-designer.js` ~287KB / ~70KB gzip).
- **Now — stacked/auto-flow arrangement, MailerLite-editor style (D-029).**
  User referenced MailerLite's popup builder (blocks stack top-to-bottom in
  document order, drag-handle reorder, hover duplicate/delete) as UX
  inspiration; asked for elements to be able to share a row (not strictly
  single-column) and for the choice to be per-band (not whole-template, so a
  free-form letterhead can coexist with a stacked totals block). New
  `FreeBand.arrangement?: 'free' | 'stack'` (absent = 'free', backward-
  compatible) and `FreeElement.row?: number` (elements sharing a row number
  render side by side, in array order). `core.renderToHtml` gets a real
  second render path for `'stack'` bands (flex rows, intrinsic/auto height,
  width always a row percentage regardless of `layoutUnit`) — still one
  `renderToHtml`, not a second renderer, same as the `detail` band already
  being a second branch. New `core.convertBandArrangement()` migrates a
  band's elements on toggle (free→stack sorts by y, one element per row;
  stack→free lays rows out top-to-bottom with a fixed gap). New
  `StackBand.svelte` designer component (swapped in by `Canvas.svelte`)
  owns row rendering, native-HTML5-DnD row reordering, merge-into-row on
  drop, and hover/focus/selected-reveal duplicate/delete. `BandProps.svelte`
  gained the arrangement toggle, offered only for `reportHeader`/`totals` —
  never `pageHeader`/`pageFooter`, which need a *known* height for their
  `position:fixed` padding reservation, incompatible with a stack band's
  intrinsic height. `ElementProps.svelte` hides X/Y and z-order controls for
  elements in a stack band (no coordinates, no overlap to resolve — see
  D-029 for the full reasoning, including why `FreeElement` gained one field
  instead of a parallel rows structure). Also fixed a real gap caught while
  wiring this: the palette "+" click-to-add and keyboard drag-alternative
  paths built free-form elements unconditionally, which would have produced
  a broken 240%-wide element if used on a stack band — both now check the
  target band's arrangement and route through the new
  `createStackFieldElement`/`createStackBlockElement` constructors. Verified
  with core unit tests (stack rendering, row grouping, arrangement
  migration), a dedicated `StackBand.test.ts` (10 tests: empty state, row
  grouping, select, duplicate/delete, text-edit, add-as-new-row,
  merge-into-row, dataset-field rejection, block drop, row reorder), a full
  DocDesigner integration test, and a real-browser screenshot. 27 core tests
  pass (was 22); 124 designer tests pass (was 113); lint/typecheck/build all
  green (`dist/doc-designer.js` ~316KB / ~75KB gzip).
- **Now — i18n locale/currency picker + amount-in-words format.** Two small
  Phase 3 checklist items. `core.formatValue` already did real
  `Intl.NumberFormat`/`Intl.DateTimeFormat` work against
  `printSetup.locale`/`currency` — the only gap was that `PrintSetup.svelte`
  never exposed a way to set them. Added "Locale"/"Currency" selects (Page
  tab, a fixed reference list of common values — same pattern as the
  existing `PAGE_SIZE_OPTIONS`, not adapter/business data) defaulting to
  en-US/USD (core's existing defaults). New `numberToWords()` in
  `core/format.ts` and a `'words'` `ValueFormat` (design.md §2's "amount in
  words" line under a grand total) — English-only by design (real
  multi-locale number-to-words has genuinely different grammar per
  language — gendered forms, Indian lakh/crore groupings — a much bigger
  feature than reusing `Intl`, so it's out of scope rather than faked);
  handles a fractional part as "and NN/100" (check-writing convention), not
  a second round of word-spelling. Added "Words" to the format `<Select>` in
  `ElementProps.svelte`, `ColumnProps.svelte`, and `DetailTable.svelte`'s
  inline column header select. 31 core tests pass (was 27); 125 designer
  tests pass (was 124); lint/typecheck/build all green (`dist/doc-designer.js`
  ~320KB / ~76KB gzip).
- **Now — Conditional formatting (D-031).** New `ConditionalRule` type
  (operator + value + a style to apply on match) on `FreeElement`
  (`kind:'field'` only) and `DetailColumn` — declarative only, tests an
  element/column's own bound value, never another field and never a
  computed expression, per claude.md's prime directives ("no functions...
  computed expressions are Phase 3, and even then declarative"). New
  `core.matchesConditionalRule()`/`resolveConditionalStyle()` in
  `format.ts`; `render.ts` applies them for a field element's style and
  per-cell in the detail table, merging every matching rule's style over
  the base in array order (later wins, like a CSS cascade — not "first
  match wins," so an author can layer independent rules). New
  `ConditionalRulesEditor.svelte` (shared by `ElementProps.svelte`'s
  field-kind branch and `ColumnProps.svelte`) exposes a focused 3-property
  style subset (text color, background, bold) rather than full
  `ElementStyle` control. Verified with core unit tests (every operator,
  style merging, no-match reference equality, full `renderToHtml`
  integration for both a field element and a detail column), a dedicated
  `ConditionalRulesEditor.test.ts` (8 tests), a `DocDesigner.test.ts`
  integration test, and a real-browser screenshot (Preview mode) showing a
  totals field highlighted red/bold and only the qualifying detail rows'
  Amount cells highlighted green/bold. 38 core tests pass (was 31); 134
  designer tests pass (was 125); lint/typecheck/build all green
  (`dist/doc-designer.js` ~328KB / ~78KB gzip).
- **Now — Saved themes / brand presets (D-032).** Reuses design.md §13's
  already-documented `config.theme` token-override mechanism rather than
  inventing a new template-model concept — the Toolbar's new **Theme**
  control lets the author live-edit 4 brand-relevant tokens (`--dd-accent`
  and its `-strong`/`-weak` shades, `--dd-bg`) and save/name/apply/delete
  named sets, persisted to `localStorage` (`erpdoc.themes.*`, new
  `SavedTheme` type alongside the existing template persistence functions).
  `DocDesigner.svelte` now owns `activeTheme` state seeded from
  `config?.theme` so in-designer edits apply live; disabled when the host
  supplies `config.theme` directly (host owns branding, same D-010
  precedent as `onSave` disabling the template list). New
  `ThemeList.svelte` mirrors `TemplateList.svelte`'s proven list/save/
  apply/delete pattern. Verified with `persistence.test.ts` additions (10
  tests, was 5), a dedicated `ThemeList.test.ts` (9 tests), a
  `DocDesigner.test.ts` integration test (edit → save → reset → re-apply
  round-trip, plus the host-supplied-theme disabled case), and a
  real-browser screenshot. 150 designer tests pass (was 134);
  lint/typecheck/build all green (`dist/doc-designer.js` ~340KB / ~80KB gzip).
- **Now — Barcode/QR skipped; Carried-forward subtotals shipped (D-033) —
  Phase 3 done (2026-07-29).** Both of Phase 3's remaining items required a
  genuine stop-and-ask per `claude.md` §9 (barcode/QR needs a new dependency
  no template-driven output can hand-roll correctly; carried-forward needs a
  page-break-aware computation `core.renderToHtml` structurally cannot do).
  Flagged both via `AskUserQuestion`. **Barcode/QR:** user chose "Skip for
  now" — left unchecked above with the reasoning recorded, and
  memory.md O-4 tracks it as a revisit-later open item, not silently dropped.
  **Carried-forward:** user chose "Implement via render-service (Puppeteer)."
  `core.Aggregate.into` widened from the literal `'tfoot'` to
  `'tfoot' | 'carryForward'` — a SECOND, independent aggregate entry per
  column (a column can have both a grand total and a running subtotal).
  `ColumnProps.svelte` gained a "Carry forward (page breaks)" select
  alongside the existing footer-aggregate one; `DocDesigner.svelte`'s new
  `handleColumnCarryForwardChange` writes/removes only the `into:
  'carryForward'` entry, never touching the `into: 'tfoot'` one.
  `core.renderToHtml`'s `<tfoot>` render path was tightened to only ever
  render `into: 'tfoot'` aggregates (previously `.find()` could have matched
  either kind for the same column). New
  `packages/render-service/src/pagination.ts`
  (`applyCarryForward(page, template, data)`, called from `pdf.ts` right
  after `page.setContent()` and before `page.pdf()`): resizes the Puppeteer
  page to the real print content width, measures the actual rendered
  `reportHeader`/`thead`/`tfoot`/row heights (both `thead` *and* `tfoot` are
  `display:table-*-group` and repeat on **every** printed page — missing the
  `tfoot` reservation was a real bug caught during verification, see below),
  greedily simulates where pages will break against the printable height
  budget (with a 1.5× row-height safety margin absorbing measured
  drift between this non-print measurement pass and Chromium's real print
  layout — empirically tuned, not derived exactly), then injects "Carried
  forward"/"Brought forward" `<tr>` rows into the live DOM. The pair is
  **forced** onto different pages via CSS `break-after:page` on the
  "Carried forward" row — an earlier version relied on natural reflow
  landing the break between them, which a real PDF render showed doesn't
  reliably happen (both rows landed on the same page instead). Cumulative
  values are computed via `core.aggregate()` against the real
  `DocumentData` rows sliced at each break point — never by scraping
  rendered text. Explicitly a best-effort, single-pass approximation (not
  a guarantee of pixel-perfect alignment with Chromium's internal
  fragmentation) — accepted per the user's chosen approach. `tsconfig.json`
  for `@docsmith/render-service` added `"DOM"` to `lib` (typecheck-only, for
  the `page.evaluate()` callback bodies that run in the browser, not Node —
  no runtime DOM globals added to the actual Node process).
  **Verified** against the real 60-row `StaticAdapter` invoice fixture
  through the actual `renderPdf()` Puppeteer pipeline (added a
  `carryForward` aggregate to a copy of the demo template), parsed with
  `pdfjs-dist` (installed ad hoc in the scratchpad only, same throwaway
  pattern as the original Phase 1 pagination-gate verification): 3 pages
  (matching the same fixture's page count *without* carry-forward — the
  feature doesn't change page count when the reserved slack is right),
  "Carried forward: $1,266.25" ending page 1 / "Brought forward: $1,266.25"
  starting page 2, "Carried forward: $2,663.75" ending page 2 / "Brought
  forward: $2,663.75" starting page 3, and the running values independently
  cross-checked against the fixture's own row data (sum of rows 54–59 =
  $308.75 = grand total $2,972.50 − $2,663.75). 38 core tests still pass;
  `@docsmith/render-service` typecheck/build green (no lint/test scripts
  for that package — confirmed, matches its existing `package.json`).
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
- [x] Conditional formatting (declarative rules) — `ConditionalRule` on
      `FreeElement` (field kind) and `DetailColumn`; new
      `ConditionalRulesEditor.svelte` (operator + value + text
      color/background/bold), never a scripting/expression language — tests
      only that element/column's own value, per claude.md's prime directives.
- [ ] Barcode / QR element — **skipped for now, known gap** (see memory.md
      O-4). No correct barcode/QR symbology can be hand-rolled without a new
      dependency (Code128/QR encoding is a real algorithm, not something to
      approximate), which trips claude.md §9's "stop and flag" rule. Flagged
      to the user via `AskUserQuestion`; explicit choice was "Skip for now —
      leave it undone in progress.md as a known gap, revisit later." Not
      silently dropped — revisit if/when a barcode/QR dependency is approved
      through the doc-update ritual (claude.md §0.4).
- [x] i18n + locale currency; amount-in-words — `PrintSetup.svelte` gained
      Locale/Currency selects (Page tab; `core.formatValue` already did the
      real `Intl` work, only the UI was missing); new `core.numberToWords()`
      + `'words'` `ValueFormat` for the classic "amount in words" totals-band
      line (English-only by design — see progress.md's "Now" note/memory.md
      for the reasoning).
- [x] Carried-forward subtotals (server-assisted, D-033) — a NEW second
      `Aggregate` entry (`into: 'carryForward'`, independent of the existing
      `into: 'tfoot'` grand total) surfaced in `ColumnProps.svelte` as a
      "Carry forward (page breaks)" select. `core.renderToHtml` never renders
      carry-forward rows (it has no concept of page breaks); a new
      `packages/render-service/src/pagination.ts` module measures the real
      rendered row/thead/tfoot/reportHeader heights at the actual print
      content width, simulates where Chromium's print pagination will break
      pages against the page's printable height budget, and injects
      "Carried forward"/"Brought forward" `<tr>` rows into the live DOM
      (forcing the page break between the pair via CSS `break-after:page` —
      relying on natural reflow to land the break exactly between them
      proved unreliable) before `page.pdf()` runs. Explicit best-effort,
      single-pass approximation, not pixel-perfect fragmentation matching —
      accepted tradeoff per the user's chosen `AskUserQuestion` option
      ("Implement via render-service (Puppeteer)").
- [x] Saved themes / brand presets — reuses the existing `config.theme`
      token-override mechanism (design.md §13); new `ThemeList.svelte`
      (Toolbar) lets the author edit/save/apply/delete named sets of 4
      brand-relevant tokens, `localStorage`-persisted like templates (D-032).

**Phase 3 is DONE (2026-07-29)** — all checklist items are either shipped or
explicitly, honestly documented as a known, deliberate gap (barcode/QR).

---

## Post-Phase-3 — design-review-driven work

Not on `design.md`'s original phase map — these came out of an open-ended
design-review conversation (reference invoice/document templates shared by
the user, asked against DocSmith's actual capabilities) after Phase 3 was
already done. Tracked here with the same rigor as a phase checklist.

- [x] `ElementStyle.borderRadius` (core) — rounded/pill styling, wired into
      the designer for `kind:'box'` elements (Corner radius field).
- [x] Grid arrangement (`FreeBand.arrangement: 'grid'`, `gridColumns`,
      `gridBorder`, `FreeElement.col`/`colSpan`) — a third arrangement
      alongside free/stacked; an explicit bordered or borderless row/column
      table, rendered as a real `<table>` (D-034). New `GridBand.svelte`
      designer component; `BandProps.svelte` column-width editor + cell-
      borders toggle; `ElementProps.svelte` column-span field.
- [x] Element-level hover toolbar (duplicate/delete/bring-forward/send-back
      at the cursor, not only the right-rail Properties panel) —
      `FreeElement.svelte` gained a floating dark toolbar (hover/focus/
      selected reveal, same visual language as StackBand/GridBand's
      existing hover actions), reusing the exact same callbacks the
      Properties panel buttons and keyboard shortcuts already call. Found
      and fixed a real layout bug while building it: `.dd-el` had
      `overflow:hidden`, which would have clipped both the new toolbar
      (`top:-34px`) and the existing resize handles (small negative
      offsets) — split element content into an inner `.dd-el-body` that
      owns the clip, leaving `.dd-el` itself unclipped for its decorations.
- [x] Alignment guides while dragging (memory.md D-038) — `FreeElement.svelte`
      now takes every sibling in its band and, on each move-drag tick,
      checks the dragged element's left/center/right and top/center/bottom
      edges against each sibling's same edges; a match within tolerance
      (4px, or 0.6% in `%` layoutUnit mode) snaps to it exactly and reports
      the guide position up to `Band.svelte`, which renders the actual pink
      overlay line spanning the band. Ephemeral — never written to the
      template, cleared on drag end (and on mid-drag unmount, a real edge
      case fixed alongside it). Grid arrangement is unaffected (cells are
      already auto-aligned by construction) — this only applies to free-form
      bands.
- [x] Borderless/styled detail table option — new `DetailBand.cellBorder`
      (a CSS `border-bottom` shorthand override via a `--dd-cell-border`
      custom property in `core`'s base stylesheet; the header's own border
      stays fixed regardless), a "Row borders" toggle in `BandProps.svelte`
      when the detail band is selected. Distinct from grid-band borders,
      which only apply to free-form bands, not the line-items table.
- [x] Categorized/icon-forward palette groups — turned out to already be
      substantially built (`Collapsible.svelte`'s chevron+icon+title groups
      already covered Blocks/Header Fields/each dataset, with per-type field
      glyphs in `FieldChip.svelte`) — corrected the earlier "not built"
      claim rather than silently re-doing existing work. The genuine gap was
      the "Sections" group (D-034/D-037): three column-layout presets (1
      column, 2 columns, Large + small) with diagram thumbnails; clicking
      "+" converts `reportHeader` to grid arrangement (migrating existing
      content) and appends a row of empty placeholder cells sized to the
      chosen columns. Click-to-add only in v1 (drag onto other bands
      documented as a follow-up, not required — same D-018 precedent as
      Blocks). Found and fixed a real Svelte crash while building it: keying
      a column thumbnail's `{#each}` by its own width value threw
      `each_key_duplicate` for the `[50, 50]` preset — fixed by keying on
      index instead.
- [x] Product image per line item (D-039) — `ValueFormat` gained `'image'`;
      `renderDetailBand` special-cases it (before calling `formatValue`) to
      emit a real `<img src="{value}">` per row instead of escaped text —
      the bound value is just a URL string per row, same shape the adapter
      already returns for any other field, no new `{kind,value}` wrapper
      needed (unlike `FreeElement.src`, which needs one since it's not
      adapter-bound). Empty/missing values render an honest empty cell, not
      a broken-image icon. `ColumnProps.svelte`/`DetailTable.svelte`'s
      format selects gained "Image"; the canvas sample-row preview shows a
      real thumbnail or a placeholder icon for an empty value — never
      fabricated. Verified end-to-end with a real-browser screenshot of
      both the canvas and the actual Preview-mode output (via
      `core.renderToHtml`, not just the designer's own approximation).
- [x] Full-height table + page-pinned summary (D-040) — new
      `printSetup.fillPage`; when set, `.doc-flow` becomes a flex column at
      least one page's content height tall, with the last in-flow band
      pinned to the bottom via `margin-top:auto`. Exact and correct for a
      single-page document or the last page of a multi-page one; explicitly
      NOT page-break-aware across multiple pages (same class of problem as
      carried-forward subtotals, D-033) — honestly scoped, not silently
      half-built.
- [x] **Bug found and fixed while verifying the above** (D-041, unrelated to
      `fillPage` itself): the user reported "weird selection" while dragging
      a field — the D-036 hover-toolbar change had left `white-space:
      pre-wrap` on `.dd-el` (needed for multi-line text elements), which
      turned an ordinary template whitespace/newline between the toolbar and
      content `<div>`s into a *rendered* line break, pushing visible content
      ~14px below its own selection outline/resize handles. Root-caused via
      a real-browser Puppeteer reproduction built from the actual compiled
      markup/CSS (jsdom-based tests can't see this class of bug at all —
      no real box-model layout). Fixed by moving `white-space:pre-wrap` to
      `.dd-el-body`, where it's semantically correct anyway.
- [x] **Palette visual pass (D-042)**, a follow-up discovered *after* the six
      items above were called complete: the user compared an actual-app
      screenshot against the earlier design-review mockup and flagged the
      Palette specifically as not matching — the System/Custom subheader
      split was the biggest structural gap. `Collapsible.svelte`'s icon
      becomes a filled badge with a real rotating chevron icon (was a
      literal glyph) and sentence-case title; `FieldChip.svelte` drops its
      per-type glyph in favor of a `field.kind` pill badge and goes
      borderless; `FieldGroup.svelte` collapses the System/Custom subheader
      split into one flat list (system fields first) since the kind is now
      legible per-chip; `Palette.svelte` gets a search icon in the filter
      input and restyles Blocks/Sections chips to match. Pure presentation —
      no template/core changes. Verified with real-browser screenshots of
      the top of the Palette and, scrolled down, the Header Fields section,
      both matching the mock.

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

- **2026-07-29 — Palette visual pass (D-042).** The user compared a real
  screenshot of the Palette against the earlier design-review mockup
  ("this is mock" / "I liked mocked one") and flagged the gap directly —
  raised right after the post-Phase-3 list below was called complete, so
  tracked as its own follow-up rather than folded into that claim.
  `Collapsible.svelte`'s leading icon becomes a filled accent badge with a
  real rotating `Icon name="chevronDown"` (was a literal `&#9656;` glyph
  swap) at the trigger's far right, and the title drops its uppercase
  transform (sentence case, matching the mock). `FieldChip.svelte` removes
  the per-type glyph (T/calendar/hash/$) in favor of a small `field.kind`
  ('system'/'custom') pill badge next to the label, and goes borderless
  (hover-reveal background instead of a bordered card). `FieldGroup.svelte`
  collapses the old System/Custom subheader split (two `<h4>`s, two lists)
  into one flat list, system fields first — the kind is now legible
  per-chip via the new badge, making the subheader redundant chrome the
  mock never had. `Palette.svelte` gains a search icon inside the filter
  input and restyles the Blocks/Sections chips to the same borderless +
  icon-badge look, so all three chip types (field/block/section) read as
  one consistent system. Pure presentation — no `core`/template changes.
  `FieldGroup.test.ts`'s two header-text assertions were replaced with one
  test asserting the per-item `.dd-chip-badge` order (`['system','custom']`)
  — a real behavior change (subheader text no longer exists), not a
  compat shim. 170 designer tests pass (net −1 from consolidating two
  subheader tests into one badge test; no coverage lost); lint/typecheck/
  build all green. Verified with real-browser screenshots of the top of the
  Palette and, scrolled down, the Header Fields section — both matching
  the mock's flat-list, badge-forward look.
- **2026-07-29 — Full-height table + page-pinned summary (D-040); real
  selection/content-desync bug found and fixed (D-041); post-Phase-3
  design-review list complete.** New `printSetup.fillPage` — `.doc-flow`
  becomes a flex column stretched to at least one page's content height,
  with the last in-flow band pinned to the bottom via `margin-top:auto`.
  Correct for a single-page document or the last page of a multi-page one;
  explicitly not page-break-aware across multiple pages (same class of gap
  as carried-forward subtotals, D-033) — flagged honestly, not silently
  half-built. While verifying it, the user reported a real regression: a
  field's selection outline/resize handles no longer matched its visible
  content position while dragging. Root-caused via a real-browser Puppeteer
  reproduction built from the actual compiled markup (not a guess): D-036's
  hover toolbar had left `white-space:pre-wrap` on `.dd-el`, which turned
  an ordinary template whitespace/newline between the toolbar and content
  `<div>`s into a rendered line break, pushing content ~14px down while the
  selection box (sized against `.dd-el`'s own unshifted CSS box) stayed
  put. jsdom-based tests never caught it — no real box-model layout there —
  underscoring why this session's practice of a real-browser screenshot
  pass before calling a UI change done matters. Fixed by moving
  `white-space:pre-wrap` to `.dd-el-body`, where it's semantically correct.
  55 core tests pass (was 52); 171 designer tests pass (was 170, including
  a new `PrintSetup.test.ts` toggle test); lint/typecheck/build all green.
  Verified with a real-browser screenshot of the exact drag interaction the
  user reported, confirming the fix. This closed out every item from the
  original post-Phase-3 design-review conversation — six mocked ideas
  (borderless table, hover toolbar, Sections palette, alignment guides,
  product images, full-height layout), all built, tested, and verified
  against the real rendered output, not just the designer's approximation
  of it. (A further Palette visual-polish gap was raised immediately after
  this, tracked separately as D-042 in a follow-up change.)
- **2026-07-29 — Product image per line item (D-039), post-Phase-3.**
  `ValueFormat` gains `'image'` — a real per-row bound value (a plain URL
  string, same shape the adapter returns for any other column), not a new
  `{kind,value}` wrapper like `FreeElement.src` needs. `renderDetailBand`
  special-cases it before calling `formatValue`, emitting a real `<img>`
  per row (or an honest empty cell for a missing value — never a broken-
  image icon in the actual output). `ColumnProps.svelte`/`DetailTable.svelte`
  gained "Image" in their format selects; the canvas sample-row preview
  shows a real thumbnail or an honestly-empty placeholder icon. This item
  had been explicitly flagged as NOT achievable with the pre-existing
  column model when first asked — now a real, scoped `core` change. 52
  core tests pass (was 49); 170 designer tests pass (was 169, including a
  new `DetailTable.test.ts` image-column test); lint/typecheck/build all
  green. Verified end-to-end with a real-browser screenshot of both the
  canvas and the actual `core.renderToHtml` Preview output (data-URI test
  images, so verification doesn't depend on external network access).
- **2026-07-29 — Alignment guides while dragging (D-038), post-Phase-3.**
  `FreeElement.svelte` compares the dragged element's left/center/right and
  top/center/bottom edges against every sibling in the band on each
  move-drag tick; a match within tolerance (4px, or 0.6% in `%` mode)
  snaps exactly to it, overriding the coarser grid snap for that axis.
  `Band.svelte` renders the actual pink guide line (spanning the full band)
  from a small piece of local, ephemeral state — never written to the
  template. Grid-arranged bands are unaffected (cells already auto-align).
  169 designer tests pass (was 166, including two new `FreeElement.test.ts`
  snap-behavior tests and a `Band.test.ts` test asserting the actual guide
  line renders with the correct position and clears on drop). Verified
  with a real-browser Puppeteer mouse-drag screenshot — jsdom's synthetic
  pointer events aren't trustworthy for this class of visual verification —
  confirming the line renders exactly at the sibling's edge, matching the
  reference image the user provided.
- **2026-07-29 — "Sections" palette group (D-037), post-Phase-3.** On
  closer inspection the palette already had collapsible icon-labeled groups
  and per-type field glyphs before this session — corrected the earlier
  "categorized palette not built" claim. The real, new deliverable: a
  "Sections" group with 3 column-layout presets (1 column / 2 columns /
  Large + small), diagram thumbnails matching the mockup. Clicking "+"
  converts `reportHeader` to grid arrangement (migrating existing content)
  and appends a row of empty placeholder cells sized to the chosen columns.
  Click-to-add only in v1; drag onto other bands is a documented follow-up.
  Found and fixed a real crash while building it: keying a thumbnail's
  `{#each}` by column width threw `each_key_duplicate` for the `[50, 50]`
  preset (both columns share a width) — fixed by keying on index. 166
  designer tests pass (was 162, including new `Palette.test.ts` and
  `DocDesigner.test.ts` coverage); lint/typecheck/build all green; verified
  with a real-browser screenshot.
- **2026-07-29 — Borderless detail table (D-035) + element hover toolbar
  (D-036), post-Phase-3.** Two more items from the design-review thread.
  `DetailBand.cellBorder` (a CSS `border-bottom` override via a
  `--dd-cell-border` custom property, absent = today's unchanged default)
  + a "Row borders" toggle in `BandProps.svelte` for the detail band.
  `FreeElement.svelte` gained a floating hover/focus/selected toolbar
  (send-back/bring-forward/duplicate/delete) reusing the exact callbacks
  already wired to the Properties panel and keyboard shortcuts — same
  visual language `StackBand`/`GridBand` already use for their own actions.
  Building the toolbar surfaced a real bug: `.dd-el`'s `overflow:hidden`
  would have clipped both the new toolbar and the *existing* resize
  handles (small negative offsets); fixed by moving the clip onto a new
  inner `.dd-el-body`, leaving `.dd-el` itself unclipped for decorations.
  Two new icons (`chevronUp` alongside `chevronDown`). 49 core tests pass
  (was 46); 162 designer tests pass (was 161, including a new
  `FreeElement.test.ts` toolbar test and a `DocDesigner.test.ts`
  cell-border-toggle integration test); lint/typecheck/build all green.
  Verified with a real-browser screenshot confirming the toolbar and
  resize handles both render fully, uncropped (the clipping bug would
  have been invisible to jsdom-based tests, which don't lay out real box
  geometry).
- **2026-07-29 — Grid arrangement + borderRadius (D-034, post-Phase-3).** A
  design-review conversation (reference invoice/shipping-document templates
  shared by the user — a bordered sales-contract metadata grid, a rounded-
  pill invoice) surfaced a real gap: DocSmith could approximate a bordered
  form-grid layout only by hand-matching free-form element borders/positions.
  New third `FreeBand.arrangement: 'grid'` (alongside D-029's free/stacked):
  `gridColumns` (percentage column widths) + `gridBorder` (a CSS border
  shorthand, applied to every cell) at the band level; `FreeElement.col`/
  `colSpan` place an element into one cell, optionally spanning columns (so
  "Seller" can span a full row while "Invoice #"/"Date" split the next one).
  `core.renderGridBand` renders a real HTML `<table>` — not CSS Grid — so
  native `border-collapse`/`colspan` handle shared borders and spanning for
  free. New `GridBand.svelte` (parallel to `StackBand.svelte`): click to
  select, drag a field onto an empty cell to fill it or a filled cell to
  replace it in place, "Add row" appends a real empty-text placeholder cell
  (not a phantom UI row). `BandProps.svelte` gained the arrangement option
  plus a column-width editor and cell-borders toggle; `ElementProps.svelte`
  shows column span instead of x/y/z-order for grid elements.
  `core.convertBandArrangement` generalized from a free↔stack-only function
  into a 3-way conversion through one shared intermediate representation.
  Separately, new `ElementStyle.borderRadius` (px or any CSS length string)
  for the rounded/pill visual style, wired into the designer for `kind:'box'`
  elements. This was offered to the user as a genuine architecture decision
  (a new template-model concept) via `AskUserQuestion` — chosen explicitly
  as a *unified* primitive covering both the bordered-form-grid need and the
  earlier "Sections" (MailerLite 2-col/3-col layout) idea from the same
  conversation, rather than two separate features. 46 core tests pass (was
  38); 160 designer tests pass (was 150, including a new `GridBand.test.ts`
  with 9 tests and a `DocDesigner.test.ts` arrangement-toggle integration
  test); lint/typecheck/build all green. Verified with real-browser
  screenshots of both the design canvas (a grid band with a spanning cell
  and an empty placeholder) and the actual Preview output, confirming
  `core.renderToHtml`'s real `<table>` renders correctly end to end, not
  just the designer's approximation of it. Several other ideas from the
  same design-review thread (element hover toolbar, alignment guides,
  borderless detail table, categorized palette, product-image column,
  full-height/page-pinned summary) were mocked but are explicitly NOT yet
  built — tracked in the new "Post-Phase-3" checklist above, not silently
  dropped.
- **2026-07-29 — Carried-forward subtotals (D-033); Phase 3 done.** New
  `Aggregate.into: 'tfoot' | 'carryForward'` (core) — a second, independent
  aggregate entry per column, surfaced in `ColumnProps.svelte` as "Carry
  forward (page breaks)". `core.renderToHtml`'s `<tfoot>` now only renders
  `into:'tfoot'` entries (a real bug fix — it could previously match either
  kind). New `packages/render-service/src/pagination.ts`: measures real
  rendered row/thead/tfoot/reportHeader heights at the print content width,
  simulates page breaks against the printable height budget, and injects
  "Carried forward"/"Brought forward" `<tr>` rows before `page.pdf()` —
  forcing the pair onto different pages via CSS `break-after:page` (natural
  reflow alone proved unreliable). A real bug caught during verification:
  `<tfoot>` also repeats on every printed page (`display:table-footer-group`,
  same as `<thead>`) and had been left out of the page-budget reservation,
  causing spurious near-empty pages. Best-effort, single-pass approximation
  per the user's chosen approach (not a guarantee of pixel-perfect
  Chromium-fragmentation matching). Verified against the real 60-row invoice
  fixture through the actual Puppeteer `renderPdf()` pipeline, parsed with
  `pdfjs-dist` (scratchpad-only): 3 pages (unchanged from the no-carry-
  forward baseline), correct carried/brought values at both page breaks,
  cross-checked against the fixture's real row data. Barcode/QR stays
  explicitly skipped (memory.md O-4) — both of Phase 3's remaining items hit
  claude.md §9's stop-and-ask; user chose "skip" for barcode/QR and
  "implement via render-service" for carried-forward. **Phase 3 is DONE.**
  38 core tests pass; render-service typecheck/build green (no lint/test
  scripts for that package).
- **2026-07-29 — Saved themes / brand presets (D-032).** Reuses design.md
  §13's existing `config.theme` token-override mechanism rather than a new
  template-model concept. New Toolbar **Theme** control (`ThemeList.svelte`,
  mirrors `TemplateList.svelte`'s pattern) lets the author live-edit 4
  brand-relevant tokens (`--dd-accent`/`-strong`/`-weak`, `--dd-bg`) and
  save/name/apply/delete named sets (`erpdoc.themes.*` in `localStorage`,
  new `SavedTheme` type). Disabled when the host supplies `config.theme`
  directly (D-010 precedent). 150 designer tests pass (was 134);
  lint/typecheck/build all green. Verified with a real-browser screenshot.
- **2026-07-29 — Conditional formatting (D-031).** New `ConditionalRule` type
  (operator/value/style) on `FreeElement` (field kind) and `DetailColumn` —
  declarative only, tests an element/column's own value, never another
  field or a computed expression (claude.md's prime directives). New
  `core.matchesConditionalRule()`/`resolveConditionalStyle()`; `render.ts`
  applies them for field elements and per detail-row cell, merging matching
  rules' styles over the base in array order. New
  `ConditionalRulesEditor.svelte` (shared by `ElementProps.svelte`/
  `ColumnProps.svelte`) — text color/background/bold only, not full
  `ElementStyle`. 38 core tests pass (was 31); 134 designer tests pass (was
  125); lint/typecheck/build all green. Verified with a real-browser
  screenshot (Preview mode) showing correct per-value highlighting.
- **2026-07-29 — i18n locale/currency picker + amount-in-words.**
  `PrintSetup.svelte` gained "Locale"/"Currency" selects (a fixed reference
  list, same pattern as `PAGE_SIZE_OPTIONS`) — `core.formatValue` already
  did the real `Intl.NumberFormat`/`Intl.DateTimeFormat` work against
  `printSetup.locale`/`currency`, only the UI control was missing. New
  `core.numberToWords()` + `'words'` `ValueFormat` for the classic "amount in
  words" line under a `totals` band's grand total (e.g. "One Thousand Two
  Hundred Thirty-Four and 56/100") — English-only by design, since real
  multi-locale number-to-words has genuinely different grammar per language
  (gendered forms, Indian lakh/crore groupings), a much bigger feature than
  reusing `Intl` the way every other format here does. Added to the format
  `<Select>` in `ElementProps.svelte`, `ColumnProps.svelte`, and
  `DetailTable.svelte`. 31 core tests pass (was 27); 125 designer tests pass
  (was 124); lint/typecheck/build all green.
- **2026-07-29 — Stacked/auto-flow arrangement (D-029).** New
  `FreeBand.arrangement?: 'free' | 'stack'` (per-band, absent = 'free') and
  `FreeElement.row?: number` (shared row numbers render side by side).
  `core.renderToHtml` gets a second render path for `'stack'` bands (flex
  rows, intrinsic height, width always a row %) — still one renderer, not a
  second one, same as `detail`'s existing special-cased branch. New
  `core.convertBandArrangement()` migrates a band's elements on toggle. New
  `StackBand.svelte` (row rendering, drag-handle reorder, merge-into-row on
  drop, hover/focus/selected duplicate/delete) swapped in by `Canvas.svelte`.
  `BandProps.svelte` gained the toggle, offered only for reportHeader/totals
  (pageHeader/pageFooter need a *known* height for their fixed-position
  padding reservation, incompatible with intrinsic stack height).
  `ElementProps.svelte` hides X/Y and z-order for stack elements. Also fixed
  a real gap: the palette "+" and keyboard drag-alternative paths built
  free-form elements unconditionally, which would have produced a broken
  240%-wide element on a stack band — both now check the target band's
  arrangement. 27 core tests pass (was 22); 124 designer tests pass (was
  113); lint/typecheck/build all green. Verified with a real-browser
  screenshot showing rows correctly stacked and grouped.
- **2026-07-28 — Percentage-based layout (D-028).** New `Template.layoutUnit?:
  'px' | '%'` (absent = 'px', backward-compatible); `core.renderToHtml` emits
  the matching CSS unit; new `core.convertLayoutUnit(template, targetUnit,
  contentWidthPx)` migrates every free-form element's x/y/w/h in one pass
  (x/w against the band's full content width, y/h against the band's own
  height). `FreeElement.svelte`'s drag/resize/keyboard-nudge math threads
  `unit`/`contentWidthPx`/`bandHeightPx` down through `Canvas.svelte`→
  `Band.svelte` and is fully unit-aware, including a corrected true-visual
  aspect-ratio calc for the image shift-lock. New toggle in `PrintSetup.svelte`
  (Page tab); `ElementProps.svelte` relabels/re-ranges Position/Size fields
  per unit. Verified with core unit tests, canvas drag-math tests, a full
  DocDesigner integration test, and a real-browser screenshot confirming
  pixel-identical rendering after conversion. 22 core tests pass (was 16);
  113 designer tests pass (was 106); lint/typecheck/build all green.
- **2026-07-28 — Cross-cutting visual redesign (D-025/D-026/D-027).** Full
  design plan + before/after covered in the "Now" note above. Amended
  `design.md` §11 (visual design system revised for approachability, D-025 —
  banded-hybrid layout model D-002 unchanged, no CSS framework added). New
  `src/ui/Icon.svelte` + `icons.ts`; bound-field chips replace raw `{label}`
  text (`FreeElement.svelte`); band cards with tint + accent edge + icon
  (`Band.svelte`/`DetailTable.svelte`); labeled detail-column controls;
  icons across Toolbar/Palette/Properties/PrintSetup/Element·Column·BandProps.
  Found and fixed two real bugs via actual browser screenshots (not just
  jsdom): dark-mode band tints made "Grand Total" text invisible (D-026, band
  tints made theme-constant, matching design.md's "paper stays white
  regardless of theme" rule); `pnpm --filter @docsmith/designer dev` had been
  completely unstyled this whole project — `@import` only gets inlined by
  `vite build`, not dev-serve — fixed with a dev-only redirect shim (D-027,
  never affected real consumers of the published component). 106 tests pass;
  lint/typecheck/build all green (`dist/doc-designer.js` ~281KB / ~69KB gzip).
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
