import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  drawCanvasBackground,
  drawGrid,
  drawMonetGrid,
  resetCanvasBackgroundCaches,
} from './canvasBackground'

const pathInstances: MockPath2D[] = []

class MockPath2D {
  moveTo = vi.fn()
  lineTo = vi.fn()
  arc = vi.fn()

  constructor() {
    pathInstances.push(this)
  }
}

function createMockContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D
}

describe('canvas background rendering', () => {
  beforeEach(() => {
    pathInstances.length = 0
    vi.stubGlobal('Path2D', MockPath2D)
    resetCanvasBackgroundCaches()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders patterned backgrounds independently from the compatibility barrel', () => {
    const context = createMockContext()

    drawCanvasBackground(context, { w: 120, h: 80 }, '#ffffff', false, 'notebook', {
      x: 0,
      y: 0,
      zoom: 1,
    })

    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 120, 80)
    expect(context.stroke).toHaveBeenCalledTimes(2)
    expect(context.restore).toHaveBeenCalled()
  })

  it('reuses and explicitly invalidates the grid path cache', () => {
    const context = createMockContext()
    const viewBox = { x: 0, y: 0, zoom: 1 }
    const canvasSize = { w: 120, h: 80 }

    drawGrid(context, viewBox, canvasSize, false)
    drawGrid(context, viewBox, canvasSize, false)
    expect(pathInstances).toHaveLength(1)

    resetCanvasBackgroundCaches()
    drawGrid(context, viewBox, canvasSize, false)
    expect(pathInstances).toHaveLength(2)
  })

  it('skips the decorative Monet grid below its zoom threshold', () => {
    const context = createMockContext()

    drawMonetGrid(context, { x: 0, y: 0, zoom: 0.2 }, { w: 120, h: 80 }, false)

    expect(context.fill).not.toHaveBeenCalled()
    expect(pathInstances).toHaveLength(0)
  })
})
