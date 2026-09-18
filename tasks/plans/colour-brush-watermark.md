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
- [ ] Agent A — "Colour" group + Brush tool: `ToolName` gains `'brush'`; new `src/features/brush/BrushTool.tsx` + `drawBrushStroke.ts` (color + size, selection-clipped freehand paint directly on the base canvas, one `pushSnapshot()` per stroke); `Toolbar.tsx` groups Bucket Fill + Brush under a "Colour" label; `CanvasStage.tsx` gets the `'brush'` branch; `App.css` additions.
- [ ] Agent B — Watermark tool: `ToolName` gains `'watermark'`; new `src/features/watermark/applyWatermark.ts` (shared `drawWatermark` used for both live preview and bake) + `WatermarkTool.tsx` (text/image mode toggle, free-drag placement, opacity/size, Apply/Cancel); extracts `decodeImage` out of `loadImage.ts` into `src/lib/decodeImage.ts` for reuse; `Toolbar.tsx`/`CanvasStage.tsx` additions; adds `'watermark'` to `TOOLS_BLOCKING_HISTORY`.
- Both agents were told upfront to expect a small "sibling addition" merge conflict in `types/index.ts` / `Toolbar.tsx` / `CanvasStage.tsx`.

### Merge
- [ ] Merge `feat/colour-brush-group` then `feat/watermark` into `main`, resolving the expected small conflicts by keeping both sides' additions.
- [ ] `npm run build && npm run lint && npm test` on merged `main`; remove both worktrees/branches.

### Final verification
- [ ] Full build/lint/test on final `main`.
- [ ] `npm run dev` boot check (no browser-automation tool available this session — not a real interactive click-through, call that out explicitly).
- [ ] Update master `tasks/todo.md`.

## Result
_(filled in after completion)_
