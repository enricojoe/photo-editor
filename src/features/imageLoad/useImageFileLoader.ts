import { useCallback, useState } from 'react'
import { useCanvasRefs, useEditorDispatch } from '../../state/EditorContext'
import { loadImageFileToCanvas } from './loadImage'

/** Shared file-loading logic for the empty-state dropzone and the toolbar's "Load Image" button. */
export function useImageFileLoader() {
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()
  const [error, setError] = useState<string | null>(null)

  const loadFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return
      const baseCanvas = baseCanvasRef.current
      if (!baseCanvas) return

      setError(null)
      try {
        const { width, height } = await loadImageFileToCanvas(file, baseCanvas)
        const overlayCanvas = overlayCanvasRef.current
        if (overlayCanvas) {
          overlayCanvas.width = width
          overlayCanvas.height = height
        }
        dispatch({ type: 'IMAGE_LOADED', width, height })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image')
      }
    },
    [baseCanvasRef, overlayCanvasRef, dispatch],
  )

  return { loadFile, error }
}
