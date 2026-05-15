import { useRef, useEffect, useCallback, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useViewStore } from '../store/useViewStore'
import { useThemeStore } from '../store/useThemeStore'
import type { CanvasElement, StrokeElement, ShapeElement, TextElement, ImageElement, ShapeKind } from '../store/types'
import { elementBounds } from '../store/types'

const IMAGE_CACHE_MAX = 50
const imageCache = new Map<string, HTMLImageElement>()
function getImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!
    imageCache.delete(src)
    imageCache.set(src, img)
    return img
  }
  const img = new Image(); img.src = src
  if (img.complete) {
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageCache.keys().next().value
      if (firstKey) imageCache.delete(firstKey)
    }
    imageCache.set(src, img); return img
  }
  img.onload = () => {
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const firstKey = imageCache.keys().next().value
      if (firstKey) imageCache.delete(firstKey)
    }
    imageCache.set(src, img); window.dispatchEvent(new Event('image-loaded'))
  }
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
  const elementsCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const elementsDirtyRef = useRef(true)
  const rafRef = useRef<number>(0)
  const redrawRef = useRef<() => void>(() => {})
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  const elements = useAppStore((s) => s.elements)
  const tool = useAppStore((s) => s.tool)
  const brush = useAppStore((s) => s.brush)
  const color = useAppStore((s) => s.color)
  const fillColor = useAppStore((s) => s.fillColor)
  const size = useAppStore((s) => s.size)
  const bgColor = useAppStore((s) => s.bgColor)
  const addElement = useAppStore((s) => s.addElement)
  const removeElement = useAppStore((s) => s.removeElement)
  const removeElements = useAppStore((s) => s.removeElements)
  const moveElementById = useAppStore((s) => s.moveElementById)
  const moveElementsById = useAppStore((s) => s.moveElementsById)
  const resizeElementById = useAppStore((s) => s.resizeElementById)
  const setSelectedIds = useAppStore((s) => s.setSelectedIds)
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
    const selIds = useAppStore.getState().selectedIds
    if (selIds.length === 0) return null
    const hr = 10
    const els = useAppStore.getState().elements
    for (const selId of selIds) {
      const el = els.find((e) => e.id === selId); if (!el) continue
      const b = elementBounds(el)
      const corners: [number, number][] = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
      for (let i = 0; i < 4; i++) { if (Math.abs(px - corners[i][0]) < hr && Math.abs(py - corners[i][1]) < hr) return { handle: i, id: selId, bounds: b } }
    }
    return null
  }

  function eraseAt(x: number, y: number) {
    const r = size * 2 + 10
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
        const b = elementBounds(el)
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

    drawMonetGrid(ctx)

    for (const el of els) {
      drawElement(ctx, el)
      if (selSet.has(el.id)) drawSelBox(ctx, elementBounds(el))
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

    drawCanvasBackground(ctx)

    if (elementsDirtyRef.current) {
      renderElementsToCache()
    }
    const ec = getOrCreateElementsCanvas()
    ctx.drawImage(ec, 0, 0, ec.width, ec.height, 0, 0, canvasSize.w, canvasSize.h)

    ctx.save()
    ctx.scale(viewBox.zoom, viewBox.zoom)
    ctx.translate(-viewBox.x, -viewBox.y)

    if (drawingRef.current && curTool === 'pen' && currentPtsRef.current.length > 1) {
      drawStrokeRaw(ctx, currentPtsRef.current, curColor, curSize, curBrush)
    }
    if (currentShapeRef.current) drawElement(ctx, currentShapeRef.current)

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

    drawMinimap(ctx, canvas)
    drawZoomLevel(ctx, canvas)
  }, [viewBox, bgColor, isDarkMode, dpr, canvasSize, getOrCreateElementsCanvas, renderElementsToCache])

  function drawCanvasBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

    if (isDarkMode) {
      const g1 = ctx.createRadialGradient(canvasSize.w * 0.12, canvasSize.h * 0.18, 0, canvasSize.w * 0.12, canvasSize.h * 0.18, canvasSize.w * 0.55)
      g1.addColorStop(0, 'rgba(122,104,144,0.10)'); g1.addColorStop(0.6, 'rgba(122,104,144,0.03)'); g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

      const g2 = ctx.createRadialGradient(canvasSize.w * 0.82, canvasSize.h * 0.72, 0, canvasSize.w * 0.82, canvasSize.h * 0.72, canvasSize.w * 0.45)
      g2.addColorStop(0, 'rgba(88,112,128,0.08)'); g2.addColorStop(0.6, 'rgba(88,112,128,0.02)'); g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

      const g3 = ctx.createRadialGradient(canvasSize.w * 0.5, canvasSize.h * 0.45, 0, canvasSize.w * 0.5, canvasSize.h * 0.45, canvasSize.w * 0.5)
      g3.addColorStop(0, 'rgba(152,128,88,0.06)'); g3.addColorStop(1, 'transparent')
      ctx.fillStyle = g3; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)
    } else {
      const g1 = ctx.createRadialGradient(canvasSize.w * 0.12, canvasSize.h * 0.18, 0, canvasSize.w * 0.12, canvasSize.h * 0.18, canvasSize.w * 0.55)
      g1.addColorStop(0, 'rgba(184,160,208,0.16)'); g1.addColorStop(0.5, 'rgba(184,160,208,0.05)'); g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

      const g2 = ctx.createRadialGradient(canvasSize.w * 0.82, canvasSize.h * 0.72, 0, canvasSize.w * 0.82, canvasSize.h * 0.72, canvasSize.w * 0.45)
      g2.addColorStop(0, 'rgba(144,180,208,0.14)'); g2.addColorStop(0.5, 'rgba(144,180,208,0.04)'); g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

      const g3 = ctx.createRadialGradient(canvasSize.w * 0.55, canvasSize.h * 0.4, 0, canvasSize.w * 0.55, canvasSize.h * 0.4, canvasSize.w * 0.4)
      g3.addColorStop(0, 'rgba(208,184,136,0.10)'); g3.addColorStop(0.5, 'rgba(208,184,136,0.03)'); g3.addColorStop(1, 'transparent')
      ctx.fillStyle = g3; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)

      const g4 = ctx.createRadialGradient(canvasSize.w * 0.7, canvasSize.h * 0.2, 0, canvasSize.w * 0.7, canvasSize.h * 0.2, canvasSize.w * 0.35)
      g4.addColorStop(0, 'rgba(212,152,152,0.10)'); g4.addColorStop(0.5, 'rgba(212,152,152,0.03)'); g4.addColorStop(1, 'transparent')
      ctx.fillStyle = g4; ctx.fillRect(0, 0, canvasSize.w, canvasSize.h)
    }
  }

  function drawMonetGrid(ctx: CanvasRenderingContext2D) {
    if (viewBox.zoom <= 0.3) return
    const gs = 40
    const sx = Math.floor(viewBox.x / gs) * gs
    const sy = Math.floor(viewBox.y / gs) * gs
    const ex = viewBox.x + canvasSize.w / viewBox.zoom
    const ey = viewBox.y + canvasSize.h / viewBox.zoom

    const dotSize = Math.max(0.8, 1.2 / viewBox.zoom)
    const alpha = Math.min(0.12, 0.06 + (viewBox.zoom - 0.3) * 0.03)

    ctx.save()
    if (isDarkMode) {
      ctx.fillStyle = `rgba(160,150,180,${alpha})`
    } else {
      ctx.fillStyle = `rgba(155,142,127,${alpha})`
    }

    for (let x = sx; x <= ex; x += gs) {
      for (let y = sy; y <= ey; y += gs) {
        ctx.beginPath()
        ctx.arc(x, y, dotSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
    if (el.type === 'stroke') drawStrokeEl(ctx, el)
    else if (el.type === 'shape') drawShapeEl(ctx, el)
    else if (el.type === 'text') drawTextEl(ctx, el)
    else if (el.type === 'image') drawImageEl(ctx, el)
  }

  function drawStrokeEl(ctx: CanvasRenderingContext2D, el: StrokeElement) {
    if (el.points.length < 2) return
    const b = el.brush, pts = el.points
    if (b === 'pen') {
      ctx.beginPath(); ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 1
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }
      ctx.stroke(); ctx.globalAlpha = 1
    } else if (b === 'highlighter') {
      ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = el.color; ctx.lineWidth = el.size * 4; ctx.lineCap = 'square'
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.stroke(); ctx.restore()
    } else if (b === 'pencil') {
      ctx.save(); ctx.globalAlpha = 0.65; ctx.strokeStyle = el.color; ctx.lineWidth = el.size * 0.6; ctx.lineCap = 'round'
      for (let i = 1; i < pts.length; i++) {
        ctx.beginPath()
        const seed = (i * 7919) % 100 / 100
        ctx.moveTo(pts[i - 1][0] + (seed - 0.5) * el.size * 0.3, pts[i - 1][1] + ((seed * 1.3) % 1 - 0.5) * el.size * 0.3)
        ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke()
      }
      ctx.restore()
    } else if (b === 'calligraphy') {
      ctx.strokeStyle = el.color; ctx.lineCap = 'round'
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], c = pts[i]
        const wf = 0.3 + 0.7 * Math.abs(Math.sin(Math.atan2(c[1] - p[1], c[0] - p[0]) - Math.PI / 4))
        ctx.beginPath(); ctx.lineWidth = el.size * wf; ctx.moveTo(p[0], p[1]); ctx.lineTo(c[0], c[1]); ctx.stroke()
      }
    } else if (b === 'dashed') {
      ctx.beginPath(); ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'
      ctx.setLineDash([el.size * 2, el.size * 1.5])
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }
      ctx.stroke(); ctx.setLineDash([])
    } else if (b === 'glow') {
      ctx.save(); ctx.lineCap = 'round'
      ctx.shadowColor = el.color; ctx.shadowBlur = el.size * 4
      ctx.strokeStyle = el.color; ctx.lineWidth = el.size * 0.4; ctx.globalAlpha = 0.85
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }
      ctx.stroke()
      ctx.shadowBlur = el.size * 2; ctx.lineWidth = el.size * 0.7; ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], c = pts[i]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + c[0]) / 2, (p[1] + c[1]) / 2) }
      ctx.stroke(); ctx.restore()
    }
  }

  function drawStrokeRaw(ctx: CanvasRenderingContext2D, pts: number[][], c: string, s: number, b: string) {
    drawStrokeEl(ctx, { type: 'stroke', id: '', points: pts, color: c, size: s, brush: b as any })
  }

  function drawShapeEl(ctx: CanvasRenderingContext2D, el: ShapeElement) {
    ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const { x, y, w, h } = el
    const hasFill = el.fillColor && el.fillColor !== 'transparent'
    switch (el.kind) {
      case 'rectangle': {
        const rx = Math.min(6, Math.abs(w) * 0.05, Math.abs(h) * 0.05)
        ctx.beginPath()
        ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rx)
        ctx.lineTo(x + w, y + h - rx); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h)
        ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rx)
        ctx.lineTo(x, y + rx); ctx.quadraticCurveTo(x, y, x + rx, y)
        ctx.closePath()
        if (hasFill) { ctx.fillStyle = el.fillColor!; ctx.fill() }
        ctx.stroke(); break
      }
      case 'circle':
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2)
        if (hasFill) { ctx.fillStyle = el.fillColor!; ctx.fill() }
        ctx.stroke(); break
      case 'line': ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke(); break
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke()
        const a = Math.atan2(h, w), hl = Math.max(15, el.size * 3)
        ctx.beginPath()
        ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - hl * Math.cos(a - Math.PI / 6), y + h - hl * Math.sin(a - Math.PI / 6))
        ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - hl * Math.cos(a + Math.PI / 6), y + h - hl * Math.sin(a + Math.PI / 6))
        ctx.stroke(); break
      }
    }
  }

  function drawTextEl(ctx: CanvasRenderingContext2D, el: TextElement) {
    if (el.id === editingText?.id) return
    ctx.save()
    ctx.font = `${el.fontSize}px 'Noto Sans SC', 'PingFang SC', sans-serif`
    ctx.fillStyle = el.color
    ctx.textBaseline = 'top'
    const lineHeight = el.fontSize * 1.6
    const rawLines = el.content.split('\n')
    const wrappedLines: string[] = []
    for (const line of rawLines) {
      if (line === '') { wrappedLines.push(''); continue }
      let current = ''
      for (const char of line) {
        const test = current + char
        if (ctx.measureText(test).width > el.width && current.length > 0) {
          wrappedLines.push(current)
          current = char
        } else {
          current = test
        }
      }
      wrappedLines.push(current)
    }
    for (let i = 0; i < wrappedLines.length; i++) {
      ctx.fillText(wrappedLines[i], el.x, el.y + i * lineHeight)
    }
    ctx.restore()
  }

  function drawImageEl(ctx: CanvasRenderingContext2D, el: ImageElement) {
    const img = getImage(el.dataUrl)
    if (img?.complete) {
      ctx.save(); ctx.globalAlpha = el.opacity ?? 1
      const r = 6
      ctx.beginPath()
      ctx.moveTo(el.x + r, el.y); ctx.lineTo(el.x + el.width - r, el.y); ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + r)
      ctx.lineTo(el.x + el.width, el.y + el.height - r); ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - r, el.y + el.height)
      ctx.lineTo(el.x + r, el.y + el.height); ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - r)
      ctx.lineTo(el.x, el.y + r); ctx.quadraticCurveTo(el.x, el.y, el.x + r, el.y)
      ctx.closePath(); ctx.clip()
      ctx.drawImage(img, el.x, el.y, el.width, el.height)
      ctx.restore()
    }
  }

  function drawSelBox(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }) {
    const primary = isDarkMode ? '#C8A0B0' : '#B07D6E'
    const primaryLight = isDarkMode ? 'rgba(200,160,176,0.12)' : 'rgba(176,125,110,0.1)'

    ctx.save()
    ctx.strokeStyle = primary; ctx.lineWidth = 1.5 / viewBox.zoom; ctx.setLineDash([5 / viewBox.zoom, 5 / viewBox.zoom])
    ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([])

    ctx.fillStyle = primaryLight
    ctx.fillRect(b.x, b.y, b.w, b.h)

    const cornerR = 4 / viewBox.zoom
    ctx.fillStyle = primary
    ctx.shadowColor = isDarkMode ? 'rgba(200,160,176,0.3)' : 'rgba(176,125,110,0.3)'
    ctx.shadowBlur = 4 / viewBox.zoom
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) {
      ctx.beginPath()
      ctx.arc(cx, cy, cornerR, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
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
    ctx.save(); ctx.globalAlpha = 0.6

    ctx.fillStyle = isDarkMode ? 'rgba(34,32,44,0.85)' : 'rgba(251,246,238,0.85)'
    ctx.strokeStyle = isDarkMode ? 'rgba(160,150,180,0.15)' : 'rgba(155,142,127,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 10); ctx.fill(); ctx.stroke()

    const minimapColors = isDarkMode
      ? ['rgba(200,160,176,0.5)', 'rgba(106,90,128,0.5)', 'rgba(80,104,120,0.5)', 'rgba(138,120,80,0.5)']
      : ['rgba(176,125,110,0.5)', 'rgba(196,181,216,0.5)', 'rgba(160,188,212,0.5)', 'rgba(212,192,152,0.5)']
    let ci = 0
    for (const el of elements) {
      const b = elementBounds(el)
      ctx.fillStyle = minimapColors[ci % minimapColors.length]; ci++
      ctx.fillRect(mmX + (b.x - minX) * scale + (mmW - rangeX * scale) / 2, mmY + (b.y - minY) * scale + (mmH - rangeY * scale) / 2, Math.max(1, b.w * scale), Math.max(1, b.h * scale))
    }
    const vx = (viewBox.x - minX) * scale + (mmW - rangeX * scale) / 2, vy = (viewBox.y - minY) * scale + (mmH - rangeY * scale) / 2
    const vpColor = isDarkMode ? '#C8A0B0' : '#B07D6E'
    ctx.strokeStyle = vpColor; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(mmX + vx, mmY + vy, canvasSize.w / viewBox.zoom * scale, canvasSize.h / viewBox.zoom * scale, 3)
    ctx.stroke()
    ctx.restore()
  }

  function drawZoomLevel(ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement) {
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.font = '500 11px "Noto Sans SC", sans-serif'
    ctx.fillStyle = isDarkMode ? 'rgba(200,160,176,0.5)' : 'rgba(176,125,110,0.4)'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(viewBox.zoom * 100)}%`, canvasSize.w - 145, canvasSize.h - 50)
    ctx.restore()
  }

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => redrawRef.current())
  }, [])

  useEffect(() => { redrawRef.current = redraw }, [redraw])

  const SNAP_THRESHOLD = 6
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
      const b = elementBounds(el)
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
    if (tool === 'pan') { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; startPan(cx, cy); return }
    if (tool === 'select') {
      const h = hitHandle(pos.x, pos.y)
      if (h) {
        const el = useAppStore.getState().elements.find((e) => e.id === h.id)
        if (el) resizeRef.current = { ...h, startX: pos.x, startY: pos.y, origBounds: elementBounds(el) }
        scheduleRedraw(); return
      }
      const hit = hitTest(pos.x, pos.y)
      if (hit) {
        const st = useAppStore.getState()
        if (st.selectedIds.includes(hit)) {
          // clicked on already-selected element: start dragging all selected
          dragRef.current = { x: pos.x, y: pos.y, id: hit }
        } else {
          // clicked on unselected element: select only it
          setSelectedIds([hit])
          dragRef.current = { x: pos.x, y: pos.y, id: hit }
        }
        scheduleRedraw(); return
      }
      // clicked on empty space: start marquee selection
      marqueeRef.current = { startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y }
      setSelectedIds([])
      scheduleRedraw(); return
    }
    if (tool === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const screenX = (pos.x - viewBox.x) * viewBox.zoom + rect.left
        const screenY = (pos.y - viewBox.y) * viewBox.zoom + rect.top
        const hitEl = hitTest(pos.x, pos.y)
        const existing = hitEl ? elements.find((e) => e.id === hitEl && e.type === 'text') as TextElement | undefined : undefined
        if (existing) { setEditingText({ id: existing.id, x: existing.x, y: existing.y, screenX: (existing.x - viewBox.x) * viewBox.zoom + rect.left, screenY: (existing.y - viewBox.y) * viewBox.zoom + rect.top, content: existing.content, fontSize: existing.fontSize, color: existing.color }); setTimeout(() => textRef.current?.focus(), 50) }
        else { setEditingText({ id: `new-${Date.now()}`, x: pos.x, y: pos.y, screenX, screenY, content: '', fontSize: 16, color }); setTimeout(() => textRef.current?.focus(), 50) }
      }
      return
    }
    drawingRef.current = true; erasedRef.current = new Set()
    if (tool === 'pen') currentPtsRef.current = [[pos.x, pos.y]]
    else if (tool === 'eraser') eraseAt(pos.x, pos.y)
    else { shapeStartRef.current = pos; currentShapeRef.current = { type: 'shape', id: `shape-${Date.now()}`, kind: tool as ShapeKind, x: pos.x, y: pos.y, w: 0, h: 0, color, size, fillColor: fillColor !== 'transparent' ? fillColor : undefined } }
  }, [tool, color, size, getPos, startPan, setSelectedIds, scheduleRedraw, viewBox, elements])

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
      if (ob.w < 1 || ob.h < 1) { scheduleRedraw(); return }
      const nsx = Math.max(0.1, Math.min(10, handle === 0 || handle === 2 ? (targetX - ax) / (orig[0] - ax || 1) : (ax - targetX) / (ax - orig[0] || 1)))
      const nsy = Math.max(0.1, Math.min(10, handle === 0 || handle === 1 ? (targetY - ay) / (orig[1] - ay || 1) : (ay - targetY) / (ay - orig[1] || 1)))
      resizeElementById(id, ax, ay, nsx, nsy)
      scheduleRedraw(); return
    }
    if (tool === 'select' && marqueeRef.current) {
      marqueeRef.current = { ...marqueeRef.current, endX: pos.x, endY: pos.y }
      scheduleRedraw(); return
    }
    if (tool === 'select' && dragRef.current) {
      let dx = pos.x - dragRef.current.x, dy = pos.y - dragRef.current.y
      const st = useAppStore.getState()
      const ids = st.selectedIds.length > 0 ? st.selectedIds : [dragRef.current.id]
      const idSet = new Set(ids)

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of st.elements) {
        if (!idSet.has(el.id)) continue
        const b = elementBounds(el)
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
    if (tool === 'pan' && isPanning) { const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX; const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY; updatePan(cx, cy); scheduleRedraw(); return }
    if (tool === 'eraser') { if (drawingRef.current) eraseAt(pos.x, pos.y); scheduleRedraw(); return }
    if (!drawingRef.current) return
    if (tool === 'pen') currentPtsRef.current.push([pos.x, pos.y])
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
  }, [tool, isPanning, getPos, updatePan, scheduleRedraw, moveElementById, resizeElementById])

  const handleEnd = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault()
    if (tool === 'select') {
      if (marqueeRef.current) {
        const m = marqueeRef.current
        const x1 = Math.min(m.startX, m.endX), y1 = Math.min(m.startY, m.endY)
        const x2 = Math.max(m.startX, m.endX), y2 = Math.max(m.startY, m.endY)
        if (x2 - x1 > 3 || y2 - y1 > 3) {
          const els = useAppStore.getState().elements
          const hits: string[] = []
          for (const el of els) {
            const b = elementBounds(el)
            if (b.x + b.w >= x1 && b.x <= x2 && b.y + b.h >= y1 && b.y <= y2) {
              hits.push(el.id)
            }
          }
          setSelectedIds(hits)
        }
        marqueeRef.current = null
      }
      dragRef.current = null; resizeRef.current = null; snapLinesRef.current = { x: [], y: [] }; scheduleRedraw(); return
    }
    if (tool === 'pan') { endPan(); return }
    if (!drawingRef.current) return; drawingRef.current = false
    if (tool === 'pen') { if (currentPtsRef.current.length > 1) addElement({ type: 'stroke', id: `stroke-${Date.now()}`, points: simplifyPts(currentPtsRef.current, 2), color, size, brush }); currentPtsRef.current = [] }
    else if (tool === 'eraser') currentPtsRef.current = []
    else if (currentShapeRef.current) { if (Math.abs(currentShapeRef.current.w) > 2 || Math.abs(currentShapeRef.current.h) > 2) addElement(currentShapeRef.current); currentShapeRef.current = null; shapeStartRef.current = null }
    scheduleRedraw()
  }, [tool, color, size, brush, addElement, endPan, scheduleRedraw])

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

  const copySelectedToSystemClipboard = useCallback(() => {
    const st = useAppStore.getState()
    if (st.selectedIds.length === 0) return
    const selSet = new Set(st.selectedIds)
    const selectedEls = st.elements.filter((e) => selSet.has(e.id))
    if (selectedEls.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of selectedEls) {
      const b = elementBounds(el)
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
      const toolMap: Record<string, any> = { '1': 'pen', '2': 'eraser', '3': 'pan', '4': 'rectangle', '5': 'circle', '6': 'text', '7': 'line', '8': 'arrow', '0': 'select' }
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

  function commitTextEdit(content: string) {
    if (!editingText) return
    if (editingText.id.startsWith('new-')) {
      if (content.trim()) addElement({ type: 'text', id: `text-${Date.now()}`, x: editingText.x, y: editingText.y, width: Math.max(200, content.length * editingText.fontSize * 0.6), height: editingText.fontSize * 1.6, content: content.trim(), fontSize: editingText.fontSize, color: editingText.color })
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
          style={{
            position: 'fixed', left: editingText.screenX - 2, top: editingText.screenY,
            minWidth: 40, maxWidth: 800, minHeight: editingText.fontSize * viewBox.zoom * 1.6,
            padding: 0,
            fontSize: editingText.fontSize * viewBox.zoom,
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
          }} />
      )}
    </>
  )
}
