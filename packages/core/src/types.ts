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
export type ValueFormat = 'text' | 'number' | 'currency' | 'date';
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
  lineHeight?: number;
  padding?: number;
};

export type Binding = {
  source: 'header' | string; // 'header' or a datasetId
  column: string;
  format?: ValueFormat;
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
  style?: ElementStyle;
  text?: string; // kind:'text'
  label?: string; // kind:'field' — shown as {label} token in the designer
  binding?: Binding; // kind:'field'
  src?: { kind: 'url' | 'assetId'; value: string }; // kind:'image'
};

export type DetailColumn = {
  column: string;
  header: string;
  width: number; // px
  align?: Align;
  format?: ValueFormat;
};

export type Aggregate = {
  column: string;
  fn: 'sum' | 'count' | 'avg';
  into: 'tfoot';
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
  height: number; // px
  elements: FreeElement[];
  style?: ElementStyle;
  enabled?: boolean; // optional bands (pageHeader/pageFooter) can be off
};

export type DetailBand = {
  id: string;
  type: 'detail';
  datasetId: string;
  columns: DetailColumn[];
  keepRowTogether?: boolean;
  aggregates?: Aggregate[];
  style?: ElementStyle;
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
