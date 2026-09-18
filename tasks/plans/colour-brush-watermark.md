# Bucket-fill-clickable undo/redo, "Colour" tool group + Brush, Watermark

## Context
Three new requests:
1. Undo/Redo buttons were disabled whenever ANY tool was active. The user wants to click Undo/Redo while Bucket Fill is open, to undo an individual fill without leaving the tool.
2. A new "Colour" group in the left toolbar containing Bucket Fill plus a brand-new Brush (freehand paint) tool.
3. A brand-new Watermark tool, supporting both text and image/logo watermarks with free-drag placement (confirmed via clarifying questions).

## Design decisions
- `Selection.shapeData` (`src/features/selection/selectionGeometry.ts`) stores the original vector shape (rect or lasso points), so Brush constrains strokes to the active selection via native `ctx.clip()` — no per-pixel masking needed.
- Extracted `hexToRgba`/`normalizeHex` (previously private to `BucketFillTool.tsx`) into `src/lib/hexColor.ts` so Brush and Watermark reuse the same hex-color parsing instead of tripling it.
- `applyWatermarkToCanvas` follows the existing `applyCropToCanvas`/`applyColorFilterToCanvas` naming convention.
- Undo/redo blocking changed from "any active tool" to a blacklist of tools with genuinely uncommitted/async in-progress state (`crop`, `colorAdjust`, `backgroundRemoval`, later `watermark`). Every atomic-commit tool (`none`, `selection`, `bucketFill`, `brush`) allows undo/redo — this both fixes the literal Bucket Fill ask and correctly extends to Brush/Selection.

## Checklist

### Step 0 — direct fixes (no subagent, single-file/trivial)
- [x] `src/lib/hexColor.ts` — new shared module; `BucketFillTool.tsx` updated to import from it instead of defining locally.
- [x] `src/components/HistoryControls.tsx` — `TOOLS_BLOCKING_HISTORY: ToolName[] = ['crop', 'colorAdjust', 'backgroundRemoval']` blacklist replaces the old "any tool" gate, used for both buttons and the keyboard shortcut.
- [x] Verified build/lint/test (69/69) before spawning feature agents.

### Step 1 — two parallel subagents (isolated worktrees)
- [x] Agent A — "Colour" group + Brush tool: `ToolName` gains `'brush'`; new `src/features/brush/BrushTool.tsx` + `drawBrushStroke.ts` (color + size 1–50, selection-clipped freehand paint directly on the base canvas via `ctx.clip()` built from `selection.shapeData`, one `pushSnapshot()` per stroke via `pointerdown`, `setPointerCapture` so a stroke doesn't drop if the cursor leaves the overlay); `Toolbar.tsx` groups Bucket Fill + Brush under a "Colour" label; `CanvasStage.tsx` gets the `'brush'` branch; `App.css` additions (`.toolbar__group`, `.toolbar__group-label`, `.brush-controls`). Build/lint/test verified (71/71).
- [x] Agent B — Watermark tool: `ToolName` gains `'watermark'`; new `src/features/watermark/applyWatermark.ts` (`WatermarkOptions` discriminated union text/image, shared `drawWatermark` used for both live overlay preview and final bake so they can't drift) + `WatermarkTool.tsx` (text/image mode toggle reusing `.selection-shape-toggle`, free-drag placement — click/drag anywhere on the overlay moves the watermark, clamped to canvas bounds, no hit-testing — opacity/size sliders, Apply disabled until there's real content, Cancel discards); extracted `decodeImage` out of `loadImage.ts` into `src/lib/decodeImage.ts` for reuse by the logo upload; `Toolbar.tsx`/`CanvasStage.tsx` additions; added `'watermark'` to `TOOLS_BLOCKING_HISTORY`. Build/lint/test verified (73/73).
- Both agents were told upfront to expect a small "sibling addition" merge conflict in `types/index.ts` / `Toolbar.tsx` / `CanvasStage.tsx` — in practice only `types/index.ts` actually conflicted (both branches edited the same union-type line); `Toolbar.tsx`/`CanvasStage.tsx`/`App.css` auto-merged cleanly since the two agents' insertions landed at different lines.

### Merge
- [x] Merged `feat/colour-brush-group` (fast-forward, no conflicts) then `feat/watermark` into `main` (one conflict in `types/index.ts`'s `ToolName` union, resolved by keeping both new members and reformatting to a multi-line union for readability).
- [x] `npm run build && npm run lint && npm test` on merged `main` — clean, 75/75 tests; both worktrees/branches removed.

### Final verification
- [x] Full build/lint/test on final `main` — clean build, only the same 4 pre-existing `only-export-components` warnings, 75/75 tests passing.
- [x] `npm run dev` — boots cleanly with no console/runtime errors. **Not done**: an actual interactive click-through (dragging the watermark, painting with the brush, confirming selection-clipping visually) — no browser-automation tool was available this session, same caveat as prior rounds.
- [x] Updated master `tasks/todo.md`.

## Result
All work landed on `main` (`c0df51d` Colour/Brush, `f60fcd7` Watermark, merge `64cb87f`, plus the prep commit `6bef589`). Final state: build clean, lint clean (only pre-existing warnings), 75/75 tests passing (up from 69 at the start of this round: +2 brush, +4 watermark).

What shipped:
- **Undo/redo now works during Bucket Fill** (and Selection/Brush, as a natural consequence of the correct fix): `HistoryControls.tsx` now blocks only tools with genuinely uncommitted/async state (`crop`, `colorAdjust`, `backgroundRemoval`, `watermark`) instead of blocking on any active tool.
- **"Colour" toolbar group**: Bucket Fill + new **Brush** tool (freehand paint, adjustable color/size, respects the active selection via canvas clipping) grouped under a "Colour" label in the left rail.
- **Watermark tool**: text or uploaded logo image, freely draggable placement, adjustable opacity/size, live preview on the overlay before baking in via Apply.

**Not independently verified**: real interactive browser behavior (drag feel, brush strokes, selection clipping visually correct) — no browser-automation tool available this session. The dev server does boot with no errors. Worth a `npm run dev` click-through to confirm feel.
