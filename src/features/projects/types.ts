export interface ProjectSummary {
  id: string
  name: string
  updatedAt: number
  thumbnailDataUrl: string
}

export interface ProjectRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  width: number
  height: number
  imageDataUrl: string
}
