import { useRef, useEffect, useCallback, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import type { Stroke, Shape, ToolType } from '../store/types'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  const tool = useDrawingStore((s) => s.tool)
  const color = useDrawingStore((s) => s.color)
  const size = useDrawingStore((s) => s.size)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const addStroke = useDrawingStore((s) => s.addStroke)
  const addShape = useDrawingStore((s) => s.addShape)
  const addText = useDrawingStore((s) => s.addText)
  const removeStrokeById = useDrawingStore((s) => s.removeStrokeById)
  const removeShapeById = useDrawingStore((s) => s.removeShapeById)
  const undo = useDrawingStore((s) => s.undo)
  const redo = useDrawingStore((s) => s.redo)

  const viewBox = useViewStore((s) => s.viewBox)
  const startPan = useViewStore((s) => s.startPan)
  const updatePan = useViewStore((s) => s.updatePan)
  const endPan = useViewStore((s) => s.endPan)
  const isPanning = useViewStore((s) => s.isPanning)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)

  const drawingRef = useRef(false)
  const currentPointsRef = useRef<number[][]>([])
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<Shape | null>(null)
  const erasedIdsRef = useRef<Set<string>>(new Set())

  function pointNearStroke(px: number, py: number, stroke: Stroke, radius: number): boolean {
    for (const pt of stroke.points) {
      const dx = pt[0] - px; const dy = pt[1] - py
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
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 0.5 / viewBox.zoom
      ctx.beginPath()
      for (let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY) }
      for (let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y) }
      ctx.stroke()
    }

    for (const stroke of strokes) drawStroke(ctx, stroke)
    for (const shape of shapes) drawShape(ctx, shape)

    if (drawingRef.current && tool === 'pen' && currentPointsRef.current.length > 1) {
      drawStroke(ctx, { id: 'temp', points: currentPointsRef.current, color, size, tool: 'pen' })
    }
    if (currentShapeRef.current) drawShape(ctx, currentShapeRef.current)

    ctx.restore()
  }, [strokes, shapes, viewBox, color, size, tool])

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return

    if (stroke.name) {
      ctx.font = `${stroke.size * 4}px sans-serif`
      ctx.fillStyle = stroke.color
      ctx.textBaseline = 'top'
      ctx.fillText(stroke.name, stroke.points[0][0], stroke.points[0][1])
      return
    }

    ctx.beginPath()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1])
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1]; const curr = stroke.points[i]
      ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) / 2, (prev[1] + curr[1]) / 2)
    }
    ctx.stroke()
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
      case 'circle': {
        ctx.beginPath()
        ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2, 0, 0, Math.PI * 2)
        ctx.stroke(); break
      }
      case 'line': ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); break
      case 'triangle':
        ctx.beginPath(); ctx.moveTo((sx + ex) / 2, sy); ctx.lineTo(sx, ey); ctx.lineTo(ex, ey); ctx.closePath(); ctx.stroke(); break
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
        const angle = Math.atan2(ey - sy, ex - sx); const hl = 15
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

      if (tool === 'text') {
        const text = prompt('输入文字：')
        if (text && text.trim()) {
          addText({ id: `text-${Date.now()}`, x: pos.x, y: pos.y, content: text.trim(), color, size })
        }
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
    [tool, color, size, getPos, startPan, addText]
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
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
    [tool, isPanning, getPos, updatePan, redraw]
  )

  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (tool === 'pan') { endPan(); return }
      if (!drawingRef.current) return
      drawingRef.current = false
      if (tool === 'pen') {
        if (currentPointsRef.current.length > 1) addStroke({ id: `stroke-${Date.now()}`, points: [...currentPointsRef.current], color, size, tool: 'pen' })
        currentPointsRef.current = []
      } else if (tool === 'eraser') { currentPointsRef.current = [] }
      else if (currentShapeRef.current) { addShape(currentShapeRef.current); currentShapeRef.current = null; shapeStartRef.current = null }
      redraw()
    },
    [tool, color, size, addStroke, addShape, endPan, redraw]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const setTool = useDrawingStore.getState().setTool
      const clearAll = useDrawingStore.getState().clearAll

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); redraw(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); redraw(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (confirm('清空所有笔迹？')) { clearAll(); redraw() }; return }

      const toolMap: Record<string, ToolType> = { '1': 'pen', '2': 'eraser', '3': 'pan', '4': 'rectangle', '5': 'circle', '6': 'text' }
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
      canvas.removeEventListener('mousedown', handleStart)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleEnd)
      canvas.removeEventListener('mouseleave', handleEnd)
      canvas.removeEventListener('touchstart', handleStart)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleEnd)
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
    pen: 'crosshair', eraser: 'cell', pan: 'grab', text: 'text',
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
