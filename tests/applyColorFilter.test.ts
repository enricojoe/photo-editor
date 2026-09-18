import { describe, expect, it, vi } from 'vitest'
import { applyColorFilterToCanvas } from '../src/features/colorAdjust/applyColorFilter'

function createMockCanvas() {
  const calls: { filter?: string; drawImage?: unknown[]; clearRect?: unknown[] } = {}
  const ctx = {
    get filter() {
      return calls.filter ?? 'none'
    },
    set filter(value: string) {
      calls.filter = value
    },
    drawImage: vi.fn((...args: unknown[]) => {
      calls.drawImage = args
    }),
    clearRect: vi.fn((...args: unknown[]) => {
      calls.clearRect = args
    }),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement

  return { canvas, ctx, calls }
}

describe('applyColorFilterToCanvas', () => {
  it('renders the base canvas through an offscreen canvas with the filter, then writes the result back', () => {
    const { canvas: base, calls: baseCalls } = createMockCanvas()
    base.width = 100
    base.height = 80
    const { canvas: offscreen, calls: offscreenCalls } = createMockCanvas()

    applyColorFilterToCanvas(base, 'brightness(150%) contrast(120%) saturate(80%)', () => offscreen)

    expect(offscreen.width).toBe(100)
    expect(offscreen.height).toBe(80)
    expect(offscreenCalls.filter).toBe('brightness(150%) contrast(120%) saturate(80%)')
    expect(offscreenCalls.drawImage).toEqual([base, 0, 0])
    expect(baseCalls.clearRect).toEqual([0, 0, 100, 80])
    expect(baseCalls.drawImage).toEqual([offscreen, 0, 0])
  })

  it('throws if the base canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() => applyColorFilterToCanvas(canvas, 'brightness(100%)', () => canvas)).toThrow(
      'Canvas 2D context is unavailable',
    )
  })

  it('throws if the offscreen canvas has no 2D context', () => {
    const { canvas: base } = createMockCanvas()
    const offscreen = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() => applyColorFilterToCanvas(base, 'brightness(100%)', () => offscreen)).toThrow(
      'Canvas 2D context is unavailable',
    )
  })
})
