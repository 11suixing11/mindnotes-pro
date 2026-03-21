import { useRef, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import { useAppStore } from '../store/useAppStore'
import type { Stroke, Shape, TextElement } from '../store/useAppStore'
import { useThemeStore } from '../store/useThemeStore'
import { hitTestAll } from '../utils/hitTest'

interface CanvasProps {
  onCanvasRef?: (ref: HTMLCanvasElement | null) => void
}

// 从 perfect-freehand 的点数组生成 SVG 路径
function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )
  d.push('Z')
  return d.join(' ')
}

// 绘制单条笔迹
function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  color: string,
  size: number,
  isEraser: boolean,
  zoom: number = 1,
) {
  if (points.length < 2) return

  const stroke = getStroke(points, {
    size: size / zoom,
    thinning: 0.15,      // 低粗细变化，笔画均匀清晰
    smoothing: 0.5,
    streamline: 0.6,     // 提高平滑度，让曲线更流畅
    simulatePressure: false,
    easing: (t) => t,    // 线性压力映射
  })

  const pathData = getSvgPathFromStroke(stroke)

  if (isEraser) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    const path = new Path2D(pathData)
    ctx.fill(path)
    ctx.restore()
  } else {
    ctx.fillStyle = color
    const path = new Path2D(pathData)
    ctx.fill(path)
  }
}

// 获取元素的边界框
function getElementBounds(
  id: string,
  strokes: Stroke[],
  shapes: Shape[],
  textElements: TextElement[],
): { x: number; y: number; width: number; height: number } | null {
  // 查找 stroke
  const stroke = strokes.find((s) => s.id === id)
  if (stroke && stroke.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of stroke.points) {
      if (p[0] < minX) minX = p[0]
      if (p[1] < minY) minY = p[1]
      if (p[0] > maxX) maxX = p[0]
      if (p[1] > maxY) maxY = p[1]
    }
    const pad = stroke.size / 2 + 4
    return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
  }

  // 查找 shape
  const shape = shapes.find((s) => s.id === id)
  if (shape) {
    if (shape.type === 'line' || shape.type === 'arrow') {
      const x1 = Math.min(shape.startX!, shape.endX!)
      const y1 = Math.min(shape.startY!, shape.endY!)
      return { x: x1, y: y1, width: Math.abs(shape.endX! - shape.startX!), height: Math.abs(shape.endY! - shape.startY!) }
    }
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
  }

  // 查找 textElement
  const textEl = textElements.find((t) => t.id === id)
  if (textEl && textEl.text) {
    const lines = textEl.text.split('\n')
    const maxLineLen = Math.max(...lines.map((l) => l.length))
    const w = maxLineLen * textEl.fontSize * 0.6
    const h = lines.length * textEl.fontSize * 1.4
    return { x: textEl.x, y: textEl.y, width: w, height: h }
  }

  return null
}

