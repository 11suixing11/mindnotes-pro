import { describe, expect, it } from 'vitest'
import {
  changedTouchesInclude,
  findAcceptedTouch,
  getAcceptedTouches,
  isPalmTouch,
  isStylusTouch,
} from './touchInput'

function touch(overrides: Partial<Touch> & { identifier: number }): Touch {
  return {
    identifier: overrides.identifier,
    target: document.body,
    clientX: overrides.clientX ?? 0,
    clientY: overrides.clientY ?? 0,
    pageX: overrides.pageX ?? overrides.clientX ?? 0,
    pageY: overrides.pageY ?? overrides.clientY ?? 0,
    screenX: overrides.screenX ?? overrides.clientX ?? 0,
    screenY: overrides.screenY ?? overrides.clientY ?? 0,
    radiusX: overrides.radiusX ?? 10,
    radiusY: overrides.radiusY ?? 10,
    rotationAngle: overrides.rotationAngle ?? 0,
    force: overrides.force ?? 0.5,
    ...(overrides as Record<string, unknown>),
  } as Touch
}

function touchEvent(type: string, touches: Touch[], changedTouches = touches): TouchEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent
  Object.defineProperty(event, 'touches', { value: touches })
  Object.defineProperty(event, 'changedTouches', { value: changedTouches })
  Object.defineProperty(event, 'targetTouches', { value: touches })
  return event
}

describe('touchInput', () => {
  it('rejects large-radius palm contacts', () => {
    expect(isPalmTouch(touch({ identifier: 1, radiusX: 38, radiusY: 30 }))).toBe(true)
    expect(isPalmTouch(touch({ identifier: 2, radiusX: 12, radiusY: 11 }))).toBe(false)
  })

  it('does not reject stylus contacts as palms', () => {
    const stylus = touch({
      identifier: 1,
      radiusX: 40,
      radiusY: 35,
      touchType: 'stylus',
    } as Partial<Touch> & { identifier: number; touchType: string })

    expect(isStylusTouch(stylus)).toBe(true)
    expect(isPalmTouch(stylus)).toBe(false)
  })

  it('returns only accepted touch contacts with clamped pressure', () => {
    const accepted = getAcceptedTouches([
      touch({ identifier: 1, clientX: 10, clientY: 20, force: 1.5 }),
      touch({ identifier: 2, clientX: 100, clientY: 120, radiusX: 42, radiusY: 40 }),
    ])

    expect(accepted).toEqual([
      {
        identifier: 1,
        clientX: 10,
        clientY: 20,
        pressure: 1,
        source: 'touch',
      },
    ])
  })

  it('treats zero force as no pressure data', () => {
    expect(getAcceptedTouches([touch({ identifier: 1, force: 0 })])[0]).toMatchObject({
      identifier: 1,
      pressure: undefined,
    })
  })

  it('finds active touches and changed touches by identifier', () => {
    const active = touch({ identifier: 7, clientX: 30, clientY: 40 })
    const ended = touch({ identifier: 9 })

    expect(findAcceptedTouch([active], 7)).toMatchObject({ identifier: 7, clientX: 30 })
    expect(findAcceptedTouch([active], 8)).toBeNull()
    expect(changedTouchesInclude(touchEvent('touchend', [], [ended]), 9)).toBe(true)
  })
})
