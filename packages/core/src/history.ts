// @docsmith/core — generic undo/redo history reducer (design.md §8.7: "History
// is derived from template snapshots or command objects — keep it in core as a
// small helper so it's testable"). Pure, framework-agnostic, no DOM: the
// designer holds the HistoryState in its own reactive $state and calls these
// functions on every commit.

export const DEFAULT_MAX_HISTORY = 50;

export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function initHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

/** Commits `next` as the new present, pushing the old present onto `past` and
 * clearing `future` (a fresh commit invalidates any redo chain). */
export function commit<T>(
  state: HistoryState<T>,
  next: T,
  max: number = DEFAULT_MAX_HISTORY,
): HistoryState<T> {
  const past = [...state.past, state.present];
  return {
    past: past.length > max ? past.slice(past.length - max) : past,
    present: next,
    future: [],
  };
}

/**
 * Commits `previousPresent` onto `past` while leaving `state.present` as-is.
 * For interactions that mutate `present` continuously (a pointer drag) without
 * pushing history on every tick: capture the pre-drag value, keep updating
 * `present` live via direct assignment, then call this once at drag-end so
 * undo restores the pre-drag position in a single step.
 */
export function commitFrom<T>(
  state: HistoryState<T>,
  previousPresent: T,
  max: number = DEFAULT_MAX_HISTORY,
): HistoryState<T> {
  const past = [...state.past, previousPresent];
  return {
    past: past.length > max ? past.slice(past.length - max) : past,
    present: state.present,
    future: [],
  };
}

export function undo<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state;
  const present = state.past[state.past.length - 1] as T;
  return {
    past: state.past.slice(0, -1),
    present,
    future: [state.present, ...state.future],
  };
}

export function redo<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state;
  const [present, ...rest] = state.future as [T, ...T[]];
  return {
    past: [...state.past, state.present],
    present,
    future: rest,
  };
}

export function canUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0;
}
