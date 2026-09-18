export interface BrushOptions {
  size: number
  color: string
}

/** Strokes a round-capped line segment from `from` to `to` on `ctx` using the given brush options. */
export function strokeBrushSegment(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: BrushOptions,
): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = options.size
  ctx.strokeStyle = options.color
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}
