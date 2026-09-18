import { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState, useHistory } from '../../state/EditorContext'
import { pointerToCanvasPoint } from '../canvas/coords'
import { normalizeHex } from '../../lib/hexColor'
import { decodeImage } from '../../lib/decodeImage'
import { applyWatermarkToCanvas, drawWatermark, type WatermarkOptions } from './applyWatermark'

interface LoadedLogo {
  image: ImageBitmap | HTMLImageElement
  naturalWidth: number
  naturalHeight: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function WatermarkTool() {
  const { imageWidth, imageHeight, pickedColor } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const { pushSnapshot } = useHistory()

  const [mode, setMode] = useState<'text' | 'image'>('text')

  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(36)
  const [color, setColor] = useState(pickedColor ?? '#ffffff')
  const [hexText, setHexText] = useState(color)
  const [syncedColor, setSyncedColor] = useState(color)

  if (color !== syncedColor) {
    setSyncedColor(color)
    setHexText(color)
  }

  const [logo, setLogo] = useState<LoadedLogo | null>(null)
  const [logoWidth, setLogoWidth] = useState(200)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [opacity, setOpacity] = useState(100)

  const [position, setPosition] = useState(() => ({ x: (imageWidth ?? 0) / 2, y: (imageHeight ?? 0) / 2 }))
  const isDraggingRef = useRef(false)

  const handleLogoFileChange = async (file: File | undefined) => {
    if (!file) return
    setLogoError(null)
    try {
      const image = await decodeImage(file)
      const naturalWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width
      const naturalHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height
      setLogo({ image, naturalWidth, naturalHeight })
      const canvasWidth = imageWidth ?? naturalWidth
      setLogoWidth(clamp(Math.round(canvasWidth * 0.3), 20, 800))
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Failed to load image')
    }
  }

  const currentOptions = useMemo<WatermarkOptions | null>(() => {
    if (mode === 'text') {
      if (text.trim() === '') return null
      return { mode: 'text', text, fontSize, color, opacity, x: position.x, y: position.y }
    }
    if (!logo) return null
    const height = logoWidth * (logo.naturalHeight / logo.naturalWidth)
    return { mode: 'image', image: logo.image, width: logoWidth, height, opacity, x: position.x, y: position.y }
  }, [mode, text, fontSize, color, opacity, position, logo, logoWidth])

  // Live preview: redraw the overlay whenever any watermark option changes.
  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext('2d')
    if (!overlay || !ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)
    if (currentOptions) drawWatermark(ctx, currentOptions)
  }, [currentOptions, overlayCanvasRef])

  // Free-drag placement: click/drag anywhere on the overlay to move the watermark.
  useEffect(() => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return

    const width = imageWidth ?? 0
    const height = imageHeight ?? 0

    overlay.style.pointerEvents = 'auto'
    overlay.style.cursor = 'move'

    const clampToCanvas = (point: { x: number; y: number }) => ({
      x: clamp(point.x, 0, width),
      y: clamp(point.y, 0, height),
    })

    const onDown = (event: PointerEvent) => {
      isDraggingRef.current = true
      setPosition(clampToCanvas(pointerToCanvasPoint(event, overlay)))
    }
    const onMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return
      setPosition(clampToCanvas(pointerToCanvasPoint(event, overlay)))
    }
    const onUp = () => {
      isDraggingRef.current = false
    }

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
  }, [overlayCanvasRef, imageWidth, imageHeight])

  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext('2d')
    if (overlay && ctx) ctx.clearRect(0, 0, overlay.width, overlay.height)
  }

  const handleApply = () => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas || !currentOptions) return
    pushSnapshot()
    applyWatermarkToCanvas(baseCanvas, currentOptions)
    clearOverlay()
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleCancel = () => {
    clearOverlay()
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  return (
    <div className="watermark-controls">
      <div className="selection-shape-toggle" role="group" aria-label="Watermark mode">
        <button
          type="button"
          className={
            mode === 'text'
              ? 'selection-shape-toggle__button selection-shape-toggle__button--active'
              : 'selection-shape-toggle__button'
          }
          aria-pressed={mode === 'text'}
          onClick={() => setMode('text')}
        >
          Text
        </button>
        <button
          type="button"
          className={
            mode === 'image'
              ? 'selection-shape-toggle__button selection-shape-toggle__button--active'
              : 'selection-shape-toggle__button'
          }
          aria-pressed={mode === 'image'}
          onClick={() => setMode('image')}
        >
          Image
        </button>
      </div>

      {mode === 'text' && (
        <>
          <label>
            Text
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Watermark text"
            />
          </label>
          <label>
            Font Size
            <input
              type="range"
              min={12}
              max={120}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
            />
            <span>{fontSize}</span>
          </label>
          <label>
            Color
            <div className="watermark-controls__color">
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              <input
                type="text"
                className="watermark-controls__hex"
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
        </>
      )}

      {mode === 'image' && (
        <>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            {logo ? 'Replace Logo Image' : 'Upload Logo Image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void handleLogoFileChange(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          {logoError && (
            <p role="alert" className="toolbar__error">
              {logoError}
            </p>
          )}
          {logo && (
            <label>
              Size
              <input
                type="range"
                min={20}
                max={800}
                value={logoWidth}
                onChange={(event) => setLogoWidth(Number(event.target.value))}
              />
              <span>{logoWidth}</span>
            </label>
          )}
        </>
      )}

      <label>
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(event) => setOpacity(Number(event.target.value))}
        />
        <span>{opacity}</span>
      </label>

      <div className="watermark-controls__actions">
        <button type="button" className="btn-primary" onClick={handleApply} disabled={!currentOptions}>
          Apply
        </button>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
