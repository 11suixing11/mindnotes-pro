import { useRef, useEffect, useCallback, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useViewStore } from '../store/useViewStore'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '../store/useThemeStore'
import type { CanvasElement, ShapeElement, TextElement, ShapeKind, ToolType } from '../store/types'
import { simplifyPts, distToSeg, isVisibleInView, elementBounds } from '../canvas/canvasUtils'
import { drawElement, drawStrokeRaw, drawSelBox, drawMonetGrid, drawCanvasBackground, drawMinimap, drawZoomLevel } from '../canvas/canvasDrawing'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elementsCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const elementsDirtyRef = useRef(true)
  const boundsCacheRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map())
  const rafRef = useRef<number>(0)
  const redrawRef = useRef<() => void>(() => {})
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  function cachedBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
    const cache = boundsCacheRef.current
    let b = cache.get(el.id)
    if (!b) {
      b = elementBounds(el)
      cache.set(el.id, b)
    }
    return b
  }

  const {
    elements, tool, brush, color, fillColor, size, bgColor,
    addElement, removeElement, removeElements,
    moveElementById, moveElementsById, resizeElementById,
    setSelectedIds, undo, redo,
  } = useAppStore(useShallow((s) => ({
    elements: s.elements,
    tool: s.tool,
    brush: s.brush,
    color: s.color,
    fillColor: s.fillColor,
    size: s.size,
    bgColor: s.bgColor,
    addElement: s.addElement,
    removeElement: s.removeElement,
    removeElements: s.removeElements,
    moveElementById: s.moveElementById,
    moveElementsById: s.moveElementsById,
    resizeElementById: s.resizeElementById,
    setSelectedIds: s.setSelectedIds,
    undo: s.undo,
    redo: s.redo,
  })))

  const {
    viewBox, startPan, updatePan, endPan, isPanning, zoomIn, zoomOut,
  } = useViewStore(useShallow((s) => ({
    viewBox: s.viewBox,
    startPan: s.startPan,
    updatePan: s.updatePan,
    endPan: s.endPan,
    isPanning: s.isPanning,
    zoomIn: s.zoomIn,
    zoomOut: s.zoomOut,
  })))
  const { isDarkMode } = useThemeStore()

  const drawingRef = useRef(false)
  const currentPtsRef = useRef<number[][]>([])
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<ShapeElement | null>(null)
  const erasedRef = useRef<Set<string>>(new Set())
  const dragRef = useRef<{ x: number; y: number; id: string; startPositions?: Map<string, { x: number; y: number }> } | null>(null)
  const resizeRef = useRef<{ handle: number; id: string; startX: number; startY: number; origBounds: { x: number; y: number; w: number; h: number } } | null>(null)
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const snapLinesRef = useRef<{ x: number[]; y: number[] }>({ x: [], y: [] })
  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  const toolRef = useRef(tool)
  const colorRef2 = useRef(color)
  const sizeRef = useRef(size)
  const brushRef = useRef(brush)
  const fillColorRef2 = useRef(fillColor)
  const viewBoxRef = useRef(viewBox)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef2.current = color }, [color])
  useEffect(() => { sizeRef.current = size }, [size])
  useEffect(() => { brushRef.current = brush }, [brush])
  useEffect(() => { fillColorRef2.current = fillColor }, [fillColor])
  useEffect(() => { viewBoxRef.current = viewBox }, [viewBox])
  const [editingText, setEditingText] = useState<{ id: string; x: number; y: number; screenX: number; screenY: number; content: string; fontSize: number; color: string } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const vb = viewBoxRef.current
    let cx: number, cy: number
    if ('touches' in e && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY }
    else if ('changedTouches' in e && e.changedTouches.length > 0) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY }
    else { cx = (e as MouseEvent).clientX; cy = (e as MouseEvent).clientY }
    return { x: (cx - rect.left) / vb.zoom + vb.x, y: (cy - rect.top) / vb.zoom + vb.y }
  }, [])

  function hitTest(px: number, py: number): string | null {
    const r = 12 / (viewBox.zoom || 1)
    const els = useAppStore.getState().elements
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      if (el.type === 'image') { if (px >= el.x - r && px <= el.x + el.width + r && py >= el.y - r && py <= el.y + el.height + r) return el.id }
      else if (el.type === 'text') { if (px >= el.x - r && px <= el.x + el.width + r && py >= el.y - r && py <= el.y + el.height + r) return el.id }
      else if (el.type === 'shape') { const b = cachedBounds(el); if (px >= b.x - r && px <= b.x + b.w + r && py >= b.y - r && py <= b.y + b.h + r) return el.id }
      else if (el.type === 'stroke') { for (let j = 0; j < el.points.length - 1; j++) { if (distToSeg(px, py, el.points[j][0], el.points[j][1], el.points[j + 1][0], el.points[j + 1][1]) < r + el.size / 2) return el.id } }
    }
    return null
  }

  function hitHandle(px: number, py: number): { handle: number; id: string; bounds: { x: number; y: number; w: number; h: number } } | null {
    const selIds = useAppStore.getState().selectedIds
    if (selIds.length === 0) return null
    const hr = 10 / (viewBox.zoom || 1)
    const els = useAppStore.getState().elements
    for (const selId of selIds) {
      const el = els.find((e) => e.id === selId); if (!el) continue
      const b = cachedBounds(el)
      const corners: [number, number][] = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
      for (let i = 0; i < 4; i++) { if (Math.abs(px - corners[i][0]) < hr && Math.abs(py - corners[i][1]) < hr) return { handle: i, id: selId, bounds: b } }
    }
    return null
  }

  function eraseAt(x: number, y: number) {
    const r = sizeRef.current * 2 + 10
    const r2 = r * r
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
          } else {
            cur.push(p)
          }
        }
        if (cur.length >= 2) segments.push(cur)
        if (!hit) continue
        erasedRef.current.add(el.id)
        removeElement(el.id)
        for (const seg of segments) {
          addElement({ ...el, id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, points: seg })
        }
      } else {
        const b = cachedBounds(el)
        if (x >= b.x - r && x <= b.x + b.w + r && y >= b.y - r && y <= b.y + b.h + r) {
          erasedRef.current.add(el.id); removeElement(el.id)
        }
      }
    }
  }

  const getOrCreateElementsCanvas = useCallback(() => {
    if (!elementsCanvasRef.current) {
      elementsCanvasRef.current = document.createElement('canvas')
    }
    const ec = elementsCanvasRef.current
    const targetW = canvasSize.w * dpr
    const targetH = canvasSize.h * dpr
    if (ec.width !== targetW || ec.height !== targetH) {
      ec.width = targetW
      ec.height = targetH
      elementsDirtyRef.current = true
    }
    return ec
  }, [canvasSize, dpr])

  const renderElementsToCache = useCallback(() => {
    const ec = getOrCreateElementsCanvas()
    const ctx = ec.getContext('2d'); if (!ctx) return
    const els = useAppStore.getState().elements
    const selIds = useAppStore.getState().selectedIds
    const selSet = new Set(selIds)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    ctx.save()
    ctx.scale(viewBox.zoom, viewBox.zoom)
    ctx.translate(-viewBox.x, -viewBox.y)

    drawMonetGridInner(ctx)

    const viewLeft = viewBox.x
    const viewTop = viewBox.y
    const viewWidth = canvasSize.w / viewBox.zoom
    const viewHeight = canvasSize.h / viewBox.zoom

    for (const el of els) {
      if (!isVisibleInView(el, viewLeft, viewTop, viewWidth, viewHeight)) continue
      drawElementInner(ctx, el)
      if (selSet.has(el.id)) drawSelBoxInner(ctx, cachedBounds(el))
    }

    ctx.restore()
    elementsDirtyRef.current = false
  }, [viewBox, dpr, canvasSize, getOrCreateElementsCanvas])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const curTool = useAppStore.getState().tool
    const curColor = useAppStore.getState().color
    const curSize = useAppStore.getState().size
    const curBrush = useAppStore.getState().brush

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)

    drawCanvasBackgroundInner(ctx)

    if (elementsDirtyRef.current) {
      renderElementsToCache()
    }
    const ec = getOrCreateElementsCanvas()
    ctx.drawImage(ec, 0, 0, ec.width, ec.height, 0, 0, canvasSize.w, canvasSize.h)

    ctx.save()
    ctx.scale(viewBox.zoom, viewBox.zoom)
    ctx.translate(-viewBox.x, -viewBox.y)

    if (drawingRef.current && curTool === 'pen' && currentPtsRef.current.length > 1) {
      drawStrokeRaw(ctx, currentPtsRef.current, curColor, curSize, curBrush, isDarkMode)
    }
    if (currentShapeRef.current) drawElementInner(ctx, currentShapeRef.current)

    if (curTool === 'eraser' && mouseRef.current) {
      const mx = mouseRef.current.x, my = mouseRef.current.y, r = curSize * 2 + 10
      ctx.save()
      ctx.strokeStyle = isDarkMode ? 'rgba(200,160,176,0.5)' : 'rgba(176,125,110,0.35)'
      ctx.lineWidth = 1.5 / viewBox.zoom
      ctx.setLineDash([5 / viewBox.zoom, 5 / viewBox.zoom])
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = isDarkMode ? 'rgba(200,160,176,0.04)' : 'rgba(176,125,110,0.04)'
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    ctx.restore()

    if (marqueeRef.current) {
      const m = marqueeRef.current
      const x = Math.min(m.startX, m.endX), y = Math.min(m.startY, m.endY)
      const w = Math.abs(m.endX - m.startX), h = Math.abs(m.endY - m.startY)
      const sx = (x - viewBox.x) * viewBox.zoom
      const sy = (y - viewBox.y) * viewBox.zoom
      const sw = w * viewBox.zoom, sh = h * viewBox.zoom
      ctx.save()
      ctx.strokeStyle = isDarkMode ? 'rgba(200,160,176,0.7)' : 'rgba(176,125,110,0.7)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      ctx.strokeRect(sx, sy, sw, sh)
      ctx.setLineDash([])
      ctx.fillStyle = isDarkMode ? 'rgba(200,160,176,0.06)' : 'rgba(176,125,110,0.06)'
      ctx.fillRect(sx, sy, sw, sh)
      ctx.restore()
    }

    const snaps = snapLinesRef.current
    if (snaps.x.length > 0 || snaps.y.length > 0) {
      ctx.save()
      ctx.strokeStyle = isDarkMode ? 'rgba(200,160,176,0.5)' : 'rgba(176,125,110,0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      for (const lx of snaps.x) {
        const sx = (lx - viewBox.x) * viewBox.zoom
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvasSize.h); ctx.stroke()
      }
      for (const ly of snaps.y) {
        const sy = (ly - viewBox.y) * viewBox.zoom
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvasSize.w, sy); ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()
    }

    drawMinimap(ctx, elements, cachedBounds, viewBox, canvasSize, isDarkMode)
    drawZoomLevel(ctx, viewBox, canvasSize, isDarkMode, dpr)
  }, [viewBox, bgColor, isDarkMode, dpr, canvasSize, getOrCreateElementsCanvas, renderElementsToCache])

  function drawCanvasBackgroundInner(ctx: CanvasRenderingContext2D) {
    drawCanvasBackground(ctx, canvasSize, bgColor, isDarkMode)
  }

  function drawMonetGridInner(ctx: CanvasRenderingContext2D) {
    drawMonetGrid(ctx, viewBox, canvasSize, isDarkMode)
  }

  function drawElementInner(ctx: CanvasRenderingContext2D, el: CanvasElement) {
    drawElement(ctx, el, isDarkMode, editingText?.id)
  }

  function drawSelBoxInner(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }) {
    drawSelBox(ctx, b, isDarkMode, viewBox.zoom)
  }

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => redrawRef.current())
  }, [])

  useEffect(() => { redrawRef.current = redraw }, [redraw])

  const SNAP_THRESHOLD = 6 / (viewBox.zoom || 1)
  function findSnaps(movingBounds: { x: number; y: number; w: number; h: number }, excludeIds: Set<string>): { dx: number; dy: number; linesX: number[]; linesY: number[] } {
    const els = useAppStore.getState().elements
    const movingCX = movingBounds.x + movingBounds.w / 2
    const movingCY = movingBounds.y + movingBounds.h / 2
    const movingEdges = { left: movingBounds.x, right: movingBounds.x + movingBounds.w, top: movingBounds.y, bottom: movingBounds.y + movingBounds.h, cx: movingCX, cy: movingCY }

    let bestDx = 0, bestDy = 0
    let bestDistX = SNAP_THRESHOLD, bestDistY = SNAP_THRESHOLD
    const linesX: number[] = [], linesY: number[] = []

    for (const el of els) {
      if (excludeIds.has(el.id)) continue
      const b = cachedBounds(el)
      const otherEdges = { left: b.x, right: b.x + b.w, top: b.y, bottom: b.y + b.h, cx: b.x + b.w / 2, cy: b.y + b.h / 2 }

      for (const mv of [movingEdges.left, movingEdges.right, movingEdges.cx]) {
        for (const ot of [otherEdges.left, otherEdges.right, otherEdges.cx]) {
          const dist = Math.abs(mv - ot)
          if (dist < bestDistX) { bestDistX = dist; bestDx = ot - mv; }
        }
      }
      for (const mv of [movingEdges.top, movingEdges.bottom, movingEdges.cy]) {
        for (const ot of [otherEdges.top, otherEdges.bottom, otherEdges.cy]) {
          const dist = Math.abs(mv - ot)
          if (dist < bestDistY) { bestDistY = dist; bestDy = ot - mv; }
        }
      }
    }

    if (bestDistX < SNAP_THRESHOLD) {
      const snappedX = movingBounds.x + bestDx
      linesX.push(snappedX, snappedX + movingBounds.w, snappedX + movingBounds.w / 2)
    } else { bestDx = 0 }

    if (bestDistY < SNAP_THRESHOLD) {
      const snappedY = movingBounds.y + bestDy
      linesY.push(snappedY, snappedY + movingBounds.h, snappedY + movingBounds.h / 2)
    } else { bestDy = 0 }

    return { dx: bestDx, dy: bestDy, linesX, linesY }
  }

  const handleStart = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); const pos = getPos(e)
    const curTool = toolRef.current
    const curColor = colorRef2.current
    const curSize = sizeRef.current
    const curFillColor = fillColorRef2.current
    const curViewBox = viewBoxRef.current
    if (curTool === 'pan') { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; startPan(cx, cy); return }
    if (curTool === 'select') {
      const h = hitHandle(pos.x, pos.y)
      if (h) {
        const el = useAppStore.getState().elements.find((e) => e.id === h.id)
        if (el) resizeRef.current = { ...h, startX: pos.x, startY: pos.y, origBounds: cachedBounds(el) }
        scheduleRedraw(); return
      }
      const hit = hitTest(pos.x, pos.y)
      if (hit) {
        const st = useAppStore.getState()
        const ids = st.selectedIds.includes(hit) ? st.selectedIds : [hit]
        if (!st.selectedIds.includes(hit)) setSelectedIds([hit])
        const startPositions = new Map<string, { x: number; y: number }>()
        for (const el of st.elements) {
          if (ids.includes(el.id)) {
            if (el.type === 'stroke') startPositions.set(el.id, { x: el.points[0]?.[0] ?? 0, y: el.points[0]?.[1] ?? 0 })
            else startPositions.set(el.id, { x: (el as any).x ?? 0, y: (el as any).y ?? 0 })
          }
        }
        dragRef.current = { x: pos.x, y: pos.y, id: hit, startPositions }
        scheduleRedraw(); return
      }
      marqueeRef.current = { startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y }
      setSelectedIds([])
      scheduleRedraw(); return
    }
    if (curTool === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const screenX = (pos.x - curViewBox.x) * curViewBox.zoom + rect.left
        const screenY = (pos.y - curViewBox.y) * curViewBox.zoom + rect.top
        const hitEl = hitTest(pos.x, pos.y)
        const existing = hitEl ? useAppStore.getState().elements.find((e) => e.id === hitEl && e.type === 'text') as TextElement | undefined : undefined
        if (existing) { setEditingText({ id: existing.id, x: existing.x, y: existing.y, screenX: (existing.x - curViewBox.x) * curViewBox.zoom + rect.left, screenY: (existing.y - curViewBox.y) * curViewBox.zoom + rect.top, content: existing.content, fontSize: existing.fontSize, color: existing.color }); setTimeout(() => textRef.current?.focus(), 50) }
        else { setEditingText({ id: `new-${Date.now()}`, x: pos.x, y: pos.y, screenX, screenY, content: '', fontSize: 16, color: curColor }); setTimeout(() => textRef.current?.focus(), 50) }
      }
      return
    }
    drawingRef.current = true; erasedRef.current = new Set()
    if (curTool === 'pen') { currentPtsRef.current = [[pos.x, pos.y]] }
    else if (curTool === 'eraser') eraseAt(pos.x, pos.y)
    else { shapeStartRef.current = pos; currentShapeRef.current = { type: 'shape', id: `shape-${Date.now()}`, kind: curTool as ShapeKind, x: pos.x, y: pos.y, w: 0, h: 0, color: curColor, size: curSize, fillColor: curFillColor !== 'transparent' ? curFillColor : undefined } }
  }, [getPos, startPan, setSelectedIds, scheduleRedraw])

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); const pos = getPos(e); mouseRef.current = pos
    const curTool = toolRef.current
    if (curTool === 'select' && resizeRef.current) {
      const { handle, id, startX, startY, origBounds } = resizeRef.current
      const ob = origBounds
      const anchors: [number, number][] = [[ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h], [ob.x + ob.w, ob.y], [ob.x, ob.y]]
      const ax = anchors[handle][0], ay = anchors[handle][1]
      const corners: [number, number][] = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x, ob.y + ob.h], [ob.x + ob.w, ob.y + ob.h]]
      const orig = corners[handle]
      const totalDx = pos.x - startX, totalDy = pos.y - startY
      const targetX = orig[0] + totalDx, targetY = orig[1] + totalDy
      if (ob.w < 1 || ob.h < 1) { scheduleRedraw(); return }
      const nsx = Math.max(0.1, Math.min(10, handle === 0 || handle === 2 ? (targetX - ax) / (orig[0] - ax || 1) : (ax - targetX) / (ax - orig[0] || 1)))
      const nsy = Math.max(0.1, Math.min(10, handle === 0 || handle === 1 ? (targetY - ay) / (orig[1] - ay || 1) : (ay - targetY) / (ay - orig[1] || 1)))
      resizeElementById(id, ax, ay, nsx, nsy)
      scheduleRedraw(); return
    }
    if (curTool === 'select' && marqueeRef.current) {
      marqueeRef.current = { ...marqueeRef.current, endX: pos.x, endY: pos.y }
      scheduleRedraw(); return
    }
    if (curTool === 'select' && dragRef.current) {
      let dx = pos.x - dragRef.current.x, dy = pos.y - dragRef.current.y
      const st = useAppStore.getState()
      const ids = st.selectedIds.length > 0 ? st.selectedIds : [dragRef.current.id]
      const idSet = new Set(ids)

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of st.elements) {
        if (!idSet.has(el.id)) continue
        const b = cachedBounds(el)
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
        maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h)
      }
      const movedBounds = { x: minX + dx, y: minY + dy, w: maxX - minX, h: maxY - minY }
      const snap = findSnaps(movedBounds, idSet)
      dx += snap.dx; dy += snap.dy
      snapLinesRef.current = { x: snap.linesX, y: snap.linesY }

      if (ids.length > 1) {
        moveElementsById(ids, dx, dy)
      } else {
        moveElementById(dragRef.current.id, dx, dy)
      }
      dragRef.current = { x: pos.x + snap.dx, y: pos.y + snap.dy, id: dragRef.current.id }
      scheduleRedraw(); return
    }
    if (curTool === 'pan' && isPanning) { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; updatePan(cx, cy); scheduleRedraw(); return }
    if (curTool === 'eraser') { if (drawingRef.current) eraseAt(pos.x, pos.y); scheduleRedraw(); return }
    if (!drawingRef.current) return
    if (curTool === 'pen') currentPtsRef.current.push([pos.x, pos.y])
    else if (shapeStartRef.current && currentShapeRef.current) {
      let w = pos.x - shapeStartRef.current.x, h = pos.y - shapeStartRef.current.y
      const shift = 'shiftKey' in e && (e as MouseEvent).shiftKey
      if (shift && (currentShapeRef.current.kind === 'rectangle' || currentShapeRef.current.kind === 'circle')) {
        const size = Math.max(Math.abs(w), Math.abs(h))
        w = size * Math.sign(w || 1)
        h = size * Math.sign(h || 1)
      }
      currentShapeRef.current = { ...currentShapeRef.current, w, h }
    }
    scheduleRedraw()
  }, [getPos, isPanning, updatePan, scheduleRedraw, moveElementById, moveElementsById, resizeElementById])

  const handleEnd = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    const curColor = colorRef2.current
    const curSize = sizeRef.current
    const curBrush = brushRef.current
    if (drawingRef.current) {
      drawingRef.current = false
      const curTool = toolRef.current
      if (curTool === 'pen') {
        if (currentPtsRef.current.length > 1) {
          const el: any = { type: 'stroke', id: `stroke-${Date.now()}`, points: simplifyPts(currentPtsRef.current, 1), color: curColor, size: curSize, brush: curBrush }
          if (curBrush === 'highlighter') el.opacity = 0.3
          addElement(el)
        }
        currentPtsRef.current = []
      }
      else if (curTool === 'eraser') currentPtsRef.current = []
      else if (currentShapeRef.current) { if (Math.abs(currentShapeRef.current.w) > 2 || Math.abs(currentShapeRef.current.h) > 2) addElement(currentShapeRef.current); currentShapeRef.current = null; shapeStartRef.current = null }
      scheduleRedraw(); return
    }
    const curTool = toolRef.current
    if (curTool === 'select') {
      if (marqueeRef.current) {
        const m = marqueeRef.current
        const x1 = Math.min(m.startX, m.endX), y1 = Math.min(m.startY, m.endY)
        const x2 = Math.max(m.startX, m.endX), y2 = Math.max(m.startY, m.endY)
        if (x2 - x1 > 3 || y2 - y1 > 3) {
          const els = useAppStore.getState().elements
          const hits: string[] = []
          for (const el of els) {
            const b = cachedBounds(el)
            if (b.x + b.w >= x1 && b.x <= x2 && b.y + b.h >= y1 && b.y <= y2) {
              hits.push(el.id)
            }
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
          if (el.type === 'stroke') { cx = el.points[0]?.[0] ?? 0; cy = el.points[0]?.[1] ?? 0 }
          else { cx = (el as any).x ?? 0; cy = (el as any).y ?? 0 }
          const dx = cx - startPos.x, dy = cy - startPos.y
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) deltas.push({ id: el.id, dx, dy })
        }
        if (deltas.length > 0) useAppStore.getState().pushUndo({ type: 'move', deltas })
      }
      dragRef.current = null; resizeRef.current = null; snapLinesRef.current = { x: [], y: [] }; scheduleRedraw(); return
    }
    if (curTool === 'pan') { endPan(); return }
  }, [addElement, endPan, setSelectedIds, scheduleRedraw])

  useEffect(() => {
    const handleResize = () => setCanvasSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { redraw() }, [redraw, canvasSize])

  useEffect(() => {
    let prevElements = useAppStore.getState().elements
    const unsub = useAppStore.subscribe((state) => {
      if (state.elements !== prevElements) {
        elementsDirtyRef.current = true
        boundsCacheRef.current.clear()
        prevElements = state.elements
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => redrawRef.current())
    })
    return () => { unsub(); if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])
  useEffect(() => { const h = () => { elementsDirtyRef.current = true; redraw() }; window.addEventListener('image-loaded', h); return () => window.removeEventListener('image-loaded', h) }, [redraw])

  const handleStartRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  const handleEndRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {})
  useEffect(() => { handleStartRef.current = (e: MouseEvent | TouchEvent) => handleStart(e) }, [handleStart])
  useEffect(() => { handleMoveRef.current = (e: MouseEvent | TouchEvent) => handleMove(e) }, [handleMove])
  useEffect(() => { handleEndRef.current = (e: MouseEvent | TouchEvent) => handleEnd(e) }, [handleEnd])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const onStart = (e: MouseEvent | TouchEvent) => handleStartRef.current(e)
    const onMove = (e: MouseEvent | TouchEvent) => handleMoveRef.current(e)
    const onEnd = (e: MouseEvent | TouchEvent) => handleEndRef.current(e)
    canvas.addEventListener('mousedown', onStart); canvas.addEventListener('mousemove', onMove); canvas.addEventListener('mouseup', onEnd); canvas.addEventListener('mouseleave', onEnd)
    canvas.addEventListener('touchstart', onStart, { passive: false }); canvas.addEventListener('touchmove', onMove, { passive: false }); canvas.addEventListener('touchend', onEnd, { passive: false })
    return () => { canvas.removeEventListener('mousedown', onStart); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onEnd); canvas.removeEventListener('mouseleave', onEnd); canvas.removeEventListener('touchstart', onStart); canvas.removeEventListener('touchmove', onMove); canvas.removeEventListener('touchend', onEnd) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const handleWheel = (e: WheelEvent) => { e.preventDefault(); if (e.deltaY < 0) zoomIn(); else zoomOut(); scheduleRedraw() }
    canvas.addEventListener('wheel', handleWheel, { passive: false }); return () => canvas.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut, scheduleRedraw])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    let pinchDist = 0
    let pinchMid = { x: 0, y: 0 }
    let pinching = false

    function getTouchDist(e: TouchEvent): number {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function getTouchMid(e: TouchEvent): { x: number; y: number } {
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
      const newDist = getTouchDist(e)
      const newMid = getTouchMid(e)
      const scale = newDist / pinchDist
      const vb = useViewStore.getState().viewBox

      if (Math.abs(scale - 1) > 0.005) {
        const newZoom = Math.max(0.2, Math.min(5, vb.zoom * scale))
        useViewStore.setState({
          viewBox: { ...vb, zoom: newZoom },
        })
        pinchDist = newDist
      }

      const dx = (newMid.x - pinchMid.x) / vb.zoom
      const dy = (newMid.y - pinchMid.y) / vb.zoom
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        useViewStore.setState({
          viewBox: { ...useViewStore.getState().viewBox, x: useViewStore.getState().viewBox.x - dx, y: useViewStore.getState().viewBox.y - dy },
        })
        pinchMid = newMid
      }

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
  }, [scheduleRedraw])

  const copySelectedToSystemClipboard = useCallback(() => {
    const st = useAppStore.getState()
    if (st.selectedIds.length === 0) return
    const selSet = new Set(st.selectedIds)
    const selectedEls = st.elements.filter((e) => selSet.has(e.id))
    if (selectedEls.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of selectedEls) {
      const b = cachedBounds(el)
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h)
    }
    const pad = 10
    const w = maxX - minX + pad * 2, h = maxY - minY + pad * 2
    const offscreen = document.createElement('canvas')
    offscreen.width = w * 2; offscreen.height = h * 2
    const ctx = offscreen.getContext('2d'); if (!ctx) return
    ctx.scale(2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.translate(-minX + pad, -minY + pad)
    for (const el of selectedEls) {
      if (el.type === 'stroke' && el.points.length >= 2) {
        ctx.beginPath(); ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'
        ctx.moveTo(el.points[0][0], el.points[0][1])
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i][0], el.points[i][1])
        ctx.stroke()
      } else if (el.type === 'shape') {
        ctx.strokeStyle = el.color; ctx.lineWidth = el.size
        if (el.kind === 'rectangle') ctx.strokeRect(el.x, el.y, el.w, el.h)
        else if (el.kind === 'circle') { ctx.beginPath(); ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w) / 2, Math.abs(el.h) / 2, 0, 0, Math.PI * 2); ctx.stroke() }
        else { ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.stroke() }
      } else if (el.type === 'text') {
        ctx.font = `${el.fontSize}px 'Noto Sans SC', sans-serif`; ctx.fillStyle = el.color; ctx.textBaseline = 'top'
        const lines = el.content.split('\n')
        for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], el.x, el.y + i * el.fontSize * 1.6)
      }
    }
    offscreen.toBlob((blob) => {
      if (!blob) return
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).catch(() => {})
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const st = useAppStore.getState()
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault(); st.copySelected()
        copySelectedToSystemClipboard()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); st.paste(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); setSelectedIds(st.elements.map((e) => e.id)); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (st.selectedIds.length > 0) { removeElements(st.selectedIds); return }
      }
      const toolMap: Record<string, ToolType> = { '1': 'pen', '2': 'eraser', '3': 'pan', '4': 'rectangle', '5': 'circle', '6': 'text', '7': 'line', '8': 'arrow', '0': 'select' }
      if (toolMap[e.key]) { st.setTool(toolMap[e.key]); return }
      if (e.key === '+' || e.key === '=') { zoomIn(); return }
      if (e.key === '-') { zoomOut(); return }
    }
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, zoomIn, zoomOut, removeElements])

  const cursorMap: Record<string, string> = { select: 'default', pen: 'crosshair', eraser: 'none', pan: 'grab', text: 'text', rectangle: 'crosshair', circle: 'crosshair', arrow: 'crosshair', line: 'crosshair' }
  function getCursor() {
    if (isPanning) return 'grabbing'
    if (tool === 'select' && mouseRef.current) { const h = hitHandle(mouseRef.current.x, mouseRef.current.y); if (h) return ['nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize'][h.handle] }
    return cursorMap[tool] ?? 'crosshair'
  }

  function measureTextWidth(content: string, fontSize: number): number {
    const canvas = canvasRef.current; if (!canvas) return Math.max(200, content.length * fontSize * 0.6)
    const ctx = canvas.getContext('2d'); if (!ctx) return Math.max(200, content.length * fontSize * 0.6)
    ctx.font = `${fontSize}px 'Noto Sans SC', 'PingFang SC', sans-serif`
    const lines = content.split('\n')
    let maxW = 0
    for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width)
    return Math.max(40, maxW + 8)
  }

  function commitTextEdit(content: string) {
    if (!editingText) return
    if (editingText.id.startsWith('new-')) {
      if (content.trim()) {
        const lines = content.trim().split('\n')
        const w = measureTextWidth(content.trim(), editingText.fontSize)
        const h = editingText.fontSize * 1.6 * lines.length
        addElement({ type: 'text', id: `text-${Date.now()}`, x: editingText.x, y: editingText.y, width: w, height: h, content: content.trim(), fontSize: editingText.fontSize, color: editingText.color })
      }
    } else {
      const el = useAppStore.getState().elements.find((e) => e.id === editingText.id)
      if (el && el.type === 'text') {
        const w = measureTextWidth(content, el.fontSize)
        const lines = content.split('\n')
        const h = el.fontSize * 1.6 * lines.length
        useAppStore.getState().updateElement(editingText.id, () => ({ ...el, content, width: Math.max(40, w), height: Math.max(el.fontSize * 1.6, h) }))
      } else {
        useAppStore.getState().updateElement(editingText.id, (e) => e.type === 'text' ? { ...e, content } : e)
      }
    }
    setEditingText(null)
  }

  return (
    <>
      <canvas ref={canvasRef} width={canvasSize.w * dpr} height={canvasSize.h * dpr} className="w-full h-full touch-none" style={{ touchAction: 'none', cursor: getCursor(), backgroundColor: bgColor, width: canvasSize.w, height: canvasSize.h }} />
      {editingText && (() => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return null
        const screenX = (editingText.x - viewBox.x) * viewBox.zoom + rect.left
        const screenY = (editingText.y - viewBox.y) * viewBox.zoom + rect.top
        return (
          <textarea ref={textRef} autoFocus value={editingText.content} onChange={(e) => setEditingText({ ...editingText, content: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTextEdit(editingText.content) }; if (e.key === 'Escape') setEditingText(null) }}
            onBlur={() => commitTextEdit(editingText.content)}
            style={{
              position: 'fixed', left: screenX - 2, top: screenY,
              minWidth: 40, maxWidth: 800, minHeight: editingText.fontSize * 1.6,
              padding: 0,
              fontSize: editingText.fontSize,
              lineHeight: 1.6,
              color: editingText.color,
              background: 'transparent',
              border: 'none',
              borderLeft: `2px solid ${isDarkMode ? 'rgba(200,160,176,0.6)' : 'rgba(176,125,110,0.6)'}`,
              outline: 'none', zIndex: 100,
              boxShadow: 'none',
              fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
              resize: 'none',
              overflow: 'hidden',
              caretColor: editingText.color,
              transform: `scale(${viewBox.zoom})`,
              transformOrigin: 'top left',
            }} />
        )
      })()}
    </>
  )
}
