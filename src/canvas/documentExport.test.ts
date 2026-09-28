import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasElement } from '../store/types'

const { drawBackgroundMock, drawBackgroundImageMock, drawElementMock, preloadImageMock } =
  vi.hoisted(() => ({
    drawBackgroundMock: vi.fn(),
    drawBackgroundImageMock: vi.fn(),
    drawElementMock: vi.fn(),
    preloadImageMock: vi.fn(async () => {}),
  }))

vi.mock('./canvasDrawing', () => ({
  drawCanvasBackground: drawBackgroundMock,
  drawCanvasBackgroundImage: drawBackgroundImageMock,
  drawElement: drawElementMock,
}))

vi.mock('./canvasUtils', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  preloadImage: preloadImageMock,
}))

import {
  EmptyDocumentError,
  formatExportTimestamp,
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

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('draws an imported background image on opaque exports only', async () => {
    const context = {
      save: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    const backgroundImage = {
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      fit: 'cover' as const,
      x: -129,
      y: -9,
      width: 108,
      height: 98,
    }

    await renderDocumentToCanvas([shape], {
      bgColor: '#ffffff',
      backgroundImage,
    })
    expect(drawBackgroundImageMock).toHaveBeenCalledWith(
      context,
      { w: 108, h: 98 },
      backgroundImage,
      { x: -129, y: -9, zoom: 1 }
    )
    expect(preloadImageMock).toHaveBeenCalledWith(backgroundImage.dataUrl)

    drawBackgroundImageMock.mockClear()
    await renderDocumentToCanvas([shape], {
      bgColor: '#ffffff',
      backgroundImage,
      transparent: true,
    })
    expect(drawBackgroundImageMock).not.toHaveBeenCalled()
  })

  it('rejects an empty document before allocating an export canvas', async () => {
    await expect(renderDocumentToCanvas([], { bgColor: '#ffffff' })).rejects.toBeInstanceOf(
      EmptyDocumentError
    )
  })

  it('creates portable filenames', () => {
    expect(sanitizeExportFilename('  方案: A/B?  ')).toBe('方案- A-B-')
    expect(sanitizeExportFilename('...')).toBe('MindNotes-Pro')
  })

  it('formats export timestamps in local time', () => {
    expect(formatExportTimestamp(new Date(2026, 6, 31, 13, 4, 5))).toBe('2026-07-31-13-04-05')
  })
})
