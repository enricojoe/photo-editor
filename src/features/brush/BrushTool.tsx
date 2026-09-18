import { useEffect, useRef, useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState, useHistory } from '../../state/EditorContext'
import { pointerToCanvasPoint, getCanvasScale, type CanvasPoint } from '../canvas/coords'
import { normalizeHex } from '../../lib/hexColor'
import { strokeBrushSegment } from './drawBrushStroke'
import { buildBrushCursor } from './brushCursor'

export function BrushTool() {
  const { selection, pickedColor } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const { pushSnapshot } = useHistory()
  const [color, setColor] = useState(pickedColor ?? '#e63946')
  const [hexText, setHexText] = useState(color)
  const [syncedColor, setSyncedColor] = useState(color)
  const [size, setSize] = useState(10)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<CanvasPoint>({ x: 0, y: 0 })

  if (color !== syncedColor) {
    setSyncedColor(color)
    setHexText(color)
  }

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const baseCanvas = baseCanvasRef.current
    if (!overlay || !baseCanvas) return

    overlay.style.pointerEvents = 'auto'

    const updateCursor = () => {
      overlay.style.cursor = buildBrushCursor(size / getCanvasScale(overlay))
    }
    updateCursor()
    window.addEventListener('resize', updateCursor)

    const paintSegment = (from: CanvasPoint, to: CanvasPoint) => {
      const ctx = baseCanvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      if (selection) {
        const { shapeData } = selection
        ctx.beginPath()
        if (shapeData.shape === 'rectangle') {
          const { rect } = shapeData
          ctx.rect(rect.x, rect.y, rect.width, rect.height)
        } else {
          const { points } = shapeData
          ctx.moveTo(points[0].x, points[0].y)
          points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
          ctx.closePath()
        }
        ctx.clip()
      }
      strokeBrushSegment(ctx, from, to, { size, color })
      ctx.restore()
    }

    const onPointerDown = (event: PointerEvent) => {
      overlay.setPointerCapture(event.pointerId)
      pushSnapshot()
      const point = pointerToCanvasPoint(event, overlay)
      lastPointRef.current = point
      isDrawingRef.current = true
      paintSegment(point, point)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current) return
      const point = pointerToCanvasPoint(event, overlay)
      paintSegment(lastPointRef.current, point)
      lastPointRef.current = point
    }

    const stopDrawing = () => {
      isDrawingRef.current = false
    }

    overlay.addEventListener('pointerdown', onPointerDown)
    overlay.addEventListener('pointermove', onPointerMove)
    overlay.addEventListener('pointerup', stopDrawing)
    overlay.addEventListener('pointercancel', stopDrawing)
    return () => {
      overlay.removeEventListener('pointerdown', onPointerDown)
      overlay.removeEventListener('pointermove', onPointerMove)
      overlay.removeEventListener('pointerup', stopDrawing)
      overlay.removeEventListener('pointercancel', stopDrawing)
      window.removeEventListener('resize', updateCursor)
      overlay.style.pointerEvents = 'none'
      overlay.style.cursor = ''
    }
  }, [overlayCanvasRef, baseCanvasRef, color, size, selection, pushSnapshot])

  const handleDone = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  return (
    <div className="brush-controls">
      {selection && <p className="brush-controls__hint">Painting is constrained to your selection.</p>}
      <label>
        Color
        <div className="brush-controls__color">
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          <input
            type="text"
            className="brush-controls__hex"
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
      <label>
        Size
        <div className="brush-controls__size-row">
          <input
            type="range"
            min={1}
            max={50}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          />
          <span
            className="brush-controls__size-preview"
            style={{ width: Math.min(size, 40), height: Math.min(size, 40) }}
            aria-hidden="true"
          />
        </div>
        <span>{size}</span>
      </label>
      <button type="button" onClick={handleDone}>
        Done
      </button>
    </div>
  )
}
