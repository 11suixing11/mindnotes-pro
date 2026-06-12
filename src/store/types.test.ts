import { describe, it, expect } from 'vitest'
import type { StrokeElement, ShapeElement, TextElement, ImageElement } from './types'
import { elementBounds, moveElement, resizeElement } from './types'

describe('elementBounds', () => {
  it('should compute bounds for a stroke element', () => {
    const el: StrokeElement = {
      type: 'stroke',
      id: 's1',
      points: [
        [0, 0],
        [10, 20],
        [30, 5],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    }
    const b = elementBounds(el)
    expect(b.x).toBe(-5)
    expect(b.y).toBe(-5)
    expect(b.w).toBe(40)
    expect(b.h).toBe(30)
  })

  it('should compute bounds for a shape element with positive dimensions', () => {
    const el: ShapeElement = {
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    }
    const b = elementBounds(el)
    expect(b.x).toBe(5)
    expect(b.y).toBe(15)
    expect(b.w).toBe(110)
    expect(b.h).toBe(60)
  })

  it('should compute bounds for a shape element with negative dimensions', () => {
    const el: ShapeElement = {
      type: 'shape',
      id: 'sh2',
      kind: 'rectangle',
      x: 100,
      y: 100,
      w: -50,
      h: -30,
      color: '#000',
      size: 2,
    }
    const b = elementBounds(el)
    expect(b.x).toBe(45)
    expect(b.y).toBe(65)
    expect(b.w).toBe(60)
    expect(b.h).toBe(40)
  })

  it('should compute bounds for a text element', () => {
    const el: TextElement = {
      type: 'text',
      id: 't1',
      x: 50,
      y: 60,
      width: 200,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    }
    const b = elementBounds(el)
    expect(b.x).toBe(45)
    expect(b.y).toBe(55)
    expect(b.w).toBe(210)
    expect(b.h).toBe(40)
  })

  it('should compute bounds for an image element', () => {
    const el: ImageElement = {
      type: 'image',
      id: 'i1',
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      dataUrl: 'data:image/png;base64,abc',
    }
    const b = elementBounds(el)
    expect(b.x).toBe(5)
    expect(b.y).toBe(15)
    expect(b.w).toBe(310)
    expect(b.h).toBe(210)
  })
})

describe('moveElement', () => {
  it('should move a stroke element', () => {
    const el: StrokeElement = {
      type: 'stroke',
      id: 's1',
      points: [
        [0, 0],
        [10, 20],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    }
    const moved = moveElement(el, 5, 10) as StrokeElement
    expect(moved.points[0]).toEqual([5, 10])
    expect(moved.points[1]).toEqual([15, 30])
  })

  it('should move a shape element', () => {
    const el: ShapeElement = {
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    }
    const moved = moveElement(el, 5, 10) as ShapeElement
    expect(moved.x).toBe(15)
    expect(moved.y).toBe(30)
    expect(moved.w).toBe(100)
    expect(moved.h).toBe(50)
  })

  it('should move a text element', () => {
    const el: TextElement = {
      type: 'text',
      id: 't1',
      x: 50,
      y: 60,
      width: 200,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    }
    const moved = moveElement(el, -10, -20) as TextElement
    expect(moved.x).toBe(40)
    expect(moved.y).toBe(40)
  })

  it('should move an image element', () => {
    const el: ImageElement = {
      type: 'image',
      id: 'i1',
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      dataUrl: 'data:image/png;base64,abc',
    }
    const moved = moveElement(el, 5, 10) as ImageElement
    expect(moved.x).toBe(15)
    expect(moved.y).toBe(30)
  })
})

describe('resizeElement', () => {
  it('should resize a shape element', () => {
    const el: ShapeElement = {
      type: 'shape',
      id: 'sh1',
      kind: 'rectangle',
      x: 10,
      y: 10,
      w: 100,
      h: 50,
      color: '#000',
      size: 2,
    }
    const resized = resizeElement(el, 0, 0, 2, 2) as ShapeElement
    expect(resized.x).toBe(20)
    expect(resized.y).toBe(20)
    expect(resized.w).toBe(200)
    expect(resized.h).toBe(100)
  })

  it('should resize a text element', () => {
    const el: TextElement = {
      type: 'text',
      id: 't1',
      x: 50,
      y: 60,
      width: 200,
      height: 30,
      content: 'Hello',
      fontSize: 16,
      color: '#000',
    }
    const resized = resizeElement(el, 0, 0, 0.5, 0.5) as TextElement
    expect(resized.x).toBe(25)
    expect(resized.y).toBe(30)
    expect(resized.width).toBe(100)
    expect(resized.height).toBe(15)
  })

  it('should resize a stroke element by scaling points', () => {
    const el: StrokeElement = {
      type: 'stroke',
      id: 's1',
      points: [
        [10, 10],
        [20, 20],
      ],
      color: '#000',
      size: 2,
      brush: 'pen',
    }
    const resized = resizeElement(el, 0, 0, 2, 2) as StrokeElement
    expect(resized.points[0]).toEqual([20, 20])
    expect(resized.points[1]).toEqual([40, 40])
  })
})
