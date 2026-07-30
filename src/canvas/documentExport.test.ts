import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement } from '../store/types'

const { drawBackgroundMock, drawElementMock } = vi.hoisted(() => ({
  drawBackgroundMock: vi.fn(),
  drawElementMock: vi.fn(),
}))

vi.mock('./canvasDrawing', () => ({
  drawCanvasBackground: drawBackgroundMock,
  drawElement: drawElementMock,
}))

import {
  getDocumentExportBounds,
  getDocumentExportScale,
  renderDocumentToCanvas,
  sanitizeExportFilename,
} from './documentExport'

const shape: CanvasElement = {
  type: 'shape',
  id: 'shape-1',
  kind: 'rectangle',
  x: -100,
  y: 20,
  w: 50,
  h: 40,
  color: '#111827',
  size: 2,
}

describe('document export', () => {
  beforeEach(() => {
    drawBackgroundMock.mockReset()
    drawElementMock.mockReset()
  })

  it('fits negative world coordinates with stable padding', () => {
    expect(getDocumentExportBounds([shape])).toEqual({ x: -129, y: -9, w: 108, h: 98 })
  })

  it('includes rotated element corners in the export bounds', () => {
    const rotated: CanvasElement = {
      type: 'text',
      id: 'text-1',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      content: '旋转',
      fontSize: 16,
      color: '#111827',
      rotation: Math.PI / 2,
    }

    const bounds = getDocumentExportBounds([rotated])
    expect(bounds?.x).toBeCloseTo(11)
    expect(bounds?.y).toBeCloseTo(-69)
    expect(bounds?.w).toBeCloseTo(78)
    expect(bounds?.h).toBeCloseTo(158)
  })

  it('caps huge exports by both dimensions and total pixel count', () => {
    expect(getDocumentExportScale({ w: 20_000, h: 10_000 })).toBeCloseTo(0.4)
    expect(getDocumentExportScale({ w: 20_000, h: 100 })).toBeCloseTo(0.4096)
  })

  it('renders document coordinates independently from the viewport', async () => {
    const context = {
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)

    const result = await renderDocumentToCanvas([shape], {
      bgColor: '#ffffff',
      backgroundStyle: 'grid',
    })

    expect(result.canvas.width).toBe(108)
    expect(result.canvas.height).toBe(98)
    expect(drawBackgroundMock).toHaveBeenCalledWith(
      context,
      { w: 108, h: 98 },
      '#ffffff',
      false,
      'grid',
      { x: -129, y: -9, zoom: 1 }
    )
    expect(context.translate).toHaveBeenCalledWith(129, 9)
    expect(drawElementMock).toHaveBeenCalledWith(context, shape, false)
  })

  it('creates portable filenames', () => {
    expect(sanitizeExportFilename('  方案: A/B?  ')).toBe('方案- A-B-')
    expect(sanitizeExportFilename('...')).toBe('MindNotes-Pro')
  })
})
