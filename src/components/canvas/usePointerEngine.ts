import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '../../store/useThemeStore'
import type { CanvasElement, ShapeElement, TextElement, ShapeKind } from '../../store/types'
import { simplifyPts, distToSeg, elementBounds } from '../../canvas/canvasUtils'
import { drawElement } from '../../canvas/canvasDrawing'

export function usePointerEngine(opts: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cachedBounds: (el: CanvasElement) => { x: number; y: number; w: number; h: number }
  scheduleRedraw: () => void
  startEditText: (
    x: number,
    y: number,
    screenX: number,
    screenY: number,
    color: string,
    existing?: { id: string; content: string; fontSize: number }
  ) => void
  textRef: React.RefObject<HTMLTextAreaElement | null>
  findSnaps: (
    bounds: { x: number; y: number; w: number; h: number },
    exclude: Set<string>
  ) => { dx: number; dy: number; linesX: number[]; linesY: number[] }
  snapLinesRef: React.MutableRefObject<{ x: number[]; y: number[] }>
}) {
  const {
    canvasRef,
    cachedBounds,
    scheduleRedraw,
    startEditText,
    textRef,
    findSnaps,
    snapLinesRef,
  } = opts

  // Store selectors
  const {
    addElement,
    removeElement,
    moveElementById,
    moveElementsById,
    resizeElementById,
    setSelectedIds,
  } = useAppStore(
    useShallow((s) => ({
      addElement: s.addElement,
      removeElement: s.removeElement,
      moveElementById: s.moveElementById,
      moveElementsById: s.moveElementsById,
      resizeElementById: s.resizeElementById,
      setSelectedIds: s.setSelectedIds,
    }))
  )
  const { startPan, updatePan, endPan, isPanning } = useViewStore(
    useShallow((s) => ({
      startPan: s.startPan,
      updatePan: s.updatePan,
      endPan: s.endPan,
      isPanning: s.isPanning,
    }))
  )

  // Value refs for use inside event handlers
  const tool = useAppStore((s) => s.tool)
  const color = useAppStore((s) => s.color)
  const size = useAppStore((s) => s.size)
  const brush = useAppStore((s) => s.brush)
  const fillColor = useAppStore((s) => s.fillColor)
  const viewBox = useViewStore((s) => s.viewBox)

  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const sizeRef = useRef(size)
  const brushRef = useRef(brush)
  const fillColorRef = useRef(fillColor)
  const viewBoxRef = useRef(viewBox)

  useEffect(() => {
    toolRef.current = tool
  }, [tool])
  useEffect(() => {
    colorRef.current = color
  }, [color])
  useEffect(() => {
    sizeRef.current = size
  }, [size])
  useEffect(() => {
    brushRef.current = brush
  }, [brush])
  useEffect(() => {
    fillColorRef.current = fillColor
  }, [fillColor])
  useEffect(() => {
    viewBoxRef.current = viewBox
  }, [viewBox])

  // Drawing state
  const drawingRef = useRef(false)
  const currentPtsRef = useRef<number[][]>([])
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<ShapeElement | null>(null)
  const erasedRef = useRef<Set<string>>(new Set())
  const preEraseSnapshotRef = useRef<CanvasElement[] | null>(null)
  const dragRef = useRef<{
    x: number
    y: number
    id: string
    startPositions?: Map<string, { x: number; y: number }>
  } | null>(null)
  const resizeRef = useRef<{
    handle: number
    id: string
    startX: number
    startY: number
    origBounds: { x: number; y: number; w: number; h: number }
    origElement: CanvasElement | null
  } | null>(null)
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(
    null
  )
  const mouseRef = useRef<{ x: number; y: number } | null>(null)

  const getPos = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const vb = viewBoxRef.current
      let cx: number, cy: number
      if ('touches' in e && e.touches.length > 0) {
        cx = e.touches[0].clientX
        cy = e.touches[0].clientY
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        cx = e.changedTouches[0].clientX
        cy = e.changedTouches[0].clientY
      } else {
        cx = (e as MouseEvent).clientX
        cy = (e as MouseEvent).clientY
      }
      return { x: (cx - rect.left) / vb.zoom + vb.x, y: (cy - rect.top) / vb.zoom + vb.y }
    },
    [canvasRef]
  )

  function hitTest(px: number, py: number): string | null {
    const r = 12 / (viewBoxRef.current.zoom || 1)
    const els = useAppStore.getState().elements
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      if (el.type === 'image') {
        if (
          px >= el.x - r &&
          px <= el.x + el.width + r &&
          py >= el.y - r &&
          py <= el.y + el.height + r
        )
          return el.id
      } else if (el.type === 'text') {
        if (
          px >= el.x - r &&
          px <= el.x + (el.width || 100) + r &&
          py >= el.y - r &&
          py <= el.y + (el.height || 30) + r
        )
          return el.id
      } else if (el.type === 'shape') {
        const b = cachedBounds(el)
        if (px >= b.x - r && px <= b.x + b.w + r && py >= b.y - r && py <= b.y + b.h + r)
          return el.id
      } else if (el.type === 'stroke' && el.points.length >= 2) {
        for (let j = 1; j < el.points.length; j++) {
          if (
            distToSeg(
              px,
              py,
              el.points[j - 1][0],
              el.points[j - 1][1],
              el.points[j][0],
              el.points[j][1]
            ) <
            r + el.size / 2
          )
            return el.id
        }
      }
    }
    return null
  }

  function hitHandle(
    px: number,
    py: number
  ): { handle: number; id: string; bounds: { x: number; y: number; w: number; h: number } } | null {
    const selIds = useAppStore.getState().selectedIds
    if (selIds.length === 0) return null
    const hr = 10 / (viewBoxRef.current.zoom || 1)
    const els = useAppStore.getState().elements
    for (const selId of selIds) {
      const el = els.find((e) => e.id === selId)
      if (!el) continue
      const b = cachedBounds(el)
      const corners: [number, number][] = [
        [b.x, b.y],
        [b.x + b.w, b.y],
        [b.x, b.y + b.h],
        [b.x + b.w, b.y + b.h],
      ]
      for (let i = 0; i < 4; i++) {
        if (Math.abs(px - corners[i][0]) < hr && Math.abs(py - corners[i][1]) < hr)
          return { handle: i, id: selId, bounds: b }
      }
    }
    return null
  }

  function eraseAt(x: number, y: number) {
    const r = sizeRef.current * 2 + 10,
      r2 = r * r
    const state = useAppStore.getState()
    for (const el of state.elements) {
      if (erasedRef.current.has(el.id)) continue
      if (el.type === 'stroke') {
        const segments: number[][][] = []
        let cur: number[][] = []
        let hit = false
        for (const p of el.points) {
          if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r2) {
            hit = true
            if (cur.length >= 2) segments.push(cur)
            cur = []
          } else cur.push(p)
        }
        if (cur.length >= 2) segments.push(cur)
        if (!hit) continue
        erasedRef.current.add(el.id)
        removeElement(el.id)
        for (const seg of segments)
          addElement({
            ...el,
            id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            points: seg,
          })
      } else {
        const b = cachedBounds(el)
        if (x >= b.x - r && x <= b.x + b.w + r && y >= b.y - r && y <= b.y + b.h + r) {
          erasedRef.current.add(el.id)
          removeElement(el.id)
        }
      }
    }
  }

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getPos(e)
      const curTool = toolRef.current,
        curColor = colorRef.current,
        curSize = sizeRef.current,
        curFillColor = fillColorRef.current,
        curVB = viewBoxRef.current
      if (curTool === 'pan') {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        startPan(cx, cy)
        return
      }
      if (curTool === 'select') {
        const h = hitHandle(pos.x, pos.y)
        if (h) {
          const el = useAppStore.getState().elements.find((e) => e.id === h.id)
          if (el)
            resizeRef.current = { ...h, startX: pos.x, startY: pos.y, origBounds: cachedBounds(el), origElement: { ...el } as CanvasElement }
          scheduleRedraw()
          return
        }
        const hit = hitTest(pos.x, pos.y)
        if (hit) {
          const st = useAppStore.getState()
          const ids = st.selectedIds.includes(hit) ? st.selectedIds : [hit]
          if (!st.selectedIds.includes(hit)) setSelectedIds([hit])
          const startPositions = new Map<string, { x: number; y: number }>()
          for (const el of st.elements) {
            if (ids.includes(el.id)) {
              if (el.type === 'stroke')
                startPositions.set(el.id, { x: el.points[0]?.[0] ?? 0, y: el.points[0]?.[1] ?? 0 })
              else startPositions.set(el.id, { x: (el as any).x ?? 0, y: (el as any).y ?? 0 })
            }
          }
          dragRef.current = { x: pos.x, y: pos.y, id: hit, startPositions }
          scheduleRedraw()
          return
        }
        marqueeRef.current = { startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y }
        setSelectedIds([])
        scheduleRedraw()
        return
      }
      if (curTool === 'text') {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const screenX = (pos.x - curVB.x) * curVB.zoom + rect.left
          const screenY = (pos.y - curVB.y) * curVB.zoom + rect.top
          const hitEl = hitTest(pos.x, pos.y)
          const existing = hitEl
            ? (useAppStore.getState().elements.find((e) => e.id === hitEl && e.type === 'text') as
                | TextElement
                | undefined)
            : undefined
          if (existing)
            startEditText(
              existing.x,
              existing.y,
              (existing.x - curVB.x) * curVB.zoom + rect.left,
              (existing.y - curVB.y) * curVB.zoom + rect.top,
              existing.color,
              { id: existing.id, content: existing.content, fontSize: existing.fontSize }
            )
          else startEditText(pos.x, pos.y, screenX, screenY, curColor)
          setTimeout(() => textRef.current?.focus(), 50)
        }
        return
      }
      drawingRef.current = true
      erasedRef.current = new Set()
      if (curTool === 'pen') currentPtsRef.current = [[pos.x, pos.y]]
      else if (curTool === 'eraser') {
        preEraseSnapshotRef.current = useAppStore.getState().elements.map((el) => ({ ...el } as CanvasElement))
        eraseAt(pos.x, pos.y)
      }
      else {
        shapeStartRef.current = pos
        currentShapeRef.current = {
          type: 'shape',
          id: `shape-${Date.now()}`,
          kind: curTool as ShapeKind,
          x: pos.x,
          y: pos.y,
          w: 0,
          h: 0,
          color: curColor,
          size: curSize,
          fillColor: curFillColor !== 'transparent' ? curFillColor : undefined,
        }
      }
    },
    [
      getPos,
      startPan,
      setSelectedIds,
      scheduleRedraw,
      startEditText,
      textRef,
      cachedBounds,
      canvasRef,
      addElement,
      removeElement,
      hitTest,
      hitHandle,
      eraseAt,
    ]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getPos(e)
      mouseRef.current = pos
      const curTool = toolRef.current
      if (curTool === 'select' && resizeRef.current) {
        const { handle, id, startX, startY, origBounds: ob } = resizeRef.current
        const anchors: [number, number][] = [
          [ob.x + ob.w, ob.y + ob.h],
          [ob.x, ob.y + ob.h],
          [ob.x + ob.w, ob.y],
          [ob.x, ob.y],
        ]
        const ax = anchors[handle][0],
          ay = anchors[handle][1]
        const corners: [number, number][] = [
          [ob.x, ob.y],
          [ob.x + ob.w, ob.y],
          [ob.x, ob.y + ob.h],
          [ob.x + ob.w, ob.y + ob.h],
        ]
        const orig = corners[handle],
          totalDx = pos.x - startX,
          totalDy = pos.y - startY
        const targetX = orig[0] + totalDx,
          targetY = orig[1] + totalDy
        if (ob.w < 1 || ob.h < 1) {
          scheduleRedraw()
          return
        }
        const nsx = Math.max(
          0.1,
          Math.min(
            10,
            handle === 0 || handle === 2
              ? (targetX - ax) / (orig[0] - ax || 1)
              : (ax - targetX) / (ax - orig[0] || 1)
          )
        )
        const nsy = Math.max(
          0.1,
          Math.min(
            10,
            handle === 0 || handle === 1
              ? (targetY - ay) / (orig[1] - ay || 1)
              : (ay - targetY) / (ay - orig[1] || 1)
          )
        )
        resizeElementById(id, ax, ay, nsx, nsy)
        scheduleRedraw()
        return
      }
      if (curTool === 'select' && marqueeRef.current) {
        marqueeRef.current = { ...marqueeRef.current, endX: pos.x, endY: pos.y }
        scheduleRedraw()
        return
      }
      if (curTool === 'select' && dragRef.current) {
        let dx = pos.x - dragRef.current.x,
          dy = pos.y - dragRef.current.y
        const st = useAppStore.getState()
        const ids = st.selectedIds.length > 0 ? st.selectedIds : [dragRef.current.id]
        const idSet = new Set(ids)
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        for (const el of st.elements) {
          if (!idSet.has(el.id)) continue
          const b = cachedBounds(el)
          minX = Math.min(minX, b.x)
          minY = Math.min(minY, b.y)
          maxX = Math.max(maxX, b.x + b.w)
          maxY = Math.max(maxY, b.y + b.h)
        }
        const snap = findSnaps(
          { x: minX + dx, y: minY + dy, w: maxX - minX, h: maxY - minY },
          idSet
        )
        dx += snap.dx
        dy += snap.dy
        snapLinesRef.current = { x: snap.linesX, y: snap.linesY }
        if (ids.length > 1) moveElementsById(ids, dx, dy)
        else moveElementById(dragRef.current.id, dx, dy)
        dragRef.current = { x: pos.x + snap.dx, y: pos.y + snap.dy, id: dragRef.current.id }
        scheduleRedraw()
        return
      }
      if (curTool === 'pan' && isPanning) {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        updatePan(cx, cy)
        scheduleRedraw()
        return
      }
      if (curTool === 'eraser') {
        if (drawingRef.current) eraseAt(pos.x, pos.y)
        scheduleRedraw()
        return
      }
      if (!drawingRef.current) return
      if (curTool === 'pen') currentPtsRef.current.push([pos.x, pos.y])
      else if (shapeStartRef.current && currentShapeRef.current) {
        let w = pos.x - shapeStartRef.current.x,
          h = pos.y - shapeStartRef.current.y
        const shift = 'shiftKey' in e && (e as MouseEvent).shiftKey
        if (
          shift &&
          (currentShapeRef.current.kind === 'rectangle' ||
            currentShapeRef.current.kind === 'circle')
        ) {
          const sz = Math.max(Math.abs(w), Math.abs(h))
          w = sz * Math.sign(w || 1)
          h = sz * Math.sign(h || 1)
        }
        currentShapeRef.current = { ...currentShapeRef.current, w, h }
      }
      scheduleRedraw()
    },
    [
      getPos,
      isPanning,
      updatePan,
      scheduleRedraw,
      moveElementById,
      moveElementsById,
      resizeElementById,
      cachedBounds,
      findSnaps,
      snapLinesRef,
    ]
  )

  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const curColor = colorRef.current,
        curSize = sizeRef.current,
        curBrush = brushRef.current
      if (drawingRef.current) {
        drawingRef.current = false
        const curTool = toolRef.current
        if (curTool === 'pen') {
          if (currentPtsRef.current.length >= 1) {
            let pts = currentPtsRef.current
            if (pts.length === 1) {
              pts = [pts[0], [pts[0][0] + 0.1, pts[0][1] + 0.1]]
            }
            const el: any = {
              type: 'stroke',
              id: `stroke-${Date.now()}`,
              points: simplifyPts(pts, 1),
              color: curColor,
              size: curSize,
              brush: curBrush,
            }
            if (curBrush === 'highlighter') el.opacity = 0.3
            addElement(el)
          }
          currentPtsRef.current = []
        } else if (curTool === 'eraser') {
          if (preEraseSnapshotRef.current && erasedRef.current.size > 0) {
            useAppStore.getState().batchErase(preEraseSnapshotRef.current, [])
          }
          preEraseSnapshotRef.current = null
          currentPtsRef.current = []
        }
        else if (currentShapeRef.current) {
          if (Math.abs(currentShapeRef.current.w) > 2 || Math.abs(currentShapeRef.current.h) > 2)
            addElement(currentShapeRef.current)
          currentShapeRef.current = null
          shapeStartRef.current = null
        }
        scheduleRedraw()
        return
      }
      const curTool = toolRef.current
      if (curTool === 'select') {
        if (marqueeRef.current) {
          const m = marqueeRef.current
          const x1 = Math.min(m.startX, m.endX),
            y1 = Math.min(m.startY, m.endY),
            x2 = Math.max(m.startX, m.endX),
            y2 = Math.max(m.startY, m.endY)
          if (x2 - x1 > 3 || y2 - y1 > 3) {
            const els = useAppStore.getState().elements
            const hits: string[] = []
            for (const el of els) {
              const b = cachedBounds(el)
              if (b.x + b.w >= x1 && b.x <= x2 && b.y + b.h >= y1 && b.y <= y2) hits.push(el.id)
            }
            setSelectedIds(hits)
          }
          marqueeRef.current = null
        }
        if (dragRef.current?.startPositions) {
          const st = useAppStore.getState()
          const sp = dragRef.current.startPositions
          const deltas: { id: string; dx: number; dy: number }[] = []
          for (const el of st.elements) {
            const startPos = sp.get(el.id)
            if (!startPos) continue
            let cx: number, cy: number
            if (el.type === 'stroke') {
              cx = el.points[0]?.[0] ?? 0
              cy = el.points[0]?.[1] ?? 0
            } else {
              cx = (el as any).x ?? 0
              cy = (el as any).y ?? 0
            }
            const dx = cx - startPos.x,
              dy = cy - startPos.y
            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) deltas.push({ id: el.id, dx, dy })
          }
          if (deltas.length > 0) useAppStore.getState().pushUndo({ type: 'move', deltas })
        }
        if (resizeRef.current?.origElement) {
          const afterEl = useAppStore.getState().elements.find((e) => e.id === resizeRef.current!.id)
          if (afterEl) {
            useAppStore.getState().pushUndo({
              type: 'clear',
              snapshot: useAppStore.getState().elements.map((e) =>
                e.id === resizeRef.current!.id ? resizeRef.current!.origElement! : e
              ),
            })
          }
        }
        dragRef.current = null
        resizeRef.current = null
        snapLinesRef.current = { x: [], y: [] }
        scheduleRedraw()
        return
      }
      if (curTool === 'pan') {
        endPan()
        return
      }
    },
    [addElement, endPan, setSelectedIds, scheduleRedraw, cachedBounds]
  )

  // Pointer events
  const handleStartRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleEndRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  useEffect(() => {
    handleStartRef.current = (e) => handleStart(e)
  }, [handleStart])
  useEffect(() => {
    handleMoveRef.current = (e) => handleMove(e)
  }, [handleMove])
  useEffect(() => {
    handleEndRef.current = (e) => handleEnd(e)
  }, [handleEnd])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onStart = (e: MouseEvent | TouchEvent) => handleStartRef.current(e)
    const onMove = (e: MouseEvent | TouchEvent) => handleMoveRef.current(e)
    const onEnd = (e: MouseEvent | TouchEvent) => handleEndRef.current(e)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const vb = useViewStore.getState().viewBox
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const newZoom = Math.max(0.2, Math.min(5, vb.zoom * zoomFactor))
      const worldX = mouseX / vb.zoom + vb.x
      const worldY = mouseY / vb.zoom + vb.y
      const newX = worldX - mouseX / newZoom
      const newY = worldY - mouseY / newZoom
      useViewStore.getState().setViewBox({ x: newX, y: newY, zoom: newZoom })
      scheduleRedraw()
    }
    canvas.addEventListener('mousedown', onStart)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onEnd)
    canvas.addEventListener('mouseleave', onEnd)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onEnd, { passive: false })
    return () => {
      canvas.removeEventListener('mousedown', onStart)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseup', onEnd)
      canvas.removeEventListener('mouseleave', onEnd)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onEnd)
    }
  }, [canvasRef])

  // Touch pinch zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let pinching = false,
      pinchDist = 0,
      pinchMid = { x: 0, y: 0 }
    function getTouchDist(e: TouchEvent) {
      const dx = e.touches[0].clientX - e.touches[1].clientX,
        dy = e.touches[0].clientY - e.touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    function getTouchMid(e: TouchEvent) {
      return {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    }
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinching = true
        pinchDist = getTouchDist(e)
        pinchMid = getTouchMid(e)
        e.preventDefault()
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!pinching || e.touches.length < 2) return
      e.preventDefault()
      const newDist = getTouchDist(e),
        newMid = getTouchMid(e),
        scale = newDist / pinchDist
      const vb = useViewStore.getState().viewBox
      const newZoom = vb.zoom * scale
      const dx = (newMid.x - pinchMid.x) / newZoom,
        dy = (newMid.y - pinchMid.y) / newZoom
      useViewStore.getState().setViewBox({
        x: vb.x - dx,
        y: vb.y - dy,
        zoom: newZoom,
      })
      pinchDist = newDist
      pinchMid = newMid
      scheduleRedraw()
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinching = false
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [canvasRef, scheduleRedraw])

  // Cursor
  const cursorMap: Record<string, string> = {
    select: 'default',
    pen: 'crosshair',
    eraser: 'none',
    pan: 'grab',
    text: 'text',
    rectangle: 'crosshair',
    circle: 'crosshair',
    arrow: 'crosshair',
    line: 'crosshair',
  }
  function getCursor() {
    if (isPanning) return 'grabbing'
    if (toolRef.current === 'select' && mouseRef.current) {
      const h = hitHandle(mouseRef.current.x, mouseRef.current.y)
      if (h) return ['nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize'][h.handle]
    }
    return cursorMap[toolRef.current] ?? 'crosshair'
  }

  // Copy to clipboard
  async function copySelectedToSystemClipboard() {
    const selIds = useAppStore.getState().selectedIds
    if (selIds.length === 0) return
    const els = useAppStore.getState().elements
    const selEls = els.filter((e) => selIds.includes(e.id))
    if (selEls.length === 0) return
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const el of selEls) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }
    const pad = 8,
      w = maxX - minX + pad * 2,
      h = maxY - minY + pad * 2
    const offscreen = document.createElement('canvas')
    const odpr = window.devicePixelRatio || 1
    offscreen.width = w * odpr
    offscreen.height = h * odpr
    const octx = offscreen.getContext('2d')
    if (!octx) return
    octx.setTransform(odpr, 0, 0, odpr, 0, 0)
    octx.translate(-minX + pad, -minY + pad)
    const dark = useThemeStore.getState().isDarkMode
    for (const el of selEls) drawElement(octx, el, dark)
    try {
      const blob = await new Promise<Blob | null>((r) => offscreen.toBlob(r, 'image/png'))
      if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch {}
  }

  // getDrawState for renderer
  const getDrawState = useCallback(
    () => ({
      drawing: drawingRef.current,
      currentPts: currentPtsRef.current,
      currentShape: currentShapeRef.current,
      mousePos: mouseRef.current,
      marquee: marqueeRef.current,
      snapLines: snapLinesRef.current,
      tool: toolRef.current,
      color: colorRef.current,
      size: sizeRef.current,
      brush: brushRef.current,
      showGrid: false,
      showRulers: false,
      gridSize: 20,
    }),
    [snapLinesRef]
  )

  return { getCursor, copySelectedToSystemClipboard, getDrawState }
}
