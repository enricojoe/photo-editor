# PhotoEditor — Implementation Plan

## Context

The user wants a lightweight, browser-based photo editor in this empty directory — not Photoshop-level, but able to do basic editing: **crop**, **background removal**, and **bucket/paint-fill coloring**. Through discussion, three foundational decisions were locked in:

1. **Platform:** browser-only web app, no desktop/mobile, no backend server.
2. **Background removal:** must run client-side (no server, no paid API).
3. **Persistence:** projects are saved/loaded via `localStorage` only (explicitly chosen despite its ~5–10MB per-origin cap) — no IndexedDB, no backend.

A design pass (via a Plan subagent) validated the originally-proposed stack against these constraints and the project's "Simplicity First / Minimal Impact" principles, and recommended dropping two of the originally-considered libraries (Fabric.js, Cropper.js) in favor of plain canvas code, since the app only ever has one image on the canvas at a time — there's no multi-object scene to justify an object-model library.

One open question — whether to silently downscale large imported images to protect the localStorage quota — was raised for explicit sign-off. **Resolved:** no automatic downscaling. Images are always loaded and edited at their original resolution; if an image is too large to fit in localStorage, the user is shown a clear reminder that editing still works but progress can't be saved, rather than the app silently reducing image quality.

## Final Architecture Decision

| Piece | Decision | Why |
|---|---|---|
| React + TypeScript + Vite | Use | Standard, fast dev loop for a client-only SPA. |
| Canvas engine | **Plain HTML5 Canvas, no Fabric.js** | Fabric is an object-model layer for scenes with multiple shapes/objects. Bucket fill and background removal both operate on raw pixels (`ImageData` / decoded PNG blobs), and the app never has more than one image on the canvas — no groups, no z-ordering, nothing Fabric is actually for. Dropping it avoids a pointless indirection layer and ~100KB+ of unused gzipped JS. |
| Crop UI | **Hand-rolled crop overlay, no Cropper.js** | Cropper.js owns its own `<img>`-based DOM/CSS, which means bridging canvas → dataURL → `<img>` → Cropper → canvas on every crop. A basic rectangular crop (drag-to-draw, 8 resize handles, move, clamp-to-bounds) is ~150-200 lines and reuses the same pointer-coordinate mapping the bucket-fill tool already needs. |
| Bucket fill | Custom **scanline flood fill** over `ImageData` | Fills contiguous horizontal runs instead of pushing every pixel individually — materially faster than naive stack-based fill on large images, still simple, iterative (no recursion) to avoid stack overflow. |
| Background removal | `@imgly/background-removal` (npm) | Only realistic client-side, no-server, no-paid-API option. Runs on ONNX Runtime Web (WASM/WebGPU), ships a browser-targeted build, caches its model via the Cache API after first use. |
| State management | React `Context` + `useReducer` | One image, one active tool, a handful of tool params — a single reducer is enough; no Redux/Zustand needed. |
| Styling | Plain CSS | No design-system requirement for this scope. |
| Image resolution handling | **No downscaling on import** — always load at original resolution. Large-image risk is handled via an explicit save-time reminder (see §3.6), not silent quality loss. | User's explicit choice. |

### Mental model
- **Base `<canvas>`**: the single source of truth for current image pixels. Crop, fill, and background removal all read/write it directly.
- **Overlay `<canvas>`** (or absolutely-positioned div): transient UI chrome only — the crop rectangle + handles + dimmed mask. Cleared/redrawn per interaction, never persisted, never touches image pixels.

## Project Scaffold

**package.json dependencies** — deliberately minimal:
- `react`, `react-dom`, `@imgly/background-removal`
- Dev: `@vitejs/plugin-react`, `typescript`, `vite`, `@types/react`, `@types/react-dom`, `vitest`, `eslint`

**Folder structure:**
```
PhotoEditor/
├─ index.html
├─ package.json / tsconfig.json / vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ components/              # generic presentation UI
│  │  ├─ Toolbar.tsx  Button.tsx  Slider.tsx  Modal.tsx  LoadingOverlay.tsx
│  ├─ features/
│  │  ├─ canvas/
│  │  │  ├─ CanvasStage.tsx     # owns base + overlay canvas refs, sizing
│  │  │  └─ coords.ts           # pointer <-> canvas-pixel coordinate mapping
│  │  ├─ imageLoad/
│  │  │  ├─ ImageDropzone.tsx
│  │  │  └─ loadImage.ts        # decode, draw to base canvas at original res
│  │  ├─ crop/
│  │  │  ├─ CropOverlay.tsx     # draggable/resizable rect UI
│  │  │  ├─ useCrop.ts          # pointer state machine
│  │  │  └─ applyCrop.ts        # pure: rect -> new cropped canvas
│  │  ├─ bucketFill/
│  │  │  ├─ BucketFillTool.tsx  # color picker + tolerance slider + click
│  │  │  └─ floodFill.ts        # pure scanline flood fill over ImageData
│  │  ├─ backgroundRemoval/
│  │  │  ├─ BackgroundRemovalTool.tsx
│  │  │  └─ removeBackground.ts # wraps @imgly/background-removal
│  │  └─ projects/
│  │     ├─ ProjectManagerPanel.tsx  # list / save / load / delete
│  │     ├─ storage.ts               # localStorage read/write, quota + size-estimate handling
│  │     └─ types.ts
│  ├─ lib/
│  │  ├─ canvasUtils.ts   # getImageData/putImageData helpers, cloneCanvas
│  │  ├─ colorDistance.ts # RGBA distance fn (used by floodFill, unit tested)
│  │  └─ exportPng.ts     # canvas -> blob -> download
│  ├─ state/EditorContext.tsx  # reducer: activeTool, image dims, tool params
│  └─ types/index.ts
└─ tests/  # vitest specs for pure logic
```

