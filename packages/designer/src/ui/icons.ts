// Inline-SVG icon paths (house style, design.md §3/§11: stroke-based, 1.6
// stroke width, currentColor — no icon library/font). Every icon is expressed
// as pure <path> `d` data (rects/circles drawn with path commands) so the
// shared Icon.svelte component never needs per-icon element variance.
export type IconName =
  | 'doc'
  | 'repeat'
  | 'table'
  | 'calculator'
  | 'undo'
  | 'redo'
  | 'save'
  | 'export'
  | 'chevronDown'
  | 'chevronUp'
  | 'text'
  | 'image'
  | 'line'
  | 'box'
  | 'field'
  | 'calendar'
  | 'hash'
  | 'page'
  | 'margins'
  | 'database'
  | 'palette'
  | 'plus'
  | 'close'
  | 'search'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'layers'
  | 'trash'
  | 'grip'
  | 'sparkle'
  | 'check';

export const ICONS: Record<IconName, string[]> = {
  doc: ['M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M14 3v6h6'],
  repeat: ['M17 2l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'],
  table: ['M3 10h18', 'M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  calculator: ['M4 3h16v18H4z', 'M8 8h8', 'M8 12h8', 'M8 16h4'],
  undo: ['M9 7L4 12l5 5', 'M4 12h10a6 6 0 0 1 0 12h-1'],
  redo: ['M15 7l5 5-5 5', 'M20 12H10a6 6 0 0 0 0 12h1'],
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  export: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronUp: ['M6 15l6-6 6 6'],
  text: ['M5 5h14', 'M12 5v14'],
  image: ['M3 4h18v16H3z', 'M9 10a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z', 'M21 16l-5.5-5.5L7 19'],
  line: ['M4 12h16'],
  box: ['M4 4h16v16H4z'],
  field: ['M13 2L4 14h6l-1 8 9-12h-6z'],
  calendar: ['M3 5h18v16H3z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  hash: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  page: ['M4 2h16v20H4z'],
  margins: ['M3 3h18v18H3z', 'M7 7h10v10H7z'],
  database: ['M3 5h18v14H3z', 'M3 9h18'],
  palette: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  alignLeft: ['M4 6h16', 'M4 12h10', 'M4 18h13'],
  alignCenter: ['M4 6h16', 'M7 12h10', 'M5.5 18h13'],
  alignRight: ['M4 6h16', 'M10 12h10', 'M7 18h13'],
  layers: ['M12 3l9 5-9 5-9-5 9-5z', 'M3 13l9 5 9-5', 'M3 17l9 5 9-5'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  grip: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z'],
  check: ['M5 12l5 5L19 7'],
};
