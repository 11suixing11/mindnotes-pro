import {
  getTouchDistance,
  getTouchMidpoint,
  pinchViewBoxAtClientMidpoint,
} from '../../canvas/coordinates'
import type { ViewBox } from '../../core/viewport'
import { getAcceptedTouches } from './touchInput'

export interface CanvasPinchZoomHandlers {
  cancelDrawing: () => void
  setPinching: (active: boolean) => void
  clearActiveTouch: () => void
  getCanvasRect: () => DOMRect | null
  getViewBox: () => ViewBox
  setViewBox: (viewBox: ViewBox) => void
  scheduleRedraw: () => void
}

/** Bind two-finger pinch zoom while leaving one-finger input to the pointer engine. */
export function bindCanvasPinchZoom(
  canvas: HTMLCanvasElement,
  handlers: CanvasPinchZoomHandlers
): () => void {
  let pinching = false
  let pinchDist = 0
  let pinchMid = { x: 0, y: 0 }

  const onTouchStart = (event: TouchEvent) => {
    const touches = getAcceptedTouches(event.touches)
    if (touches.length < 2) return

    handlers.cancelDrawing()
    handlers.clearActiveTouch()
    pinching = true
    handlers.setPinching(true)

    const midpoint = getTouchMidpoint(touches)
    if (!midpoint) return
    pinchDist = getTouchDistance(touches)
    pinchMid = midpoint
    event.preventDefault()
  }

  const onTouchMove = (event: TouchEvent) => {
    const touches = getAcceptedTouches(event.touches)
    if (!pinching || touches.length < 2) return

    event.preventDefault()
    const nextDistance = getTouchDistance(touches)
    const nextMidpoint = getTouchMidpoint(touches)
    if (!nextMidpoint) return

    const rect = handlers.getCanvasRect()
    if (!rect) {
      pinchDist = nextDistance
      pinchMid = nextMidpoint
      return
    }

    handlers.setViewBox(
      pinchViewBoxAtClientMidpoint({
        viewBox: handlers.getViewBox(),
        canvasRect: rect,
        previousDistance: pinchDist,
        previousMidpoint: pinchMid,
        nextDistance,
        nextMidpoint,
      })
    )
    pinchDist = nextDistance
    pinchMid = nextMidpoint
    handlers.scheduleRedraw()
  }

  const onTouchEnd = (event: TouchEvent) => {
    if (getAcceptedTouches(event.touches).length < 2) {
      pinching = false
      handlers.setPinching(false)
    }
  }

  const onTouchCancel = () => {
    pinching = false
    handlers.setPinching(false)
    handlers.clearActiveTouch()
  }

  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  canvas.addEventListener('touchcancel', onTouchCancel, { passive: false })

  return () => {
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    canvas.removeEventListener('touchcancel', onTouchCancel)
  }
}
