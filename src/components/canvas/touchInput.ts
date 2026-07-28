export const DEFAULT_INPUT_PRESSURE = 0.5

const PALM_RADIUS_PX = 32
const PALM_AREA_PX = 700

type TouchWithOptionalType = Touch & {
  touchType?: string
}

export interface InputContact {
  identifier: number | null
  clientX: number
  clientY: number
  pressure?: number
  source: 'mouse' | 'touch' | 'stylus'
}

function clampPressure(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(1, value))
}

function touchListToArray(touches: TouchList | Touch[]): Touch[] {
  const result: Touch[] = []
  for (let i = 0; i < touches.length; i += 1) {
    const touch = touches[i]
    if (touch) result.push(touch)
  }
  return result
}

export function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent {
  return 'touches' in event
}

export function isStylusTouch(touch: Touch): boolean {
  return (touch as TouchWithOptionalType).touchType === 'stylus'
}

export function isPalmTouch(touch: Touch): boolean {
  if (isStylusTouch(touch)) return false

  const radiusX = Number.isFinite(touch.radiusX) ? touch.radiusX : 0
  const radiusY = Number.isFinite(touch.radiusY) ? touch.radiusY : 0
  const maxRadius = Math.max(radiusX, radiusY)
  const area = radiusX * radiusY

  return maxRadius >= PALM_RADIUS_PX || area >= PALM_AREA_PX
}

export function toInputContact(touch: Touch): InputContact {
  const force = clampPressure(touch.force)
  const pressure = force === undefined || force <= 0 ? undefined : force
  return {
    identifier: touch.identifier,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pressure,
    source: isStylusTouch(touch) ? 'stylus' : 'touch',
  }
}

export function getAcceptedTouches(touches: TouchList | Touch[]): InputContact[] {
  return touchListToArray(touches)
    .filter((touch) => !isPalmTouch(touch))
    .map((touch) => toInputContact(touch))
}

export function findAcceptedTouch(
  touches: TouchList | Touch[],
  identifier: number
): InputContact | null {
  for (const touch of touchListToArray(touches)) {
    if (touch.identifier === identifier && !isPalmTouch(touch)) {
      return toInputContact(touch)
    }
  }
  return null
}

export function changedTouchesInclude(event: TouchEvent, identifier: number): boolean {
  for (const touch of touchListToArray(event.changedTouches)) {
    if (touch.identifier === identifier) return true
  }
  return false
}

export function getEventInputContact(
  event: MouseEvent | TouchEvent,
  activeTouchId: number | null
): InputContact | null {
  if (isTouchEvent(event)) {
    if (activeTouchId !== null) {
      return findAcceptedTouch(event.touches, activeTouchId)
    }
    const accepted = getAcceptedTouches(
      event.touches.length > 0 ? event.touches : event.changedTouches
    )
    return accepted[0] ?? null
  }

  return {
    identifier: null,
    clientX: event.clientX,
    clientY: event.clientY,
    pressure: clampPressure('pressure' in event ? (event as PointerEvent).pressure : undefined),
    source: 'mouse',
  }
}
