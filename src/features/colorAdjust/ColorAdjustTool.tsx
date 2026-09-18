import { useEffect, useState } from 'react'
import { useCanvasRefs, useEditorDispatch } from '../../state/EditorContext'
import { applyColorFilterToCanvas } from './applyColorFilter'
import { buildCssFilter, DEFAULT_COLOR_ADJUST } from './colorFilter'

export function ColorAdjustTool() {
  const { baseCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const [brightness, setBrightness] = useState(DEFAULT_COLOR_ADJUST.brightness)
  const [contrast, setContrast] = useState(DEFAULT_COLOR_ADJUST.contrast)
  const [saturation, setSaturation] = useState(DEFAULT_COLOR_ADJUST.saturation)

  const filter = buildCssFilter({ brightness, contrast, saturation })

  useEffect(() => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas) return
    baseCanvas.style.filter = filter
    return () => {
      baseCanvas.style.filter = ''
    }
  }, [baseCanvasRef, filter])

  const handleApply = () => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas) return
    applyColorFilterToCanvas(baseCanvas, filter)
    baseCanvas.style.filter = ''
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleCancel = () => {
    const baseCanvas = baseCanvasRef.current
    if (baseCanvas) baseCanvas.style.filter = ''
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  return (
    <div className="color-adjust-controls">
      <label>
        Brightness
        <input
          type="range"
          min={-100}
          max={100}
          value={brightness}
          onChange={(event) => setBrightness(Number(event.target.value))}
        />
        <span>{brightness}</span>
      </label>
      <label>
        Contrast
        <input
          type="range"
          min={-100}
          max={100}
          value={contrast}
          onChange={(event) => setContrast(Number(event.target.value))}
        />
        <span>{contrast}</span>
      </label>
      <label>
        Saturation
        <input
          type="range"
          min={0}
          max={200}
          value={saturation}
          onChange={(event) => setSaturation(Number(event.target.value))}
        />
        <span>{saturation}</span>
      </label>
      <div className="color-adjust-controls__actions">
        <button type="button" className="btn-primary" onClick={handleApply}>
          Apply
        </button>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
