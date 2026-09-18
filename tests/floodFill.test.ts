import { describe, expect, it } from 'vitest'
import { floodFill } from '../src/features/bucketFill/floodFill'
import type { RGBA } from '../src/lib/colorDistance'

const RED = { r: 200, g: 0, b: 0, a: 255 }
const NEAR_RED = { r: 210, g: 10, b: 10, a: 255 }
const WHITE = { r: 255, g: 255, b: 255, a: 255 }
const FILL = { r: 0, g: 0, b: 255, a: 255 }

/**
 * Builds a 5x5 ImageData-shaped grid:
 *   RED  RED  NEAR_RED  WHITE WHITE
 *   RED  RED  NEAR_RED  WHITE WHITE
 *   WHITE WHITE WHITE   WHITE WHITE
 *   WHITE WHITE WHITE   WHITE WHITE
 *   WHITE WHITE WHITE   WHITE WHITE
 */
function makeGrid(): ImageData {
  const width = 5
  const height = 5
  const data = new Uint8ClampedArray(width * height * 4)

  const rows: RGBA[][] = [
    [RED, RED, NEAR_RED, WHITE, WHITE],
    [RED, RED, NEAR_RED, WHITE, WHITE],
    [WHITE, WHITE, WHITE, WHITE, WHITE],
    [WHITE, WHITE, WHITE, WHITE, WHITE],
    [WHITE, WHITE, WHITE, WHITE, WHITE],
  ]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b, a } = rows[y][x]
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }

  return { width, height, data } as ImageData
}

function pixelAt(imageData: ImageData, x: number, y: number): RGBA {
  const i = (y * imageData.width + x) * 4
  const d = imageData.data
  return { r: d[i], g: d[i + 1], b: d[i + 2], a: d[i + 3] }
}

describe('floodFill', () => {
  it('at tolerance 0, fills only exact-match contiguous pixels', () => {
    const grid = makeGrid()
    floodFill(grid, 0, 0, FILL, 0)

    expect(pixelAt(grid, 0, 0)).toEqual(FILL)
    expect(pixelAt(grid, 1, 0)).toEqual(FILL)
    expect(pixelAt(grid, 0, 1)).toEqual(FILL)
    expect(pixelAt(grid, 1, 1)).toEqual(FILL)

    // the slightly-different red and the white background are untouched
    expect(pixelAt(grid, 2, 0)).toEqual(NEAR_RED)
    expect(pixelAt(grid, 3, 0)).toEqual(WHITE)
    expect(pixelAt(grid, 2, 2)).toEqual(WHITE)
  })

  it('raising tolerance expands the fill to similar-but-not-identical colors', () => {
    const grid = makeGrid()
    floodFill(grid, 0, 0, FILL, 5)

    expect(pixelAt(grid, 0, 0)).toEqual(FILL)
    expect(pixelAt(grid, 2, 0)).toEqual(FILL)
    expect(pixelAt(grid, 2, 1)).toEqual(FILL)

    // white is still far outside a tolerance of 5
    expect(pixelAt(grid, 3, 0)).toEqual(WHITE)
    expect(pixelAt(grid, 0, 2)).toEqual(WHITE)
  })

  it('does not fill pixels outside the connected region even if their color matches', () => {
    const width = 3
    const height = 1
    // RED | WHITE | RED — the two red pixels are not contiguous
    const data = new Uint8ClampedArray([
      RED.r, RED.g, RED.b, RED.a,
      WHITE.r, WHITE.g, WHITE.b, WHITE.a,
      RED.r, RED.g, RED.b, RED.a,
    ])
    const grid = { width, height, data } as ImageData

    floodFill(grid, 0, 0, FILL, 0)

    expect(pixelAt(grid, 0, 0)).toEqual(FILL)
    expect(pixelAt(grid, 1, 0)).toEqual(WHITE)
    expect(pixelAt(grid, 2, 0)).toEqual(RED) // unreachable, untouched
  })

  it('is a no-op when starting outside the image bounds', () => {
    const grid = makeGrid()
    floodFill(grid, -1, -1, FILL, 100)
    expect(pixelAt(grid, 0, 0)).toEqual(RED)
  })

  it('terminates and fills correctly when the fill color is within tolerance of the seed color', () => {
    const grid = makeGrid()
    // FILL color chosen close to RED so tolerance comparisons against it would
    // also "match" if the algorithm didn't guard against re-matching filled pixels.
    const closeFill = { r: 205, g: 5, b: 5, a: 255 }
    floodFill(grid, 0, 0, closeFill, 10)

    expect(pixelAt(grid, 0, 0)).toEqual(closeFill)
    expect(pixelAt(grid, 1, 1)).toEqual(closeFill)
    expect(pixelAt(grid, 3, 0)).toEqual(WHITE)
  })
})

describe('floodFill with a selection mask', () => {
  it('does not spread past unselected pixels, even when they color-match', () => {
    const width = 5
    const height = 1
    const data = new Uint8ClampedArray(width * height * 4)
    for (let x = 0; x < width; x++) {
      const i = x * 4
      data[i] = RED.r
      data[i + 1] = RED.g
      data[i + 2] = RED.b
      data[i + 3] = RED.a
    }
    const grid = { width, height, data } as ImageData
    const mask = new Uint8Array([1, 1, 0, 1, 1]) // x=2 is an unselected "bridge"

    floodFill(grid, 0, 0, FILL, 0, mask)

    expect(pixelAt(grid, 0, 0)).toEqual(FILL)
    expect(pixelAt(grid, 1, 0)).toEqual(FILL)
    expect(pixelAt(grid, 2, 0)).toEqual(RED) // unselected bridge: untouched
    expect(pixelAt(grid, 3, 0)).toEqual(RED) // selected but unreachable without crossing the bridge
    expect(pixelAt(grid, 4, 0)).toEqual(RED)
  })

  it('is a no-op when the seed pixel itself is outside the mask', () => {
    const grid = makeGrid()
    floodFill(grid, 0, 0, FILL, 100, new Uint8Array(25))
    expect(pixelAt(grid, 0, 0)).toEqual(RED)
  })
})
