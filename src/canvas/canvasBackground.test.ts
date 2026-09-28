import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeBackgroundCoverRect,
  drawCanvasBackground,
  drawCanvasBackgroundImage,
  drawGrid,
  drawMonetGrid,
  resetCanvasBackgroundCaches,
} from './canvasBackground'

const { getImageMock } = vi.hoisted(() => ({ getImageMock: vi.fn() }))

vi.mock('./canvasUtils', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getImage: getImageMock,
}))

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

describe('background image', () => {
  beforeEach(() => {
    getImageMock.mockReset()
  })

  it('computes a cover rect that fills the visible world area', () => {
    // 视口 800x600 屏幕像素、zoom 2 → 世界 400x300；图片 100x100 按 max(4, 3) = 4 放大
    const rect = computeBackgroundCoverRect(
      { width: 800, height: 600, centerX: 100, centerY: 50 },
      100,
      100,
      2
    )
    expect(rect).toEqual({ x: -100, y: -150, width: 400, height: 400 })
  })

  it('draws a cover background at its world rect', () => {
    const context = createMockContext()
    context.scale = vi.fn()
    context.translate = vi.fn()
    context.drawImage = vi.fn()
    const image = { complete: true, naturalWidth: 10 }
    getImageMock.mockReturnValue(image)

    drawCanvasBackgroundImage(
      context,
      { w: 400, h: 300 },
      { dataUrl: 'data:image/png;base64,AAA', fit: 'cover', x: 5, y: 6, width: 100, height: 50 },
      { x: 10, y: 20, zoom: 2 }
    )

    expect(context.drawImage).toHaveBeenCalledWith(image, 5, 6, 100, 50)
    expect(context.scale).toHaveBeenCalledWith(2, 2)
    expect(context.translate).toHaveBeenCalledWith(-10, -20)
    expect(context.restore).toHaveBeenCalled()
  })

  it('tiles the background image across the visible world area', () => {
    const context = createMockContext()
    context.scale = vi.fn()
    context.translate = vi.fn()
    context.drawImage = vi.fn()
    context.createPattern = vi.fn(() => ({ __pattern: true }) as unknown as CanvasPattern)
    getImageMock.mockReturnValue({ complete: true, naturalWidth: 10 })

    drawCanvasBackgroundImage(
      context,
      { w: 400, h: 300 },
      { dataUrl: 'data:image/png;base64,AAA', fit: 'tile', width: 64, height: 32 },
      { x: 10, y: 20, zoom: 2 }
    )

    expect(context.createPattern).toHaveBeenCalled()
    expect(context.fillStyle).toEqual({ __pattern: true })
    // 可视世界区域：x=10, y=20, w=400/2, h=300/2
    expect(context.fillRect).toHaveBeenCalledWith(10, 20, 200, 150)
    expect(context.drawImage).not.toHaveBeenCalled()
  })

  it('does nothing while the background image is still loading', () => {
    const context = createMockContext()
    context.drawImage = vi.fn()
    getImageMock.mockReturnValue(null)

    drawCanvasBackgroundImage(
      context,
      { w: 400, h: 300 },
      { dataUrl: 'data:image/png;base64,AAA', fit: 'cover', width: 10, height: 10 }
    )

    expect(context.drawImage).not.toHaveBeenCalled()
  })
})
