import { describe, expect, it } from 'vitest'
import { sampleHexColor } from '../src/features/colorPicker/sampleColor'

function fakeCtx(pixelAt: (x: number, y: number) => [number, number, number, number]) {
  return {
    getImageData(x: number, y: number) {
      return { data: pixelAt(x, y) }
    },
  }
}

describe('sampleHexColor', () => {
  it('reads and converts the pixel at the given point', () => {
    const ctx = fakeCtx(() => [230, 57, 70, 255])
    expect(sampleHexColor(ctx, 100, 100, { x: 10, y: 20 })).toBe('#e63946')
  })

  it('floors fractional coordinates before sampling', () => {
    let sampledAt: [number, number] | null = null
    const ctx = fakeCtx((x, y) => {
      sampledAt = [x, y]
      return [0, 0, 0, 255]
    })
    sampleHexColor(ctx, 100, 100, { x: 10.9, y: 20.4 })
    expect(sampledAt).toEqual([10, 20])
  })

  it('clamps negative coordinates to 0', () => {
    let sampledAt: [number, number] | null = null
    const ctx = fakeCtx((x, y) => {
      sampledAt = [x, y]
      return [0, 0, 0, 255]
    })
    sampleHexColor(ctx, 100, 50, { x: -5, y: -1 })
    expect(sampledAt).toEqual([0, 0])
  })

  it('clamps coordinates beyond the canvas bounds to the last valid pixel', () => {
    let sampledAt: [number, number] | null = null
    const ctx = fakeCtx((x, y) => {
      sampledAt = [x, y]
      return [0, 0, 0, 255]
    })
    sampleHexColor(ctx, 100, 50, { x: 150, y: 60 })
    expect(sampledAt).toEqual([99, 49])
  })
})
