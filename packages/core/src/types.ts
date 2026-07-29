// @docsmith/core — shared types. The single source of truth for the template shape,
// the adapter contract, and the render inputs. The designer, the SDK, the adapters,
// and the render service ALL import from here. Do not redefine these elsewhere.

// ─── Data source (adapter) contract ──────────────────────────────────────────

export type EntityMeta = { name: string; label: string };
export type DatasetMeta = { id: string; label: string };

/** A bindable field. `kind` is the ERP's truth (system vs user-defined column). */
export type FieldMeta = {
  name: string;
  label: string;
  type: string; // 'text' | 'number' | 'currency' | 'date' | 'int' | 'float' | ...
  kind: 'system' | 'custom';
  group?: string;
};

/** One document's resolved data: a header record + named line-item datasets. */
export type DocumentData = {
  header: Record<string, unknown>;
  datasets: Record<string, Array<Record<string, unknown>>>;
  meta?: Record<string, unknown>;
};

/**
 * The ONLY seam between an ERP and this product. An ERP implements this once;
 * the designer (authoring) and the renderer (runtime) pull everything through it.
 */
export interface DataSourceAdapter {
  listEntities(): Promise<EntityMeta[]>;
  getFields(entity: string): Promise<FieldMeta[]>;
  getRelatedDatasets(entity: string): Promise<DatasetMeta[]>;
  getDatasetFields(entity: string, datasetId: string): Promise<FieldMeta[]>;
  fetchDocument(entity: string, id: string): Promise<DocumentData>;
  listSampleIds?(entity: string): Promise<Array<{ id: string; label: string }>>;
}

// ─── Template model ──────────────────────────────────────────────────────────

export type PageSize = 'A4' | 'Letter' | 'A5' | 'Legal';
export type Orientation = 'portrait' | 'landscape';
/** 'words' spells a numeric value out in English (e.g. "One Thousand Two
 * Hundred Thirty-Four and 56/100") — for the `totals` band's classic
 * "amount in words" line (design.md §2's band table). English-only by
 * design: a real multi-locale number-to-words system is a large, genuinely
 * different feature (grammar rules vary far more than Intl's locale-aware
 * number/date formatting does) — see format.ts's `numberToWords` doc comment. */
export type ValueFormat = 'text' | 'number' | 'currency' | 'date' | 'words';
export type Align = 'left' | 'center' | 'right';

export type PrintSetup = {
  pageSize: PageSize;
  orientation: Orientation;
  margins: { top: number; right: number; bottom: number; left: number }; // mm
  unit: 'mm';
  repeatPageHeader?: boolean;
  repeatPageFooter?: boolean;
  showPageNumbers?: boolean;
  /** e.g. "Page {page} of {pages}" — resolved by the render service. */
  pageNumberFormat?: string;
  /** ISO 4217 code + locale for currency formatting, e.g. { currency:'USD', locale:'en-US' }. */
  currency?: string;
  locale?: string;
};

export type DatasetRef =
  | { table: string; fkColumn: string }
  | { sql: string };

export type TemplateDataset = {
  id: string;
  label: string;
  kind: 'fk' | 'sql';
  ref: DatasetRef;
  orderBy?: string;
};

export type DataSource = {
  entity: string;
  key: string; // the header primary-key column, bound to $1 at fetch time
  datasets: TemplateDataset[];
};

export type ElementStyle = {
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
  color?: string;
  bg?: string;
  border?: string; // css shorthand, e.g. "1px solid #ccc"
  /** px, or any valid CSS <length> string (e.g. "999px" for a full pill). */
  borderRadius?: number | string;
  lineHeight?: number;
  padding?: number;
};

export type Binding = {
  source: 'header' | string; // 'header' or a datasetId
  column: string;
  format?: ValueFormat;
};

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'empty'
  | 'notEmpty';

/**
 * One declarative conditional-formatting rule (memory.md D-031): tests a
 * bound field/column's OWN raw value (never another field, never an
 * expression) against `value`, applying `style` on match. Deliberately not
 * a scripting/expression language — claude.md's prime directives already
 * settled that ("computed expressions are Phase 3, and even then
 * declarative"); this is the declarative form. Multiple rules on the same
 * element/column all evaluate independently and merge in array order
 * (later matches override earlier ones for overlapping style properties —
 * simple last-write-wins, like a CSS cascade), so authors can layer rules
 * rather than being limited to "first match wins."
 */
export type ConditionalRule = {
  operator: ConditionOperator;
  /** Unused for 'empty'/'notEmpty'. Compared as a number for gt/gte/lt/lte,
   * as a case-insensitive substring for 'contains', as a string otherwise. */
  value?: string | number;
  style: ElementStyle;
};

export type ElementKind = 'text' | 'field' | 'image' | 'line' | 'box';

/** A free-form, absolutely-positioned element (px, relative to its band). */
export type FreeElement = {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Row index within its band's stacked flow (memory.md D-029). Only read
   * when the containing FreeBand's `arrangement === 'stack'`; ignored
   * (x/y/w/h in their normal free-form meaning) in the default 'free'
   * arrangement. Elements sharing a row number render side by side, in
   * array order; row numbers need not be contiguous or start at 0 — rows
   * are ordered by each row number's first occurrence in `elements`, top to
   * bottom. Absent `row` behaves as if every such element had its own
   * unique row (a single-column line), so authoring never *requires*
   * setting it. */
  row?: number;
  /** Column index into the containing band's `gridColumns` (memory.md
   * D-034). Only read when the band's `arrangement === 'grid'`; ignored
   * otherwise. Combined with `row`, places this element into one grid cell.
   * Absent behaves as column 0. */
  col?: number;
  /** How many grid columns this element's cell spans, starting at `col`.
   * Only read when `arrangement === 'grid'`. Absent/1 means no span — this
   * is what lets one row mix a wide cell (e.g. "Seller", spanning the whole
   * row) with narrower cells in the next row (e.g. "Invoice #" / "Date"
   * side by side), matching a real bordered form layout. */
  colSpan?: number;
  style?: ElementStyle;
  text?: string; // kind:'text'
  label?: string; // kind:'field' — shown as {label} token in the designer
  binding?: Binding; // kind:'field'
  src?: { kind: 'url' | 'assetId'; value: string }; // kind:'image'
  /** kind:'field' only (memory.md D-031) — tests this element's own bound
   * value, applies `style` on match, merged over `style` above. */
  conditionalFormat?: ConditionalRule[];
};

