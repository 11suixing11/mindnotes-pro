import { describe, expect, it, vi } from 'vitest'
import { drawSelBox, drawZoomLevel } from './canvasOverlays'

function createMockContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    fillText: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D
}

describe('canvas overlays', () => {
  it('draws selection handles independently from the compatibility barrel', () => {
    const context = createMockContext()

    drawSelBox(context, { x: 0, y: 0, w: 100, h: 50 }, false, 1, {
      showResizeHandles: false,
    })

    expect(context.strokeRect).toHaveBeenCalledWith(0, 0, 100, 50)
    expect(context.moveTo).toHaveBeenCalledWith(55, -20)
    expect(context.restore).toHaveBeenCalled()
  })

  it('draws the zoom percentage using the device-pixel transform', () => {
    const context = createMockContext()

    drawZoomLevel(context, { zoom: 1.5 }, { w: 800, h: 600 }, true, 2)

    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.fillText).toHaveBeenCalledWith('150%', 784, 22)
    expect(context.restore).toHaveBeenCalled()
  })
})
