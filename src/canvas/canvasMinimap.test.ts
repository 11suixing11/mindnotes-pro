import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShapeElement } from '../store/types'
import { drawElementMinimap, drawMinimap, resetCanvasMinimapCaches } from './canvasMinimap'

function createMockContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D
}

const element: ShapeElement = {
  type: 'shape',
  id: 'shape-1',
  kind: 'rectangle',
  x: 10,
  y: 20,
  w: 40,
  h: 30,
  color: '#000000',
  size: 2,
}

describe('canvas minimap rendering', () => {
  beforeEach(() => {
    resetCanvasMinimapCaches()
  })

  it('renders element bounds as lightweight minimap rectangles', () => {
    const context = createMockContext()

    drawElementMinimap(context, element, false, { x: 2, y: 3, w: 4, h: 5 })

    expect(context.fillRect).toHaveBeenCalledWith(2, 3, 4, 5)
  })

  it('draws the viewport and reuses aggregate bounds until invalidated', () => {
    const context = createMockContext()
    const cachedBounds = vi.fn().mockReturnValue({ x: 10, y: 20, w: 40, h: 30 })
    const viewBox = { x: 0, y: 0, zoom: 1 }
    const canvasSize = { w: 320, h: 240 }

    drawMinimap(context, [element], cachedBounds, viewBox, canvasSize, false)
    drawMinimap(context, [element], cachedBounds, viewBox, canvasSize, false)
    expect(context.stroke).toHaveBeenCalledTimes(2)
    expect(cachedBounds).toHaveBeenCalledTimes(3)

    resetCanvasMinimapCaches()
    drawMinimap(context, [element], cachedBounds, viewBox, canvasSize, false)
    expect(cachedBounds).toHaveBeenCalledTimes(5)
  })

  it('restores the context for an empty document', () => {
    const context = createMockContext()

    drawMinimap(
      context,
      [],
      () => ({ x: 0, y: 0, w: 0, h: 0 }),
      { x: 0, y: 0, zoom: 1 },
      { w: 320, h: 240 },
      false
    )

    expect(context.restore).toHaveBeenCalledTimes(1)
    expect(context.stroke).not.toHaveBeenCalled()
  })
})
