# Left Tool Rail + Selection Tool (Rectangle + Lasso)

## Context

Two corrections/additions to the photo editor, given after the previous pass (right-side tool-options sidebar + whole-app style refresh):

1. The "move the menu to the right" request from last time was a miscommunication — what the user actually wants on a side is the **toolbar itself** (Load Image / Crop / Bucket Fill / Remove Background / Export PNG / Projects), moved into a **left** vertical rail, Photoshop-style. The right-side sidebar (crop presets, bucket-fill controls, etc. — the *options* for whichever tool is active) stays exactly where the last pass put it; only the tool-switcher buttons move.
2. A new **Selection** tool, "like Photoshop": rectangular marquee **and** freehand lasso (both, confirmed by the user), used to (a) constrain Bucket Fill to the selected region and (b) delete/clear the selected pixels. "Move the selection" was explicitly offered and declined — not in scope.

This plan was produced by directly reading every touched file, then independently validated by a Plan subagent given the same files plus the harder algorithmic piece (lasso rasterization) to hand-verify against concrete pixel-level traces. One refinement was made on top of the subagent's design after review (described in the Types section below) to avoid a redundant type; everything else below reflects the reviewed, agreed design.

## Part A — Left tool rail

### Layout

Minimal-diff: wrap the *existing* `Toolbar` and `ProjectManagerPanel` components (unchanged internally, aside from one new button in Toolbar for Selection) in a new `<aside className="rail">`, sibling to `<main>` inside a new `.app__body` flex-row wrapper. No new component file — `App.tsx` is small enough that a dedicated `Rail.tsx` would be pure indirection.

**`src/App.tsx`**:
```tsx
<div className="app">
  <header className="app__header"><h1>Photo Editor</h1></header>
  <div className="app__body">
    <aside className="rail" aria-label="Tools and projects">
      <Toolbar />
      <ProjectManagerPanel />
    </aside>
    <main className="app__main">
      <CanvasStage />
    </main>
  </div>
</div>
```

### CSS (`src/App.css`)

```css
.app__body {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
}

.app__main {
  min-width: 0; /* NEW — see gotcha #2 below */
  /* ...existing flex/align/justify/padding unchanged */
}

.rail {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 12px;
  background: var(--bg);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
```

