# Crop UX Fix + Right-Side Tool Sidebar + Whole-App Style Refresh

## Context

Three issues reported after using the crop tool's new aspect-ratio presets:
1. When a ratio is locked, only the 4 corner handles are interactive (edges are intentionally hidden — dragging one edge under a locked ratio is ambiguous), but the corner grab target is the same small size as before, making it hard to click and drag.
2. The crop preset menu currently renders as a horizontal row directly below the image; the user wants it moved to the right side instead.
3. The user wants the app's visual style updated more broadly, not just the crop panel.

Clarified with the user: the right-side menu should be a **fixed sidebar** (canvas area shrinks to share the row, not a floating overlay), and the style update scope is the **whole app**, not just crop.

This plan was produced by directly reading every file it touches, then independently validated by a Plan subagent (given the same files plus the hard constraint below) for a second pass on the CSS/layout details and risk-spotting. Both passes agree; details below reflect the reviewed version.

## Hard constraint (must not regress)

`CanvasStage.tsx`'s `.canvas-stage__column` (holding the two `<canvas>` elements) is mounted unconditionally with `hidden={!hasImage}`, not conditionally rendered. This is required because `useImageFileLoader.loadFile` draws to `baseCanvasRef.current` *before* dispatching `IMAGE_LOADED` (the action that flips `hasImage` true) — if the canvas were conditionally mounted only once `hasImage` is true, the ref would be null on first load and image loading would break. The restructuring below only moves the *tool control panels* (which don't hold canvas refs of their own — they reach the canvases via `useCanvasRefs()` context) to a new sibling element; the canvas column itself is untouched.

## 1. Bigger, easier-to-grab corner handles

Root cause: `pointerToCanvasPoint` maps pointer events into canvas-buffer pixel space (`scaleX = canvas.width / rect.width`), which is >1 for any image displayed shrunk to fit. A 10px hit radius in buffer pixels can be just a few screen pixels for a large photo, and in locked mode there's no edge-handle fallback to catch a near-miss.

**`src/features/crop/cropGeometry.ts`**
- Add `const CORNER_HANDLE_HIT_RADIUS = 16` alongside the existing `HANDLE_HIT_RADIUS = 10` (edges keep 10, unchanged).
- In `hitTestHandle`, pick the radius per handle:
  ```ts
  const radius = CORNER_HANDLES.includes(handle) ? CORNER_HANDLE_HIT_RADIUS : HANDLE_HIT_RADIUS
  if (Math.abs(point.x - pos.x) <= radius && Math.abs(point.y - pos.y) <= radius) return handle
  ```

