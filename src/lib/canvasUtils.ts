export function createThumbnailDataUrl(source: HTMLCanvasElement, maxDim: number): string {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))

  const thumb = document.createElement('canvas')
  thumb.width = width
  thumb.height = height
  const ctx = thumb.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }
  ctx.drawImage(source, 0, 0, width, height)
  return thumb.toDataURL('image/png')
}

export function decodeDataUrlToCanvas(
  dataUrl: string,
  canvas: HTMLCanvasElement,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context is unavailable'))
        return
      }
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve({ width: canvas.width, height: canvas.height })
    }
    img.onerror = () => reject(new Error('Failed to decode saved project image'))
    img.src = dataUrl
  })
}
