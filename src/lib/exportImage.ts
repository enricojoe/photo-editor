export type ExportFormat = 'png' | 'jpg' | 'jpeg' | 'webp'

interface FormatMeta {
  mime: string
  extension: string
  supportsQuality: boolean
}

const FORMAT_CONFIG: Record<ExportFormat, FormatMeta> = {
  png: { mime: 'image/png', extension: 'png', supportsQuality: false },
  jpg: { mime: 'image/jpeg', extension: 'jpg', supportsQuality: true },
  jpeg: { mime: 'image/jpeg', extension: 'jpeg', supportsQuality: true },
  webp: { mime: 'image/webp', extension: 'webp', supportsQuality: true },
}

export const DEFAULT_QUALITY_PERCENT = 92

export function formatExtension(format: ExportFormat): string {
  return FORMAT_CONFIG[format].extension
}

export function formatSupportsQuality(format: ExportFormat): boolean {
  return FORMAT_CONFIG[format].supportsQuality
}

export function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat,
  qualityPercent: number = DEFAULT_QUALITY_PERCENT,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { mime, supportsQuality } = FORMAT_CONFIG[format]
    // JPEG has no alpha channel; flatten onto white first so transparent
    // areas (e.g. after background removal) don't turn black.
    const source = mime === 'image/jpeg' ? flattenOnWhite(canvas) : canvas
    const quality = supportsQuality ? qualityPercent / 100 : undefined

    source.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export image'))
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        resolve()
      },
      mime,
      quality,
    )
  })
}

function flattenOnWhite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const flat = document.createElement('canvas')
  flat.width = canvas.width
  flat.height = canvas.height
  const ctx = flat.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, flat.width, flat.height)
  ctx.drawImage(canvas, 0, 0)
  return flat
}

export function defaultExportBaseName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `photo-edit-${timestamp}`
}

export function sanitizeFilename(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/[\\/]/g, '-')
  return cleaned.length > 0 ? cleaned : fallback
}

export function buildExportFilename(baseName: string, format: ExportFormat): string {
  return `${baseName}.${formatExtension(format)}`
}
