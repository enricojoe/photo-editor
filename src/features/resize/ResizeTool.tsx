import { useState, type FormEvent } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState, useHistory } from '../../state/EditorContext'
import { applyResizeToCanvas } from './applyResize'
import {
  MAX_RESIZE_SIZE,
  MIN_RESIZE_SIZE,
  type ResizeRequest,
  exceedsMaxSize,
  parsePositiveNumber,
  proportionalLength,
  resolveResizeTarget,
} from './resizeGeometry'

export function ResizeTool() {
  const { imageWidth, imageHeight } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const { pushSnapshot } = useHistory()

  const sourceWidth = imageWidth ?? 0
  const sourceHeight = imageHeight ?? 0

  const [mode, setMode] = useState<ResizeRequest['mode']>('pixels')
  const [widthText, setWidthText] = useState(String(sourceWidth))
  const [heightText, setHeightText] = useState(String(sourceHeight))
  const [lockAspect, setLockAspect] = useState(true)
  const [percentText, setPercentText] = useState('100')

  // While locked, the field being edited drives the other one. A half-typed
  // value (empty, "0", ...) leaves the other field as it was.
  const handleWidthChange = (text: string) => {
    setWidthText(text)
    const width = parsePositiveNumber(text)
    if (lockAspect && width !== null) {
      setHeightText(String(proportionalLength(width, sourceWidth, sourceHeight)))
    }
  }

  const handleHeightChange = (text: string) => {
    setHeightText(text)
    const height = parsePositiveNumber(text)
    if (lockAspect && height !== null) {
      setWidthText(String(proportionalLength(height, sourceHeight, sourceWidth)))
    }
  }

  const handleLockChange = (locked: boolean) => {
    setLockAspect(locked)
    const width = parsePositiveNumber(widthText)
    if (locked && width !== null) {
      setHeightText(String(proportionalLength(width, sourceWidth, sourceHeight)))
    }
  }

  const request: ResizeRequest =
    mode === 'pixels'
      ? { mode: 'pixels', width: widthText, height: heightText }
      : { mode: 'percent', percent: percentText }
  const target = resolveResizeTarget(request, { width: sourceWidth, height: sourceHeight })
  const isTooLarge = target !== null && exceedsMaxSize(target)
  const isUnchanged = target !== null && target.width === sourceWidth && target.height === sourceHeight
  const canApply = target !== null && !isTooLarge && !isUnchanged

  const handleApply = () => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas || !target || !canApply) return

    pushSnapshot()
    applyResizeToCanvas(baseCanvas, target.width, target.height)

    const overlay = overlayCanvasRef.current
    if (overlay) {
      overlay.width = target.width
      overlay.height = target.height
    }
    dispatch({ type: 'IMAGE_LOADED', width: target.width, height: target.height })
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleCancel = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    handleApply()
  }

  return (
    <form className="resize-controls" onSubmit={handleSubmit}>
      <p className="resize-controls__summary">
        Current size: {sourceWidth} × {sourceHeight} px
      </p>
      <div className="resize-mode-toggle" role="group" aria-label="Resize by">
        <button
          type="button"
          className={
            mode === 'pixels'
              ? 'resize-mode-toggle__button resize-mode-toggle__button--active'
              : 'resize-mode-toggle__button'
          }
          aria-pressed={mode === 'pixels'}
          onClick={() => setMode('pixels')}
        >
          Pixels
        </button>
        <button
          type="button"
          className={
            mode === 'percent'
              ? 'resize-mode-toggle__button resize-mode-toggle__button--active'
              : 'resize-mode-toggle__button'
          }
          aria-pressed={mode === 'percent'}
          onClick={() => setMode('percent')}
        >
          Percent
        </button>
      </div>
      {mode === 'pixels' ? (
        <>
          <div className="resize-controls__fields">
            <label className="resize-controls__field">
              Width (px)
              <input
                type="number"
                min={MIN_RESIZE_SIZE}
                max={MAX_RESIZE_SIZE}
                value={widthText}
                onChange={(event) => handleWidthChange(event.target.value)}
              />
            </label>
            <label className="resize-controls__field">
              Height (px)
              <input
                type="number"
                min={MIN_RESIZE_SIZE}
                max={MAX_RESIZE_SIZE}
                value={heightText}
                onChange={(event) => handleHeightChange(event.target.value)}
              />
            </label>
          </div>
          <label className="resize-controls__lock">
            <input type="checkbox" checked={lockAspect} onChange={(event) => handleLockChange(event.target.checked)} />
            Lock aspect ratio
          </label>
        </>
      ) : (
        <label className="resize-controls__field">
          Scale (%)
          <input
            type="number"
            min={0}
            step="any"
            value={percentText}
            onChange={(event) => setPercentText(event.target.value)}
          />
        </label>
      )}
      <p className="resize-controls__summary">New size: {target ? `${target.width} × ${target.height} px` : '—'}</p>
      {isTooLarge && (
        <p className="resize-controls__hint" role="alert">
          Max {MAX_RESIZE_SIZE} px per side.
        </p>
      )}
      <div className="resize-controls__actions">
        <button type="submit" className="btn-primary" disabled={!canApply}>
          Apply Resize
        </button>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
