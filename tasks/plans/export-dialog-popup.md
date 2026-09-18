# Export Dialog Popup

## Context
Follow-up refinement to the export feature added earlier (`src/lib/exportImage.ts`, wired into `src/components/Toolbar.tsx` via an inline `<select>` + "Export" button in the left rail). The user wants that inline dropdown replaced: clicking "Export" should open a popup dialog that lets the user pick the extension (PNG/JPG/JPEG/WEBP), set a quality percentage (only for formats that support lossy quality — not PNG), and type a filename (without the extension, since that's chosen separately). Also a small standalone fix: the "Choose an image" button in the empty-state dropzone should span the full width of its card (already done directly, not part of this plan — see below).

The app has no existing true modal/overlay pattern — the closest analog is `ProjectManagerPanel` (`src/features/projects/ProjectManagerPanel.tsx`), which toggles an absolutely-positioned flyout anchored next to its trigger button (`.project-manager__panel`). Given the export dialog needs three distinct fields (format, quality, filename) and reads more like a deliberate "export as…" action, a centered modal with a backdrop (click-outside or Escape to close) is a better fit than a rail-anchored flyout, and is the standard interpretation of "popup" here.

## 1. Generalize `src/lib/exportImage.ts` to support quality + separate filename/extension
Current API: `exportCanvasAsImage(canvas, filename, format)` and `defaultExportFilename(format)` (timestamp + extension baked in together). Rework to split base name from extension, and thread a quality percentage through to `canvas.toBlob`:

```ts
export type ExportFormat = 'png' | 'jpg' | 'jpeg' | 'webp'

interface FormatMeta { mime: string; extension: string; supportsQuality: boolean }

const FORMAT_CONFIG: Record<ExportFormat, FormatMeta> = {
  png: { mime: 'image/png', extension: 'png', supportsQuality: false },
  jpg: { mime: 'image/jpeg', extension: 'jpg', supportsQuality: true },
  jpeg: { mime: 'image/jpeg', extension: 'jpeg', supportsQuality: true },
  webp: { mime: 'image/webp', extension: 'webp', supportsQuality: true },
}

export const DEFAULT_QUALITY_PERCENT = 92

export function formatExtension(format: ExportFormat): string {
  return FORMAT_CONFIG[format].extension
}

export function formatSupportsQuality(format: ExportFormat): boolean {
  return FORMAT_CONFIG[format].supportsQuality
}

export function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat,
  qualityPercent: number = DEFAULT_QUALITY_PERCENT,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { mime, supportsQuality } = FORMAT_CONFIG[format]
    // JPEG has no alpha channel; flatten onto white first so transparent
    // areas (e.g. after background removal) don't turn black.
    const source = mime === 'image/jpeg' ? flattenOnWhite(canvas) : canvas
    const quality = supportsQuality ? qualityPercent / 100 : undefined

    source.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Failed to export image')); return }
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
      quality,
    )
  })
}

function flattenOnWhite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // unchanged from current implementation
}

export function defaultExportBaseName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `photo-edit-${timestamp}`
}

export function sanitizeFilename(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/[\\/]/g, '-')
  return cleaned.length > 0 ? cleaned : fallback
}

export function buildExportFilename(baseName: string, format: ExportFormat): string {
  return `${baseName}.${formatExtension(format)}`
}
```
Remove the old `defaultExportFilename(format)` — replaced by `defaultExportBaseName()` + `buildExportFilename()`.

## 2. New component: `src/features/export/ExportDialog.tsx`
A centered modal, mounted conditionally from `Toolbar.tsx`. Props: `{ canvas: HTMLCanvasElement | null; onClose: () => void }`.

State:
- `format: ExportFormat` — default `'png'`.
- `quality: number` — default `DEFAULT_QUALITY_PERCENT` (92).
- `filename: string` — lazily initialized from `defaultExportBaseName()` via `useState(() => defaultExportBaseName())`.

Behavior:
- Format picker: 4 segmented buttons (PNG/JPG/JPEG/WEBP), same visual pattern as the existing `.crop-presets__button`/`.selection-shape-toggle__button` active-state toggles in `App.css` — reuse that convention with a new `.export-format-options` / `.export-format-options__button--active` pair.
- Quality slider: only rendered when `formatSupportsQuality(format)` is true (hidden for PNG). Range input 1–100 with a live "%" readout, same pattern as the tolerance slider in `BucketFillTool.tsx`.
- Filename: text input bound to `filename` (raw, unsanitized while typing) with a fixed, non-editable extension suffix next to it (e.g. `.png`) that updates live as `format` changes.
- Escape key and backdrop click both call `onClose` (a `useEffect` keydown listener + an `onClick` on the overlay div, with `stopPropagation` on the inner modal box).
- "Cancel" button calls `onClose`. "Export" button (primary) does:
  ```ts
  const baseName = sanitizeFilename(filename, defaultExportBaseName())
  const finalFilename = buildExportFilename(baseName, format)
  onClose()
  void exportCanvasAsImage(canvas, finalFilename, format, quality)
  ```
  (guard on `canvas` being non-null first).

## 3. `src/components/Toolbar.tsx`
Remove the inline `<select>` + `exportFormat` state. Replace with:
- `const [isExportOpen, setIsExportOpen] = useState(false)`
- A single button: `<button type="button" className="btn-primary" onClick={() => setIsExportOpen(true)} disabled={!hasImage || isToolActive}>Export</button>`
- `{isExportOpen && <ExportDialog canvas={baseCanvasRef.current} onClose={() => setIsExportOpen(false)} />}`

Drop the now-unused `.toolbar__export` wrapper div (revert to a plain button like the other toolbar actions).

## 4. `src/App.css`
- Remove `.toolbar__export` / `.app select` rules added for the old inline dropdown (no longer used anywhere — confirm nothing else references `select` before deleting; currently nothing does).
- Add modal + dialog styles:
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 6, 13, 0.5);
  z-index: 100;
  padding: 20px;
}

.modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 360px;
  padding: 20px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.modal h2 {
  margin: 0;
  font-size: 17px;
}

.modal label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--text-h);
}

.export-format-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.export-format-options__button.export-format-options__button--active {
  background-color: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}

.export-dialog__quality {
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-dialog__quality input[type='range'] {
  flex: 1;
  min-width: 0;
}

.export-dialog__filename {
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-dialog__filename input[type='text'] {
  flex: 1;
  min-width: 0;
}

.export-dialog__extension {
  color: var(--text);
  font-size: 14px;
  white-space: nowrap;
}

.export-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

## Files touched
- `src/lib/exportImage.ts` (quality param, split base name/extension helpers)
- `src/features/export/ExportDialog.tsx` (new)
- `src/components/Toolbar.tsx` (drop inline select, open dialog instead)
- `src/App.css` (remove old select/export-row rules, add modal + dialog rules)

## Out of scope
- No focus trap inside the modal (Escape + backdrop-click + Cancel button are enough affordance for this app's scope).
- No persistence of the user's last-chosen format/quality/filename across sessions.

## Verification
1. `npm run build`, `npm run lint`, `npm test` — same gate as before.
2. Manual (no browser automation tool available in this session, so this step is for the user or a follow-up session with browser access):
   - Click "Export" with an image loaded → modal appears centered with PNG selected by default, no quality slider, filename pre-filled, `.png` suffix shown.
   - Switch to JPG/JPEG/WEBP → quality slider appears; move it; suffix updates to match.
   - Edit filename, hit Export → downloaded file uses the typed name + correct extension.
   - Escape and backdrop click both dismiss without exporting; Cancel does the same.

## Progress
- [x] Reworked `exportImage.ts`: split filename/extension, added quality param + `formatSupportsQuality`
- [x] New `ExportDialog.tsx`: format toggle, conditional quality slider, filename input with extension suffix, Escape/backdrop/Cancel to close
- [x] `Toolbar.tsx`: dropped inline `<select>`, opens dialog on "Export" click
- [x] `App.css`: removed stale select/export-row rules, added modal + dialog styles
- [x] `npm run build`, `npm run lint`, `npm test` all pass

## Result
Implemented as planned. One deviation caught by lint: passing `baseCanvasRef.current` directly as a prop during render (`<ExportDialog canvas={baseCanvasRef.current} />`) triggered oxlint's `react(refs)` warning (reading `ref.current` during render is a React footgun — can be stale/inconsistent). Fixed by passing the `RefObject` itself (`canvasRef`) instead and dereferencing `.current` only inside the `handleExport` event handler. Build/lint/test all clean (only pre-existing unrelated `EditorContext.tsx` warnings remain).

**Not independently verified**: actual visual/interactive behavior in a browser — no browser automation tool was available this session. Confirmed via `npm run build`/`vite` dev-server transform that the module loads without runtime errors; the user should click through the dialog once with `npm run dev` to confirm feel/positioning.

## Reverted
The user asked to turn the export UI back into a dropdown. Reverted in full:
- Deleted `src/features/export/ExportDialog.tsx` and the now-empty `src/features/export/` directory.
- `src/lib/exportImage.ts` restored to the simpler pre-dialog shape: `exportCanvasAsImage(canvas, filename, format)` (fixed internal JPEG quality of 0.92, no quality param) and `defaultExportFilename(format)` combining timestamp + extension. Dropped `formatExtension`, `formatSupportsQuality`, `sanitizeFilename`, `buildExportFilename`, `defaultExportBaseName`, `DEFAULT_QUALITY_PERCENT` — all were only used by the dialog and would otherwise be dead exports.
- `src/components/Toolbar.tsx` restored the inline `<select>` (PNG/JPG/JPEG/WEBP) + "Export" button in a `.toolbar__export` row, immediate download on click, no modal/state for opening a dialog.
- `src/App.css` removed the modal/dialog rules (`.modal-overlay`, `.modal`, `.export-format-options`, `.export-dialog__*`) and restored `.app select` + `.toolbar__export` rules.
- Separately (unrelated to export): `.image-dropzone` reverted from `align-items: stretch` back to `align-items: center` — the dropzone card itself keeps `flex: 1` (full width, from the earlier bug fix), but the "Choose an image" button and text are no longer stretched to the card's full width.
- Verified: `npm run build` (48 modules, confirming the dialog module is gone), `npm run lint` (only pre-existing unrelated warnings), `npm test` (50/50 passing).

## Un-reverted (restored the popup)
The revert above was a misread: "export button turn to dropdown again, fix it" was reporting the export UI unexpectedly behaving like a dropdown again (a bug to fix), not asking for the dropdown back — confirmed by the user's follow-up "for export, it should have popup, why do you change that." Restored the popup exactly as it was before the revert: `src/lib/exportImage.ts` (quality-aware API), `src/features/export/ExportDialog.tsx`, `src/components/Toolbar.tsx` (opens dialog), `src/App.css` (modal rules back, dropdown rules removed). Verified via `npm run build` (49 modules again), `npm run lint`, `npm test` (50/50).

**Still open**: the original "fix it" bug report was never actually diagnosed — it got lost when the popup was removed instead of debugged. Need the user to describe what was wrong with the popup so it can be fixed for real.
