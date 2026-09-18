import { describe, expect, it } from 'vitest'
import { rgbToHex } from '../src/lib/hexColor'

describe('rgbToHex', () => {
  it('converts black to #000000', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('converts white to #ffffff', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
  })

  it('pads single-digit hex components with a leading zero', () => {
    expect(rgbToHex(15, 1, 0)).toBe('#0f0100')
  })

  it('converts an arbitrary color', () => {
    expect(rgbToHex(230, 57, 70)).toBe('#e63946')
  })
})
