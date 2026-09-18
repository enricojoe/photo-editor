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
- [x] Agent A — Rotate/Flip tool: new `src/features/transform/applyTransform.ts` (rotate ±90° via offscreen-canvas roundtrip, flip horizontal/vertical) + `RotateTool.tsx` (4 buttons, immediate commit, `pushSnapshot()` per action, resizes overlay + `IMAGE_LOADED` + clears selection); `ToolName` gains `'rotate'`; Toolbar button after Crop; CanvasStage branch; `.rotate-controls` CSS. Rotation/flip direction verified by hand (both rotate directions and both flip axes correct). Build/lint/test verified (82/82).
- [x] Agent B — Color Picker tool: `EditorContext.tsx` gains `pickedColor: string | null` + `SET_PICKED_COLOR`; `hexColor.ts` gains `rgbToHex`; new `src/features/colorPicker/sampleColor.ts` (pure `sampleHexColor` — clamp+read+convert, unit-testable without a real canvas) + `ColorPickerTool.tsx` (click/drag to sample from the base canvas via continuous pointer sampling, no pixel mutation, no history interaction); `ToolName` gains `'colorPicker'`, grouped into the existing "Colour" toolbar section; CanvasStage branch; `.color-picker-controls` CSS; one-line consumer updates in `BucketFillTool.tsx`/`BrushTool.tsx`/`WatermarkTool.tsx` to default from `pickedColor`. Build/lint/test verified (83/83).
- Both told upfront to expect a small "sibling addition" merge conflict in `types/index.ts` / `Toolbar.tsx` / `CanvasStage.tsx` / `App.css` — in practice even `types/index.ts` auto-merged cleanly this round (the multi-line `ToolName` union format from the last round meant each agent's new line landed at a different line number).

### Merge
- [x] Merged `feat/rotate-flip` (fast-forward, no conflicts) then `feat/color-picker` (auto-merged cleanly, zero manual conflict resolution needed) into `main`.
- [x] `npm run build && npm run lint && npm test` on merged `main` — clean, 90/90 tests; both worktrees/branches removed.

### Final verification
- [x] Full build/lint/test on final `main` — clean build, only the same 4 pre-existing `only-export-components` warnings, 90/90 tests passing.
- [x] `npm run dev` boot check — boots cleanly, no console/runtime errors. **Not done**: real interactive click-through (rotate/flip visually correct, dragging the color picker across the image, picked color actually showing up in Bucket Fill/Brush/Watermark) — no browser-automation tool available this session.
- [x] Updated master `tasks/todo.md`.

## Result
All work landed on `main` (`f8d648e` Rotate/Flip, `82b1d78` Color Picker, merge `f7f8ab8`). Final state: build clean, lint clean (only pre-existing warnings), 90/90 tests passing (up from 75 at the start of this round: +7 rotate/flip, +8 color picker).

What shipped:
- **Rotate & Flip tool**: Rotate Left/Right (90° increments) and Flip Horizontal/Vertical, each committing immediately as its own undo step; correctly resizes the canvas and clears any stale selection.
- **Color Picker tool**: click or drag anywhere on the image to sample a pixel's color; the sampled hex is stored in shared state (`EditorState.pickedColor`) and now becomes the starting color the next time you open Bucket Fill, Brush, or Watermark's text mode — delivering the "compounds on existing tools" value behind the original recommendation, not just a standalone swatch inspector.

**Not independently verified**: real interactive browser behavior (rotate/flip visual correctness, drag-sampling feel, picked color actually flowing into the other tools) — no browser-automation tool available this session, consistent with every prior round. The dev server does boot with no errors.
