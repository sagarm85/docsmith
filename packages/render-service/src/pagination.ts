// Carried-forward subtotals (designer/memory.md D-033): core.renderToHtml has no
// concept of page breaks — they don't exist until a browser/print engine actually
// lays the page out — so this is a render-service-only, PDF-only post-layout pass,
// not a second renderer (it mutates the SAME DOM core produced, the same way
// Puppeteer's own header/footer templates are already a post-processing layer).
//
// Approach: measure the real rendered row/band heights at the actual print
// content width, simulate where Chromium's print pagination will break pages
// against the page's printable height budget, then inject "Carried forward" /
// "Brought forward" <tr> rows into the live DOM before page.pdf() runs. This is a
// best-effort, single-pass approximation — inserting a row can itself nudge a
// later page boundary by a small amount — not a guarantee of pixel-perfect
// alignment with Chromium's internal fragmentation. Accepted as a practical
// tradeoff (memory.md D-033), same as most real-world reporting tools.
//
// The page.evaluate() callback bodies below run in the browser (not Node), so
// tsconfig.json adds "DOM" to `lib` for this package only, purely for
// typechecking those callback bodies — it doesn't add any DOM globals at
// runtime to the actual Node process.

import type { Page } from 'puppeteer';
import {
  aggregate,
  formatValue,
  isDetailBand,
  type Align,
  type DetailBand,
  type DetailColumn,
  type DocumentData,
  type FormatOptions,
  type FreeBand,
  type Template,
} from '@docsmith/core';

// Duplicated from packages/designer/src/geometry.ts's MM_TO_PX (design-time-only
// there — canvas guides). The two packages don't share a geometry module and this
// is a stable one-line constant, so duplicating it is simpler than adding a new
// cross-package dependency for one number.
const MM_TO_PX = 96 / 25.4;

const PAGE_SIZES_MM: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5: { width: 148, height: 210 },
  Legal: { width: 215.9, height: 355.6 },
};

