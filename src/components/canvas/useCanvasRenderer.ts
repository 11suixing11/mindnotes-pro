import { useRef, useEffect, useCallback, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useViewStore } from '../../store/useViewStore'
import { useThemeStore } from '../../store/useThemeStore'
import type { CanvasElement, ShapeElement, BrushType } from '../../store/types'
import { isVisibleInView, elementBounds } from '../../canvas/canvasUtils'
import {
  drawElement,
  drawStrokeRaw,
  drawSelBox,
  drawMonetGrid,
  drawCanvasBackground,
  drawMinimap,
  drawZoomLevel,
  drawGrid,
} from '../../canvas/canvasDrawing'
import { eraserParticleSystem } from '../../eraser'

export interface DrawState {
  drawing: boolean
  currentPts: number[][]
  currentShape: ShapeElement | null
  mousePos: { x: number; y: number } | null
  marquee: { startX: number; startY: number; endX: number; endY: number } | null
  snapLines: { x: number[]; y: number[] }
  tool: string
  color: string
  size: number
  brush: BrushType
  showGrid: boolean
  showRulers: boolean
  gridSize: number
}

export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  getDrawState: () => DrawState
) {
  const elementsCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const elementsDirtyRef = useRef(true)
  const boundsCacheRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(
    new Map()
  )
  const rafRef = useRef<number>(0)
  const redrawRef = useRef<() => void>(() => {})
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  function cachedBounds(el: CanvasElement) {
    const cache = boundsCacheRef.current
    let b = cache.get(el.id)
    if (!b) {
      b = elementBounds(el)
      cache.set(el.id, b)
    }
    return b
  }

  const getOrCreateEC = useCallback(() => {
    if (!elementsCanvasRef.current) elementsCanvasRef.current = document.createElement('canvas')
    const ec = elementsCanvasRef.current
    const tw = canvasSize.w * dpr,
      th = canvasSize.h * dpr
    if (ec.width !== tw || ec.height !== th) {
      ec.width = tw
      ec.height = th
      elementsDirtyRef.current = true
    }
    return ec
  }, [canvasSize, dpr])

  const renderElementsToCache = useCallback(() => {
    const ec = getOrCreateEC()
    const ctx = ec.getContext('2d')
    if (!ctx) return
    const els = useAppStore.getState().elements
    const selSet = new Set(useAppStore.getState().selectedIds)
    const dark = useThemeStore.getState().isDarkMode
    const vb = useViewStore.getState().viewBox
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    ctx.save()
    ctx.scale(vb.zoom, vb.zoom)
    ctx.translate(-vb.x, -vb.y)
    drawMonetGrid(ctx, vb, canvasSize, dark)
    const vl = vb.x,
      vt = vb.y,
      vw = canvasSize.w / vb.zoom,
      vh = canvasSize.h / vb.zoom
    for (const el of els) {
      if (!isVisibleInView(el, vl, vt, vw, vh)) continue
      drawElement(ctx, el, dark)
      if (selSet.has(el.id)) drawSelBox(ctx, cachedBounds(el), dark, vb.zoom)
    }
    ctx.restore()
    elementsDirtyRef.current = false
  }, [dpr, canvasSize, getOrCreateEC])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const st = useAppStore.getState()
    const dark = useThemeStore.getState().isDarkMode
    const vb = useViewStore.getState().viewBox
    const ds = getDrawState()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    drawCanvasBackground(ctx, canvasSize, st.bgColor, dark)

    // Draw grid overlay if enabled
    if (ds.showGrid) {
      ctx.save()
      ctx.scale(vb.zoom, vb.zoom)
      ctx.translate(-vb.x, -vb.y)
      drawGrid(ctx, vb, canvasSize, dark, ds.gridSize)
      ctx.restore()
    }

    const ec = getOrCreateEC()
    if (elementsDirtyRef.current) renderElementsToCache()
    ctx.drawImage(ec, 0, 0, ec.width, ec.height, 0, 0, canvasSize.w, canvasSize.h)
    
    // 渲染橡皮屑粒子
    ctx.save()
    ctx.scale(vb.zoom, vb.zoom)
    ctx.translate(-vb.x, -vb.y)
    eraserParticleSystem.render(ctx)
    ctx.restore()
    
    ctx.save()
    ctx.scale(vb.zoom, vb.zoom)
    ctx.translate(-vb.x, -vb.y)
    if (ds.drawing && ds.tool === 'pen' && ds.currentPts.length > 1)
      drawStrokeRaw(ctx, ds.currentPts, ds.color, ds.size, ds.brush, dark)
    if (ds.currentShape) drawElement(ctx, ds.currentShape, dark)
    if (ds.tool === 'eraser' && ds.mousePos) {
      const r = ds.size * 2 + 10
      ctx.save()
      ctx.strokeStyle = dark ? 'rgba(200,160,176,0.5)' : 'rgba(176,125,110,0.35)'
      ctx.lineWidth = 1.5 / vb.zoom
      ctx.setLineDash([5 / vb.zoom, 5 / vb.zoom])
      ctx.beginPath()
      ctx.arc(ds.mousePos.x, ds.mousePos.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = dark ? 'rgba(200,160,176,0.04)' : 'rgba(176,125,110,0.04)'
      ctx.beginPath()
      ctx.arc(ds.mousePos.x, ds.mousePos.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
    if (ds.marquee) {
      const m = ds.marquee
      const x = Math.min(m.startX, m.endX),
        y = Math.min(m.startY, m.endY)
      const w = Math.abs(m.endX - m.startX),
        h = Math.abs(m.endY - m.startY)
      const sx = (x - vb.x) * vb.zoom,
        sy = (y - vb.y) * vb.zoom,
        sw = w * vb.zoom,
        sh = h * vb.zoom
      ctx.save()
      ctx.strokeStyle = dark ? 'rgba(200,160,176,0.7)' : 'rgba(176,125,110,0.7)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      ctx.strokeRect(sx, sy, sw, sh)
      ctx.setLineDash([])
      ctx.fillStyle = dark ? 'rgba(200,160,176,0.06)' : 'rgba(176,125,110,0.06)'
      ctx.fillRect(sx, sy, sw, sh)
      ctx.restore()
    }
    const snaps = ds.snapLines
    if (snaps.x.length > 0 || snaps.y.length > 0) {
      ctx.save()
      ctx.strokeStyle = dark ? 'rgba(200,160,176,0.5)' : 'rgba(176,125,110,0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      for (const lx of snaps.x) {
        const sx2 = (lx - vb.x) * vb.zoom
        ctx.beginPath()
        ctx.moveTo(sx2, 0)
        ctx.lineTo(sx2, canvasSize.h)
        ctx.stroke()
      }
      for (const ly of snaps.y) {
        const sy2 = (ly - vb.y) * vb.zoom
        ctx.beginPath()
        ctx.moveTo(0, sy2)
        ctx.lineTo(canvasSize.w, sy2)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()
    }
    drawMinimap(ctx, st.elements, cachedBounds, vb, canvasSize, dark, st.bgColor)
    drawZoomLevel(ctx, vb, canvasSize, dark, dpr)
  }, [dpr, canvasSize, getOrCreateEC, renderElementsToCache, canvasRef, getDrawState])

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => redrawRef.current())
  }, [])

  useEffect(() => {
    redrawRef.current = redraw
  }, [redraw])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        if (width > 0 && height > 0) setCanvasSize({ w: Math.round(width), h: Math.round(height) })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [containerRef])

  useEffect(() => {
    redraw()
  }, [redraw, canvasSize])

  useEffect(() => {
    let prev = useAppStore.getState().elements
    const unsub = useAppStore.subscribe((s) => {
      if (s.elements !== prev) {
        elementsDirtyRef.current = true
        boundsCacheRef.current.clear()
        prev = s.elements
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => redrawRef.current())
    })
    return () => {
      unsub()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    const h = () => {
      elementsDirtyRef.current = true
      redraw()
    }
    window.addEventListener('image-loaded', h)
    return () => window.removeEventListener('image-loaded', h)
  }, [redraw])

  // Subscribe to showGrid changes to trigger redraw
  useEffect(() => {
    const unsub = useViewStore.subscribe(() => {
      scheduleRedraw()
    })
    return unsub
  }, [scheduleRedraw])

  // 粒子系统更新循环（独立于渲染循环）
  useEffect(() => {
    let lastTime = performance.now()
    let particleRafId: number

    function updateParticles() {
      const now = performance.now()
      const deltaTime = Math.min((now - lastTime) / 1000, 0.1) // 限制最大delta防止跳帧
      lastTime = now

      eraserParticleSystem.update(deltaTime)
      particleRafId = requestAnimationFrame(updateParticles)
    }

    particleRafId = requestAnimationFrame(updateParticles)

    return () => {
      cancelAnimationFrame(particleRafId)
    }
  }, [])

  return { redraw, scheduleRedraw, elementsDirtyRef, boundsCacheRef, cachedBounds, canvasSize, dpr }
}
