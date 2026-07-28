# DocSmith — `<doc-designer>` Frontend Design Specification

> **Status:** authoritative. This document is the single source of truth for the
> frontend document template designer. Every UI decision, component boundary,
> interaction, and visual rule lives here. If code and this document disagree,
> the document wins — change the document first, then the code.
>
> **Audience:** the engineer/agent building this in **Antigravity IDE**.
> **Voice:** written by the frontend lead. Follow it literally. Do not improvise
> architecture, invent data, or add dependencies not listed here.

---

## 0. What we are building (one paragraph)

A **browser-embeddable, drag-and-drop document template designer** for any
data-bound document (ERP documents — Sales Order, Purchase Order, Invoice, Quote,
Delivery Note — are the lead example, but any header + line-item data works). A user
picks a document type, drags header fields and line-item columns onto a
page-shaped canvas, arranges a rich layout (logo, addresses, tables, totals,
terms), and saves a **portable JSON template**. The same template renders to a
live on-screen preview and — via a separate render service — to a paginated PDF
where **line-item tables that overflow a page repeat their column headers on every
page**. The designer ships as a single **custom element `<doc-designer>`** plus a
thin **JS SDK**, so any ERP frontend embeds it with a `<script>` tag.

---

## 1. Non-negotiable principles

1. **The adapter is the only data source.** The designer never talks to a
   database, never hardcodes a table/column, never ships sample business data.
   All entities, fields, and document values come from the injected
   `DataSourceAdapter` (§6). If the adapter returns nothing, the UI shows an
   honest empty state — **never** a fabricated value. (This mirrors the host
   project's "engine-truthful" rule.)
2. **One rendering path.** On-screen preview and server PDF are produced by the
   **same** `renderToHtml()` from `@docsmith/core`. The designer must not grow a
   second, divergent renderer. Design↔output parity is a feature, not an accident.
3. **The template is pure data.** A saved template is JSON with **no executable
   code**, no functions, no HTML strings authored by the user. It is safe to
   store, diff, version, and email.
4. **Zero business logic in components.** All model math (band ordering, binding
   resolution, SQL/adapter calls, formatting, pagination CSS) lives in `@docsmith/core`
   and `@docsmith/adapters`. Svelte components are thin: render state, capture input,
   call core. A component file with a `for` loop doing arithmetic on money is a bug.
5. **No new runtime dependencies** beyond those named in §3 without updating this
   doc and `memory.md`. We keep the embed bundle small.
6. **Accessibility and keyboard parity are requirements, not phase 3** (§12).

---

## 2. The mental model: banded hybrid layout

ERP documents are **not** free-form posters and **not** rigid grids — they are
both. The letterhead/logo/address block wants pixel-level free placement; the
line-item region must *flow* and *paginate* with an unknown number of rows. We
therefore use a **banded model with free-form elements inside most bands**.

**Bands, in fixed print order:**

| Band          | Prints            | Content model              | Purpose                                   |
|---------------|-------------------|----------------------------|-------------------------------------------|
| `reportHeader`| once, top of p.1  | free-form elements         | Logo, "INVOICE", bill-to/ship-to, doc meta|
| `pageHeader`  | every page (opt)  | free-form elements         | Running company strip                     |
| `detail`      | flows, paginates  | **column-mapped table**    | The line items — the only band that grows |
| `totals`      | once, after rows  | free-form elements         | Subtotal, tax, grand total, amount-in-words|
| `pageFooter`  | every page (opt)  | free-form elements         | Terms, signatures, "Page X of Y"          |

**Why this and not the alternatives** (do not revisit — see `memory.md` D-002):
- *Pure free-form* (Mailchimp email) cannot express "this region grows by N rows
  and reflows to page 2 with the header repeated." A 3-line and a 90-line invoice
  would need different templates. Rejected as the primary model.
- *Pure banded* (Crystal/Jasper) is right for the flowing detail but clumsy for
  the letterhead nudging users expect. Rejected as the *only* model.
- *Hybrid* = bands own the **pagination contract** (what repeats, what flows, what
  prints once); free-form-within-band gives the **WYSIWYG feel** everywhere except
  the detail grid, where a grid is what you actually want.

**The `detail` band is special.** It is NOT free-form. It is a table whose ordered
`columns[]` map to `<thead>`/`<td>`. This is the mechanism that makes page breaks
and repeating headers work natively (§9).

---

## 3. Tech stack (fixed)

- **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `$props`) + **Vite** + **TypeScript**.
- Packaged as **one custom element**: the outer boundary is
  `<svelte:options customElement="doc-designer" />`; inside it is a normal Svelte
  app. **Shadow DOM** for style isolation from the host ERP.
