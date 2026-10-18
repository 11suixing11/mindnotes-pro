export type PointerSource = 'pointer' | 'mouse' | 'touch' | 'stylus'

export interface PointerSample {
  source: PointerSource
  pointerId: number
  clientX: number
  clientY: number
  pressure: number
  tiltX: number
  tiltY: number
  button: number
  buttons: number
  isEraser: boolean
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function clampPressure(value: number): number {
  return Math.max(0, Math.min(1, finiteOr(value, 0)))
}

export function getPointerSource(pointerType: string): PointerSource {
  if (pointerType === 'mouse') return 'mouse'
  if (pointerType === 'touch') return 'touch'
  if (pointerType === 'pen') return 'stylus'
  return 'pointer'
}

/** Pen eraser/barrel input uses the standardized eraser button (5) or bit (32). */
export function isEraserPointerEvent(
  event: Pick<PointerEvent, 'pointerType' | 'button' | 'buttons'>
): boolean {
  return event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) !== 0)
}

export function parsePointerEvent(event: PointerEvent): PointerSample {
  return {
    source: getPointerSource(event.pointerType),
    pointerId: finiteOr(event.pointerId, 0),
    clientX: finiteOr(event.clientX, 0),
    clientY: finiteOr(event.clientY, 0),
    pressure: clampPressure(event.pressure),
    tiltX: finiteOr(event.tiltX, 0),
    tiltY: finiteOr(event.tiltY, 0),
    button: finiteOr(event.button, -1),
    buttons: finiteOr(event.buttons, 0),
    isEraser: isEraserPointerEvent(event),
  }
}

function sampleKey(event: PointerEvent): string {
  return [
    event.pointerId,
    event.timeStamp,
    event.pointerType,
    event.clientX,
    event.clientY,
    event.pressure,
    event.tiltX,
    event.tiltY,
    event.button,
    event.buttons,
  ].join('|')
}

/** Return coalesced pointer events in browser order, followed by the dispatch event. */
export function getCoalescedPointerEvents(event: PointerEvent): PointerEvent[] {
  let coalesced: PointerEvent[] = []
  if (typeof event.getCoalescedEvents === 'function') {
    try {
      coalesced = event.getCoalescedEvents()
    } catch {
      coalesced = []
    }
  }

  const events = [...coalesced, event]
  const seen = new Set<string>()
  const samples: PointerEvent[] = []
  for (const sampleEvent of events) {
    const key = sampleKey(sampleEvent)
    if (seen.has(key)) continue
    seen.add(key)
    samples.push(sampleEvent)
  }
  return samples
}

export function getPointerSamples(event: PointerEvent): PointerSample[] {
  return getCoalescedPointerEvents(event).map(parsePointerEvent)
}
