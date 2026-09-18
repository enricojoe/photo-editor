import { useState } from 'react'
import { useCanvasRefs, useEditorState } from '../state/EditorContext'
import { ExportDialog } from '../features/export/ExportDialog'

export function HeaderExport() {
  const { imageWidth, imageHeight, activeTool } = useEditorState()
  const { baseCanvasRef } = useCanvasRefs()
  const hasImage = imageWidth !== null && imageHeight !== null
  const isToolActive = activeTool !== 'none'
  const [isExportOpen, setIsExportOpen] = useState(false)

  return (
    <div className="header-export">
      <button
        type="button"
        className="btn-primary"
        onClick={() => setIsExportOpen(true)}
        disabled={!hasImage || isToolActive}
      >
        Export
      </button>
      {isExportOpen && <ExportDialog canvasRef={baseCanvasRef} onClose={() => setIsExportOpen(false)} />}
    </div>
  )
}