Modify `.toolbar` (was a horizontal top bar, now a rail column — buttons already stretch full-width for free via flex-column's default `align-items: stretch`, same trick used for `.crop-controls`):
```css
.toolbar {
  display: flex;
  flex-direction: column;   /* was: row + flex-wrap */
  align-items: stretch;
  gap: 8px;
  padding: 0;                /* was: 8px 20px — rail now owns spacing */
  border-bottom: none;       /* was: 1px solid var(--border) */
  min-height: auto;
}
```

`.project-manager` becomes a rail item that anchors an absolutely-positioned flyout (not inline vertical growth — see rationale below):
```css
.project-manager {
  position: relative;
  padding: 0;
  border-top: 1px solid var(--border);
  margin-top: 8px;
  padding-top: 12px;
  border-bottom: none;
}

.project-manager__panel {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: 8px;
  margin-top: 0;
  width: 320px;
  max-width: calc(100vw - 240px);
  z-index: 20;
  /* flex-direction/gap/padding/background/border/radius/shadow unchanged */
}
```

Defensive-specificity rule for left-aligned rail button text (see gotcha #1 — a bare `.rail button` would tie, not beat, the existing `.app button` rule):
```css
.rail .toolbar button,
.rail .project-manager > button {
  justify-content: flex-start;
  text-align: left;
  padding-left: 14px;
}
```

Reuse the existing `720px` breakpoint (already established for "stack things vertically on narrow viewports" by the previous pass) rather than adding a new threshold:
```css
@media (max-width: 720px) {
  .app__body { flex-direction: column; }

  .rail {
    flex: none;
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1px solid var(--border);
    overflow-y: visible;
  }

  .toolbar { flex-direction: row; flex-wrap: wrap; }

  .rail .toolbar button,
  .rail .project-manager > button {
    justify-content: center;
    text-align: center;
    padding-left: 12px;
  }

  .project-manager { border-top: none; margin-top: 0; padding-top: 0; }

  .project-manager__panel {
    position: static;
    margin-top: 10px;
    margin-left: 0;
    width: auto;
    max-width: 100%;
  }

  /* existing rule, unchanged: */
  .canvas-stage__sidebar { flex: none; width: 100%; }
}
```

Fix the existing `480px` block, which currently double-pads once the rail owns its own padding:
```css
@media (max-width: 480px) {
  .app__header {           /* was: .app__header, .toolbar, .project-manager */
    padding-left: 12px;
    padding-right: 12px;
  }
  /* ...rest unchanged */
}
```

### Decision: Projects panel is a flyout, not inline rail growth

`.project-manager__item` is a wrapped row (40×40 thumbnail + name/timestamp + Load/Delete buttons) that already nearly fills its current 480px-max panel — squeezed into a ~176px rail content width it would wrap to 3–4 lines per saved project, turning a `max-height:240px` scrollable list into a cramped 1-item-visible stack. Inline growth would also push the tool buttons below it (Bucket Fill, Remove Background, Export PNG) down or off-screen while the panel is open, even though those buttons stay enabled/clickable at the same time (Projects and the tool buttons share the same `disabled={isToolActive}`-style gating, so hiding them isn't just cosmetic, it's a functional regression). The flyout is also *not* more implementation work — it's a pure CSS `position` change on the exact same panel markup, no new state or click-outside handling.

### CSS/layout gotchas

1. **Specificity tie, not a clean win.** `.app button` is `(0,1,1)`. A naive `.rail button {...}` override would *also* be `(0,1,1)` — an exact tie resolved by source order, which is fragile (this codebase already hit two outright *losing* specificity bugs in the prior pass — a bare `.btn-primary` and a bare `.crop-presets__button--active`, both `(0,1,0)` losing to `.app button`'s `(0,1,1)`). Fix: use `.rail .toolbar button` / `.rail .project-manager > button` (`(0,2,1)`), which unambiguously wins regardless of source order — same defensive pattern already used for `.crop-presets__button.crop-presets__button--active`.
2. **`.app__main` needs its own `min-width: 0`.** `.canvas-stage__column` already has this to defeat the classic flex trap (a flex item's default `min-width: auto` won't shrink below a large image's intrinsic size even with `max-width:100%` on the canvas). That fix only protects the `.canvas-stage` row. Adding `.app__body` as a *new* flex-row ancestor above it means `.app__main` (now itself a flex item) needs the same treatment one level up, or a large image can force horizontal overflow just above the 720px breakpoint.
3. Prune `.toolbar, .project-manager` from the existing `480px` selector list (shown above) or padding doubles.

## Part B — Selection tool

### Types

`src/features/selection/selectionGeometry.ts` owns all selection-specific types (mirrors how `CropRect`/`CropHandle` live in `crop/cropGeometry.ts`, not in `types/index.ts`) plus the two rasterization functions:

```ts
import type { Rect } from '../canvas/rectGeometry'

export interface SelectionPoint { x: number; y: number }
export type SelectionShape = 'rectangle' | 'lasso'

export type SelectionShapeData =
  | { shape: 'rectangle'; rect: Rect }
  | { shape: 'lasso'; points: SelectionPoint[] }

export interface Selection {
  /** Raw shape data, kept only so the tool can redraw an exact outline while active. */
  shapeData: SelectionShapeData
  /** length === imageWidth * imageHeight; 1 = selected. Full-image-sized so
   *  every consumer indexes it as plain y*imageWidth+x — same convention as
   *  floodFill's own `filled` marker grid. */
  mask: Uint8Array
  /** Tight bounding box — an iteration-efficiency helper for delete/redraw only.
   *  Never treat this as the selection itself; always consult `mask`. */
  bounds: Rect
}
```

`src/types/index.ts` re-exports and uses it:
```ts
import type { Selection } from '../features/selection/selectionGeometry'
export type { Selection }

export type ToolName = 'none' | 'crop' | 'selection' | 'bucketFill' | 'backgroundRemoval'

export interface EditorState {
  activeTool: ToolName
  imageWidth: number | null
  imageHeight: number | null
  selection: Selection | null
}
```
(One deliberate deviation from the subagent's draft: it proposed a separate `SelectionRect` interface duplicated in `types/index.ts` to keep that file import-free. Since `types/index.ts` importing a feature's type is not a layering inversion — nothing in `features/selection` imports back from `types/index.ts`, so there's no cycle — reusing `Rect` from `canvas/rectGeometry.ts` everywhere instead removes a redundant third rect-shaped type with no downside.)

**Full-image mask vs. bounds-relative storage — decision: full-image `Uint8Array`.** `floodFill.ts` already allocates an identically-sized `Uint8Array(width*height)` on *every single fill click* for its `filled` marker grid — this is an already-accepted allocation size in this codebase, smaller than the `getImageData()` RGBA buffer (4x larger) both flood fill and crop already materialize routinely. Bounds-relative storage would force every consumer's hot loop (flood fill's `matches()`, the delete loop) to translate coordinates on every pixel access, a real perf/complexity tax, to save memory only in the uncommon case of a tiny selection on a huge image. `bounds` is kept alongside purely as an iteration-efficiency helper, never as the source of truth.

### `src/state/EditorContext.tsx` — reducer + central invalidation

```ts
import type { EditorState, Selection, ToolName } from '../types'

type EditorAction =
  | { type: 'SET_ACTIVE_TOOL'; tool: ToolName }
  | { type: 'IMAGE_LOADED'; width: number; height: number }
  | { type: 'SET_SELECTION'; selection: Selection | null }

const initialState: EditorState = { activeTool: 'none', imageWidth: null, imageHeight: null, selection: null }

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool }
    case 'IMAGE_LOADED':
      return { ...state, imageWidth: action.width, imageHeight: action.height, selection: null }
    case 'SET_SELECTION':
      return { ...state, selection: action.selection }
    default:
      return state
  }
}
```
`IMAGE_LOADED` resetting `selection: null` is the *only* change needed for invalidation — all 4 existing dispatch sites (`useImageFileLoader.loadFile`, `CropOverlay.handleConfirm`, `BackgroundRemovalTool`'s success callback, `ProjectManagerPanel.handleLoad`) get this for free, zero edits needed at any of them. Reset unconditionally (not only when dimensions differ) — a mask is meaningless once underlying pixel content changes at all, even at coincidentally-identical dimensions.

### `src/features/canvas/rectGeometry.ts` — NEW, extracted from `cropGeometry.ts`

```ts
export interface Rect { x: number; y: number; width: number; height: number }

export const MIN_RECT_SIZE = 8

export function clampPoint(x: number, y: number, imageWidth: number, imageHeight: number): { x: number; y: number } {
  return { x: Math.min(Math.max(x, 0), imageWidth), y: Math.min(Math.max(y, 0), imageHeight) }
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number, imageWidth: number, imageHeight: number): Rect {
  let x = Math.min(x1, x2)
  let y = Math.min(y1, y2)
  let width = Math.max(Math.abs(x2 - x1), MIN_RECT_SIZE)
  let height = Math.max(Math.abs(y2 - y1), MIN_RECT_SIZE)
  x = Math.min(Math.max(x, 0), Math.max(0, imageWidth - width))
  y = Math.min(Math.max(y, 0), Math.max(0, imageHeight - height))
  width = Math.min(width, imageWidth - x)
  height = Math.min(height, imageHeight - y)
  return { x, y, width, height }
}
```

**`src/features/crop/cropGeometry.ts`** — replace the local `clampPoint`/`normalizeRect` bodies with a re-export, alias `MIN_CROP_SIZE`, leave every genuinely crop-specific export (`CropRect`, `CropHandle`, `HANDLE_EDGES`, `CORNER_HANDLES`, `defaultCropRect`, `handlePositions`, `hitTestHandle`, `isInsideRect`, `aspectConstrainedRect`, `applyAspectToExistingRect`, `fitWithinRatio`, `minRectForRatio`) untouched in place:
```ts
import { MIN_RECT_SIZE, clampPoint, normalizeRect } from '../canvas/rectGeometry'
export { clampPoint, normalizeRect }
export const MIN_CROP_SIZE = MIN_RECT_SIZE
// ...rest of file unchanged
```
`useCrop.ts` keeps importing `clampPoint`/`normalizeRect`/`MIN_CROP_SIZE` from `./cropGeometry` unchanged (re-export). `tests/cropGeometry.test.ts` needs zero changes — no new `rectGeometry.test.ts` either, since the existing tests already fully exercise this logic through the re-export and a duplicate file would add maintenance cost with no new coverage. The Selection feature imports `clampPoint`/`normalizeRect`/`MIN_RECT_SIZE`/`Rect` directly from `../canvas/rectGeometry`, not through crop.

### Lasso rasterization — `src/features/selection/selectionGeometry.ts`

```ts
export function rasterizeRect(rect: Rect, imageWidth: number, imageHeight: number): { mask: Uint8Array; bounds: Rect } {
  const mask = new Uint8Array(imageWidth * imageHeight)
  const x0 = Math.round(rect.x)
  const y0 = Math.round(rect.y)
  const x1 = Math.min(imageWidth, Math.round(rect.x + rect.width))
  const y1 = Math.min(imageHeight, Math.round(rect.y + rect.height))

  for (let y = y0; y < y1; y++) {
    const rowOffset = y * imageWidth
    for (let x = x0; x < x1; x++) mask[rowOffset + x] = 1
  }
  return { mask, bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }
}

/**
 * Rasterizes a closed polygon into a full-image mask using the even-odd
 * scanline fill rule. The edge from the last point back to the first is
 * implicit — do not pass a duplicate closing point. Samples at pixel
 * centers (x+0.5, y+0.5). Self-crossing paths are handled correctly by the
 * same even-odd pairing with no extra logic — the right rule for a raw
 * freehand mouse path, which has no meaningful "intended winding direction."
 * Returns null for fewer than 3 points, or a polygon enclosing no pixel centers.
 */
export function rasterizeLassoPolygon(
  points: SelectionPoint[],
  imageWidth: number,
  imageHeight: number,
): { mask: Uint8Array; bounds: Rect } | null {
  if (points.length < 3) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const yStart = Math.max(0, Math.floor(minY))
  const yEnd = Math.min(imageHeight - 1, Math.ceil(maxY) - 1)
  const xClampMin = Math.max(0, Math.floor(minX))
  const xClampMax = Math.min(imageWidth - 1, Math.ceil(maxX) - 1)
  if (yStart > yEnd || xClampMin > xClampMax) return null

  const mask = new Uint8Array(imageWidth * imageHeight)
  let boundsMinX = Infinity, boundsMinY = Infinity, boundsMaxX = -Infinity, boundsMaxY = -Infinity
  const n = points.length
  const xIntersections: number[] = []

  for (let y = yStart; y <= yEnd; y++) {
    const scanY = y + 0.5
    xIntersections.length = 0

    for (let i = 0; i < n; i++) {
      const a = points[i]
      const b = points[(i + 1) % n]
      const y1 = a.y, y2 = b.y
      if (y1 === y2) continue // horizontal edges never produce a single crossing
      const crosses = (y1 <= scanY && y2 > scanY) || (y2 <= scanY && y1 > scanY) // half-open: no double-count at a shared vertex
      if (!crosses) continue
      const t = (scanY - y1) / (y2 - y1)
      xIntersections.push(a.x + t * (b.x - a.x))
    }

    xIntersections.sort((p, q) => p - q) // numeric sort — default sort() is lexicographic

    for (let i = 0; i + 1 < xIntersections.length; i += 2) {
      const spanStart = xIntersections[i]
      const spanEnd = xIntersections[i + 1]
      // pixel x filled iff its center is inside [spanStart, spanEnd)
      const xFrom = Math.max(xClampMin, Math.ceil(spanStart - 0.5))
      const xTo = Math.min(xClampMax, Math.ceil(spanEnd - 0.5) - 1)
      if (xFrom > xTo) continue

      const rowOffset = y * imageWidth
      for (let x = xFrom; x <= xTo; x++) mask[rowOffset + x] = 1

      if (xFrom < boundsMinX) boundsMinX = xFrom
      if (xTo > boundsMaxX) boundsMaxX = xTo
      if (y < boundsMinY) boundsMinY = y
      if (y > boundsMaxY) boundsMaxY = y
    }
  }

  if (boundsMinX > boundsMaxX || boundsMinY > boundsMaxY) return null
  return { mask, bounds: { x: boundsMinX, y: boundsMinY, width: boundsMaxX - boundsMinX + 1, height: boundsMaxY - boundsMinY + 1 } }
}
```

**Hand-traced and independently re-verified** against two cases before accepting this algorithm:

*Right triangle* `(0,0),(4,0),(0,4)` — expected: pixel `(x,y)` filled iff `x+y < 3` (its center satisfies `x+y+1 < 4`). Walking all 4 rows produces rows `[1,1,1,0]`, `[1,1,0,0]`, `[1,0,0,0]`, `[0,0,0,0]` — an exact staircase match, including row `y=3` correctly filling nothing (the span `[0, 0.5]` there contains no pixel center). `bounds = {x:0,y:0,width:3,height:3}`.

*Concave notched square* (4×4 square, `(0,0),(1,0),(1,2),(3,2),(3,0),(4,0),(4,4),(0,4)`, i.e. a 2-wide×2-tall notch cut from the top middle) — exercises 4 intersections (2 span-pairs) per scanline, not just 1. Expected: full square minus notch `{1≤x<3, 0≤y<2}`. Rows `y=0,1` (inside the notch's y-range): `[1,0,0,1]` each — correctly excludes the notch. Rows `y=2,3` (below the notch): `[1,1,1,1]` each — full row. Matches exactly, including both notch-boundary scanlines.

Rectangle and lasso both reduce to the identical `{mask, bounds}` shape, so downstream consumers (flood fill, delete) never branch on shape at all.

### `src/features/selection/useSelection.ts` — interaction hook (mirrors `useCrop.ts`)

```ts
import { useCallback, useRef, useState } from 'react'
import { pointerToCanvasPoint } from '../canvas/coords'
import { clampPoint, normalizeRect, type Rect } from '../canvas/rectGeometry'
import { rasterizeLassoPolygon, rasterizeRect, type Selection, type SelectionPoint, type SelectionShape } from './selectionGeometry'

type Interaction = { mode: 'idle' } | { mode: 'rect'; anchorX: number; anchorY: number } | { mode: 'lasso' }

export interface UseSelectionOptions {
  imageWidth: number
  imageHeight: number
  onCommit: (selection: Selection | null) => void
}

export function useSelection({ imageWidth, imageHeight, onCommit }: UseSelectionOptions) {
  const [shape, setShape] = useState<SelectionShape>('rectangle')
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const [draftPoints, setDraftPoints] = useState<SelectionPoint[]>([])
  const interactionRef = useRef<Interaction>({ mode: 'idle' })

  const handlePointerDown = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const raw = pointerToCanvasPoint(event, canvas)
      const point = clampPoint(raw.x, raw.y, imageWidth, imageHeight)
      if (shape === 'rectangle') {
        interactionRef.current = { mode: 'rect', anchorX: point.x, anchorY: point.y }
        setDraftRect(normalizeRect(point.x, point.y, point.x, point.y, imageWidth, imageHeight))
      } else {
        interactionRef.current = { mode: 'lasso' }
        setDraftPoints([point])
      }
      canvas.setPointerCapture(event.pointerId)
    },
    [shape, imageWidth, imageHeight],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const interaction = interactionRef.current
      if (interaction.mode === 'idle') return
      const raw = pointerToCanvasPoint(event, canvas)
      const point = clampPoint(raw.x, raw.y, imageWidth, imageHeight)
      if (interaction.mode === 'rect') {
        setDraftRect(normalizeRect(interaction.anchorX, interaction.anchorY, point.x, point.y, imageWidth, imageHeight))
      } else {
        setDraftPoints((prev) => [...prev, point])
      }
    },
    [imageWidth, imageHeight],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const interaction = interactionRef.current
      interactionRef.current = { mode: 'idle' }
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)

      if (interaction.mode === 'rect' && draftRect) {
        const { mask, bounds } = rasterizeRect(draftRect, imageWidth, imageHeight)
        onCommit({ shapeData: { shape: 'rectangle', rect: draftRect }, mask, bounds })
      } else if (interaction.mode === 'lasso') {
        const result = rasterizeLassoPolygon(draftPoints, imageWidth, imageHeight)
        onCommit(result ? { shapeData: { shape: 'lasso', points: draftPoints }, ...result } : null)
      }
      setDraftRect(null)
      setDraftPoints([])
    },
    [draftRect, draftPoints, imageWidth, imageHeight, onCommit],
  )

  return { shape, setShape, draftRect, draftPoints, handlePointerDown, handlePointerMove, handlePointerUp }
}
```

Notes:
- Only one interaction mode is needed per shape (no move/resize state machine like Crop's) — "move the selection" is explicitly out of scope, so every pointer-down always starts a brand-new draw.
- `draftRect`/`draftPoints` are set immediately on pointer-down (not lazily on first move like `useCrop`) so the draw effect's priority chain (draft → committed selection) is unambiguous from the first frame, with no "empty-but-active" edge case.
- `handlePointerMove`/`handlePointerUp` branch on `interactionRef.current.mode` (captured at pointer-down), never on live `shape` state, so they can't be corrupted by a shape-toggle click during an in-flight drag.
- Commit (`onCommit`, wrapping `dispatch`) happens directly inside the native `pointerup` callback, not inside a `useEffect` reacting to intermediate state — see the oxlint audit below.

### `src/features/selection/clearSelection.ts` — delete/clear operation

```ts
import type { Selection } from './selectionGeometry'

/** Clears (alpha=0) every selected pixel on `canvas`, iterating only the
 *  selection's bounding box and checking the mask per pixel. RGB is left
 *  untouched — consistent with how Background Removal already produces
 *  transparent pixels, no new export-path concerns. */
export function clearSelectionPixels(canvas: HTMLCanvasElement, selection: Selection): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { x, y, width, height } = selection.bounds
  if (width <= 0 || height <= 0) return

  const imageData = ctx.getImageData(x, y, width, height)
  const { data } = imageData
  const maskWidth = canvas.width

  for (let py = 0; py < height; py++) {
    const imageY = y + py
    for (let px = 0; px < width; px++) {
      const imageX = x + px
      if (selection.mask[imageY * maskWidth + imageX]) {
        data[(py * width + px) * 4 + 3] = 0
      }
    }
  }
  ctx.putImageData(imageData, x, y)
}
```

### `src/features/selection/SelectionTool.tsx`

Mirrors `CropOverlay.tsx`'s structure (a draw effect + a pointer-wiring effect + a sidebar panel):

```tsx
import { useEffect } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState } from '../../state/EditorContext'
import { useSelection } from './useSelection'
import { clearSelectionPixels } from './clearSelection'
import type { Selection } from './selectionGeometry'

export function SelectionTool() {
  const { imageWidth, imageHeight, selection } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()

  const handleCommit = (next: Selection | null) => dispatch({ type: 'SET_SELECTION', selection: next })

  const { shape, setShape, draftRect, draftPoints, handlePointerDown, handlePointerMove, handlePointerUp } =
    useSelection({ imageWidth: imageWidth ?? 0, imageHeight: imageHeight ?? 0, onCommit: handleCommit })

  // Draw effect: live draft takes priority over the committed selection's outline.
  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext('2d')
    if (!overlay || !ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ffffff'

    if (draftRect) {
      ctx.strokeRect(draftRect.x + 0.5, draftRect.y + 0.5, draftRect.width, draftRect.height)
    } else if (draftPoints.length > 1) {
      ctx.beginPath()
      ctx.moveTo(draftPoints[0].x, draftPoints[0].y)
      for (const p of draftPoints.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.stroke()
    } else if (selection) {
      if (selection.shapeData.shape === 'rectangle') {
        const { x, y, width, height } = selection.shapeData.rect
        ctx.strokeRect(x + 0.5, y + 0.5, width, height)
      } else {
        const pts = selection.shapeData.points
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.stroke()
      }
    }
  }, [draftRect, draftPoints, selection, overlayCanvasRef])

  // Pointer wiring effect — identical structure to CropOverlay's.
  useEffect(() => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    overlay.style.pointerEvents = 'auto'
    overlay.style.cursor = 'crosshair'
    const onDown = (event: PointerEvent) => handlePointerDown(event, overlay)
    const onMove = (event: PointerEvent) => handlePointerMove(event, overlay)
    const onUp = (event: PointerEvent) => handlePointerUp(event, overlay)
    overlay.addEventListener('pointerdown', onDown)
    overlay.addEventListener('pointermove', onMove)
    overlay.addEventListener('pointerup', onUp)
    overlay.addEventListener('pointercancel', onUp)
    return () => {
      overlay.removeEventListener('pointerdown', onDown)
      overlay.removeEventListener('pointermove', onMove)
      overlay.removeEventListener('pointerup', onUp)
      overlay.removeEventListener('pointercancel', onUp)
      overlay.style.pointerEvents = 'none'
      overlay.style.cursor = ''
    }
  }, [overlayCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp])

  const handleDelete = () => {
    const canvas = baseCanvasRef.current
    if (!canvas || !selection) return
    clearSelectionPixels(canvas, selection)
  }
  const handleDeselect = () => dispatch({ type: 'SET_SELECTION', selection: null })
  const handleDone = () => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })

  return (
    <>
      <div className="selection-shape-toggle" role="group" aria-label="Selection shape">
        <button type="button" className={shape === 'rectangle' ? 'selection-shape-toggle__button selection-shape-toggle__button--active' : 'selection-shape-toggle__button'} aria-pressed={shape === 'rectangle'} onClick={() => setShape('rectangle')}>Rectangle</button>
        <button type="button" className={shape === 'lasso' ? 'selection-shape-toggle__button selection-shape-toggle__button--active' : 'selection-shape-toggle__button'} aria-pressed={shape === 'lasso'} onClick={() => setShape('lasso')}>Lasso</button>
      </div>
      <div className="selection-controls">
        <button type="button" onClick={handleDelete} disabled={!selection}>Delete Selection</button>
        <button type="button" onClick={handleDeselect} disabled={!selection}>Deselect</button>
        <button type="button" onClick={handleDone}>Done</button>
      </div>
    </>
  )
}
```
Delete does not auto-clear the selection afterward (matches Photoshop: the selection boundary persists after Cut/Delete until explicitly deselected).

New CSS, reusing the exact proven pattern from `.crop-presets`/`.crop-controls`:
```css
.selection-shape-toggle {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.selection-shape-toggle__button.selection-shape-toggle__button--active {
  background-color: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}

.selection-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bucket-fill-controls__hint {
  font-size: 13px;
  color: var(--text);
  margin: 0;
}
```

### `react/set-state-in-effect` audit

1. `SelectionTool`'s draw effect — only `ctx.*` calls, no `setState`. Clean.
2. `SelectionTool`'s pointer-wiring effect — only registers DOM listeners; every `setState` (`dispatch`/`onCommit`, `setDraftRect`/`setDraftPoints`) happens inside the native event callbacks, not the effect body. This is the fix pattern this codebase already had to apply twice retroactively in earlier features — here it's followed from the start.
3. `BucketFillTool`'s existing effect gains `selection` in its dependency array only (to close over the current mask); no new `setState`. Clean.
4. Selection invalidation lives in the `IMAGE_LOADED` reducer case (driven synchronously by the 4 existing `dispatch()` calls), not in a `useEffect` watching `imageWidth`/`imageHeight` — sidesteps the rule entirely rather than needing a fix.

### `src/features/bucketFill/floodFill.ts` — selection constraint

```ts
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBA,
  tolerance: number,
  selectionMask?: Uint8Array, // NEW, optional — 1 = eligible to fill
): void {
  const { width, height, data } = imageData
  const x0 = Math.floor(startX)
  const y0 = Math.floor(startY)
  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return
  if (selectionMask && !selectionMask[y0 * width + x0]) return // seed itself outside selection

  const targetColor = getPixel(data, width, x0, y0)
  const filled = new Uint8Array(width * height)

  const matches = (x: number, y: number) =>
    !filled[y * width + x] &&
    (!selectionMask || selectionMask[y * width + x]) &&
    colorDistance(getPixel(data, width, x, y), targetColor) <= tolerance

  // ...rest of the function (span growth, seed pushing) is completely
  // unchanged — every decision already routes through matches().
}
```

**Why constrain during spread, not "fill everywhere then clip afterward":** flood fill's defining property is *contiguity* — only pixels reachable through a chain of color-matching neighbors get painted. If two selected regions are joined only by a corridor of unselected, color-matching pixels, "fill then intersect with the mask" would let the flood traverse that corridor (it color-matches) and incorrectly reach/paint the second, otherwise-disconnected selected region. Putting the mask check inside `matches()` means corridor pixels fail the predicate and are never added to a span or pushed as a new seed, so the traversal itself can't cross them. `filled` (this-call dedup) and `selectionMask` (eligibility) are two independent grids checked by plain index reads with no interaction — a minimal, fully-composing change.

`src/features/bucketFill/BucketFillTool.tsx`:
```tsx
const { selection } = useEditorState() // new import needed alongside existing useCanvasRefs/useEditorDispatch
...
floodFill(imageData, point.x, point.y, fillColor, tolerance, selection?.mask)
...
// effect deps gain `selection`
```
and in the returned JSX:
```tsx
{selection && <p className="bucket-fill-controls__hint">Fill is constrained to your selection.</p>}
```

### Visual-persistence trade-off — decision: no cross-tool persistence

The selection's dashed outline is drawn only while the Selection tool itself is mounted (exactly like `CropOverlay`'s rect today) — it is not redrawn by `BucketFillTool` or any other tool once you switch away. The selection still fully *functions* via global state (constrains fill, stays deletable) — only the on-canvas outline disappears when you leave the tool; the one-line hint in Bucket Fill's panel covers the "why is fill scoped" question instead.

Making the outline persist across tools would require either coordinating multiple independent per-tool components that each `clearRect`+redraw the *same* shared overlay canvas (a growing coupling cost for every future tool), or a third dedicated canvas layer — a new ref threaded through `CanvasRefsContext`, new width/height sync added at all 4 `IMAGE_LOADED` call sites, and new z-index/compositing rules in `.canvas-stage__layers` (currently hard-coded for exactly two stacked layers). That's real architecture growth for a purely cosmetic gap, and doesn't match this project's own "basic, non-Photoshop-level" scope or the simplicity signal already given this session (text-label rail over icons).

### Wiring — `Toolbar.tsx` / `CanvasStage.tsx`

`Toolbar.tsx`, inserted between Crop and Bucket Fill (guides the natural "select, then fill" order), same `disabled={!hasImage || isToolActive}` pattern as the other tool buttons:
```tsx
const handleSelectionClick = () => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'selection' })
...
<button type="button" onClick={handleSelectionClick} disabled={!hasImage || isToolActive}>Selection</button>
```

`CanvasStage.tsx`, same pattern as the other three tool branches:
```tsx
{activeTool === 'selection' && (
  <>
    <h2 className="canvas-stage__sidebar-title">Selection</h2>
    <SelectionTool />
  </>
)}
```

### Tests

`tests/selectionGeometry.test.ts` — encodes the two hand-traced cases above plus the degenerate <3-point case:
```ts
import { describe, expect, it } from 'vitest'
import { rasterizeLassoPolygon, rasterizeRect } from '../src/features/selection/selectionGeometry'

function maskRows(mask: Uint8Array, width: number, height: number): number[][] {
  const rows: number[][] = []
  for (let y = 0; y < height; y++) rows.push(Array.from(mask.subarray(y * width, y * width + width)))
  return rows
}

describe('rasterizeRect', () => {
  it('fills exactly the pixels within the rect', () => {
    const { mask, bounds } = rasterizeRect({ x: 1, y: 1, width: 2, height: 2 }, 4, 4)
    expect(maskRows(mask, 4, 4)).toEqual([[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]])
    expect(bounds).toEqual({ x: 1, y: 1, width: 2, height: 2 })
  })
})

describe('rasterizeLassoPolygon', () => {
  it('returns null for fewer than 3 points', () => {
    expect(rasterizeLassoPolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }], 4, 4)).toBeNull()
  })
  it('rasterizes a right-triangle staircase', () => {
    const result = rasterizeLassoPolygon([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }], 4, 4)
    expect(maskRows(result!.mask, 4, 4)).toEqual([[1,1,1,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]])
    expect(result!.bounds).toEqual({ x: 0, y: 0, width: 3, height: 3 })
  })
  it('rasterizes a concave notched shape (multiple spans per scanline)', () => {
    const points = [{x:0,y:0},{x:1,y:0},{x:1,y:2},{x:3,y:2},{x:3,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}]
    const result = rasterizeLassoPolygon(points, 4, 4)
    expect(maskRows(result!.mask, 4, 4)).toEqual([[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,1,1,1]])
  })
})
```

`tests/floodFill.test.ts` — new cases for the mask param, demonstrating the "no leak through an unselected corridor" property:
```ts
describe('floodFill with a selection mask', () => {
  it('does not spread past unselected pixels, even when they color-match', () => {
    // 1x5 red row, mask = [1,1,0,1,1] (x=2 is an unselected bridge)
    // fill from x=0 -> x=0,1 filled; x=2 (bridge) and x=3,4 (unreachable without crossing it) stay untouched
  })
  it('is a no-op when the seed pixel itself is outside the mask', () => { ... })
})
```

`tests/clearSelection.test.ts` — mirrors `tests/applyCrop.test.ts`'s mocked-canvas-context convention, asserting per-pixel mask checking (not "clear the whole bounds rect unconditionally").

## Implementation order
1. `rectGeometry.ts` extraction + `cropGeometry.ts` re-export — confirm `cropGeometry.test.ts` still passes untouched.
2. `types/index.ts` + `EditorContext.tsx`.
3. `selectionGeometry.ts` + its tests — validate the algorithm in isolation before any UI wiring.
4. `floodFill.ts` mask param + its new tests.
5. `useSelection.ts`, `clearSelection.ts` (+ test), `SelectionTool.tsx`.
6. `Toolbar.tsx` / `CanvasStage.tsx` wiring, `BucketFillTool.tsx` mask + hint.
7. `App.tsx` + `App.css` rail restructuring (independent of steps 2–6).

## Verification
- `npm test` (new `selectionGeometry.test.ts`, `clearSelection.test.ts`, extended `floodFill.test.ts`; existing `cropGeometry.test.ts` must still pass unchanged) and `npm run lint`.
- `npm run build`.
- Real-browser Playwright pass (dev server + existing `test-image.png` fixture): confirm the rail renders on the left with all buttons, Projects opens as a flyout without disturbing other rail buttons; draw a rectangle selection, confirm the dashed outline and that Bucket Fill (after Done → Bucket Fill) only fills inside it; draw a lasso selection around an irregular region, confirm the same constraint; click Delete Selection and confirm the selected pixels become transparent; click Deselect and confirm Bucket Fill reverts to unconstrained; resize the viewport below 720px and confirm the rail becomes a horizontal top bar; screenshot both light and dark mode; check the console for errors throughout.

## Critical Files
- `src/types/index.ts`, `src/state/EditorContext.tsx` — new `Selection` type wiring, `SET_SELECTION`, central invalidation
- `src/features/canvas/rectGeometry.ts` — new, extracted generic rect utilities
- `src/features/crop/cropGeometry.ts` — re-export shim, otherwise untouched
- `src/features/selection/selectionGeometry.ts`, `useSelection.ts`, `clearSelection.ts`, `SelectionTool.tsx` — new feature
- `src/features/bucketFill/floodFill.ts`, `BucketFillTool.tsx` — mask constraint
- `src/components/Toolbar.tsx`, `src/features/canvas/CanvasStage.tsx` — wiring
- `src/App.tsx`, `src/App.css` — left rail restructuring

## Review / Result

Implemented as planned, with one bug found and fixed during verification (not anticipated by the plan):

- `rectGeometry.ts` extracted cleanly; `cropGeometry.ts`'s re-export shim kept all 24 existing crop tests passing unchanged.
- `types/index.ts` importing `Selection` from `features/selection/selectionGeometry.ts` (the refinement over the subagent's draft) compiled with zero issues — confirmed no import cycle via a clean `tsc -b` build.
- `selectionGeometry.ts`'s `rasterizeRect`/`rasterizeLassoPolygon` matched their hand-traced expected outputs exactly in the unit tests (right-triangle staircase and concave-notch cases), and were further confirmed correct end-to-end in the browser (a lasso triangle drawn over the green quadrant deleted exactly the triangle's pixels, verified both visually and via direct pixel reads at pixel-level precision: inside-triangle read back fully transparent `{r:0,g:0,b:0,a:0}`, outside-triangle-but-in-quadrant read back unchanged).
- `floodFill`'s mask constraint verified with the exact "unselected corridor" scenario the plan called out as the reason to constrain during spread rather than clip afterward — plus verified live in the browser: a rectangle selection drawn over only part of the red quadrant, then a bucket-fill click inside it, filled only the selected pixels (`{r:230,g:57,b:70}`, the fill color) while the rest of the same red quadrant just outside the selection stayed at its original color (`{r:220,g:60,b:60}`), and the other quadrants were untouched.
- **Bug found in the browser pass, not by unit tests or lint**: the Projects flyout panel (`position: absolute; left: 100%` on `.project-manager__panel`) was invisible — its layout box computed correctly (`x:195, width:320`), but was being visually clipped. Root cause: `.rail` had `overflow-y: auto` for a short-viewport safety net, and per the CSS spec, an element can't have one overflow axis `visible` and the other `auto/hidden/scroll` — the browser silently forces the `visible` axis to `auto` too, so `.rail` was clipping horizontal overflow (`overflow-x: auto`) even though nothing declared that explicitly. Confirmed via `getComputedStyle` in a diagnostic Playwright script. Fixed by dropping `.rail`'s `overflow-y: auto` entirely (this codebase already accepts page-level scroll as the fallback for `.app__main`/`.canvas-stage__sidebar` overflowing a short viewport, so this isn't a new class of risk, just extending the same precedent to `.rail`). Re-verified visually after the fix — the flyout now renders fully to the right of the rail.
- Left rail confirmed via Playwright: fixed ~200px, full height, correct button order (Load Image, Crop, **Selection**, Bucket Fill, Remove Background, Export PNG, then Projects below a divider); collapses to a horizontal wrapped row below 720px width, screenshotted and confirmed.
- Dark mode screenshotted and confirmed consistent with the existing token system.
- `npm test`: 50/50 pass (7 files, up from 5 — added `selectionGeometry.test.ts`, `clearSelection.test.ts`, extended `floodFill.test.ts`). `npm run lint`: clean (only the pre-existing unrelated `EditorContext.tsx` Fast Refresh warning). `npm run build`: clean.
