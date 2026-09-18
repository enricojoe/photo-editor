/**
 * Bakes a CSS filter string into `canvas`'s actual pixel data. `style.filter`
 * only affects rendering, not `getImageData`/`toBlob`, so we render through
 * an offscreen canvas with the filter applied and draw the result back.
 */
export function applyColorFilterToCanvas(
  canvas: HTMLCanvasElement,
  filter: string,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  const offscreen = createCanvas()
  offscreen.width = canvas.width
  offscreen.height = canvas.height

  const offscreenCtx = offscreen.getContext('2d')
  if (!offscreenCtx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  offscreenCtx.filter = filter
  offscreenCtx.drawImage(canvas, 0, 0)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreen, 0, 0)
}
