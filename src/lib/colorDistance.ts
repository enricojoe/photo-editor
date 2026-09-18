export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Weighted Euclidean distance between two RGBA colors, normalized to 0-100
 * so it lines up with a 0-100 tolerance slider. Alpha is weighted less than
 * color since fully-transparent pixels should still be fillable by color.
 */
export function colorDistance(a: RGBA, b: RGBA): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  const da = a.a - b.a

  const distance = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db + da * da)
  const maxDistance = Math.sqrt(2 * 255 * 255 + 4 * 255 * 255 + 3 * 255 * 255 + 255 * 255)

  return (distance / maxDistance) * 100
}
