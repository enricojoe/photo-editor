import { describe, expect, it } from 'vitest'
import { buildBrushCursor } from '../src/features/brush/brushCursor'

describe('buildBrushCursor', () => {
  it('returns a CSS cursor value with a data-URI SVG and a crosshair fallback', () => {
    const cursor = buildBrushCursor(20)
    expect(cursor).toMatch(/^url\("data:image\/svg\+xml,/)
    expect(cursor).toContain('crosshair')
  })

  it('sizes the SVG around the requested diameter plus padding', () => {
    const cursor = buildBrushCursor(20)
    const svg = decodeURIComponent(cursor.match(/data:image\/svg\+xml,([^"]+)"/)![1])
    expect(svg).toContain('width="24"')
    expect(svg).toContain('height="24"')
  })

  it('clamps very small diameters up to the minimum visible size', () => {
    const cursor = buildBrushCursor(0.5)
    const svg = decodeURIComponent(cursor.match(/data:image\/svg\+xml,([^"]+)"/)![1])
    expect(svg).toContain('width="10"') // MIN_CURSOR_DIAMETER (6) + 4 padding
  })

  it('clamps very large diameters down to the maximum supported size', () => {
    const cursor = buildBrushCursor(9999)
    const svg = decodeURIComponent(cursor.match(/data:image\/svg\+xml,([^"]+)"/)![1])
    expect(svg).toContain('width="124"') // MAX_CURSOR_DIAMETER (120) + 4 padding
  })

  it('centers the hotspot on the middle of the generated image', () => {
    const cursor = buildBrushCursor(20)
    expect(cursor).toContain('") 12 12, crosshair')
  })
})
