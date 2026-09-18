import { useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState } from '../state/EditorContext'
import { LoadImageButton } from '../features/imageLoad/LoadImageButton'
import { ExportDialog } from '../features/export/ExportDialog'

export function Toolbar() {
  const { imageWidth, imageHeight, activeTool } = useEditorState()
  const dispatch = useEditorDispatch()
  const { baseCanvasRef } = useCanvasRefs()
  const hasImage = imageWidth !== null && imageHeight !== null
  const isToolActive = activeTool !== 'none'
  const [isExportOpen, setIsExportOpen] = useState(false)

  const handleCropClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'crop' })
  }

  const handleSelectionClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'selection' })
  }

  const handleBucketFillClick = () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'bucketFill' })
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
      <button type="button" onClick={handleBucketFillClick} disabled={!hasImage || isToolActive}>
        Bucket Fill
      </button>
      <button type="button" onClick={handleBackgroundRemovalClick} disabled={!hasImage || isToolActive}>
        Remove Background
      </button>
      <button type="button" onClick={handleColorAdjustClick} disabled={!hasImage || isToolActive}>
        Color Adjust
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setIsExportOpen(true)}
        disabled={!hasImage || isToolActive}
      >
        Export
      </button>
      {isExportOpen && <ExportDialog canvasRef={baseCanvasRef} onClose={() => setIsExportOpen(false)} />}
    </nav>
  )
}
