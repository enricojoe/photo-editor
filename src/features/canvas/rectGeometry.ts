export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_RECT_SIZE = 8

export function clampPoint(
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, 0), imageWidth),
    y: Math.min(Math.max(y, 0), imageHeight),
  }
}

/** Builds a normalized, bounds-clamped, minimum-sized rect from two opposite corners. */
export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  imageWidth: number,
  imageHeight: number,
): Rect {
  let x = Math.min(x1, x2)
  let y = Math.min(y1, y2)
  let width = Math.max(Math.abs(x2 - x1), MIN_RECT_SIZE)
  let height = Math.max(Math.abs(y2 - y1), MIN_RECT_SIZE)

  x = Math.min(Math.max(x, 0), Math.max(0, imageWidth - width))
  y = Math.min(Math.max(y, 0), Math.max(0, imageHeight - height))
  width = Math.min(width, imageWidth - x)
  height = Math.min(height, imageHeight - y)

  return { x, y, width, height }
}