- **`@docsmith/core`** (framework-agnostic TS): types, template schema + validation,
  binding engine, `renderToHtml()`, format utilities. The designer imports from it;
  it must not reimplement any of it.
- **`@docsmith/adapters`**: `DataSourceAdapter` interface + reference adapters. The
  designer depends on the *interface only*.
- **Styling:** hand-written CSS in component `<style>` blocks + a small shared
  token sheet (§11). **No** CSS framework, **no** Tailwind, **no** component library.
- **Drag & drop:** native HTML5 DnD for palette→canvas; native Pointer Events for
  move/resize on canvas. **No** drag library (dnd-kit, interact.js, etc.).
- **Icons:** inline SVG, stroke-based, 1.6 stroke width, `currentColor` (house style).
- **State:** Svelte runes only. No Redux/Pinia/XState. The template object is the
  single store; everything derives from it.
- **Preview isolation:** the live preview renders inside a same-origin `<iframe>`
  so print CSS (`@page`, `position:fixed`) cannot leak into the editor chrome.

Forbidden without a doc update: any runtime npm dependency not in the above list.
Dev-only tooling required to actually run that stack — `svelte-check` (type-checks
`.svelte` files; `tsc` alone can't) and `jsdom` (vitest's DOM environment for
`@testing-library/svelte`) — is approved; see `claude.md` §3 and `memory.md` D-016.

---

## 4. Layout of the application (screen regions)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Toolbar:  [Template name ▾] [Design | Preview]   [Undo][Redo]  [Save][PDF] │
├───────────┬───────────────────────────────────────────────┬───────────────┤
│  PALETTE  │                   CANVAS                       │  PROPERTIES   │
│  (left)   │        (center, scrollable, zoomable)          │  (right)      │
│           │                                                │               │
│ Source ▾  │   ┌─────────── page (A4/Letter) ───────────┐   │  [selected    │
│ ─ Header  │   │ ▸ reportHeader band                     │   │   element or  │
│   System  │   │ ▸ pageHeader band (optional)            │   │   band or     │
│   Custom  │   │ ▸ detail band  (line-item table)        │   │   column]     │
│ ─ Items   │   │ ▸ totals band                           │   │               │
│   (d1)    │   │ ▸ pageFooter band (optional)            │   │  Print Setup  │
│ ─ Blocks  │   └─────────────────────────────────────────┘   │  (page tab)   │
│  T / ▭ / ─ │                                                │               │
└───────────┴───────────────────────────────────────────────┴───────────────┘
```

- **Toolbar** (top, full width): template picker, **Design/Preview mode toggle**,
  undo/redo, Save, "Export PDF". Left-aligned brand slot the host can theme.
- **Palette** (left rail, Design mode only): the source picker + draggable field
  chips + static block buttons. §5.
- **Canvas** (center): the page. Bands stack top-to-bottom. §8.
- **Properties** (right rail, Design mode only): context-sensitive editor for the
  current selection (element / band / detail-column), plus a **Print Setup** tab. §10.
- **Preview** replaces the canvas+rails when Preview mode is on. §9.

Minimum usable width 1024px; below that, rails collapse to icon-toggled drawers.

---

## 5. Palette & the field contract (how fields become draggable)

The palette is a **live mirror of the adapter's schema**. It is populated by three
adapter calls once an entity is chosen (§6):

- `getFields(entity)` → **Header** fields, split into **System** and **Custom**
  sub-groups by `FieldMeta.kind`.
- `getRelatedDatasets(entity)` → one collapsible group **per line-item dataset**
  (e.g. "Line items (d1)"), each populated by `getDatasetFields(entity, id)`.
- Static **Blocks** group (not data): Text, Image, Line, Box/Rectangle.

**Field chip** = `{ name, label, type, kind, group }`. Rendered as a small
draggable pill showing the label and a type glyph. Grouped, collapsible, filterable
by a search box at the top of the palette.

**Two field classes, two drop rules** (enforced — see §8.4):

| Chip origin            | Valid drop target          | Produces                          |
|------------------------|----------------------------|-----------------------------------|
| Header field           | any band **except** detail | a bound `field` element (1 value) |
| Dataset (line) field   | the **detail** band only   | a new **column** in the table     |

Dragging a line field onto the letterhead is **rejected with a visible reason**
("Line-item fields can only go in the items table"); header fields cannot become
table columns. This preserves the "prints once vs. repeats per row" semantics.

**Drag payload** (native DnD, MIME `application/x-doc-field`):
```json
{ "cls": "header|dataset", "datasetId": "d1|null",
  "column": "invoice_number", "type": "text", "label": "Invoice #",
  "format": "text|number|currency|date" }
