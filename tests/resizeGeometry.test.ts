import { describe, expect, it } from 'vitest'
import {
  MAX_RESIZE_SIZE,
  MIN_RESIZE_SIZE,
  exceedsMaxSize,
  parsePositiveNumber,
  proportionalLength,
  resolveResizeTarget,
  scaledDimensions,
} from '../src/features/resize/resizeGeometry'

const SOURCE = { width: 2000, height: 1500 }

describe('parsePositiveNumber', () => {
  it('parses plain and padded numbers, including decimals', () => {
    expect(parsePositiveNumber('500')).toBe(500)
    expect(parsePositiveNumber(' 12.5 ')).toBe(12.5)
  })

  it.each(['', '   ', 'abc', '0', '-5', 'Infinity'])('rejects %j', (text) => {
    expect(parsePositiveNumber(text)).toBeNull()
  })
})

describe('proportionalLength', () => {
  it('keeps the source aspect ratio', () => {
    // 2000x1500 is 4:3, so a width of 500 pairs with a height of 375.
    expect(proportionalLength(500, 2000, 1500)).toBe(375)
    expect(proportionalLength(375, 1500, 2000)).toBe(500)
  })

  it('rounds to the nearest whole pixel', () => {
    // 333 * 750 / 1000 = 249.75
    expect(proportionalLength(333, 1000, 750)).toBe(250)
  })

  it('never returns less than MIN_RESIZE_SIZE', () => {
    expect(proportionalLength(1, 4000, 10)).toBe(MIN_RESIZE_SIZE)
  })
})

describe('scaledDimensions', () => {
  it('scales both axes by the percentage', () => {
    expect(scaledDimensions(50, SOURCE)).toEqual({ width: 1000, height: 750 })
    expect(scaledDimensions(200, SOURCE)).toEqual({ width: 4000, height: 3000 })
    expect(scaledDimensions(100, SOURCE)).toEqual(SOURCE)
  })

  it('rounds each axis independently', () => {
    // 33% of 100x75 is 33 x 24.75
    expect(scaledDimensions(33, { width: 100, height: 75 })).toEqual({ width: 33, height: 25 })
  })

  it('never shrinks an axis below MIN_RESIZE_SIZE', () => {
    expect(scaledDimensions(0.01, { width: 100, height: 50 })).toEqual({
      width: MIN_RESIZE_SIZE,
      height: MIN_RESIZE_SIZE,
    })
  })
})

describe('resolveResizeTarget', () => {
  describe('pixels mode', () => {
    it('returns the requested size', () => {
      expect(resolveResizeTarget({ mode: 'pixels', width: '500', height: '600' }, SOURCE)).toEqual({
        width: 500,
        height: 600,
      })
    })

    it('rounds decimals and clamps sub-pixel sizes up to MIN_RESIZE_SIZE', () => {
      expect(resolveResizeTarget({ mode: 'pixels', width: '500.6', height: '0.4' }, SOURCE)).toEqual({
        width: 501,
        height: MIN_RESIZE_SIZE,
      })
    })

    it.each([
      ['empty width', '', '600'],
      ['empty height', '500', ''],
      ['zero width', '0', '600'],
      ['negative height', '500', '-1'],
      ['non-numeric width', 'abc', '600'],
    ])('returns null for %s', (_label, width, height) => {
      expect(resolveResizeTarget({ mode: 'pixels', width, height }, SOURCE)).toBeNull()
    })
  })

  describe('percent mode', () => {
    it('scales the source by the percentage', () => {
      expect(resolveResizeTarget({ mode: 'percent', percent: '50' }, SOURCE)).toEqual({ width: 1000, height: 750 })
    })

    it.each(['', '0', '-10', 'abc'])('returns null for %j', (percent) => {
      expect(resolveResizeTarget({ mode: 'percent', percent }, SOURCE)).toBeNull()
    })
  })

  it('does not clamp to MAX_RESIZE_SIZE, so callers can report "too large" separately', () => {
    const target = resolveResizeTarget({ mode: 'percent', percent: '1000' }, SOURCE)
    expect(target).toEqual({ width: 20000, height: 15000 })
  })
})

describe('exceedsMaxSize', () => {
  it('allows sizes up to and including MAX_RESIZE_SIZE', () => {
    expect(exceedsMaxSize({ width: MAX_RESIZE_SIZE, height: MAX_RESIZE_SIZE })).toBe(false)
  })

  it('flags either axis going over the limit', () => {
    expect(exceedsMaxSize({ width: MAX_RESIZE_SIZE + 1, height: 10 })).toBe(true)
    expect(exceedsMaxSize({ width: 10, height: MAX_RESIZE_SIZE + 1 })).toBe(true)
  })
})
