# Dropzone Centering, Hex Color Input, Multi-Format Export

## Context
Three small UX gaps in the photo editor:
1. The empty-state "Drag and drop an image here" panel doesn't fill/center in the main canvas area — it hugs the top-left because `.canvas-stage` uses `justify-content: flex-start` and `.image-dropzone` has no sizing to grow into the available space.
2. The Bucket Fill tool's color picker (`src/features/bucketFill/BucketFillTool.tsx`) only exposes a native `<input type="color">` swatch — there's no way to type/paste a hex value directly.
3. Export (`src/lib/exportPng.ts`, wired up in `src/components/Toolbar.tsx`) is hardcoded to PNG only — no way to export as JPG/JPEG/WEBP.

Codebase is a small React 19 + TypeScript + Vite app (no backend). Verification tools available: `npm run build` (tsc + vite build), `npm run lint` (oxlint), `npm test` (vitest). No git repo yet, so no diffing against a baseline branch.

## 1. Center & fill the dropzone
**File:** `src/App.css`

`.image-dropzone` (line ~159) currently has no `flex`/`justify-content`, so inside `.canvas-stage` (a row flex container with `align-items: stretch`) it stretches vertically but hugs the left edge and top of its content.

Change:
```css
.image-dropzone {
  display: flex;
  flex: 1;                 /* grow to fill canvas-stage's main axis */
  flex-direction: column;
  align-items: center;
  justify-content: center; /* center content on the now-full height */
  gap: 12px;
  padding: 48px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background: var(--panel-bg);
  color: var(--text);
}
```
No JSX changes needed — `CanvasStage.tsx` already renders `<ImageDropzone />` as the sole child of `.canvas-stage` when there's no image. This also holds up in the `@media (max-width: 720px)` column layout since `flex: 1` fills remaining vertical space there too.

## 2. Hex text input alongside the color swatch
**File:** `src/features/bucketFill/BucketFillTool.tsx`

Keep the native `<input type="color">` (best UX for picking), and add a synced `<input type="text">` for typing/pasting hex codes. Two-way sync needs a separate "raw text" state so an in-progress keystroke (e.g. `#e6`) doesn't get clobbered by re-formatting on every render:

- Add `normalizeHex(raw: string): string | null` — accepts `#rgb`, `rgb`, `#rrggbb`, `rrggbb` (case-insensitive), returns lowercase `#rrggbb` or `null` if invalid.
- Add local state `hexText` initialized to `color`; a `useEffect` keeps `hexText` in sync when `color` changes via the swatch.
- Text input's `onChange` updates `hexText` immediately (so typing is never blocked) and calls `setColor(normalized)` only when `normalizeHex` succeeds.
- Wrap swatch + text input in a small flex row so they sit side by side.

```tsx
function normalizeHex(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned.split('').map((c) => c + c).join('').toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`
  }
  return null
}
```

```tsx
const [color, setColor] = useState('#e63946')
const [hexText, setHexText] = useState(color)

useEffect(() => {
  setHexText(color)
}, [color])
```

```tsx
<label>
  Color
  <div className="bucket-fill-controls__color">
    <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
    <input
      type="text"
      className="bucket-fill-controls__hex"
      value={hexText}
      onChange={(event) => {
        const raw = event.target.value
        setHexText(raw)
        const normalized = normalizeHex(raw)
        if (normalized) setColor(normalized)
      }}
      placeholder="#RRGGBB"
      maxLength={7}
      aria-label="Hex color"
    />
  </div>
</label>
```

**File:** `src/App.css` — small additions near `.bucket-fill-controls` (line ~270):
```css
.bucket-fill-controls__color {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bucket-fill-controls__hex {
  width: 90px;
  text-transform: uppercase;
}
```

## 3. Multi-format export (PNG / JPG / JPEG / WEBP)
**File:** rename `src/lib/exportPng.ts` → `src/lib/exportImage.ts` (scope is no longer PNG-only).

```ts
export type ExportFormat = 'png' | 'jpg' | 'jpeg' | 'webp'

const FORMAT_CONFIG: Record<ExportFormat, { mime: string; extension: string }> = {
  png: { mime: 'image/png', extension: 'png' },
  jpg: { mime: 'image/jpeg', extension: 'jpg' },
  jpeg: { mime: 'image/jpeg', extension: 'jpeg' },
  webp: { mime: 'image/webp', extension: 'webp' },
}

const JPEG_QUALITY = 0.92

export function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { mime } = FORMAT_CONFIG[format]
    // JPEG has no alpha channel; flatten onto white first so transparent
    // areas (e.g. after background removal) don't turn black.
    const source = mime === 'image/jpeg' ? flattenOnWhite(canvas) : canvas

    source.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export image'))
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        resolve()
      },
      mime,
      mime === 'image/jpeg' ? JPEG_QUALITY : undefined,
    )
  })
}

