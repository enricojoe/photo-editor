import { useCallback, useRef, useState } from 'react'
import { getCanvasScale, pointerToCanvasPoint } from '../canvas/coords'
import {
  CORNER_HANDLES,
  HANDLE_EDGES,
  type CropHandle,
  type CropRect,
  applyAspectToExistingRect,
  aspectConstrainedRect,
  clampPoint,
  customSizedRect,
  defaultCropRect,
  hitTestHandle,
  isInsideRect,
  normalizeRect,
} from './cropGeometry'

type Interaction =
  | { mode: 'idle' }
  | { mode: 'moving'; grabDX: number; grabDY: number }
  | {
      mode: 'resizing'
      handle: CropHandle
      fixedLeft: number
      fixedRight: number
      fixedTop: number
      fixedBottom: number
    }
  | { mode: 'drawing-new'; anchorX: number; anchorY: number }

export interface UseCropOptions {
  imageWidth: number
  imageHeight: number
}

export function useCrop({ imageWidth, imageHeight }: UseCropOptions) {
  const [rect, setRect] = useState<CropRect>(() => defaultCropRect(imageWidth, imageHeight))
  const [aspectRatio, setAspectRatioState] = useState<number | null>(null)
  const interactionRef = useRef<Interaction>({ mode: 'idle' })

  // Switching presets reshapes the current rect immediately, in the same
  // handler that caused the change (no effect — avoids an extra render).
  const setAspectRatio = useCallback(
    (ratio: number | null) => {
      setAspectRatioState(ratio)
      if (ratio !== null) {
        setRect((prev) => applyAspectToExistingRect(prev, ratio, imageWidth, imageHeight))
      }
    },
    [imageWidth, imageHeight],
  )

  // Locks aspectRatio to the applied rect's actual ratio (not the raw
  // width/height args) so it stays consistent after customSizedRect clamps.
  const setCustomSize = useCallback(
    (width: number, height: number) => {
      const next = customSizedRect(width, height, imageWidth, imageHeight)
      setRect(next)
      setAspectRatioState(next.width / next.height)
    },
    [imageWidth, imageHeight],
  )

  const handlePointerDown = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const point = pointerToCanvasPoint(event, canvas)
      const rawHandle = hitTestHandle(point, rect, getCanvasScale(canvas))
      const handle = rawHandle && (aspectRatio === null || CORNER_HANDLES.includes(rawHandle)) ? rawHandle : null

      if (handle) {
        interactionRef.current = {
          mode: 'resizing',
          handle,
          fixedLeft: rect.x,
          fixedRight: rect.x + rect.width,
          fixedTop: rect.y,
          fixedBottom: rect.y + rect.height,
        }
      } else if (isInsideRect(point, rect)) {
        interactionRef.current = {
          mode: 'moving',
          grabDX: point.x - rect.x,
          grabDY: point.y - rect.y,
        }
      } else {
        const anchor = clampPoint(point.x, point.y, imageWidth, imageHeight)
        interactionRef.current = { mode: 'drawing-new', anchorX: anchor.x, anchorY: anchor.y }
      }

      canvas.setPointerCapture(event.pointerId)
    },
    [rect, imageWidth, imageHeight, aspectRatio],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent, canvas: HTMLCanvasElement) => {
      const interaction = interactionRef.current
      if (interaction.mode === 'idle') return

      const raw = pointerToCanvasPoint(event, canvas)
      const point = clampPoint(raw.x, raw.y, imageWidth, imageHeight)

      if (interaction.mode === 'moving') {
        const { width, height } = rect
        const x = Math.min(Math.max(point.x - interaction.grabDX, 0), Math.max(0, imageWidth - width))
        const y = Math.min(Math.max(point.y - interaction.grabDY, 0), Math.max(0, imageHeight - height))
        setRect({ x, y, width, height })
        return
      }

      if (interaction.mode === 'resizing') {
        const edges = HANDLE_EDGES[interaction.handle]
        const left = edges.left ? point.x : interaction.fixedLeft
        const right = edges.right ? point.x : interaction.fixedRight
        const top = edges.top ? point.y : interaction.fixedTop
        const bottom = edges.bottom ? point.y : interaction.fixedBottom

        if (aspectRatio === null) {
          setRect(normalizeRect(left, top, right, bottom, imageWidth, imageHeight))
        } else {
          const anchorX = edges.left ? interaction.fixedRight : interaction.fixedLeft
          const anchorY = edges.top ? interaction.fixedBottom : interaction.fixedTop
          setRect(aspectConstrainedRect(anchorX, anchorY, point.x, point.y, aspectRatio, imageWidth, imageHeight))
        }
        return
      }

      // drawing-new
      if (aspectRatio === null) {
        setRect(normalizeRect(interaction.anchorX, interaction.anchorY, point.x, point.y, imageWidth, imageHeight))
      } else {
        setRect(
          aspectConstrainedRect(
            interaction.anchorX,
            interaction.anchorY,
            point.x,
            point.y,
            aspectRatio,
            imageWidth,
            imageHeight,
          ),
        )
      }
    },
    [rect, imageWidth, imageHeight, aspectRatio],
  )

  const handlePointerUp = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
    interactionRef.current = { mode: 'idle' }
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }, [])

  return { rect, aspectRatio, setAspectRatio, setCustomSize, handlePointerDown, handlePointerMove, handlePointerUp }
}
