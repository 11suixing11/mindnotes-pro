import type { ShapeElement, ShapeKind } from '../store/types'

export interface Point {
  x: number
  y: number
}

export interface CreateShapeElementInput {
  id: string
  kind: ShapeKind
  start: Point
  color: string
  size: number
  fillColor: string
}

export function createShapeElement(input: CreateShapeElementInput): ShapeElement {
  const { id, kind, start, color, size, fillColor } = input

  return {
    type: 'shape',
    id,
    kind,
    x: start.x,
    y: start.y,
    w: 0,
    h: 0,
    color,
    size,
    fillColor: fillColor !== 'transparent' ? fillColor : undefined,
  }
}

export function updateShapeDraft(
  shape: ShapeElement,
  start: Point,
  current: Point,
  preserveSquare: boolean
): ShapeElement {
  let w = current.x - start.x
  let h = current.y - start.y

  if (preserveSquare && (shape.kind === 'rectangle' || shape.kind === 'circle')) {
    const size = Math.max(Math.abs(w), Math.abs(h))
    w = size * Math.sign(w || 1)
    h = size * Math.sign(h || 1)
  }

  return { ...shape, w, h }
}

export function shouldCommitShape(shape: ShapeElement, threshold = 2): boolean {
  return Math.abs(shape.w) > threshold || Math.abs(shape.h) > threshold
}
