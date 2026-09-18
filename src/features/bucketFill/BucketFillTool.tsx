import { useEffect, useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState, useHistory } from '../../state/EditorContext'
import { pointerToCanvasPoint } from '../canvas/coords'
import type { RGBA } from '../../lib/colorDistance'
import { floodFill } from './floodFill'

function hexToRgba(hex: string): RGBA {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
    a: 255,
  }
}

function normalizeHex(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`
  }
  return null
}

export function BucketFillTool() {
  const { selection } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const { pushSnapshot } = useHistory()
  const [color, setColor] = useState('#e63946')
  const [hexText, setHexText] = useState(color)
  const [syncedColor, setSyncedColor] = useState(color)
  const [tolerance, setTolerance] = useState(20)

  if (color !== syncedColor) {
    setSyncedColor(color)
    setHexText(color)
  }

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const baseCanvas = baseCanvasRef.current
    if (!overlay || !baseCanvas) return

    overlay.style.pointerEvents = 'auto'
    overlay.style.cursor = 'crosshair'

    const fillColor = hexToRgba(color)

    const onClick = (event: PointerEvent) => {
      const ctx = baseCanvas.getContext('2d')
      if (!ctx) return
      const point = pointerToCanvasPoint(event, overlay)
      const imageData = ctx.getImageData(0, 0, baseCanvas.width, baseCanvas.height)
      pushSnapshot()
      floodFill(imageData, point.x, point.y, fillColor, tolerance, selection?.mask)
      ctx.putImageData(imageData, 0, 0)
    }

    overlay.addEventListener('click', onClick)
    return () => {
      overlay.removeEventListener('click', onClick)
      overlay.style.pointerEvents = 'none'
      overlay.style.cursor = ''
    }
  }, [overlayCanvasRef, baseCanvasRef, color, tolerance, selection, pushSnapshot])

  const handleDone = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  return (
    <div className="bucket-fill-controls">
      {selection && <p className="bucket-fill-controls__hint">Fill is constrained to your selection.</p>}
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
      <label>
        Tolerance
        <input
          type="range"
          min={0}
          max={100}
          value={tolerance}
          onChange={(event) => setTolerance(Number(event.target.value))}
        />
        <span>{tolerance}</span>
      </label>
      <button type="button" onClick={handleDone}>
        Done
      </button>
    </div>
  )
}