**Config:** standard Vite React-TS template, `tsconfig.json` with `"strict": true`. `@imgly/background-removal` manages its own WASM/model loading at runtime — no special Vite plugin expected, but verify once installed rather than pre-adding tooling.

## Core Feature Designs

**1. Image load** — `ImageDropzone` (file input + drag/drop) → `loadImage.ts`: decode via `createImageBitmap`/`Image`, size the base canvas to the image's **original** dimensions (no downscale), draw it in, update `EditorContext`.

**2. Crop** — `useCrop.ts` pointer state machine (`idle → dragging-new | moving | resizing:<handle>`) using `pointerdown/move/up` + `setPointerCapture`. Rect clamped to canvas bounds, outside area dimmed on the overlay canvas. Confirm: `applyCrop.ts` reads `getImageData(x, y, w, h)` from the base canvas, draws it into a new `w×h` canvas, replaces the base canvas content + `EditorContext` dimensions. Cancel: discard overlay state, base canvas untouched.

**3. Bucket/paint fill** — native `<input type="color">` + tolerance `<input type="range">`. On click: map pointer → canvas pixel (`coords.ts`), `getImageData` full canvas, run `floodFill.ts` (iterative scanline, `colorDistance.ts` for tolerance comparison against the seed pixel), `putImageData` back. Runs synchronously on the main thread — acceptable tradeoff for keeping full resolution; Web Worker/OffscreenCanvas offload is explicitly deferred (only revisit if manual testing shows real jank on large images).

**4. Background removal** — `removeBackground.ts` wraps `@imgly/background-removal`'s `removeBackground(blob, { progress })`. `LoadingOverlay` shows staged status ("Downloading model… (first use only)" → "Removing background…"), disables other tool buttons while processing. On success, decode the returned transparent PNG blob and draw into the base canvas, replacing prior content. On failure (offline first-use, blocked WASM/model load), catch and show an inline retry-able error — never leave `isProcessing` stuck true. Model is cached by the browser's Cache API after first run (separate from localStorage, not subject to its quota).

**5. Export** — `exportPng.ts`: `canvas.toBlob(..., 'image/png')` → object URL → programmatic `<a download>` click → revoke URL. PNG-only (needed once background removal can produce transparency). Build this in Phase 1 so it doubles as the verification tool for every later feature.

**6. Project save/load (localStorage)** — no automatic downscaling, so save must handle large images explicitly:

```ts
// key: "photoeditor:projects" — index
type ProjectSummary = { id: string; name: string; updatedAt: number; thumbnailDataUrl: string };

// key: `photoeditor:project:${id}` — full record
type ProjectRecord = { id: string; name: string; createdAt: number; updatedAt: number;
  width: number; height: number; imageDataUrl: string };
```

- **Save flow:** flatten base canvas → `canvas.toDataURL('image/png')`. Before writing, check the resulting string length against a conservative safety threshold (leaving headroom for the index + other saved projects). If it's over the threshold, **or** the subsequent `localStorage.setItem` throws (`DOMException` with `name === 'QuotaExceededError'`, plus the legacy `code === 22`/`1014` checks), do **not** fail silently and do **not** drop the in-memory edit — show a persistent, non-blocking reminder near the Save button: *"This image is too large to save in browser storage. You can keep editing, but progress won't be saved until you use a smaller image or free up space by deleting old projects."* Editing stays fully usable; only saving is blocked.
- **Load:** read the index for the picker list (cheap — id/name/updatedAt/thumbnail only), on selection read the full record, decode `imageDataUrl`, draw into base canvas, restore dimensions.
- **Delete:** remove both the per-project key and its index entry — the main lever users have to free space; surface it clearly in `ProjectManagerPanel`, especially next to the "too large to save" reminder.

## Verification Plan

**Automated (Vitest)** — pure logic only: `floodFill.ts` (synthetic small `ImageData`, assert filled pixels at a few tolerances), `colorDistance.ts` (boundary cases), `applyCrop.ts` (mock canvas, assert output dims/bounds), `storage.ts` (mocked `localStorage`, assert index updates and that quota errors are caught/surfaced, not thrown).