export default function Canvas({ onCanvasRef }: CanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<number[][]>([])
  const isDrawingRef = useRef(false)
  const animFrameRef = useRef<number>(0)
  const lastPressureRef = useRef(0.5)
  const dragStartRef = useRef<{ id: string; x: number; y: number } | null>(null)

  // 传递 canvas 引用给父组件
  useEffect(() => {
    onCanvasRef?.(canvasRef.current)
    return () => onCanvasRef?.(null)
  }, [onCanvasRef])

  const {
    strokes,
    currentStroke,
    shapes,
    currentShape,
    textElements,
    editingTextId,
    tool,
    startStroke,
    updateCurrentStroke,
    finishStroke,
    startShape,
    updateCurrentShape,
    finishShape,
    addTextElement,
    updateTextElement,
    deleteTextElement,
    setEditingText,
    viewBox,
    setViewBox,
    selectedLayerId,
    setSelectedLayer,
    moveElementBy,
  } = useAppStore()

  const { isDarkMode } = useThemeStore()

  // 获取画布坐标（考虑缩放和偏移）
  const getCanvasPos = useCallback(
    (e: PointerEvent | MouseEvent | TouchEvent, rect: DOMRect) => {
      let clientX: number, clientY: number
      if ('touches' in e) {
        if (e.touches.length === 0) return null
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      const x = (clientX - rect.left) / viewBox.zoom + viewBox.x
      const y = (clientY - rect.top) / viewBox.zoom + viewBox.y
      return [x, y]
    },
    [viewBox]
  )

  // 功能1：键盘输入文字 - 选择文字工具后直接按键创建文字
  // 功能2：粘贴输入文字 - Ctrl+V 粘贴剪贴板纯文本
  useEffect(() => {
    // 判断是否为可打印字符（单个字符，不是功能键）
    const isPrintableKey = (e: KeyboardEvent): boolean => {
      if (e.key.length !== 1) return false
      if (e.ctrlKey || e.metaKey || e.altKey) return false
      return true
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useAppStore.getState()

      // Ctrl+V / Cmd+V: 内部粘贴（复制粘贴元素），系统剪贴板粘贴由 paste 事件处理
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (state.editingTextId !== null) return // 编辑文字时让浏览器处理
        // 延迟检查：如果 paste 事件捕获到系统文本则不执行内部粘贴
        setTimeout(() => {
          if ((window as any).__mindnotes_system_paste_handled) return
          useAppStore.getState().paste()
        }, 50)
        return
      }

      if (state.tool !== 'text') return
      if (state.editingTextId !== null) return
      if (!isPrintableKey(e)) return

      // 在画布当前视图中心创建文字
      const { viewBox } = state
      const canvas = canvasRef.current
      if (!canvas) return
      const centerX = viewBox.x + (canvas.clientWidth / 2) / viewBox.zoom
      const centerY = viewBox.y + (canvas.clientHeight / 2) / viewBox.zoom

      e.preventDefault()
      addTextElement(centerX, centerY)
    }

    const handlePaste = (e: ClipboardEvent) => {
      const state = useAppStore.getState()
      // 非编辑文字状态时才处理系统剪贴板粘贴
      if (state.editingTextId !== null) return

      const text = e.clipboardData?.getData('text/plain')
      if (!text) return

      e.preventDefault()
      // 标记系统粘贴已处理，阻止 keydown 中的内部粘贴
      ;(window as any).__mindnotes_system_paste_handled = true
      setTimeout(() => { (window as any).__mindnotes_system_paste_handled = false }, 100)

      // 有系统剪贴板文本 → 创建文字元素
      const { viewBox } = state
      const canvas = canvasRef.current
      if (!canvas) return
      const centerX = viewBox.x + (canvas.clientWidth / 2) / viewBox.zoom
      const centerY = viewBox.y + (canvas.clientHeight / 2) / viewBox.zoom

      const { color, size } = state
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6)
      const newText = {
        id,
        x: centerX,
        y: centerY,
        text,
        color,
        fontSize: size * 4,
      }
      const store = useAppStore.getState()
      store._pushHistory()
      useAppStore.setState((s) => ({
        textElements: [...s.textElements, newText],
        editingTextId: id,
      }))
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('paste', handlePaste)
    }
  }, [addTextElement])

  // 重绘画布
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    const isDark = document.documentElement.classList.contains('dark')

    // ── 第 1 层：底色渐变（顶部微蓝 → 底部微暖）─────────
    const baseGrad = ctx.createLinearGradient(0, 0, 0, h)
    if (isDark) {
      baseGrad.addColorStop(0, '#1e1e3a')
      baseGrad.addColorStop(0.5, '#1a1a2e')
      baseGrad.addColorStop(1, '#16162a')
    } else {
      baseGrad.addColorStop(0, '#f8f9ff')
      baseGrad.addColorStop(0.5, '#ffffff')
      baseGrad.addColorStop(1, '#fff8f0')
    }
    ctx.fillStyle = baseGrad
    ctx.fillRect(0, 0, w, h)

    // ── 第 2 层：彩色光晕（更明显的存在感）─────────
    const orbs = isDark
      ? [
          { x: w * 0.12, y: h * 0.15, r: 500, c1: 'rgba(99,102,241,0.12)', c2: 'rgba(99,102,241,0)' },
          { x: w * 0.88, y: h * 0.8, r: 450, c1: 'rgba(236,72,153,0.08)', c2: 'rgba(236,72,153,0)' },
          { x: w * 0.55, y: h * 0.05, r: 400, c1: 'rgba(56,189,248,0.07)', c2: 'rgba(56,189,248,0)' },
        ]
      : [
          { x: w * 0.12, y: h * 0.15, r: 500, c1: 'rgba(99,102,241,0.08)', c2: 'rgba(99,102,241,0)' },
          { x: w * 0.88, y: h * 0.8, r: 450, c1: 'rgba(244,114,182,0.06)', c2: 'rgba(244,114,182,0)' },
          { x: w * 0.55, y: h * 0.05, r: 400, c1: 'rgba(14,165,233,0.05)', c2: 'rgba(14,165,233,0)' },
        ]

    for (const orb of orbs) {
      const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
      g.addColorStop(0, orb.c1)
      g.addColorStop(1, orb.c2)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }

    // ── 第 3 层：暗角（vignette）聚焦中心 ─────────
    const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8)
    if (isDark) {
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.15)')
    } else {
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.03)')
    }
    ctx.fillStyle = vignetteGrad
    ctx.fillRect(0, 0, w, h)

    // ── 第 4 层：圆点网格（更大、更好看）─────────
    const dotSpacing = 28
    const dotRadius = 1.2
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)'
    for (let x = dotSpacing; x < w; x += dotSpacing) {
      for (let y = dotSpacing; y < h; y += dotSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.save()
    ctx.scale(viewBox.zoom, viewBox.zoom)
    ctx.translate(-viewBox.x, -viewBox.y)

    // 绘制已完成的笔迹
    for (const stroke of strokes) {
      if (stroke.hidden) continue
      ctx.save()
      if (stroke.opacity !== undefined) ctx.globalAlpha = stroke.opacity
      drawStroke(ctx, stroke.points, stroke.color, stroke.size, stroke.tool === 'eraser', viewBox.zoom)
      ctx.restore()
    }

    // 绘制当前笔迹
    if (currentStroke && currentStroke.points.length > 1) {
      drawStroke(
        ctx,
        currentStroke.points,
        currentStroke.color,
        currentStroke.size,
        currentStroke.tool === 'eraser',
        viewBox.zoom,
      )
    }

    // 绘制形状
    for (const shape of shapes) {
      if (shape.hidden) continue
      ctx.save()
      ctx.strokeStyle = shape.color
      ctx.lineWidth = shape.size / viewBox.zoom
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (shape.opacity !== undefined) ctx.globalAlpha = shape.opacity

      const { x, y, width, height, type } = shape

      if (type === 'rectangle') {
        if (shape.fillColor) {
          ctx.save()
          ctx.globalAlpha = shape.fillOpacity ?? 0.2
          ctx.fillStyle = shape.fillColor
          ctx.fillRect(x, y, width, height)
          ctx.restore()
        }
        ctx.strokeRect(x, y, width, height)
      } else if (type === 'circle') {
        ctx.beginPath()
        const rx = Math.abs(width) / 2
        const ry = Math.abs(height) / 2
        ctx.ellipse(x + width / 2, y + height / 2, rx, ry, 0, 0, Math.PI * 2)
        if (shape.fillColor) {
          ctx.save()
          ctx.globalAlpha = shape.fillOpacity ?? 0.2
          ctx.fillStyle = shape.fillColor
          ctx.fill()
          ctx.restore()
          ctx.beginPath()
          ctx.ellipse(x + width / 2, y + height / 2, rx, ry, 0, 0, Math.PI * 2)
        }
        ctx.stroke()
      } else if (type === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(x + width / 2, y)
        ctx.lineTo(x + width, y + height)
        ctx.lineTo(x, y + height)
        ctx.closePath()
        if (shape.fillColor) {
          ctx.save()
          ctx.globalAlpha = shape.fillOpacity ?? 0.2
          ctx.fillStyle = shape.fillColor
          ctx.fill()
          ctx.restore()
          ctx.beginPath()
          ctx.moveTo(x + width / 2, y)
          ctx.lineTo(x + width, y + height)
          ctx.lineTo(x, y + height)
          ctx.closePath()
        }
        ctx.stroke()
      } else if (type === 'line' && shape.startX !== undefined) {
        ctx.beginPath()
        ctx.moveTo(shape.startX, shape.startY!)
        ctx.lineTo(shape.endX!, shape.endY!)
        ctx.stroke()
      } else if (type === 'arrow' && shape.startX !== undefined) {
        const sx = shape.startX!, sy = shape.startY!
        const ex = shape.endX!, ey = shape.endY!
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        // 箭头头部
        const angle = Math.atan2(ey - sy, ex - sx)
        const headLen = 15 / viewBox.zoom
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
      }
      ctx.restore()
    }

    // 绘制当前形状
    if (currentShape) {
      ctx.save()
      ctx.strokeStyle = currentShape.color
      ctx.lineWidth = currentShape.size / viewBox.zoom
      ctx.lineCap = 'round'
      ctx.setLineDash([5, 5])

      const { x, y, width, height, type } = currentShape
      if (type === 'rectangle') {
        ctx.strokeRect(x, y, width, height)
      } else if (type === 'circle') {
        ctx.beginPath()
        ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (type === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(x + width / 2, y)
        ctx.lineTo(x + width, y + height)
        ctx.lineTo(x, y + height)
        ctx.closePath()
        ctx.stroke()
      } else if ((type === 'line' || type === 'arrow') && currentShape.startX !== undefined) {
        ctx.beginPath()
        ctx.moveTo(currentShape.startX, currentShape.startY!)
        ctx.lineTo(currentShape.endX!, currentShape.endY!)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 绘制文字
    for (const textEl of textElements) {
      if (textEl.hidden || !textEl.text) continue
      ctx.save()
      ctx.font = `${textEl.bold ? 'bold ' : ''}${textEl.fontSize / viewBox.zoom}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
      ctx.fillStyle = textEl.color
      ctx.textBaseline = 'top'
      if (textEl.opacity !== undefined) ctx.globalAlpha = textEl.opacity
      // 绘制多行文字
      const lines = textEl.text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textEl.x, textEl.y + i * (textEl.fontSize / viewBox.zoom * 1.4))
      }
      ctx.restore()
    }

    // 绘制选中框
    if (selectedLayerId) {
      const bounds = getElementBounds(selectedLayerId, strokes, shapes, textElements)
      if (bounds) {
        ctx.save()
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 1.5 / viewBox.zoom
        ctx.setLineDash([6 / viewBox.zoom, 4 / viewBox.zoom])
        ctx.strokeRect(bounds.x - 4 / viewBox.zoom, bounds.y - 4 / viewBox.zoom, bounds.width + 8 / viewBox.zoom, bounds.height + 8 / viewBox.zoom)
        ctx.restore()
      }
    }

    ctx.restore()
  }, [strokes, currentStroke, shapes, currentShape, textElements, viewBox, selectedLayerId, isDarkMode])

  // 设置画布尺寸 + 高 DPI
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      redraw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redraw])

  // 重绘请求（用 rAF 节流）
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(redraw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [redraw])

  // 主题切换时主动触发重绘，确保画布背景立即更新
  useEffect(() => {
    requestAnimationFrame(redraw)
  }, [isDarkMode, redraw])

  // 指针事件处理（支持压感笔）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      const rect = canvas.getBoundingClientRect()
      const pos = getCanvasPos(e, rect)
      if (!pos) return

      // 获取压力值（鼠标默认 0.5，触控笔使用实际值）
      const pressure = e.pressure > 0 && e.pressure < 1 ? e.pressure : 0.5
      lastPressureRef.current = pressure

      const currentTool = useAppStore.getState().tool

      // 选择工具：命中测试并准备拖动
      if (currentTool === 'select') {
        const hitId = hitTestAll(pos[0], pos[1], useAppStore.getState().strokes, useAppStore.getState().shapes, useAppStore.getState().textElements)
        if (hitId) {
          setSelectedLayer(hitId)
          dragStartRef.current = { id: hitId, x: pos[0], y: pos[1] }
          isDrawingRef.current = true
        } else {
          setSelectedLayer(null)
          dragStartRef.current = null
        }
        return
      }

      // 文字工具：点击放置文字输入框
      if (currentTool === 'text') {
        addTextElement(pos[0], pos[1])
        return
      }

      if (currentTool === 'pan') {
        isDrawingRef.current = true
        pointsRef.current = [pos]
        return
      }

      if (
        currentTool === 'rectangle' ||
        currentTool === 'circle' ||
        currentTool === 'triangle' ||
        currentTool === 'arrow' ||
        currentTool === 'line'
      ) {
        startShape(currentTool, pos[0], pos[1])
        isDrawingRef.current = true
        return
      }

      startStroke()
      // 点格式: [x, y, pressure]
      pointsRef.current = [[...pos, pressure]]
      isDrawingRef.current = true
      updateCurrentStroke([[...pos, pressure]])
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const pos = getCanvasPos(e, rect)
      if (!pos) return

      const state = useAppStore.getState()
      const currentTool = state.tool

      if (currentTool === 'pan' && pointsRef.current.length > 0) {
        const [startX, startY] = pointsRef.current[0]
        const dx = (pos[0] - startX)
        const dy = (pos[1] - startY)
        setViewBox({
          ...viewBox,
          x: viewBox.x - dx,
          y: viewBox.y - dy,
        })
        return
      }

      // 选择工具：拖动选中元素
      if (currentTool === 'select' && dragStartRef.current) {
        const dx = pos[0] - dragStartRef.current.x
        const dy = pos[1] - dragStartRef.current.y
        moveElementBy(dragStartRef.current.id, dx, dy)
        dragStartRef.current = { id: dragStartRef.current.id, x: pos[0], y: pos[1] }
        return
      }

      if (state.currentShape) {
        const sx = state.currentShape.startX ?? state.currentShape.x
        const sy = state.currentShape.startY ?? state.currentShape.y
        if (state.currentShape.type === 'line' || state.currentShape.type === 'arrow') {
          updateCurrentShape({
            endX: pos[0],
            endY: pos[1],
            width: pos[0] - sx,
            height: pos[1] - sy,
          })
        } else {
          updateCurrentShape({
            x: Math.min(sx, pos[0]),
            y: Math.min(sy, pos[1]),
            width: Math.abs(pos[0] - sx),
            height: Math.abs(pos[1] - sy),
          })
        }
        return
      }

      // 平滑压力值，避免突变
      const rawPressure = e.pressure > 0 && e.pressure < 1 ? e.pressure : lastPressureRef.current
      const smoothedPressure = lastPressureRef.current * 0.6 + rawPressure * 0.4
      lastPressureRef.current = smoothedPressure

      pointsRef.current = [...pointsRef.current, [...pos, smoothedPressure]]
      updateCurrentStroke(pointsRef.current)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      canvas.releasePointerCapture(e.pointerId)

      // 选择工具：结束拖动
      if (dragStartRef.current) {
        dragStartRef.current = null
        return
      }

      const state = useAppStore.getState()
      if (state.currentShape) {
        finishShape()
      } else if (state.currentStroke) {
        finishStroke()
      }
      pointsRef.current = []
    }

    // 使用 Pointer Events（统一鼠标/触摸/笔）
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [getCanvasPos, startStroke, updateCurrentStroke, finishStroke, startShape, updateCurrentShape, finishShape, setViewBox, viewBox])

  // 计算文字元素在屏幕上的位置
  const getScreenPos = useCallback(
    (canvasX: number, canvasY: number) => {
      return {
        x: (canvasX - viewBox.x) * viewBox.zoom,
        y: (canvasY - viewBox.y) * viewBox.zoom,
      }
    },
    [viewBox]
  )

  return (
    <div className="w-full h-screen canvas-bg relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{ touchAction: 'none', cursor: tool === 'text' ? 'text' : tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
      />
      {/* 文字编辑输入框 */}
      {textElements.map((el) => {
        if (editingTextId !== el.id) return null
        const screenPos = getScreenPos(el.x, el.y)
        return (
          <textarea
            key={el.id}
            autoFocus
            value={el.text}
            onChange={(e) => updateTextElement(el.id, e.target.value)}
            onBlur={() => {
              if (!el.text.trim()) {
                deleteTextElement(el.id)
              } else {
                setEditingText(null)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (!el.text.trim()) {
                  deleteTextElement(el.id)
                } else {
                  setEditingText(null)
                }
              }
            }}
            className="fixed bg-transparent border-none outline-none resize-none p-0 m-0"
            style={{
              left: screenPos.x,
              top: screenPos.y,
              color: el.color,
              fontSize: el.fontSize * viewBox.zoom,
              fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
              fontWeight: el.bold ? 'bold' : 'normal',
              lineHeight: '1.4',
              minWidth: '100px',
              minHeight: '1.5em',
              zIndex: 20,
            }}
            placeholder="输入文字..."
          />
        )
      })}
      {/* 非编辑状态的文字 - 双击编辑 */}
      {textElements.map((el) => {
        if (editingTextId === el.id || !el.text || el.hidden) return null
        const screenPos = getScreenPos(el.x, el.y)
        return (
          <div
            key={`display-${el.id}`}
            onDoubleClick={() => setEditingText(el.id)}
            className="fixed cursor-text select-none"
            style={{
              left: screenPos.x,
              top: screenPos.y,
              color: el.color,
              fontSize: el.fontSize * viewBox.zoom,
              fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
              fontWeight: el.bold ? 'bold' : 'normal',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              opacity: el.opacity ?? 1,
              zIndex: 15,
            }}
          >
            {el.text}
          </div>
        )
      })}
    </div>
  )
}