function printableAreaPx(template: Template): { widthPx: number; heightPx: number } {
  const ps = template.printSetup;
  const size = PAGE_SIZES_MM[ps.pageSize] ?? PAGE_SIZES_MM.A4!;
  const [pw, ph] =
    ps.orientation === 'landscape'
      ? [Math.max(size.width, size.height), Math.min(size.width, size.height)]
      : [size.width, size.height];
  return {
    widthPx: (pw - ps.margins.left - ps.margins.right) * MM_TO_PX,
    heightPx: (ph - ps.margins.top - ps.margins.bottom) * MM_TO_PX,
  };
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function alignVal(a: Align | undefined): string {
  return a ?? 'left';
}

type CarryEntry = { column: string; fn: 'sum' | 'count' | 'avg'; format: DetailColumn['format'] };

function buildCarryRowHtml(
  columns: DetailColumn[],
  entries: CarryEntry[],
  values: Map<string, number>,
  label: string,
  fmtOpts: FormatOptions,
  // 'Carried forward' forces the page to end right after it (see the call
  // site's comment: relying on natural reflow to land the break exactly
  // between the carried/brought pair is not reliable — our own row-height
  // simulation is only an approximation of Chromium's real fragmentation, so
  // without a forced break both rows can end up on the same page).
  forceBreakAfter: boolean,
): string {
  const byColumn = new Map(entries.map((e) => [e.column, e]));
  let labelPlaced = false;
  const cells = columns.map((c) => {
    const entry = byColumn.get(c.column);
    if (entry) {
      const val = values.get(c.column) ?? 0;
      return `<td style="text-align:${alignVal(c.align)};font-style:italic;font-weight:600">${esc(
        formatValue(val, entry.format ?? 'number', fmtOpts),
      )}</td>`;
    }
    if (!labelPlaced) {
      labelPlaced = true;
      return `<td style="font-style:italic;color:#666">${esc(label)}</td>`;
    }
    return '<td></td>';
  });
  const breakStyle = forceBreakAfter ? 'break-after:page;' : '';
  return `<tr class="dd-carry-row" style="break-inside:avoid;${breakStyle}background:#f6f7f9">${cells.join('')}</tr>`;
}

type Measurements = {
  theadHeight: number;
  tfootHeight: number;
  rowHeights: number[];
  reportHeaderHeight: number;
};

/**
 * Measures the rendered detail table + reportHeader band at the real print
 * content width, simulates page breaks against the page's printable height
 * budget, and injects "Carried forward"/"Brought forward" rows into the live
 * DOM for every `Aggregate` with `into: 'carryForward'`. No-ops (cheap,
 * template-only check, no DOM work) when the template has none. Must run AFTER
 * `page.setContent()` and BEFORE `page.pdf()` on the same `page`.
 */
export async function applyCarryForward(page: Page, template: Template, data: DocumentData): Promise<void> {
  const detailBand = template.bands.find(isDetailBand) as DetailBand | undefined;
  if (!detailBand) return;

  const carryEntries: CarryEntry[] = (detailBand.aggregates ?? [])
    .filter((a) => a.into === 'carryForward')
    .map((a) => ({
      column: a.column,
      fn: a.fn,
      format: detailBand.columns.find((c) => c.column === a.column)?.format,
    }));
  if (carryEntries.length === 0) return;

  const rows = data.datasets[detailBand.datasetId] ?? [];
  if (rows.length === 0) return;

  const fmtOpts: FormatOptions = { locale: template.printSetup.locale, currency: template.printSetup.currency };
  const { widthPx, heightPx } = printableAreaPx(template);
  const pageHeader = template.bands.find(
    (b) => b.type === 'pageHeader' && (b as FreeBand).enabled !== false,
  ) as FreeBand | undefined;
  const pageFooter = template.bands.find(
    (b) => b.type === 'pageFooter' && (b as FreeBand).enabled !== false,
  ) as FreeBand | undefined;
  const pageBudgetPx = heightPx - (pageHeader?.height ?? 0) - (pageFooter?.height ?? 0);

  // Resize to the real print content width so text wrapping (and thus row
  // height) matches what page.pdf() will actually produce — page.pdf() itself
  // ignores the viewport and lays out against @page's content box regardless,
  // but OUR measurement pass here is an ordinary (non-print) layout, which
  // defaults to Puppeteer's viewport width unless we set it explicitly.
  await page.setViewport({ width: Math.max(1, Math.ceil(widthPx)), height: 2000 });

  const measured: Measurements = await page.evaluate(() => {
    const theadEl = document.querySelector('table.detail thead');
    // table.detail's <tfoot> is display:table-footer-group (see core/render.ts's
    // baseCss) — like <thead>, it repeats on EVERY printed page when a 'tfoot'
    // aggregate exists, so it must be reserved from the per-page budget too, not
    // just once.
    const tfootEl = document.querySelector('table.detail tfoot');
    const tbodyRows = Array.from(document.querySelectorAll('table.detail tbody tr'));
    const reportHeaderEl = document.querySelector('.band[data-band="reportHeader"]');
    return {
      theadHeight: theadEl ? theadEl.getBoundingClientRect().height : 0,
      tfootHeight: tfootEl ? tfootEl.getBoundingClientRect().height : 0,
      rowHeights: tbodyRows.map((r) => r.getBoundingClientRect().height),
      reportHeaderHeight: reportHeaderEl ? reportHeaderEl.getBoundingClientRect().height : 0,
    };
  });

  if (measured.rowHeights.length === 0) return;
  const avgRowH = measured.rowHeights.reduce((s, h) => s + h, 0) / measured.rowHeights.length;
  // Our measurement pass (an ordinary, non-print layout resized to the print
  // content width) can drift a little from Chromium's real print-time layout —
  // observed empirically, not something we could fully root-cause pixel-for-
  // pixel. A 1.5x row-height safety margin on the reserved carry-row space
  // absorbs that drift so the carried-forward row reliably lands within an
  // already-full page instead of overflowing onto its own near-empty page.
  const carryRowReserve = avgRowH * 1.5;

  // Greedy simulation: walk rows in order, tracking how much of the current
  // page's budget is used; a row that would overflow starts a new page.
  // `+ carryRowReserve` on both the running check and the post-break reset
  // reserves room for the carried-forward/brought-forward rows we're about to
  // inject, so the simulated breaks account for the extra rows they
  // themselves cause.
  const fixedPerPage = measured.theadHeight + measured.tfootHeight;
  const breakBeforeIndex: number[] = [];
  let used = measured.reportHeaderHeight + fixedPerPage;
  let placedOnThisPage = false;
  for (let i = 0; i < measured.rowHeights.length; i++) {
    const h = measured.rowHeights[i] ?? avgRowH;
    if (placedOnThisPage && used + h + carryRowReserve > pageBudgetPx) {
      breakBeforeIndex.push(i);
      used = fixedPerPage + carryRowReserve; // new page: thead + tfoot + reserved "brought forward" row
      placedOnThisPage = false;
    }
    used += h;
    placedOnThisPage = true;
  }

  if (breakBeforeIndex.length === 0) return;

  // Cumulative aggregate values per carry column, computed at each break point
  // from the REAL data (core.aggregate), not by scraping rendered text.
  const injections = breakBeforeIndex.map((rowIndex) => {
    const rowsSoFar = rows.slice(0, rowIndex);
    const values = new Map<string, number>(
      carryEntries.map((e) => [e.column, aggregate(rowsSoFar, e.column, e.fn)]),
    );
    return {
      rowIndex,
      carriedHtml: buildCarryRowHtml(detailBand.columns, carryEntries, values, 'Carried forward', fmtOpts, true),
      broughtHtml: buildCarryRowHtml(detailBand.columns, carryEntries, values, 'Brought forward', fmtOpts, false),
    };
  });

  // Insert from the last break to the first so earlier row indices stay valid.
  await page.evaluate((pairs) => {
    const tbody = document.querySelector('table.detail tbody');
    if (!tbody) return;
    const trs = Array.from(tbody.querySelectorAll('tr'));
    for (const { rowIndex, carriedHtml, broughtHtml } of pairs) {
      const anchor = trs[rowIndex];
      if (!anchor) continue;
      anchor.insertAdjacentHTML('beforebegin', carriedHtml + broughtHtml);
    }
  }, [...injections].reverse());
}
