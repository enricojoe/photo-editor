import { describe, expect, it, vi } from 'vitest'
import { applyCropToCanvas } from '../src/features/crop/applyCrop'

function createMockCanvas() {
  const calls: { getImageData?: number[]; putImageData?: unknown } = {}
  const canvas = {
    width: 100,
    height: 80,
    getContext: vi.fn(() => ({
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        calls.getImageData = [x, y, w, h]
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
      }),
      putImageData: vi.fn((imageData: unknown) => {
        calls.putImageData = imageData
      }),
    })),
  } as unknown as HTMLCanvasElement

  return { canvas, calls }
}

describe('applyCropToCanvas', () => {
  it('reads the requested rect and resizes the canvas to match', () => {
    const { canvas, calls } = createMockCanvas()

    const result = applyCropToCanvas(canvas, { x: 10, y: 5, width: 30, height: 20 })

    expect(calls.getImageData).toEqual([10, 5, 30, 20])
    expect(canvas.width).toBe(30)
    expect(canvas.height).toBe(20)
    expect(result).toEqual({ width: 30, height: 20 })
    expect(calls.putImageData).toBeDefined()
  })

  it('rounds fractional rect coordinates', () => {
    const { canvas, calls } = createMockCanvas()

    applyCropToCanvas(canvas, { x: 10.4, y: 5.6, width: 30.2, height: 19.9 })

    expect(calls.getImageData).toEqual([10, 6, 30, 20])
  })

  it('throws if the canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() => applyCropToCanvas(canvas, { x: 0, y: 0, width: 10, height: 10 })).toThrow(
      'Canvas 2D context is unavailable',
    )
  })
})
