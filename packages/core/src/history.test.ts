import { describe, it, expect } from 'vitest';
import { canRedo, canUndo, commit, commitFrom, initHistory, redo, undo } from './history.js';

describe('history', () => {
  it('starts with no undo/redo available', () => {
    const h = initHistory('a');
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe('a');
  });

  it('commit pushes the old present onto past and clears future', () => {
    let h = initHistory('a');
    h = commit(h, 'b');
    expect(h.present).toBe('b');
    expect(h.past).toStrictEqual(['a']);
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
  });

  it('undo restores the previous present and pushes onto future', () => {
    let h = initHistory('a');
    h = commit(h, 'b');
    h = commit(h, 'c');
    h = undo(h);
    expect(h.present).toBe('b');
    expect(h.past).toStrictEqual(['a']);
    expect(h.future).toStrictEqual(['c']);
  });

  it('redo re-applies an undone commit', () => {
    let h = initHistory('a');
    h = commit(h, 'b');
    h = undo(h);
    h = redo(h);
    expect(h.present).toBe('b');
    expect(h.past).toStrictEqual(['a']);
    expect(h.future).toStrictEqual([]);
  });

  it('a fresh commit after an undo discards the redo chain', () => {
    let h = initHistory('a');
    h = commit(h, 'b');
    h = commit(h, 'c');
    h = undo(h); // present: b, future: [c]
    h = commit(h, 'd');
    expect(h.present).toBe('d');
    expect(h.past).toStrictEqual(['a', 'b']);
    expect(h.future).toStrictEqual([]);
    expect(canRedo(h)).toBe(false);
  });

  it('undo/redo are no-ops at the boundaries', () => {
    let h = initHistory('a');
    expect(undo(h)).toStrictEqual(h);
    h = commit(h, 'b');
    h = redo(h); // nothing to redo
    expect(h.present).toBe('b');
    expect(h.future).toStrictEqual([]);
  });

  it('commitFrom pushes a supplied snapshot without altering the current present', () => {
    // Drag-batching: `present` was already live-updated (e.g. every pointermove);
    // commitFrom folds the pre-drag snapshot into `past` in one step.
    let h = initHistory({ x: 0 });
    const preDrag = h.present;
    h = { ...h, present: { x: 50 } }; // simulate live updates during the drag
    h = commitFrom(h, preDrag);
    expect(h.present).toStrictEqual({ x: 50 });
    expect(h.past).toStrictEqual([{ x: 0 }]);
    expect(h.future).toStrictEqual([]);

    h = undo(h);
    expect(h.present).toStrictEqual({ x: 0 });
  });

  it('bounds the past stack at max (default 50)', () => {
    let h = initHistory(0);
    for (let i = 1; i <= 55; i++) h = commit(h, i, 50);
    expect(h.past.length).toBe(50);
    expect(h.past[0]).toBe(5); // oldest 5 entries (0..4) dropped
    expect(h.present).toBe(55);
  });
});
