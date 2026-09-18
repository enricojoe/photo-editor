import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
} from 'react'
import type { EditorState, Selection, ToolName } from '../types'
import { transferSnapshot } from './historyStack'

type EditorAction =
  | { type: 'SET_ACTIVE_TOOL'; tool: ToolName }
  | { type: 'IMAGE_LOADED'; width: number; height: number }
  | { type: 'SET_SELECTION'; selection: Selection | null }
  | { type: 'SET_PICKED_COLOR'; color: string }

const initialState: EditorState = {
  activeTool: 'none',
  imageWidth: null,
  imageHeight: null,
  selection: null,
  pickedColor: null,
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool }
    case 'IMAGE_LOADED':
      return { ...state, imageWidth: action.width, imageHeight: action.height, selection: null }
    case 'SET_SELECTION':
      return { ...state, selection: action.selection }
    case 'SET_PICKED_COLOR':
      return { ...state, pickedColor: action.color }
    default:
      return state
  }
}

const EditorStateContext = createContext<EditorState | null>(null)
const EditorDispatchContext = createContext<Dispatch<EditorAction> | null>(null)

interface CanvasRefs {
  baseCanvasRef: RefObject<HTMLCanvasElement | null>
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
}

const CanvasRefsContext = createContext<CanvasRefs | null>(null)

export interface HistorySnapshot {
  width: number
  height: number
  imageData: ImageData
}

interface HistoryApi {
  canUndo: boolean
  canRedo: boolean
  pushSnapshot: () => void
  resetHistory: () => void
  undo: () => void
  redo: () => void
}

const HistoryContext = createContext<HistoryApi | null>(null)

/** Reads the current pixel contents of `canvas` into a restorable snapshot, or `null` if unavailable. */
function captureSnapshot(canvas: HTMLCanvasElement | null): HistorySnapshot | null {
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return null
  return { width: canvas.width, height: canvas.height, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) }
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Snapshot stacks live in refs, not state — ImageData buffers can be large
  // and pushing/popping them shouldn't itself trigger a re-render. After
  // every stack mutation we sync these two flags into state purely so
  // components reading canUndo/canRedo re-render when those flip; the refs
  // themselves are only ever read inside callbacks/effects, never render.
  const undoStackRef = useRef<HistorySnapshot[]>([])
  const redoStackRef = useRef<HistorySnapshot[]>([])
  const [historyFlags, setHistoryFlags] = useState({ canUndo: false, canRedo: false })

  const syncHistoryFlags = useCallback(() => {
    setHistoryFlags({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    })
  }, [])

  const pushSnapshot = useCallback(() => {
    const snapshot = captureSnapshot(baseCanvasRef.current)
    if (!snapshot) return
    undoStackRef.current.push(snapshot)
    redoStackRef.current = []
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const resetHistory = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const restoreSnapshot = useCallback((snapshot: HistorySnapshot) => {
    const canvas = baseCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    canvas.width = snapshot.width
    canvas.height = snapshot.height
    ctx.putImageData(snapshot.imageData, 0, 0)

    const overlay = overlayCanvasRef.current
    if (overlay) {
      overlay.width = snapshot.width
      overlay.height = snapshot.height
    }

    dispatch({ type: 'IMAGE_LOADED', width: snapshot.width, height: snapshot.height })
    dispatch({ type: 'SET_SELECTION', selection: null })
  }, [])

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const current = captureSnapshot(baseCanvasRef.current)
    const snapshot = transferSnapshot(undoStackRef.current, redoStackRef.current, current)
    if (snapshot) restoreSnapshot(snapshot)
    syncHistoryFlags()
  }, [syncHistoryFlags, restoreSnapshot])

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return
    const current = captureSnapshot(baseCanvasRef.current)
    const snapshot = transferSnapshot(redoStackRef.current, undoStackRef.current, current)
    if (snapshot) restoreSnapshot(snapshot)
    syncHistoryFlags()
  }, [syncHistoryFlags, restoreSnapshot])

  const historyApi = useMemo<HistoryApi>(
    () => ({
      canUndo: historyFlags.canUndo,
      canRedo: historyFlags.canRedo,
      pushSnapshot,
      resetHistory,
      undo,
      redo,
    }),
    [historyFlags, pushSnapshot, resetHistory, undo, redo],
  )

  return (
    <EditorStateContext.Provider value={state}>
      <EditorDispatchContext.Provider value={dispatch}>
        <CanvasRefsContext.Provider value={{ baseCanvasRef, overlayCanvasRef }}>
          <HistoryContext.Provider value={historyApi}>{children}</HistoryContext.Provider>
        </CanvasRefsContext.Provider>
      </EditorDispatchContext.Provider>
    </EditorStateContext.Provider>
  )
}

export function useEditorState() {
  const context = useContext(EditorStateContext)
  if (!context) throw new Error('useEditorState must be used within EditorProvider')
  return context
}

export function useEditorDispatch() {
  const context = useContext(EditorDispatchContext)
  if (!context) throw new Error('useEditorDispatch must be used within EditorProvider')
  return context
}

export function useCanvasRefs() {
  const context = useContext(CanvasRefsContext)
  if (!context) throw new Error('useCanvasRefs must be used within EditorProvider')
  return context
}

export function useHistory() {
  const context = useContext(HistoryContext)
  if (!context) throw new Error('useHistory must be used within EditorProvider')
  return context
}
