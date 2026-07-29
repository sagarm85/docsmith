// @docsmith/core — THE renderer. Turns (template + document data) into printable
// HTML/CSS. This is the ONE render path: the browser preview and the Puppeteer PDF
// service both use it, guaranteeing design↔output parity.
//
// The page-break / repeating-column-header behaviour is delivered by native
// browser primitives, NOT by JS pagination:
//   • the detail band is a real <table><thead> → browsers repeat the header row on
//     every printed page automatically;
//   • @page (injected from printSetup) sets page size / orientation / margins;
//   • break-inside: avoid keeps line rows and the totals block from splitting;
//   • pageHeader / pageFooter are position:fixed → painted on every printed sheet.

import type {
  Align,
  Band,
  Binding,
  DetailBand,
  DocumentData,
  ElementStyle,
  FreeBand,
  FreeElement,
  PrintSetup,
  RenderResult,
  Template,
} from './types.js';
import { isDetailBand } from './types.js';
import { aggregate, formatValue, resolveConditionalStyle, type FormatOptions } from './format.js';

// ── html safety ──────────────────────────────────────────────────────────────
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── page geometry ──────────────────────────────────────────────────────────────
// CSS understands the A4/Letter/A5/Legal keywords for @page `size`, so the
// print output itself never needs manual mm->px math. `fillPage` (D-040) is
// the one exception: `.doc-flow`'s `min-height` needs a real px number, so
// this constant/table are duplicated here rather than shared — the same
// small, stable-value duplication already accepted for
// packages/designer/src/geometry.ts (design-canvas-only) and
// packages/render-service/src/pagination.ts (D-033).
const MM_TO_PX = 96 / 25.4;
const PAGE_SIZES_MM: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5: { width: 148, height: 210 },
  Legal: { width: 215.9, height: 355.6 },
};

/** The printable content height in px (page height minus top/bottom
 * margins, orientation-aware) — only used for `fillPage`'s `min-height`. */
function printableContentHeightPx(p: PrintSetup): number {
  const size = PAGE_SIZES_MM[p.pageSize] ?? PAGE_SIZES_MM.A4!;
  const ph = p.orientation === 'landscape' ? Math.min(size.width, size.height) : Math.max(size.width, size.height);
  return (ph - p.margins.top - p.margins.bottom) * MM_TO_PX;
}

function pageCss(p: PrintSetup): string {
  const { top, right, bottom, left } = p.margins;
  const size = `${p.pageSize} ${p.orientation}`;
  return `@page { size: ${size}; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }`;
}

function alignVal(a: Align | undefined): string {
  return a ?? 'left';
}

function styleToCss(s: ElementStyle | undefined): string {
  if (!s) return '';
  const out: string[] = [];
  if (s.fontSize) out.push(`font-size:${s.fontSize}px`);
  if (s.bold) out.push('font-weight:700');
  if (s.italic) out.push('font-style:italic');
  if (s.align) out.push(`text-align:${s.align}`);
  if (s.color) out.push(`color:${s.color}`);
  if (s.bg) out.push(`background:${s.bg}`);
  if (s.border) out.push(`border:${s.border}`);
  if (s.borderRadius != null) out.push(`border-radius:${typeof s.borderRadius === 'number' ? `${s.borderRadius}px` : s.borderRadius}`);
  if (s.lineHeight) out.push(`line-height:${s.lineHeight}`);
  if (s.padding != null) out.push(`padding:${s.padding}px`);
  return out.join(';');
}

// ── binding resolution ─────────────────────────────────────────────────────────
function resolveBindingRaw(binding: Binding, data: DocumentData): unknown {
  const record =
    binding.source === 'header' ? data.header : (data.datasets[binding.source]?.[0] ?? {});
  return record?.[binding.column];
}

function resolveElementValue(
  el: FreeElement,
  data: DocumentData,
  fmtOpts: FormatOptions,
): string {
  if (!el.binding) return '';
  return formatValue(resolveBindingRaw(el.binding, data), el.binding.format, fmtOpts);
}

