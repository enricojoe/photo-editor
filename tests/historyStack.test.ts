import { describe, expect, it } from 'vitest'
import { transferSnapshot } from '../src/state/historyStack'

describe('transferSnapshot', () => {
  it('pushes the current value onto destination and pops the last source value', () => {
    const source = ['a', 'b', 'c']
    const destination = ['x']

    const result = transferSnapshot(source, destination, 'current')

    expect(result).toBe('c')
    expect(source).toEqual(['a', 'b'])
    expect(destination).toEqual(['x', 'current'])
  })

  it('does not push onto destination when current is null', () => {
    const source = ['a']
    const destination: string[] = []

    const result = transferSnapshot(source, destination, null)

    expect(result).toBe('a')
    expect(source).toEqual([])
    expect(destination).toEqual([])
  })

  it('is a no-op and returns undefined when source is empty', () => {
    const source: string[] = []
    const destination = ['x']

    const result = transferSnapshot(source, destination, 'current')

    expect(result).toBeUndefined()
    expect(source).toEqual([])
    expect(destination).toEqual(['x']) // untouched — caller's empty-stack guard should skip the call entirely
  })
})
