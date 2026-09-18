import { useCallback, useRef, useState } from 'react'
import { pointerToCanvasPoint } from '../canvas/coords'
import { clampPoint, normalizeRect, type Rect } from '../canvas/rectGeometry'
import {
  rasterizeLassoPolygon,
  rasterizeRect,
  type Selection,
  type SelectionPoint,
  type SelectionShape,
} from './selectionGeometry'

type Interaction =
  | { mode: 'idle' }
  | { mode: 'rect'; anchorX: number; anchorY: number }
  | { mode: 'lasso' }

export interface UseSelectionOptions {
  imageWidth: number
  imageHeight: number
  onCommit: (selection: Selection | null) => void
}

export function useSelection({ imageWidth, imageHeight, onCommit }: UseSelectionOptions) {
  const [shape, setShape] = useState<SelectionShape>('rectangle')
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const [draftPoints, setDraftPoints] = useState<SelectionPoint[]>([])
  const interactionRef = useRef<Interaction>({ mode: 'idle' })

  const handlePointerDown = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const raw = pointerToCanvasPoint(event, canvas)
      const point = clampPoint(raw.x, raw.y, imageWidth, imageHeight)

      if (shape === 'rectangle') {
        interactionRef.current = { mode: 'rect', anchorX: point.x, anchorY: point.y }
        setDraftRect(normalizeRect(point.x, point.y, point.x, point.y, imageWidth, imageHeight))
      } else {
        interactionRef.current = { mode: 'lasso' }
        setDraftPoints([point])
      }

      canvas.setPointerCapture(event.pointerId)
    },
    [shape, imageWidth, imageHeight],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const interaction = interactionRef.current
      if (interaction.mode === 'idle') return

      const raw = pointerToCanvasPoint(event, canvas)
      const point = clampPoint(raw.x, raw.y, imageWidth, imageHeight)

      if (interaction.mode === 'rect') {
        setDraftRect(normalizeRect(interaction.anchorX, interaction.anchorY, point.x, point.y, imageWidth, imageHeight))
      } else {
        setDraftPoints((prev) => [...prev, point])
      }
    },
    [imageWidth, imageHeight],
  )

  const handlePointerUp = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const interaction = interactionRef.current
      interactionRef.current = { mode: 'idle' }
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }

      if (interaction.mode === 'rect' && draftRect) {
        const { mask, bounds } = rasterizeRect(draftRect, imageWidth, imageHeight)
        onCommit({ shapeData: { shape: 'rectangle', rect: draftRect }, mask, bounds })
      } else if (interaction.mode === 'lasso') {
        const result = rasterizeLassoPolygon(draftPoints, imageWidth, imageHeight)
        onCommit(result ? { shapeData: { shape: 'lasso', points: draftPoints }, ...result } : null)
      }

      setDraftRect(null)
      setDraftPoints([])
    },
    [draftRect, draftPoints, imageWidth, imageHeight, onCommit],
  )

  return { shape, setShape, draftRect, draftPoints, handlePointerDown, handlePointerMove, handlePointerUp }
}
