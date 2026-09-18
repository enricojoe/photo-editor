import { useState } from 'react'
import { useCanvasRefs, useEditorDispatch, useEditorState } from '../../state/EditorContext'
import { createThumbnailDataUrl, decodeDataUrlToCanvas } from '../../lib/canvasUtils'
import { deleteProject, listProjects, loadProjectRecord, saveProject } from './storage'
import type { ProjectSummary } from './types'

const THUMBNAIL_MAX_DIM = 150

export function ProjectManagerPanel() {
  const { imageWidth, imageHeight, activeTool } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const dispatch = useEditorDispatch()

  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectName, setProjectName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const hasImage = imageWidth !== null && imageHeight !== null
  const isToolActive = activeTool !== 'none'

  const handleToggleOpen = () => {
    setIsOpen((open) => {
      const next = !open
      if (next) setProjects(listProjects())
      return next
    })
  }

  const handleSave = () => {
    const canvas = baseCanvasRef.current
    if (!canvas) return

    const name = projectName.trim() || `Untitled ${new Date().toLocaleDateString()}`
    const imageDataUrl = canvas.toDataURL('image/png')
    const thumbnailDataUrl = createThumbnailDataUrl(canvas, THUMBNAIL_MAX_DIM)

    const result = saveProject({
      name,
      width: canvas.width,
      height: canvas.height,
      imageDataUrl,
      thumbnailDataUrl,
    })

    if (result.ok) {
      setMessage(`Saved "${name}".`)
      setProjectName('')
      setProjects(listProjects())
    } else {
      setMessage(result.message)
    }
  }

  const handleLoad = async (id: string) => {
    const record = loadProjectRecord(id)
    const canvas = baseCanvasRef.current
    if (!record || !canvas) return

    const { width, height } = await decodeDataUrlToCanvas(record.imageDataUrl, canvas)
    const overlay = overlayCanvasRef.current
    if (overlay) {
      overlay.width = width
      overlay.height = height
    }
    dispatch({ type: 'IMAGE_LOADED', width, height })
    setMessage(`Loaded "${record.name}".`)
    setIsOpen(false)
  }

  const handleDelete = (id: string) => {
    deleteProject(id)
    setProjects(listProjects())
  }

  return (
    <div className="project-manager">
      <button type="button" onClick={handleToggleOpen} disabled={isToolActive} aria-expanded={isOpen}>
        Projects
      </button>

      {isOpen && (
        <div className="project-manager__panel">
          <div className="project-manager__save">
            <label htmlFor="project-name-input" className="visually-hidden">
              Project name
            </label>
            <input
              id="project-name-input"
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              disabled={!hasImage}
            />
            <button type="button" className="btn-primary" onClick={handleSave} disabled={!hasImage}>
              Save
            </button>
          </div>

          {message && <p className="project-manager__message">{message}</p>}

          {projects.length === 0 ? (
            <p className="project-manager__empty">No saved projects yet.</p>
          ) : (
            <ul className="project-manager__list">
              {projects.map((project) => (
                <li key={project.id} className="project-manager__item">
                  <img src={project.thumbnailDataUrl} alt="" className="project-manager__thumb" />
                  <div className="project-manager__item-info">
                    <span>{project.name}</span>
                    <span className="project-manager__timestamp">
                      {new Date(project.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <button type="button" onClick={() => void handleLoad(project.id)} aria-label={`Load "${project.name}"`}>
                    Load
                  </button>
                  <button type="button" onClick={() => handleDelete(project.id)} aria-label={`Delete "${project.name}"`}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
