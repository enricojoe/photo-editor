export const MIN_RESIZE_SIZE = 1
// Browsers silently fail to allocate canvases much beyond this, leaving a blank image.
export const MAX_RESIZE_SIZE = 8192

export interface ResizeDimensions {
  width: number
  height: number
}

/** Raw (still-as-typed) input values, so empty / half-typed fields can be handled here. */
export type ResizeRequest =
  | { mode: 'pixels'; width: string; height: string }
  | { mode: 'percent'; percent: string }

function roundToPixels(value: number): number {
  return Math.max(MIN_RESIZE_SIZE, Math.round(value))
}

/** Parses input text as a positive finite number, or `null` if it is empty, non-numeric, or <= 0. */
export function parsePositiveNumber(text: string): number | null {
  if (text.trim() === '') return null
  const value = Number(text)
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * The length on one axis that keeps the source's aspect ratio, given the length
 * on the other axis. Always derived from the untouched source lengths (never
 * from a previously rounded value) so repeated edits can't drift.
 */
export function proportionalLength(length: number, fromSourceLength: number, toSourceLength: number): number {
  return roundToPixels((length * toSourceLength) / fromSourceLength)
}

export function scaledDimensions(percent: number, source: ResizeDimensions): ResizeDimensions {
  const factor = percent / 100
  return { width: roundToPixels(source.width * factor), height: roundToPixels(source.height * factor) }
}

/**
 * The pixel size a resize request would produce, or `null` if any field it
 * needs is empty / non-numeric / not positive. Deliberately not clamped to
 * `MAX_RESIZE_SIZE`, so callers can tell "invalid" apart from "too large".
 */
export function resolveResizeTarget(request: ResizeRequest, source: ResizeDimensions): ResizeDimensions | null {
  if (request.mode === 'percent') {
    const percent = parsePositiveNumber(request.percent)
    return percent === null ? null : scaledDimensions(percent, source)
  }

  const width = parsePositiveNumber(request.width)
  const height = parsePositiveNumber(request.height)
  if (width === null || height === null) return null
  return { width: roundToPixels(width), height: roundToPixels(height) }
}

export function exceedsMaxSize(dimensions: ResizeDimensions): boolean {
  return dimensions.width > MAX_RESIZE_SIZE || dimensions.height > MAX_RESIZE_SIZE
}