// ── free-form elements ──────────────────────────────────────────────────────────
function renderFreeElement(
  el: FreeElement,
  data: DocumentData,
  fmtOpts: FormatOptions,
  layoutUnit: 'px' | '%',
): string {
  const pos = `position:absolute;left:${el.x}${layoutUnit};top:${el.y}${layoutUnit};width:${el.w}${layoutUnit};height:${el.h}${layoutUnit};overflow:hidden`;
  const st = styleToCss(el.style);
  const style = `${pos};${st}`;

  switch (el.kind) {
    case 'text':
      return `<div class="el el-text" style="${style}">${esc(el.text ?? '')}</div>`;
    case 'field': {
      const v = resolveElementValue(el, data, fmtOpts);
      // Conditional formatting (memory.md D-031) tests the field's own raw
      // value and merges any matching rule's style over the element's base
      // style — a separate style resolution from `style` above, since it
      // only ever applies to 'field' elements.
      const raw = el.binding ? resolveBindingRaw(el.binding, data) : undefined;
      const fieldStyle = styleToCss(resolveConditionalStyle(el.style, el.conditionalFormat, raw));
      return `<div class="el el-field" style="${pos};${fieldStyle}">${esc(v)}</div>`;
    }
    case 'image': {
      const src = el.src?.value ?? '';
      if (!src) return `<div class="el el-image el-image-empty" style="${style}"></div>`;
      return `<div class="el el-image" style="${style}"><img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:contain"/></div>`;
    }
    case 'line':
      return `<div class="el el-line" style="${pos};border-top:${el.style?.border ?? '1px solid #333'}"></div>`;
    case 'box':
      return `<div class="el el-box" style="${style}"></div>`;
    default:
      return '';
  }
}

// ── stacked/auto-flow elements (memory.md D-029) ─────────────────────────────
// A "stack" band renders its elements top-to-bottom in array order (grouped
// into side-by-side rows via each element's `row`) instead of absolute
// x/y positioning — no unit choice needed, width is always a row percentage.
function renderStackElement(el: FreeElement, data: DocumentData, fmtOpts: FormatOptions): string {
  const st = styleToCss(el.style);
  const flexBasis = `flex:0 0 ${el.w}%;max-width:${el.w}%`;

  switch (el.kind) {
    case 'text':
      return `<div class="el el-text el-stack" style="${flexBasis};${st}">${esc(el.text ?? '')}</div>`;
    case 'field': {
      const v = resolveElementValue(el, data, fmtOpts);
      return `<div class="el el-field el-stack" style="${flexBasis};${st}">${esc(v)}</div>`;
    }
    case 'image': {
      const src = el.src?.value ?? '';
      const style = `${flexBasis};height:${el.h}px;${st}`;
      if (!src) return `<div class="el el-image el-image-empty el-stack" style="${style}"></div>`;
      return `<div class="el el-image el-stack" style="${style}"><img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:contain"/></div>`;
    }
    case 'line':
      return `<div class="el el-line el-stack" style="${flexBasis};border-top:${el.style?.border ?? '1px solid #333'}"></div>`;
    case 'box':
      return `<div class="el el-box el-stack" style="${flexBasis};height:${el.h}px;${st}"></div>`;
    default:
      return '';
  }
}

// Groups elements into rows: elements sharing a `row` number render side by
// side (in array order); an element with no `row` is its own single-element
// row. Rows are ordered by each row key's first occurrence — never re-sorted
// by the row *number* itself, so authoring never has to pick contiguous or
// ordered row numbers. Exported for schema.ts's free<->stack arrangement
// migration, which needs the identical grouping the renderer uses.
export function groupIntoRows(elements: FreeElement[]): FreeElement[][] {
  const rows: FreeElement[][] = [];
  const rowIndexByKey = new Map<string, number>();
  let syntheticCounter = 0;
  for (const el of elements) {
    const key = el.row !== undefined ? `r:${el.row}` : `solo:${syntheticCounter++}`;
    let idx = rowIndexByKey.get(key);
    if (idx === undefined) {
      idx = rows.length;
      rowIndexByKey.set(key, idx);
      rows.push([]);
    }
    rows[idx]!.push(el);
  }
  return rows;
}

