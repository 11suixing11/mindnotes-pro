import { describe, expect, it, vi } from 'vitest'
import { bindCanvasInputEvents } from './pointerEvents'

function createPointerEvent(type: string, pointerId: number, pointerType = 'mouse') {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  })
  return event
}

describe('bindCanvasInputEvents', () => {
  it('captures one non-touch pointer and releases it on pointerup', () => {
    const canvas = document.createElement('canvas')
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    canvas.setPointerCapture = setPointerCapture
    canvas.releasePointerCapture = releasePointerCapture
    const onStart = vi.fn()
    const onMove = vi.fn()
    const onEnd = vi.fn()
    const onCancel = vi.fn()
    const unbind = bindCanvasInputEvents(canvas, { onStart, onMove, onEnd, onCancel })

    canvas.dispatchEvent(createPointerEvent('pointerdown', 7))
    canvas.dispatchEvent(createPointerEvent('pointerdown', 8))
    canvas.dispatchEvent(createPointerEvent('pointermove', 7))
    canvas.dispatchEvent(createPointerEvent('pointerup', 7))
    canvas.dispatchEvent(createPointerEvent('pointermove', 8))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(releasePointerCapture).toHaveBeenCalledWith(7)

    unbind()
    canvas.dispatchEvent(createPointerEvent('pointerdown', 9))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('leaves touch gestures on the touch event path', () => {
    const canvas = document.createElement('canvas')
    const handlers = {
      onStart: vi.fn(),
      onMove: vi.fn(),
      onEnd: vi.fn(),
      onCancel: vi.fn(),
    }
    const unbind = bindCanvasInputEvents(canvas, handlers)
    const touchStart = new Event('touchstart', { bubbles: true, cancelable: true })

    canvas.dispatchEvent(createPointerEvent('pointerdown', 3, 'touch'))
    canvas.dispatchEvent(touchStart)

    expect(handlers.onStart).toHaveBeenCalledTimes(1)
    expect(handlers.onStart).toHaveBeenCalledWith(touchStart)
    unbind()
  })
})
