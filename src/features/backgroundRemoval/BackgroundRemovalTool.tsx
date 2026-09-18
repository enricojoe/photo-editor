import { useEffect, useState } from 'react'
import { useCanvasRefs, useEditorDispatch } from '../../state/EditorContext'
import { removeBackgroundFromCanvas } from './removeBackground'

type Status = { phase: 'processing'; label: string } | { phase: 'error'; message: string }

export function BackgroundRemovalTool() {
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const [status, setStatus] = useState<Status>({ phase: 'processing', label: 'Starting…' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const canvas = baseCanvasRef.current
    if (!canvas) return
    let cancelled = false

    setStatus({ phase: 'processing', label: 'Starting…' })

    removeBackgroundFromCanvas(canvas, {
      onProgress: (key, current, total) => {
        if (cancelled) return
        const label = total > 0 ? `${key} — ${Math.round((current / total) * 100)}%` : key
        setStatus({ phase: 'processing', label })
      },
    })
      .then(({ width, height }) => {
        if (cancelled) return
        const overlay = overlayCanvasRef.current
        if (overlay) {
          overlay.width = width
          overlay.height = height
        }
        dispatch({ type: 'IMAGE_LOADED', width, height })
        dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStatus({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Failed to remove background',
        })
      })

    return () => {
      cancelled = true
    }
  }, [attempt, baseCanvasRef, overlayCanvasRef, dispatch])

  const handleRetry = () => setAttempt((n) => n + 1)
  const handleCancel = () => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })

  return (
    <div className="processing-overlay">
      {status.phase === 'processing' && (
        <>
          <p>Removing background…</p>
          <p className="processing-overlay__label">{status.label}</p>
          <p className="processing-overlay__hint">
            First use downloads a small model — this only happens once per browser.
          </p>
        </>
      )}
      {status.phase === 'error' && (
        <>
          <p className="processing-overlay__error">{status.message}</p>
          <div className="processing-overlay__actions">
            <button type="button" onClick={handleRetry}>
              Retry
            </button>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
