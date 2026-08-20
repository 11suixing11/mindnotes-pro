import { describe, expect, it, vi } from 'vitest'
import type { StrokeElement } from '../store/types'
import { drawStrokeEl, drawStrokeRaw, resetStrokeRendererPools } from './strokeRenderer'

function createMockContext(): CanvasRenderingContext2D {
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
    setLineDash: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D
}

describe('stroke rendering', () => {
  it('renders pressure-sensitive pen strokes as filled outlines', () => {
    const context = createMockContext()
    const element: StrokeElement = {
      type: 'stroke',
      id: 'pressure-stroke',
      points: [
        [0, 0],
        [10, 10],
        [20, 5],
      ],
      pressures: [0.2, 0.7, 1],
      color: '#000000',
      size: 8,
      brush: 'pen',
    }

    drawStrokeEl(context, element, false)

    expect(context.fill).toHaveBeenCalled()
    expect(context.stroke).not.toHaveBeenCalled()
  })

  it('renders raw brush previews independently from the compatibility barrel', () => {
    const context = createMockContext()

    resetStrokeRendererPools()
    drawStrokeRaw(
      context,
      [
        [0, 0],
        [10, 10],
      ],
      '#000000',
      4,
      'highlighter',
      false
    )

    expect(context.save).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
    expect(context.restore).toHaveBeenCalled()
  })
})
