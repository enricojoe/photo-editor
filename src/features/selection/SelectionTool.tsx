import { useEffect } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState } from '../../state/EditorContext'
import { useSelection } from './useSelection'
import { clearSelectionPixels } from './clearSelection'
import type { Selection } from './selectionGeometry'

export function SelectionTool() {
  const { imageWidth, imageHeight, selection } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()

  const handleCommit = (next: Selection | null) => {
    dispatch({ type: 'SET_SELECTION', selection: next })
  }

  const { shape, setShape, draftRect, draftPoints, handlePointerDown, handlePointerMove, handlePointerUp } =
    useSelection({ imageWidth: imageWidth ?? 0, imageHeight: imageHeight ?? 0, onCommit: handleCommit })

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    const ctx = overlay?.getContext('2d')
    if (!overlay || !ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)

    // "Marching ants" outline: a solid dark halo first so the dashed white
    // line on top of it stays visible against any underlying image color.
    const strokeMarchingAnts = (draw: () => void) => {
      ctx.setLineDash([])
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      draw()

      ctx.setLineDash([6, 4])
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      draw()
    }

    if (draftRect) {
      strokeMarchingAnts(() =>
        ctx.strokeRect(draftRect.x + 0.5, draftRect.y + 0.5, draftRect.width, draftRect.height),
      )
    } else if (draftPoints.length > 1) {
      strokeMarchingAnts(() => {
        ctx.beginPath()
        ctx.moveTo(draftPoints[0].x, draftPoints[0].y)
        for (const p of draftPoints.slice(1)) ctx.lineTo(p.x, p.y)
        ctx.stroke()
      })
    } else if (selection) {
      if (selection.shapeData.shape === 'rectangle') {
        const { x, y, width, height } = selection.shapeData.rect
        strokeMarchingAnts(() => ctx.strokeRect(x + 0.5, y + 0.5, width, height))
      } else {
        const pts = selection.shapeData.points
        strokeMarchingAnts(() => {
          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)
          for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
          ctx.closePath()
          ctx.stroke()
        })
      }
    }
  }, [draftRect, draftPoints, selection, overlayCanvasRef])

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return

    overlay.style.pointerEvents = 'auto'
    overlay.style.cursor = 'crosshair'

    const onDown = (event: PointerEvent) => handlePointerDown(event, overlay)
    const onMove = (event: PointerEvent) => handlePointerMove(event, overlay)
    const onUp = (event: PointerEvent) => handlePointerUp(event, overlay)

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
  }, [overlayCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp])

  const handleDelete = () => {
    const canvas = baseCanvasRef.current
    if (!canvas || !selection) return
    clearSelectionPixels(canvas, selection)
  }

  const handleDeselect = () => dispatch({ type: 'SET_SELECTION', selection: null })
  const handleDone = () => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'none' })

  return (
    <>
      <div className="selection-shape-toggle" role="group" aria-label="Selection shape">
        <button
          type="button"
          className={
            shape === 'rectangle'
              ? 'selection-shape-toggle__button selection-shape-toggle__button--active'
              : 'selection-shape-toggle__button'
          }
          aria-pressed={shape === 'rectangle'}
          onClick={() => setShape('rectangle')}
        >
          Rectangle
        </button>
        <button
          type="button"
          className={
            shape === 'lasso'
              ? 'selection-shape-toggle__button selection-shape-toggle__button--active'
              : 'selection-shape-toggle__button'
          }
          aria-pressed={shape === 'lasso'}
          onClick={() => setShape('lasso')}
        >
          Lasso
        </button>
      </div>
      <div className="selection-controls">
        <button type="button" onClick={handleDelete} disabled={!selection}>
          Delete Selection
        </button>
        <button type="button" onClick={handleDeselect} disabled={!selection}>
          Deselect
        </button>
        <button type="button" onClick={handleDone}>
          Done
        </button>
      </div>
    </>
  )
}
