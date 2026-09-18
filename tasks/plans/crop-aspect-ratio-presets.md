# Crop Tool — Aspect Ratio Presets

## Context

The photo editor's crop tool currently only supports free-form rectangles (drag-to-draw, 8 resize handles, move). The user asked for preselect sizes — "1x1, 4x3, 16x9, etc." — so a crop can be locked to a common aspect ratio instead of always being freeform. This adds a preset row (`Free`, `1:1`, `4:3`, `3:2`, `16:9`) to the existing crop UI and constrains the drag/resize math accordingly. `3:2` is added alongside the three the user named since it's an equally common ratio and rounds out the set without bloating it.

The design below was produced and then independently hand-verified (traced against concrete numeric examples, including boundary cases) by a Plan subagent that read the live source files in full before proposing anything — not guessed from the abridged version I had in mind.

## Approach

**Simplification that keeps this tractable:** when a ratio is locked, only the 4 corner handles (`nw`, `ne`, `se`, `sw`) remain draggable for resizing; the 4 edge handles (`n`, `e`, `s`, `w`) are hidden and not hit-tested. Dragging a single edge with a locked ratio is inherently ambiguous about which direction the perpendicular dimension should grow, and many real crop tools handle locked ratios the same way. This composes for free with the existing state machine: a click at a suppressed edge-handle position simply falls through to `isInsideRect` (inclusive of boundary points) and is treated as a **move** — no new interaction mode needed. The only UX trade-off is losing a ~10px flat-edge grab band while locked, which is minor and easily relearned.

### New pure geometry (`src/features/crop/cropGeometry.ts`)

Two private helpers, reused by both new exported functions:

```ts
function fitWithinRatio(boxW: number, boxH: number, ratio: number): { width: number; height: number } {
  if (boxW > boxH * ratio) return { width: boxH * ratio, height: boxH } // box wider than ratio -> height-driven
  return { width: boxW, height: boxW / ratio } // width-driven
}

function minRectForRatio(ratio: number): { width: number; height: number } {
  const height = ratio >= 1 ? MIN_CROP_SIZE : MIN_CROP_SIZE / ratio
  return { width: height * ratio, height }
}

export const CORNER_HANDLES: CropHandle[] = ['nw', 'ne', 'se', 'sw']
```

`aspectConstrainedRect(anchorX, anchorY, pointerX, pointerY, ratio, imageWidth, imageHeight): CropRect` — replaces `normalizeRect` for corner-resize and draw-new when a ratio is locked:

```ts
export function aspectConstrainedRect(anchorX, anchorY, pointerX, pointerY, ratio, imageWidth, imageHeight): CropRect {
  const signX = pointerX >= anchorX ? 1 : -1
  const signY = pointerY >= anchorY ? 1 : -1
  const rawW = Math.abs(pointerX - anchorX)
  const rawH = Math.abs(pointerY - anchorY)

  let { width, height } = fitWithinRatio(rawW, rawH, ratio)

  const floor = minRectForRatio(ratio)
  if (width < floor.width) ({ width, height } = floor)

  const maxW = signX > 0 ? imageWidth - anchorX : anchorX
  const maxH = signY > 0 ? imageHeight - anchorY : anchorY
  if (width > maxW || height > maxH) ({ width, height } = fitWithinRatio(maxW, maxH, ratio))

  const x = signX > 0 ? anchorX : anchorX - width
  const y = signY > 0 ? anchorY : anchorY - height
  return { x, y, width, height }
}
```

Why this is bounds-safe without any post-hoc clamping: the anchor is always a point already inside `[0,W]x[0,H]` (a rect corner, or a `clampPoint`-ed click), and `fitWithinRatio` always returns `width <= boxW` and `height <= boxH` for whatever box it's given — so contain-fitting against `(rawW, rawH)` is automatically in-bounds. The one gap (also caught and fixed): the `MIN_CROP_SIZE` floor bump can push the rect back out of bounds when the anchor sits near an edge with little room — fixed by re-running the same `fitWithinRatio` against the true room available (`maxW`/`maxH`, the anchor-to-image-edge distance) as a final pass. This can legitimately yield a rect smaller than `MIN_CROP_SIZE` in extreme corner cases — that already matches `normalizeRect`'s existing precedent of letting bounds override the size floor, and `CropOverlay`'s existing `canConfirm` check already guards against confirming a degenerate crop.