**`src/features/crop/CropOverlay.tsx`**
- Rename `HANDLE_SIZE` → `EDGE_HANDLE_SIZE = 10`; add `CORNER_HANDLE_SIZE = 16`.
- In the draw loop, size each handle by type: `const size = CORNER_HANDLES.includes(key) ? CORNER_HANDLE_SIZE : EDGE_HANDLE_SIZE` (corners are bigger in both Free and locked mode — simpler than conditioning on lock state, and bigger corners don't hurt Free mode).

Verified by hand-tracing against `tests/cropGeometry.test.ts`'s existing `hitTestHandle` cases: the exact-match assertions are unaffected, the `'se'` vs `'ne'` priority case still resolves correctly at the wider radius (dy=20 still exceeds even 16), and the far-away null case (200,200 vs a rect near 10–50) stays null. No existing test breaks; no new export needed since both constants stay module-private like today.

## 2. Right-side tool sidebar

**`src/features/canvas/CanvasStage.tsx`** — move the three tool panels out of `.canvas-stage__column` into a new sibling `<aside>`, shown only when a tool is active. Keep the existing repeated `activeTool === 'x' &&` pattern (no lookup table/cast needed) and add a heading per tool:
```tsx
export function CanvasStage() {
  const { imageWidth, imageHeight, activeTool } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const hasImage = imageWidth !== null && imageHeight !== null
  const showSidebar = hasImage && activeTool !== 'none'

  return (
    <div className="canvas-stage">
      {!hasImage && <ImageDropzone />}
      <div className="canvas-stage__column" hidden={!hasImage}>
        <div className="canvas-stage__layers">
          <canvas ref={baseCanvasRef} className="canvas-stage__base" />
          <canvas ref={overlayCanvasRef} className="canvas-stage__overlay" />
        </div>
      </div>
      {showSidebar && (
        <aside className="canvas-stage__sidebar" aria-label="Tool options">
          {activeTool === 'crop' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Crop</h2>
              <CropOverlay />
            </>
          )}
          {activeTool === 'bucketFill' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Bucket Fill</h2>
              <BucketFillTool />
            </>
          )}
          {activeTool === 'backgroundRemoval' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Remove Background</h2>
              <BackgroundRemovalTool />
            </>
          )}
        </aside>
      )}
    </div>
  )
}
```
`showSidebar` is a plain derived boolean computed during render — no new `useState`/`useEffect`, so this can't trip the `react/set-state-in-effect` oxlint rule. None of the three tool components' own internal effects change; only their position in the tree moves, so mount/unmount timing on tool switch stays identical to today.

**`src/App.css`** — layout:
```css
.canvas-stage {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  gap: 20px;
}

.canvas-stage__column {
  flex: 1 1 auto;
  min-width: 0;   /* lets the column shrink below the image's intrinsic width once a sidebar is present */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  /* drop the old `position: relative` — only needed by the old absolutely-positioned .processing-overlay, which goes away below */
}

.canvas-stage__sidebar {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  align-self: stretch;
  overflow-y: auto;
}

.canvas-stage__sidebar-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-h);
}
```
New responsive breakpoint (stack sidebar below the image on narrow viewports), added above the existing `@media (max-width: 480px)` block:
```css
@media (max-width: 720px) {
  .canvas-stage {
    flex-direction: column;
    align-items: stretch;
  }
  .canvas-stage__sidebar {
    flex: none;
    width: 100%;
  }
}
```

**Tool panels get CSS-only layout changes** (no JSX edits needed in `CropOverlay.tsx`/`BucketFillTool.tsx` — they already return flat groups of `<div>`s that become natural vertical blocks once the parent switches from centered-row-wrap to a narrow flex column):
```css
.crop-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.crop-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bucket-fill-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bucket-fill-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 14px;
}

.bucket-fill-controls input[type='range'] {
  flex: 1;
  min-width: 0;
}
```
(Buttons stretch to full sidebar width for free — flex-column's default `align-items: stretch` applies to them as flex items regardless of their own `display: inline-flex`.)

**`BackgroundRemovalTool`'s `.processing-overlay`** — currently `position: absolute; inset: 0`, dimming the whole canvas during processing. Decision: fold it into the sidebar as a static status card, dropping the absolute/dimming behavior, so all three tools share exactly one rendering location (the sidebar) with no special case.
- **Trade-off, explicit**: today's dimmed overlay is a strong "something is happening to your image" signal; once it's a sidebar card, the canvas stays fully bright during background removal and the only busy indicator is the sidebar's progress text. Accepting this for structural consistency across the three tools — reasonable for this project's scope. Flagging it here rather than changing it silently.
- No `BackgroundRemovalTool.tsx` JSX changes — only its CSS:
  ```css
  .processing-overlay {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    text-align: left;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--panel-bg);
    color: var(--text-h);
  }
  ```
  Delete the old dark-mode-specific override block (the `@media (prefers-color-scheme: dark) { .processing-overlay { background: ... } }` rule) — `--panel-bg` now carries a dark-mode value itself (see §3), so the override is redundant.

## 3. Whole-app style refresh

**`src/index.css`** — extend the token palette (light + the existing dark-mode media block):
```css
:root {
  --text: #6b6375;
  --text-h: #08060d;
  --bg: #fff;
  --border: #e5e4e7;
  --panel-bg: #f7f7f9;
  --accent: #5b5bd6;
  --accent-hover: #4747c4;
  --accent-contrast: #ffffff;
  --danger: #d33;
  --radius-sm: 6px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(16, 15, 20, 0.06), 0 1px 3px rgba(16, 15, 20, 0.08);
  /* ...existing --sans/font/color-scheme unchanged */
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #9ca3af;
    --text-h: #f3f4f6;
    --bg: #16171d;
    --border: #2e303a;
    --panel-bg: #1c1d25;
    --accent: #8b8bf0;
    --accent-hover: #a5a5f5;
    --accent-contrast: #14141b;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}
```
Replace the 3 hardcoded `#d33` usages (`.toolbar__error`, `.image-dropzone__error`, `.processing-overlay__error`) with `var(--danger)` — same value, now tokenized.

**Global base styles for bare elements**, scoped under `.app` (the root wrapper in `App.tsx`), so every existing button/input across every component (`Toolbar`, `LoadImageButton`, `CropOverlay`, `BucketFillTool`, `BackgroundRemovalTool`, `ProjectManagerPanel`, `ImageDropzone`) picks up consistent styling with **no className changes** on most of them:
```css
.app button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  font: inherit;
  font-size: 14px;
  color: var(--text-h);
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.app button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.app button:active:not(:disabled) { background: var(--border); }
.app button:disabled { opacity: 0.5; cursor: not-allowed; }
.app button:focus-visible,
.app input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.app input[type='text'] {
  padding: 6px 10px;
  font: inherit;
  font-size: 14px;
  color: var(--text-h);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.app input[type='color'] {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  cursor: pointer;
}
.app input[type='range'] { accent-color: var(--accent); }
```
Cleanup needed to avoid a conflict: trim `.project-manager__save input[type='text']` down to just the layout property that must stay component-local (`flex: 1;`) — delete its padding/border/background/color/border-radius, now supplied globally.

**`.btn-primary` utility**, added to exactly 4 buttons (each justified):
| File | Button | Why |
|---|---|---|
| `Toolbar.tsx` | Export PNG | The app's payoff action. |
| `CropOverlay.tsx` | Confirm Crop | Commit action, paired with neutral Cancel. |
| `ImageDropzone.tsx` | Choose an image | Sole actionable control on the empty state. |
| `ProjectManagerPanel.tsx` | Save | Commit action of the save-project form. |

Excluded deliberately: Load Image / Crop / Bucket Fill / Remove Background (equal-weight mode switches), Done / Retry / Cancel (dismiss/recovery, not creation), Projects toggle and per-row Load/Delete (repeated in a list — accenting them would shout across the whole list, and Delete shouldn't wear the brand color).
```css
.app button.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-contrast);
}
.app button.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: var(--accent-contrast);
}
```
Using `.app button.btn-primary` (not a bare `.btn-primary`) is required — a bare class has lower specificity `(0,1,0)` than `.app button` `(0,1,1)` and would silently lose.

**Same specificity fix applies to the existing active-preset style** — `.crop-presets__button--active` is currently `(0,1,0)` and would be silently overridden by the new `.app button` rule once that ships. Fix by compounding both classes (already applied together in `CropOverlay.tsx`) and recolor to the new accent token:
```css
.crop-presets__button.crop-presets__button--active {
  background-color: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}
```

**Card styling for floating/contained panels** (page-level chrome — header, toolbar, project-manager top bar — stays flush full-width strips with just a bottom border, unchanged; only floating panels get the card treatment):
```css
.image-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background: var(--panel-bg);
  color: var(--text);
}

.project-manager__panel {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 480px;
  padding: 12px 14px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
```
(`.canvas-stage__sidebar`, above, already uses the same `--panel-bg`/`--radius-lg`/`--shadow-sm` trio — dropzone, opened project list, and tool sidebar now share one consistent card language.) Minor token consistency touch: `.project-manager__thumb`'s hardcoded `border-radius: 4px` → `var(--radius-sm)`.

## Risks called out during review (all accounted for above)
- CSS specificity: `.btn-primary` and `.crop-presets__button--active` both need compound selectors against the new `.app button` base rule, or they'll silently no-op.
- `min-width: 0` on `.canvas-stage__column` is required, not optional — without it the sidebar can be pushed out/overflow on large images.
- Hit-radius is in canvas-buffer pixels, not screen pixels — the widened corner radius meaningfully improves the common case but a very heavily-downscaled large photo can still have a sub-16px effective screen target. Pre-existing characteristic of the coordinate mapping, not introduced here; not worth solving further for this project.
- No new `useState`/`useEffect` anywhere in this plan → no `react/set-state-in-effect` risk.

## Verification
- `npm test` (specifically re-check `tests/cropGeometry.test.ts` — hand-traced above, no expected failures) and `npm run lint`.
- `npm run build`.
- Real-browser pass via Playwright (dev server + existing `test-image.png` fixture, same pattern as every prior phase): load an image, open Crop and confirm the sidebar renders on the right with the image shrinking to share the row; lock a ratio and drag a corner starting a few px off-center to confirm the wider grab zone actually helps (compare against the old 10px radius); switch through Bucket Fill and Remove Background to confirm each renders its panel in the same sidebar location with a heading; resize the viewport below 720px and confirm the sidebar stacks under the image; screenshot both light and dark color schemes; check the browser console for errors throughout.

## Critical Files
- `src/features/crop/cropGeometry.ts` — corner hit-radius constant
- `src/features/crop/CropOverlay.tsx` — corner handle draw size
- `src/features/canvas/CanvasStage.tsx` — sidebar restructuring
- `src/features/backgroundRemoval/BackgroundRemovalTool.tsx` — no logic change, styling context only
- `src/App.css` — layout + card styling + button/panel restyle
- `src/index.css` — new design tokens
- `src/components/Toolbar.tsx`, `src/features/imageLoad/ImageDropzone.tsx`, `src/features/projects/ProjectManagerPanel.tsx` — add `className="btn-primary"` to one button each

## Review / Result

Implemented exactly as planned, no deviations.

- `cropGeometry.ts`: added `CORNER_HANDLE_HIT_RADIUS = 16`; `hitTestHandle` now selects the radius per handle type.
- `CropOverlay.tsx`: `HANDLE_SIZE` split into `EDGE_HANDLE_SIZE` (10) / `CORNER_HANDLE_SIZE` (16), drawn per handle type; added `className="btn-primary"` to Confirm Crop.
- `CanvasStage.tsx`: tool panels moved into a new `<aside className="canvas-stage__sidebar">`, gated on `showSidebar = hasImage && activeTool !== 'none'` (plain derived boolean, no new state/effects). Canvas column's `hidden={!hasImage}` mounting behavior is untouched — confirmed image loading still works.
- `index.css` / `App.css`: new design tokens (`--panel-bg`, `--accent`, `--accent-hover`, `--accent-contrast`, `--danger`, `--radius-sm/lg`, `--shadow-sm`) for light + dark; global `.app button`/`.app input[...]` base styles; `.btn-primary` utility (added to Export PNG, Confirm Crop, Choose an image, Save); sidebar/dropzone/project-panel card styling; `.processing-overlay` converted from an absolute canvas-dimming layer to a static sidebar card (explicit, accepted UX trade-off — see plan body); new `@media (max-width: 720px)` breakpoint stacks the sidebar below the canvas.
- Fixed two CSS specificity bugs the plan flagged in advance (`.btn-primary` and `.crop-presets__button--active` both need compounding against `.app button`) — verified both work correctly in the browser pass (Export PNG renders `rgb(91, 91, 214)` = `--accent`; the active preset button visibly highlights in both screenshots).

**Verification:**
- `npm test`: 40/40 pass, no changes needed to existing assertions (hand-traced against the new radius in the plan, confirmed correct).
- `npm run lint`: clean (only the pre-existing unrelated `EditorContext.tsx` Fast Refresh warning).
- `npm run build`: clean.
- Real-browser Playwright pass (light + dark, 1200px and 600px viewports): sidebar renders only when a tool is active and sits on the right of the shrunk canvas at ~280px; each of the three tools shows its heading + panel in the sidebar; narrow viewport correctly stacks the sidebar below the image; zero console errors throughout.
- **Core bug fix verified numerically, not just visually**: on a 240×160 test image, locked the crop to 1:1 (reshapes to `{x:40,y:0,w:160,h:160}`), then dragged from a point 11px off the `se` corner on both axes — a point that would have missed under the old 10px hit radius (`11 > 10`) but hits under the new 16px corner radius (`11 <= 16`) — toward the fixed opposite corner. Confirmed crop came out at exactly 80×80, matching the predicted shrink math precisely, proving the wider grab zone actually resolves as a resize end-to-end rather than silently falling through to a move or no-op.