function renderStackBand(
  band: FreeBand,
  data: DocumentData,
  fmtOpts: FormatOptions,
  extraClass = '',
): string {
  if (band.enabled === false) return '';
  const rowsHtml = groupIntoRows(band.elements)
    .map((row) => `<div class="stack-row">${row.map((el) => renderStackElement(el, data, fmtOpts)).join('')}</div>`)
    .join('');
  const st = styleToCss(band.style);
  // No explicit height — intrinsic/auto, driven by content (the entire point
  // of stacking). Never used for pageHeader/pageFooter (see renderBand and
  // the running-band call site below), which need a *known* height to
  // reserve `.doc-flow` padding for their `position:fixed` placement.
  return `<div class="band band-${band.type} band-stack ${extraClass}" data-band="${band.type}" style="${st}">${rowsHtml}</div>`;
}

// ── grid elements/bands (memory.md D-034) ────────────────────────────────────
// A "grid" band renders as a real HTML <table> — not CSS grid — so
// `border-collapse` gives perfectly shared single-pixel cell borders and
// native `colspan` handles a cell spanning multiple columns, both for free,
// without hand-matching border/position per element (the point of this
// arrangement: bordered form layouts like "Seller" spanning a full row while
// "Invoice #"/"Date" split the next row into two narrower cells).
function renderGridCellContent(el: FreeElement, data: DocumentData, fmtOpts: FormatOptions): string {
  switch (el.kind) {
    case 'text':
      return esc(el.text ?? '');
    case 'field':
      return esc(resolveElementValue(el, data, fmtOpts));
    case 'image': {
      const src = el.src?.value ?? '';
      if (!src) return '';
      return `<img src="${esc(src)}" alt="" style="max-width:100%;display:block"/>`;
    }
    case 'line':
      return `<div style="border-top:${el.style?.border ?? '1px solid #333'}"></div>`;
    case 'box':
      return '';
    default:
      return '';
  }
}

// A grid cell can hold more than one stacked element (memory.md D-045, "add
// multiple fields to one section column") — grouped by (row, col), not just
// row. `null` is a genuinely absent cell (no backing element; a neighboring
// colSpan didn't reach this column), rendered as an empty `<td>` so the real
// <colgroup> width still lands in the right table column — a gap the
// row-only `groupIntoRows` used by stack bands can't express, and which the
// OLD one-element-per-<td> version of this function silently skipped
// entirely (a latent misalignment bug whenever a row didn't fill every
// column, fixed alongside D-045).
type GridRowCell = { span: number; elements: FreeElement[] } | null;

// Builds one row's cells against that row's OWN column count — each
// "section" (memory.md D-048) can have a different one, so this is called
// once per row, not once for the whole band.
function buildGridRowCells(rowElements: readonly FreeElement[], numCols: number): GridRowCell[] {
  const byCol = new Map<number, FreeElement[]>();
  for (const el of rowElements) {
    const c = el.col ?? 0;
    const group = byCol.get(c);
    if (group) group.push(el);
    else byCol.set(c, [el]);
  }
  const row: GridRowCell[] = [];
  let c = 0;
  while (c < numCols) {
    const group = byCol.get(c);
    if (group && group.length > 0) {
      const span = Math.max(1, Math.min(group[0]!.colSpan ?? 1, numCols - c));
      row.push({ span, elements: group });
      c += span;
    } else {
      row.push(null);
      c += 1;
    }
  }
  return row;
}

/** A row missing from `sectionColumns` falls back to the band's own
 * `gridColumns` (or a single 100% column) — see FreeBand.sectionColumns'
 * doc comment for why independent per-row columns need independent
 * `<table>`s rather than one shared `<colgroup>`. */
function resolveSectionColumns(band: FreeBand, row: number): number[] {
  const cols = band.sectionColumns?.[row];
  if (cols?.length) return cols;
  return band.gridColumns?.length ? band.gridColumns : [100];
}

function sameColumns(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((w, i) => w === b[i]);
}

