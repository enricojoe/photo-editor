import { describe, expect, it, vi } from 'vitest'
import { applyTransformToCanvas } from '../src/features/transform/applyTransform'

function createMockCanvas() {
  const calls: {
    translate?: unknown[]
    rotate?: unknown[]
    scale?: unknown[]
    drawImage?: unknown[]
    clearRect?: unknown[]
    save?: boolean
    restore?: boolean
  } = {}
  const ctx = {
    translate: vi.fn((...args: unknown[]) => {
      calls.translate = args
    }),
    rotate: vi.fn((...args: unknown[]) => {
      calls.rotate = args
    }),
    scale: vi.fn((...args: unknown[]) => {
      calls.scale = args
    }),
    drawImage: vi.fn((...args: unknown[]) => {
      calls.drawImage = args
    }),
    clearRect: vi.fn((...args: unknown[]) => {
      calls.clearRect = args
    }),
    save: vi.fn(() => {
      calls.save = true
    }),
    restore: vi.fn(() => {
      calls.restore = true
    }),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement

  return { canvas, ctx, calls }
}

describe('applyTransformToCanvas', () => {
  describe('rotate', () => {
    it('rotates clockwise: swaps dimensions, rotates +90deg translated by the new width', () => {
      const { canvas: base, calls: baseCalls } = createMockCanvas()
      base.width = 100
      base.height = 80
      const { canvas: offscreen, calls: offscreenCalls } = createMockCanvas()

      applyTransformToCanvas(base, { type: 'rotate', direction: 'cw' }, () => offscreen)

      // Offscreen is built with swapped dimensions (height x width).
      expect(offscreen.width).toBe(80)
      expect(offscreen.height).toBe(100)
      expect(offscreenCalls.translate).toEqual([80, 0])
      expect(offscreenCalls.rotate).toEqual([Math.PI / 2])
      expect(offscreenCalls.drawImage).toEqual([base, 0, 0])

      // Base canvas ends up with the swapped dimensions and the rotated result.
      expect(base.width).toBe(80)
      expect(base.height).toBe(100)
      expect(baseCalls.clearRect).toEqual([0, 0, 80, 100])
      expect(baseCalls.drawImage).toEqual([offscreen, 0, 0])
    })

    it('rotates counterclockwise: swaps dimensions, rotates -90deg translated by the new height', () => {
      const { canvas: base } = createMockCanvas()
      base.width = 100
      base.height = 80
      const { canvas: offscreen, calls: offscreenCalls } = createMockCanvas()

      applyTransformToCanvas(base, { type: 'rotate', direction: 'ccw' }, () => offscreen)

      expect(offscreen.width).toBe(80)
      expect(offscreen.height).toBe(100)
      expect(offscreenCalls.translate).toEqual([0, 100])
      expect(offscreenCalls.rotate).toEqual([-Math.PI / 2])
      expect(offscreenCalls.drawImage).toEqual([base, 0, 0])

      expect(base.width).toBe(80)
      expect(base.height).toBe(100)
    })
  })

  describe('flip', () => {
    it('flips horizontally: mirrors across the vertical axis, dimensions unchanged', () => {
      const { canvas: base, calls: baseCalls } = createMockCanvas()
      base.width = 100
      base.height = 80
      const { canvas: offscreen, calls: offscreenCalls } = createMockCanvas()

      applyTransformToCanvas(base, { type: 'flip', axis: 'horizontal' }, () => offscreen)

      expect(offscreen.width).toBe(100)
      expect(offscreen.height).toBe(80)
      expect(offscreenCalls.drawImage).toEqual([base, 0, 0])

      expect(base.width).toBe(100)
      expect(base.height).toBe(80)
      expect(baseCalls.save).toBe(true)
      expect(baseCalls.clearRect).toEqual([0, 0, 100, 80])
      expect(baseCalls.translate).toEqual([100, 0])
      expect(baseCalls.scale).toEqual([-1, 1])
      expect(baseCalls.drawImage).toEqual([offscreen, 0, 0])
      expect(baseCalls.restore).toBe(true)
    })

    it('flips vertically: mirrors across the horizontal axis, dimensions unchanged', () => {
      const { canvas: base, calls: baseCalls } = createMockCanvas()
      base.width = 100
      base.height = 80
      const { canvas: offscreen } = createMockCanvas()

      applyTransformToCanvas(base, { type: 'flip', axis: 'vertical' }, () => offscreen)

      expect(base.width).toBe(100)
      expect(base.height).toBe(80)
      expect(baseCalls.translate).toEqual([0, 80])
      expect(baseCalls.scale).toEqual([1, -1])
      expect(baseCalls.drawImage).toEqual([offscreen, 0, 0])
    })
  })

  it('throws if the base canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() => applyTransformToCanvas(canvas, { type: 'flip', axis: 'horizontal' }, () => canvas)).toThrow(
      'Canvas 2D context is unavailable',
    )
  })

  it('throws if the offscreen canvas has no 2D context (rotate)', () => {
    const { canvas: base } = createMockCanvas()
    const offscreen = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() =>
      applyTransformToCanvas(base, { type: 'rotate', direction: 'cw' }, () => offscreen),
    ).toThrow('Canvas 2D context is unavailable')
  })

  it('throws if the offscreen canvas has no 2D context (flip)', () => {
    const { canvas: base } = createMockCanvas()
    const offscreen = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() =>
      applyTransformToCanvas(base, { type: 'flip', axis: 'horizontal' }, () => offscreen),
    ).toThrow('Canvas 2D context is unavailable')
  })
})
