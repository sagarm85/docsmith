// Small, pure helpers for turning a palette FieldMeta into template pieces
// (a bound FreeElement or a DetailColumn). Shared by both the click-to-add path
// (FieldChip's keyboard "+") and the native-drag-drop path (Band/DetailTable), so
// the two stay consistent. Authoring-time structure only — no adapter/business
// values are invented, everything comes from the field's own metadata.
import { defaultFormatForType, type DetailColumn, type FieldMeta, type FreeElement } from '@docsmith/core';

const DEFAULT_ELEMENT_WIDTH = 240;
const DEFAULT_ELEMENT_HEIGHT = 18;
const ELEMENT_GAP = 6;

function newId(): string {
  return crypto.randomUUID();
}

/** Appends a new bound field element stacked below the band's existing elements. */
export function createFieldElement(
  source: 'header' | string,
  field: Pick<FieldMeta, 'name' | 'label' | 'type'>,
  existingElements: readonly FreeElement[],
): FreeElement {
  const y = existingElements.reduce((max, el) => Math.max(max, el.y + el.h), 0) + ELEMENT_GAP;
  return {
    id: newId(),
    kind: 'field',
    x: 0,
    y,
    w: DEFAULT_ELEMENT_WIDTH,
    h: DEFAULT_ELEMENT_HEIGHT,
    label: field.label,
    binding: { source, column: field.name, format: defaultFormatForType(field.type) },
  };
}

const DEFAULT_COLUMN_WIDTH = 100;

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
