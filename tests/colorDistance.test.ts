import { describe, expect, it } from 'vitest'
import { colorDistance } from '../src/lib/colorDistance'

describe('colorDistance', () => {
  it('returns 0 for identical colors', () => {
    expect(colorDistance({ r: 10, g: 20, b: 30, a: 255 }, { r: 10, g: 20, b: 30, a: 255 })).toBe(0)
  })

  it('returns 100 for maximally different colors', () => {
    const distance = colorDistance({ r: 0, g: 0, b: 0, a: 0 }, { r: 255, g: 255, b: 255, a: 255 })
    expect(distance).toBeCloseTo(100, 5)
  })

  it('increases monotonically with color difference', () => {
    const base = { r: 100, g: 100, b: 100, a: 255 }
    const near = colorDistance(base, { r: 110, g: 100, b: 100, a: 255 })
    const far = colorDistance(base, { r: 200, g: 100, b: 100, a: 255 })
    expect(far).toBeGreaterThan(near)
  })
})