```
`format` is defaulted from `type` (money→currency, timestamp/date→date, int/float→number,
else text) and remains editable in Properties.

**System vs Custom is the adapter's truth, not ours.** If the adapter does not tag
`kind`, everything shows under a single "Fields" group. We never guess or fabricate
the distinction.

---

## 6. Data flow (adapter interface — depend on this, nothing else)

```ts
interface DataSourceAdapter {
  listEntities(): Promise<EntityMeta[]>;                         // doc types
  getFields(entity: string): Promise<FieldMeta[]>;              // header fields
  getRelatedDatasets(entity: string): Promise<DatasetMeta[]>;   // line-item children
  getDatasetFields(entity: string, datasetId: string): Promise<FieldMeta[]>;
  fetchDocument(entity: string, id: string): Promise<DocumentData>;  // runtime bind
  listSampleIds?(entity: string): Promise<{ id: string; label: string }[]>;
}

type EntityMeta   = { name: string; label: string };
type DatasetMeta  = { id: string; label: string };            // e.g. {id:'d1',label:'Line items'}
type FieldMeta    = { name: string; label: string; type: string;
                      kind: 'system' | 'custom'; group?: string };
type DocumentData = { header: Record<string, unknown>;
                      datasets: Record<string, Record<string, unknown>[]>;
                      meta?: Record<string, unknown> };
