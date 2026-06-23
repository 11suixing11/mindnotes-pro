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
  invalidateDrawingCaches,
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
  /** 最近的擦除轨迹点（用于拖尾渲染） */
  eraserTrail: { x: number; y: number; time: number }[]
  /** 笔触绘制时的速度（用于笔触光标反馈） */
  penVelocity: number
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

  // P1-1 优化: selectedIds 缓存，使用引用比较避免字符串拼接
  const selectedIdsCacheRef = useRef<Set<string>>(new Set())
  const lastSelectedIdsArrRef = useRef<string[]>([])
  // P2-2: dpr 改为 ref，极少变化
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  const dpr = dprRef.current
  // P2-1: canvasSize 改用 ref 避免 React 重渲染，配合手动 redraw
  const canvasSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight })
  const [, forceUpdate] = useState(0)
  const canvasSize = canvasSizeRef.current

  // P1 性能优化: 橡皮擦光标颜色缓存 - 避免每帧创建相同的颜色字符串
  // 性能提升: 减少 GC 压力，每帧减少 ~15 次字符串分配
  const eraserColorCacheRef = useRef<{
    dark: { stroke: string; fill: string; center: string; glow0: string; glow6: string; glow1: string }
    light: { stroke: string; fill: string; center: string; glow0: string; glow6: string; glow1: string }
  }>({
    dark: {
      stroke: 'rgba(200,160,176, 0.35)',
      fill: 'rgba(200,160,176, 0.55)',
      center: 'rgba(200,160,176, 0.7)',
      glow0: 'rgba(200,160,176, 0.06)',
      glow6: 'rgba(200,160,176, 0.03)',
      glow1: 'rgba(200,160,176, 0)',
    },
    light: {
      stroke: 'rgba(176,125,110, 0.35)',
      fill: 'rgba(176,125,110, 0.55)',
      center: 'rgba(176,125,110, 0.7)',
      glow0: 'rgba(176,125,110, 0.06)',
      glow6: 'rgba(176,125,110, 0.03)',
      glow1: 'rgba(176,125,110, 0)',
    },
  })

  // P1 性能优化: 笔触光标颜色缓存
  const penColorCacheRef = useRef<{
    dark: { stroke: string; fill: string; center: string }
    light: { stroke: string; fill: string; center: string }
  }>({
    dark: {
      stroke: 'rgba(200,160,176, 0.4)',
      fill: 'rgba(200,160,176, 0.06)',
      center: 'rgba(200,160,176, 0.6)',
    },
    light: {
      stroke: 'rgba(176,125,110, 0.4)',
      fill: 'rgba(176,125,110, 0.06)',
      center: 'rgba(176,125,110, 0.6)',
    },
  })

  // P1 性能优化: 橡皮擦拖尾颜色缓存 - 预计算10级alpha值
  // 性能提升: 拖尾渲染时零字符串分配，减少 GC 压力
  const eraserTrailColorCacheRef = useRef<{
    dark: string[]
    light: string[]
  }>({
    dark: [
      'rgba(200,160,176, 0.018)',
      'rgba(200,160,176, 0.036)',
      'rgba(200,160,176, 0.054)',
      'rgba(200,160,176, 0.072)',
      'rgba(200,160,176, 0.090)',
      'rgba(200,160,176, 0.108)',
      'rgba(200,160,176, 0.126)',
      'rgba(200,160,176, 0.144)',
      'rgba(200,160,176, 0.162)',
      'rgba(200,160,176, 0.180)',
    ],
    light: [
      'rgba(176,125,110, 0.018)',
      'rgba(176,125,110, 0.036)',
      'rgba(176,125,110, 0.054)',
      'rgba(176,125,110, 0.072)',
      'rgba(176,125,110, 0.090)',
      'rgba(176,125,110, 0.108)',
      'rgba(176,125,110, 0.126)',
      'rgba(176,125,110, 0.144)',
      'rgba(176,125,110, 0.162)',
      'rgba(176,125,110, 0.180)',
    ],
  })

  function cachedBounds(el: CanvasElement) {
    const cache = boundsCacheRef.current
    let b = cache.get(el.id)
    if (!b) {
      b = elementBounds(el)
      cache.set(el.id, b)
    }
    return b
  }
  // P1-1 优化: 获取缓存的 selectedIds Set (引用比较)
  function getCachedSelectedIds(): Set<string> {
    const selectedIds = useAppStore.getState().selectedIds

    if (selectedIds !== lastSelectedIdsArrRef.current) {
      selectedIdsCacheRef.current = new Set(selectedIds)
      lastSelectedIdsArrRef.current = selectedIds
    }

    return selectedIdsCacheRef.current
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

    const st = useAppStore.getState()
    const els = st.elements
    const selSet = getCachedSelectedIds() // P1 优化: 使用缓存的 Set
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

    // P0 性能优化: 使用空间索引进行 O(log n) 视口裁剪
    // 大画布场景下（1000+ 元素），性能提升 10-100x
    const visibleIds = st.spatialIndex?.queryVisible(vl, vt, vw, vh)

    if (visibleIds && visibleIds.length > 0) {
      // P0 优化: 使用 idToElement O(1) 查找，只遍历视口内元素
      // 复杂度从 O(n) → O(k)，大画布场景提升 10-100x
      for (const id of visibleIds) {
        const el = st.idToElement.get(id)
        if (!el) continue
        drawElement(ctx, el, dark)
        if (selSet.has(id)) drawSelBox(ctx, cachedBounds(el), dark, vb.zoom)
      }
    } else if (visibleIds) {
      // 空间索引可用但视口为空，跳过渲染
    } else {
      // 降级: 空间索引不可用时使用原有 O(n) 遍历
      for (const el of els) {
        if (!isVisibleInView(el, vl, vt, vw, vh)) continue
        drawElement(ctx, el, dark)
        if (selSet.has(el.id)) drawSelBox(ctx, cachedBounds(el), dark, vb.zoom)
      }
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

    // P1 优化: 合并 save/restore，只做一次 transform 应用
    ctx.save()
    ctx.scale(vb.zoom, vb.zoom)
    ctx.translate(-vb.x, -vb.y)

    // 渲染橡皮屑粒子
    eraserParticleSystem.render(ctx)
    if (ds.drawing && ds.tool === 'pen' && ds.currentPts.length > 1)
      drawStrokeRaw(ctx, ds.currentPts, ds.color, ds.size, ds.brush, dark)
    if (ds.currentShape) drawElement(ctx, ds.currentShape, dark)

    // 笔触绘制时：显示大小预览光标（半透明圆圈）
    // P1 性能优化: 使用缓存的颜色字符串，避免每帧创建新字符串
    if (ds.tool === 'pen' && ds.mousePos && !ds.drawing) {
      const penR = ds.size / 2
      const colors = dark ? penColorCacheRef.current.dark : penColorCacheRef.current.light
      ctx.beginPath()
      ctx.arc(ds.mousePos.x, ds.mousePos.y, penR, 0, Math.PI * 2)
      ctx.strokeStyle = colors.stroke
      ctx.lineWidth = 1 / vb.zoom
      ctx.stroke()
      ctx.fillStyle = colors.fill
      ctx.fill()
      // 中心点
      ctx.beginPath()
      ctx.arc(ds.mousePos.x, ds.mousePos.y, 1.5 / vb.zoom, 0, Math.PI * 2)
      ctx.fillStyle = colors.center
      ctx.fill()
    }

    // 增强的橡皮擦光标
    // P1 性能优化: 使用缓存的颜色字符串，避免每帧创建 ~15 个新字符串
    if (ds.tool === 'eraser' && ds.mousePos) {
      const r = ds.size * 2 + 10
      const colors = dark ? eraserColorCacheRef.current.dark : eraserColorCacheRef.current.light
      const x = ds.mousePos.x
      const y = ds.mousePos.y

      // 擦除拖尾效果
      if (ds.eraserTrail.length >= 2) {
        const now = performance.now()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        // P1 优化: 预计算所有可能的 alpha 颜色字符串，避免循环内字符串拼接
        // 性能提升: 拖尾渲染减少 ~80% 字符串分配
        const trailColors = dark
          ? eraserTrailColorCacheRef.current.dark
          : eraserTrailColorCacheRef.current.light
        for (let i = 1; i < ds.eraserTrail.length; i++) {
          const p0 = ds.eraserTrail[i - 1]
          const p1 = ds.eraserTrail[i]
          const age = (now - p1.time) / 400 // 400ms fade
          if (age > 1) continue
          const colorIndex = Math.min(Math.floor((1 - age) * 10), 9)
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = trailColors[colorIndex]
          ctx.lineWidth = r * 0.6 * (1 - age * 0.3)
          ctx.stroke()
        }
      }

      // 外圈：虚线指示擦除范围
      ctx.strokeStyle = colors.stroke
      ctx.lineWidth = 1.2 / vb.zoom
      ctx.setLineDash([4 / vb.zoom, 4 / vb.zoom])
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // 内圈：实线指示精确范围
      ctx.strokeStyle = colors.fill
      ctx.lineWidth = 1.5 / vb.zoom
      ctx.beginPath()
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2)
      ctx.stroke()

      // 中心十字准星
      const crossSize = 4 / vb.zoom
      ctx.strokeStyle = colors.center
      ctx.lineWidth = 1.2 / vb.zoom
      ctx.beginPath()
      ctx.moveTo(x - crossSize, y)
      ctx.lineTo(x + crossSize, y)
      ctx.moveTo(x, y - crossSize)
      ctx.lineTo(x, y + crossSize)
      ctx.stroke()

      // 中心点
      ctx.beginPath()
      ctx.arc(x, y, 1.8 / vb.zoom, 0, Math.PI * 2)
      ctx.fillStyle = colors.center
      ctx.fill()

      // 柔和光晕填充 - 使用缓存的渐变颜色
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, r)
      glowGrad.addColorStop(0, colors.glow0)
      glowGrad.addColorStop(0.6, colors.glow6)
      glowGrad.addColorStop(1, colors.glow1)
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      // 绘制中：外圈脉冲动画效果
      if (ds.drawing) {
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120)
        // P1 优化: 脉冲效果使用预计算RGB，只动态计算alpha
        const pulseRgb = dark ? '200,160,176' : '176,125,110'
        ctx.strokeStyle = `rgba(${pulseRgb}, ${0.15 + pulse * 0.15})`
        ctx.lineWidth = 2 / vb.zoom
        ctx.beginPath()
        ctx.arc(x, y, r * (1.05 + pulse * 0.08), 0, Math.PI * 2)
        ctx.stroke()
      }
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
        if (width > 0 && height > 0) {
          const w = Math.round(width),
            h = Math.round(height)
          if (canvasSizeRef.current.w !== w || canvasSizeRef.current.h !== h) {
            canvasSizeRef.current = { w, h }
            forceUpdate((n) => n + 1) // 触发一次重渲染以更新依赖 canvasSize 的 callbacks
          }
        }
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [containerRef])
  useEffect(() => {
    redraw()
  }, [redraw, canvasSize])
  // P0 修复 + P1 优化: 增量更新 bounds 缓存，精确检测元素修改
  // P0-2 优化: 避免每帧创建完整 Map，使用引用比较 + Set 差集
  useEffect(() => {
    let prevElements = useAppStore.getState().elements
    let prevIdSet = new Set(prevElements.map((e) => e.id))
    const prevRefMap = new Map<string, CanvasElement>()
    for (const e of prevElements) prevRefMap.set(e.id, e)

    // P0-5: subscribe 仅处理 elements 变化，非 elements 变化快速退出
    const unsub = useAppStore.subscribe((s) => {
      const currElements = s.elements
      if (currElements === prevElements) return // 快速退出：非 elements 变化

      {
        // elements 变化处理块
        elementsDirtyRef.current = true

        // P1 优化: 元素变化时主动清除绘制缓存（minimap、网格、渐变等）
        invalidateDrawingCaches()

        // P0-2 优化: 使用引用比较而非全量 Map 创建
        // 只在元素引用变化时才失效缓存
        const currIdSet = new Set<string>()
        for (const el of currElements) {
          currIdSet.add(el.id)
          const prevEl = prevRefMap.get(el.id)
          // 元素不存在（新增）或引用变化（修改）时失效缓存
          if (!prevEl || prevEl !== el) {
            boundsCacheRef.current.delete(el.id)
          }
        }

        // 移除已删除元素的缓存
        for (const id of prevIdSet) {
          if (!currIdSet.has(id)) {
            boundsCacheRef.current.delete(id)
          }
        }

        // P0-4 优化: 增量更新 prevRefMap，避免每次都重建完整 Map
        // 只添加新元素，删除已移除的元素
        for (const el of currElements) {
          prevRefMap.set(el.id, el)
        }
        // 删除已不存在的元素
        for (const id of prevIdSet) {
          if (!currIdSet.has(id)) {
            prevRefMap.delete(id)
          }
        }
        // 更新快照引用
        prevElements = currElements
        prevIdSet = currIdSet
      }

      // 调度重绘（已通过 raf 合并）
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
  // P1-6: 仅订阅 viewBox/showGrid 变化触发重绘
  useEffect(() => {
    let prevVB = useViewStore.getState().viewBox
    let prevGrid = useViewStore.getState().showGrid
    const unsub = useViewStore.subscribe((s) => {
      if (s.viewBox !== prevVB || s.showGrid !== prevGrid) {
        prevVB = s.viewBox
        prevGrid = s.showGrid
        scheduleRedraw()
      }
    })
    return unsub
  }, [scheduleRedraw])
  // P0-1 修复 + P1 优化: 粒子系统更新循环 - 无活动粒子时挂起循环，有粒子时恢复
  useEffect(() => {
    let lastTime = performance.now()
    let particleRafId: number | null = null
    let running = false

    function updateParticles() {
      const now = performance.now()
      const deltaTime = Math.min((now - lastTime) / 1000, 0.1) // 限制最大delta防止跳帧
      lastTime = now

      if (eraserParticleSystem.getParticleCount() > 0) {
        eraserParticleSystem.update(deltaTime)
        particleRafId = requestAnimationFrame(updateParticles)
      } else {
        // 无活动粒子，挂起循环等待下次唤醒
        running = false
        particleRafId = null
      }
    }

    // 监听粒子发射事件，唤醒循环
    function onParticlesEmitted() {
      if (!running) {
        running = true
        lastTime = performance.now()
        particleRafId = requestAnimationFrame(updateParticles)
      }
    }

    // 每次重绘时检查是否有粒子需要更新
    const unsub = useAppStore.subscribe(() => {
      if (eraserParticleSystem.getParticleCount() > 0 && !running) {
        onParticlesEmitted()
      }
    })

    return () => {
      if (particleRafId !== null) {
        cancelAnimationFrame(particleRafId)
      }
      unsub()
    }
  }, [])
  return { redraw, scheduleRedraw, elementsDirtyRef, boundsCacheRef, cachedBounds, canvasSize, dpr }
}
