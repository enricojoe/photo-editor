export interface CanvasPoint {
  x: number
  y: number
}

/**
 * Maps a pointer event's client coordinates to canvas-buffer pixel
 * coordinates, accounting for the canvas being displayed at a different
 * CSS size than its intrinsic width/height (e.g. scaled down via CSS for
 * large images while the backing pixel buffer stays full resolution).
 */
export function pointerToCanvasPoint(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
): CanvasPoint {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

/**
 * Buffer pixels per CSS pixel for a canvas whose backing resolution differs
 * from its displayed CSS size (e.g. a large photo scaled down via
 * max-width/max-height). Multiply a desired on-screen size by this to draw
 * or hit-test it at a consistent CSS size regardless of image resolution.
 */
export function getCanvasScale(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect()
  return rect.width > 0 ? canvas.width / rect.width : 1
}
