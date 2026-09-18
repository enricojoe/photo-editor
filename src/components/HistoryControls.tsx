import { useEffect } from 'react'
import { useEditorState, useHistory } from '../state/EditorContext'

/** True for `<input>`, `<textarea>`, and other contenteditable elements — used to keep the
 *  undo/redo keyboard shortcuts from firing while the user is typing (e.g. in the crop
 *  custom-size fields, the project name field, or the bucket fill hex field). */
function isEditableElement(element: Element | null): boolean {
  if (!element) return false
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') return true
  return (element as HTMLElement).isContentEditable
}

export function HistoryControls() {
  const { activeTool } = useEditorState()
  const { canUndo, canRedo, undo, redo } = useHistory()
  const isToolActive = activeTool !== 'none'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      if (isToolActive || isEditableElement(document.activeElement)) return

      if (event.shiftKey) {
        if (!canRedo) return
        event.preventDefault()
        redo()
      } else {
        if (!canUndo) return
        event.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isToolActive, canUndo, canRedo, undo, redo])

  return (
    <div className="history-controls">
      <button type="button" onClick={undo} disabled={!canUndo || isToolActive} aria-label="Undo last edit">
        Undo
      </button>
      <button type="button" onClick={redo} disabled={!canRedo || isToolActive} aria-label="Redo last undone edit">
        Redo
      </button>
    </div>
  )
}
