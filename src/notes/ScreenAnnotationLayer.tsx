import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ScreenInkState } from './floating'
import type { NotePoint } from './model'
import {
  MAX_SCREEN_POINTS,
  SCREEN_ERASER_RADIUS,
  screenEraserHitTest,
  screenStrokeWidth,
} from './screenInk'
import type { ScreenStroke } from './screenInk'
import './floating.css'
import ScreenInkPaths from './ScreenInkPaths'
import ScreenStrokePreview from './ScreenStrokePreview'
import type { ScreenStrokePreviewHandle } from './ScreenStrokePreview'

const INITIAL: ScreenInkState = {
  strokes: [],
  tool: 'pointer',
  color: '#e05d52',
  size: 'medium',
  inputEnabled: false,
  capturing: false,
  width: 1,
  height: 1,
  background: null,
  source: { app: '', title: '', display: '' },
}

export default function ScreenAnnotationLayer() {
  const bridge = window.mindnotesScreen
  const [state, setState] = useState(INITIAL)
  const preview = useRef<ScreenStrokePreviewHandle>(null)
  const clear = useCallback(() => preview.current?.clear(), [])
  const [erasedIds, setErasedIds] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState<NotePoint | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const generation = useRef(0)
  const gesture = useRef<{
    pointerId: number
    stroke: ScreenStroke | null
    eraser: NotePoint[]
  } | null>(null)
  useEffect(() => {
    if (!bridge) return
    const unsubscribe = bridge.subscribe((patch) =>
      setState((previous) => ({ ...previous, ...patch }))
    )
    void bridge
      .getState()
      .then(setState)
      .catch(() => bridge.releasePointer())
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') bridge.releasePointer()
    }
    window.addEventListener('keydown', escape)
    return () => {
      generation.current += 1
      unsubscribe()
      window.removeEventListener('keydown', escape)
    }
  }, [bridge])
  useEffect(() => {
    const current = gesture.current
    clear()
    generation.current += 1
    gesture.current = null
    if (current && svg.current?.hasPointerCapture(current.pointerId))
      svg.current.releasePointerCapture(current.pointerId)
    setErasedIds(new Set())
    setCursor(null)
  }, [state.tool, state.color, state.size, state.inputEnabled, clear])

  const point = (event: { clientX: number; clientY: number }): NotePoint => ({
    x: Math.max(0, Math.min(state.width, (event.clientX * state.width) / window.innerWidth)),
    y: Math.max(0, Math.min(state.height, (event.clientY * state.height) / window.innerHeight)),
  })
  const erasePreview = (points: NotePoint[]) => {
    const hit = screenEraserHitTest(points)
    setErasedIds((previous) => {
      const next = new Set(previous)
      for (const stroke of state.strokes)
        if (!next.has(stroke.id) && hit(stroke)) next.add(stroke.id)
      return next
    })
  }
  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (
      !state.inputEnabled ||
      event.button !== 0 ||
      gesture.current ||
      (event.pointerType === 'touch' && !event.isPrimary)
    )
      return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A cancelled device contact may disappear before capture is acquired.
      return
    }
    generation.current += 1
    const position = point(event)
    if (state.tool === 'erase') {
      gesture.current = { pointerId: event.pointerId, stroke: null, eraser: [position] }
      erasePreview([position])
    } else if (state.tool === 'pen' || state.tool === 'highlight') {
      const stroke: ScreenStroke = {
        id: crypto.randomUUID(),
        tool: state.tool,
        color: state.color,
        width: screenStrokeWidth(state.tool, state.size),
        points: [position],
      }
      gesture.current = { pointerId: event.pointerId, stroke, eraser: [] }
      preview.current?.begin(stroke)
    }
  }
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!state.inputEnabled) return
    const position = point(event)
    if (state.tool === 'erase') setCursor(position)
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    const points = current.stroke?.points ?? current.eraser
    if (points.length >= MAX_SCREEN_POINTS) return
    const last = points[points.length - 1]
    if (Math.hypot(position.x - last.x, position.y - last.y) < (current.stroke ? 1 : 3)) return
    points.push(position)
    if (current.stroke) preview.current?.append(current.stroke)
    else erasePreview(points.slice(-2))
  }
  const finish = (event: ReactPointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    const points = current.stroke?.points ?? current.eraser
    const end = point(event)
    const last = points[points.length - 1]
    if (points.length < MAX_SCREEN_POINTS && (end.x !== last.x || end.y !== last.y))
      points.push(end)
    if (current.stroke) preview.current?.finish(current.stroke)
    gesture.current = null
    const finishedGeneration = generation.current
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    const pending = current.stroke
      ? bridge?.addStroke(current.stroke)
      : bridge?.erase(current.eraser)
    void pending
      ?.catch(() => bridge?.releasePointer())
      .finally(() => {
        if (generation.current !== finishedGeneration) return
        clear()
        setErasedIds(new Set())
      })
  }
  const cancel = () => {
    const current = gesture.current
    clear()
    generation.current += 1
    gesture.current = null
    if (current && svg.current?.hasPointerCapture(current.pointerId))
      svg.current.releasePointerCapture(current.pointerId)
    setErasedIds(new Set())
  }
  return (
    <main className="screen-ink-surface">
      <svg
        ref={svg}
        className="screen-ink-canvas"
        aria-label="透明屏幕批注层"
        viewBox={`0 0 ${state.width} ${state.height}`}
        preserveAspectRatio="none"
        style={{
          pointerEvents: state.inputEnabled ? 'auto' : 'none',
          cursor: state.tool === 'erase' ? 'none' : 'crosshair',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={(event) => {
          if (gesture.current?.pointerId === event.pointerId) cancel()
        }}
        onLostPointerCapture={(event) => {
          const current = gesture.current
          // A previous pointerup can deliver its lost-capture event after the
          // next stroke has started with the same mouse pointer ID.
          if (
            current?.pointerId === event.pointerId &&
            !event.currentTarget.hasPointerCapture(event.pointerId)
          )
            cancel()
        }}
        onPointerLeave={() => setCursor(null)}
        onContextMenu={(event) => event.preventDefault()}
      >
        {state.background && (
          <image
            href={state.background}
            width={state.width}
            height={state.height}
            preserveAspectRatio="none"
          />
        )}
        <ScreenInkPaths strokes={state.strokes} hidden={erasedIds} />
        <ScreenStrokePreview ref={preview} strokes={state.strokes} />
        {state.tool === 'erase' && state.inputEnabled && cursor && !state.capturing && (
          <circle
            cx={cursor.x}
            cy={cursor.y}
            r={SCREEN_ERASER_RADIUS}
            fill="#ffffff66"
            stroke="#56695d"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </main>
  )
}
