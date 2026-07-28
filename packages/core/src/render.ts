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
import { aggregate, formatValue, type FormatOptions } from './format.js';

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
// CSS understands the A4/Letter/A5/Legal keywords for @page `size`.
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
  if (s.lineHeight) out.push(`line-height:${s.lineHeight}`);
  if (s.padding != null) out.push(`padding:${s.padding}px`);
  return out.join(';');
}

// ── binding resolution ─────────────────────────────────────────────────────────
function resolveElementValue(
  el: FreeElement,
  data: DocumentData,
  fmtOpts: FormatOptions,
): string {
  if (!el.binding) return '';
  const { source, column, format } = el.binding;
  const record =
    source === 'header' ? data.header : (data.datasets[source]?.[0] ?? {});
  return formatValue(record?.[column], format, fmtOpts);
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
      return `<div class="el el-field" style="${style}">${esc(v)}</div>`;
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
  const els = band.elements.map((e) => renderFreeElement(e, data, fmtOpts, layoutUnit)).join('');
  const st = styleToCss(band.style);
  // Band height always stays px (design.md: it's the outer box for its own
  // elements, not content relative to something else — see core/types.ts's
  // Template.layoutUnit doc comment).
  return `<div class="band band-${band.type} ${extraClass}" data-band="${band.type}" style="position:relative;height:${band.height}px;${st}">${els}</div>`;
}

// ── detail band (the flowing, paginating line-item table) ───────────────────────
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
            .map(
              (c) =>
                `<td style="text-align:${alignVal(c.align)}">${esc(formatValue(r[c.column], c.format, fmtOpts))}</td>`,
            )
            .join('') +
          `</tr>`,
      )
      .join('') +
    `</tbody>`;

  let tfoot = '';
  if (band.aggregates?.length) {
    // Map each aggregate onto its column position; blank the rest.
    const cells = cols.map((c) => {
      const agg = band.aggregates!.find((a) => a.column === c.column);
      if (!agg) return `<td></td>`;
      const val = aggregate(rows, agg.column, agg.fn);
      return `<td style="text-align:${alignVal(c.align)};font-weight:700">${esc(formatValue(val, c.format ?? 'number', fmtOpts))}</td>`;
    });
    tfoot = `<tfoot><tr>${cells.join('')}</tr></tfoot>`;
  }

  // thead is display:table-header-group (default) → repeats on every printed page.
  return `<table class="detail" data-band="detail">${thead}${tfoot}${tbody}</table>`;
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
function baseCss(runningTop: number, runningBottom: number): string {
  return `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #111; }
.doc-flow { padding-top: ${runningTop}px; padding-bottom: ${runningBottom}px; }
.band { position: relative; }
.el { position: absolute; }
.el-field, .el-text { white-space: pre-wrap; }
.band-stack { display: flex; flex-direction: column; gap: 4px; }
.stack-row { display: flex; gap: 8px; align-items: flex-start; }
.el-stack { position: static; white-space: pre-wrap; }
table.detail { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.detail th, table.detail td { padding: 6px 8px; border-bottom: 1px solid #e2e5e9; vertical-align: top; word-wrap: break-word; }
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

  const css = `${pageCss(template.printSetup)}\n${baseCss(runningTop, runningBottom)}`;
  const html = `${runningHtml}\n<div class="page"><div class="doc-flow">${flowHtml}</div></div>`;

  const document = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;

  return { html, css, document };
}
