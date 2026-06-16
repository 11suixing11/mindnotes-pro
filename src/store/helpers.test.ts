import { describe, it, expect } from 'vitest'
import { shallowClone, snapshot, applyMoveDelta, reverseMoveDelta } from './helpers'
import type { StrokeElement, ShapeElement, TextElement, ImageElement } from './types'

const makeStroke = (id: string, overrides?: Partial<StrokeElement>): StrokeElement => ({
  type: 'stroke',
  id,
  points: [
    [0, 0],
    [10, 10],
  ],
  color: '#000',
  size: 2,
  brush: 'pen',
  ...overrides,
})

const makeShape = (id: string, overrides?: Partial<ShapeElement>): ShapeElement => ({
  type: 'shape',
  id,
  kind: 'rectangle',
  x: 10,
  y: 20,
  w: 100,
  h: 50,
  color: '#000',
  size: 2,
  ...overrides,
})

const makeText = (id: string, overrides?: Partial<TextElement>): TextElement => ({
  type: 'text',
  id,
  x: 10,
  y: 20,
  width: 200,
  height: 30,
  content: 'hello',
  fontSize: 16,
  color: '#000',
  ...overrides,
})

const makeImage = (id: string, overrides?: Partial<ImageElement>): ImageElement => ({
  type: 'image',
  id,
  x: 10,
  y: 20,
  width: 200,
  height: 150,
  dataUrl: 'data:image/png;base64,abc',
  ...overrides,
})

describe('helpers', () => {
  describe('shallowClone', () => {
    it('deep-clones points array for strokes', () => {
      const original = makeStroke('s1')
      const cloned = shallowClone(original) as StrokeElement
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.points).not.toBe(original.points)
      expect(cloned.points[0]).not.toBe(original.points[0])
    })

    it('shallow clones non-stroke elements', () => {
      const original = makeShape('sh1')
      const cloned = shallowClone(original) as ShapeElement
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })

    it('clones text elements', () => {
      const original = makeText('t1')
      const cloned = shallowClone(original) as TextElement
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })

    it('clones image elements', () => {
      const original = makeImage('i1')
      const cloned = shallowClone(original) as ImageElement
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })
  })

  describe('snapshot', () => {
    it('clones an array of elements', () => {
      const els = [makeStroke('s1'), makeShape('sh1')]
      const snap = snapshot(els)
      expect(snap).toEqual(els)
      expect(snap).not.toBe(els)
      expect(snap[0]).not.toBe(els[0])
    })

    it('returns empty array for empty input', () => {
      expect(snapshot([])).toEqual([])
    })
  })

  describe('applyMoveDelta', () => {
    it('moves stroke points', () => {
      const stroke = makeStroke('s1', {
        points: [
          [10, 20],
          [30, 40],
        ],
      })
      const moved = applyMoveDelta(stroke, 5, 10) as StrokeElement
      expect(moved.points).toEqual([
        [15, 30],
        [35, 50],
      ])
    })

    it('moves shape position', () => {
      const shape = makeShape('sh1', { x: 10, y: 20 })
      const moved = applyMoveDelta(shape, 5, 10) as ShapeElement
      expect(moved.x).toBe(15)
      expect(moved.y).toBe(30)
    })

    it('moves text position', () => {
      const text = makeText('t1', { x: 10, y: 20 })
      const moved = applyMoveDelta(text, 5, 10) as TextElement
      expect(moved.x).toBe(15)
      expect(moved.y).toBe(30)
    })

    it('moves image position', () => {
      const image = makeImage('i1', { x: 10, y: 20 })
      const moved = applyMoveDelta(image, 5, 10) as ImageElement
      expect(moved.x).toBe(15)
      expect(moved.y).toBe(30)
    })
  })

  describe('reverseMoveDelta', () => {
    it('reverses stroke movement', () => {
      const stroke = makeStroke('s1', {
        points: [
          [15, 30],
          [35, 50],
        ],
      })
      const moved = reverseMoveDelta(stroke, 5, 10) as StrokeElement
      expect(moved.points).toEqual([
        [10, 20],
        [30, 40],
      ])
    })

    it('reverses shape movement', () => {
      const shape = makeShape('sh1', { x: 15, y: 30 })
      const moved = reverseMoveDelta(shape, 5, 10) as ShapeElement
      expect(moved.x).toBe(10)
      expect(moved.y).toBe(20)
    })

    it('roundtrips with applyMoveDelta', () => {
      const original = makeShape('sh1', { x: 10, y: 20 })
      const moved = applyMoveDelta(original, 5, 10)
      const reversed = reverseMoveDelta(moved, 5, 10)
      expect(reversed).toEqual(original)
    })
  })
})
