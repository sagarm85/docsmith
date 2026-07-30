// Design-canvas-only geometry: converts printSetup (mm) into on-screen px so the
// Canvas can draw a page and margin guides. This is NOT part of the render
// pipeline — core.renderToHtml emits real `mm` in @page CSS and never needs this;
// the browser has no "page" element to lay out outside of print, so the design-time
// canvas has to fake page dimensions in px (design.md §7/§8.1: 1mm ≈ 3.7795px).
import type { PageSize, PrintSetup } from '@docsmith/core';

export const MM_TO_PX = 96 / 25.4;

const PAGE_SIZES_MM: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  A5: { width: 148, height: 210 },
  Legal: { width: 215.9, height: 355.6 },
};

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export type PagePx = { width: number; height: number };

export function pageDimensionsPx(printSetup: PrintSetup): PagePx {
  const { width, height } = PAGE_SIZES_MM[printSetup.pageSize];
  const [w, h] =
    printSetup.orientation === 'landscape' ? [Math.max(width, height), Math.min(width, height)] : [width, height];
  // Width is the PRINTABLE width (page width minus left+right margins), not
  // the full physical page — matching `packages/core/src/render.ts`'s
  // `pageWidthPx` (memory.md D-054). A free-form element could previously be
  // positioned anywhere up to the full, unreduced page width in the canvas
  // and look fine there, then render past the page's right edge in Preview/
  // print, which only ever had the margin-reduced width to work with —
  // reported directly: dragging a totals field pushed it visibly outside the
  // page in Preview. Height is left as the full page height (unrelated to
  // this fix — core/render.ts's own width fix was also width-only).
  return { width: mmToPx(w - printSetup.margins.left - printSetup.margins.right), height: mmToPx(h) };
}

export type MarginsPx = { top: number; right: number; bottom: number; left: number };

export function marginsPx(printSetup: PrintSetup): MarginsPx {
  const { top, right, bottom, left } = printSetup.margins;
  return { top: mmToPx(top), right: mmToPx(right), bottom: mmToPx(bottom), left: mmToPx(left) };
}
