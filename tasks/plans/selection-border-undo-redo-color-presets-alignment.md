# Selection border, undo/redo, color presets, aligned sliders

## Context
Four requests from the user, executed by delegated subagents in isolated git worktrees while the main thread acts as project manager:
1. The selection tool's marching-ants outline (`SelectionTool.tsx`) is only a 1px dashed white line — invisible against light/busy image content. Needs a visibly stronger border.
2. No undo/redo exists anywhere. Every tool (crop, selection delete, bucket fill, color adjust, background removal) mutates the base canvas's pixels directly and irreversibly.
3. Color Adjust (`ColorAdjustTool.tsx`) only exposes raw Brightness/Contrast/Saturation sliders — the user wants one-click presets (night, warm, cold, etc.).
4. The Color Adjust sliders (screenshot supplied) should have their label / track / value columns visually aligned across rows — currently `.color-adjust-controls label` is a plain flex row, so the slider's start position shifts with label text length.

Precedent: `tasks/plans/parallel-crop-cursor-export-color-features.md` ran 4 features as parallel subagents in separate `git worktree`s, then merged sequentially. That worked, but its own retro flagged file overlap between agents as the main risk.

## Why phased instead of 4-way parallel
- Item 1 touches `SelectionTool.tsx`.
- Items 3 + 4 both touch `ColorAdjustTool.tsx` / `colorFilter.ts` / `App.css` — really one unit of work.
- Item 2 (undo/redo) necessarily touches every tool component above plus `EditorContext.tsx` and image-load/project-load code — it cannot avoid colliding with items 1/3/4 if run at the same time.

So: run item 1 and items 3+4 in two parallel worktrees (genuinely independent files), merge both to `main`, then run item 2 (undo/redo) from the updated `main` so its edits to already-finalized files are small additive hooks, not conflict guesswork.

## Checklist

### Phase 0 — repo prep
- [x] Confirm clean `main`, commit any pre-existing staged docs.
- [ ] Create worktree `../PhotoEditor-selection-border` (branch `feat/selection-border`), symlink `node_modules`.
- [ ] Create worktree `../PhotoEditor-color-presets` (branch `feat/color-presets-alignment`), symlink `node_modules`.

### Phase 1 — parallel subagents
- [ ] Agent A — Selection visual border (`src/features/selection/SelectionTool.tsx` only): two-pass outline stroke (solid dark halo + existing white dashed line on top) for `draftRect`, `draftPoints`, and committed `selection`, so it's visible on any background. Verify build/lint/test.
- [ ] Agent B — Color Adjust presets + aligned sliders (`colorFilter.ts`, `ColorAdjustTool.tsx`, `App.css`):
  - Add `COLOR_ADJUST_PRESETS` (Normal/Warm/Cool/Night/Vintage/B&W) as `{brightness, contrast, saturation}` combos — no new slider dimension.
  - Preset button grid in `ColorAdjustTool.tsx` (pattern matches `crop-presets`), active-state highlighting when values match.
  - `.color-adjust-controls label` → CSS grid (`84px 1fr 34px` columns) so label/track/value align across rows regardless of text length; add matching `.color-adjust-presets` grid CSS.
  - Verify build/lint/test; extend `tests/colorFilter.test.ts` for the new presets.

### Merge Phase 1
- [ ] Merge `feat/selection-border` → `main`.
- [ ] Merge `feat/color-presets-alignment` → `main`.
- [ ] `npm run build && npm run lint && npm test` on merged `main`; remove both worktrees/branches.

### Phase 2 — undo/redo (single subagent, off updated `main`)
- [x] Worktree `../PhotoEditor-undo-redo`, branch `feat/undo-redo`.
- [x] `EditorContext.tsx`: add `HistorySnapshot {width, height, imageData}`, a `HistoryContext` created inside `EditorProvider` (closes over existing canvas refs + dispatch), two `useRef` stacks (undo/redo) + a `{canUndo, canRedo}` state object synced after every stack mutation (kept out of the memo body so refs are never read during render — avoids the `react(refs)` lint rule), and `useHistory()` exposing `{canUndo, canRedo, pushSnapshot, resetHistory, undo, redo}`.
  - `pushSnapshot()`: `getImageData` current canvas → push to undo stack, clear redo stack. Call immediately before a mutation.
  - `resetHistory()`: clear both stacks. Call on brand-new document load.
  - `undo`/`redo`: snapshot current canvas onto the other stack, pop target (via a small pure `transferSnapshot` helper extracted to `src/state/historyStack.ts`, unit-tested), resize both canvases + `putImageData`, `dispatch(IMAGE_LOADED)` + `dispatch(SET_SELECTION null)`.
- [x] Wire `pushSnapshot()` before the mutation in: `CropOverlay.handleConfirm`, `SelectionTool.handleDelete`, `BucketFillTool`'s fill click handler, `ColorAdjustTool.handleApply`, `BackgroundRemovalTool`'s effect (before calling `removeBackgroundFromCanvas`, once per `attempt` including retries).
- [x] Wire `resetHistory()` after `IMAGE_LOADED` in: `useImageFileLoader.loadFile`, `ProjectManagerPanel.handleLoad`.
- [x] New `HistoryControls.tsx` in the header (left of `HeaderExport`, grouped in a new `.app__header-actions` flex wrapper): Undo/Redo buttons (disabled per `canUndo`/`canRedo`/active-tool), global `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` keyboard shortcuts (ignored while an input/textarea/contenteditable has focus, or a tool is active). Matching `.history-controls` CSS.
- [x] Verify build/lint/test — clean build, lint has only the pre-existing `only-export-components` warning category (now 4 occurrences instead of 3, same convention as before), 69/69 tests pass (66 existing + 3 new for `transferSnapshot`).

### Merge Phase 2
- [ ] Merge `feat/undo-redo` → `main`; `npm run build && npm run lint && npm test`; remove worktree/branch. (Not done by this subagent — implementation only, per its task scope; merge is the project-manager thread's job.)

### Final verification
- [ ] Full build/lint/test on final `main`.
- [ ] `npm run dev` manual pass: selection border visible; delete selection → undo → redo; color preset → Apply → undo; crop → undo; bucket fill x2 → undo x2. No browser-automation tool available this session, so this is a manual/best-effort pass, not an automated one — call this out rather than claiming full interactive verification.
- [ ] Update master `tasks/todo.md` with a line referencing this file.

## Worktree bookkeeping
Manual `git worktree add` (not `Agent`'s `isolation: "worktree"`, which failed mid-session previously), symlink `node_modules`, each subagent `cd`s into its absolute worktree path for every command and never touches the main checkout. Remove worktrees + delete branches after each phase's merge lands.

## Result
_(filled in after completion)_
