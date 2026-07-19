import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  drawElement,
  drawStrokeEl,
  drawStrokeRaw,
  drawShapeEl,
  drawTextEl,
  drawSelBox,
  drawMonetGrid,
  drawCanvasBackground,
  drawZoomLevel,
} from './canvasDrawing'
import type { StrokeElement, ShapeElement, TextElement } from '../store/types'

// Mock Path2D for jsdom environment
class MockPath2D {
  moveTo = vi.fn()
  lineTo = vi.fn()
  arc = vi.fn()
  closePath = vi.fn()
  quadraticCurveTo = vi.fn()
  bezierCurveTo = vi.fn()
  rect = vi.fn()
  ellipse = vi.fn()
  roundRect = vi.fn()
  addPath = vi.fn()
}

if (typeof globalThis.Path2D === 'undefined') {
  ;(globalThis as any).Path2D = MockPath2D
}

// Mock canvas context
function createMockCtx(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    setLineDash: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    roundRect: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
  } as any
}

describe('canvasDrawing', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  describe('drawElement', () => {
    it('should dispatch to drawStrokeEl for stroke elements', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
        ],
        color: '#000',
        size: 2,
        brush: 'pen',
      }
      drawElement(ctx, el, false)
      expect(ctx.beginPath).toHaveBeenCalled()
    })

    it('should dispatch to drawShapeEl for shape elements', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
      }
      drawElement(ctx, el, false)
      // 使用 Path2D 缓存时不会调用 beginPath，但一定会调用 stroke
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should dispatch to drawTextEl for text elements', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 200,
        height: 30,
        content: 'Hello',
        fontSize: 16,
        color: '#000',
      }
      drawElement(ctx, el, false)
      expect(ctx.fillText).toHaveBeenCalled()
    })

    it('should skip text element when editing', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 200,
        height: 30,
        content: 'Hello',
        fontSize: 16,
        color: '#000',
      }
      drawElement(ctx, el, false, 't1')
      expect(ctx.fillText).not.toHaveBeenCalled()
    })
  })

  describe('drawStrokeEl', () => {
    it('should return early for strokes with less than 2 points', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [[0, 0]],
        color: '#000',
        size: 2,
        brush: 'pen',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.beginPath).not.toHaveBeenCalled()
    })

    it('should draw pen strokes', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
          [20, 5],
        ],
        color: '#000',
        size: 2,
        brush: 'pen',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.beginPath).toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should draw highlighter strokes', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
        ],
        color: '#000',
        size: 2,
        brush: 'highlighter',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should draw pencil strokes', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
          [20, 5],
        ],
        color: '#000',
        size: 2,
        brush: 'pencil',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should draw calligraphy strokes', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
          [20, 5],
        ],
        color: '#000',
        size: 2,
        brush: 'calligraphy',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.beginPath).toHaveBeenCalled()
    })

    it('should draw dashed strokes', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
        ],
        color: '#000',
        size: 2,
        brush: 'dashed',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.setLineDash).toHaveBeenCalled()
    })

    it('should draw glow strokes', () => {
      const el: StrokeElement = {
        type: 'stroke',
        id: 's1',
        points: [
          [0, 0],
          [10, 10],
        ],
        color: '#000',
        size: 2,
        brush: 'glow',
      }
      drawStrokeEl(ctx, el, false)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })
  })

  describe('drawStrokeRaw', () => {
    it('should draw raw stroke points', () => {
      drawStrokeRaw(
        ctx,
        [
          [0, 0],
          [10, 10],
        ],
        '#000',
        2,
        'pen',
        false
      )
      expect(ctx.beginPath).toHaveBeenCalled()
    })
  })

  describe('drawShapeEl', () => {
    it('should draw rectangle', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
      }
      drawShapeEl(ctx, el)
      // 使用 Path2D 缓存时不会调用 beginPath，但一定会调用 stroke
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should draw rectangle with fill', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'rectangle',
        x: 0,
        y: 0,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
        fillColor: '#ff0000',
      }
      drawShapeEl(ctx, el)
      expect(ctx.fill).toHaveBeenCalled()
    })

    it('should draw circle', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'circle',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        color: '#000',
        size: 2,
      }
      drawShapeEl(ctx, el)
      // 使用 Path2D 缓存时路径在 Path2D 对象上构建，不会调用 ctx.ellipse，但一定会调用 stroke
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should draw line', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'line',
        x: 0,
        y: 0,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
      }
      drawShapeEl(ctx, el)
      expect(ctx.beginPath).toHaveBeenCalled()
    })

    it('should draw arrow', () => {
      const el: ShapeElement = {
        type: 'shape',
        id: 'sh1',
        kind: 'arrow',
        x: 0,
        y: 0,
        w: 100,
        h: 50,
        color: '#000',
        size: 2,
      }
      drawShapeEl(ctx, el)
      expect(ctx.beginPath).toHaveBeenCalled()
    })
  })

  describe('drawTextEl', () => {
    it('should draw single line text', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 200,
        height: 30,
        content: 'Hello',
        fontSize: 16,
        color: '#000',
      }
      drawTextEl(ctx, el)
      expect(ctx.fillText).toHaveBeenCalled()
    })

    it('should draw multi-line text', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 200,
        height: 60,
        content: 'Line 1\nLine 2',
        fontSize: 16,
        color: '#000',
      }
      drawTextEl(ctx, el)
      expect(ctx.fillText).toHaveBeenCalledTimes(2)
    })

    it('should wrap long text', () => {
      const el: TextElement = {
        type: 'text',
        id: 't1',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        content: 'This is a very long text that should be wrapped',
        fontSize: 16,
        color: '#000',
      }
      drawTextEl(ctx, el)
      expect(ctx.fillText).toHaveBeenCalled()
    })
  })

  describe('drawSelBox', () => {
    it('should draw selection box in light mode', () => {
      drawSelBox(ctx, { x: 0, y: 0, w: 100, h: 50 }, false, 1)
      expect(ctx.strokeRect).toHaveBeenCalled()
      expect(ctx.fillRect).toHaveBeenCalled()
    })

    it('should draw selection box in dark mode', () => {
      drawSelBox(ctx, { x: 0, y: 0, w: 100, h: 50 }, true, 1)
      expect(ctx.strokeRect).toHaveBeenCalled()
    })

    it('should adjust line width based on zoom', () => {
      drawSelBox(ctx, { x: 0, y: 0, w: 100, h: 50 }, false, 2)
      expect(ctx.strokeRect).toHaveBeenCalled()
    })
  })

  describe('drawMonetGrid', () => {
    it('should draw grid dots', () => {
      drawMonetGrid(ctx, { x: 0, y: 0, zoom: 1 }, { w: 800, h: 600 }, false)
      expect(ctx.fill).toHaveBeenCalled()
    })

    it('should not draw grid when zoomed out too far', () => {
      drawMonetGrid(ctx, { x: 0, y: 0, zoom: 0.2 }, { w: 800, h: 600 }, false)
      expect(ctx.fill).not.toHaveBeenCalled()
    })

    it('should draw grid in dark mode', () => {
      drawMonetGrid(ctx, { x: 0, y: 0, zoom: 1 }, { w: 800, h: 600 }, true)
      expect(ctx.fill).toHaveBeenCalled()
    })
  })

  describe('drawCanvasBackground', () => {
    it('should draw background in light mode', () => {
      drawCanvasBackground(ctx, { w: 800, h: 600 }, '#ffffff', false)
      expect(ctx.fillRect).toHaveBeenCalled()
    })

    it('should draw background in dark mode', () => {
      drawCanvasBackground(ctx, { w: 800, h: 600 }, '#1C1A24', true)
      expect(ctx.fillRect).toHaveBeenCalled()
    })

    it('should draw dot backgrounds', () => {
      drawCanvasBackground(ctx, { w: 120, h: 80 }, '#ffffff', false, 'dots')
      expect(ctx.arc).toHaveBeenCalled()
      expect(ctx.fill).toHaveBeenCalled()
    })

    it('should draw grid backgrounds', () => {
      drawCanvasBackground(ctx, { w: 120, h: 80 }, '#ffffff', false, 'grid')
      expect(ctx.lineTo).toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
    })

    it('should draw the notebook margin', () => {
      drawCanvasBackground(ctx, { w: 120, h: 80 }, '#ffffff', false, 'notebook')
      expect(ctx.stroke).toHaveBeenCalledTimes(2)
    })
  })

  describe('drawZoomLevel', () => {
    it('should draw zoom percentage', () => {
      drawZoomLevel(ctx, { zoom: 1 }, { w: 800, h: 600 }, false, 1)
      expect(ctx.fillText).toHaveBeenCalledWith('100%', expect.any(Number), expect.any(Number))
    })

    it('should draw zoom percentage in dark mode', () => {
      drawZoomLevel(ctx, { zoom: 1.5 }, { w: 800, h: 600 }, true, 1)
      expect(ctx.fillText).toHaveBeenCalledWith('150%', expect.any(Number), expect.any(Number))
    })
  })
})