```

**Authoring lifecycle:**
1. On mount, `listEntities()` → entity dropdown in the palette's Source section.
2. On entity select, in parallel: `getFields`, `getRelatedDatasets`; then
   `getDatasetFields` for each dataset the user adds. Populate the palette.
3. `dataSource` in the template records `{ entity, key, datasets:[…] }`.

**Preview/render lifecycle:**
1. User picks/enters a real document id (via `listSampleIds` dropdown or free input).
2. `fetchDocument(entity, id)` → `DocumentData`.
3. `core.renderToHtml(template, data)` → `{ html, css }` → shown in the preview iframe.
4. Zero rows / missing id → honest empty state, never placeholders.

**Loading & error states are mandatory for every adapter call:** each async call
renders a skeleton/spinner while pending and an inline, human error on failure
(with a Retry). Never leave the palette blank with no explanation.

The designer is handed the adapter via `DocDesigner.mount(el, { adapter })` (§13).
It must tolerate slow adapters (network) — all calls are async, cancellable on
entity change, and de-duplicated.

---

## 7. The template JSON (the artifact)

Authored, versioned, and rendered as-is. Mirror of `@docsmith/core` `types.ts`.

```jsonc
{
  "version": 1,
  "id": "uuid",
  "name": "Standard Invoice",
  "docType": "invoice",
  "printSetup": {
    "pageSize": "A4",                 // "A4" | "Letter" | "A5" | "Legal"
    "orientation": "portrait",        // "portrait" | "landscape"
    "margins": { "top": 20, "right": 18, "bottom": 20, "left": 18 },  // mm
    "unit": "mm"
  },
  "dataSource": {
    "entity": "invoice",
    "key": "id",
    "datasets": [
      { "id": "d1", "label": "Line items", "kind": "fk",
        "ref": { "table": "invoice_items", "fkColumn": "invoice_id" },
        "orderBy": "id" }
    ]
  },
  "bands": [
    {
      "id": "reportHeader", "type": "reportHeader", "height": 140,
      "elements": [
        { "id": "e1", "kind": "text",  "x": 12, "y": 8,  "w": 220, "h": 30,
          "style": { "fontSize": 22, "bold": true, "align": "left", "color": "#111" },
          "text": "INVOICE" },
        { "id": "e2", "kind": "field", "x": 12, "y": 48, "w": 240, "h": 18,
          "style": { "fontSize": 12 },
          "binding": { "source": "header", "column": "invoice_number", "format": "text" },
          "label": "Invoice #" },
        { "id": "e3", "kind": "image", "x": 420, "y": 8, "w": 120, "h": 48,
          "style": {}, "src": { "kind": "url", "value": "" } }
      ]
    },
    {
      "id": "detail", "type": "detail", "datasetId": "d1",
      "keepRowTogether": true,
      "columns": [
        { "column": "description", "header": "Description", "width": 260, "align": "left",  "format": "text" },
        { "column": "qty",         "header": "Qty",         "width": 60,  "align": "right", "format": "number" },
        { "column": "unit_price",  "header": "Unit Price",  "width": 90,  "align": "right", "format": "currency" },
        { "column": "line_total",  "header": "Amount",      "width": 90,  "align": "right", "format": "currency" }
      ],
      "aggregates": [ { "column": "line_total", "fn": "sum", "into": "tfoot" } ]
    },
    {
      "id": "totals", "type": "totals", "height": 110,
      "elements": [
        { "id": "t1", "kind": "field", "x": 320, "y": 8, "w": 200, "h": 22,
          "style": { "align": "right", "bold": true, "fontSize": 14 },
          "binding": { "source": "header", "column": "total_amount", "format": "currency" },
          "label": "Grand Total" }
      ]
    }
  ]
}
```

**Rules:**
- `binding.source` is `"header"` or a `datasetId`. `format ∈ {text,number,currency,date}`.
- Coordinates `x,y,w,h` are **px on the design canvas** at 96dpi (1mm ≈ 3.7795px).
  Elements are positioned relative to their band's top-left.
- `image.src.kind` is `"url"` or `"assetId"` (Phase 2 upload). Never inline base64 in
  the template unless explicitly small (< 16KB) and flagged.
- Unknown future keys must be preserved on load/save (forward-compatible; never drop
  fields you don't recognize).

---

## 8. The design canvas (interaction spec)

### 8.1 Page geometry
The canvas draws a page at the configured size/orientation. 1mm = 3.7795px * zoom.
Margins render as a dashed guide rectangle; content outside margins is allowed but
flagged (subtle red edge). A ruler (mm) sits on the top and left edges.

### 8.2 Bands
Each band is a horizontal strip at page content-width. A band has:
- a **label tab** (left) showing type + a lock/visibility toggle for optional bands,
- a **resize handle** at its bottom edge to set `height` (detail auto-sizes),
- an **empty hint** ("Drag header fields here") when it has no elements.
Bands are always in fixed order; the user cannot reorder them (the print contract).
Optional bands (`pageHeader`, `pageFooter`) can be toggled on/off.

### 8.3 Free-form elements (all bands except detail)
- **Select:** click. Multi-select: shift-click / marquee.
- **Move:** pointer-drag. Snaps to a 4px grid and to sibling edges (smart guides).
- **Resize:** 8 handles. Aspect-locked for images with shift.
- **Keyboard:** arrows nudge 1px (shift = 10px); Delete removes; Cmd/Ctrl-D duplicates.
- **Z-order:** bring-forward/send-back in Properties and via `]` / `[`.
- Element kinds: `text` (static, editable inline on double-click), `field` (bound,
  shows `{label}` token in design, real value in preview), `image`, `line`, `box`.
- Reuse the pointer-drag math pattern from unidb-studio's `SchemaVisualizer` (drag
  delta divided by zoom); do not pull in a library.

### 8.4 Drop handling
- Palette chip dragover a **valid** band → band highlights, insertion ghost shown.
- Drop on valid target → create element (header field) or append column (dataset field)
  at the drop point, then auto-select it and focus its binding in Properties.
- Drop on **invalid** target → reject with a toast explaining why (§5). No silent no-op.

### 8.5 The detail band editor
Rendered as a live table preview with **column chips** in the header. Interactions:
- Drop a dataset field → adds a column (header defaulted from the field label).
- Drag column chips left/right to reorder; drag the column edge to resize width.
- Per-column Properties: header text, width, align, format, and (Phase 3) an
  aggregate (`sum`/`count`/`avg`) rendered in `<tfoot>`.
- A "sample rows" strip shows 3 real rows from `listSampleIds`→`fetchDocument` (or a
  skeleton if none chosen), so the user sees real shape while designing — **real data
  only**, never lorem/fake numbers.

### 8.6 Zoom & pan
Zoom 25%–200% (toolbar + Cmd/Ctrl-scroll). Fit-width and 100% presets. Pan with
space-drag or middle mouse. Selection and guides must be zoom-correct.

### 8.7 Undo/redo
Every mutation to the template object is an undoable command. Maintain a bounded
history stack (≥50 steps). Undo/redo in toolbar and Cmd/Ctrl-Z / Shift-Cmd/Ctrl-Z.
History is derived from template snapshots or command objects — keep it in `core`
as a small helper so it's testable.

---

## 9. Preview & print/pagination (the hard requirement)

Preview mode swaps the canvas for an `<iframe>` containing
`core.renderToHtml(template, data).html/css`. A **doc-id control** (dropdown from
`listSampleIds`, or free text) drives which real document is bound. A **"Print
setup"** summary and **Export PDF** / **Print** buttons sit in the toolbar.

**How overflow, page breaks, and repeating headers work — natively, no JS pagination:**

1. **`detail` renders as `<table><thead>…</thead><tbody>…</tbody></table>`.**
   Browsers **repeat `<thead>` (and `<tfoot>`) on every printed page** when a table
   spans pages. This is the entire "repeat column headers per page" mechanism.
   **Never** set `thead { display: block }` — it kills the repeat.
2. **`@page { size: <A4|Letter> <orientation>; margin: <t r b l> }`** is generated
   from `printSetup` and injected as a single managed `<style>` element in the
   preview iframe. Page size, orientation, margins all come from here.
3. **`tr { break-inside: avoid; }`** and, when `keepRowTogether`, also on cell
   content → a line row never splits across a page boundary.
4. **`break-inside: avoid`** on the `totals` band → the summary never splits.
5. **`reportHeader`** is the first normal-flow block → prints once. **`totals`** is
   the next normal-flow block after the table → prints once, after the last row.
6. **`pageHeader`/`pageFooter`** → `position: fixed` blocks (Chrome paints them on
   every printed sheet). Reserve space by padding the page body by their heights so
   fixed bands never overlap flowing content.

**Client-side honest limitations (state them in the UI, do not fake):**
- **"Page X of Y"** total count is **not reliable** in pure browser print — it needs
  `@page` margin-box counters Chrome doesn't support. In the browser preview, show
  page number only where the engine cooperates, or omit "of Y". The **render service
  supplies real "Page X of Y"** via Puppeteer header/footer templates (§: that's the
  backend's job; the designer just exposes the toggle and lets the service fill it).
- **Carried-forward subtotals** ("brought forward" per page) need break positions the
  browser won't reveal — server-only, Phase 3.
- Exact WYSIWYG↔PDF fidelity varies with the user's OS print dialog. Steer users to
  **Export PDF** (server) for anything official; **Print** (browser) for quick copies.

**Export PDF** posts `{ template, entity, id }` to the render service and downloads
the returned PDF. The designer must show progress and a clear error if the service
is unreachable (and still allow browser Print as a fallback).

---

## 10. Properties panel (right rail)

Context-sensitive. Tabs: **Selection** and **Page**.

**Selection tab** — depends on what's selected:
- **Free-form element:** position (x/y/w/h), font (size, weight, style, color,
  align, line-height), background/border (for box), the **binding** (source +
  column dropdown sourced from the palette fields + format), z-order, lock.
- **Text element:** the static text + typography (no binding).
- **Image element:** source (URL now; upload in Phase 2), fit (contain/cover), alt.
- **Detail column:** header text, width, align, format, aggregate.
- **Band:** height (except detail), visibility (optional bands), background.

**Page tab (Print Setup):** page size, orientation, margins (mm, four inputs +
presets), and the toggles: repeat page header, repeat page footer, show page
numbers, keep rows together. Editing any of these updates `printSetup` and the
preview live.

All numeric inputs are typed, min/max-clamped, and reflect the model immediately
(two-way). No apply button — direct manipulation.

---

## 11. Visual design system

The designer chrome is calm, neutral, and defers to the *document* being designed.
Think Figma/Linear restraint, not a colorful SaaS dashboard.

**Design tokens** (CSS custom properties on `:host`, light + dark via
`prefers-color-scheme`; the host may override):
```
--dd-bg, --dd-panel, --dd-panel-alt, --dd-border, --dd-text, --dd-muted,
--dd-accent (#2563eb), --dd-accent-weak, --dd-danger, --dd-warn, --dd-ok,
--dd-radius (6px), --dd-shadow, --dd-mono, --dd-font
```
Ship a light and dark value set; never hardcode a hex outside the token sheet.

**Type scale:** 11 / 12 / 13 (base UI) / 14 / 16 / 18 / 22. System font stack.
**Spacing:** 4px base grid (4/8/12/16/24). **Rails:** 240px palette, 300px properties.
**Buttons:** primary = accent fill; secondary = bordered `.ghost`; destructive =
danger text. Focus-visible ring on every interactive element (accent, 2px).
**Canvas surface:** the *page* is pure white with a soft shadow on a neutral
`--dd-panel-alt` desk, regardless of theme (a document is white paper).

**Motion:** 120–160ms ease for hovers/panels; drag has no transition (must feel 1:1).
Respect `prefers-reduced-motion`.

---

## 12. Accessibility (required)

- Every control keyboard-reachable; visible focus ring; logical tab order.
- Drag-drop has a **keyboard alternative**: select a chip, press Enter to "pick up",
  arrow to a band, Enter to drop (or a "+ Add to band" affordance on each chip).
- Canvas elements are focusable, moved by arrows, described via `aria-label`
  (`"Invoice # field, report header, x 12 y 48"`).
- Color is never the only signal (invalid drop also shows an icon + text).
- Contrast ≥ 4.5:1 for text; ≥ 3:1 for UI borders/icons.
- Live regions announce async results ("Loaded 8 fields for Invoice", errors).
- Modal/dialog focus trap; Escape closes; return focus to opener.

---

## 13. Embedding API (the SDK seam the designer must satisfy)

The custom element is driven by the SDK (`@docsmith/sdk`). The designer must support:
```js
DocDesigner.mount(el, {
  adapter,                 // DataSourceAdapter (required)
  template,                // optional initial template JSON
  onSave(template) {},     // called when the user saves
  onChange(template) {},   // called (debounced) on every edit
  renderServiceUrl,        // for Export PDF
  theme,                   // optional token overrides
});
```
- The element reads its config from properties set by `mount` (not attributes, since
  config includes functions/objects).
- It emits DOM `CustomEvent`s too (`doc-save`, `doc-change`) for host frameworks that
  prefer events over callbacks.
- **Storage-agnostic:** the designer does NOT choose where templates live. It calls
  `onSave`. A standalone default may persist to `localStorage` (key
  `erpdoc.templates.*`) only when no `onSave` is supplied.

---

## 14. Component tree (build in this order)

```
DocDesigner.svelte            (custom element root; owns `template` $state + adapter)
├─ Toolbar.svelte             (name, mode toggle, undo/redo, Save, Export PDF)
├─ Palette.svelte             (Design mode; left rail)
│   ├─ SourceConfig.svelte    (entity dropdown, add/remove datasets)
│   ├─ FieldGroup.svelte      (collapsible group; System/Custom/dataset)
│   └─ FieldChip.svelte       (draggable pill; keyboard "add to band")
├─ Canvas.svelte              (Design mode; page + zoom/pan + ruler)
│   ├─ Band.svelte            (label tab, drop zone, resize)
│   │   ├─ FreeElement.svelte (move/resize/select; text|field|image|line|box)
│   │   └─ DetailTable.svelte (column chips, reorder, resize, sample rows)
├─ Properties.svelte          (Design mode; right rail; Selection + Page tabs)
│   ├─ ElementProps.svelte
│   ├─ ColumnProps.svelte
│   ├─ BandProps.svelte
│   └─ PrintSetup.svelte
├─ Preview.svelte             (Preview mode; doc-id control + iframe render)
└─ ui/                        (Button, Select, NumberInput, Field, Toast, Skeleton,
                               ErrorInline, Collapsible — shared primitives)
```
`DetailTable.svelte` (or its render logic) is shared conceptually with the core
renderer, but **the print/preview output always comes from `core.renderToHtml`** —
the canvas `DetailTable` is a design-time editor, not the source of truth for output.

---

## 15. Definition of Done (per component)

A component is "done" only when ALL hold:
1. Renders purely from props/model; no data fabricated; async states (loading/empty/
   error) all handled.
2. Keyboard-operable and screen-reader labeled per §12.
3. Light and dark themes correct; only tokens used for color.
4. No business math inside the component (delegated to `core`).
5. Reflects model changes live (two-way where specified) and pushes mutations through
   the undo/redo command path.
6. No new dependency introduced; no `TODO`/`FIXME` left without a `progress.md` entry.
7. A short story/example in the demo host exercises it against the `StaticAdapter`.

---

## 16. Explicit non-goals (do not build unless a phase promotes them)

- No template *scripting*/expression language in v1 (bindings are field refs +
  format only; computed expressions are Phase 3, and even then declarative).
- No collaborative multi-user editing.
- No in-designer database browser (that is the ERP's/adapter's job).
- No server round-trip for on-screen preview (client renders; server is for PDF).
- No arbitrary HTML paste into elements (security + portability).

---

## 17. Phase map (frontend)

- **P1 — MVP shell:** custom element + SDK mount; Source picker; **fixed bands**;
  header fields via a simple add-list (drag optional); detail column picker with
  reorder/resize; Print Setup; Preview iframe via `core.renderToHtml`; browser Print;
  Export PDF button. Proves end-to-end with real data + repeating headers.
- **P2 — Full WYSIWYG:** free-form drag/move/resize, Properties for all element
  kinds, page header/footer bands, image/logo (URL then upload), undo/redo, smart
  guides, template list/rename/delete, sample-row strip.
- **P3 — ERP-grade:** multiple datasets, per-column aggregates/`<tfoot>`, conditional
  formatting (declarative), barcode/QR element, i18n/locale currency, amount-in-words,
  carried-forward subtotals (server), saved themes.

Each phase ends green against §15 and the verification in `claude.md`.

---

## 18. Reference implementations to study (host repo `unidb-studio`)

Patterns to copy in spirit (not code): `src/lib/SchemaVisualizer.svelte`
(pointer-drag canvas + zoom transform + SVG overlay), `src/lib/StoragePanel.svelte`
(native `ondragover/ondrop`), `src/lib/SqlEditor.svelte` (localStorage saved-items),
`src/lib/format.js` (`formatCell`, `quoteIdent`), `src/app.css` (token approach).
These prove the house style is hand-rolled, dependency-free, and calm — match it.
