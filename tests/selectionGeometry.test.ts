import { describe, expect, it } from 'vitest'
import { rasterizeLassoPolygon, rasterizeRect } from '../src/features/selection/selectionGeometry'

function maskRows(mask: Uint8Array, width: number, height: number): number[][] {
  const rows: number[][] = []
  for (let y = 0; y < height; y++) rows.push(Array.from(mask.subarray(y * width, y * width + width)))
  return rows
}

describe('rasterizeRect', () => {
  it('fills exactly the pixels within the rect', () => {
    const { mask, bounds } = rasterizeRect({ x: 1, y: 1, width: 2, height: 2 }, 4, 4)
    expect(maskRows(mask, 4, 4)).toEqual([
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ])
    expect(bounds).toEqual({ x: 1, y: 1, width: 2, height: 2 })
  })

  it('clamps to image bounds when the rect overhangs the edge', () => {
    const { bounds } = rasterizeRect({ x: 2, y: 2, width: 10, height: 10 }, 4, 4)
    expect(bounds).toEqual({ x: 2, y: 2, width: 2, height: 2 })
  })
})

describe('rasterizeLassoPolygon', () => {
  it('returns null for fewer than 3 points', () => {
    expect(rasterizeLassoPolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }], 4, 4)).toBeNull()
  })

  it('rasterizes a right-triangle staircase', () => {
    const result = rasterizeLassoPolygon(
      [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }],
      4,
      4,
    )
    expect(result).not.toBeNull()
    expect(maskRows(result!.mask, 4, 4)).toEqual([
      [1, 1, 1, 0],
      [1, 1, 0, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    expect(result!.bounds).toEqual({ x: 0, y: 0, width: 3, height: 3 })
  })

  it('rasterizes a concave notched shape with multiple spans per scanline', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]
    const result = rasterizeLassoPolygon(points, 4, 4)
    expect(result).not.toBeNull()
    expect(maskRows(result!.mask, 4, 4)).toEqual([
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ])
  })

  it('returns null for a degenerate polygon with zero area', () => {
    expect(rasterizeLassoPolygon([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }], 4, 4)).toBeNull()
  })
})
