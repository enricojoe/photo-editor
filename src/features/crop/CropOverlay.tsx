import { useEffect, useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState } from '../../state/EditorContext'
import { getCanvasScale } from '../canvas/coords'
import { useCrop } from './useCrop'
import { applyCropToCanvas } from './applyCrop'
import { CORNER_HANDLES, MIN_CROP_SIZE, type CropHandle, handlePositions } from './cropGeometry'

// CSS pixels — scaled by getCanvasScale() before drawing so handles look
// the same size on screen regardless of the loaded image's resolution.
const EDGE_HANDLE_SIZE = 10
const CORNER_HANDLE_SIZE = 16

const CROP_PRESETS: { label: string; value: number | null }[] = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
]

export function CropOverlay() {
  const { imageWidth, imageHeight } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()

  const { rect, aspectRatio, setAspectRatio, setCustomSize, handlePointerDown, handlePointerMove, handlePointerUp } =
    useCrop({
      imageWidth: imageWidth ?? 0,
      imageHeight: imageHeight ?? 0,
    })

  const [customActive, setCustomActive] = useState(false)
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext('2d')
    if (!overlay || !ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(0, 0, overlay.width, overlay.height)
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, Math.max(rect.width - 1, 0), Math.max(rect.height - 1, 0))

    ctx.fillStyle = '#ffffff'
    const scale = getCanvasScale(overlay)
    const positions = handlePositions(rect)
    const visibleHandles = aspectRatio === null ? (Object.keys(positions) as CropHandle[]) : CORNER_HANDLES
    for (const key of visibleHandles) {
      const pos = positions[key]
      const size = (CORNER_HANDLES.includes(key) ? CORNER_HANDLE_SIZE : EDGE_HANDLE_SIZE) * scale
      ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size)
    }
  }, [rect, overlayCanvasRef, aspectRatio])

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

  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext('2d')
    if (overlay && ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
  }

  const handleConfirm = () => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas) return

    const cropped = applyCropToCanvas(baseCanvas, rect)
    const overlay = overlayCanvasRef.current
    if (overlay) {
      overlay.width = cropped.width
      overlay.height = cropped.height
    }
    dispatch({ type: 'IMAGE_LOADED', width: cropped.width, height: cropped.height })
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleCancel = () => {
    clearOverlay()
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const canConfirm = rect.width >= MIN_CROP_SIZE && rect.height >= MIN_CROP_SIZE

  const handleSelectPreset = (value: number | null) => {
    setCustomActive(false)
    setAspectRatio(value)
  }

  const handleSelectCustom = () => {
    setCustomActive(true)
    setCustomWidth(String(Math.round(rect.width)))
    setCustomHeight(String(Math.round(rect.height)))
  }

  const parsedCustomWidth = Number(customWidth)
  const parsedCustomHeight = Number(customHeight)
  const canApplyCustomSize =
    customWidth.trim() !== '' &&
    customHeight.trim() !== '' &&
    Number.isFinite(parsedCustomWidth) &&
    Number.isFinite(parsedCustomHeight) &&
    parsedCustomWidth > 0 &&
    parsedCustomHeight > 0

  const handleApplyCustomSize = () => {
    if (!canApplyCustomSize) return
    setCustomSize(parsedCustomWidth, parsedCustomHeight)
  }

  return (
    <>
      <div className="crop-presets" role="group" aria-label="Aspect ratio">
        {CROP_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={
              aspectRatio === preset.value && !customActive
                ? 'crop-presets__button crop-presets__button--active'
                : 'crop-presets__button'
            }
            aria-pressed={aspectRatio === preset.value && !customActive}
            onClick={() => handleSelectPreset(preset.value)}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className={customActive ? 'crop-presets__button crop-presets__button--active' : 'crop-presets__button'}
          aria-pressed={customActive}
          onClick={handleSelectCustom}
        >
          Custom
        </button>
      </div>
      {customActive && (
        <div className="crop-custom-size">
          <label className="crop-custom-size__field">
            Width
            <input
              type="number"
              min={MIN_CROP_SIZE}
              max={imageWidth ?? undefined}
              value={customWidth}
              onChange={(event) => setCustomWidth(event.target.value)}
            />
          </label>
          <label className="crop-custom-size__field">
            Height
            <input
              type="number"
              min={MIN_CROP_SIZE}
              max={imageHeight ?? undefined}
              value={customHeight}
              onChange={(event) => setCustomHeight(event.target.value)}
            />
          </label>
          <button type="button" onClick={handleApplyCustomSize} disabled={!canApplyCustomSize}>
            Apply
          </button>
        </div>
      )}
      <div className="crop-controls">
        <button type="button" className="btn-primary" onClick={handleConfirm} disabled={!canConfirm}>
          Confirm Crop
        </button>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </>
  )
}
