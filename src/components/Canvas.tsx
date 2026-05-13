import { useRef, useEffect, useCallback, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { CanvasElement, StrokeElement, ShapeElement, TextElement, ImageElement, ShapeKind } from '../store/types'
import { elementBounds } from '../store/types'

const imageCache = new Map<string, HTMLImageElement>()
function getImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) return imageCache.get(src)!
  const img = new Image(); img.src = src
  if (img.complete) { imageCache.set(src, img); return img }
  img.onload = () => { imageCache.set(src, img); window.dispatchEvent(new Event('image-loaded')) }
  return null
}

function simplifyPts(pts: number[][], t: number): number[][] {
  if (pts.length <= 2) return pts
  const r = [pts[0]]; let prev = pts[0]
  for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - prev[0], dy = pts[i][1] - prev[1]; if (dx * dx + dy * dy >= t * t) { r.push(pts[i]); prev = pts[i] } }
  if (r[r.length - 1] !== pts[pts.length - 1]) r.push(pts[pts.length - 1])
  return r
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq; t = Math.max(0, Math.min(1, t))
  return Math.sqrt((ax + t * dx - px) ** 2 + (ay + t * dy - py) ** 2)
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  const elements = useAppStore((s) => s.elements)
  const tool = useAppStore((s) => s.tool)
  const brush = useAppStore((s) => s.brush)
  const color = useAppStore((s) => s.color)
  const size = useAppStore((s) => s.size)
  const bgColor = useAppStore((s) => s.bgColor)
  const selectedId = useAppStore((s) => s.selectedId)
  const addElement = useAppStore((s) => s.addElement)
  const removeElement = useAppStore((s) => s.removeElement)
  const moveElementById = useAppStore((s) => s.moveElementById)
  const resizeElementById = useAppStore((s) => s.resizeElementById)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)

  const viewBox = useViewStore((s) => s.viewBox)
  const startPan = useViewStore((s) => s.startPan)
  const updatePan = useViewStore((s) => s.updatePan)
  const endPan = useViewStore((s) => s.endPan)
  const isPanning = useViewStore((s) => s.isPanning)
  const zoomIn = useViewStore((s) => s.zoomIn)
  const zoomOut = useViewStore((s) => s.zoomOut)
  const { isDarkMode } = useThemeStore()

  const drawingRef = useRef(false)
  const currentPtsRef = useRef<number[][]>([])
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<ShapeElement | null>(null)
  const erasedRef = useRef<Set<string>>(new Set())
  const dragRef = useRef<{ x: number; y: number; id: string } | null>(null)
  const resizeRef = useRef<{ handle: number; id: string; startX: number; startY: number; origBounds: { x: number; y: number; w: number; h: number } } | null>(null)
  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  const [editingText, setEditingText] = useState<{ id: string; x: number; y: number; screenX: number; screenY: number; content: string } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

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
    const els = useAppStore.getState().elements
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      if (el.type === 'image') { if (px >= el.x - r && px <= el.x + el.width + r && py >= el.y - r && py <= el.y + el.height + r) return el.id }
      else if (el.type === 'text') { if (px >= el.x - r && px <= el.x + el.width + r && py >= el.y - r && py <= el.y + el.height + r) return el.id }
      else if (el.type === 'shape') { const b = elementBounds(el); if (px >= b.x - r && px <= b.x + b.w + r && py >= b.y - r && py <= b.y + b.h + r) return el.id }
      else if (el.type === 'stroke') { for (let j = 0; j < el.points.length - 1; j++) { if (distToSeg(px, py, el.points[j][0], el.points[j][1], el.points[j + 1][0], el.points[j + 1][1]) < r + el.size / 2) return el.id } }
    }
    return null
  }

  function hitHandle(px: number, py: number): { handle: number; id: string; bounds: { x: number; y: number; w: number; h: number } } | null {
    const selId = useAppStore.getState().selectedId
    if (!selId) return null; const hr = 10
    const els = useAppStore.getState().elements
    const el = els.find((e) => e.id === selId); if (!el) return null
    const b = elementBounds(el)
    const corners: [number, number][] = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
    for (let i = 0; i < 4; i++) { if (Math.abs(px - corners[i][0]) < hr && Math.abs(py - corners[i][1]) < hr) return { handle: i, id: selId, bounds: b } }
    return null
  }

  function eraseAt(x: number, y: number) {
    const r = size * 2 + 10
    for (const el of useAppStore.getState().elements) {
      if (erasedRef.current.has(el.id)) continue
      if (el.type === 'stroke') { for (const p of el.points) { if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < r * r) { erasedRef.current.add(el.id); removeElement(el.id); break } } }
      else if (el.type === 'shape' || el.type === 'text' || el.type === 'image') { const b = elementBounds(el); if (x >= b.x - r && x <= b.x + b.w + r && y >= b.y - r && y <= b.y + b.h + r) { erasedRef.current.add(el.id); removeElement(el.id) } }
    }
  }

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const els = useAppStore.getState().elements
    const selId = useAppStore.getState().selectedId
    const curTool = useAppStore.getState().tool
    const curColor = useAppStore.getState().color
    const curSize = useAppStore.getState().size
    const curBrush = useAppStore.getState().brush

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    ctx.save(); ctx.scale(viewBox.zoom, viewBox.zoom); ctx.translate(-viewBox.x, -viewBox.y)

    // Grid
    if (viewBox.zoom > 0.3) {
      const gs = 40, sx = Math.floor(viewBox.x / gs) * gs, sy = Math.floor(viewBox.y / gs) * gs
      ctx.strokeStyle = isDarkMode ? 'rgba(200,180,140,0.06)' : 'rgba(120,100,70,0.06)'; ctx.lineWidth = 0.5 / viewBox.zoom; ctx.beginPath()
      for (let x = sx; x <= viewBox.x + canvasSize.w / viewBox.zoom; x += gs) { ctx.moveTo(x, sy); ctx.lineTo(x, viewBox.y + canvasSize.h / viewBox.zoom) }
      for (let y = sy; y <= viewBox.y + canvasSize.h / viewBox.zoom; y += gs) { ctx.moveTo(sx, y); ctx.lineTo(viewBox.x + canvasSize.w / viewBox.zoom, y) }
      ctx.stroke()
    }

    // Elements
    for (const el of els) {
      drawElement(ctx, el)
      if (el.id === selId) drawSelBox(ctx, elementBounds(el))
    }

    // Current stroke preview
    if (drawingRef.current && curTool === 'pen' && currentPtsRef.current.length > 1) {
      drawStrokeRaw(ctx, currentPtsRef.current, curColor, curSize, curBrush)
    }
    // Current shape preview
    if (currentShapeRef.current) drawElement(ctx, currentShapeRef.current)

    // Eraser cursor
    if (curTool === 'eraser' && mouseRef.current) {
      const mx = mouseRef.current.x, my = mouseRef.current.y, r = curSize * 2 + 10
      ctx.save(); ctx.strokeStyle = isDarkMode ? 'rgba(212,138,106,0.4)' : 'rgba(196,122,90,0.3)'; ctx.lineWidth = 1.5 / viewBox.zoom; ctx.setLineDash([4 / viewBox.zoom, 4 / viewBox.zoom]); ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
    }

    ctx.restore()
    drawMinimap(ctx, canvas)
    drawZoomLevel(ctx, canvas)
  }, [viewBox, bgColor, isDarkMode, dpr, canvasSize])

  function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
    if (el.type === 'stroke') drawStrokeEl(ctx, el)
    else if (el.type === 'shape') drawShapeEl(ctx, el)
    else if (el.type === 'text') drawTextEl(ctx, el)
    else if (el.type === 'image') drawImageEl(ctx, el)
  }

  function drawStrokeEl(ctx: CanvasRenderingContext2D, el: StrokeElement) {
    if (el.points.length < 2) return
    const b = el.brush, pts = el.points
    if (b === 'pen') { ctx.beginPath(); ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 1; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }; ctx.stroke(); ctx.globalAlpha = 1 }
    else if (b === 'highlighter') { ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = el.color; ctx.lineWidth = el.size * 4; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore() }
    else if (b === 'pencil') { ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = el.color; ctx.lineWidth = el.size * 0.6; ctx.lineCap = 'round'; for (let i = 1; i < pts.length; i++) { ctx.beginPath(); const seed = (i * 7919) % 100 / 100; ctx.moveTo(pts[i - 1][0] + (seed - 0.5) * el.size * 0.3, pts[i - 1][1] + ((seed * 1.3) % 1 - 0.5) * el.size * 0.3); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke() }; ctx.restore() }
    else if (b === 'calligraphy') { ctx.strokeStyle = el.color; ctx.lineCap = 'round'; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; const wf = 0.3 + 0.7 * Math.abs(Math.sin(Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.PI / 4)); ctx.beginPath(); ctx.lineWidth = el.size * wf; ctx.moveTo(p[0], p[1]); ctx.lineTo(c[0], c[1]); ctx.stroke() } }
    else if (b === 'dashed') { ctx.beginPath(); ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.setLineDash([el.size * 2, el.size * 1.5]); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }; ctx.stroke(); ctx.setLineDash([]) }
    else if (b === 'glow') { ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = el.color; ctx.shadowBlur = el.size * 3; ctx.strokeStyle = el.color; ctx.lineWidth = el.size * 0.5; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }; ctx.stroke(); ctx.restore() }
  }

  function drawStrokeRaw(ctx: CanvasRenderingContext2D, pts: number[][], c: string, s: number, b: string) {
    drawStrokeEl(ctx, { type: 'stroke', id: '', points: pts, color: c, size: s, brush: b as any })
  }

  function drawShapeEl(ctx: CanvasRenderingContext2D, el: ShapeElement) {
    ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const { x, y, w, h } = el
    switch (el.kind) {
      case 'rectangle': ctx.strokeRect(x, y, w, h); break
      case 'circle': ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2); ctx.stroke(); break
      case 'line': ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke(); break
      case 'arrow': ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke(); const a = Math.atan2(h, w), hl = 15; ctx.beginPath(); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - hl * Math.cos(a - Math.PI / 6), y + h - hl * Math.sin(a - Math.PI / 6)); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - hl * Math.cos(a + Math.PI / 6), y + h - hl * Math.sin(a + Math.PI / 6)); ctx.stroke(); break
    }
  }

  function drawTextEl(ctx: CanvasRenderingContext2D, el: TextElement) {
    if (el.id === editingText?.id) return
    ctx.save()
    ctx.font = `${el.fontSize}px 'Noto Sans SC', 'PingFang SC', sans-serif`
    ctx.fillStyle = el.color
    ctx.textBaseline = 'top'
    const lines = el.content.split('\n')
    const lineHeight = el.fontSize * 1.6
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], el.x, el.y + i * lineHeight)
    }
    ctx.restore()
  }

  function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageElement) {
    const img = getImage(el.dataUrl)
    if (img?.complete) { ctx.save(); ctx.globalAlpha = el.opacity ?? 1; ctx.drawImage(img, el.x, el.y, el.width, el.height); ctx.restore() }
  }

  function drawSelBox(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }) {
    ctx.strokeStyle = '#c47a5a'; ctx.lineWidth = 1.5 / viewBox.zoom; ctx.setLineDash([4 / viewBox.zoom, 4 / viewBox.zoom]); ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]); ctx.fillStyle = '#c47a5a'
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) ctx.fillRect(cx - 4 / viewBox.zoom, cy - 4 / viewBox.zoom, 8 / viewBox.zoom, 8 / viewBox.zoom)
  }

  function drawMinimap(ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement) {
    if (elements.length === 0) return
    const mmW = 120, mmH = 80, pad = 12
    const mmX = canvasSize.w - mmW - pad, mmY = canvasSize.h - mmH - pad - 40
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of elements) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h)
    }
    if (!isFinite(minX)) return
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
    const scale = Math.min(mmW / rangeX, mmH / rangeY) * 0.8
    ctx.save(); ctx.globalAlpha = 0.65
    ctx.fillStyle = isDarkMode ? '#2a2418' : '#ece5d8'; ctx.strokeStyle = isDarkMode ? 'rgba(200,180,140,0.12)' : 'rgba(120,100,70,0.12)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 8); ctx.fill(); ctx.stroke()
    ctx.fillStyle = isDarkMode ? '#7a6e5c' : '#9c8e7a'
    for (const el of elements) {
      const b = elementBounds(el)
      ctx.fillRect(mmX + (b.x - minX) * scale + (mmW - rangeX * scale) / 2, mmY + (b.y - minY) * scale + (mmH - rangeY * scale) / 2, Math.max(1, b.w * scale), Math.max(1, b.h * scale))
    }
    const vx = (viewBox.x - minX) * scale + (mmW - rangeX * scale) / 2, vy = (viewBox.y - minY) * scale + (mmH - rangeY * scale) / 2
    ctx.strokeStyle = '#c47a5a'; ctx.lineWidth = 1.5; ctx.strokeRect(mmX + vx, mmY + vy, canvasSize.w / viewBox.zoom * scale, canvasSize.h / viewBox.zoom * scale)
    ctx.restore()
  }

  function drawZoomLevel(ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement) {
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '12px sans-serif'; ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'; ctx.textAlign = 'right'; ctx.fillText(`${Math.round(viewBox.zoom * 100)}%`, canvasSize.w - 145, canvasSize.h - 50); ctx.restore()
  }

  const handleStart = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); const pos = getPos(e)
    if (tool === 'pan') { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; startPan(cx, cy); return }
    if (tool === 'select') {
      const h = hitHandle(pos.x, pos.y)
      if (h) {
        const el = useAppStore.getState().elements.find((e) => e.id === h.id)
        if (el) resizeRef.current = { ...h, startX: pos.x, startY: pos.y, origBounds: elementBounds(el) }
        redraw(); return
      }
      const hit = hitTest(pos.x, pos.y); setSelectedId(hit); if (hit) dragRef.current = { x: pos.x, y: pos.y, id: hit }; redraw(); return
    }
    if (tool === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const screenX = (pos.x - viewBox.x) * viewBox.zoom + rect.left
        const screenY = (pos.y - viewBox.y) * viewBox.zoom + rect.top
        const hitEl = hitTest(pos.x, pos.y)
        const existing = hitEl ? elements.find((e) => e.id === hitEl && e.type === 'text') as TextElement | undefined : undefined
        if (existing) { setEditingText({ id: existing.id, x: existing.x, y: existing.y, screenX: (existing.x - viewBox.x) * viewBox.zoom + rect.left, screenY: (existing.y - viewBox.y) * viewBox.zoom + rect.top, content: existing.content }); setTimeout(() => textRef.current?.focus(), 50) }
        else { setEditingText({ id: `new-${Date.now()}`, x: pos.x, y: pos.y, screenX, screenY, content: '' }); setTimeout(() => textRef.current?.focus(), 50) }
      }
      return
    }
    drawingRef.current = true; erasedRef.current = new Set()
    if (tool === 'pen') currentPtsRef.current = [[pos.x, pos.y]]
    else if (tool === 'eraser') eraseAt(pos.x, pos.y)
    else { shapeStartRef.current = pos; currentShapeRef.current = { type: 'shape', id: `shape-${Date.now()}`, kind: tool as ShapeKind, x: pos.x, y: pos.y, w: 0, h: 0, color, size } }
  }, [tool, color, size, getPos, startPan, setSelectedId, redraw, viewBox, elements])

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault(); const pos = getPos(e); mouseRef.current = pos
    if (tool === 'select' && resizeRef.current) {
      const { handle, id, startX, startY, origBounds } = resizeRef.current
      const ob = origBounds
      const anchors: [number, number][] = [[ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h], [ob.x + ob.w, ob.y], [ob.x, ob.y]]
      const ax = anchors[handle][0], ay = anchors[handle][1]
      const corners: [number, number][] = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x, ob.y + ob.h], [ob.x + ob.w, ob.y + ob.h]]
      const orig = corners[handle]
      const totalDx = pos.x - startX, totalDy = pos.y - startY
      const targetX = orig[0] + totalDx, targetY = orig[1] + totalDy
      if (ob.w < 1 || ob.h < 1) { redraw(); return }
      const nsx = Math.max(0.1, Math.min(10, handle === 0 || handle === 2 ? (targetX - ax) / (orig[0] - ax || 1) : (ax - targetX) / (ax - orig[0] || 1)))
      const nsy = Math.max(0.1, Math.min(10, handle === 0 || handle === 1 ? (targetY - ay) / (orig[1] - ay || 1) : (ay - targetY) / (ay - orig[1] || 1)))
      resizeElementById(id, ax, ay, nsx, nsy)
      redraw(); return
    }
    if (tool === 'select' && dragRef.current) { const dx = pos.x - dragRef.current.x, dy = pos.y - dragRef.current.y; moveElementById(dragRef.current.id, dx, dy); dragRef.current = { x: pos.x, y: pos.y, id: dragRef.current.id }; redraw(); return }
    if (tool === 'pan' && isPanning) { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; updatePan(cx, cy); redraw(); return }
    if (tool === 'eraser') { if (drawingRef.current) eraseAt(pos.x, pos.y); redraw(); return }
    if (!drawingRef.current) return
    if (tool === 'pen') currentPtsRef.current.push([pos.x, pos.y])
    else if (shapeStartRef.current && currentShapeRef.current) currentShapeRef.current = { ...currentShapeRef.current, w: pos.x - shapeStartRef.current.x, h: pos.y - shapeStartRef.current.y }
    redraw()
  }, [tool, isPanning, getPos, updatePan, redraw, moveElementById, resizeElementById])

  const handleEnd = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (tool === 'select') { dragRef.current = null; resizeRef.current = null; return }
    if (tool === 'pan') { endPan(); return }
    if (!drawingRef.current) return; drawingRef.current = false
    if (tool === 'pen') { if (currentPtsRef.current.length > 1) addElement({ type: 'stroke', id: `stroke-${Date.now()}`, points: simplifyPts(currentPtsRef.current, 2), color, size, brush }); currentPtsRef.current = [] }
    else if (tool === 'eraser') currentPtsRef.current = []
    else if (currentShapeRef.current) { if (Math.abs(currentShapeRef.current.w) > 2 || Math.abs(currentShapeRef.current.h) > 2) addElement(currentShapeRef.current); currentShapeRef.current = null; shapeStartRef.current = null }
    redraw()
  }, [tool, color, size, brush, addElement, endPan, redraw])

  useEffect(() => {
    const handleResize = () => setCanvasSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { redraw() }, [redraw, canvasSize])

  // Trigger redraw when elements change (e.g. switching canvases)
  useEffect(() => {
    const unsub = useAppStore.subscribe(() => {
      redraw()
    })
    return unsub
  }, [redraw])
  useEffect(() => { const h = () => redraw(); window.addEventListener('image-loaded', h); return () => window.removeEventListener('image-loaded', h) }, [redraw])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.addEventListener('mousedown', handleStart); canvas.addEventListener('mousemove', handleMove); canvas.addEventListener('mouseup', handleEnd); canvas.addEventListener('mouseleave', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false }); canvas.addEventListener('touchmove', handleMove, { passive: false }); canvas.addEventListener('touchend', handleEnd, { passive: false })
    return () => { canvas.removeEventListener('mousedown', handleStart); canvas.removeEventListener('mousemove', handleMove); canvas.removeEventListener('mouseup', handleEnd); canvas.removeEventListener('mouseleave', handleEnd); canvas.removeEventListener('touchstart', handleStart); canvas.removeEventListener('touchmove', handleMove); canvas.removeEventListener('touchend', handleEnd) }
  }, [handleStart, handleMove, handleEnd])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const handleWheel = (e: WheelEvent) => { e.preventDefault(); if (e.deltaY < 0) zoomIn(); else zoomOut(); redraw() }
    canvas.addEventListener('wheel', handleWheel, { passive: false }); return () => canvas.removeEventListener('wheel', handleWheel)
  }, [zoomIn, zoomOut, redraw])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const st = useAppStore.getState()
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); redraw(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); redraw(); return }
      if (e.key === 'Delete' && selectedId) { removeElement(selectedId); redraw(); return }
      const toolMap: Record<string, any> = { '1': 'pen', '2': 'eraser', '3': 'pan', '4': 'rectangle', '5': 'circle', '6': 'text', '7': 'line', '8': 'arrow', '0': 'select' }
      if (toolMap[e.key]) { st.setTool(toolMap[e.key]); return }
      if (e.key === '+' || e.key === '=') { zoomIn(); redraw(); return }
      if (e.key === '-') { zoomOut(); redraw(); return }
    }
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, zoomIn, zoomOut, redraw, selectedId, removeElement])

  const cursorMap: Record<string, string> = { select: 'default', pen: 'crosshair', eraser: 'none', pan: 'grab', text: 'text', rectangle: 'crosshair', circle: 'crosshair', arrow: 'crosshair', line: 'crosshair' }
  function getCursor() {
    if (isPanning) return 'grabbing'
    if (tool === 'select' && mouseRef.current) { const h = hitHandle(mouseRef.current.x, mouseRef.current.y); if (h) return ['nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize'][h.handle] }
    return cursorMap[tool] ?? 'crosshair'
  }

  function commitTextEdit(content: string) {
    if (!editingText) return
    if (editingText.id.startsWith('new-')) {
      if (content.trim()) addElement({ type: 'text', id: `text-${Date.now()}`, x: editingText.x, y: editingText.y, width: Math.max(200, content.length * 12), height: 30, content: content.trim(), fontSize: 16, color })
    } else {
      useAppStore.getState().updateElement(editingText.id, (el) => el.type === 'text' ? { ...el, content } : el)
    }
    setEditingText(null)
  }

  return (
    <>
      <canvas ref={canvasRef} width={canvasSize.w * dpr} height={canvasSize.h * dpr} className="w-full h-full touch-none" style={{ touchAction: 'none', cursor: getCursor(), backgroundColor: bgColor, width: canvasSize.w, height: canvasSize.h }} />
      {editingText && (
        <textarea ref={textRef} autoFocus value={editingText.content} onChange={(e) => setEditingText({ ...editingText, content: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTextEdit(editingText.content) }; if (e.key === 'Escape') setEditingText(null) }}
          onBlur={() => commitTextEdit(editingText.content)}
          style={{ position: 'fixed', left: editingText.screenX, top: editingText.screenY - 8, minWidth: 200, maxWidth: 500, minHeight: 40, padding: '8px 12px', fontSize: 16, lineHeight: 1.6, color, background: 'rgba(250,247,240,0.95)', border: '1.5px solid rgba(196,122,90,0.3)', borderRadius: 10, outline: 'none', zIndex: 100, boxShadow: '0 4px 16px rgba(80,60,30,0.08)', fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif", resize: 'both' }} />
      )}
    </>
  )
}
