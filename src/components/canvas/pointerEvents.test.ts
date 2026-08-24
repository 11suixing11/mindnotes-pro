import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindCanvasAuxiliaryEvents, bindCanvasInputEvents } from './pointerEvents'

afterEach(() => {
  vi.restoreAllMocks()
})

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
    expect(onMove).toHaveBeenCalledTimes(2)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(releasePointerCapture).toHaveBeenCalledWith(7)

    unbind()
    canvas.dispatchEvent(createPointerEvent('pointerdown', 9))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('forwards hover movement and recovers when pointer capture release throws', () => {
    const canvas = document.createElement('canvas')
    const releasePointerCapture = vi.fn(() => {
      throw new DOMException('capture already released', 'NotFoundError')
    })
    canvas.setPointerCapture = vi.fn()
    canvas.releasePointerCapture = releasePointerCapture
    const handlers = {
      onStart: vi.fn(),
      onMove: vi.fn(),
      onEnd: vi.fn(),
      onCancel: vi.fn(),
    }
    const unbind = bindCanvasInputEvents(canvas, handlers)

    canvas.dispatchEvent(createPointerEvent('pointermove', 1))
    canvas.dispatchEvent(createPointerEvent('pointerdown', 1))
    canvas.dispatchEvent(createPointerEvent('pointerup', 1))
    canvas.dispatchEvent(createPointerEvent('pointerdown', 2))

    expect(handlers.onMove).toHaveBeenCalledTimes(1)
    expect(handlers.onStart).toHaveBeenCalledTimes(2)
    expect(releasePointerCapture).toHaveBeenCalledWith(1)

    unbind()
  })

  it('cancels a captured pointer and releases it', () => {
    const canvas = document.createElement('canvas')
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    canvas.setPointerCapture = setPointerCapture
    canvas.releasePointerCapture = releasePointerCapture
    const handlers = {
      onStart: vi.fn(),
      onMove: vi.fn(),
      onEnd: vi.fn(),
      onCancel: vi.fn(),
    }
    const unbind = bindCanvasInputEvents(canvas, handlers)

    canvas.dispatchEvent(createPointerEvent('pointerdown', 5, 'pen'))
    canvas.dispatchEvent(createPointerEvent('pointercancel', 5, 'pen'))
    canvas.dispatchEvent(createPointerEvent('pointerdown', 6, 'pen'))

    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
    expect(releasePointerCapture).toHaveBeenCalledWith(5)
    expect(setPointerCapture).toHaveBeenLastCalledWith(6)

    unbind()
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

describe('bindCanvasAuxiliaryEvents', () => {
  it('forwards wheel, keyboard, context-menu, and double-click events', () => {
    const canvas = document.createElement('canvas')
    const handlers = {
      onCancel: vi.fn(),
      onWheel: vi.fn(),
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onContextMenu: vi.fn(),
      onDoubleClick: vi.fn(),
    }
    const unbind = bindCanvasAuxiliaryEvents(canvas, handlers)
    const wheel = new WheelEvent('wheel', { cancelable: true })
    const keyDown = new KeyboardEvent('keydown', { key: ' ' })
    const keyUp = new KeyboardEvent('keyup', { key: ' ' })
    const contextMenu = new MouseEvent('contextmenu', { cancelable: true })
    const doubleClick = new MouseEvent('dblclick')

    canvas.dispatchEvent(wheel)
    window.dispatchEvent(keyDown)
    window.dispatchEvent(keyUp)
    canvas.dispatchEvent(contextMenu)
    canvas.dispatchEvent(doubleClick)

    expect(handlers.onWheel).toHaveBeenCalledWith(wheel)
    expect(handlers.onKeyDown).toHaveBeenCalledWith(keyDown)
    expect(handlers.onKeyUp).toHaveBeenCalledWith(keyUp)
    expect(handlers.onContextMenu).toHaveBeenCalledWith(contextMenu)
    expect(handlers.onDoubleClick).toHaveBeenCalledWith(doubleClick)
    expect(handlers.onCancel).not.toHaveBeenCalled()

    unbind()
  })

  it('cancels active input on blur and when the document becomes hidden', () => {
    const canvas = document.createElement('canvas')
    const handlers = {
      onCancel: vi.fn(),
      onWheel: vi.fn(),
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onContextMenu: vi.fn(),
      onDoubleClick: vi.fn(),
    }
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const unbind = bindCanvasAuxiliaryEvents(canvas, handlers)

    window.dispatchEvent(new Event('blur'))
    document.dispatchEvent(new Event('visibilitychange'))

    expect(handlers.onCancel).toHaveBeenCalledTimes(2)
    expect(handlers.onCancel.mock.calls[0][0].type).toBe('blur')
    expect(handlers.onCancel.mock.calls[1][0].type).toBe('visibilitychange')

    unbind()
  })

  it('removes every auxiliary listener during cleanup', () => {
    const canvas = document.createElement('canvas')
    const handlers = {
      onCancel: vi.fn(),
      onWheel: vi.fn(),
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onContextMenu: vi.fn(),
      onDoubleClick: vi.fn(),
    }
    const unbind = bindCanvasAuxiliaryEvents(canvas, handlers)
    unbind()

    canvas.dispatchEvent(new WheelEvent('wheel'))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }))
    window.dispatchEvent(new Event('blur'))
    canvas.dispatchEvent(new MouseEvent('contextmenu'))
    canvas.dispatchEvent(new MouseEvent('dblclick'))

    expect(handlers.onWheel).not.toHaveBeenCalled()
    expect(handlers.onKeyDown).not.toHaveBeenCalled()
    expect(handlers.onKeyUp).not.toHaveBeenCalled()
    expect(handlers.onCancel).not.toHaveBeenCalled()
    expect(handlers.onContextMenu).not.toHaveBeenCalled()
    expect(handlers.onDoubleClick).not.toHaveBeenCalled()
  })
})
