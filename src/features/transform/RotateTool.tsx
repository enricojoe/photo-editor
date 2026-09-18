import { useCanvasRefs, useEditorDispatch, useHistory } from '../../state/EditorContext'
import { applyTransformToCanvas, type TransformOptions } from './applyTransform'

export function RotateTool() {
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const { pushSnapshot } = useHistory()

  const handleTransform = (options: TransformOptions) => {
    const baseCanvas = baseCanvasRef.current
    if (!baseCanvas) return

    pushSnapshot()
    applyTransformToCanvas(baseCanvas, options)

    const overlay = overlayCanvasRef.current
    if (overlay) {
      overlay.width = baseCanvas.width
      overlay.height = baseCanvas.height
    }

    dispatch({ type: 'IMAGE_LOADED', width: baseCanvas.width, height: baseCanvas.height })
    dispatch({ type: 'SET_SELECTION', selection: null })
  }

  const handleDone = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })
  }

  return (
    <>
      <div className="rotate-controls">
        <button type="button" onClick={() => handleTransform({ type: 'rotate', direction: 'ccw' })}>
          Rotate Left
        </button>
        <button type="button" onClick={() => handleTransform({ type: 'rotate', direction: 'cw' })}>
          Rotate Right
        </button>
        <button type="button" onClick={() => handleTransform({ type: 'flip', axis: 'horizontal' })}>
          Flip Horizontal
        </button>
        <button type="button" onClick={() => handleTransform({ type: 'flip', axis: 'vertical' })}>
          Flip Vertical
        </button>
      </div>
      <button type="button" onClick={handleDone}>
        Done
      </button>
    </>
  )
}
