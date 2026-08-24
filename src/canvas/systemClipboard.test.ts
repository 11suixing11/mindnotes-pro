import { describe, expect, it, vi } from 'vitest'
import type { CanvasElement } from '../store/types'

const { drawElementMock } = vi.hoisted(() => ({
  drawElementMock: vi.fn(),
}))

vi.mock('./canvasDrawing', () => ({
  drawElement: drawElementMock,
}))

import { copyElementsToSystemClipboard, getSystemClipboardBounds } from './systemClipboard'

const shape: CanvasElement = {
  type: 'shape',
  id: 'shape-1',
  kind: 'rectangle',
  x: -10,
  y: 20,
  w: 40,
  h: 30,
  color: '#111827',
  size: 2,
}

describe('system clipboard rendering', () => {
  it('calculates padded bounds for selected elements', () => {
    expect(getSystemClipboardBounds([shape])).toEqual({ x: -23, y: 7, w: 66, h: 56 })
  })

  it('returns null for an empty selection', () => {
    expect(getSystemClipboardBounds([])).toBeNull()
  })

  it('renders and writes a PNG through injected browser services', async () => {
    const context = {
      setTransform: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement
    const blob = new Blob(['png'])
    const toBlob = vi.fn().mockResolvedValue(blob)
    const writePng = vi.fn().mockResolvedValue(undefined)

    await expect(
      copyElementsToSystemClipboard([shape], {
        isDarkMode: true,
        devicePixelRatio: 2,
        createCanvas: () => canvas,
        toBlob,
        writePng,
      })
    ).resolves.toBe(true)

    expect(canvas.width).toBe(132)
    expect(canvas.height).toBe(112)
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(context.translate).toHaveBeenCalledWith(23, -7)
    expect(drawElementMock).toHaveBeenCalledWith(context, shape, true)
    expect(toBlob).toHaveBeenCalledWith(canvas)
    expect(writePng).toHaveBeenCalledWith(blob)
  })

  it('returns false when the canvas context is unavailable', async () => {
    const canvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement

    await expect(
      copyElementsToSystemClipboard([shape], { createCanvas: () => canvas })
    ).resolves.toBe(false)
  })

  it('returns false when clipboard writing is rejected', async () => {
    const context = {
      setTransform: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const canvas = {
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement

    await expect(
      copyElementsToSystemClipboard([shape], {
        createCanvas: () => canvas,
        toBlob: vi.fn().mockResolvedValue(new Blob(['png'])),
        writePng: vi.fn().mockRejectedValue(new Error('denied')),
      })
    ).resolves.toBe(false)
  })
})
