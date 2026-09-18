# Brush size indicator: cursor outline + sidebar preview

## Context
The Brush tool had a size slider (1–50) but no visual feedback for how big the brush actually is — a static `'crosshair'` cursor regardless of size, and only the raw number in the sidebar. User asked for either a component showing the size or portraying it via the cursor; both were cheap enough to do together.

## What was built
- `src/features/brush/brushCursor.ts` (new): pure `buildBrushCursor(diameterCss)` — builds a CSS custom cursor as a data-URI SVG circle (black outline + white outline on top, the same two-tone technique `SelectionTool.tsx`'s marching-ants border already uses for cross-background visibility), clamped to 6–120px, with a `crosshair` fallback.
- `src/features/brush/BrushTool.tsx`: the pointer-wiring effect now computes `size / getCanvasScale(overlay)` (buffer pixels → CSS pixels — the inverse of how `CropOverlay.tsx` uses the same helper) and sets the overlay's cursor to that circle, recomputed whenever `size` changes and on window resize. Added a small live circle preview (`brush-controls__size-preview`) next to the Size slider in the sidebar, capped at 40px so it doesn't affect layout.
- `src/App.css`: `.brush-controls__size-row` / `.brush-controls__size-preview`.
- `tests/brushCursor.test.ts` (new): 5 cases covering the SVG shape, hotspot centering, and both clamp bounds.

## Verification
- `npm run build`, `npm run lint`, `npm test` — clean, 95/95 tests (up from 90, +5 new).
- `npm run dev` boot check only — no browser-automation tool available this session, so the actual cursor appearance/feel wasn't independently verified interactively.

## Note on process
Implemented directly (no subagent/worktree) — contained entirely to the Brush feature, no shared "every tool touches this" files this time.
