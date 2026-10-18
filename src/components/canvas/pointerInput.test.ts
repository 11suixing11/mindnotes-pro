import { describe, expect, it } from 'vitest'
import {
  getPointerSamples,
  getPointerSource,
  isEraserPointerEvent,
  parsePointerEvent,
} from './pointerInput'

function pointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    pointerId: 1,
    pointerType: 'pen',
    clientX: 10,
    clientY: 20,
    pressure: 0.5,
    tiltX: 12,
    tiltY: -8,
    button: 0,
    buttons: 1,
    timeStamp: 1,
    ...overrides,
  } as PointerEvent
}

describe('pointer input parsing', () => {
  it('maps pointer types and normalizes pointer fields', () => {
    expect(getPointerSource('mouse')).toBe('mouse')
    expect(getPointerSource('touch')).toBe('touch')
    expect(getPointerSource('pen')).toBe('stylus')
    expect(getPointerSource('other')).toBe('pointer')

    expect(parsePointerEvent(pointerEvent({ pressure: 2, tiltX: Number.NaN }))).toMatchObject({
      source: 'stylus',
      pressure: 1,
      tiltX: 0,
      tiltY: -8,
      buttons: 1,
      isEraser: false,
    })
  })

  it('detects only pen eraser button and buttons-bit signals', () => {
    expect(isEraserPointerEvent(pointerEvent({ button: 5 }))).toBe(true)
    expect(isEraserPointerEvent(pointerEvent({ buttons: 32 }))).toBe(true)
    expect(isEraserPointerEvent(pointerEvent({ pointerType: 'mouse', button: 5 }))).toBe(false)
    expect(isEraserPointerEvent(pointerEvent({ button: 2, buttons: 2 }))).toBe(false)
  })

  it('uses coalesced events in order, removes duplicates, and appends the dispatch event', () => {
    const first = pointerEvent({ clientX: 1, timeStamp: 1 })
    const second = pointerEvent({ clientX: 2, timeStamp: 2 })
    const event = pointerEvent({ clientX: 3, timeStamp: 3 })
    Object.defineProperty(event, 'getCoalescedEvents', {
      value: () => [first, second, second, event],
    })

    expect(getPointerSamples(event).map((sample) => sample.clientX)).toEqual([1, 2, 3])
  })

  it('falls back to the event when coalesced samples are unavailable', () => {
    const event = pointerEvent({ pointerType: 'mouse', pressure: 0 })
    expect(getPointerSamples(event)).toEqual([parsePointerEvent(event)])
  })
})