function flattenOnWhite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const flat = document.createElement('canvas')
  flat.width = canvas.width
  flat.height = canvas.height
  const ctx = flat.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, flat.width, flat.height)
  ctx.drawImage(canvas, 0, 0)
  return flat
}

export function defaultExportFilename(format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `photo-edit-${timestamp}.${FORMAT_CONFIG[format].extension}`
}
```

**File:** `src/components/Toolbar.tsx` — replace the single "Export PNG" button with a format `<select>` + "Export" button:
```tsx
import { useState } from 'react'
import { exportCanvasAsImage, defaultExportFilename, type ExportFormat } from '../lib/exportImage'
...
const [exportFormat, setExportFormat] = useState<ExportFormat>('png')

const handleExport = () => {
  const canvas = baseCanvasRef.current
  if (!canvas) return
  void exportCanvasAsImage(canvas, defaultExportFilename(exportFormat), exportFormat)
}
```
```tsx
<div className="toolbar__export">
  <select
    value={exportFormat}
    onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
    disabled={!hasImage || isToolActive}
    aria-label="Export format"
  >
    <option value="png">PNG</option>
    <option value="jpg">JPG</option>
    <option value="jpeg">JPEG</option>
    <option value="webp">WEBP</option>
  </select>
  <button type="button" className="btn-primary" onClick={handleExport} disabled={!hasImage || isToolActive}>
    Export
  </button>
</div>
```

**File:** `src/App.css` — add a `select` style consistent with existing `input[type='text']` styling (no `select` rule currently exists), plus a row wrapper:
```css
.app select {
  padding: 6px 10px;
  font: inherit;
  font-size: 14px;
  color: var(--text-h);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.toolbar__export {
  display: flex;
  gap: 6px;
}

.toolbar__export select {
  flex: 1;
  min-width: 0;
}

.toolbar__export button {
  flex: 1;
}
```
This nests inside the existing `.toolbar` flex column, and the existing `.rail .toolbar button` padding rule still applies via descendant selector.

## Files touched
- `src/App.css` (dropzone fill/center, hex-input row, select + export-row styles)
- `src/features/bucketFill/BucketFillTool.tsx` (hex text input + sync logic)
- `src/lib/exportPng.ts` → `src/lib/exportImage.ts` (generalized multi-format export)
- `src/components/Toolbar.tsx` (format selector wired to export)

## Out of scope
- No quality slider for JPEG (fixed at 0.92) — not requested.
- No changes to `ImageDropzone.tsx` JSX — CSS-only fix.
- No new automated tests (no existing tests cover UI/export; would require mocking `canvas.toBlob`, disproportionate to the ask). Verification is manual + typecheck/lint/build.

## Verification
1. `npm run build` — confirms TypeScript compiles and Vite bundles cleanly (catches the file rename/import update).
2. `npm run lint` — oxlint passes on changed files.
3. `npm test` — existing vitest suite still passes (unaffected by these changes, but confirms no regressions).
4. `npm run dev` and manually check in browser:
   - Dropzone fills and centers in the main area with no image loaded, at desktop and narrow widths.
   - Bucket Fill: typing a hex value (e.g. `00ff00`, `#00f`) updates the swatch and produces the correct fill color; swatch picks still update the hex field.
   - Export: with an image loaded, exporting as PNG/JPG/JPEG/WEBP each downloads a correctly-named, correctly-typed file; after a background-removal pass, JPEG/JPG export shows a white background instead of black where transparency was.

## Per-project task tracking (per global CLAUDE.md)
- This plan file's content will also be written to `tasks/plans/dropzone-hex-export-enhancements.md` and referenced from `tasks/todo.md` once implementation starts.

## Progress
- [x] Center/fill dropzone (`.image-dropzone` gets `flex: 1` + `justify-content: center`)
- [x] Hex input synced with color swatch in `BucketFillTool.tsx`
- [x] Rename `exportPng.ts` → `exportImage.ts`, generalize to PNG/JPG/JPEG/WEBP with white-flatten for JPEG
- [x] Wire format `<select>` into `Toolbar.tsx`
- [x] `npm run build`, `npm run lint`, `npm test` all pass

## Result
All three changes implemented and verified via build/lint/test (50/50 tests pass, no new lint warnings — a `set-state-in-effect` warning oxlint raised on the first hex-sync attempt was fixed by switching to React's "adjust state during render" pattern instead of `useEffect`). Dev server confirmed serving correctly via curl.

**Not independently verified**: pixel-level visual behavior in an actual browser (centering, hex sync UX, downloaded file correctness/format) — no browser automation tool was available in this session. The CSS/logic was verified by reading the resulting flex layout and mime/extension mappings; the user should give it a quick look with `npm run dev` to confirm it looks/feels right.
