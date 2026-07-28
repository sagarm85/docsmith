// @docsmith/core — template factory, validation, and small model helpers.
// Pure functions, unit-testable, no DOM.

import type {
  Band,
  DatasetMeta,
  DetailBand,
  PrintSetup,
  Template,
  TemplateDataset,
} from './types.js';
import { isDetailBand } from './types.js';

const DEFAULT_PRINT_SETUP: PrintSetup = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 20, right: 18, bottom: 20, left: 18 },
  unit: 'mm',
  repeatPageHeader: false,
  repeatPageFooter: false,
  showPageNumbers: true,
  pageNumberFormat: 'Page {page} of {pages}',
  currency: 'USD',
  locale: 'en-US',
};

function uuid(): string {
  // Prefer the platform UUID; fall back to a simple RFC4122-ish generator so this
  // works in any JS runtime (browser, Node) without a dependency.
  const c: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto) : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** A minimal, valid, empty template for a document type. */
export function newTemplate(docType = 'document', entity = ''): Template {
  return {
    version: 1,
    id: uuid(),
    name: `New ${docType}`,
    docType,
    printSetup: { ...DEFAULT_PRINT_SETUP },
    dataSource: { entity, key: 'id', datasets: [] },
    bands: [
      { id: 'reportHeader', type: 'reportHeader', height: 140, elements: [] },
      { id: 'detail', type: 'detail', datasetId: '', columns: [], keepRowTogether: true },
      { id: 'totals', type: 'totals', height: 110, elements: [] },
    ],
  };
}

/**
 * From adapter relationship metadata, suggest child datasets for a header entity.
 * The adapter's getRelatedDatasets already returns these; this helper turns a
 * chosen DatasetMeta into a TemplateDataset entry.
 */
export function datasetFromMeta(meta: DatasetMeta, ref: TemplateDataset['ref']): TemplateDataset {
  const kind: TemplateDataset['kind'] = 'table' in ref ? 'fk' : 'sql';
  return { id: meta.id, label: meta.label, kind, ref };
}

export type ValidationIssue = { path: string; message: string };

/** Structural validation. Returns [] when the template is renderable. */
export function validateTemplate(t: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (path: string, message: string) => issues.push({ path, message });

  if (!t || typeof t !== 'object') {
    return [{ path: '', message: 'template must be an object' }];
  }
  const tpl = t as Partial<Template>;

  if (tpl.version !== 1) push('version', 'unsupported template version');
  if (!tpl.id) push('id', 'missing id');
  if (!tpl.name) push('name', 'missing name');
  if (!tpl.printSetup) push('printSetup', 'missing printSetup');
  if (!tpl.dataSource) push('dataSource', 'missing dataSource');
  if (!Array.isArray(tpl.bands)) {
    push('bands', 'bands must be an array');
    return issues;
  }

  const types = tpl.bands.map((b) => b.type);
  if (!types.includes('reportHeader')) push('bands', 'a reportHeader band is required');
  if (!types.includes('detail')) push('bands', 'a detail band is required');

  const detail = tpl.bands.find((b) => b.type === 'detail') as DetailBand | undefined;
  if (detail) {
    if (!detail.datasetId) push('bands.detail.datasetId', 'detail band has no dataset bound');
    if (!Array.isArray(detail.columns) || detail.columns.length === 0) {
      push('bands.detail.columns', 'detail band has no columns');
    }
    const known = new Set((tpl.dataSource?.datasets ?? []).map((d) => d.id));
    if (detail.datasetId && !known.has(detail.datasetId)) {
      push('bands.detail.datasetId', `dataset "${detail.datasetId}" is not declared in dataSource.datasets`);
    }
  }

  return issues;
}

export function isValidTemplate(t: unknown): t is Template {
  return validateTemplate(t).length === 0;
}

/** Find a band by type (first match). */
export function findBand(t: Template, type: Band['type']): Band | undefined {
  return t.bands.find((b) => b.type === type);
}

/**
 * Convert every free-form element's x/y/w/h between 'px' and '%' (designer
 * memory.md D-028: a global per-template setting, not per-element). x/w
 * convert against `contentWidthPx` (the page's FULL width — bands span
 * edge-to-edge in both the canvas and `renderToHtml`'s real output;
 * `printSetup.margins` is a print-only `@page` concept, never a box-model
 * inset — the caller computes this from `printSetup.pageSize`/`orientation`
 * via mm→px geometry math that's design-canvas-only, per
 * `packages/designer/src/geometry.ts`'s own comment on why `core` doesn't
 * otherwise need it); y/h convert against each
 * band's own `height` (always px — the outer box, never itself relative to
 * something else). No-op (returns the same template reference) if already
 * in the target unit. Values are rounded (2 decimals for '%', whole px)
 * since sub-pixel/sub-0.01% precision has no visual meaning here and the
 * designer's own drag-snap will requantize on the next edit anyway.
 */
export function convertLayoutUnit(
  template: Template,
  targetUnit: 'px' | '%',
  contentWidthPx: number,
): Template {
  const currentUnit = template.layoutUnit ?? 'px';
  if (currentUnit === targetUnit) return template;

  const convert = (value: number, basisPx: number): number => {
    const raw =
      currentUnit === 'px'
        ? (basisPx > 0 ? (value / basisPx) * 100 : 0) // px -> %
        : (value / 100) * basisPx; // % -> px
    const rounded = targetUnit === '%' ? Math.round(raw * 100) / 100 : Math.round(raw);
    return rounded;
  };

  return {
    ...template,
    layoutUnit: targetUnit,
    bands: template.bands.map((band): Band => {
      if (isDetailBand(band)) return band;
      return {
        ...band,
        elements: band.elements.map((el) => ({
          ...el,
          x: convert(el.x, contentWidthPx),
          y: convert(el.y, band.height),
          w: convert(el.w, contentWidthPx),
          h: convert(el.h, band.height),
        })),
      };
    }),
  };
}
