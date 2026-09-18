import { describe, expect, it } from 'vitest'
import {
  CORNER_HANDLES,
  MIN_CROP_SIZE,
  applyAspectToExistingRect,
  aspectConstrainedRect,
  clampPoint,
  defaultCropRect,
  handlePositions,
  hitTestHandle,
  isInsideRect,
  normalizeRect,
} from '../src/features/crop/cropGeometry'

describe('defaultCropRect', () => {
  it('centers an 80% rect within the image bounds', () => {
    const rect = defaultCropRect(200, 100)
    expect(rect).toEqual({ x: 20, y: 10, width: 160, height: 80 })
  })

  it('never returns a rect smaller than MIN_CROP_SIZE', () => {
    const rect = defaultCropRect(4, 4)
    expect(rect.width).toBeGreaterThanOrEqual(MIN_CROP_SIZE)
    expect(rect.height).toBeGreaterThanOrEqual(MIN_CROP_SIZE)
  })
})

describe('clampPoint', () => {
  it('clamps points outside the image to the image bounds', () => {
    expect(clampPoint(-10, -5, 100, 50)).toEqual({ x: 0, y: 0 })
    expect(clampPoint(150, 80, 100, 50)).toEqual({ x: 100, y: 50 })
  })

  it('leaves in-bounds points untouched', () => {
    expect(clampPoint(30, 20, 100, 50)).toEqual({ x: 30, y: 20 })
  })
})

describe('normalizeRect', () => {
  it('builds a rect from two corners regardless of drag direction', () => {
    expect(normalizeRect(10, 10, 50, 40, 200, 200)).toEqual({ x: 10, y: 10, width: 40, height: 30 })
    // dragging from bottom-right back to top-left should produce the same rect
    expect(normalizeRect(50, 40, 10, 10, 200, 200)).toEqual({ x: 10, y: 10, width: 40, height: 30 })
  })

  it('enforces a minimum size', () => {
    const rect = normalizeRect(10, 10, 11, 11, 200, 200)
    expect(rect.width).toBe(MIN_CROP_SIZE)
    expect(rect.height).toBe(MIN_CROP_SIZE)
  })

  it('clamps the rect to stay within image bounds', () => {
    const rect = normalizeRect(-20, -20, 30, 30, 100, 100)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(100)
    expect(rect.y + rect.height).toBeLessThanOrEqual(100)
  })
})

describe('handlePositions / hitTestHandle', () => {
  const rect = { x: 10, y: 10, width: 40, height: 20 }

  it('places all 8 handles at the expected corners/edges', () => {
    const positions = handlePositions(rect)
    expect(positions.nw).toEqual({ x: 10, y: 10 })
    expect(positions.se).toEqual({ x: 50, y: 30 })
    expect(positions.n).toEqual({ x: 30, y: 10 })
    expect(positions.e).toEqual({ x: 50, y: 20 })
  })

  it('hit-tests a point near a handle', () => {
    expect(hitTestHandle({ x: 10, y: 10 }, rect)).toBe('nw')
    expect(hitTestHandle({ x: 50, y: 30 }, rect)).toBe('se')
  })

  it('returns null when the point is far from every handle', () => {
    expect(hitTestHandle({ x: 200, y: 200 }, rect)).toBeNull()
  })
})

describe('isInsideRect', () => {
  const rect = { x: 10, y: 10, width: 40, height: 20 }

  it('returns true for points inside the rect body', () => {
    expect(isInsideRect({ x: 20, y: 15 }, rect)).toBe(true)
  })

  it('returns false for points outside the rect', () => {
    expect(isInsideRect({ x: 5, y: 5 }, rect)).toBe(false)
  })
})

describe('CORNER_HANDLES', () => {
  it('contains exactly the four corner handles', () => {
    expect(CORNER_HANDLES).toEqual(['nw', 'ne', 'se', 'sw'])
  })
})

describe('aspectConstrainedRect', () => {
  it('fits the raw drag box exactly when it already matches the ratio', () => {
    expect(aspectConstrainedRect(10, 10, 110, 60, 2, 500, 500)).toEqual({ x: 10, y: 10, width: 100, height: 50 })
  })

  it('letterboxes to the shorter raw dimension when the drag box does not match the ratio', () => {
    expect(aspectConstrainedRect(0, 0, 100, 10, 1, 500, 500)).toEqual({ x: 0, y: 0, width: 10, height: 10 })
  })

  it('grows away from the anchor toward the pointer in any quadrant', () => {
    expect(aspectConstrainedRect(100, 100, 50, 80, 1, 500, 500)).toEqual({ x: 80, y: 80, width: 20, height: 20 })
  })

  it('enforces MIN_CROP_SIZE while preserving a wide ratio', () => {
    expect(aspectConstrainedRect(0, 0, 2, 1, 2, 500, 500)).toEqual({ x: 0, y: 0, width: 16, height: 8 })
  })

  it('enforces MIN_CROP_SIZE while preserving a tall ratio', () => {
    expect(aspectConstrainedRect(0, 0, 1, 2, 0.5, 500, 500)).toEqual({ x: 0, y: 0, width: 8, height: 16 })
  })

  it('shrinks below MIN_CROP_SIZE rather than crossing the image bounds near an edge', () => {
    const rect = aspectConstrainedRect(9, 250, 10, 255, 1, 10, 500)
    expect(rect).toEqual({ x: 9, y: 250, width: 1, height: 1 })
  })

  it('never exceeds image bounds for a ratio much wider than the available room', () => {
    const rect = aspectConstrainedRect(95, 10, 100, 90, 1, 100, 100)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(100)
    expect(rect.y + rect.height).toBeLessThanOrEqual(100)
  })
})

describe('applyAspectToExistingRect', () => {
  it('keeps width and derives height around the same center when it fits', () => {
    expect(applyAspectToExistingRect({ x: 10, y: 10, width: 100, height: 50 }, 1, 1000, 1000)).toEqual({
      x: 10,
      y: 0,
      width: 100,
      height: 100,
    })
  })

  it('shrinks a rect whose width cannot fit the image at the new ratio (reverse-driving case)', () => {
    expect(applyAspectToExistingRect({ x: 0, y: 0, width: 100, height: 50 }, 1, 100, 50)).toEqual({
      x: 25,
      y: 0,
      width: 50,
      height: 50,
    })
  })

  it('enforces MIN_CROP_SIZE when reshaping a very small rect', () => {
    expect(applyAspectToExistingRect({ x: 0, y: 0, width: 5, height: 5 }, 2, 500, 500)).toEqual({
      x: 0,
      y: 0,
      width: 16,
      height: 8,
    })
  })

  it('leaves an already-conforming rect unchanged', () => {
    expect(applyAspectToExistingRect({ x: 20, y: 20, width: 100, height: 100 }, 1, 1000, 1000)).toEqual({
      x: 20,
      y: 20,
      width: 100,
      height: 100,
    })
  })
})