`applyAspectToExistingRect(rect, ratio, imageWidth, imageHeight): CropRect` — reshapes the *current* rect to a newly-selected ratio around its own center (used when the user switches presets mid-crop), rather than resetting to a default rect:

```ts
export function applyAspectToExistingRect(rect, ratio, imageWidth, imageHeight): CropRect {
  const cap = fitWithinRatio(imageWidth, imageHeight, ratio) // largest rect at this ratio that fits the whole image
  let width = Math.min(rect.width, cap.width)
  let height = width / ratio

  const floor = minRectForRatio(ratio)
  if (width < floor.width) ({ width, height } = floor)

  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const x = Math.min(Math.max(cx - width / 2, 0), Math.max(0, imageWidth - width))
  const y = Math.min(Math.max(cy - height / 2, 0), Math.max(0, imageHeight - height))
  return { x, y, width, height }
}
```

`cap` handles both directions (a rect needing to shrink because it's too wide, or too tall, for the new ratio) in one computation — no separate branch needed.

Both functions were hand-traced against several concrete cases (matching center-preserving reshape, letterboxing, MIN_CROP_SIZE floor in both wide/tall ratios, and the near-edge bounds case) — expected values are baked into the test list below.

### `src/features/crop/useCrop.ts`

- Add `aspectRatio: number | null` to `UseCropOptions`; destructure it.
- New effect (after the `interactionRef` line): when `aspectRatio` is non-null, reshape the existing rect via `applyAspectToExistingRect`. No-op when switching to Free (rect stays as-is, just unlocked).
  ```ts
  useEffect(() => {
    if (aspectRatio === null) return
    setRect((prev) => applyAspectToExistingRect(prev, aspectRatio, imageWidth, imageHeight))
  }, [aspectRatio, imageWidth, imageHeight])
  ```
- In `handlePointerDown`, filter the hit-tested handle down to corners-only when locked (keep `hitTestHandle` itself unchanged — it stays a pure, lock-agnostic geometric hit-test):
  ```ts
  const rawHandle = hitTestHandle(point, rect)
  const handle = rawHandle && (aspectRatio === null || CORNER_HANDLES.includes(rawHandle)) ? rawHandle : null
  ```
- In `handlePointerMove`'s `resizing` branch: when a ratio is locked, derive the fixed anchor corner from `edges.left`/`edges.top` (the corner diagonally opposite the dragged one) and call `aspectConstrainedRect` instead of `normalizeRect`:
  ```ts
  if (aspectRatio === null) {
    setRect(normalizeRect(left, top, right, bottom, imageWidth, imageHeight))
  } else {
    const anchorX = edges.left ? interaction.fixedRight : interaction.fixedLeft
    const anchorY = edges.top ? interaction.fixedBottom : interaction.fixedTop
    setRect(aspectConstrainedRect(anchorX, anchorY, point.x, point.y, aspectRatio, imageWidth, imageHeight))
  }
  ```
- In the `drawing-new` branch: same substitution, anchor is `interaction.anchorX/Y`.
- Add `aspectRatio` to both `useCallback` dependency arrays (`handlePointerDown`, `handlePointerMove`).

### `src/features/crop/CropOverlay.tsx`

- Add the preset list and local state:
  ```ts
  const CROP_PRESETS: { label: string; value: number | null }[] = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
    { label: '16:9', value: 16 / 9 },
  ]
  ```
  `const [aspectRatio, setAspectRatio] = useState<number | null>(null)`, passed into `useCrop({ imageWidth, imageHeight, aspectRatio })`.
- Handle-drawing effect: only draw `CORNER_HANDLES` positions when locked (all 8 when Free); add `aspectRatio` to its dependency array.
- Render a new preset button row above the existing `crop-controls` (wrap the return in a Fragment since `CanvasStage.tsx` already lays out `CropOverlay`'s output as a flex child with `gap: 12px`, so no extra spacing work needed):
  ```tsx
  <div className="crop-presets" role="group" aria-label="Aspect ratio">
    {CROP_PRESETS.map((preset) => (
      <button
        key={preset.label}
        type="button"
        className={aspectRatio === preset.value ? 'crop-presets__button crop-presets__button--active' : 'crop-presets__button'}
        aria-pressed={aspectRatio === preset.value}
        onClick={() => setAspectRatio(preset.value)}
      >
        {preset.label}
      </button>
    ))}
  </div>
  ```
  `aria-pressed` on every button (not just the active one) is the correct ARIA pattern for a toggle-button group. `handleConfirm`/`handleCancel`/`canConfirm` are untouched — `rect` already reflects the ratio constraint by the time they read it.

### CSS (`src/App.css`)

Add near `.crop-controls`, following the codebase's existing conventions (BEM-ish naming, CSS variables, minimal custom chrome — only the active state gets custom styling, matching how no other button in the app has custom resting-state styling):

```css
.crop-presets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.crop-presets__button--active {
  background-color: var(--text-h);
  color: var(--bg);
  border-color: var(--text-h);
}
```

## Verification

**Automated:** add to `tests/cropGeometry.test.ts` (new `describe` blocks for `CORNER_HANDLES`, `aspectConstrainedRect`, `applyAspectToExistingRect`) — cases covering: exact-ratio drag box, letterboxing to the shorter raw dimension, growth in any drag direction/quadrant, `MIN_CROP_SIZE` floor for both wide and tall ratios, the near-image-edge case where even the floor must shrink, center-preserving reshape on preset switch, the reverse-direction reshape (rect too wide for the new ratio), and "already conforms, unchanged." Run `npm test`.

**Manual, in a real browser** (this project has no `chromium-cli`; use the already-installed Playwright + the existing `test-image.png` fixture from prior phases, same pattern as every previous phase's verification):
- Load an image, enter crop, click `1:1`: draw a new rect by dragging — confirm the resulting crop is a perfect square (width === height) via `canvas.width`/`canvas.height` after Confirm.
- With a rect already drawn under `Free`, click `4:3`: confirm the rect reshapes in place (center roughly preserved) rather than resetting.
- Click `16:9`, drag a corner handle: confirm width/height maintain the 16:9 ratio (within rounding) after the drag, and that the 4 edge handles are no longer drawn/draggable.
- Click `Free`: confirm edge handles reappear and unconstrained resizing works exactly as before (regression check).
- Also run the full existing crop regression (draw/resize/move/cancel) to confirm nothing in the Free path broke.

Also run `npm run build` and `npm run lint` (project already has zero warnings besides one pre-existing, unrelated Fast Refresh warning on `EditorContext.tsx`).

## Critical Files
- `src/features/crop/cropGeometry.ts` — new pure functions
- `src/features/crop/useCrop.ts` — lock-aware resize/draw-new + reshape-on-preset-change effect
- `src/features/crop/CropOverlay.tsx` — preset button row + lock-aware handle drawing
- `tests/cropGeometry.test.ts` — new test cases
- `src/App.css` — preset row styling

## Review / Result

Implemented as planned. One deviation from the original plan, caught by `oxlint`: the plan had `useCrop` react to `aspectRatio` changes via a `useEffect` that called `setRect`. `oxlint`'s `react/set-state-in-effect` rule flagged this (same class of issue fixed earlier in `ProjectManagerPanel.tsx`) — synchronizing state from an effect when the change actually originates from a specific user action (clicking a preset button) causes an unnecessary extra render. Fixed by moving `aspectRatio` state ownership into `useCrop` itself and exposing a `setAspectRatio(ratio)` function that updates both `aspectRatio` and reshapes `rect` synchronously in the same call — invoked directly from the preset button's `onClick`, no effect involved.

All other geometry (bounds-safety of `aspectConstrainedRect`, the `applyAspectToExistingRect` center-preserving reshape, corner-only handles when locked) matched the hand-verified plan exactly — 12 new Vitest cases pass, plus real-browser verification: reshape-in-place on preset switch, square/16:9 drag-to-crop producing correctly-ratioed output, only 4 handles drawn/draggable when locked vs. 8 under Free, and the pre-existing Free-mode crop regression still passes unchanged.

Total: 40 unit tests passing, clean build, clean lint (only the pre-existing unrelated `EditorContext.tsx` Fast Refresh warning).
