export interface LoadedImageSize {
  width: number
  height: number
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Some formats (e.g. certain HEIC/SVG variants) aren't supported by
      // createImageBitmap in every browser — fall back to an <img> decode.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not decode this image file'))
      img.src = objectUrl
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Decodes an image file and draws it into `canvas` at the image's original
 * resolution (no downscaling — large-image handling happens at save time).
 */
export async function loadImageFileToCanvas(
  file: File,
  canvas: HTMLCanvasElement,
): Promise<LoadedImageSize> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image')
  }

  const source = await decodeImage(file)
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  canvas.width = width
  canvas.height = height
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0)

  if (source instanceof ImageBitmap) {
    source.close()
  }

  return { width, height }
}
