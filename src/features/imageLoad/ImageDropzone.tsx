import { useRef, useState, type DragEvent } from 'react'
import { useImageFileLoader } from './useImageFileLoader'

export function ImageDropzone() {
  const { loadFile, error } = useImageFileLoader()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(false)
    void loadFile(event.dataTransfer.files[0])
  }

  return (
    <div
      className={`image-dropzone${isDraggingOver ? ' image-dropzone--active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDraggingOver(true)
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={onDrop}
    >
      <p>Drag and drop an image here, or</p>
      <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
        Choose an image
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
        <p role="alert" className="image-dropzone__error">
          {error}
        </p>
      )}
    </div>
  )
}
