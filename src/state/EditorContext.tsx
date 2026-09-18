import { createContext, useContext, useReducer, useRef, type Dispatch, type ReactNode, type RefObject } from 'react'
import type { EditorState, Selection, ToolName } from '../types'

type EditorAction =
  | { type: 'SET_ACTIVE_TOOL'; tool: ToolName }
  | { type: 'IMAGE_LOADED'; width: number; height: number }
  | { type: 'SET_SELECTION'; selection: Selection | null }

const initialState: EditorState = {
  activeTool: 'none',
  imageWidth: null,
  imageHeight: null,
  selection: null,
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool }
    case 'IMAGE_LOADED':
      return { ...state, imageWidth: action.width, imageHeight: action.height, selection: null }
    case 'SET_SELECTION':
      return { ...state, selection: action.selection }
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

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  return (
    <EditorStateContext.Provider value={state}>
      <EditorDispatchContext.Provider value={dispatch}>
        <CanvasRefsContext.Provider value={{ baseCanvasRef, overlayCanvasRef }}>
          {children}
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
