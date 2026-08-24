export type CanvasInputEvent = MouseEvent | TouchEvent | PointerEvent

export interface CanvasInputHandlers {
  onStart: (event: CanvasInputEvent) => void
  onMove: (event: CanvasInputEvent) => void
  onEnd: (event: CanvasInputEvent) => void
  onCancel: (event: Event) => void
}

export interface CanvasAuxiliaryEventHandlers {
  onCancel: (event: Event) => void
  onWheel: (event: WheelEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
  onKeyUp: (event: KeyboardEvent) => void
  onContextMenu: (event: MouseEvent) => void
  onDoubleClick: (event: MouseEvent) => void
}

/**
 * Bind one event path per input source. Touch stays on Touch Events because
 * pinch zoom needs the complete touch list; mouse and pen use Pointer Events
 * so the browser can keep the active gesture captured outside the canvas.
 */
export function bindCanvasInputEvents(
  canvas: HTMLCanvasElement,
  handlers: CanvasInputHandlers
): () => void {
  let activePointerId: number | null = null

  const onPointerStart = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || activePointerId !== null) return
    activePointerId = event.pointerId
    canvas.setPointerCapture?.(event.pointerId)
    handlers.onStart(event)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    if (activePointerId !== null && activePointerId !== event.pointerId) return
    handlers.onMove(event)
  }

  const releasePointer = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return false
    try {
      canvas.releasePointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture may already be implicitly released by the browser.
    } finally {
      activePointerId = null
    }
    return true
  }

  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !releasePointer(event)) return
    handlers.onEnd(event)
  }

  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !releasePointer(event)) return
    handlers.onCancel(event)
  }

  const onTouchStart = (event: TouchEvent) => handlers.onStart(event)
  const onTouchMove = (event: TouchEvent) => handlers.onMove(event)
  const onTouchEnd = (event: TouchEvent) => handlers.onEnd(event)
  const onTouchCancel = (event: TouchEvent) => handlers.onCancel(event)

  canvas.addEventListener('pointerdown', onPointerStart)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerEnd)
  canvas.addEventListener('pointercancel', onPointerCancel)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: false })
  canvas.addEventListener('touchcancel', onTouchCancel, { passive: false })

  return () => {
    if (activePointerId !== null) {
      try {
        canvas.releasePointerCapture?.(activePointerId)
      } catch {
        // Pointer capture may already be implicitly released by the browser.
      } finally {
        activePointerId = null
      }
    }
    canvas.removeEventListener('pointerdown', onPointerStart)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerEnd)
    canvas.removeEventListener('pointercancel', onPointerCancel)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
    canvas.removeEventListener('touchcancel', onTouchCancel)
  }
}

/** Bind non-pointer canvas inputs and window/document cancellation signals. */
export function bindCanvasAuxiliaryEvents(
  canvas: HTMLCanvasElement,
  handlers: CanvasAuxiliaryEventHandlers
): () => void {
  const onBlur = () => handlers.onCancel(new Event('blur'))
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handlers.onCancel(new Event('visibilitychange'))
    }
  }

  window.addEventListener('keydown', handlers.onKeyDown)
  window.addEventListener('keyup', handlers.onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('visibilitychange', onVisibilityChange)
  canvas.addEventListener('contextmenu', handlers.onContextMenu)
  canvas.addEventListener('wheel', handlers.onWheel, { passive: false })
  canvas.addEventListener('dblclick', handlers.onDoubleClick)

  return () => {
    window.removeEventListener('keydown', handlers.onKeyDown)
    window.removeEventListener('keyup', handlers.onKeyUp)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    canvas.removeEventListener('contextmenu', handlers.onContextMenu)
    canvas.removeEventListener('wheel', handlers.onWheel)
    canvas.removeEventListener('dblclick', handlers.onDoubleClick)
  }
}
