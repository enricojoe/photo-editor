import type { Selection } from '../features/selection/selectionGeometry'

export type { Selection }

export type ToolName =
  | 'none'
  | 'crop'
  | 'selection'
  | 'bucketFill'
  | 'brush'
  | 'colorPicker'
  | 'backgroundRemoval'
  | 'colorAdjust'
  | 'watermark'

export interface EditorState {
  activeTool: ToolName
  imageWidth: number | null
  imageHeight: number | null
  selection: Selection | null
  pickedColor: string | null
}
