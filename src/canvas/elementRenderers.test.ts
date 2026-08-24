import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShapeElement, TextElement } from '../store/types'
import { drawShapeEl, drawTextEl, invalidateElementRendererCaches } from './elementRenderers'

const OriginalPath2D = globalThis.Path2D
let pathCreations = 0

class MockPath2D {
  constructor() {
    pathCreations += 1
  }

  moveTo = vi.fn()
  lineTo = vi.fn()
  quadraticCurveTo = vi.fn()
  closePath = vi.fn()
  ellipse = vi.fn()
}

function createMockContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    roundRect: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
}

describe('element renderers', () => {
  beforeEach(() => {
    pathCreations = 0
    globalThis.Path2D = MockPath2D as unknown as typeof Path2D
    invalidateElementRendererCaches()
  })

  afterAll(() => {
    globalThis.Path2D = OriginalPath2D
  })

  it('reuses shape paths until renderer caches are invalidated', () => {
    const context = createMockContext()
    const shape: ShapeElement = {
      type: 'shape',
      id: 'shape-cache',
      kind: 'rectangle',
      x: 0,
      y: 0,
      w: 100,
      h: 50,
      color: '#000000',
      size: 2,
    }

    drawShapeEl(context, shape)
    drawShapeEl(context, shape)
    expect(pathCreations).toBe(1)

    invalidateElementRendererCaches()
    drawShapeEl(context, shape)
    expect(pathCreations).toBe(2)
  })

  it('remeasures same-length text after its content changes', () => {
    const context = createMockContext()
    const text: TextElement = {
      type: 'text',
      id: 'text-cache',
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      content: 'alpha',
      fontSize: 16,
      color: '#000000',
    }

    drawTextEl(context, text)
    const initialMeasureCount = vi.mocked(context.measureText).mock.calls.length
    drawTextEl(context, text)
    expect(context.measureText).toHaveBeenCalledTimes(initialMeasureCount)

    drawTextEl(context, { ...text, content: 'bravo' })
    expect(context.measureText).toHaveBeenCalledTimes(initialMeasureCount * 2)
  })
})
