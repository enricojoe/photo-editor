import { useEffect, useRef } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState } from '../../state/EditorContext'
import { pointerToCanvasPoint } from '../canvas/coords'
import { sampleHexColor } from './sampleColor'

export function ColorPickerTool() {
  const { pickedColor } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const isSamplingRef = useRef(false)

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const baseCanvas = baseCanvasRef.current
    if (!overlay || !baseCanvas) return

    overlay.style.pointerEvents = 'auto'
    overlay.style.cursor = 'crosshair'

    const sampleAt = (event: PointerEvent) => {
      const ctx = baseCanvas.getContext('2d')
      if (!ctx) return
      const point = pointerToCanvasPoint(event, overlay)
      const hex = sampleHexColor(ctx, baseCanvas.width, baseCanvas.height, point)
      dispatch({ type: 'SET_PICKED_COLOR', color: hex })
    }

    const onPointerDown = (event: PointerEvent) => {
      overlay.setPointerCapture(event.pointerId)
      isSamplingRef.current = true
      sampleAt(event)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isSamplingRef.current) return
      sampleAt(event)
    }

    const stopSampling = () => {
      isSamplingRef.current = false
    }

    overlay.addEventListener('pointerdown', onPointerDown)
    overlay.addEventListener('pointermove', onPointerMove)
    overlay.addEventListener('pointerup', stopSampling)
    overlay.addEventListener('pointercancel', stopSampling)
    return () => {
      overlay.removeEventListener('pointerdown', onPointerDown)
      overlay.removeEventListener('pointermove', onPointerMove)
      overlay.removeEventListener('pointerup', stopSampling)
      overlay.removeEventListener('pointercancel', stopSampling)
      overlay.style.pointerEvents = 'none'
      overlay.style.cursor = ''
    }
  }, [overlayCanvasRef, baseCanvasRef, dispatch])

  const handleDone = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  return (
    <div className="color-picker-controls">
      <div className="color-picker-controls__swatch-row">
        <div
          className="color-picker-controls__swatch"
          style={{ backgroundColor: pickedColor ?? 'transparent' }}
          aria-hidden="true"
        />
        <span>{pickedColor ?? 'No color sampled yet'}</span>
      </div>
      <p className="color-picker-controls__hint">Click or drag on the image to sample a color.</p>
      <button type="button" onClick={handleDone}>
        Done
      </button>
    </div>
  )
}