export type DetailColumn = {
  column: string;
  header: string;
  width: number; // px
  align?: Align;
  format?: ValueFormat;
  /** Tests this column's own value per row (memory.md D-031). */
  conditionalFormat?: ConditionalRule[];
};

export type Aggregate = {
  column: string;
  fn: 'sum' | 'count' | 'avg';
  /** 'tfoot' (existing): one grand total after the last row, rendered by
   * `core.renderToHtml` itself. 'carryForward' (memory.md D-033): a running
   * per-page subtotal ("Carried forward" / "Brought forward" rows at each
   * page break) — NOT computed by `core.renderToHtml`, which has no concept
   * of page breaks (they don't exist until the browser/Puppeteer actually
   * lays the page out). `@docsmith/render-service` reads `into:
   * 'carryForward'` entries and injects those rows as a post-layout pass
   * during PDF generation only; the on-screen preview and a raw
   * `renderToHtml()` call render the table with no carry-forward rows at
   * all (an honest, documented gap — see design.md §9's "client-side
   * honest limitations"), not a silent no-op. */
  into: 'tfoot' | 'carryForward';
  label?: string;
};

export type BandType =
  | 'reportHeader'
  | 'pageHeader'
  | 'detail'
  | 'totals'
  | 'pageFooter';

export type FreeBand = {
  id: string;
  type: Exclude<BandType, 'detail'>;
  height: number; // px — ignored (band height is intrinsic/auto) when arrangement === 'stack'
  elements: FreeElement[];
  style?: ElementStyle;
  enabled?: boolean; // optional bands (pageHeader/pageFooter) can be off
  /** Per-band arrangement (memory.md D-029, D-034): 'free' (default, absent
   * means 'free' — fully backward-compatible) is today's absolute x/y
   * positioning. 'stack' auto-flows `elements` top-to-bottom in array order
   * (grouped into rows via each element's `row`), MailerLite-editor style —
   * no x/y, width is always a percentage of the row. 'grid' is an explicit
   * row/column table: elements are placed via `row`/`col`/`colSpan` into
   * `gridColumns`-defined columns, optionally bordered via `gridBorder` —
   * for bordered form layouts (a "Seller" cell next to an "Invoice #" cell)
   * that would otherwise need pixel-perfect manual border-matching in
   * 'free'. */
  arrangement?: 'free' | 'stack' | 'grid';
  /** Only read when `arrangement === 'grid'`: column widths as percentages
   * of the band's content width (e.g. `[60, 20, 20]`, summing to ~100).
   * Absent defaults to a single 100%-wide column. */
  gridColumns?: number[];
  /** Only read when `arrangement === 'grid'`: a CSS `border` shorthand
   * (e.g. `"1px solid #1a1c22"`) applied to every cell via the grid's
   * underlying `<table>` + `border-collapse` — one band-level setting
   * instead of matching border style/position by hand per element (the
   * point of the grid arrangement). Absent/empty means no cell borders
   * (the "Sections" / column-layout look, memory.md D-034). */
  gridBorder?: string;
};

export type DetailBand = {
  id: string;
  type: 'detail';
  datasetId: string;
  columns: DetailColumn[];
  keepRowTogether?: boolean;
  aggregates?: Aggregate[];
  style?: ElementStyle;
  /** CSS `border-bottom` shorthand for each row's cells (e.g. `"none"` for a
   * borderless table, or a custom color/weight) — absent keeps today's
   * default (`"1px solid #e2e5e9"`). Scoped to body-row cells only; the
   * header's divider and the alternating-row look some templates want stay
   * governed separately (header border is intentionally always kept — a
   * borderless body still needs a visible column-header edge). */
  cellBorder?: string;
};

export type Band = FreeBand | DetailBand;

export type Template = {
  version: 1;
  id: string;
  name: string;
  docType: string;
  printSetup: PrintSetup;
  dataSource: DataSource;
  bands: Band[];
  /** Global unit for every free-form element's x/y/w/h (never per-element —
   * see designer memory.md D-028). Absent means 'px' (the original, only
   * behavior before this field existed — existing templates keep working
   * unchanged). '%' means x/w are relative to the band's content width (the
   * FULL page width — bands are direct children of `.page`, spanning
   * edge-to-edge; `printSetup.margins` is a print-only `@page` concept, never
   * a CSS inset on the HTML box model) and y/h are relative to the band's own
   * height — CSS resolves this natively since every band is already
   * `position:relative` with an explicit height. Band heights themselves
   * (FreeBand.height) always stay px regardless — they're the outer box,
   * not content inside one. */
  layoutUnit?: 'px' | '%';
};

// ─── Render inputs/outputs ───────────────────────────────────────────────────

export type RenderResult = {
  html: string; // the <body> inner content
  css: string; // all styles incl. injected @page
  /** A full standalone HTML document (html+css inlined) — what Puppeteer loads. */
  document: string;
};

export const isDetailBand = (b: Band): b is DetailBand => b.type === 'detail';
