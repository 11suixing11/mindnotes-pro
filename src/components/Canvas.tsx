import { useRef, useEffect, useCallback } from 'react'
import { getStroke } from 'perfect-freehand'
import { useAppStore } from '../store/useAppStore'

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
) {
  if (points.length < 2) return

  const stroke = getStroke(points, {
    size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
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

export default function Canvas({ onCanvasRef }: CanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<number[][]>([])
  const isDrawingRef = useRef(false)
  const animFrameRef = useRef<number>(0)

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
    startStroke,
    updateCurrentStroke,
    finishStroke,
    startShape,
    updateCurrentShape,
    finishShape,
    viewBox,
    setViewBox,
  } = useAppStore()

  // 获取画布坐标（考虑缩放和偏移）
  const getCanvasPos = useCallback(
    (e: MouseEvent | TouchEvent, rect: DOMRect) => {
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
      drawStroke(ctx, stroke.points, stroke.color, stroke.size, stroke.tool === 'eraser')
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
      )
    }

    // 绘制形状
    for (const shape of shapes) {
      if (shape.hidden) continue
      ctx.save()
      ctx.strokeStyle = shape.color
      ctx.lineWidth = shape.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (shape.opacity !== undefined) ctx.globalAlpha = shape.opacity

      const { x, y, width, height, type } = shape

      if (type === 'rectangle') {
        ctx.strokeRect(x, y, width, height)
      } else if (type === 'circle') {
        ctx.beginPath()
        const rx = Math.abs(width) / 2
        const ry = Math.abs(height) / 2
        ctx.ellipse(x + width / 2, y + height / 2, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else if (type === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(x + width / 2, y)
        ctx.lineTo(x + width, y + height)
        ctx.lineTo(x, y + height)
        ctx.closePath()
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
        const headLen = 15
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
      ctx.lineWidth = currentShape.size
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

    ctx.restore()
  }, [strokes, currentStroke, shapes, currentShape, viewBox])

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

  // 鼠标/触摸事件处理
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const pos = getCanvasPos(e, rect)
      if (!pos) return

      const currentTool = useAppStore.getState().tool

      if (currentTool === 'pan') {
        isDrawingRef.current = true
        pointsRef.current = [pos] // 存储起始点用于平移计算
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
      pointsRef.current = [pos]
      isDrawingRef.current = true
      updateCurrentStroke([pos])
    }

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
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

      pointsRef.current = [...pointsRef.current, pos]
      updateCurrentStroke(pointsRef.current)
    }

    const handlePointerUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false

      const state = useAppStore.getState()
      if (state.currentShape) {
        finishShape()
      } else if (state.currentStroke) {
        finishStroke()
      }
      pointsRef.current = []
    }

    // 鼠标事件
    canvas.addEventListener('mousedown', handlePointerDown)
    canvas.addEventListener('mousemove', handlePointerMove)
    canvas.addEventListener('mouseup', handlePointerUp)
    canvas.addEventListener('mouseleave', handlePointerUp)

    // 触摸事件
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false })
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false })
    canvas.addEventListener('touchend', handlePointerUp)
    canvas.addEventListener('touchcancel', handlePointerUp)

    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown)
      canvas.removeEventListener('mousemove', handlePointerMove)
      canvas.removeEventListener('mouseup', handlePointerUp)
      canvas.removeEventListener('mouseleave', handlePointerUp)
      canvas.removeEventListener('touchstart', handlePointerDown)
      canvas.removeEventListener('touchmove', handlePointerMove)
      canvas.removeEventListener('touchend', handlePointerUp)
      canvas.removeEventListener('touchcancel', handlePointerUp)
    }
  }, [getCanvasPos, startStroke, updateCurrentStroke, finishStroke, startShape, updateCurrentShape, finishShape, setViewBox, viewBox])

  return (
    <div className="w-full h-screen canvas-bg">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}
