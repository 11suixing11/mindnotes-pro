import { useRef, useEffect, useCallback, useState } from 'react'
import { useDrawingStore } from '../store/useDrawingStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { Stroke, Shape, ToolType } from '../store/types'

const imageCache = new Map<string, HTMLImageElement>()
function getCachedImage(dataUrl: string): HTMLImageElement | null {
  if (imageCache.has(dataUrl)) return imageCache.get(dataUrl)!
  const img = new Image(); img.src = dataUrl
  if (img.complete) { imageCache.set(dataUrl, img); return img }
  img.onload = () => { imageCache.set(dataUrl, img); window.dispatchEvent(new Event('image-loaded')) }
  return null
}

function simplifyPoints(points: number[][], t: number): number[][] {
  if (points.length <= 2) return points
  const r: number[][] = [points[0]]; let prev = points[0]
  for (let i = 1; i < points.length; i++) { const dx = points[i][0] - prev[0], dy = points[i][1] - prev[1]; if (dx * dx + dy * dy >= t * t) { r.push(points[i]); prev = points[i] } }
  if (r[r.length - 1] !== points[points.length - 1]) r.push(points[points.length - 1])
  return r
}
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq; t = Math.max(0, Math.min(1, t))
  return Math.sqrt((ax + t * dx - px) ** 2 + (ay + t * dy - py) ** 2)
}

const TOOLS: { id: ToolType; key: string }[] = [
  { id: 'select', key: '0' }, { id: 'pen', key: '1' }, { id: 'eraser', key: '2' }, { id: 'pan', key: '3' },
  { id: 'rectangle', key: '4' }, { id: 'circle', key: '5' }, { id: 'text', key: '6' }, { id: 'line', key: '7' }, { id: 'arrow', key: '8' },
]
const COLORS = ['#2c2416', '#c45a5a', '#c47a3a', '#b8963a', '#6a9c5a', '#5a8a9c', '#8a6a9c', '#9c5a7a']
const SIZES = [{ v: 2, d: 4 }, { v: 4, d: 6 }, { v: 8, d: 9 }, { v: 16, d: 13 }]

