import { useRef } from 'react'
import { useImageFileLoader } from './useImageFileLoader'

/** Compact "load/replace image" control for the toolbar. */
export function LoadImageButton({ disabled = false }: { disabled?: boolean }) {
  const { loadFile, error } = useImageFileLoader()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>
        Load Image
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void loadFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {error && (
        <p role="alert" className="toolbar__error">
          {error}
        </p>
      )}
    </>
  )
}
