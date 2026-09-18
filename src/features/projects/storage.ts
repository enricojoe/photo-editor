import type { ProjectRecord, ProjectSummary } from './types'

const INDEX_KEY = 'photoeditor:projects'
const projectKey = (id: string) => `photoeditor:project:${id}`

// Conservative per-project size cap. Since images aren't downscaled on
// import, a single large image's data URL could alone exceed localStorage's
// ~5-10MB per-origin quota — this leaves headroom for the index and any
// other saved projects rather than relying solely on catching the write.
export const MAX_IMAGE_DATA_URL_LENGTH = 4 * 1024 * 1024

export type SaveProjectResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'too-large' | 'quota-exceeded'; message: string }

export interface SaveProjectInput {
  id?: string
  name: string
  width: number
  height: number
  imageDataUrl: string
  thumbnailDataUrl: string
}

function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  )
}

export function listProjects(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ProjectSummary[]) : []
  } catch {
    return []
  }
}

export function loadProjectRecord(id: string): ProjectRecord | null {
  try {
    const raw = localStorage.getItem(projectKey(id))
    return raw ? (JSON.parse(raw) as ProjectRecord) : null
  } catch {
    return null
  }
}

export function saveProject(input: SaveProjectInput): SaveProjectResult {
  if (input.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return {
      ok: false,
      reason: 'too-large',
      message:
        "This image is too large to save in browser storage. You can keep editing, but progress won't be saved until you use a smaller image or free up space by deleting old projects.",
    }
  }

  const id = input.id ?? crypto.randomUUID()
  const now = Date.now()
  const existing = loadProjectRecord(id)

  const record: ProjectRecord = {
    id,
    name: input.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    width: input.width,
    height: input.height,
    imageDataUrl: input.imageDataUrl,
  }

  try {
    localStorage.setItem(projectKey(id), JSON.stringify(record))

    const summary: ProjectSummary = {
      id,
      name: input.name,
      updatedAt: now,
      thumbnailDataUrl: input.thumbnailDataUrl,
    }
    const index = listProjects().filter((project) => project.id !== id)
    index.unshift(summary)
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))

    return { ok: true, id }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return {
        ok: false,
        reason: 'quota-exceeded',
        message: 'Not enough browser storage to save this project. Delete an old project or use a smaller image.',
      }
    }
    throw err
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id))
  const index = listProjects().filter((project) => project.id !== id)
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}
