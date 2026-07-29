// Small, pure helpers for turning a palette FieldMeta into template pieces
// (a bound FreeElement or a DetailColumn). Shared by both the click-to-add path
// (FieldChip's keyboard "+") and the native-drag-drop path (Band/DetailTable), so
// the two stay consistent. Authoring-time structure only — no adapter/business
// values are invented, everything comes from the field's own metadata.
import { defaultFormatForType, type DetailColumn, type ElementKind, type FieldMeta, type FreeElement } from '@docsmith/core';

const DEFAULT_ELEMENT_WIDTH = 240;
const DEFAULT_ELEMENT_HEIGHT = 18;
const ELEMENT_GAP = 6;

function newId(): string {
  return crypto.randomUUID();
}

function stackY(existingElements: readonly FreeElement[]): number {
  return existingElements.reduce((max, el) => Math.max(max, el.y + el.h), 0) + ELEMENT_GAP;
}

/** A static (non-data) block: text, image, line, or box (design.md §5's "Blocks"
 * palette group). Never a "field" kind — that's always adapter-bound. */
export type BlockKind = Exclude<ElementKind, 'field'>;

const BLOCK_DEFAULTS: Record<Exclude<BlockKind, 'box'>, Pick<FreeElement, 'w' | 'h'>> = {
  text: { w: 200, h: 20 },
  image: { w: 120, h: 60 },
  line: { w: 200, h: 1 },
};

const BOX_DEFAULT_HEIGHT = 60;

/** Appends a new static block element stacked below the band's existing
 * elements. A `'box'` always starts full-span (the whole band's content
 * width — matching D-028's x/w basis) since it's most often used as a
 * background/divider rectangle; the user resizes it down afterward via the
 * normal drag handles if they want something narrower. Other block kinds
 * keep their fixed starting size. */
export function createBlockElement(
  kind: BlockKind,
  existingElements: readonly FreeElement[],
  contentWidthPx: number,
  unit: 'px' | '%',
): FreeElement {
  const y = stackY(existingElements);
  if (kind === 'box') {
    return { id: newId(), kind, x: 0, y, w: unit === '%' ? 100 : contentWidthPx, h: BOX_DEFAULT_HEIGHT };
  }
  const { w, h } = BLOCK_DEFAULTS[kind];
  const base = { id: newId(), kind, x: 0, y, w, h } as const;
  if (kind === 'text') return { ...base, text: 'Text' };
  if (kind === 'image') return { ...base, src: { kind: 'url', value: '' } };
  return base;
}

/** Appends a new bound field element stacked below the band's existing elements. */
export function createFieldElement(
  source: 'header' | string,
  field: Pick<FieldMeta, 'name' | 'label' | 'type'>,
  existingElements: readonly FreeElement[],
): FreeElement {
  return {
    id: newId(),
    kind: 'field',
    x: 0,
    y: stackY(existingElements),
    w: DEFAULT_ELEMENT_WIDTH,
    h: DEFAULT_ELEMENT_HEIGHT,
    label: field.label,
    binding: { source, column: field.name, format: defaultFormatForType(field.type) },
  };
}

const DEFAULT_COLUMN_WIDTH = 100;

/** Default width (% of its row) for a newly added stack element — full-width
 * when it's starting its own row. Merging into an existing row is left to
 * the user to adjust afterward via Properties (memory.md D-029: no
 * auto-redistribution of sibling widths on merge). */
const STACK_DEFAULT_WIDTH = 100;

/** Next available row number for a new stack element — one past the
 * highest existing row, or 0 for an empty band. */
export function nextStackRow(elements: readonly FreeElement[]): number {
  const rows = elements.map((e) => e.row ?? -1);
  return rows.length ? Math.max(...rows) + 1 : 0;
}

/** Appends a new bound field element into a stack band's row `row`. */
export function createStackFieldElement(
  source: 'header' | string,
  field: Pick<FieldMeta, 'name' | 'label' | 'type'>,
  row: number,
  width: number = STACK_DEFAULT_WIDTH,
): FreeElement {
  return {
    id: newId(),
    kind: 'field',
    x: 0,
    y: 0,
    w: width,
    h: DEFAULT_ELEMENT_HEIGHT,
    row,
    label: field.label,
    binding: { source, column: field.name, format: defaultFormatForType(field.type) },
  };
}

