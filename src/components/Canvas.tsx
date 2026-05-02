import { useRef, useEffect, useCallback, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { Stroke, Shape, ToolType } from '../store/types'

function simplifyPoints(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points
  const result: number[][] = [points[0]]
  let prev = points[0]
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - prev[0], dy = points[i][1] - prev[1]
    if (dx * dx + dy * dy >= tolerance * tolerance) {
      result.push(points[i])
      prev = points[i]
    }
  }
  if (result[result.length - 1] !== points[points.length - 1]) result.push(points[points.length - 1])
  return result
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx - px, cy = ay + t * dy - py
  return Math.sqrt(cx * cx + cy * cy)
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  const tool = useDrawingStore((s) => s.tool)
  const brush = useDrawingStore((s) => s.brush)
  const color = useDrawingStore((s) => s.color)
  const size = useDrawingStore((s) => s.size)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const selectedId = useDrawingStore((s) => s.selectedId)
  const addStroke = useDrawingStore((s) => s.addStroke)
  const addShape = useDrawingStore((s) => s.addShape)
  const addText = useDrawingStore((s) => s.addText)
  const removeStrokeById = useDrawingStore((s) => s.removeStrokeById)
  const removeShapeById = useDrawingStore((s) => s.removeShapeById)
  const moveStrokeById = useDrawingStore((s) => s.moveStrokeById)
  const moveShapeById = useDrawingStore((s) => s.moveShapeById)
  const setSelectedId = useDrawingStore((s) => s.setSelectedId)
  const undo = useDrawingStore((s) => s.undo)
  const redo = useDrawingStore((s) => s.redo)

  const viewBox = useViewStore((s) => s.viewBox)
  const startPan = useViewStore((s) => s.startPan)
  const updatePan = useViewStore((s) => s.updatePan)
  const endPan = useViewStore((s) => s.endPan)
  const isPanning = useViewStore((s) => s.isPanning)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)
  const { isDarkMode } = useThemeStore()

  const drawingRef = useRef(false)
  const currentPointsRef = useRef<number[][]>([])
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<Shape | null>(null)
  const erasedIdsRef = useRef<Set<string>>(new Set())
  const dragStartRef = useRef<{ x: number; y: number; id: string } | null>(null)

  function hitTest(px: number, py: number): string | null {
    const r = 12
    for (const s of strokes) {
      for (let i = 0; i < s.points.length - 1; i++) {
        if (distToSegment(px, py, s.points[i][0], s.points[i][1], s.points[i + 1][0], s.points[i + 1][1]) < r + s.size / 2)
          return s.id
      }
    }
    for (const s of shapes) {
      const sx = s.startX ?? s.x, sy = s.startY ?? s.y
      const ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height
      const cx = (sx + ex) / 2, cy = (sy + ey) / 2
      const hw = Math.abs(ex - sx) / 2 + r, hh = Math.abs(ey - sy) / 2 + r
      if (Math.abs(px - cx) < hw && Math.abs(py - cy) < hh) return s.id
    }
    return null
  }

  function pointNearStroke(px: number, py: number, stroke: Stroke, radius: number): boolean {
    for (const pt of stroke.points) {
      const dx = pt[0] - px, dy = pt[1] - py
      if (dx * dx + dy * dy < radius * radius) return true
    }
    return false
  }

  function pointNearShape(px: number, py: number, shape: Shape, radius: number): boolean {
    const sx = shape.startX ?? shape.x, sy = shape.startY ?? shape.y
    const ex = shape.endX ?? shape.x + shape.width, ey = shape.endY ?? shape.y + shape.height
    const cx = (sx + ex) / 2, cy = (sy + ey) / 2
    const hw = Math.abs(ex - sx) / 2, hh = Math.abs(ey - sy) / 2
    return Math.abs(px - cx) < hw + radius && Math.abs(py - cy) < hh + radius
  }

  const getPos = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      let cx: number, cy: number
      if ('touches' in e && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY }
      else if ('changedTouches' in e && e.changedTouches.length > 0) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY }
      else { cx = (e as MouseEvent).clientX; cy = (e as MouseEvent).clientY }
      return { x: (cx - rect.left) / viewBox.zoom + viewBox.x, y: (cy - rect.top) / viewBox.zoom + viewBox.y }
    },
    [viewBox]
  )

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(viewBox.zoom, viewBox.zoom)
    ctx.translate(-viewBox.x, -viewBox.y)

    if (viewBox.zoom > 0.3) {
      const gridSize = 40
      const startX = Math.floor(viewBox.x / gridSize) * gridSize
      const startY = Math.floor(viewBox.y / gridSize) * gridSize
      const endX = viewBox.x + canvas.width / viewBox.zoom
      const endY = viewBox.y + canvas.height / viewBox.zoom
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 0.5 / viewBox.zoom
      ctx.beginPath()
      for (let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY) }
      for (let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y) }
      ctx.stroke()
    }

    for (const stroke of strokes) {
      drawStroke(ctx, stroke)
      if (stroke.id === selectedId) drawSelectionBox(ctx, getStrokeBounds(stroke))
    }
    for (const shape of shapes) {
      drawShape(ctx, shape)
      if (shape.id === selectedId) drawSelectionBox(ctx, getShapeBounds(shape))
    }

    if (drawingRef.current && tool === 'pen' && currentPointsRef.current.length > 1) {
      drawStroke(ctx, { id: 'temp', points: currentPointsRef.current, color, size, tool: 'pen', brush })
    }
    if (currentShapeRef.current) drawShape(ctx, currentShapeRef.current)

    ctx.restore()

    drawMinimap(ctx, canvas)
    drawZoomLevel(ctx, canvas)
  }, [strokes, shapes, viewBox, color, size, tool, selectedId, isDarkMode])

  function getStrokeBounds(s: Stroke) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of s.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }
    return { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 }
  }

  function getShapeBounds(s: Shape) {
    const sx = s.startX ?? s.x, sy = s.startY ?? s.y
    const ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height
    return { x: Math.min(sx, ex) - 5, y: Math.min(sy, ey) - 5, w: Math.abs(ex - sx) + 10, h: Math.abs(ey - sy) + 10 }
  }

  function drawSelectionBox(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }) {
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 1.5 / viewBox.zoom
    ctx.setLineDash([4 / viewBox.zoom, 4 / viewBox.zoom])
    ctx.strokeRect(b.x, b.y, b.w, b.h)
    ctx.setLineDash([])
    const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
    ctx.fillStyle = '#4f46e5'
    for (const [cx, cy] of corners) ctx.fillRect(cx - 3 / viewBox.zoom, cy - 3 / viewBox.zoom, 6 / viewBox.zoom, 6 / viewBox.zoom)
  }

  function drawMinimap(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    if (strokes.length === 0 && shapes.length === 0) return
    const mmW = 120, mmH = 80, pad = 10
    const mmX = canvas.width - mmW - pad, mmY = canvas.height - mmH - pad

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const s of strokes) for (const p of s.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }
    for (const s of shapes) {
      const sx = s.startX ?? s.x, sy = s.startY ?? s.y, ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height
      minX = Math.min(minX, sx); minY = Math.min(minY, sy); maxX = Math.max(maxX, ex); maxY = Math.max(maxY, ey)
    }
    if (!isFinite(minX)) return

    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
    const scale = Math.min(mmW / rangeX, mmH / rangeY) * 0.8

    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = isDarkMode ? '#374151' : '#f3f4f6'
    ctx.strokeStyle = isDarkMode ? '#6b7280' : '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 6)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280'
    for (const s of strokes) for (const p of s.points) {
      ctx.fillRect(mmX + (p[0] - minX) * scale + (mmW - rangeX * scale) / 2, mmY + (p[1] - minY) * scale + (mmH - rangeY * scale) / 2, 1.5, 1.5)
    }

    const vx = (viewBox.x - minX) * scale + (mmW - rangeX * scale) / 2
    const vy = (viewBox.y - minY) * scale + (mmH - rangeY * scale) / 2
    const vw = canvas.width / viewBox.zoom * scale
    const vh = canvas.height / viewBox.zoom * scale
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 1.5
    ctx.strokeRect(mmX + vx, mmY + vy, vw, vh)

    ctx.restore()
  }

  function drawZoomLevel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const pct = Math.round(viewBox.zoom * 100)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
    ctx.textAlign = 'right'
    ctx.fillText(`${pct}%`, canvas.width - 145, canvas.height - 10)
    ctx.restore()
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return
    if (stroke.name) {
      ctx.font = `${stroke.size * 4}px sans-serif`
      ctx.fillStyle = stroke.color
      ctx.textBaseline = 'top'
      ctx.fillText(stroke.name, stroke.points[0][0], stroke.points[0][1])
      return
    }

    const b = stroke.brush ?? 'pen'
    const pts = stroke.points

    if (b === 'pen') {
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 1
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i]
        ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    else if (b === 'highlighter') {
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * 4
      ctx.lineCap = 'square'
      ctx.lineJoin = 'miter'
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1])
      }
      ctx.stroke()
      ctx.restore()
    }

    else if (b === 'pencil') {
      ctx.save()
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * 0.6
      ctx.lineCap = 'round'
      for (let i = 1; i < pts.length; i++) {
        ctx.beginPath()
        const jitterX = (Math.random() - 0.5) * stroke.size * 0.3
        const jitterY = (Math.random() - 0.5) * stroke.size * 0.3
        ctx.moveTo(pts[i - 1][0] + jitterX, pts[i - 1][1] + jitterY)
        ctx.lineTo(pts[i][0] + jitterX * 0.5, pts[i][1] + jitterY * 0.5)
        ctx.stroke()
      }
      ctx.restore()
    }

    else if (b === 'calligraphy') {
      ctx.strokeStyle = stroke.color
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i]
        const dx = curr[0] - prev[0], dy = curr[1] - prev[1]
        const angle = Math.atan2(dy, dx)
        const penAngle = Math.PI / 4
        const widthFactor = 0.3 + 0.7 * Math.abs(Math.sin(angle - penAngle))
        ctx.beginPath()
        ctx.lineWidth = stroke.size * widthFactor
        ctx.moveTo(prev[0], prev[1])
        ctx.lineTo(curr[0], curr[1])
        ctx.stroke()
      }
    }

    else if (b === 'dashed') {
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.setLineDash([stroke.size * 2, stroke.size * 1.5])
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i]
        ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    else if (b === 'glow') {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = stroke.color
      ctx.shadowBlur = stroke.size * 3
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * 0.5
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i]
        ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2)
      }
      ctx.stroke()
      ctx.shadowBlur = stroke.size * 6
      ctx.globalAlpha = 0.3
      ctx.lineWidth = stroke.size * 1.5
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i]
        ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.strokeStyle = shape.color
    ctx.lineWidth = shape.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const sx = shape.startX ?? shape.x, sy = shape.startY ?? shape.y
    const ex = shape.endX ?? shape.x + shape.width, ey = shape.endY ?? shape.y + shape.height
    switch (shape.type) {
      case 'rectangle': ctx.strokeRect(sx, sy, ex - sx, ey - sy); break
      case 'circle':
        ctx.beginPath(); ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2, 0, 0, Math.PI * 2); ctx.stroke(); break
      case 'line': ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); break
      case 'triangle': ctx.beginPath(); ctx.moveTo((sx + ex) / 2, sy); ctx.lineTo(sx, ey); ctx.lineTo(ex, ey); ctx.closePath(); ctx.stroke(); break
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
        const angle = Math.atan2(ey - sy, ex - sx), hl = 15
        ctx.beginPath(); ctx.moveTo(ex, ey)
        ctx.lineTo(ex - hl * Math.cos(angle - Math.PI / 6), ey - hl * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - hl * Math.cos(angle + Math.PI / 6), ey - hl * Math.sin(angle + Math.PI / 6))
        ctx.stroke(); break
      }
    }
  }

  function eraseAt(x: number, y: number) {
    const r = size * 2 + 10
    for (const s of useDrawingStore.getState().strokes) {
      if (!erasedIdsRef.current.has(s.id) && pointNearStroke(x, y, s, r)) { erasedIdsRef.current.add(s.id); removeStrokeById(s.id) }
    }
    for (const s of useDrawingStore.getState().shapes) {
      if (!erasedIdsRef.current.has(s.id) && pointNearShape(x, y, s, r)) { erasedIdsRef.current.add(s.id); removeShapeById(s.id) }
    }
  }

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const pos = getPos(e)

      if (tool === 'pan') {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        startPan(cx, cy); return
      }

      if (tool === 'select') {
        const hit = hitTest(pos.x, pos.y)
        setSelectedId(hit)
        if (hit) dragStartRef.current = { x: pos.x, y: pos.y, id: hit }
        redraw(); return
      }

      if (tool === 'text') {
        const text = prompt('输入文字：')
        if (text && text.trim()) addText({ id: `text-${Date.now()}`, x: pos.x, y: pos.y, content: text.trim(), color, size })
        return
      }

      drawingRef.current = true
      erasedIdsRef.current = new Set()

      if (tool === 'pen') { currentPointsRef.current = [[pos.x, pos.y]] }
      else if (tool === 'eraser') { eraseAt(pos.x, pos.y) }
      else {
        shapeStartRef.current = pos
        currentShapeRef.current = {
          id: `shape-${Date.now()}`, type: tool, x: pos.x, y: pos.y, width: 0, height: 0, color, size,
          startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y,
        }
      }
    },
    [tool, color, size, getPos, startPan, addText, setSelectedId, redraw]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()

      if (tool === 'select' && dragStartRef.current) {
        const pos = getPos(e)
        const dx = pos.x - dragStartRef.current.x, dy = pos.y - dragStartRef.current.y
        const id = dragStartRef.current.id
        if (strokes.find((s) => s.id === id)) moveStrokeById(id, dx, dy)
        else moveShapeById(id, dx, dy)
        dragStartRef.current = { x: pos.x, y: pos.y, id }
        redraw(); return
      }

      if (tool === 'pan' && isPanning) {
        const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
        updatePan(cx, cy); redraw(); return
      }

      if (!drawingRef.current) return
      const pos = getPos(e)

      if (tool === 'eraser') { eraseAt(pos.x, pos.y); redraw(); return }
      if (tool === 'pen') { currentPointsRef.current.push([pos.x, pos.y]) }
      else if (shapeStartRef.current && currentShapeRef.current) {
        currentShapeRef.current = { ...currentShapeRef.current, endX: pos.x, endY: pos.y, width: pos.x - shapeStartRef.current.x, height: pos.y - shapeStartRef.current.y }
      }
      redraw()
    },
    [tool, isPanning, getPos, updatePan, redraw, strokes, moveStrokeById, moveShapeById]
  )

  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (tool === 'select') { dragStartRef.current = null; return }
      if (tool === 'pan') { endPan(); return }
      if (!drawingRef.current) return
      drawingRef.current = false
      if (tool === 'pen') {
        if (currentPointsRef.current.length > 1) {
          const smoothed = simplifyPoints(currentPointsRef.current, 2)
          addStroke({ id: `stroke-${Date.now()}`, points: smoothed, color, size, tool: 'pen', brush })
        }
        currentPointsRef.current = []
      } else if (tool === 'eraser') { currentPointsRef.current = [] }
      else if (currentShapeRef.current) { addShape(currentShapeRef.current); currentShapeRef.current = null; shapeStartRef.current = null }
      redraw()
    },
    [tool, color, size, brush, addStroke, addShape, endPan, redraw]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const setTool = useDrawingStore.getState().setTool
      const clearAll = useDrawingStore.getState().clearAll
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); redraw(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); redraw(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (confirm('清空所有笔迹？')) { clearAll(); redraw() }; return }
      const toolMap: Record<string, ToolType> = { '1': 'pen', '2': 'eraser', '3': 'pan', '4': 'rectangle', '5': 'circle', '6': 'text', '7': 'line', '8': 'arrow', '0': 'select' }
      if (toolMap[e.key]) { setTool(toolMap[e.key]); return }
      if (e.key === '+' || e.key === '=') { zoomIn(); redraw(); return }
      if (e.key === '-') { zoomOut(); redraw(); return }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, zoomIn, zoomOut, redraw])

  useEffect(() => {
    const handleResize = () => setCanvasSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.addEventListener('mousedown', handleStart)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseup', handleEnd)
    canvas.addEventListener('mouseleave', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleEnd, { passive: false })
    return () => {
      canvas.removeEventListener('mousedown', handleStart); canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleEnd); canvas.removeEventListener('mouseleave', handleEnd)
      canvas.removeEventListener('touchstart', handleStart); canvas.removeEventListener('touchmove', handleMove); canvas.removeEventListener('touchend', handleEnd)
    }
  }, [handleStart, handleMove, handleEnd])

  useEffect(() => { redraw() }, [redraw, canvasSize])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const handleWheel = (e: WheelEvent) => { e.preventDefault(); if (e.deltaY < 0) zoomIn(); else zoomOut(); redraw() }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut, redraw])

  const cursorMap: Record<string, string> = {
    select: 'default', pen: 'crosshair', eraser: 'cell', pan: 'grab', text: 'text',
    rectangle: 'crosshair', circle: 'crosshair', triangle: 'crosshair', arrow: 'crosshair', line: 'crosshair',
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      className="w-full h-full touch-none"
      style={{ touchAction: 'none', cursor: isPanning ? 'grabbing' : cursorMap[tool] ?? 'crosshair', backgroundColor: 'var(--canvas-bg, #fff)' }}
    />
  )
}
