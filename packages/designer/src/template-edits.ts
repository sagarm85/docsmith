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

const BLOCK_DEFAULTS: Record<BlockKind, Pick<FreeElement, 'w' | 'h'>> = {
  text: { w: 200, h: 20 },
  image: { w: 120, h: 60 },
  line: { w: 200, h: 1 },
  box: { w: 100, h: 60 },
};

/** Appends a new static block element stacked below the band's existing elements. */
export function createBlockElement(
  kind: BlockKind,
  existingElements: readonly FreeElement[],
): FreeElement {
  const y = stackY(existingElements);
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
  const { h } = BLOCK_DEFAULTS[kind];
  const base = { id: newId(), kind, x: 0, y: 0, w: width, h, row } as const;
  if (kind === 'text') return { ...base, text: 'Text' };
  if (kind === 'image') return { ...base, src: { kind: 'url', value: '' } };
  return base;
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