/** Appends a new static block element into a stack band's row `row`. */
export function createStackBlockElement(
  kind: BlockKind,
  row: number,
  width: number = STACK_DEFAULT_WIDTH,
): FreeElement {
  const h = kind === 'box' ? BOX_DEFAULT_HEIGHT : BLOCK_DEFAULTS[kind].h;
  const base = { id: newId(), kind, x: 0, y: 0, w: width, h, row } as const;
  if (kind === 'text') return { ...base, text: 'Text' };
  if (kind === 'image') return { ...base, src: { kind: 'url', value: '' } };
  return base;
}

/** Appends a new bound field element into a grid band's cell (row, col),
 * memory.md D-034. Width/height are governed by `FreeBand.gridColumns` and
 * the row's content, not stored per-element (unlike free/stack). */
export function createGridFieldElement(
  source: 'header' | string,
  field: Pick<FieldMeta, 'name' | 'label' | 'type'>,
  row: number,
  col: number,
): FreeElement {
  return {
    id: newId(),
    kind: 'field',
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    row,
    col,
    colSpan: 1,
    label: field.label,
    binding: { source, column: field.name, format: defaultFormatForType(field.type) },
  };
}

/** Appends a new static block element into a grid band's cell (row, col). */
export function createGridBlockElement(kind: BlockKind, row: number, col: number): FreeElement {
  const base = { id: newId(), kind, x: 0, y: 0, w: 0, h: 0, row, col, colSpan: 1 } as const;
  // Non-empty starter text, matching createBlockElement/createStackBlockElement
  // above — GridBand.svelte's isPlaceholder() treats any empty-text 'text'
  // element as a ghost "Drop a field here" cell (that's how "Add row"'s own
  // placeholder renders), so an actually-dropped Text block needs real
  // content or it would be visually indistinguishable from an untouched
  // placeholder and impossible to double-click into (memory.md D-043).
  if (kind === 'text') return { ...base, text: 'Text' };
  if (kind === 'image') return { ...base, src: { kind: 'url', value: '' } };
  return base;
}

/** An empty placeholder cell for "+ Add row" (memory.md D-034) — a real,
 * empty text element (`text: ''`), not a phantom UI-only row. Renders as a
 * "Drop a field here" ghost cell (GridBand.svelte) but is genuine template
 * data an author can select/delete like any other element, and dropping a
 * real field/block onto it replaces it in place (same row/col). */
export function createGridPlaceholderElement(row: number, col: number): FreeElement {
  return { id: newId(), kind: 'text', x: 0, y: 0, w: 0, h: 0, row, col, colSpan: 1, text: '' };
}

/** Next empty cell in a grid band, scanning existing rows top-to-bottom then
 * left-to-right, falling back to a new row when every existing row is full —
 * the keyboard drag-alternative's landing spot (design.md §12), since there's
 * no per-cell keyboard targeting yet (v1: always lands in the first gap). */
export function nextGridCell(elements: readonly FreeElement[], numCols: number): { row: number; col: number } {
  const occupied = new Set<string>();
  let maxRow = -1;
  for (const el of elements) {
    const r = el.row ?? 0;
    const c = el.col ?? 0;
    const span = Math.max(1, el.colSpan ?? 1);
    for (let i = 0; i < span; i++) occupied.add(`${r}:${c + i}`);
    maxRow = Math.max(maxRow, r);
  }
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c < numCols; c++) {
      if (!occupied.has(`${r}:${c}`)) return { row: r, col: c };
    }
  }
  return { row: maxRow + 1, col: 0 };
}

/** Ready-made column layouts for the palette's "Sections" group (memory.md
 * D-034/D-037) — MailerLite-style draggable layout skeletons. Dropping one
 * onto a band sets its `gridColumns` to `columns` and adds one new row of
 * empty placeholder cells, one per column. */
export type SectionPreset = { label: string; columns: number[] };
export const SECTION_PRESETS: SectionPreset[] = [
  { label: '1 column', columns: [100] },
  { label: '2 columns', columns: [50, 50] },
  { label: 'Large + small', columns: [65, 35] },
];

/** One empty placeholder cell per column, for a new "Sections" row. */
export function createSectionRow(columns: number[], row: number): FreeElement[] {
  return columns.map((_, col) => createGridPlaceholderElement(row, col));
}

/** Builds a DetailColumn from a dataset field; align defaults sensibly by format. */
export function createDetailColumn(field: Pick<FieldMeta, 'name' | 'label' | 'type'>): DetailColumn {
  const format = defaultFormatForType(field.type);
  return {
    column: field.name,
    header: field.label,
    width: DEFAULT_COLUMN_WIDTH,
    align: format === 'number' || format === 'currency' ? 'right' : 'left',
    format,
  };
}
