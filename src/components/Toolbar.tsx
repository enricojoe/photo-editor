import { useEditorDispatch, useEditorState } from '../state/EditorContext'
import { LoadImageButton } from '../features/imageLoad/LoadImageButton'

export function Toolbar() {
  const { imageWidth, imageHeight, activeTool } = useEditorState()
  const dispatch = useEditorDispatch()
  const hasImage = imageWidth !== null && imageHeight !== null
  const isToolActive = activeTool !== 'none'

  const handleCropClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'crop' })
  }

  const handleSelectionClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'selection' })
  }

  const handleBucketFillClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'bucketFill' })
  }

  const handleBrushClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'brush' })
  }

  const handleBackgroundRemovalClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'backgroundRemoval' })
  }

  const handleColorAdjustClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'colorAdjust' })
  }

  return (
    <nav className="toolbar" aria-label="Editing tools">
      <LoadImageButton disabled={isToolActive} />
      <button type="button" onClick={handleCropClick} disabled={!hasImage || isToolActive}>
        Crop
      </button>
      <button type="button" onClick={handleSelectionClick} disabled={!hasImage || isToolActive}>
        Selection
      </button>
      <div className="toolbar__group">
        <p className="toolbar__group-label">Colour</p>
        <button type="button" onClick={handleBucketFillClick} disabled={!hasImage || isToolActive}>
          Bucket Fill
        </button>
        <button type="button" onClick={handleBrushClick} disabled={!hasImage || isToolActive}>
          Brush
        </button>
      </div>
      <button type="button" onClick={handleBackgroundRemovalClick} disabled={!hasImage || isToolActive}>
        Remove Background
      </button>
      <button type="button" onClick={handleColorAdjustClick} disabled={!hasImage || isToolActive}>
        Color Adjust
      </button>
    </nav>
  )
}