function renderGridBand(band: FreeBand, data: DocumentData, fmtOpts: FormatOptions, extraClass = ''): string {
  if (band.enabled === false) return '';
  const cellBorder = band.gridBorder ? `border:${band.gridBorder}` : 'border:none';

  const rowIndexes = [...new Set(band.elements.map((e) => e.row ?? 0))].sort((a, b) => a - b);

  // Consecutive rows sharing the same resolved columns render as ONE
  // `<table>` (native `border-collapse` gives perfectly shared borders
  // between them, same as before D-048) — a new table only starts where a
  // section's columns genuinely differ from the row above it, since a
  // native `<colgroup>` can't express two different column grids in one
  // table.
  const runs: Array<{ cols: number[]; rows: number[] }> = [];
  for (const rowIdx of rowIndexes) {
    const cols = resolveSectionColumns(band, rowIdx);
    const last = runs[runs.length - 1];
    if (last && sameColumns(last.cols, cols)) last.rows.push(rowIdx);
    else runs.push({ cols, rows: [rowIdx] });
  }

  const tablesHtml = runs
    .map((run) => {
      const colgroup = run.cols.map((w) => `<col style="width:${w}%"/>`).join('');
      const trsHtml = run.rows
        .map((rowIdx) => {
          const rowElements = band.elements.filter((e) => (e.row ?? 0) === rowIdx);
          const cellsHtml = buildGridRowCells(rowElements, run.cols.length)
            .map((cell) => {
              if (!cell) return `<td style="${cellBorder}"></td>`;
              const span = cell.span > 1 ? ` colspan="${cell.span}"` : '';
              // Each stacked element gets its own style wrapper — a cell
              // holding multiple elements can't apply one shared style to
              // a single <td> the way the single-element case used to.
              const contentHtml = cell.elements
                .map((el) => {
                  const raw = el.kind === 'field' && el.binding ? resolveBindingRaw(el.binding, data) : undefined;
                  const elStyle = styleToCss(resolveConditionalStyle(el.style, el.conditionalFormat, raw));
                  return `<div style="${elStyle}">${renderGridCellContent(el, data, fmtOpts)}</div>`;
                })
                .join('');
              return `<td${span} style="${cellBorder}">${contentHtml}</td>`;
            })
            .join('');
          return `<tr>${cellsHtml}</tr>`;
        })
        .join('');
      return `<table class="grid-table"><colgroup>${colgroup}</colgroup><tbody>${trsHtml}</tbody></table>`;
    })
    .join('');
  const st = styleToCss(band.style);
  return `<div class="band band-${band.type} band-grid ${extraClass}" data-band="${band.type}" style="${st}">${tablesHtml}</div>`;
}

function renderFreeBand(
  band: FreeBand,
  data: DocumentData,
  fmtOpts: FormatOptions,
  layoutUnit: 'px' | '%',
  extraClass = '',
): string {
  if (band.enabled === false) return '';
  if (band.arrangement === 'stack' && band.type !== 'pageHeader' && band.type !== 'pageFooter') {
    return renderStackBand(band, data, fmtOpts, extraClass);
  }
  if (band.arrangement === 'grid' && band.type !== 'pageHeader' && band.type !== 'pageFooter') {
    return renderGridBand(band, data, fmtOpts, extraClass);
  }
  const els = band.elements.map((e) => renderFreeElement(e, data, fmtOpts, layoutUnit)).join('');
  const st = styleToCss(band.style);
  // Band height always stays px (design.md: it's the outer box for its own
  // elements, not content relative to something else — see core/types.ts's
  // Template.layoutUnit doc comment).
  return `<div class="band band-${band.type} ${extraClass}" data-band="${band.type}" style="position:relative;height:${band.height}px;${st}">${els}</div>`;
}

// ── detail band (the flowing, paginating line-item table) ───────────────────────
const IMAGE_CELL_MAX_HEIGHT = 60; // px — keeps a product-image column from blowing out row height

