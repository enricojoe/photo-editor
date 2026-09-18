import { describe, expect, it } from 'vitest'
import { buildCssFilter, COLOR_ADJUST_PRESETS, DEFAULT_COLOR_ADJUST } from '../src/features/colorAdjust/colorFilter'

describe('buildCssFilter', () => {
  it('maps default values to an identity filter', () => {
    expect(buildCssFilter(DEFAULT_COLOR_ADJUST)).toBe('brightness(100%) contrast(100%) saturate(100%)')
  })

  it('maps -100 brightness/contrast to 0%', () => {
    expect(buildCssFilter({ brightness: -100, contrast: -100, saturation: 100 })).toBe(
      'brightness(0%) contrast(0%) saturate(100%)',
    )
  })

  it('maps +100 brightness/contrast to 200%', () => {
    expect(buildCssFilter({ brightness: 100, contrast: 100, saturation: 100 })).toBe(
      'brightness(200%) contrast(200%) saturate(100%)',
    )
  })

  it('maps saturation directly to saturate()', () => {
    expect(buildCssFilter({ brightness: 0, contrast: 0, saturation: 0 })).toBe(
      'brightness(100%) contrast(100%) saturate(0%)',
    )
    expect(buildCssFilter({ brightness: 0, contrast: 0, saturation: 200 })).toBe(
      'brightness(100%) contrast(100%) saturate(200%)',
    )
  })
})

describe('COLOR_ADJUST_PRESETS', () => {
  it('includes the expected preset labels', () => {
    expect(COLOR_ADJUST_PRESETS.map((preset) => preset.label)).toEqual([
      'Normal',
      'Warm',
      'Cool',
      'Night',
      'Vintage',
      'B&W',
    ])
  })

  it('has a Normal preset that matches the default values', () => {
    const normal = COLOR_ADJUST_PRESETS.find((preset) => preset.label === 'Normal')
    expect(normal?.values).toEqual(DEFAULT_COLOR_ADJUST)
  })
})
