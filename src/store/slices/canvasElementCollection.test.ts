import { describe, expect, it } from 'vitest'
import type { ShapeElement } from '../types'
import {
  createCanvasElementCollectionRuntime,
  rebuildElementIndexes,
  replaceElementCollection,
  synchronizeElementCollection,
  synchronizeElementReferences,
} from './canvasElementCollection'

function makeShape(id: string, x: number): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y: 0,
    w: 20,
    h: 20,
    color: '#000000',
    size: 2,
  }
}

describe('canvas element collection runtime', () => {
  it('replaces maps and the spatial index as one collection boundary', () => {
    const runtime = createCanvasElementCollectionRuntime()
    const elements = [makeShape('a', 0), makeShape('b', 100)]

    replaceElementCollection(runtime, elements)

    expect(runtime.idToElement.get('a')).toBe(elements[0])
    expect(runtime.idToIndex.get('b')).toBe(1)
    expect(runtime.spatialIndex.search({ x: 0, y: 0, w: 20, h: 20 })).toContain('a')
  })

  it('synchronizes removals, updates, and mirror maps', () => {
    const runtime = createCanvasElementCollectionRuntime()
    const mirror = {
      idToElement: new Map<string, ShapeElement>(),
      idToIndex: new Map<string, number>(),
    }
    const initial = [makeShape('a', 0), makeShape('b', 100)]
    replaceElementCollection(runtime, initial, mirror)

    const updated = [{ ...initial[1], x: 200 }]
    synchronizeElementCollection(runtime, updated, mirror)

    expect(runtime.idToElement.has('a')).toBe(false)
    expect(mirror.idToElement.get('b')).toBe(updated[0])
    expect(runtime.idToIndex.get('b')).toBe(0)
  })

  it('rebuilds position indexes without replacing element maps', () => {
    const runtime = createCanvasElementCollectionRuntime()
    const elements = [makeShape('a', 0), makeShape('b', 100)]
    replaceElementCollection(runtime, elements)

    rebuildElementIndexes(runtime, [elements[1], elements[0]])

    expect(runtime.idToElement.get('a')).toBe(elements[0])
    expect(runtime.idToIndex.get('a')).toBe(1)
    expect(runtime.idToIndex.get('b')).toBe(0)
  })

  it('updates element references without changing position indexes', () => {
    const runtime = createCanvasElementCollectionRuntime()
    const elements = [makeShape('a', 0), makeShape('b', 100)]
    replaceElementCollection(runtime, elements)
    const updated = { ...elements[0], locked: true }

    synchronizeElementReferences(runtime, [updated])

    expect(runtime.idToElement.get('a')).toBe(updated)
    expect(runtime.idToIndex.get('a')).toBe(0)
  })
})
