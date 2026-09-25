/** Draws `source` scaled to `width` x `height` onto a fresh offscreen canvas with high-quality smoothing. */
function drawScaled(
  source: HTMLCanvasElement,
  width: number,
  height: number,
  createCanvas: () => HTMLCanvasElement,
): HTMLCanvasElement {
  const target = createCanvas()
  target.width = width
  target.height = height
  const ctx = target.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is unavailable')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height)
  return target
}

/** One step toward `target`: halves the axis while it is more than 2x too large, otherwise leaves it alone. */
function halveToward(current: number, target: number): number {
  return current > target * 2 ? Math.ceil(current / 2) : current
}

/**
 * Scales `canvas` in place to `width` x `height` (the whole image is resampled,
 * unlike `applyCropToCanvas` which cuts a region out).
 *
 * A single large downscale aliases badly in browsers that ignore
 * `imageSmoothingQuality`, so anything more than 2x too large on an axis is
 * halved in steps first; the last pass then covers the remaining <=2x on
 * downscaled axes and does all of the upscaling. Like `applyTransformToCanvas`
 * this goes through offscreen canvases, because assigning `canvas.width`/`height`
 * clears the canvas and the pixels must be held elsewhere until then.
 */
export function applyResizeToCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  let source = canvas
  while (source.width > width * 2 || source.height > height * 2) {
    source = drawScaled(source, halveToward(source.width, width), halveToward(source.height, height), createCanvas)
  }
  const resized = drawScaled(source, width, height, createCanvas)

  canvas.width = width
  canvas.height = height
  ctx.drawImage(resized, 0, 0)
}
