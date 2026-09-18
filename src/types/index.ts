import type { Selection } from '../features/selection/selectionGeometry'

export type { Selection }

export type ToolName = 'none' | 'crop' | 'selection' | 'bucketFill' | 'backgroundRemoval'

export interface EditorState {
  activeTool: ToolName
  imageWidth: number | null
  imageHeight: number | null
  selection: Selection | null
}
