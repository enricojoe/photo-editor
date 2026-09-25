import { describe, expect, it, vi } from 'vitest'
import { applyResizeToCanvas } from '../src/features/resize/applyResize'

function createMockCanvas(width = 0, height = 0) {
  const ctx = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    drawImage: vi.fn(),
  }
  const canvas = { width, height, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement
  return { canvas, ctx }
}

/** A `createCanvas` that hands out fresh mock canvases and remembers them in creation order. */
function createCanvasFactory() {
  const created: ReturnType<typeof createMockCanvas>[] = []
  const factory = () => {
    const mock = createMockCanvas()
    created.push(mock)
    return mock.canvas
  }
  return { factory, created }
}

const sizesOf = (created: ReturnType<typeof createMockCanvas>[]) =>
  created.map(({ canvas }) => [canvas.width, canvas.height])

describe('applyResizeToCanvas', () => {
  it('upscales in a single pass, then copies the result 1:1 into the resized base canvas', () => {
    const { canvas: base, ctx: baseCtx } = createMockCanvas(100, 80)
    const { factory, created } = createCanvasFactory()

    applyResizeToCanvas(base, 150, 120, factory)

    expect(sizesOf(created)).toEqual([[150, 120]])
    const [result] = created
    expect(result.ctx.drawImage).toHaveBeenCalledTimes(1)
    expect(result.ctx.drawImage).toHaveBeenCalledWith(base, 0, 0, 100, 80, 0, 0, 150, 120)

    expect(base.width).toBe(150)
    expect(base.height).toBe(120)
    expect(baseCtx.drawImage).toHaveBeenCalledTimes(1)
    expect(baseCtx.drawImage).toHaveBeenCalledWith(result.canvas, 0, 0)
  })

  it('enables high-quality smoothing on every scaling pass', () => {
    const { canvas: base } = createMockCanvas(400, 300)
    const { factory, created } = createCanvasFactory()

    applyResizeToCanvas(base, 50, 40, factory)

    expect(created.length).toBeGreaterThan(1)
    for (const { ctx } of created) {
      expect(ctx.imageSmoothingEnabled).toBe(true)
      expect(ctx.imageSmoothingQuality).toBe('high')
    }
  })

  it('takes a single pass for a reduction of up to 2x on both axes (boundary included)', () => {
    const { canvas: base } = createMockCanvas(100, 80)
    const { factory, created } = createCanvasFactory()

    applyResizeToCanvas(base, 50, 40, factory)

    expect(sizesOf(created)).toEqual([[50, 40]])
    expect(created[0].ctx.drawImage).toHaveBeenCalledWith(base, 0, 0, 100, 80, 0, 0, 50, 40)
    expect(base.width).toBe(50)
    expect(base.height).toBe(40)
  })

  it('steps a large downscale down by halves, then does the final pass at the exact target size', () => {
    const { canvas: base, ctx: baseCtx } = createMockCanvas(400, 300)
    const { factory, created } = createCanvasFactory()

    applyResizeToCanvas(base, 50, 40, factory)

    expect(sizesOf(created)).toEqual([
      [200, 150],
      [100, 75],
      [50, 40],
    ])
    // Each pass reads the previous one, starting from the original canvas.
    expect(created[0].ctx.drawImage).toHaveBeenCalledWith(base, 0, 0, 400, 300, 0, 0, 200, 150)
    expect(created[1].ctx.drawImage).toHaveBeenCalledWith(created[0].canvas, 0, 0, 200, 150, 0, 0, 100, 75)
    expect(created[2].ctx.drawImage).toHaveBeenCalledWith(created[1].canvas, 0, 0, 100, 75, 0, 0, 50, 40)

    expect(base.width).toBe(50)
    expect(base.height).toBe(40)
    expect(baseCtx.drawImage).toHaveBeenCalledWith(created[2].canvas, 0, 0)
  })

  it('only halves the axes that are more than 2x too large', () => {
    const { canvas: base } = createMockCanvas(400, 300)
    const { factory, created } = createCanvasFactory()

    // Width shrinks 4x, height is unchanged.
    applyResizeToCanvas(base, 100, 300, factory)

    expect(sizesOf(created)).toEqual([
      [200, 300],
      [100, 300],
    ])
    expect(base.width).toBe(100)
    expect(base.height).toBe(300)
  })

  it('leaves an upscaled axis alone in the intermediate steps and upscales it in the final pass', () => {
    const { canvas: base } = createMockCanvas(100, 1000)
    const { factory, created } = createCanvasFactory()

    // Width grows 2x while height shrinks 10x.
    applyResizeToCanvas(base, 200, 100, factory)

    expect(sizesOf(created)).toEqual([
      [100, 500],
      [100, 250],
      [100, 125],
      [200, 100],
    ])
    expect(created[3].ctx.drawImage).toHaveBeenCalledWith(created[2].canvas, 0, 0, 100, 125, 0, 0, 200, 100)
    expect(base.width).toBe(200)
    expect(base.height).toBe(100)
  })

  it('throws if the base canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() => applyResizeToCanvas(canvas, 50, 50, () => canvas)).toThrow('Canvas 2D context is unavailable')
  })

  it('throws if an offscreen canvas has no 2D context', () => {
    const { canvas: base } = createMockCanvas(100, 80)
    const offscreen = { getContext: () => null } as unknown as HTMLCanvasElement
    expect(() => applyResizeToCanvas(base, 50, 40, () => offscreen)).toThrow('Canvas 2D context is unavailable')
  })
})
