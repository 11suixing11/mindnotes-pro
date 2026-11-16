import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useMemo } from 'react'
import type { ScreenStroke } from './screenInk'

export interface ScreenStrokePreviewHandle {
  begin(stroke: ScreenStroke): void
  append(stroke: ScreenStroke): void
  finish(stroke: ScreenStroke): void
  clear(): void
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** React owns only the host; this controller owns its sole visible primitive. */
function createPreviewController() {
  let host: SVGGElement | null = null
  let source: ScreenStroke | null = null
  let brush: Omit<ScreenStroke, 'points'> | null = null
  let primitive: SVGCircleElement | SVGPolylineElement | null = null
  let drawing = false
  let applied = 0
  let native: { list: SVGPointList; svg: SVGSVGElement } | null = null
  let prefix = ''
  let epoch = 0
  let pending: { epoch: number } | null = null

  const invalidate = () => {
    epoch += 1
    pending = null
  }

  const clear = () => {
    invalidate()
    primitive?.remove()
    primitive = null
    source = null
    brush = null
    drawing = false
    applied = 0
    native = null
    prefix = ''
  }

  const appendPoints = (line: SVGPolylineElement, stroke: ScreenStroke, from: number) => {
    const count = stroke.points.length
    if (native) {
      try {
        for (let index = from; index < count; index++) {
          // SVG list members have ownership: reusing one point can move the old item.
          const point = native.svg.createSVGPoint()
          point.x = stroke.points[index].x
          point.y = stroke.points[index].y
          native.list.appendItem(point)
          applied = index + 1
        }
        return
      } catch {
        // A partial native append must retain every accepted canonical sample.
        native = null
        prefix = ''
        from = 0
      }
    }
    for (let index = from; index < count; index++) {
      const { x, y } = stroke.points[index]
      prefix += `${prefix ? ' ' : ''}${x},${y}`
    }
    line.setAttribute('points', prefix)
    applied = count
  }

  const flush = (stroke: ScreenStroke) => {
    if (!host || !drawing || source !== stroke || !brush || stroke.points.length <= applied) return
    if (primitive?.tagName === 'circle') {
      const line = host.ownerDocument.createElementNS(SVG_NS, 'polyline')
      line.setAttribute('data-stroke-id', brush.id)
      line.setAttribute('fill', 'none')
      line.setAttribute('stroke', brush.color)
      line.setAttribute('stroke-width', String(brush.width))
      line.setAttribute('stroke-linecap', 'round')
      line.setAttribute('stroke-linejoin', 'round')
      line.setAttribute('opacity', brush.tool === 'highlight' ? '0.3' : '1')
      const svg = host.ownerSVGElement
      try {
        const list = line.points
        native =
          svg && typeof svg.createSVGPoint === 'function' && typeof list?.appendItem === 'function'
            ? { list, svg }
            : null
      } catch {
        native = null
      }
      appendPoints(line, stroke, 0)
      host.replaceChild(line, primitive)
      primitive = line
    } else if (primitive) {
      appendPoints(primitive as SVGPolylineElement, stroke, applied)
    }
  }

  const append = (stroke: ScreenStroke) => {
    if (!host || !drawing || source !== stroke || stroke.points.length <= applied || pending) return
    const job = { epoch }
    pending = job
    queueMicrotask(() => {
      // Invalidated callbacks still run; they must not consume a successor's queued suffix.
      if (!host || !drawing || source !== stroke || pending !== job || epoch !== job.epoch) return
      pending = null
      flush(stroke)
    })
  }

  return {
    clear,
    begin(stroke: ScreenStroke) {
      clear()
      if (!host || !stroke.points.length) return
      source = stroke
      brush = { id: stroke.id, tool: stroke.tool, color: stroke.color, width: stroke.width }
      drawing = true
      const dot = host.ownerDocument.createElementNS(SVG_NS, 'circle')
      dot.setAttribute('data-stroke-id', brush.id)
      dot.setAttribute('cx', String(stroke.points[0].x))
      dot.setAttribute('cy', String(stroke.points[0].y))
      dot.setAttribute('r', String(brush.width / 2))
      dot.setAttribute('fill', brush.color)
      dot.setAttribute('opacity', brush.tool === 'highlight' ? '0.3' : '1')
      host.appendChild(dot)
      primitive = dot
      applied = 1
      flush(stroke)
    },
    append,
    finish(stroke: ScreenStroke) {
      if (!drawing || source !== stroke) return
      invalidate()
      flush(stroke)
      drawing = false
    },
    mount(next: SVGGElement | null) {
      if (host === next) return
      clear()
      host = next
    },
    suppressCommitted(strokes: ScreenStroke[]) {
      if (brush && strokes.some((stroke) => stroke.id === brush?.id)) clear()
    },
  }
}

const ScreenStrokePreview = forwardRef<ScreenStrokePreviewHandle, { strokes: ScreenStroke[] }>(
  function ScreenStrokePreview({ strokes }, ref) {
    const controller = useMemo(createPreviewController, [])
    const mount = useCallback((host: SVGGElement | null) => controller.mount(host), [controller])
    useImperativeHandle(ref, () => controller, [controller])
    useLayoutEffect(() => controller.suppressCommitted(strokes), [controller, strokes])
    return <g ref={mount} />
  }
)

export default ScreenStrokePreview
