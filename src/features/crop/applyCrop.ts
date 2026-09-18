import type { CropRect } from './cropGeometry'

export interface CroppedSize {
  width: number
  height: number
}

/**
 * Crops `canvas` to `rect` in place: reads the pixel data within the rect,
 * resizes the canvas to the rect's dimensions, and writes the pixels back.
 */
export function applyCropToCanvas(canvas: HTMLCanvasElement, rect: CropRect): CroppedSize {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const x = Math.round(rect.x)
  const y = Math.round(rect.y)
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  const imageData = ctx.getImageData(x, y, width, height)

  canvas.width = width
  canvas.height = height
  ctx.putImageData(imageData, 0, 0)

  return { width, height }
}
