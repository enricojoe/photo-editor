# Bug fixes: dropzone still half-width, crop handles inconsistent size

## Context
Two bugs reported against the previous round of changes, both root-caused and fixed directly (mechanical fixes with an unambiguous correct answer — no design decisions needed, so no plan-mode detour):

1. The empty-state dropzone still only took up about half the main content area (screenshot showed a card ending mid-screen with a large empty dark region to its right), despite `.image-dropzone` already having `flex: 1`.
2. The crop tool's corner/edge handles varied in on-screen size — sometimes tiny, sometimes normal — depending on which image was loaded.

## Bug 1: dropzone still half-width
**Root cause:** `src/features/canvas/CanvasStage.tsx` renders `<div className="canvas-stage__column" hidden={!hasImage}>` to hide the canvas layers when no image is loaded. But `src/App.css`'s `.canvas-stage__column` rule sets `display: flex` unconditionally. Author CSS always outranks the browser's built-in `[hidden] { display: none }` rule regardless of selector specificity (origin/importance is checked before specificity in the cascade), so the `hidden` attribute was silently defeated — the column (containing two default 300×150 `<canvas>` elements, since they're unsized before an image loads) stayed in the flex layout as a second flex item next to `.image-dropzone`, splitting `.canvas-stage`'s width roughly in half between them.

**Fix:** added
```css
.canvas-stage__column[hidden] {
  display: none;
}
```
right after the `.canvas-stage__column` rule in `src/App.css`. Now the column is fully removed from layout when hidden, and `.image-dropzone` (still `flex: 1`, the sole flex item) fills the entire row.

## Bug 2: crop handles inconsistent size
**Root cause:** `loadImage.ts` sets `canvas.width`/`canvas.height` to the image's *native* pixel resolution (no downscaling — see its doc comment). Display size is capped by CSS (`.canvas-stage__base { max-width: 100%; max-height: 80svh; height: auto; }`), so the ratio between canvas buffer pixels and on-screen CSS pixels varies a lot by image resolution (e.g. a 4000px-wide photo scaled down to ~800px CSS width has a ~5x buffer-to-CSS ratio; a small image displayed near-native has ~1x). The crop handles were drawn and hit-tested using fixed *buffer-pixel* sizes (`CORNER_HANDLE_SIZE = 16`, `EDGE_HANDLE_SIZE = 10` in `CropOverlay.tsx`; `HANDLE_HIT_RADIUS`/`CORNER_HANDLE_HIT_RADIUS` in `cropGeometry.ts`), so the same code drew visually tiny handles for high-res photos and normal-looking ones for smaller images — exactly the "sometimes small, sometimes bigger" behavior reported.

**Fix:**
- Added `getCanvasScale(canvas)` to `src/features/canvas/coords.ts` — returns buffer-pixels-per-CSS-pixel (`canvas.width / canvas.getBoundingClientRect().width`), mirroring the scale math `pointerToCanvasPoint` already used for pointer coordinates.
- `cropGeometry.ts`'s `hitTestHandle` now takes an optional `scale` param (default `1`, so the existing tests in `tests/cropGeometry.test.ts` are untouched) and multiplies the hit radius by it.
- `useCrop.ts`'s `handlePointerDown` now passes `getCanvasScale(canvas)` into `hitTestHandle`.
- `CropOverlay.tsx`'s draw effect now computes `scale = getCanvasScale(overlay)` and multiplies the drawn handle size by it, so handles render at a constant ~16/10 CSS-pixel size regardless of the loaded image's resolution. Hit-testing and drawing now share the same scale logic, so the clickable area always matches what's drawn.

## Files touched
- `src/App.css`
- `src/features/canvas/coords.ts`
- `src/features/crop/cropGeometry.ts`
- `src/features/crop/useCrop.ts`
- `src/features/crop/CropOverlay.tsx`

## Verification
- `npm run build`, `npm run lint` (only pre-existing unrelated `EditorContext.tsx` warnings), `npm test` (50/50 passing, including `cropGeometry.test.ts`'s `hitTestHandle` calls which rely on the new `scale` param defaulting to `1`).
- Dev server smoke-tested via curl (200 OK, no transform errors). No browser automation tool available this session, so the actual visual fix (dropzone filling the page; handles staying a consistent size across different image resolutions) should be eyeballed with `npm run dev`.

## Known limitation (not fixed, out of scope)
Crop handle scale is only recomputed when the crop rect or aspect-ratio preset changes (the draw effect's dependencies). If the browser window is resized while the crop tool is open without moving the rect, handle size will lag until the next redraw. Not fixed since it wasn't reported and would need a `ResizeObserver` — flagging here in case it comes up later.
