import { describe, expect, it, vi } from 'vitest'
import { clearSelectionPixels } from '../src/features/selection/clearSelection'
import type { Selection } from '../src/features/selection/selectionGeometry'

function createMockCanvas(width: number, height: number) {
  const calls: { getImageData?: number[]; putImageData?: unknown } = {}
  const canvas = {
    width,
    height,
    getContext: vi.fn(() => ({
      getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
        calls.getImageData = [x, y, w, h]
        const data = new Uint8ClampedArray(w * h * 4)
        data.fill(255) // opaque white everywhere, so we can see which pixels get cleared
        return { data, width: w, height: h }
      }),
      putImageData: vi.fn((imageData: unknown) => {
        calls.putImageData = imageData
      }),
    })),
  } as unknown as HTMLCanvasElement

  return { canvas, calls }
}

function alphaAt(imageData: { data: Uint8ClampedArray }, width: number, x: number, y: number): number {
  return imageData.data[(y * width + x) * 4 + 3]
}

describe('clearSelectionPixels', () => {
  it('clears only the masked pixels within the bounds, leaving the rest opaque', () => {
    const { canvas, calls } = createMockCanvas(4, 4)
    // A 2x2 selection at (1,1) where only the diagonal pixels are actually selected.
    const mask = new Uint8Array(16)
    mask[1 * 4 + 1] = 1 // (1,1)
    mask[2 * 4 + 2] = 1 // (2,2)
    const selection: Selection = {
      shapeData: { shape: 'rectangle', rect: { x: 1, y: 1, width: 2, height: 2 } },
      mask,
      bounds: { x: 1, y: 1, width: 2, height: 2 },
    }

    clearSelectionPixels(canvas, selection)

    expect(calls.getImageData).toEqual([1, 1, 2, 2])
    const written = calls.putImageData as { data: Uint8ClampedArray }
    expect(alphaAt(written, 2, 0, 0)).toBe(0) // local (0,0) -> image (1,1), selected
    expect(alphaAt(written, 2, 1, 1)).toBe(0) // local (1,1) -> image (2,2), selected
    expect(alphaAt(written, 2, 1, 0)).toBe(255) // local (1,0) -> image (2,1), not selected
    expect(alphaAt(written, 2, 0, 1)).toBe(255) // local (0,1) -> image (1,2), not selected
  })

  it('is a no-op when the canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
    const selection: Selection = {
      shapeData: { shape: 'rectangle', rect: { x: 0, y: 0, width: 1, height: 1 } },
      mask: new Uint8Array(1),
      bounds: { x: 0, y: 0, width: 1, height: 1 },
    }
    expect(() => clearSelectionPixels(canvas, selection)).not.toThrow()
  })
})
