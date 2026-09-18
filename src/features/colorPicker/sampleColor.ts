import { rgbToHex } from '../../lib/hexColor'
import type { CanvasPoint } from '../canvas/coords'

interface PixelSource {
  getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Clamps a canvas-space point to integer pixel coordinates within the
 * canvas bounds (a pointer event can fire slightly outside the canvas
 * edge), reads that single pixel from `ctx`, and converts it to a hex
 * string. Kept free of any real CanvasRenderingContext2D/DOM dependency
 * (only the `getImageData` shape it needs) so it's unit-testable without
 * a real canvas.
 */
export function sampleHexColor(ctx: PixelSource, width: number, height: number, point: CanvasPoint): string {
  const x = clamp(Math.floor(point.x), 0, width - 1)
  const y = clamp(Math.floor(point.y), 0, height - 1)
  const { data } = ctx.getImageData(x, y, 1, 1)
  return rgbToHex(data[0], data[1], data[2])
}