export default function CanvasInline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const [size, setSize] = useState({ w: 400, h: 300 })

  const tool = useDrawingStore((s) => s.tool)
  const brush = useDrawingStore((s) => s.brush)
  const color = useDrawingStore((s) => s.color)
  const lineSize = useDrawingStore((s) => s.size)
  const canvasBg = useDrawingStore((s) => s.canvasBg)
  const strokes = useDrawingStore((s) => s.strokes)
  const shapes = useDrawingStore((s) => s.shapes)
  const selectedId = useDrawingStore((s) => s.selectedId)
  const addStroke = useDrawingStore((s) => s.addStroke)
  const addShape = useDrawingStore((s) => s.addShape)
  const removeStrokeById = useDrawingStore((s) => s.removeStrokeById)
  const removeShapeById = useDrawingStore((s) => s.removeShapeById)
  const moveStrokeById = useDrawingStore((s) => s.moveStrokeById)
  const moveShapeById = useDrawingStore((s) => s.moveShapeById)
  const resizeStrokeById = useDrawingStore((s) => s.resizeStrokeById)
  const resizeShapeById = useDrawingStore((s) => s.resizeShapeById)
  const setSelectedId = useDrawingStore((s) => s.setSelectedId)
  const setColor = useDrawingStore((s) => s.setColor)
  const setSizeStore = useDrawingStore((s) => s.setSize)
  const setTool = useDrawingStore((s) => s.setTool)
  const undo = useDrawingStore((s) => s.undo)
  const redo = useDrawingStore((s) => s.redo)
  const undoLen = useDrawingStore((s) => s.undoStack.length)
  const redoLen = useDrawingStore((s) => s.redoStack.length)
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
  const resizeRef = useRef<{ handle: number; id: string; bounds: { x: number; y: number; w: number; h: number } } | null>(null)
  const mousePosRef = useRef<{ x: number; y: number } | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const addText = useDrawingStore((s) => s.addText)

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const obs = new ResizeObserver((entries) => { const r = entries[0].contentRect; setSize({ w: r.width, h: r.height }) })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    let cx: number, cy: number
    if ('touches' in e && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY }
    else if ('changedTouches' in e && e.changedTouches.length > 0) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY }
    else { cx = (e as MouseEvent).clientX; cy = (e as MouseEvent).clientY }
    return { x: (cx - rect.left) / viewBox.zoom + viewBox.x, y: (cy - rect.top) / viewBox.zoom + viewBox.y }
  }, [viewBox])

  function hitTest(px: number, py: number): string | null {
    const r = 12
    for (const s of strokes) {
      if ((s as any).imageData) { const ix = s.points[0][0], iy = s.points[0][1]; const iw = (s as any).imageWidth ?? 200, ih = (s as any).imageHeight ?? 200; if (px >= ix - r && px <= ix + iw + r && py >= iy - r && py <= iy + ih + r) return s.id; continue }
      if (s.name) { if (Math.abs(px - s.points[0][0]) < 80 && Math.abs(py - s.points[0][1]) < 20) return s.id; continue }
      for (let i = 0; i < s.points.length - 1; i++) { if (distToSegment(px, py, s.points[i][0], s.points[i][1], s.points[i + 1][0], s.points[i + 1][1]) < r + s.size / 2) return s.id }
    }
    for (const s of shapes) { const sx = s.startX ?? s.x, sy = s.startY ?? s.y, ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height; if (Math.abs(px - (sx + ex) / 2) < Math.abs(ex - sx) / 2 + r && Math.abs(py - (sy + ey) / 2) < Math.abs(ey - sy) / 2 + r) return s.id }
    return null
  }

  function getStrokeBounds(s: Stroke) { let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; for (const p of s.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }; return { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 } }
  function getShapeBounds(s: Shape) { const sx = s.startX ?? s.x, sy = s.startY ?? s.y, ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height; return { x: Math.min(sx, ex) - 5, y: Math.min(sy, ey) - 5, w: Math.abs(ex - sx) + 10, h: Math.abs(ey - sy) + 10 } }

  function hitHandle(px: number, py: number) {
    if (!selectedId) return null; const hr = 8
    let bounds: { x: number; y: number; w: number; h: number } | null = null
    const stroke = strokes.find((s) => s.id === selectedId)
    if (stroke) bounds = getStrokeBounds(stroke)
    else { const shape = shapes.find((s) => s.id === selectedId); if (shape) bounds = getShapeBounds(shape) }
    if (!bounds) return null
    const corners = [[bounds.x, bounds.y], [bounds.x + bounds.w, bounds.y], [bounds.x, bounds.y + bounds.h], [bounds.x + bounds.w, bounds.y + bounds.h]]
    for (let i = 0; i < 4; i++) { if (Math.abs(px - corners[i][0]) < hr && Math.abs(py - corners[i][1]) < hr) return { handle: i, id: selectedId, bounds } }
    return null
  }

  function eraseAt(x: number, y: number) {
    const r = lineSize * 2 + 10
    for (const s of useDrawingStore.getState().strokes) { if (!erasedIdsRef.current.has(s.id) && s.points.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r)) { erasedIdsRef.current.add(s.id); removeStrokeById(s.id) } }
    for (const s of useDrawingStore.getState().shapes) { if (!erasedIdsRef.current.has(s.id)) { const sx = s.startX ?? s.x, sy = s.startY ?? s.y, ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height; if (Math.abs(x - (sx + ex) / 2) < Math.abs(ex - sx) / 2 + r && Math.abs(y - (sy + ey) / 2) < Math.abs(ey - sy) / 2 + r) { erasedIdsRef.current.add(s.id); removeShapeById(s.id) } } }
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    ctx.save(); ctx.scale(viewBox.zoom, viewBox.zoom); ctx.translate(-viewBox.x, -viewBox.y)
    if (viewBox.zoom > 0.3) {
      const gs = 40, sx = Math.floor(viewBox.x / gs) * gs, sy = Math.floor(viewBox.y / gs) * gs
      ctx.strokeStyle = isDarkMode ? 'rgba(200,180,140,0.06)' : 'rgba(120,100,70,0.06)'; ctx.lineWidth = 0.5 / viewBox.zoom; ctx.beginPath()
      for (let x = sx; x <= viewBox.x + size.w / viewBox.zoom; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, viewBox.y + size.h / viewBox.zoom) }
      for (let y = sy; y <= viewBox.y + size.h / viewBox.zoom; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(viewBox.x + size.w / viewBox.zoom, y) }
      ctx.stroke()
    }
    for (const s of strokes) { drawStroke(ctx, s); if (s.id === selectedId) drawSelBox(ctx, getStrokeBounds(s)) }
    for (const s of shapes) { drawShape(ctx, s); if (s.id === selectedId) drawSelBox(ctx, getShapeBounds(s)) }
    if (drawingRef.current && tool === 'pen' && currentPointsRef.current.length > 1) drawStroke(ctx, { id: 'temp', points: currentPointsRef.current, color, size: lineSize, tool: 'pen', brush })
    if (currentShapeRef.current) drawShape(ctx, currentShapeRef.current)
    if (tool === 'eraser' && mousePosRef.current) {
      const mx = mousePosRef.current.x, my = mousePosRef.current.y, r = lineSize * 2 + 10
      ctx.save(); ctx.strokeStyle = isDarkMode ? 'rgba(212,138,106,0.4)' : 'rgba(196,122,90,0.3)'; ctx.lineWidth = 1.5 / viewBox.zoom; ctx.setLineDash([4 / viewBox.zoom, 4 / viewBox.zoom]); ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
    }
    ctx.restore()
  }, [strokes, shapes, viewBox, color, lineSize, tool, brush, canvasBg, selectedId, isDarkMode, dpr, size])

  function drawSelBox(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }) {
    ctx.strokeStyle = '#c47a5a'; ctx.lineWidth = 1.5 / viewBox.zoom; ctx.setLineDash([4 / viewBox.zoom, 4 / viewBox.zoom]); ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]); ctx.fillStyle = '#c47a5a'
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) ctx.fillRect(cx - 3 / viewBox.zoom, cy - 3 / viewBox.zoom, 6 / viewBox.zoom, 6 / viewBox.zoom)
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if ((stroke as any).imageData) { const img = getCachedImage((stroke as any).imageData); if (img?.complete) { ctx.save(); ctx.globalAlpha = stroke.opacity ?? 1; ctx.drawImage(img, stroke.points[0][0], stroke.points[0][1], (stroke as any).imageWidth ?? 200, (stroke as any).imageHeight ?? 200); ctx.restore() }; return }
    if (stroke.name) { ctx.save(); ctx.font = `${Math.max(stroke.size * 4, 16)}px 'Noto Sans SC',sans-serif`; ctx.fillStyle = stroke.color === 'transparent' ? '#1d2129' : stroke.color; ctx.textBaseline = 'top'; ctx.globalAlpha = stroke.opacity ?? 1; ctx.fillText(stroke.name, stroke.points[0][0], stroke.points[0][1]); ctx.restore(); return }
    if (stroke.points.length < 2) return
    const b = stroke.brush ?? 'pen', pts = stroke.points
    if (b === 'pen') { ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }; ctx.stroke() }
    else if (b === 'highlighter') { ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size * 4; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore() }
    else if (b === 'pencil') { ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size * 0.6; ctx.lineCap = 'round'; for (let i = 1; i < pts.length; i++) { ctx.beginPath(); const seed = (i * 7919) % 100 / 100; ctx.moveTo(pts[i - 1][0] + (seed - 0.5) * stroke.size * 0.3, pts[i - 1][1] + ((seed * 1.3) % 1 - 0.5) * stroke.size * 0.3); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke() }; ctx.restore() }
    else if (b === 'calligraphy') { ctx.strokeStyle = stroke.color; ctx.lineCap = 'round'; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; const wf = 0.3 + 0.7 * Math.abs(Math.sin(Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.PI / 4)); ctx.beginPath(); ctx.lineWidth = stroke.size * wf; ctx.moveTo(p[0], p[1]); ctx.lineTo(c[0], c[1]); ctx.stroke() } }
    else if (b === 'dashed') { ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size; ctx.lineCap = 'round'; ctx.setLineDash([stroke.size * 2, stroke.size * 1.5]); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }; ctx.stroke(); ctx.setLineDash([]) }
    else if (b === 'glow') { ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = stroke.color; ctx.shadowBlur = stroke.size * 3; ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size * 0.5; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }; ctx.stroke(); ctx.restore() }
  }

  function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
    ctx.strokeStyle = shape.color; ctx.lineWidth = shape.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const sx = shape.startX ?? shape.x, sy = shape.startY ?? shape.y, ex = shape.endX ?? shape.x + shape.width, ey = shape.endY ?? shape.y + shape.height
    switch (shape.type) {
      case 'rectangle': ctx.strokeRect(sx, sy, ex - sx, ey - sy); break
      case 'circle': ctx.beginPath(); ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2, 0, 0, Math.PI * 2); ctx.stroke(); break
      case 'line': ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); break
      case 'arrow': { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); const a = Math.atan2(ey - sy, ex - sx), hl = 15; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - hl * Math.cos(a - Math.PI / 6), ey - hl * Math.sin(a - Math.PI / 6)); ctx.moveTo(ex, ey); ctx.lineTo(ex - hl * Math.cos(a + Math.PI / 6), ey - hl * Math.sin(a + Math.PI / 6)); ctx.stroke(); break }
    }
  }

  const handleStart = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); const pos = getPos(e)
    if (tool === 'pan') { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; startPan(cx, cy); return }
    if (tool === 'select') {
      const h = hitHandle(pos.x, pos.y); if (h) { resizeRef.current = h; redraw(); return }
      const hit = hitTest(pos.x, pos.y); setSelectedId(hit); if (hit) dragStartRef.current = { x: pos.x, y: pos.y, id: hit }; redraw(); return
    }
    if (tool === 'text') { const rect = canvasRef.current?.getBoundingClientRect(); if (rect) { setTextInput({ x: pos.x, y: pos.y, screenX: (pos.x - viewBox.x) * viewBox.zoom + rect.left, screenY: (pos.y - viewBox.y) * viewBox.zoom + rect.top }); setTimeout(() => textInputRef.current?.focus(), 50) }; return }
    drawingRef.current = true; erasedIdsRef.current = new Set()
    if (tool === 'pen') currentPointsRef.current = [[pos.x, pos.y]]
    else if (tool === 'eraser') eraseAt(pos.x, pos.y)
    else { shapeStartRef.current = pos; currentShapeRef.current = { id: `shape-${Date.now()}`, type: tool, x: pos.x, y: pos.y, width: 0, height: 0, color, size: lineSize, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y } }
  }, [tool, color, lineSize, getPos, startPan, setSelectedId, redraw, viewBox, selectedId, strokes, shapes])

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); const pos = getPos(e); mousePosRef.current = pos
    if (tool === 'select' && resizeRef.current) {
      const { handle, id, bounds } = resizeRef.current
      const anchors = [[bounds.x + bounds.w, bounds.y + bounds.h], [bounds.x, bounds.y + bounds.h], [bounds.x + bounds.w, bounds.y], [bounds.x, bounds.y]]
      const ax = anchors[handle][0], ay = anchors[handle][1]
      const corners = [[bounds.x, bounds.y], [bounds.x + bounds.w, bounds.y], [bounds.x, bounds.y + bounds.h], [bounds.x + bounds.w, bounds.y + bounds.h]]
      const orig = corners[handle]; const dx = pos.x - orig[0], dy = pos.y - orig[1]
      const sx = Math.max(0.1, Math.min(10, handle === 0 || handle === 2 ? (bounds.w + dx) / bounds.w : (bounds.w - dx) / bounds.w))
      const sy = Math.max(0.1, Math.min(10, handle === 0 || handle === 1 ? (bounds.h + dy) / bounds.h : (bounds.h - dy) / bounds.h))
      if (strokes.find((s) => s.id === id)) resizeStrokeById(id, ax, ay, sx, sy); else resizeShapeById(id, ax, ay, sx, sy)
      resizeRef.current = { handle, id, bounds: { x: ax + (bounds.x - ax) * sx, y: ay + (bounds.y - ay) * sy, w: bounds.w * sx, h: bounds.h * sy } }
      redraw(); return
    }
    if (tool === 'select' && dragStartRef.current) { const dx = pos.x - dragStartRef.current.x, dy = pos.y - dragStartRef.current.y; const id = dragStartRef.current.id; if (strokes.find((s) => s.id === id)) moveStrokeById(id, dx, dy); else moveShapeById(id, dx, dy); dragStartRef.current = { x: pos.x, y: pos.y, id }; redraw(); return }
    if (tool === 'pan' && isPanning) { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; updatePan(cx, cy); redraw(); return }
    if (tool === 'eraser') { if (drawingRef.current) eraseAt(pos.x, pos.y); redraw(); return }
    if (!drawingRef.current) return
    if (tool === 'pen') currentPointsRef.current.push([pos.x, pos.y])
    else if (shapeStartRef.current && currentShapeRef.current) currentShapeRef.current = { ...currentShapeRef.current, endX: pos.x, endY: pos.y, width: pos.x - shapeStartRef.current.x, height: pos.y - shapeStartRef.current.y }
    redraw()
  }, [tool, isPanning, getPos, updatePan, redraw, strokes, moveStrokeById, moveShapeById, resizeStrokeById, resizeShapeById, selectedId, shapes])

  const handleEnd = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (tool === 'select') { dragStartRef.current = null; resizeRef.current = null; return }
    if (tool === 'pan') { endPan(); return }
    if (!drawingRef.current) return; drawingRef.current = false
    if (tool === 'pen') { if (currentPointsRef.current.length > 1) addStroke({ id: `stroke-${Date.now()}`, points: simplifyPoints(currentPointsRef.current, 2), color, size: lineSize, tool: 'pen', brush }); currentPointsRef.current = [] }
    else if (tool === 'eraser') currentPointsRef.current = []
    else if (currentShapeRef.current) { addShape(currentShapeRef.current); currentShapeRef.current = null; shapeStartRef.current = null }
    redraw()
  }, [tool, color, lineSize, brush, addStroke, addShape, endPan, redraw])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.addEventListener('mousedown', handleStart); canvas.addEventListener('mousemove', handleMove); canvas.addEventListener('mouseup', handleEnd); canvas.addEventListener('mouseleave', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false }); canvas.addEventListener('touchmove', handleMove, { passive: false }); canvas.addEventListener('touchend', handleEnd, { passive: false })
    return () => { canvas.removeEventListener('mousedown', handleStart); canvas.removeEventListener('mousemove', handleMove); canvas.removeEventListener('mouseup', handleEnd); canvas.removeEventListener('mouseleave', handleEnd); canvas.removeEventListener('touchstart', handleStart); canvas.removeEventListener('touchmove', handleMove); canvas.removeEventListener('touchend', handleEnd) }
  }, [handleStart, handleMove, handleEnd])

  useEffect(() => { redraw() }, [redraw, size])
  useEffect(() => { const handler = () => redraw(); window.addEventListener('image-loaded', handler); return () => window.removeEventListener('image-loaded', handler) }, [redraw])
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const handleWheel = (e: WheelEvent) => { e.preventDefault(); if (e.deltaY < 0) zoomIn(); else zoomOut(); redraw() }
    canvas.addEventListener('wheel', handleWheel, { passive: false }); return () => canvas.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut, redraw])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); redraw(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); redraw(); return }
      const toolMap: Record<string, ToolType> = { '1': 'pen', '2': 'eraser', '3': 'pan', '4': 'rectangle', '5': 'circle', '6': 'text', '7': 'line', '8': 'arrow', '0': 'select' }
      if (toolMap[e.key]) { setTool(toolMap[e.key]); return }
      if (e.key === '+' || e.key === '=') { zoomIn(); redraw(); return }
      if (e.key === '-') { zoomOut(); redraw(); return }
    }
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, zoomIn, zoomOut, redraw, setTool])

  const cursorMap: Record<string, string> = { select: 'default', pen: 'crosshair', eraser: 'none', pan: 'grab', text: 'text', rectangle: 'crosshair', circle: 'crosshair', arrow: 'crosshair', line: 'crosshair' }
  function getCursor() {
    if (isPanning) return 'grabbing'
    if (tool === 'select' && mousePosRef.current) { const h = hitHandle(mousePosRef.current.x, mousePosRef.current.y); if (h) return ['nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize'][h.handle] }
    return cursorMap[tool] ?? 'crosshair'
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} width={size.w * dpr} height={size.h * dpr} style={{ width: size.w, height: size.h, touchAction: 'none', cursor: getCursor(), backgroundColor: canvasBg }} />

      <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 3, background: 'rgba(250,247,240,0.85)', backdropFilter: 'blur(12px)', borderRadius: 10, padding: 4, boxShadow: '0 2px 8px rgba(80,60,30,0.06)' }}>
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.id} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: tool === t.id ? 'var(--primary)' : 'transparent', color: tool === t.id ? '#fff' : 'var(--text-3)', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.key}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={undo} disabled={undoLen === 0} style={miniBtn} title="撤销">↩</button>
        <button onClick={redo} disabled={redoLen === 0} style={miniBtn} title="重做">↪</button>
      </div>

      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 3, background: 'rgba(250,247,240,0.85)', backdropFilter: 'blur(12px)', borderRadius: 10, padding: 4, boxShadow: '0 2px 8px rgba(80,60,30,0.06)' }}>
        {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', border: color === c ? '2px solid var(--primary)' : '2px solid transparent', background: c, cursor: 'pointer' }} />)}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        {SIZES.map((s) => <button key={s.v} onClick={() => setSizeStore(s.v)} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: lineSize === s.v ? 'var(--primary)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: s.d, height: s.d, borderRadius: '50%', background: lineSize === s.v ? '#fff' : 'var(--text-3)' }} /></button>)}
      </div>

      {textInput && (
        <input ref={textInputRef} type="text" placeholder="输入文字..." style={{ position: 'absolute', left: textInput.screenX - (containerRef.current?.getBoundingClientRect().left ?? 0), top: textInput.screenY - (containerRef.current?.getBoundingClientRect().top ?? 0) - 16, minWidth: 120, padding: '6px 10px', fontSize: `${Math.max(lineSize * 4, 14)}px`, color, background: 'rgba(250,247,240,0.95)', border: '1.5px solid rgba(196,122,90,0.3)', borderRadius: 10, outline: 'none', zIndex: 10, boxShadow: '0 2px 8px rgba(80,60,30,0.08)' }}
          onKeyDown={(e) => { if (e.key === 'Enter' && textInputRef.current?.value.trim()) { addText({ id: `text-${Date.now()}`, x: textInput.x, y: textInput.y, content: textInputRef.current.value.trim(), color, size: lineSize }); setTextInput(null) }; if (e.key === 'Escape') setTextInput(null) }}
          onBlur={() => { if (textInputRef.current?.value.trim()) addText({ id: `text-${Date.now()}`, x: textInput.x, y: textInput.y, content: textInputRef.current.value.trim(), color, size: lineSize }); setTextInput(null) }} />
      )}
    </div>
  )
}

const miniBtn: React.CSSProperties = { width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }
