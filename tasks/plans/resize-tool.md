# Resize tool (by pixel size or percentage)

## Context
The editor could only change an image's dimensions by **cropping** (cutting pixels away). No way to *scale* the whole image, e.g. shrink a 4000×3000 photo to 500×600, or to 50%. This adds a **Resize** tool that scales the full image to explicit pixel dimensions or by a percentage, as one undoable step.

## Design decisions
- Separate **Resize** tool in the left rail, right after Crop. Crop's "Custom" size picks a *region*; Resize *scales* — different operations.
- Pixels mode has a **Lock aspect ratio** checkbox, default ON (width edit auto-fills height and vice versa, computed from the source ratio each time so rounding never drifts). Unticked → free stretch to an exact size like 500×600.
- Percent mode is a single number applied to both axes, relative to the current size.
- Cap of **8192 px per side** (browsers silently fail to allocate larger canvases); Apply is disabled with a hint above it.
- **Apply closes the tool, like Crop** ("Apply Resize" / "Cancel"); undo reverts it. Apply is disabled when the target equals the current size (no empty undo entries).
- `applyResizeToCanvas(canvas, width, height, createCanvas)` follows the `applyXToCanvas` naming + injectable `createCanvas` convention. Downscales **step down by halves** before the final pass, because a single big downscale aliases in browsers that ignore `imageSmoothingQuality` (Firefox) and shrinking a photo to ~500 px is the main use case.
- Pure logic lives in `resizeGeometry.ts` (unit-testable without a canvas), like `cropGeometry.ts` / `sampleColor.ts`.
- `'resize'` is added to `TOOLS_BLOCKING_HISTORY`: the typed values are uncommitted state derived from the current canvas, so an undo mid-edit would leave them stale (same reasoning as Crop's custom-size fields).
- Implemented directly (no subagents/worktrees): one cohesive feature, nothing to parallelize.

## Checklist
- [x] Baseline `npm test` before any change — 95/95
- [x] `src/features/resize/resizeGeometry.ts` + `tests/resizeGeometry.test.ts`
- [x] `src/features/resize/applyResize.ts` + `tests/applyResize.test.ts`
- [x] `src/features/resize/ResizeTool.tsx`
- [x] Wire-up: `types/index.ts` (`ToolName`), `Toolbar.tsx`, `CanvasStage.tsx`, `HistoryControls.tsx`, `App.css`
- [x] `npm run build && npm run lint && npm test` clean
- [x] Real-pixel check against a real canvas implementation (scratchpad only, not a project dependency)
- [x] `npm run dev` boot check
- [x] Result section below + tick `tasks/todo.md`

## Result
Built and verified; changes are in the working tree, **not committed**.

What shipped:
- **Resize tool** (left rail, after Crop). Sidebar has a Pixels | Percent toggle, a "Current size" line, a live "New size" readout, and Apply Resize / Cancel. Pixels mode has Width/Height fields plus **Lock aspect ratio** (default on; untick to stretch to an exact size like 500×600). Percent mode scales both axes by one number. Enter applies. Apply is disabled when the input is invalid, unchanged from the current size, or above 8192 px per side (with a hint for the last case). One undoable step; closes the tool like Crop.
- New: `src/features/resize/{resizeGeometry,applyResize,ResizeTool}.ts(x)`, `tests/resizeGeometry.test.ts`, `tests/applyResize.test.ts`. Touched: `types/index.ts`, `Toolbar.tsx`, `CanvasStage.tsx`, `HistoryControls.tsx` (`'resize'` added to `TOOLS_BLOCKING_HISTORY`), `App.css`.
- Refinement vs the plan: in the step-down loop only axes more than 2× too large are halved; an axis being upscaled is left alone until the final pass (avoids upscaling in intermediate steps).

Verification:
- `npm run build` (includes `tsc -b`) clean; `npm run lint` only the same 4 pre-existing `only-export-components` warnings; `npm test` **131/131** (up from 95, +36).
- Real-pixel check in the scratchpad against `@napi-rs/canvas` (Skia; not added to this repo): 50%, 12.5% (step-down chain), 200%, 500×600, and a mixed shrink/grow (100×450) all produced the exact dimensions, correct quadrant colours, and preserved a fully transparent region; two consecutive resizes on one canvas also correct.
- `npm run dev` boots cleanly and every new/changed module transforms (HTTP 200).

**Not verified:**
- Interactive behaviour in a real browser (lock/unlock feel, typing into fields, Apply → undo/redo, layout of the sidebar): no browser-automation tool available, as in every prior round.
- **The benefit of the step-down loop.** It is correct, but I could not reproduce the aliasing it is meant to prevent: Skia averaged a 16× checkerboard reduction to flat grey in a single pass too, even with the quality hint suppressed. The motivation (browsers such as Firefox that ignore `imageSmoothingQuality`) is standard practice but untested here. If it ever proves unnecessary it is ~10 lines to remove (`halveToward` + the `while` loop in `applyResize.ts`, and the chain cases in `tests/applyResize.test.ts`).
