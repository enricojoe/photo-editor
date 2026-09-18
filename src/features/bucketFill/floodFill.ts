import { colorDistance, type RGBA } from '../../lib/colorDistance'

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): RGBA {
  const i = (y * width + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] }
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: RGBA): void {
  const i = (y * width + x) * 4
  data[i] = color.r
  data[i + 1] = color.g
  data[i + 2] = color.b
  data[i + 3] = color.a
}

/**
 * Iterative scanline flood fill: fills the contiguous region of pixels
 * connected to (startX, startY) that are within `tolerance` (0-100) of the
 * seed pixel's original color, in place on `imageData`.
 *
 * A `filled` marker grid (rather than re-comparing against the fill color)
 * guarantees each pixel is only ever matched once, so this terminates even
 * when the fill color itself is within tolerance of the seed color.
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBA,
  tolerance: number,
  selectionMask?: Uint8Array,
): void {
  const { width, height, data } = imageData
  const x0 = Math.floor(startX)
  const y0 = Math.floor(startY)
  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return
  if (selectionMask && !selectionMask[y0 * width + x0]) return

  const targetColor = getPixel(data, width, x0, y0)
  const filled = new Uint8Array(width * height)

  const matches = (x: number, y: number) =>
    !filled[y * width + x] &&
    (!selectionMask || selectionMask[y * width + x] === 1) &&
    colorDistance(getPixel(data, width, x, y), targetColor) <= tolerance

  const stack: Array<[number, number]> = [[x0, y0]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    if (filled[y * width + x] || !matches(x, y)) continue

    let xLeft = x
    while (xLeft > 0 && matches(xLeft - 1, y)) xLeft--
    let xRight = x
    while (xRight < width - 1 && matches(xRight + 1, y)) xRight++

    let spanAbove = false
    let spanBelow = false

    for (let i = xLeft; i <= xRight; i++) {
      setPixel(data, width, i, y, fillColor)
      filled[y * width + i] = 1

      if (y > 0) {
        const aboveMatches = matches(i, y - 1)
        if (aboveMatches && !spanAbove) stack.push([i, y - 1])
        spanAbove = aboveMatches
      }

      if (y < height - 1) {
        const belowMatches = matches(i, y + 1)
        if (belowMatches && !spanBelow) stack.push([i, y + 1])
        spanBelow = belowMatches
      }
    }
  }
}
