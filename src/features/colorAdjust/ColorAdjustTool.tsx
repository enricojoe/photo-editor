import { useEffect, useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useHistory } from '../../state/EditorContext'
import { applyColorFilterToCanvas } from './applyColorFilter'
import { buildCssFilter, COLOR_ADJUST_PRESETS, DEFAULT_COLOR_ADJUST } from './colorFilter'

export function ColorAdjustTool() {
  const { baseCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const { pushSnapshot } = useHistory()
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
    pushSnapshot()
    applyColorFilterToCanvas(baseCanvas, filter)
    baseCanvas.style.filter = ''
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleCancel = () => {
    const baseCanvas = baseCanvasRef.current
    if (baseCanvas) baseCanvas.style.filter = ''
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  const handleSelectPreset = (values: typeof DEFAULT_COLOR_ADJUST) => {
    setBrightness(values.brightness)
    setContrast(values.contrast)
    setSaturation(values.saturation)
  }

  const isPresetActive = (values: typeof DEFAULT_COLOR_ADJUST) =>
    brightness === values.brightness && contrast === values.contrast && saturation === values.saturation

  return (
    <div className="color-adjust-controls">
      <div className="color-adjust-presets" role="group" aria-label="Color presets">
        {COLOR_ADJUST_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={
              isPresetActive(preset.values)
                ? 'color-adjust-presets__button color-adjust-presets__button--active'
                : 'color-adjust-presets__button'
            }
            aria-pressed={isPresetActive(preset.values)}
            onClick={() => handleSelectPreset(preset.values)}
          >
            {preset.label}
          </button>
        ))}
      </div>
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
