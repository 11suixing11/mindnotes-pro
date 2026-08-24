import { describe, expect, it, vi } from 'vitest'
import type { ShapeElement } from '../types'
import { rebuildDocumentRuntimeIndexes } from './documentRuntimeIndexes'

function shape(id: string): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    color: '#111827',
    size: 2,
  }
}

describe('document runtime indexes', () => {
  it('rebuilds maps and the spatial index from document elements', () => {
    const first = shape('first')
    const second = shape('second')
    const idToElement = new Map([['stale', first]])
    const idToIndex = new Map([['stale', 99]])
    const bulkLoad = vi.fn()

    rebuildDocumentRuntimeIndexes({ idToElement, idToIndex, spatialIndex: { bulkLoad } }, [
      first,
      second,
    ])

    expect(idToElement).toEqual(
      new Map([
        ['first', first],
        ['second', second],
      ])
    )
    expect(idToIndex).toEqual(
      new Map([
        ['first', 0],
        ['second', 1],
      ])
    )
    expect(bulkLoad).toHaveBeenCalledWith([first, second])
  })

  it('supports partial runtime state and an empty document', () => {
    expect(() => rebuildDocumentRuntimeIndexes({}, [])).not.toThrow()
  })
})
