# progress.md — `<doc-designer>` frontend

> Living checklist. **Update this in the same change that lands work.** Status keys:
> `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (note why).
> Keep the "Now / Next / Notes" block at the top current so any session can resume.

---

## Now / Next / Notes

- **Current status (2026-07-30):** Phases 0–3 are done (see the historical
  entries below), followed by two post-Phase-3 rounds not tracked in this
  journal — see the dedicated "Post-Phase-3 (design-review-driven)" and
  "v2 — usability redesign" sections further down for what's shipped since
  (D-034 through D-056). Work is currently on the `v2` branch (off `main`
  after D-046); `main` itself is fully caught up through D-046 and pushed.
  Latest: a real-PDF review of the Invoice (Orange) reference template
  surfaced and fixed five real bugs across two passes. Pass 1 (D-052,
  D-053): pageHeader/pageFooter were silently `position:relative` (never
  actually fixed — footer rendered above the header), and `.page` had no
  explicit width (Preview stretched edge-to-edge; print's auto-fit scale
  was content-dependent) — both fixed, plus the Invoice totals block and
  Purchase Order pageHeader text repositioned to fit the real 673px
  printable width. Pass 2, from direct live-editing feedback (D-054,
  D-055, D-056): the Design canvas's OWN coordinate space still assumed
  the full, unreduced page width (dragging an element could visibly push
  it outside the real page) — fixed by making `geometry.ts` match D-053's
  margin-reduced width; and — the bigger one — the Design canvas never
  applied `ElementStyle` (background/bold/italic/align/color/fontSize) AT
  ALL, only position/size, so nothing looked styled until switching to
  Preview — fixed by exporting core's `styleToCss` and wiring it into
  `FreeElement`/`GridBand`/`StackBand`. Also gave the `examples/
  invoice-demo` pageFooter a visual top-rule separator.
  Pass 3, same live-editing session (D-057, D-058): dragging/resizing a
  free-form element had no right-edge clamp at all (only left/top ever
  clamped to 0) — fixed, and covered by a new test. Added a light 20px
  reference grid to the Design canvas (a blend-mode overlay, since a
  plain background sits behind every band's own tinted background and
  was invisible almost everywhere). Also verified, live, that "sum a
  detail column into a footer row" already exists and works end-to-end
  (each column's Properties panel → "Aggregate (footer)" → Sum/Count/
  Average) — not a new feature, just confirmed and pointed out, since the
  user asked for it not realizing it was already there.
  Pass 4, same session (D-059): user reported the D-038 alignment-guide
  line wasn't appearing while dragging near siblings. Reproduced via
  Puppeteer — the mechanism itself fires correctly under a smooth
  simulated drag, but the 4px tolerance is too tight for a real, by-hand
  mouse drag to land within reliably; widened to 8px, and confirmed a 6px-
  off drag (inside the old miss zone) now shows the guide. Also pinned
  D-058's new grid overlay to an explicit low z-index defensively, so it
  can never end up stacked above real drag UI regardless of future DOM
  reordering.
  Pass 5, same session (D-060): immediately after the tolerance fix, user
  pinpointed a deeper, more precise problem via two follow-up questions —
  the guide compared raw box edges (`x`, `x+w/2`, `x+w`) regardless of a
  text/field element's own alignment, so a right-aligned field whose box
  is wider than its content (e.g. a 200px box holding a 50px label) could
  "align" to its own empty box-left/-center, nowhere near any actual
  text. Fixed: only the one edge the element's `align` anchors its
  content to is now compared (image/line/box kinds, with no text to
  anchor, keep all three edges).
  Pass 6, same session (D-061): user refined the earlier "total row
  should be configurable" ask (already confirmed working, D-058) — the
  Aggregate/Carry-forward controls showed for EVERY column format, not
  just numeric ones, which didn't make sense (Sum/Average on a text/date
  column). Now hidden entirely unless the column's format is number or
  currency.
  Pass 7, same session (D-062, D-063, D-064): while answering "how do I
  set a background color for a text field," found and fixed a real,
  significant color bug — `ElementProps`'s Color swatch presets saved
  `var(--dd-*)` token STRINGS into template data, which don't exist in
  the actually-rendered document (a separate standalone HTML page), so
  every preset except the raw custom-hex picker silently rendered as
  near-black in Preview/PDF while looking correct in the Design canvas.
  Fixed to literal hex values. Added Background-color support for
  text/field elements (was box-only, despite the data model and the
  reference templates themselves already relying on text-element
  backgrounds extensively) and an optional alternating (zebra) row
  shading toggle for the detail table (`DetailBand.stripeRows`, off by
  default).
  Pass 8, same session (D-065): direct screenshot report — a grid
  section with two stacked text elements had no visible boundary at all
  and no way to select "the whole section" to give it one background.
  Added an always-visible dashed boundary (Design-canvas-only) for
  sections without a real printed border, and a per-cell "Fill" button
  that batch-applies one background to every element stacked in that
  cell at once. Still open, asked back to the user rather than guessed:
  whether grid sections should get an explicit, adjustable height (today
  height is fully automatic) with children resizing proportionally, and
  whether free-form bands (totals/pageHeader/pageFooter) should drop
  their fixed-height box model in favor of auto-growing, unbounded-by-a-
  single-page authoring — both are real architecture questions, not
  small implementation details.
  Pass 9, same session (D-066): asked back, user picked auto-grow for
  free-form bands. `core.freeBandHeightPx` now treats a band's stored
  `height` as a MINIMUM, growing to fit content placed past it, wired
  through the real renderer, the carry-forward pagination budget, and the
  Design canvas so all three agree. The grid-section explicit-height +
  proportional-child-resize half of the question remains open — not
  addressed yet.
  Pass 10, same session (D-067): "can I add rounded corners to this
  label" (Purchase Order VENDOR/SHIP TO) → Corner radius was box-kind
  only, extended to text/field. Immediate follow-up ("does not look
  nice") → Padding had NO editor control at all for any kind; added one,
  and fixed the Purchase Order templates' own `barStyle` to include
  padding (it never had any).
  Pass 11, same session (D-068): direct screenshot report — pageHeader
  (LOGO/"PURCHASE ORDER") lined up with reportHeader in the Design canvas
  but not in Preview. Found and fixed a REAL regression, self-inflicted
  by this session's own D-053/D-054: `.page` got an explicit, centered
  width, but `.running` (pageHeader/pageFooter) still spanned the full
  iframe edge-to-edge — two different coordinate origins for one page,
  invisible before D-053/D-054 since both used to span their container by
  default. `.running` now gets the same width + auto-centering `.page`
  has.
  Also this session: committed the previously-published Artifact-format
  DocSmith Designer Guide into the repo itself at
  `docs/designer-guide/index.html` (+ `docs/designer-guide/images/*.png`,
  10 screenshots) per explicit request — same content, now versioned with
  the code instead of only living behind a shared Artifact link. Verified
  all 10 images resolve with no console errors via a real headless-browser
  load of the committed file before pushing.
  Pass 12, same session (D-069): actioned the previously-offered, not-yet-
  confirmed item — right-aligned the Purchase Order (Blue/Peach) totals to
  match the Invoice (Orange) treatment (D-053-era fix). Both PO variants
  share one `purchaseOrderTemplate()` factory, so one fixture edit covers
  both. Verified with real Preview-iframe measurements (Puppeteer): totals
  labels/values now line up with the detail table's Qty+Unit Price/Total
  columns to within ~1px, matching the Invoice's own treatment.
  Pass 13, same session (D-070): closed the last known gap from D-052 — a
  repeating pageHeader/pageFooter used `position:fixed`, which only
  reserves space once (top/bottom of the whole document), so it silently
  overlapped page 2+'s content on a real multi-page print instead of
  pushing it down. Reproduced directly with a throwaway 60-row template +
  a real PDF via `@docsmith/render-service`. Fixed by replacing
  `position:fixed` with the SAME native repeat mechanism the detail band's
  own column header already uses: `renderToHtml` now wraps the whole page
  in one outer `<table>` (pageHeader as `<thead>`, pageFooter as `<tfoot>`,
  `.doc-flow` as the single `<tbody>` cell) whenever pageHeader/pageFooter
  exist — Chromium fragments that cell across pages while repeating
  thead/tfoot on each one, exactly like `table.detail` already does.
  `position:fixed` is kept, `@media screen`-only, purely so the on-screen
  Preview keeps its existing sticky-while-scrolling feel; print no longer
  uses it at all. Also makes D-068's manual `.running` width-sync hack
  obsolete going forward — pageHeader/pageFooter now share the exact same
  containing-block chain as `.doc-flow`, so matching width is structural,
  not a coincidence to maintain. Verified in three steps before landing:
  (1) an isolated Chromium capability test (no app code) confirmed
  thead/tfoot really do repeat with zero overlap across pages; (2) the
  original repro re-rendered through the real render-service pipeline
  after the fix, confirmed clean via Puppeteer screenshot; (3) the full
  claude.md §8 pagination gate re-run against the real `pnpm demo`
  fixture (60 rows, 3 pages) — reportHeader once, column header + tfoot
  aggregate + pageFooter all correctly repeat on every page, Grand
  Total/totals print once on the last page. 70 core tests pass (was 67);
  198 designer tests unaffected; `pnpm -r typecheck`/lint green.
  Pass 14, same session (D-071): "Line Items - I am not able to add
  field." Reproduced directly — every reference/demo template already maps
  100% of its dataset fields to detail columns, so clicking "+" on ANY
  Line Items field threw Svelte's `each_key_duplicate` and broke the
  table: a `DetailColumn`'s only identity is its bound field name, and
  `DetailTable.svelte` keys three `{#each}` blocks on exactly that,
  guaranteed to collide on a duplicate. Fixed at the root
  (`DocDesigner.handleAddColumn` now no-ops on a duplicate field name,
  covering both the palette "+" and drag-drop-onto-table paths at once)
  and in the UX (an already-added dataset field now shows a check instead
  of "+", disabled, labeled "already added," in the palette — so it reads
  as done, not broken; header fields are unaffected, they have no such
  limit). New `check` icon added to the existing hand-authored icon set.
  201 designer tests pass (was 198); lint/typecheck/build green.
  Pass 15, same session (D-072): two screenshots (Design canvas vs.
  Preview) + "header top position at 0 position but preview is showing
  not in the top." Measured directly inside the real Preview iframe:
  `.page` has a screen-only `margin: 12px auto` (pre-existing, the
  "floating sheet on grey" look), but `.band-pageHeader`/
  `.band-pageFooter`'s screen-only `position:fixed` used `top:0`/
  `bottom:0` — fixed to the iframe viewport's literal edge, ignoring that
  `.page` itself sits 12px in from it. Result: the header bar visually
  started 12px above `.page`'s own white background, and reportHeader
  started an extra 12px below where the bar actually ended — a genuine
  mismatch on both ends, not a new D-070 regression (D-070 only touched
  PRINT's mechanism; this screen-only path was carried over unchanged from
  the original D-052/D-068-era code). Fixed by extracting one shared
  `screenPageMargin` value used by both `.page`'s margin and the
  header/footer's fixed top/bottom offset, so they can't drift apart
  again. Re-measured after the fix: header top now exactly equals `.page`
  top, header bottom exactly equals reportHeader top, zero gap — also
  confirmed visually via screenshot, matching the Design canvas exactly.
  71 core tests pass (was 70); 201 designer tests unaffected.
  Pass 16, same session (D-073): screenshot of the Purchase Order (Blue)
  pageHeader's "PURCHASE ORDER" label rendering visibly outside the page in
  the Design canvas. Measured the CURRENT live template data first — flush
  with the page's own right edge to within 0.25px, matching what D-072
  already confirmed renders correctly — so the data wasn't broken; some
  live edit must have pushed it out. Root-caused to a real, separate gap
  from D-057 (which only clamped drag/resize): `ElementProps.svelte`'s
  typed X/Y/Width/Height fields all shared one `px` mode: `undefined`
  max — typing literally any Width (say 600) for an element already
  positioned near the page's edge committed with zero validation, unlike
  dragging the same resize handle, which D-057 already bounds. Fixed by
  threading the real page content width into `ElementProps.svelte`
  (`Properties.svelte` → `geometry.ts`'s existing `pageDimensionsPx`, no
  new prop needed from `DocDesigner.svelte`) and computing X/Width's max
  the same way `FreeElement.svelte`'s drag clamp already does — Y/Height
  deliberately stay unbounded (a band's height auto-grows, D-066, no fixed
  bottom edge to clamp against). Verified live: before the fix, Width's
  `max` attribute was absent; after, typing 600 clamps to 412.76 and the
  element's rendered right edge exactly matches the page's. New
  `ElementProps.test.ts` (7 tests, new file). 208 designer tests pass (was
  201); lint/typecheck/build green.
  Pass 17, same session (D-074): "I again see the same out of page
  alignment" — checked live data first rather than assuming a repeat
  report: Purchase Order's own elements were still correctly flush
  (D-073's fix only guards new edits, doesn't retroactively touch existing
  data, and there was nothing to retroactively fix there anyway). The real
  offender was a genuinely different, pre-existing bug: `salesContract
  Template()`/`shippingInstructionTemplate()`'s pageHeader titles
  ("SALES CONTRACT"/"SHIPPING INSTRUCTION") were authored at `w:750` in
  the fixture source, against the same 673px real content width every
  other reference template uses — 77px too wide, baked in from the start,
  unrelated to any live edit. Fixed both to `w:673`, matching the
  established convention. Also noted (not a code bug): the dev harness
  only seeds each reference template into `localStorage` ONCE, so a
  browser session that loaded the old `w:750` before this fix needs that
  one template's `localStorage` entry cleared (or re-added) to pick up the
  fix — confirmed by testing a fresh, unpersisted session, which picked up
  `w:673` immediately with no other change needed. Verified via direct
  canvas measurement: "SALES CONTRACT"'s right edge now matches the
  page's own right edge to within 0.25px. Fixture-data-only — 71 core, 208
  designer tests unaffected. The rest of this section (below) is
  historical Phase 0–3 journal, kept for reference.
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
- [x] **Four real usability bugs from live dogfooding (D-043):** (1) the
      element hover toolbar stayed visible while dragging (own element or a
      neighbor it was dragged onto) — new `suppressToolbar`/`anyDragging`
      band-wide suppression, enforced with `!important` since a plain class
      loses the specificity tie against `:hover`; (2) dragging a "Sections"
      chip onto a band was a silent no-op — `Band.svelte` now handles
      `application/x-doc-section` (reportHeader/totals only; an honest
      rejection message elsewhere) via the same `addSectionToBand` the
      click path already used; (3) a Section's placeholder cells had no
      delete affordance once added — `GridBand.svelte`'s empty-cell branch
      gained a Delete button when backed by a real placeholder element; (4)
      a Text block dropped into a grid cell rendered as an indistinguishable
      "Drop a field here" ghost — `createGridBlockElement` now defaults new
      Text blocks to `text:'Text'`, matching the free-form/stack paths.
- [x] **Cursor-drag column resize for grid bands (D-044)** — a Confluence-
      style divider handle between adjacent columns in `GridBand.svelte`;
      dragging adjusts the two neighboring columns' percentages (min 8%
      each), live-applied via a new `onGridColumnsChange` prop and batched
      into one undo step by reusing the existing element-drag snapshot/
      commit handlers. The `BandProps.svelte` numeric width editor still
      works exactly as before — this is an additional, faster interaction,
      not a replacement.
- [x] **Grid cells can hold multiple stacked elements (D-045)** — dropping a
      second field/block onto an already-filled (non-placeholder) grid cell
      now appends instead of replacing; each stacked element is its own
      independently selectable/deletable sub-item. `core.render.ts`'s
      `renderGridBand` widened from row-only grouping to (row, col)-aware
      grouping via a new `buildGridRows()`, which also fixed a real latent
      bug found while making the change: a row with a genuinely-empty
      column previously rendered with NO gap `<td>` at all, silently
      misaligning any later real column in that row — now fixed for free by
      the same grouping rewrite.
- [x] **Five reference-document templates seeded as Saved Templates (D-046)**
      — new `examples/reference-templates/fixtures.mjs` recreates five
      real-world document screenshots the user shared (Sales Contract,
      Shipping Instruction, two Purchase Order color themes, a two-tone
      Invoice) purely from existing DocSmith primitives (grid + colSpan,
      D-045 stacked cells, DetailBand aggregates, ElementStyle colors) — no
      new core/designer code. `dev/main.ts` registers all five entities and
      seeds their templates into `localStorage`'s Saved Templates (only if
      not already present, so an author's own edit is never overwritten),
      so `pnpm --filter @docsmith/designer dev` shows all five in the
      Toolbar dropdown with zero new UI. Found and fixed a real rendering
      bug while verifying: the Purchase Order builder's "Comments" label
      had a leftover oversized height, making its own colored background
      overlap and obscure the comment text below it.

---

## v2 — usability redesign (`v2` branch, off `main` after D-046)

Prompted by direct feedback that the Properties panel/Palette were too
technical/complicated for a non-technical end user, plus a proposal to
consider React. Reaffirmed Svelte (memory.md D-051, D-007) — the actual
problem is information architecture, not the framework. A mockup Artifact
was approved before any code changed this time (learning from D-042's
"mock vs actual" gap). Tracked here with the same rigor as any other phase.

- [x] **Properties panel + Palette simplified for a non-technical
      audience (D-051)** — icon align buttons, B/I toggle buttons, color
      swatches + custom picker replace the old dropdown/checkboxes/raw
      color input in `ElementProps.svelte`; "Column span" renamed "Width
      across columns" and, with Layer order, moved into a collapsed
      section. `SourceConfig.svelte`'s raw SQL dataset form moved behind
      a new "Advanced" toggle, closed by default. No capability removed.
- [x] **Click-to-add inline field/text picker for grid cells (D-047)** —
      an empty cell is now clickable: a popover offers a search box over
      header fields plus "Type your own text" (enters edit mode
      immediately), reusing the same replace-vs-append placement logic
      (D-045) drag-and-drop already used. Drag-and-drop is unchanged.
- [x] **Per-section independent column layout (D-048)** — new
      `FreeBand.sectionColumns` lets each grid-band row have its own
      column widths instead of every row sharing one band-wide
      `gridColumns`. `core.renderGridBand` renders each row as its own
      `<table>`, merging consecutive same-layout rows back into one for
      seamless `border-collapse`. Column-resize handles (D-044) are now
      per-row. Fixed a related bug in `convertBandArrangement` (matched
      rows by array position instead of their real `row` value).
- [x] **Section hover toolbar: change layout / duplicate / delete
      (D-049)** — hovering a section reveals a toolbar (same look as the
      D-036 element toolbar). Change layout swaps just that section's
      columns via a preset popover, clamping existing content into the
      new count rather than losing it. Duplicate/delete act on the whole
      row at once — previously only per-field delete existed.
- [x] **Split handle for wide cells (D-050)** — a colSpan > 1 cell shows
      a circular split handle on hover; clicking it halves the cell,
      turning the freed columns into a real new placeholder cell. A
      direct canvas alternative to the "Width across columns" stepper.

61 core tests pass (was 60); 191 designer tests pass (was 184 before this
whole pass). Every item verified in a real browser against the approved
mockup, not just described.

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

- **2026-07-30 — Fixed a real Preview regression: pageHeader/pageFooter
  didn't line up with the rest of the page (D-068).** Direct screenshot
  report: LOGO/"PURCHASE ORDER" (pageHeader) lined up with VENDOR/SHIP TO
  (reportHeader) in the Design canvas but were visibly shifted in
  Preview. Measured directly in a real Preview iframe to confirm rather
  than guess: `.page` (D-053/D-054, earlier this session) is 673px wide
  and centered, starting at iframe-x≈347.5 — but `.running`
  (pageHeader/pageFooter, `position:fixed;left:0;right:0`) had no width
  of its own and spanned the FULL iframe edge-to-edge, a different,
  wider coordinate origin than `.page`'s. An element at x:260 inside
  pageHeader landed at absolute iframe-x 260; the same x:260 inside
  reportHeader (inside `.page`) landed at 607.5 — two origins for one
  page. Invisible before D-053/D-054 gave `.page` an explicit width,
  since previously both spanned their container edge-to-edge by default
  and matched by coincidence — a genuine, confirmed side effect of this
  session's own earlier fix, not a user template issue. Fixed: `.running`
  now gets the same computed width + `margin:0 auto` centering `.page`
  uses. New `render.test.ts` case (67 core tests, was 66) asserts the two
  widths match exactly in the generated CSS. Measured live: "PURCHASE
  ORDER"'s right edge now exactly matches `.page`'s right edge
  (previously it didn't). 198 designer tests unaffected, `pnpm -r
  typecheck` and designer `pnpm lint` green.
- **2026-07-30 — Corner radius and padding now settable for text/field
  elements (D-067).** Same "one gap surfaces the next" pattern as D-063:
  user asked to round the corners of the Purchase Order VENDOR/SHIP TO
  label bars — `borderRadius` was already fully rendered for any element
  kind, just never exposed in the editor except for `box`. Extended it
  to text/field. Immediately reported the result "does not look nice" —
  rounding a label with zero padding puts text right against the curve.
  `padding` had no editor control at all for any kind; added one, and
  fixed the actual Purchase Order (Blue/Peach) fixture's `barStyle`
  (used for every colored label) to include `padding: 4`, since it never
  had any. `pnpm -r typecheck` and designer `pnpm lint` green. Live
  Puppeteer check against the real Purchase Order (Blue) template
  confirms both controls work and the labels now have visible breathing
  room in Preview and the Design canvas alike.
- **2026-07-30 — Free-form band height is now a minimum, not a fixed
  ceiling (D-066).** Direct report: the totals band felt "restricted" —
  content placed below its stored height wasn't actually blocked (Y was
  never clamped), but rendered past the band's own colored background
  into whatever came next, looking broken. Asked back explicitly since
  this is a real architecture choice: auto-grow (like `reportHeader`
  already effectively does under grid/stack), a resize handle on a still-
  fixed box, or something else — user picked auto-grow. Added
  `core.freeBandHeightPx(band)` = `max(band.height, max(el.y+el.h))`,
  wired into the real renderer's own band `<div>`, `runningTop`/
  `runningBottom` (the `.doc-flow` padding reserved for a pageHeader/
  pageFooter's fixed position — must track the same grown height or a
  grown footer would overlap content instead of being reserved space),
  render-service's carry-forward pagination budget, and the Design
  canvas's `Band.svelte` (both the visual box and the `%`-mode
  conversion basis), so all four agree on the same effective height.
  `BandProps`'s "Height (px)" field relabeled "Minimum height (px)" with
  a hint. 3 new core render tests (66 total, was 63) — content-fits case
  unchanged; content-past-height grows the div; a grown pageFooter
  reserves matching padding. 1 new `Band.test.ts` case. 198 designer
  tests (was 197). `pnpm -r typecheck` (including render-service), lint
  all green. Live Puppeteer check: pushed an element to y:300 in a
  150px-tall totals band — canvas box grew to exactly 320px, and the
  real Preview shows the content fully with the footer correctly pushed
  below it, no overlap. The related "grid sections should have an
  explicit, adjustable height with children resizing proportionally"
  half of the same conversation remains open, not addressed yet.
- **2026-07-30 — Grid sections get an always-visible boundary and a
  whole-cell background fill (D-065).** Direct report with a screenshot:
  two stacked text elements in a grid section had no visible boundary at
  all (only individually-selectable elements, no sense of the section's
  own extent), and no way to select the section as a whole to give it
  one background. Added a light dashed boundary to any section without a
  real printed `gridBorder` (Design-canvas-only, purely decorative), and
  a "Fill" button (revealed on cell hover, same reveal pattern as the
  D-050 split handle) that opens a small swatch popover and batch-applies
  one background to every element currently stacked in that cell, reusing
  D-063's per-element `bg` and the existing `onUpdateElements` batch
  callback — no new data model needed, since this is exactly the
  mechanism the reference templates already use to make a cell read as
  one solid block. Two new `GridBand.test.ts` cases (batch-apply leaves
  other rows untouched; "No fill" clears `bg`). 197 designer tests (was
  195), `pnpm -r typecheck` and designer `pnpm lint` green. Live
  Puppeteer check confirmed the fill button/popover render and correctly
  batch-recolor every stacked element in the targeted cell together.
- **2026-07-30 — Fixed a real color-rendering bug; added background
  color for text/field elements; added optional zebra-striped detail
  rows (D-062, D-063, D-064).** While answering a user question about
  setting a text field's background color, found that `ElementProps`'s
  Color swatch presets (`COLOR_PRESETS`) saved `var(--dd-*)` CSS custom
  property STRINGS directly into `element.style.color` — real template
  data, serialized into the template JSON. `core.renderToHtml` renders
  that into a completely separate, standalone HTML document (the
  Preview iframe's srcdoc, or the exported PDF) that never defines
  `--dd-*` anywhere (those only exist inside the designer's own shadow
  root) — so every preset except the raw custom-hex picker was silently
  invalid there and fell back to near-black, correct-looking only in the
  Design canvas. Confirmed directly via `getComputedStyle` in the real
  Preview iframe before and after. Fixed to literal hex values matching
  the tokens' own light-mode colors. Also: the Background swatch row was
  `box`-kind only, despite `bg` being a general property the reference
  templates already lean on heavily for text elements — extended it to
  `text`/`field`, with a "No fill" option. And, from an earlier
  conversation about additional properties worth adding: `DetailBand`
  gained an optional `stripeRows` toggle ("Alternating row shading" in
  BandProps, off by default) for zebra-striped line-item tables, wired
  through core's renderer, the Design canvas's `DetailTable`, and the
  full designer UI chain. Verified: 2 new core render tests (63 total,
  was 61), 195 designer tests unchanged, `pnpm -r typecheck` and
  designer `pnpm lint` green throughout; live Puppeteer checks confirmed
  each fix against the real Invoice (Orange) template and a real Preview
  iframe, not just re-reading the code.
- **2026-07-30 — Column "Aggregate (footer)"/"Carry forward" hidden for
  non-numeric columns (D-061).** User refined the earlier "total row
  should be configurable" request — already confirmed working
  end-to-end and per-column, but it showed on every column regardless of
  format, and Sum/Average on a text/date column never made sense.
  `ColumnProps.svelte` now only renders those two controls when
  `column.format` is `'number'` or `'currency'`. Added two `ColumnProps`
  tests (hidden for text, shown for currency); updated one
  `DocDesigner.test.ts` integration test that had been exercising the
  aggregate flow against a text ("description") column — added a numeric
  ("amount") field to its fixture and switched to that, since summing
  text was never a real scenario. 195 designer tests (was 193), `pnpm -r
  typecheck` and designer `pnpm lint` green; live Puppeteer check against
  the real Invoice (Orange) template confirms hidden for "Item
  Description," shown for "Total."
- **2026-07-30 — Alignment guide compares content edges, not raw box
  edges, for text/field elements (D-060).** Immediately after the D-059
  tolerance fix, user said the guide was "not helpful" — two targeted
  `AskUserQuestion` follow-ups pinned down exactly why: "field is of
  200px but label is 50px, then vertical alignment help line does not
  helpful." `computeAlignSnap` compared all three box edges (`x`,
  `x+w/2`, `x+w`) regardless of the element's own text alignment — a
  right-aligned field whose box is wider than its content only ever
  visually sits flush against `x+w`; its box's left edge and center are
  just empty space, not anything the eye lines up against. Fixed:
  `contentXEdges()` returns only the one edge a `'text'`/`'field'`
  element's own `align` (left/center/right) anchors its content to;
  image/line/box kinds (no text to anchor) keep all three edges as
  before. New test drags onto a right-aligned wider-than-content
  sibling's empty box-left edge (confirms no guide) and then its real
  content edge (confirms the guide fires there). 193 designer tests (was
  192), `pnpm -r typecheck` and designer `pnpm lint` green.
- **2026-07-30 — Alignment-guide tolerance widened; grid overlay pinned
  to a low z-index (D-059).** Same live-editing session, continued: user
  reported the alignment-guide line from D-038 wasn't appearing while
  dragging. Reproduced with Puppeteer — a smooth, simulated drag DOES
  fire the guide correctly, so the mechanism isn't broken; the real
  problem is `ALIGN_TOLERANCE` (4px) requiring near-pixel-perfect
  by-hand mouse positioning to ever land within range. Widened to 8px and
  confirmed live: a drag landing 6px off a sibling's edge (inside the old
  miss zone) now shows the guide, where it didn't before. Also pinned the
  previous entry's new `.dd-grid-overlay` to an explicit `z-index:1` —
  investigated whether it could be sitting above the guide line (DOM-order
  stacking rules mean a later unstacked sibling CAN render over an
  earlier one regardless of that element's own nested z-index) and, while
  not confirmed as the actual cause here, pinned it defensively so the
  relationship is unambiguous going forward. 192 designer tests pass
  unmodified (both existing guide tests use either an exact 0px delta or
  a far-away sibling, neither sensitive to the exact tolerance value),
  `pnpm -r typecheck` and designer `pnpm lint` green.
- **2026-07-30 — Free-form drag/resize right-edge clamp + Design canvas
  reference grid (D-057, D-058).** Same live-editing session as the entry
  below, continued: user reported dragging a totals field pushed it
  outside the page — `FreeElement.svelte` clamped `x`/`y` to `>= 0` (left/
  top) but had no upper bound at all for the move handler, the `w`/`e`
  resize handles, or the `ArrowRight` keyboard nudge. Fixed all three
  against `maxXBasis` (the real content width from D-054, with `||
  Infinity` so callers/tests that don't pass a real width aren't frozen
  at `x:0`). Added a new test; fixed two pre-existing `'%'`-mode tests
  whose shared fixture's `w:200` default (a `'px'`-oriented placeholder,
  literally "200%" once reused under `'%'` mode) is now correctly caught
  by the clamp. Separately, added a light 20px reference grid to the
  canvas per direct request ("light colored grid... so we can check and
  adjust vertical/horizontal") — a plain CSS background on `.dd-page`
  turned out to sit behind every band's own tinted background
  (`--dd-hero-weak` etc.) and was invisible almost everywhere it would've
  been useful, confirmed by cropping a real screenshot; switched to a
  full-page overlay with `mix-blend-mode: multiply` so the lines darken
  through any band tint instead of being covered by it. Also verified
  live (Puppeteer clicking through the actual UI, not just reading code)
  that "add a total for a column like Qty" already exists — each detail
  column's Properties panel has an "Aggregate (footer)" dropdown
  (Sum/Count/Average/None) — and confirmed end-to-end that setting it
  actually shows the summed value in Preview; this was a discoverability
  gap, not a missing feature, so no code changed for it. Verified: 192
  designer tests (was 191), `pnpm -r typecheck`, designer `pnpm lint` all
  green.
- **2026-07-30 — Design canvas WYSIWYG gaps found and fixed from live
  editing feedback (D-054, D-055, D-056).** Direct follow-up to the
  2026-07-29 render fixes below: user hit the exact gap D-053 had
  deliberately left unfixed — dragging the totals field in the Design
  canvas pushed it visibly outside the real page in Preview, because
  `geometry.ts`'s `pageDimensionsPx` still returned the full, unreduced
  page width while `core/render.ts`'s real `.page` (D-053) is
  margin-reduced. Fixed (D-054) by changing `pageDimensionsPx` to match —
  every consumer (drag/resize clamps, layoutUnit conversion, default
  block width) derives from this one function, so no other file needed
  touching; also fixed `Canvas.svelte`'s margin-guide overlay, which would
  otherwise have doubled the inset now that `.dd-page` itself is the
  printable width. Separately and more significantly (D-055): the user
  reported not seeing background color, alignment, or formatting while
  editing, and being unable to judge a label's real footprint — root
  cause was that `FreeElement.svelte`, `GridBand.svelte`, and
  `StackBand.svelte` NEVER applied an element's own `style` at all, only
  its position/size — every template's real styling was invisible until
  switching to Preview. Exported core's `styleToCss` (previously private
  to `render.ts`) and wired it into all three, so the canvas now reuses
  the SAME style-to-CSS conversion Preview/PDF use, per claude.md's "one
  renderer" rule. Also (D-056), from a footer screenshot the user flagged
  as "doesn't look like footer but contents": added a thin top-rule
  separator to `examples/invoice-demo`'s pageFooter (a fixture-only
  change — the `line` element and per-element borders already existed,
  this template just hadn't used them). Verified: 191 designer tests pass
  unmodified, `pnpm -r typecheck` and designer `pnpm lint` green, and a
  live Puppeteer screenshot of the Design canvas confirms the Invoice
  (Orange) template's real dark/orange backgrounds, bold, and
  right-alignment now render while editing, matching Preview.
- **2026-07-29 — Two real `core/render.ts` bugs found and fixed via a
  live-PDF review of the Invoice (Orange) template (D-052, D-053).** User
  reported 5 specific complaints on a Preview screenshot: header/summary
  backgrounds not aligned, line-items/summary right-alignment off, wanted
  the totals block to read as a sub-table aligned with the line-item
  table, footer fields (phone/website/address) rendering ABOVE the
  header, and the PDF not looking like it had a print margin. Investigated
  by generating real PDFs and inspecting their content streams directly
  (inflating the FlateDecode stream, reading `cm`/`re` operators) rather
  than guessing. Found (D-052) `renderFreeBand`'s inline
  `style="position:relative"` was silently overriding the
  `.running{position:fixed}` CSS class needed for pageHeader/pageFooter —
  they were never actually fixed, which is exactly why the footer
  rendered above everything else, and (verified with a real 40-row
  multi-page PDF) why a repeating pageHeader never repeated past page 1.
  Fixed the specificity bug. Found (D-053) `.page` had no explicit CSS
  width at all, so on-screen Preview stretched edge-to-edge with no
  visible page boundary, and Chromium's print auto-fit scale was silently
  content-dependent (two different documents printed at two different
  effective px-to-pt scales). Gave `.page` an explicit width matching the
  real printable area (verified: Preview's `.page` now measures exactly
  673px for an A4/16mm-margins template, was previously stretching to
  fill its container) — this is a real, checked win for Preview even
  though it does not fully control Chromium's print-time auto-fit (tried
  and reverted an `overflow:hidden` + invisible-marker experiment that
  didn't help and risked new clipping bugs — flagged as a known
  follow-up in D-053 rather than solved under time pressure). Fixing
  D-052 correctly exposed a second, previously-hidden bug: the Purchase
  Order (Blue/Peach) pageHeader's "PURCHASE ORDER" text was always wider
  than the true printable width, previously masked by the D-052 bug
  itself (fixed as unintended in-flow content, it "fit" by coincidence);
  narrowed the text element to fit. Repositioned the Invoice (Orange)
  totals block (SUB TOTAL/TAX & VAT/DISCOUNT/GRAND TOTAL) to align
  exactly with the detail table's real rendered "Total" (values) and
  "Price"+"Qty." (labels) column boundaries at the true 673px width,
  directly addressing complaints #1–#3. All 5 reference templates
  re-rendered to real PDFs and screenshotted after every change to catch
  regressions — the Purchase Order fix above was found this way, not
  reported by the user. Verified: 61 core + 191 designer tests, `pnpm -r
  typecheck`, designer `pnpm lint`, all green.
- **2026-07-29 — v2 usability redesign: simplified Properties/Palette,
  click-to-add picker, per-section columns, section hover toolbar, split
  handle (D-047–D-051).** Direct feedback that the Properties panel was
  "very complicated" for a non-technical end user, with a screenshot and
  a proposal to consider migrating to React. Declined the React move
  (reaffirms D-007 — the actual problem is information architecture, not
  the framework, and switching would reintroduce the exact "second
  runtime in a host page" risk D-007 was written to avoid). Built a
  static, clearly-labeled Artifact mockup and got explicit approval
  before touching any code — learning from D-042's earlier "mock vs
  actual didn't match" complaint — then implemented on a new `v2` branch
  (created off `main` right after pushing everything through D-046).
  (D-051) `ElementProps.svelte`: icon align buttons, B/I toggle buttons,
  theme-token color swatches + a custom picker, and a collapsed "Position
  & layout"/"Layer order" section replace the old dropdown/checkboxes/
  raw color input/always-visible Column-span field. `SourceConfig.svelte`:
  the raw SQL dataset form moved behind a new "Advanced" toggle, closed
  by default. (D-047) An empty grid cell is now clickable — a popover
  offers a field search plus "Type your own text," reusing the same
  replace-vs-append logic (D-045) drag-and-drop already used. (D-048) New
  `FreeBand.sectionColumns` lets each grid-band row have its own column
  layout instead of one band-wide `gridColumns` — `core.renderGridBand`
  renders each row as its own `<table>` (merging consecutive same-layout
  rows for seamless `border-collapse`), and column-resize (D-044) became
  per-row; fixed a related `convertBandArrangement` bug (matched rows by
  array position instead of their real `row` value). (D-049) Hovering a
  section reveals a toolbar to change its layout (a preset popover,
  clamping existing content into the new column count rather than losing
  it), duplicate it, or delete the whole row at once. (D-050) A colSpan >
  1 cell shows a split handle that halves it into two real cells. No
  capability was removed anywhere — every change is re-labeling,
  re-grouping, or a friendlier control for the same underlying data.
  61 core tests pass (was 60); 191 designer tests pass (was 177 before
  this whole pass). Every item verified in a real browser against the
  approved mockup: icon controls and collapsed sections in Properties,
  the click-to-add popover, two independent sections at different column
  widths with independent resize, the layout-swap/duplicate/delete
  toolbar, and the split handle producing two real cells.
- **2026-07-29 — Five reference-document templates seeded as Saved
  Templates (D-046).** The user attached five real-world document
  screenshots (a bordered Sales Contract, a Shipping Instruction, two
  Purchase Order color themes, a two-tone orange Invoice) and asked to
  "select any one and see how it is implemented." New `examples/
  reference-templates/fixtures.mjs` builds each one as a real `Template`
  JSON using only existing primitives — grid arrangement + colSpan
  (D-034), multi-element stacked cells for label/value pairs and address
  blocks (D-045), DetailBand aggregates, ElementStyle colors — no new
  core/designer code, matching the existing `examples/invoice-demo`
  fixture pattern exactly (D-015: demo scaffolding, never shipped truth).
  `dev/main.ts` registers all five entities into the same `StaticAdapter`
  and seeds their templates into `localStorage`'s Saved Templates (only if
  not already present, so a real edit+Save is never overwritten), so
  `pnpm --filter @docsmith/designer dev` shows all five in the Toolbar
  dropdown with zero new UI. A standalone script confirmed all five render
  via `core.renderToHtml` without throwing; real-browser Puppeteer against
  the actual dev server (not just the scratchpad harness) confirmed all
  five load and select correctly; Design-view and Preview-mode screenshots
  of each were visually compared against the original reference images.
  Found and fixed a real bug while verifying: the Purchase Order builder's
  "Comments or Special Instructions" label had a leftover oversized height
  (60px instead of ~18px) — since it also carried a solid background
  color, the oversized box visually overlapped and obscured the comment
  text positioned just below it.
- **2026-07-29 — Cursor-drag column resize (D-044); grid cells can hold
  multiple stacked elements (D-045).** Two follow-up requests right after
  D-043: "like Confluence doc, these sections should be adjustable from the
  cursor," then "user can add multiple fields/placeholders in each
  section." (D-044) `GridBand.svelte` gained a divider handle between every
  pair of adjacent columns — dragging live-adjusts the two neighbors'
  percentages (8% floor each) via a new `onGridColumnsChange` prop,
  batched into one undo step by reusing the existing element-drag
  snapshot/commit pair (`handleElementDragStart`/`End`), the same way
  `FreeElement`'s own move/resize gestures are batched. (D-045) A grid
  cell is no longer capped at one element: `core.render.ts`'s
  `renderGridBand` now groups by `(row, col)`, not just `row`
  (`buildGridRows()`), rendering multiple stacked elements inside one
  `<td>`; `GridBand.svelte`'s own cell grouping widened the same way, and
  dropping onto an already-filled (non-placeholder) cell now appends
  instead of replacing — the actual mechanism for "multiple fields in one
  section." Widening the grouping surfaced and fixed a real latent bug:
  the old row-only grouping never looked at `col` at all, so a row with a
  genuinely-empty column silently misaligned any later real column in that
  row (no gap `<td>` was ever emitted) — now fixed for free. 57 core tests
  pass (was 55); 177 designer tests pass (was 175, net +2 replacing the
  old "drop onto a filled cell always replaces" test, which was the
  behavior actually being changed). Caught and fixed a real process gap
  during verification: `@docsmith/designer` bundles from
  `packages/core/dist`, not `core/src`, so editing `render.ts` and running
  only `pnpm --filter @docsmith/designer build` silently keeps testing the
  OLD renderer — `core` must be rebuilt first. Verified end-to-end with
  real-browser Puppeteer: a full mouse column-drag reverting in exactly
  one Undo click; dropping a second field onto an already-filled section
  cell via a real native DragEvent sequence (not just the model);
  **Preview mode's actual rendered output** (`core.renderToHtml`, after
  correctly rebuilding `core`) showing two stacked `<div>`s inside one
  real `<td>`.
- **2026-07-29 — Four real usability bugs from live dogfooding (D-043).**
  The user reported four separate problems while actually using the app:
  a black hover toolbar staying visible while dragging a field; dragging a
  "2 columns" Sections chip onto Report Header silently doing nothing;
  no way to remove a Section once added; and a "Text" block dropped into a
  grid cell rendering invisibly. All four traced to the same pattern this
  project has hit before (D-021, D-041) — an affordance that looks
  functional but silently does nothing. (1) `FreeElement.svelte` gained a
  `suppressToolbar` prop driven by a new `Band.svelte`-owned `anyDragging`
  flag (any element dragging suppresses every toolbar in the band, not
  just its own — the pointer is often hovering a different element it's
  been dragged onto), enforced with `!important` since dragging state
  alone loses the CSS specificity tie against `:hover`. (2) `Band.svelte`
  now handles `application/x-doc-section` drops (reportHeader/totals only,
  matching D-037's original arrangement scope; an honest rejection message
  elsewhere) via the same `addSectionToBand` the click-to-add path already
  used. (3) `GridBand.svelte`'s empty-cell branch gained a Delete button
  when the cell is backed by a real placeholder element (not a genuinely
  absent gap cell). (4) `createGridBlockElement` now defaults a new Text
  block to `text:'Text'` instead of `''`, matching
  `createBlockElement`/`createStackBlockElement` — an empty string was
  indistinguishable from a placeholder cell and rendered as an inert ghost
  with no way to edit it. `Band.test.ts` gained 2 tests; 172 designer
  tests pass (was 170); lint/typecheck/build all green. Verified with
  real-browser Puppeteer for all four: computed-style toolbar suppression
  during a drag, a genuine native DragEvent sequence converting
  reportHeader to a 2-column grid, a working delete button reducing the
  element count, and a visible "Text" label rendering in the dropped cell.
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
