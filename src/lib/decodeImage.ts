/**
 * Decodes an image `File` into a drawable source, preferring `createImageBitmap`
 * and falling back to an `<img>` element for formats it doesn't support in every
 * browser (e.g. certain HEIC/SVG variants).
 */
export async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> decode below.
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
