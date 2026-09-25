import { useEffect } from 'react'
import { useEditorState, useHistory } from '../state/EditorContext'
import type { ToolName } from '../types'

/** True for `<input>`, `<textarea>`, and other contenteditable elements — used to keep the
 *  undo/redo keyboard shortcuts from firing while the user is typing (e.g. in the crop
 *  custom-size fields, the project name field, or the bucket fill hex field). */
function isEditableElement(element: Element | null): boolean {
  if (!element) return false
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') return true
  return (element as HTMLElement).isContentEditable
}

/** Tools with a genuinely uncommitted in-progress edit or an in-flight async
 *  operation, where restoring a canvas snapshot underneath them would corrupt
 *  what's on screen. Every other tool (including Bucket Fill) commits each
 *  edit atomically with no pending state, so undo/redo is always safe there. */
const TOOLS_BLOCKING_HISTORY: ToolName[] = ['crop', 'resize', 'colorAdjust', 'backgroundRemoval', 'watermark']

export function HistoryControls() {
  const { activeTool } = useEditorState()
  const { canUndo, canRedo, undo, redo } = useHistory()
  const blocksHistory = TOOLS_BLOCKING_HISTORY.includes(activeTool)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      if (blocksHistory || isEditableElement(document.activeElement)) return

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
  }, [blocksHistory, canUndo, canRedo, undo, redo])

  return (
    <div className="history-controls">
      <button type="button" onClick={undo} disabled={!canUndo || blocksHistory} aria-label="Undo last edit">
        Undo
      </button>
      <button type="button" onClick={redo} disabled={!canRedo || blocksHistory} aria-label="Redo last undone edit">
        Redo
      </button>
    </div>
  )
}
