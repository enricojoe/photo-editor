import type { Selection } from './selectionGeometry'

/**
 * Clears (sets alpha to 0) every selected pixel on `canvas`, iterating only
 * the selection's bounding box and checking the mask per pixel. RGB is left
 * untouched — consistent with how Background Removal already produces
 * transparent pixels, so no new export-path concerns.
 */
export function clearSelectionPixels(canvas: HTMLCanvasElement, selection: Selection): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { x, y, width, height } = selection.bounds
  if (width <= 0 || height <= 0) return

  const imageData = ctx.getImageData(x, y, width, height)
  const { data } = imageData
  const maskWidth = canvas.width

  for (let py = 0; py < height; py++) {
    const imageY = y + py
    for (let px = 0; px < width; px++) {
      const imageX = x + px
      if (selection.mask[imageY * maskWidth + imageX]) {
        data[(py * width + px) * 4 + 3] = 0
      }
    }
  }

  ctx.putImageData(imageData, x, y)
}
