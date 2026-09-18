const MIN_CURSOR_DIAMETER = 6
const MAX_CURSOR_DIAMETER = 120

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Builds a CSS `cursor` value showing the brush's on-screen footprint as a
 * circle — a black outline behind a white outline, the same two-tone
 * technique the Selection tool's marching-ants border uses, so it stays
 * visible against any underlying image color. `diameterCss` is clamped so
 * very small brushes stay visible and very large ones stay within what
 * browsers reliably support for custom cursors.
 */
export function buildBrushCursor(diameterCss: number): string {
  const diameter = Math.round(clamp(diameterCss, MIN_CURSOR_DIAMETER, MAX_CURSOR_DIAMETER))
  const size = diameter + 4 // padding so the outline strokes aren't clipped at the SVG edge
  const center = size / 2
  const radius = diameter / 2

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="black" stroke-width="2"/>` +
    `<circle cx="${center}" cy="${center}" r="${radius - 1}" fill="none" stroke="white" stroke-width="1"/>` +
    `</svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${center} ${center}, crosshair`
}
