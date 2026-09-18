import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal'

export interface RemoveBackgroundResult {
  width: number
  height: number
}

export interface RemoveBackgroundOptions {
  onProgress?: (key: string, current: number, total: number) => void
}

/**
 * Runs client-side background removal on `canvas`'s current content and
 * replaces it in place with the resulting transparent-PNG result.
 */
export async function removeBackgroundFromCanvas(
  canvas: HTMLCanvasElement,
  options: RemoveBackgroundOptions = {},
): Promise<RemoveBackgroundResult> {
  const sourceBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to read the current image for background removal'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })

  const resultBlob = await imglyRemoveBackground(sourceBlob, {
    progress: options.onProgress,
  })

  const resultBitmap = await createImageBitmap(resultBlob)
  const width = resultBitmap.width
  const height = resultBitmap.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable')
  }

  canvas.width = width
  canvas.height = height
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(resultBitmap, 0, 0)
  resultBitmap.close()

  return { width, height }
}
