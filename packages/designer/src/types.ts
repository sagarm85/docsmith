// The single config shape DocDesigner.svelte accepts, mirroring the SDK's
// MountOptions (design.md §13). Kept as a plain .ts module (not inside the .svelte
// file) so it can be re-exported from index.ts without a plain `tsc` pass having to
// resolve a `.svelte` import.
import type { DataSourceAdapter, Template, ValueFormat } from '@docsmith/core';
import type { BlockKind } from './template-edits.js';

export type DocDesignerConfig = {
  adapter: DataSourceAdapter;
  template?: Template;
  onSave?: (template: Template) => void;
  onChange?: (template: Template) => void;
  renderServiceUrl?: string;
  theme?: Record<string, string>;
};

/** What's currently selected on the canvas — drives the Properties panel's
 * Selection tab (design.md §10). Owned by DocDesigner, read by Canvas/Band/
 * DetailTable (to render a selected outline) and Properties (to edit it). */
export type Selection =
  | { kind: 'element'; bandId: string; elementId: string }
  | { kind: 'band'; bandId: string }
  | { kind: 'column'; columnIndex: number }
  | null;

/** The keyboard drag-alternative's "held" chip (design.md §12: "select a chip,
 * press Enter to pick up, [Tab/]arrow to a band, Enter to drop"). Mirrors the
 * native-DnD payload shapes exactly (Band.svelte/DetailTable.svelte's
 * DragPayload, and the block payload) so both paths build identical
 * structures via the same template-edits.ts helpers. Owned by DocDesigner. */
export type PickedUp =
  | {
      cls: 'header' | 'dataset';
      datasetId: string | null;
      column: string;
      type: string;
      label: string;
      format: ValueFormat;
    }
  | { cls: 'block'; kind: BlockKind }
  | null;
