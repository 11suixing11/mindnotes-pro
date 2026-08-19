import { describe, expect, it } from 'vitest'
import type { CanvasElement, ShapeElement } from '../core/model'
import {
  createResizeHistorySnapshot,
  createRotationHistorySnapshot,
  filterExistingSelectionIds,
  getDragHistoryDetails,
  getRestoreSessionState,
  hasSessionGeometryChanges,
  type DragSession,
  type ResizeSession,
  type RotateSession,
} from './pointerSession'

const shape = (id: string, x: number, rotation?: number): ShapeElement => ({
  type: 'shape',
  id,
  kind: 'rectangle',
  x,
  y: 20,
  w: 40,
  h: 30,
  color: '#000',
  size: 2,
  rotation,
})

describe('pointer session helpers', () => {
  it('resolves cancellation snapshots and filters stale selection ids', () => {
    const drag: DragSession = {
      x: 0,
      y: 0,
      id: 'a',
      dragStarted: false,
      startScreenX: 0,
      startScreenY: 0,
      startSelectedIds: ['a', 'missing'],
      startElementsSnapshot: [shape('a', 10)],
    }
    const resize: ResizeSession = {
      handle: 7,
      id: 'a',
      startX: 0,
      startY: 0,
      origBounds: { x: 0, y: 0, w: 10, h: 10 },
      origElement: shape('a', 10),
      startElementsSnapshot: [shape('a', 20)],
      startSelectedIds: ['a'],
    }
    const rotate: RotateSession = {
      ids: ['a'],
      startX: 0,
      startY: 0,
      origRotations: new Map([['a', 0]]),
      commonCenterX: 0,
      commonCenterY: 0,
      startElementsSnapshot: [shape('a', 30)],
      startSelectedIds: ['a'],
    }

    expect(getRestoreSessionState(drag, resize, rotate)).toEqual({
      snapshot: [shape('a', 10)],
      selectedIds: ['a', 'missing'],
    })
    expect(filterExistingSelectionIds(['a', 'missing'], [shape('a', 10)])).toEqual(['a'])
    expect(hasSessionGeometryChanges([shape('a', 10)], [shape('a', 10)])).toBe(false)
    expect(hasSessionGeometryChanges([shape('a', 10)], [shape('a', 15)])).toBe(true)
  })

  it('returns drag history details only when geometry changed', () => {
    const before = [shape('a', 10), shape('b', 20)]
    expect(getDragHistoryDetails(before, before, new Map([['a', { x: 10, y: 20 }]]))).toBeNull()

    expect(
      getDragHistoryDetails(
        before,
        [shape('a', 15), shape('b', 20)],
        new Map([['a', { x: 10, y: 20 }]])
      )
    ).toEqual({ affectedIds: ['a'], label: 'Move element' })

    expect(
      getDragHistoryDetails(
        before,
        [shape('a', 15), shape('b', 25)],
        new Map([
          ['a', { x: 10, y: 20 }],
          ['b', { x: 20, y: 20 }],
        ])
      )
    ).toEqual({ affectedIds: ['a', 'b'], label: 'Move 2 elements' })
  })

  it('creates resize and rotation snapshots without mutating current elements', () => {
    const elements: CanvasElement[] = [shape('a', 20, Math.PI / 2), shape('b', 40, 0)]
    const resized = createResizeHistorySnapshot(elements, 'a', shape('a', 10, 0))
    expect(resized).toEqual([shape('a', 10, 0), shape('b', 40, 0)])
    expect(elements[0]).toEqual(shape('a', 20, Math.PI / 2))

    const rotated = createRotationHistorySnapshot(elements, ['a'], new Map([['a', Math.PI / 4]]))
    expect(rotated).toEqual([shape('a', 20, Math.PI / 4), shape('b', 40, 0)])
    expect(elements[0]).toEqual(shape('a', 20, Math.PI / 2))
  })
})