function renderDetailBand(
  band: DetailBand,
  data: DocumentData,
  fmtOpts: FormatOptions,
): string {
  const rows = data.datasets[band.datasetId] ?? [];
  const cols = band.columns;

  const thead =
    `<thead><tr>` +
    cols
      .map(
        (c) =>
          `<th style="width:${c.width}px;text-align:${alignVal(c.align)}">${esc(c.header)}</th>`,
      )
      .join('') +
    `</tr></thead>`;

  const rowStyle = band.keepRowTogether ? ' style="break-inside:avoid"' : '';
  const tbody =
    `<tbody>` +
    rows
      .map(
        (r) =>
          `<tr${rowStyle}>` +
          cols
            .map((c) => {
              const raw = r[c.column];
              // Conditional formatting (memory.md D-031) tests each row's
              // own value in this column and merges onto a base style of
              // just the alignment (detail cells have no other per-cell
              // style today) — same resolveConditionalStyle used for field
              // elements, so the two share behavior/tests.
              const cellStyle = resolveConditionalStyle(
                { align: alignVal(c.align) as Align },
                c.conditionalFormat,
                raw,
              );
              // memory.md D-039: an 'image' column is a real per-row bound
              // image (the adapter returns a URL string per row, same shape
              // as any other field) — never text-escaped/formatValue'd, an
              // <img> instead. Empty/missing value is an honest empty cell,
              // not a broken image icon.
              if (c.format === 'image') {
                const src = raw == null || raw === '' ? '' : String(raw);
                const img = src
                  ? `<img src="${esc(src)}" alt="" style="max-width:100%;max-height:${IMAGE_CELL_MAX_HEIGHT}px;object-fit:contain;display:block"/>`
                  : '';
                return `<td style="${styleToCss(cellStyle)}">${img}</td>`;
              }
              return `<td style="${styleToCss(cellStyle)}">${esc(formatValue(raw, c.format, fmtOpts))}</td>`;
            })
            .join('') +
          `</tr>`,
      )
      .join('') +
    `</tbody>`;

  let tfoot = '';
  // Only 'tfoot' aggregates render here — 'carryForward' ones (memory.md
  // D-033) have no meaning without page-break positions, which don't exist
  // until Puppeteer lays the page out; @docsmith/render-service injects
  // those as a post-layout pass, never core.
  const tfootAggregates = band.aggregates?.filter((a) => a.into === 'tfoot');
  if (tfootAggregates?.length) {
    // Map each aggregate onto its column position; blank the rest.
    const cells = cols.map((c) => {
      const agg = tfootAggregates.find((a) => a.column === c.column);
      if (!agg) return `<td></td>`;
      const val = aggregate(rows, agg.column, agg.fn);
      return `<td style="text-align:${alignVal(c.align)};font-weight:700">${esc(formatValue(val, c.format ?? 'number', fmtOpts))}</td>`;
    });
    tfoot = `<tfoot><tr>${cells.join('')}</tr></tfoot>`;
  }

  // thead is display:table-header-group (default) → repeats on every printed page.
  // cellBorder overrides the default row-cell border via a CSS custom
  // property (baseCss's `var(--dd-cell-border, 1px solid #e2e5e9)`) —
  // absent leaves today's default untouched; the header's own border stays
  // fixed regardless (table.detail thead th's separate, more specific rule).
  const tableStyle = band.cellBorder != null ? ` style="--dd-cell-border:${band.cellBorder}"` : '';
  return `<table class="detail" data-band="detail"${tableStyle}>${thead}${tfoot}${tbody}</table>`;
}

function renderBand(
  band: Band,
  data: DocumentData,
  fmtOpts: FormatOptions,
  layoutUnit: 'px' | '%',
): string {
  if (isDetailBand(band)) return renderDetailBand(band, data, fmtOpts);
  // pageHeader/pageFooter are handled separately (fixed); here we render the
  // in-flow bands: reportHeader and totals.
  return renderFreeBand(band as FreeBand, data, fmtOpts, layoutUnit);
}

