export type WatermarkOptions =
  | { mode: 'text'; text: string; fontSize: number; color: string; opacity: number; x: number; y: number }
  | { mode: 'image'; image: CanvasImageSource; width: number; height: number; opacity: number; x: number; y: number }

/**
 * Draws a watermark onto `ctx`, centered on `(options.x, options.y)`. Used for
 * both the overlay's live drag preview and the final bake into the base
 * canvas, so the two can never visually drift apart.
 */
export function drawWatermark(ctx: CanvasRenderingContext2D, options: WatermarkOptions): void {
  ctx.save()
  ctx.globalAlpha = options.opacity / 100

  if (options.mode === 'text') {
    ctx.font = `${options.fontSize}px system-ui, 'Segoe UI', Roboto, sans-serif`
    ctx.fillStyle = options.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(options.text, options.x, options.y)
  } else {
    ctx.drawImage(options.image, options.x - options.width / 2, options.y - options.height / 2, options.width, options.height)
  }

  ctx.restore()
}

/** Bakes a watermark into `canvas`'s actual pixel data. */
export function applyWatermarkToCanvas(canvas: HTMLCanvasElement, options: WatermarkOptions): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  drawWatermark(ctx, options)
}
