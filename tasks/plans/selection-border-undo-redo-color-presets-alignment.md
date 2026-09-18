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
- [x] Create worktree `../PhotoEditor-selection-border` (branch `feat/selection-border`), symlink `node_modules`.
- [x] Create worktree `../PhotoEditor-color-presets` (branch `feat/color-presets-alignment`), symlink `node_modules`.

### Phase 1 — parallel subagents
- [x] Agent A — Selection visual border (`src/features/selection/SelectionTool.tsx` only): two-pass outline stroke (solid `#000000` halo, `lineWidth 3`, no dash + white dashed line on top, `lineWidth 2`, `[6,4]` dash) for `draftRect`, `draftPoints`, and committed `selection`. Build/lint/test verified (64/64 tests).
- [x] Agent B — Color Adjust presets + aligned sliders (`colorFilter.ts`, `ColorAdjustTool.tsx`, `App.css`):
  - Added `COLOR_ADJUST_PRESETS` (Normal/Warm/Cool/Night/Vintage/B&W) as `{brightness, contrast, saturation}` combos.
  - Preset button grid in `ColorAdjustTool.tsx` matching `crop-presets` pattern, active-state highlighting when values match exactly.
  - `.color-adjust-controls label` → CSS grid (`84px 1fr 38px` columns, widened value column from the planned 34px to fit "-100"); matching `.color-adjust-presets` grid CSS added.
  - Build/lint/test verified; `tests/colorFilter.test.ts` extended (66/66 tests).

### Merge Phase 1
- [x] Merge `feat/selection-border` → `main` (fast-forward, no conflicts).
- [x] Merge `feat/color-presets-alignment` → `main` (clean merge, no conflicts).
- [x] `npm run build && npm run lint && npm test` on merged `main` — clean, 66/66 tests; worktrees and branches removed.

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
- [x] Merge `feat/undo-redo` → `main` (fast-forward, no conflicts); `npm run build && npm run lint && npm test` — clean, 69/69 tests; worktree and branch removed.

### Final verification
- [x] Full build/lint/test on final `main` — clean build, only the 4 pre-existing `react(only-export-components)` lint warnings on `EditorContext.tsx` (up from 3, since it now exports one more hook — same category, no new issue types), 69/69 tests passing.
- [x] `npm run dev` — confirmed the dev server boots cleanly with no console/runtime errors at startup (`http://localhost:5174/`, port 5173 was already in use). **Not done**: clicking through the actual interactions (selection border visibility, undo/redo round-trips, presets, crop) in a real browser — no browser-automation tool was available this session, so this is not verified beyond static analysis + automated tests. Worth a manual pass before considering this fully done.
- [x] Update master `tasks/todo.md` with a line referencing this file.

## Worktree bookkeeping
Manual `git worktree add` (not `Agent`'s `isolation: "worktree"`, which failed mid-session previously), symlink `node_modules`, each subagent `cd`s into its absolute worktree path for every command and never touches the main checkout. Remove worktrees + delete branches after each phase's merge lands.

## Result
All three phases landed on `main` (commits: `090f43a` selection border, `15a6f4a` color presets/alignment, merge `7e11a9f`, `b09c661` undo/redo, merge into `main`). Final `main` state: `npm run build` clean, `npm run lint` clean (only pre-existing `only-export-components` warnings on `EditorContext.tsx`, now 4 instead of 3 since it exports one more hook), `npm test` 69/69 passing (up from 64 at the start: +2 for color presets, +3 for `transferSnapshot`).

What shipped:
- **Selection border**: two-pass marching-ants outline (solid black halo + white dash on top) in `SelectionTool.tsx`, visible on any background.
- **Color Adjust presets**: `COLOR_ADJUST_PRESETS` (Normal/Warm/Cool/Night/Vintage/B&W) as brightness/contrast/saturation combos, one-click buttons above the sliders.
- **Aligned sliders**: `.color-adjust-controls label` is now a 3-column CSS grid (`84px 1fr 38px`) so Brightness/Contrast/Saturation's tracks and values line up regardless of label text length.
- **Undo/redo**: snapshot-stack history (`useHistory()` in `EditorContext.tsx`, pure stack mechanics in `state/historyStack.ts`) wired into every pixel-mutating tool (crop, selection delete, bucket fill, color adjust, background removal) plus reset-on-new-document (file load, project load). Undo/Redo buttons in the header + `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` shortcuts.

**Not independently verified**: interactive browser behavior (does the border actually look right, does undo/redo actually feel correct end-to-end, do the presets look distinct) — no browser-automation tool was available this session, same limitation as the precedent plan. The dev server does boot cleanly with no startup errors. Worth a `npm run dev` click-through pass to confirm feel before calling this fully done.
