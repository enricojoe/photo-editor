export type TransformOptions =
  | { type: 'rotate'; direction: 'cw' | 'ccw' }
  | { type: 'flip'; axis: 'horizontal' | 'vertical' }

/**
 * Applies a rotation or mirror flip to `canvas` in place. Rotating swaps the
 * canvas's width/height; flipping does not change its dimensions. As with
 * `applyColorFilterToCanvas`, this roundtrips through an offscreen canvas so
 * the transform is baked into pixel data rather than left as a CSS-only effect.
 */
export function applyTransformToCanvas(
  canvas: HTMLCanvasElement,
  options: TransformOptions,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  if (options.type === 'rotate') {
    const offscreen = createCanvas()
    offscreen.width = canvas.height
    offscreen.height = canvas.width
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) throw new Error('Canvas 2D context is unavailable')

    // Rotate around the offscreen canvas's center-equivalent origin, then draw
    // the source canvas so it lands correctly rotated within the new bounds.
    if (options.direction === 'cw') {
      offCtx.translate(offscreen.width, 0)
      offCtx.rotate(Math.PI / 2)
    } else {
      offCtx.translate(0, offscreen.height)
      offCtx.rotate(-Math.PI / 2)
    }
    offCtx.drawImage(canvas, 0, 0)

    canvas.width = offscreen.width
    canvas.height = offscreen.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(offscreen, 0, 0)
  } else {
    const offscreen = createCanvas()
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) throw new Error('Canvas 2D context is unavailable')
    offCtx.drawImage(canvas, 0, 0)

    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (options.axis === 'horizontal') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    } else {
      ctx.translate(0, canvas.height)
      ctx.scale(1, -1)
    }
    ctx.drawImage(offscreen, 0, 0)
    ctx.restore()
  }
}
