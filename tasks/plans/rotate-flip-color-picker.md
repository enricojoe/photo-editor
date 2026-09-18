# Rotate/Flip tool + Color Picker tool

## Context
Follow-up to the user asking what else the editor needed — recommended a Rotate/Flip tool (obvious gap: Crop exists but no orientation fix/mirror) and an Eyedropper/Color Picker (cheap, compounds on the color tools already shipped: Bucket Fill, Brush, Watermark). User asked for both.

## Design decisions
- `applyTransformToCanvas(canvas, options)` follows the established `applyXToCanvas` naming convention (`applyCropToCanvas`, `applyColorFilterToCanvas`, `applyWatermarkToCanvas`), with the same `createCanvas` injection param for testability.
- Both new tools are immediate/atomic (no drag-preview state) — like Bucket Fill/Brush, not Crop/ColorAdjust — so no `TOOLS_BLOCKING_HISTORY` entry needed for either.
- Rotate changes canvas dimensions → resize overlay + `dispatch(IMAGE_LOADED)` + clear selection, same pattern undo/redo's `restoreSnapshot` already uses.
- Color Picker feeds a shared `EditorState.pickedColor` so Bucket Fill/Brush/Watermark's color inputs default to the last sampled color (their `useState` initializer re-reads it fresh each time the tool remounts) — delivers the "compounds on existing tools" value, not just a standalone swatch inspector.
- `rgbToHex` added to the existing `src/lib/hexColor.ts` (alongside `hexToRgba`/`normalizeHex` from the last round) rather than a new module.

## Checklist

### Two parallel subagents (isolated worktrees)
- [ ] Agent A — Rotate/Flip tool: new `src/features/transform/applyTransform.ts` (rotate ±90°, flip horizontal/vertical) + `RotateTool.tsx` (4 buttons, immediate commit, `pushSnapshot()` per action); `ToolName` gains `'rotate'`; Toolbar button after Crop; CanvasStage branch; `.rotate-controls` CSS.
- [ ] Agent B — Color Picker tool: `EditorContext.tsx` gains `pickedColor: string | null` + `SET_PICKED_COLOR`; `hexColor.ts` gains `rgbToHex`; new `src/features/colorPicker/ColorPickerTool.tsx` (click/drag to sample from the base canvas, no pixel mutation, no history interaction); `ToolName` gains `'colorPicker'`, grouped into the existing "Colour" toolbar section; CanvasStage branch; `.color-picker-controls` CSS; one-line consumer updates in `BucketFillTool.tsx`/`BrushTool.tsx`/`WatermarkTool.tsx` to default from `pickedColor`.
- Both told upfront to expect a small "sibling addition" merge conflict in `types/index.ts` / `Toolbar.tsx` / `CanvasStage.tsx` / `App.css`.

### Merge
- [ ] Merge `feat/rotate-flip` then `feat/color-picker` into `main`, resolve expected conflicts by keeping both sides.
- [ ] `npm run build && npm run lint && npm test` on merged `main`; remove worktrees/branches.

### Final verification
- [ ] Full build/lint/test on final `main`.
- [ ] `npm run dev` boot check (no browser-automation tool available — disclose, not a real click-through).
- [ ] Update master `tasks/todo.md`.

## Result
_(filled in after completion)_
