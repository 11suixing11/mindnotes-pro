import { describe, expect, it } from 'vitest'
import {
  createShapeElement,
  shouldCommitShape,
  updateShapeDraft,
  type Point,
} from './shapeElements'
import type { ShapeElement } from '../store/types'

describe('shapeElements', () => {
  const start: Point = { x: 10, y: 20 }

  it('creates a shape draft at the start point', () => {
    expect(
      createShapeElement({
        id: 'shape-1',
        kind: 'rectangle',
        start,
        color: '#000',
        size: 4,
        fillColor: '#fff',
      })
    ).toEqual({
      type: 'shape',
      id: 'shape-1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      w: 0,
      h: 0,
      color: '#000',
      size: 4,
      fillColor: '#fff',
    })
  })

  it('omits transparent fill colors from shape drafts', () => {
    expect(
      createShapeElement({
        id: 'shape-1',
        kind: 'circle',
        start,
        color: '#000',
        size: 4,
        fillColor: 'transparent',
      }).fillColor
    ).toBeUndefined()
  })

  it('updates a draft from the start point to the current point', () => {
    const shape = createShapeElement({
      id: 'shape-1',
      kind: 'line',
      start,
      color: '#000',
      size: 4,
      fillColor: 'transparent',
    })

    expect(updateShapeDraft(shape, start, { x: 35, y: 5 }, false)).toMatchObject({
      w: 25,
      h: -15,
    })
  })

  it('preserves square dimensions for rectangles and circles when requested', () => {
    const rectangle = createShapeElement({
      id: 'shape-1',
      kind: 'rectangle',
      start,
      color: '#000',
      size: 4,
      fillColor: 'transparent',
    })
    const circle = { ...rectangle, kind: 'circle' as const }

    expect(updateShapeDraft(rectangle, start, { x: 25, y: 50 }, true)).toMatchObject({
      w: 30,
      h: 30,
    })
    expect(updateShapeDraft(circle, start, { x: -5, y: 50 }, true)).toMatchObject({
      w: -30,
      h: 30,
    })
  })

  it('does not force square dimensions for lines and arrows', () => {
    const arrow = createShapeElement({
      id: 'shape-1',
      kind: 'arrow',
      start,
      color: '#000',
      size: 4,
      fillColor: 'transparent',
    })

    expect(updateShapeDraft(arrow, start, { x: 25, y: 50 }, true)).toMatchObject({
      w: 15,
      h: 30,
    })
  })

  it('uses the same minimum size threshold before committing shapes', () => {
    const smallShape: ShapeElement = {
      type: 'shape',
      id: 'small',
      kind: 'rectangle',
      x: 0,
      y: 0,
      w: 2,
      h: -2,
      color: '#000',
      size: 4,
    }
    const wideShape = { ...smallShape, w: 3 }
    const tallShape = { ...smallShape, h: -3 }

    expect(shouldCommitShape(smallShape)).toBe(false)
    expect(shouldCommitShape(wideShape)).toBe(true)
    expect(shouldCommitShape(tallShape)).toBe(true)
  })
})
