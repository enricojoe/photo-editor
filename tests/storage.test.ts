import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_IMAGE_DATA_URL_LENGTH,
  deleteProject,
  listProjects,
  loadProjectRecord,
  saveProject,
} from '../src/features/projects/storage'

class MockStorage implements Storage {
  private store = new Map<string, string>()
  private quotaLimit: number | null = null

  setQuotaLimit(bytes: number | null): void {
    this.quotaLimit = bytes
  }

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    if (this.quotaLimit !== null) {
      const currentSize = Array.from(this.store.values()).reduce((sum, v) => sum + v.length, 0)
      const existing = this.store.get(key)?.length ?? 0
      const projected = currentSize - existing + value.length
      if (projected > this.quotaLimit) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }
    }
    this.store.set(key, value)
  }
}

let mockStorage: MockStorage

beforeEach(() => {
  mockStorage = new MockStorage()
  vi.stubGlobal('localStorage', mockStorage)
})

describe('saveProject / listProjects / loadProjectRecord', () => {
  it('saves a project, lists it in the index, and can load its full record', () => {
    const result = saveProject({
      name: 'Test',
      width: 10,
      height: 10,
      imageDataUrl: 'data:image/png;base64,AAA',
      thumbnailDataUrl: 'data:image/png;base64,thumb',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const list = listProjects()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: result.id, name: 'Test' })

    const record = loadProjectRecord(result.id)
    expect(record).toMatchObject({ id: result.id, name: 'Test', width: 10, height: 10 })
  })

  it('rejects an image data URL over the size threshold without touching storage', () => {
    const hugeDataUrl = 'a'.repeat(MAX_IMAGE_DATA_URL_LENGTH + 1)
    const result = saveProject({
      name: 'Huge',
      width: 10,
      height: 10,
      imageDataUrl: hugeDataUrl,
      thumbnailDataUrl: 'thumb',
    })

    expect(result).toMatchObject({ ok: false, reason: 'too-large' })
    expect(listProjects()).toHaveLength(0)
  })

  it('surfaces a quota-exceeded error instead of throwing', () => {
    mockStorage.setQuotaLimit(50) // tiny quota to force a real overflow
    const result = saveProject({
      name: 'Test',
      width: 10,
      height: 10,
      imageDataUrl: 'data:image/png;base64,AAAA',
      thumbnailDataUrl: 'thumb',
    })

    expect(result).toMatchObject({ ok: false, reason: 'quota-exceeded' })
  })

  it('updates an existing project in place, preserving createdAt', () => {
    const first = saveProject({
      name: 'V1',
      width: 10,
      height: 10,
      imageDataUrl: 'data:a',
      thumbnailDataUrl: 't',
    })
    if (!first.ok) throw new Error('expected save to succeed')
    const firstRecord = loadProjectRecord(first.id)!

    const second = saveProject({
      id: first.id,
      name: 'V2',
      width: 20,
      height: 20,
      imageDataUrl: 'data:b',
      thumbnailDataUrl: 't2',
    })
    expect(second).toMatchObject({ ok: true, id: first.id })
    expect(listProjects()).toHaveLength(1)

    const updatedRecord = loadProjectRecord(first.id)!
    expect(updatedRecord.name).toBe('V2')
    expect(updatedRecord.createdAt).toBe(firstRecord.createdAt)
  })
})

describe('deleteProject', () => {
  it('removes the project record and its index entry', () => {
    const result = saveProject({
      name: 'ToDelete',
      width: 1,
      height: 1,
      imageDataUrl: 'data:a',
      thumbnailDataUrl: 't',
    })
    if (!result.ok) throw new Error('expected save to succeed')

    deleteProject(result.id)

    expect(listProjects()).toHaveLength(0)
    expect(loadProjectRecord(result.id)).toBeNull()
  })
})
