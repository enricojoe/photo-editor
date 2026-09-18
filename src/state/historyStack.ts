/**
 * Pure mechanics of moving a snapshot between the undo/redo stacks, shared by
 * `undo()` and `redo()` in EditorContext.tsx — the two are exact mirrors of
 * each other (`undo` moves undo -> redo, `redo` moves redo -> undo). Kept
 * free of any canvas/DOM/React dependency so it's unit-testable on its own;
 * the caller is responsible for capturing `current` and for the empty-stack
 * no-op guard (skipping the call entirely leaves both stacks untouched).
 *
 * Mutates `source` and `destination` in place and returns the snapshot to
 * restore, if any.
 */
export function transferSnapshot<T>(source: T[], destination: T[], current: T | null): T | undefined {
  if (source.length === 0) return undefined
  if (current) destination.push(current)
  return source.pop()
}
