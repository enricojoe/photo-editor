import type { Rect } from '../canvas/rectGeometry'

export interface SelectionPoint {
  x: number
  y: number
}

export type SelectionShape = 'rectangle' | 'lasso'

export type SelectionShapeData =
  | { shape: 'rectangle'; rect: Rect }
  | { shape: 'lasso'; points: SelectionPoint[] }

export interface Selection {
  /** Raw shape data, kept only so the tool can redraw an exact outline while active. */
  shapeData: SelectionShapeData
  /** length === imageWidth * imageHeight; 1 = selected. Full-image-sized so
   *  every consumer indexes it as plain y*imageWidth+x — same convention as
   *  floodFill's own `filled` marker grid. */
  mask: Uint8Array
  /** Tight bounding box — an iteration-efficiency helper for delete/redraw only.
   *  Never treat this as the selection itself; always consult `mask`. */
  bounds: Rect
}

export function rasterizeRect(rect: Rect, imageWidth: number, imageHeight: number): { mask: Uint8Array; bounds: Rect } {
  const mask = new Uint8Array(imageWidth * imageHeight)
  const x0 = Math.round(rect.x)
  const y0 = Math.round(rect.y)
  const x1 = Math.min(imageWidth, Math.round(rect.x + rect.width))
  const y1 = Math.min(imageHeight, Math.round(rect.y + rect.height))

  for (let y = y0; y < y1; y++) {
    const rowOffset = y * imageWidth
    for (let x = x0; x < x1; x++) mask[rowOffset + x] = 1
  }

  return { mask, bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }
}

/**
 * Rasterizes a closed polygon into a full-image mask using the even-odd
 * scanline fill rule. The edge from the last point back to the first is
 * implicit — do not pass a duplicate closing point. Samples at pixel
 * centers (x+0.5, y+0.5). Self-crossing paths are handled correctly by the
 * same even-odd pairing with no extra logic — the right rule for a raw
 * freehand mouse path, which has no meaningful "intended winding direction."
 * Returns null for fewer than 3 points, or a polygon enclosing no pixel centers.
 */
export function rasterizeLassoPolygon(
  points: SelectionPoint[],
  imageWidth: number,
  imageHeight: number,
): { mask: Uint8Array; bounds: Rect } | null {
  if (points.length < 3) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const yStart = Math.max(0, Math.floor(minY))
  const yEnd = Math.min(imageHeight - 1, Math.ceil(maxY) - 1)
  const xClampMin = Math.max(0, Math.floor(minX))
  const xClampMax = Math.min(imageWidth - 1, Math.ceil(maxX) - 1)
  if (yStart > yEnd || xClampMin > xClampMax) return null

  const mask = new Uint8Array(imageWidth * imageHeight)
  let boundsMinX = Infinity
  let boundsMinY = Infinity
  let boundsMaxX = -Infinity
  let boundsMaxY = -Infinity
  const n = points.length
  const xIntersections: number[] = []

  for (let y = yStart; y <= yEnd; y++) {
    const scanY = y + 0.5
    xIntersections.length = 0

    for (let i = 0; i < n; i++) {
      const a = points[i]
      const b = points[(i + 1) % n]
      const y1 = a.y
      const y2 = b.y
      if (y1 === y2) continue // horizontal edges never produce a single crossing
      // Half-open [min(y1,y2), max(y1,y2)) test avoids double-counting a
      // scanline that passes exactly through a shared vertex.
      const crosses = (y1 <= scanY && y2 > scanY) || (y2 <= scanY && y1 > scanY)
      if (!crosses) continue

      const t = (scanY - y1) / (y2 - y1)
      xIntersections.push(a.x + t * (b.x - a.x))
    }

    xIntersections.sort((p, q) => p - q) // numeric sort — default sort() is lexicographic

    for (let i = 0; i + 1 < xIntersections.length; i += 2) {
      const spanStart = xIntersections[i]
      const spanEnd = xIntersections[i + 1]
      // Fill pixel x iff its center is inside [spanStart, spanEnd).
      const xFrom = Math.max(xClampMin, Math.ceil(spanStart - 0.5))
      const xTo = Math.min(xClampMax, Math.ceil(spanEnd - 0.5) - 1)
      if (xFrom > xTo) continue

      const rowOffset = y * imageWidth
      for (let x = xFrom; x <= xTo; x++) mask[rowOffset + x] = 1

      if (xFrom < boundsMinX) boundsMinX = xFrom
      if (xTo > boundsMaxX) boundsMaxX = xTo
      if (y < boundsMinY) boundsMinY = y
      if (y > boundsMaxY) boundsMaxY = y
    }
  }

  if (boundsMinX > boundsMaxX || boundsMinY > boundsMaxY) return null

  return {
    mask,
    bounds: {
      x: boundsMinX,
      y: boundsMinY,
      width: boundsMaxX - boundsMinX + 1,
      height: boundsMaxY - boundsMinY + 1,
    },
  }
}
