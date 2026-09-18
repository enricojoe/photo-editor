import { describe, expect, it, vi } from 'vitest'
import { applyWatermarkToCanvas, drawWatermark, type WatermarkOptions } from '../src/features/watermark/applyWatermark'

function createMockContext() {
  const calls: string[] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }

  const ctx = {
    save: vi.fn(() => calls.push('save')),
    restore: vi.fn(() => calls.push('restore')),
    fillText: vi.fn((...args: unknown[]) => calls.push(`fillText:${JSON.stringify(args)}`)),
    drawImage: vi.fn((...args: unknown[]) => calls.push(`drawImage:${JSON.stringify(args)}`)),
    get globalAlpha() {
      return state.globalAlpha as number
    },
    set globalAlpha(value: number) {
      state.globalAlpha = value
    },
    get font() {
      return state.font as string
    },
    set font(value: string) {
      state.font = value
    },
    get fillStyle() {
      return state.fillStyle as string
    },
    set fillStyle(value: string) {
      state.fillStyle = value
    },
    get textAlign() {
      return state.textAlign as string
    },
    set textAlign(value: string) {
      state.textAlign = value
    },
    get textBaseline() {
      return state.textBaseline as string
    },
    set textBaseline(value: string) {
      state.textBaseline = value
    },
  }

  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, state }
}

describe('drawWatermark', () => {
  it('draws centered text with the configured font, color, and opacity, wrapped in save/restore', () => {
    const { ctx, calls, state } = createMockContext()
    const options: WatermarkOptions = {
      mode: 'text',
      text: 'Copyright 2026',
      fontSize: 40,
      color: '#ff0000',
      opacity: 50,
      x: 100,
      y: 200,
    }

    drawWatermark(ctx, options)

    expect(state.globalAlpha).toBe(0.5)
    expect(state.font).toBe("40px system-ui, 'Segoe UI', Roboto, sans-serif")
    expect(state.fillStyle).toBe('#ff0000')
    expect(state.textAlign).toBe('center')
    expect(state.textBaseline).toBe('middle')
    expect(calls).toEqual(['save', 'fillText:["Copyright 2026",100,200]', 'restore'])
  })

  it('draws an image centered on (x, y) at the requested size, wrapped in save/restore', () => {
    const { ctx, calls, state } = createMockContext()
    const image = {} as CanvasImageSource
    const options: WatermarkOptions = {
      mode: 'image',
      image,
      width: 80,
      height: 40,
      opacity: 75,
      x: 100,
      y: 200,
    }

    drawWatermark(ctx, options)

    expect(state.globalAlpha).toBe(0.75)
    expect(calls).toEqual(['save', `drawImage:${JSON.stringify([image, 60, 180, 80, 40])}`, 'restore'])
  })
})

describe('applyWatermarkToCanvas', () => {
  it('draws the watermark into the canvas 2D context', () => {
    const { ctx, calls } = createMockContext()
    const canvas = { getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement
    const options: WatermarkOptions = {
      mode: 'text',
      text: 'Sample',
      fontSize: 24,
      color: '#000000',
      opacity: 100,
      x: 10,
      y: 20,
    }

    applyWatermarkToCanvas(canvas, options)

    expect(canvas.getContext).toHaveBeenCalledWith('2d')
    expect(calls).toEqual(['save', 'fillText:["Sample",10,20]', 'restore'])
  })

  it('throws if the canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    const options: WatermarkOptions = {
      mode: 'text',
      text: 'Sample',
      fontSize: 24,
      color: '#000000',
      opacity: 100,
      x: 10,
      y: 20,
    }

    expect(() => applyWatermarkToCanvas(canvas, options)).toThrow('Canvas 2D context is unavailable')
  })
})