**Manual (real browser, `npm run dev`)** — at least Chrome + one of Firefox/Safari (WASM/Cache-API behavior varies, especially Safari):
- Load: drag-drop and file-picker both work; large photos keep full resolution; corrupt files fail gracefully.
- Crop: draw/resize (all 8 handles)/move/confirm/cancel; bounds clamping holds.
- Fill: tolerance 0 fills only exact-match contiguous region; raising tolerance expands it; works on transparent regions post-bg-removal.
- Background removal: first run shows model-download state and takes several seconds; second run is fast (cache hit, check Network tab); result has real transparency (export and view over a colored background); offline-first-run failure shows the error state, not a hang.
- Export: downloaded PNG opens correctly, preserves transparency, sane filename.
- Save/load: save, hard-refresh, reopen from the list — image/dimensions match; delete removes it from the index; **save a very large image and confirm the "too large to save" reminder appears and editing still works** (this is the key behavior from the resolved open question).

## Phased Milestones

- [x] **Phase 0 — Scaffold:** Vite react-ts init, install deps, folder structure, empty `EditorContext`, `App.tsx` renders `Toolbar` + `CanvasStage` placeholders. *Demonstrable: blank editor shell loads, no console errors.*
- [x] **Phase 1 — Image load + export:** `ImageDropzone`/`loadImage.ts`, `exportPng.ts` + Download button. *Demonstrable: load a photo, download it back out unmodified.*
- [x] **Phase 2 — Crop:** `coords.ts`, `CropOverlay`/`useCrop`, `applyCrop.ts`. *Demonstrable: crop and export the result.*
- [x] **Phase 3 — Bucket fill:** `colorDistance.ts`/`floodFill.ts` (+ unit tests), `BucketFillTool` UI. *Demonstrable: fill regions at varying tolerance, export.*
- [x] **Phase 4 — Background removal:** `removeBackground.ts`, `LoadingOverlay`, error/retry path, disable-others-while-processing. *Demonstrable: remove background, see transparency, export.*
- [x] **Phase 5 — Save/load:** `storage.ts` (index + per-project keys, size-estimate + quota handling), `ProjectManagerPanel`. *Demonstrable: save, hard-refresh, reopen intact; large-image reminder works.*
- [x] **Phase 6 — Polish:** consistent loading/error/disabled states, basic accessibility pass, responsive layout, empty-state coverage.

### Explicitly out of scope (stretch, not MVP)
Undo/redo, layers panel/multi-object compositing, multiple images per project, non-rectangular/aspect-locked/rotated crop, filters/adjustments, additional drawing tools (brush/shapes/text), IndexedDB/backend persistence/auth/sync, touch-gesture polish, offline/PWA support, Web Worker offload for flood fill, automated E2E (Playwright).

## Critical Files
- `src/features/canvas/CanvasStage.tsx`
- `src/features/bucketFill/floodFill.ts`
- `src/features/crop/applyCrop.ts`
- `src/features/backgroundRemoval/removeBackground.ts`
- `src/features/projects/storage.ts`

## Review / Result

All 6 phases shipped and verified. Stack matches the plan exactly: React + TypeScript + Vite, plain canvas (no Fabric.js/Cropper.js), custom scanline flood fill, `@imgly/background-removal` for client-side background removal, React Context + `useReducer` for state, localStorage-only persistence with no image downscaling.

**Verification approach:** every phase was checked two ways — `npm run build` / `npm run lint` / `npm test` (28 Vitest unit tests covering crop geometry, `applyCrop`, `colorDistance`, `floodFill`, and `storage.ts`'s quota/size-limit handling with a mocked `localStorage`), and a real headless-Chromium pass via Playwright (installed manually since this project has no `chromium-cli`) driving the actual dev server — screenshots, real pointer drags, real file uploads, real downloads, and pixel-level assertions on canvas output.

**Bugs found and fixed during browser verification** (none of which build/lint/tests would have caught):
- Phase 1: both canvas layers were `position: absolute` inside a sizeless parent, collapsing the whole canvas to 0×0 — image loaded correctly in memory but rendered invisible. Fixed by keeping the base canvas in normal flow and only absolutely-positioning the overlay on top of it.
- Phase 2: crop handle hit-zones could overlap on small rects, so an adjacent edge handle could shadow a corner handle. Fixed by giving corners hit-test priority over edges.
- Test-script-only issue (not an app bug), Phase 3: setting a controlled `<input type="color">`'s value via manual `dispatchEvent` in a test script doesn't trigger React's change detection — confirmed the fill pipeline was correct throughout, just needed Playwright's `fill()` instead.

**Deliberately out of scope**, per the plan: undo/redo, layers/multi-object compositing, multiple images per project, non-rectangular/rotated crop, filters/adjustments, additional drawing tools, IndexedDB/backend persistence, touch-gesture polish, offline/PWA support, Web Worker offload for flood fill, automated E2E suite.
