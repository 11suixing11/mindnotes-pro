import { describe, expect, it, vi } from 'vitest'
import { bindCanvasPinchZoom } from './touchGestures'

function createTouch(identifier: number, clientX: number, clientY: number): Touch {
  return {
    identifier,
    target: document.body,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    screenX: clientX,
    screenY: clientY,
    radiusX: 10,
    radiusY: 10,
    rotationAngle: 0,
    force: 0.5,
  } as Touch
}

function createTouchEvent(type: string, touches: Touch[], changedTouches = touches): TouchEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: changedTouches },
    targetTouches: { value: touches },
  })
  return event
}

function createCanvas() {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  })
  return canvas
}

describe('bindCanvasPinchZoom', () => {
  it('cancels a single-finger drawing and zooms around the moving midpoint', () => {
    const canvas = createCanvas()
    const setViewBox = vi.fn()
    const scheduleRedraw = vi.fn()
    const handlers = {
      cancelDrawing: vi.fn(),
      setPinching: vi.fn(),
      clearActiveTouch: vi.fn(),
      getCanvasRect: () => canvas.getBoundingClientRect(),
      getViewBox: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewBox,
      scheduleRedraw,
    }
    const unbind = bindCanvasPinchZoom(canvas, handlers)
    const first = createTouch(1, 100, 100)
    const second = createTouch(2, 200, 100)
    const movedFirst = createTouch(1, 50, 100)
    const movedSecond = createTouch(2, 250, 100)

    canvas.dispatchEvent(createTouchEvent('touchstart', [first, second]))
    canvas.dispatchEvent(createTouchEvent('touchmove', [movedFirst, movedSecond]))

    expect(handlers.cancelDrawing).toHaveBeenCalledTimes(1)
    expect(handlers.clearActiveTouch).toHaveBeenCalledTimes(1)
    expect(handlers.setPinching).toHaveBeenNthCalledWith(1, true)
    expect(setViewBox).toHaveBeenCalledWith(expect.objectContaining({ zoom: 2 }))
    expect(scheduleRedraw).toHaveBeenCalledTimes(1)

    canvas.dispatchEvent(createTouchEvent('touchend', [movedFirst]))
    expect(handlers.setPinching).toHaveBeenLastCalledWith(false)
    unbind()
  })

  it('clears pinch state and active touch on cancellation', () => {
    const canvas = createCanvas()
    const handlers = {
      cancelDrawing: vi.fn(),
      setPinching: vi.fn(),
      clearActiveTouch: vi.fn(),
      getCanvasRect: () => canvas.getBoundingClientRect(),
      getViewBox: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewBox: vi.fn(),
      scheduleRedraw: vi.fn(),
    }
    const unbind = bindCanvasPinchZoom(canvas, handlers)
    const first = createTouch(1, 100, 100)
    const second = createTouch(2, 200, 100)

    canvas.dispatchEvent(createTouchEvent('touchstart', [first, second]))
    canvas.dispatchEvent(createTouchEvent('touchcancel', [], [first, second]))

    expect(handlers.setPinching).toHaveBeenLastCalledWith(false)
    expect(handlers.clearActiveTouch).toHaveBeenCalledTimes(2)
    unbind()
  })

  it('does not react to a single touch', () => {
    const canvas = createCanvas()
    const handlers = {
      cancelDrawing: vi.fn(),
      setPinching: vi.fn(),
      clearActiveTouch: vi.fn(),
      getCanvasRect: () => canvas.getBoundingClientRect(),
      getViewBox: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewBox: vi.fn(),
      scheduleRedraw: vi.fn(),
    }
    const unbind = bindCanvasPinchZoom(canvas, handlers)

    canvas.dispatchEvent(createTouchEvent('touchstart', [createTouch(1, 10, 10)]))

    expect(handlers.cancelDrawing).not.toHaveBeenCalled()
    expect(handlers.setPinching).not.toHaveBeenCalled()
    unbind()
  })
})