// ── base stylesheet ──────────────────────────────────────────────────────────────
// `fillPageMinHeight` (memory.md D-040) is undefined unless
// `printSetup.fillPage` is set — when present, `.doc-flow` becomes a flex
// column stretched to at least one page's content height, and its LAST
// child (whichever in-flow band renders last — normally `totals`) gets
// `margin-top:auto`, pushing it to the bottom of the page. `:last-child` is
// a pure CSS selector, so this needs no JS knowledge of which band is
// actually last (some templates omit `totals`, e.g.).
function baseCss(runningTop: number, runningBottom: number, fillPageMinHeight?: number): string {
  const fillPageCss =
    fillPageMinHeight != null
      ? `.doc-flow { display: flex; flex-direction: column; min-height: ${fillPageMinHeight}px; }
.doc-flow > *:last-child { margin-top: auto; }`
      : '';
  return `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #111; }
.doc-flow { padding-top: ${runningTop}px; padding-bottom: ${runningBottom}px; }
${fillPageCss}
.band { position: relative; }
.el { position: absolute; }
.el-field, .el-text { white-space: pre-wrap; }
.band-stack { display: flex; flex-direction: column; gap: 4px; }
.stack-row { display: flex; gap: 8px; align-items: flex-start; }
.el-stack { position: static; white-space: pre-wrap; }
.band-grid { position: static; }
table.grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.grid-table td { padding: 8px 10px; vertical-align: top; word-wrap: break-word; }
/* Only matters when adjacent sections have genuinely different column
   layouts (memory.md D-048) — border-collapse already gives a seamless
   shared border for a run of sections sharing the same columns, since
   those render as one <table> with multiple <tr>s. */
table.grid-table + table.grid-table { margin-top: 2px; }
table.detail { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.detail th, table.detail td { padding: 6px 8px; border-bottom: var(--dd-cell-border, 1px solid #e2e5e9); vertical-align: top; word-wrap: break-word; }
table.detail thead th { border-bottom: 1.5px solid #333; font-weight: 700; background: #f6f7f9; }
/* thead repeats on each printed page; keep the default group display. */
table.detail thead { display: table-header-group; }
table.detail tfoot { display: table-footer-group; }
table.detail tr { break-inside: avoid; }
.band-totals { break-inside: avoid; }
.running { position: fixed; left: 0; right: 0; }
.running-top { top: 0; }
.running-bottom { bottom: 0; }
@media screen {
  body { background: #eceef1; }
  .page { background: #fff; margin: 12px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); }
}
`.trim();
}

/**
 * Render a template + a document's data into printable HTML/CSS.
 * `document` is a full standalone HTML string — exactly what Puppeteer loads and
 * what the preview iframe writes via srcdoc.
 */
export function renderToHtml(template: Template, data: DocumentData): RenderResult {
  const fmtOpts: FormatOptions = {
    locale: template.printSetup.locale,
    currency: template.printSetup.currency,
  };
  const layoutUnit = template.layoutUnit ?? 'px';

  const bands = template.bands;
  const pageHeader = bands.find(
    (b) => b.type === 'pageHeader' && (b as FreeBand).enabled !== false,
  ) as FreeBand | undefined;
  const pageFooter = bands.find(
    (b) => b.type === 'pageFooter' && (b as FreeBand).enabled !== false,
  ) as FreeBand | undefined;

  const runningTop = pageHeader ? pageHeader.height : 0;
  const runningBottom = pageFooter ? pageFooter.height : 0;

  // In-flow bands in print order: reportHeader, detail, totals (page h/f are fixed).
  const flowOrder: Band['type'][] = ['reportHeader', 'detail', 'totals'];
  const flowHtml = flowOrder
    .flatMap((type) => bands.filter((b) => b.type === type))
    .map((b) => renderBand(b, data, fmtOpts, layoutUnit))
    .join('\n');

  const runningHtml =
    (pageHeader ? renderFreeBand(pageHeader, data, fmtOpts, layoutUnit, 'running running-top') : '') +
    (pageFooter ? renderFreeBand(pageFooter, data, fmtOpts, layoutUnit, 'running running-bottom') : '');

  const fillPageMinHeight = template.printSetup.fillPage
    ? printableContentHeightPx(template.printSetup)
    : undefined;
  const css = `${pageCss(template.printSetup)}\n${baseCss(runningTop, runningBottom, fillPageMinHeight)}`;
  const html = `${runningHtml}\n<div class="page"><div class="doc-flow">${flowHtml}</div></div>`;

  const document = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;

  return { html, css, document };
}
