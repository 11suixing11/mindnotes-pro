import { describe, it, expect, vi } from 'vitest'
import type { CanvasElement } from '../store/types'
import { exportContentToCanvas } from './ExportMenu'

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 120
  height = 80
  private _src = ''

  set src(value: string) {
    this._src = value
    this.onload?.()
  }

  get src() {
    return this._src
  }
}

describe('exportContentToCanvas', () => {
  it('draws image elements after loading', async () => {
    const drawImage = vi.fn()
    const ctx = {
      scale: vi.fn(),
      fillRect: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillText: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      drawImage,
      lineWidth: 0,
      lineCap: 'round',
      lineJoin: 'round',
      strokeStyle: '#000',
      fillStyle: '#fff',
      font: '12px sans-serif',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D

    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
    const originalImage = globalThis.Image
    globalThis.Image = MockImage as unknown as typeof Image

    try {
      const elements: CanvasElement[] = [
        { type: 'image', id: 'img-1', x: 10, y: 20, width: 120, height: 80, dataUrl: 'data:image/png;base64,abc' },
      ]
      const canvas = await exportContentToCanvas(elements, '#ffffff')
      expect(canvas).not.toBeNull()
      expect(drawImage).toHaveBeenCalledTimes(1)
      expect(drawImage).toHaveBeenCalledWith(expect.any(MockImage), 10, 20, 120, 80)
    } finally {
      getContextSpy.mockRestore()
      globalThis.Image = originalImage
    }
  })
})
