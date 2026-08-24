import { describe, expect, it } from 'vitest'
import type { CanvasElement, ShapeElement } from '../../store/types'
import { synchronizeElementBoundsCache } from './useCanvasRendererLifecycle'

function createShape(id: string, x = 0): ShapeElement {
  return {
    type: 'shape',
    id,
    kind: 'rectangle',
    x,
    y: 0,
    w: 100,
    h: 50,
    color: '#000000',
    size: 2,
  }
}

describe('synchronizeElementBoundsCache', () => {
  it('preserves cached bounds when the element reference is unchanged', () => {
    const element = createShape('stable')
    const previousReferences = new Map<string, CanvasElement>([['stable', element]])
    const cachedBounds = { x: 0, y: 0, w: 100, h: 50 }
    const boundsCache = new Map([['stable', cachedBounds]])

    const currentIds = synchronizeElementBoundsCache(
      [element],
      previousReferences,
      new Set(['stable']),
      boundsCache
    )

    expect(boundsCache.get('stable')).toBe(cachedBounds)
    expect(previousReferences.get('stable')).toBe(element)
    expect(currentIds).toEqual(new Set(['stable']))
  })

  it('invalidates only the cached bounds for changed element references', () => {
    const stableElement = createShape('stable')
    const previousChangedElement = createShape('changed')
    const changedElement = createShape('changed', 20)
    const previousReferences = new Map<string, CanvasElement>([
      ['stable', stableElement],
      ['changed', previousChangedElement],
    ])
    const stableBounds = { x: 0, y: 0, w: 100, h: 50 }
    const boundsCache = new Map([
      ['stable', stableBounds],
      ['changed', { x: 0, y: 0, w: 100, h: 50 }],
    ])

    synchronizeElementBoundsCache(
      [stableElement, changedElement],
      previousReferences,
      new Set(['stable', 'changed']),
      boundsCache
    )

    expect(boundsCache.get('stable')).toBe(stableBounds)
    expect(boundsCache.has('changed')).toBe(false)
    expect(previousReferences.get('changed')).toBe(changedElement)
  })

  it('removes cached bounds and references for deleted elements', () => {
    const remainingElement = createShape('remaining')
    const deletedElement = createShape('deleted')
    const previousReferences = new Map<string, CanvasElement>([
      ['remaining', remainingElement],
      ['deleted', deletedElement],
    ])
    const remainingBounds = { x: 0, y: 0, w: 100, h: 50 }
    const boundsCache = new Map([
      ['remaining', remainingBounds],
      ['deleted', { x: 10, y: 10, w: 100, h: 50 }],
    ])

    const currentIds = synchronizeElementBoundsCache(
      [remainingElement],
      previousReferences,
      new Set(['remaining', 'deleted']),
      boundsCache
    )

    expect(boundsCache.get('remaining')).toBe(remainingBounds)
    expect(boundsCache.has('deleted')).toBe(false)
    expect(previousReferences.has('deleted')).toBe(false)
    expect(currentIds).toEqual(new Set(['remaining']))
  })
})
