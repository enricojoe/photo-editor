import { useEffect, useState, type RefObject } from 'react'
import {
  buildExportFilename,
  defaultExportBaseName,
  exportCanvasAsImage,
  formatSupportsQuality,
  sanitizeFilename,
  DEFAULT_QUALITY_PERCENT,
  type ExportFormat,
} from '../../lib/exportImage'

const FORMAT_OPTIONS: ExportFormat[] = ['png', 'jpg', 'jpeg', 'webp']

export function ExportDialog({
  canvasRef,
  onClose,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  onClose: () => void
}) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(DEFAULT_QUALITY_PERCENT)
  const [filename, setFilename] = useState(() => defaultExportBaseName())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const baseName = sanitizeFilename(filename, defaultExportBaseName())
    const finalFilename = buildExportFilename(baseName, format)
    onClose()
    void exportCanvasAsImage(canvas, finalFilename, format, quality)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="export-dialog-title">Export Image</h2>

        <label>
          Format
          <div className="export-format-options">
            {FORMAT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`export-format-options__button${
                  option === format ? ' export-format-options__button--active' : ''
                }`}
                onClick={() => setFormat(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </label>

        {formatSupportsQuality(format) && (
          <label>
            Quality
            <div className="export-dialog__quality">
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
              />
              <span>{quality}%</span>
            </div>
          </label>
        )}

        <label>
          File name
          <div className="export-dialog__filename">
            <input
              type="text"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              aria-label="File name without extension"
            />
            <span className="export-dialog__extension">.{format}</span>
          </div>
        </label>

        <div className="export-dialog__actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
