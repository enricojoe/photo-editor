import { describe, expect, it, vi } from 'vitest'
import { strokeBrushSegment } from '../src/features/brush/drawBrushStroke'

function createMockContext() {
  const calls: { moveTo?: unknown[]; lineTo?: unknown[] } = {}
  return {
    lineCap: '',
    lineJoin: '',
    lineWidth: 0,
    strokeStyle: '',
    beginPath: vi.fn(),
    moveTo: vi.fn((...args: unknown[]) => {
      calls.moveTo = args
    }),
    lineTo: vi.fn((...args: unknown[]) => {
      calls.lineTo = args
    }),
    stroke: vi.fn(),
    calls,
  } as unknown as CanvasRenderingContext2D & { calls: typeof calls }
}

describe('strokeBrushSegment', () => {
  it('configures round caps/joins and the given size/color, then strokes from -> to', () => {
    const ctx = createMockContext()

    strokeBrushSegment(ctx, { x: 10, y: 20 }, { x: 30, y: 40 }, { size: 14, color: '#123abc' })

    expect(ctx.lineCap).toBe('round')
    expect(ctx.lineJoin).toBe('round')
    expect(ctx.lineWidth).toBe(14)
    expect(ctx.strokeStyle).toBe('#123abc')
    expect(ctx.beginPath).toHaveBeenCalledOnce()
    expect(ctx.calls.moveTo).toEqual([10, 20])
    expect(ctx.calls.lineTo).toEqual([30, 40])
    expect(ctx.stroke).toHaveBeenCalledOnce()
  })

  it('strokes a zero-length segment (a dot) when from and to are the same point', () => {
    const ctx = createMockContext()

    strokeBrushSegment(ctx, { x: 5, y: 5 }, { x: 5, y: 5 }, { size: 8, color: '#ffffff' })

    expect(ctx.calls.moveTo).toEqual([5, 5])
    expect(ctx.calls.lineTo).toEqual([5, 5])
    expect(ctx.stroke).toHaveBeenCalledOnce()
  })
})
