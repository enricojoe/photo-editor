import { MIN_RECT_SIZE, clampPoint, normalizeRect } from '../canvas/rectGeometry'

export { clampPoint, normalizeRect }

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const MIN_CROP_SIZE = MIN_RECT_SIZE
const HANDLE_HIT_RADIUS = 10
const CORNER_HANDLE_HIT_RADIUS = 16

export const HANDLE_EDGES: Record<
  CropHandle,
  { left?: true; right?: true; top?: true; bottom?: true }
> = {
  nw: { left: true, top: true },
  n: { top: true },
  ne: { right: true, top: true },
  e: { right: true },
  se: { right: true, bottom: true },
  s: { bottom: true },
  sw: { left: true, bottom: true },
  w: { left: true },
}

export const CORNER_HANDLES: CropHandle[] = ['nw', 'ne', 'se', 'sw']

export function defaultCropRect(imageWidth: number, imageHeight: number): CropRect {
  const width = Math.max(MIN_CROP_SIZE, Math.round(imageWidth * 0.8))
  const height = Math.max(MIN_CROP_SIZE, Math.round(imageHeight * 0.8))
  return {
    x: Math.round((imageWidth - width) / 2),
    y: Math.round((imageHeight - height) / 2),
    width,
    height,
  }
}

export function customSizedRect(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const clampedWidth = Math.min(Math.max(Math.round(width), MIN_CROP_SIZE), imageWidth)
  const clampedHeight = Math.min(Math.max(Math.round(height), MIN_CROP_SIZE), imageHeight)
  return {
    x: Math.round((imageWidth - clampedWidth) / 2),
    y: Math.round((imageHeight - clampedHeight) / 2),
    width: clampedWidth,
    height: clampedHeight,
  }
}

export function handlePositions(rect: CropRect): Record<CropHandle, { x: number; y: number }> {
  const { x, y, width, height } = rect
  return {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
  }
}

// Corners take priority over edges when hit zones overlap on small rects.
const HANDLE_HIT_PRIORITY: CropHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']

/**
 * `scale` is buffer pixels per CSS pixel (see `getCanvasScale`) — it keeps
 * the hit zone a consistent on-screen size regardless of image resolution.
 */
export function hitTestHandle(
  point: { x: number; y: number },
  rect: CropRect,
  scale: number = 1,
): CropHandle | null {
  const positions = handlePositions(rect)
  for (const handle of HANDLE_HIT_PRIORITY) {
    const pos = positions[handle]
    const radius = (CORNER_HANDLES.includes(handle) ? CORNER_HANDLE_HIT_RADIUS : HANDLE_HIT_RADIUS) * scale
    if (Math.abs(point.x - pos.x) <= radius && Math.abs(point.y - pos.y) <= radius) {
      return handle
    }
  }
  return null
}

export function isInsideRect(point: { x: number; y: number }, rect: CropRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

/** "Contains" a (boxW, boxH) box at `ratio`, i.e. the largest rect of that ratio fitting inside it. */
function fitWithinRatio(boxW: number, boxH: number, ratio: number): { width: number; height: number } {
  if (boxW > boxH * ratio) return { width: boxH * ratio, height: boxH }
  return { width: boxW, height: boxW / ratio }
}

/** The smallest rect at `ratio` whose both dimensions are at least MIN_CROP_SIZE. */
function minRectForRatio(ratio: number): { width: number; height: number } {
  const height = ratio >= 1 ? MIN_CROP_SIZE : MIN_CROP_SIZE / ratio
  return { width: height * ratio, height }
}

/**
 * Builds a rect anchored at (anchorX, anchorY) and extending toward
 * (pointerX, pointerY), constrained to `ratio` (width / height). Used for
 * aspect-locked corner-resize and draw-new. Always stays within image
 * bounds since the anchor and pointer are themselves always in-bounds.
 */
export function aspectConstrainedRect(
  anchorX: number,
  anchorY: number,
  pointerX: number,
  pointerY: number,
  ratio: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const signX = pointerX >= anchorX ? 1 : -1
  const signY = pointerY >= anchorY ? 1 : -1
  const rawW = Math.abs(pointerX - anchorX)
  const rawH = Math.abs(pointerY - anchorY)

  let { width, height } = fitWithinRatio(rawW, rawH, ratio)

  const floor = minRectForRatio(ratio)
  if (width < floor.width) {
    ;({ width, height } = floor)
  }

  // The MIN_CROP_SIZE bump above can overshoot the room actually available
  // near an image edge — re-contain against the true max to stay in bounds.
  const maxW = signX > 0 ? imageWidth - anchorX : anchorX
  const maxH = signY > 0 ? imageHeight - anchorY : anchorY
  if (width > maxW || height > maxH) {
    ;({ width, height } = fitWithinRatio(maxW, maxH, ratio))
  }

  const x = signX > 0 ? anchorX : anchorX - width
  const y = signY > 0 ? anchorY : anchorY - height
  return { x, y, width, height }
}

/**
 * Reshapes an existing rect to `ratio`, keeping its center fixed and
 * shrinking to fit the image bounds if necessary. Used when the user
 * switches aspect-ratio presets mid-crop.
 */
export function applyAspectToExistingRect(
  rect: CropRect,
  ratio: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const cap = fitWithinRatio(imageWidth, imageHeight, ratio)
  let width = Math.min(rect.width, cap.width)
  let height = width / ratio

  const floor = minRectForRatio(ratio)
  if (width < floor.width) {
    ;({ width, height } = floor)
  }

  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const x = Math.min(Math.max(cx - width / 2, 0), Math.max(0, imageWidth - width))
  const y = Math.min(Math.max(cy - height / 2, 0), Math.max(0, imageHeight - height))

  return { x, y, width, height }
}
