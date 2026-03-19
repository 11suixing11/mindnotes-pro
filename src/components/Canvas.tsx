import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import { useAppStore, Shape } from '../store/useAppStore'
import { getStroke } from 'perfect-freehand'

export interface CanvasRef {
  getCanvas: () => HTMLCanvasElement | null
}

const Canvas = forwardRef<CanvasRef>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { 
    strokes, 
    currentStroke, 
    updateCurrentStroke, 
    addStroke,
    clearStrokes,
    viewBox,
    setViewBox,
    tool,
    shapes,
    currentShape,
    updateCurrentShape,
    addShape,
    startShape,
  } = useAppStore()
  
  const [isPanning, setIsPanning] = useState(false)
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null)
  const [currentPressure, setCurrentPressure] = useState(0)
  const shapeStartPoint = useRef<{ x: number; y: number } | null>(null)
  
  // 导出 canvas 引用
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }))
  
  // 获取坐标（考虑画布变换）
  const getCoordinates = useCallback((e: React.PointerEvent): [number, number] => {
    if (!canvasRef.current) return [0, 0]
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - viewBox.x) / viewBox.zoom
    const y = (e.clientY - rect.top - viewBox.y) / viewBox.zoom
    return [x, y]
  }, [viewBox])
  
  // 开始绘制
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.setPointerCapture(e.pointerId)
    
    // 如果是平移工具，开始平移
    if (tool === 'pan') {
      setIsPanning(true)
      lastPanPosition.current = { x: e.clientX, y: e.clientY }
      return
    }
    
    // 如果是形状工具，开始绘制形状
    if (tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'arrow' || tool === 'line') {
      const [x, y] = getCoordinates(e)
      shapeStartPoint.current = { x, y }
      startShape(tool as Shape['type'])
      updateCurrentShape({ x, y, width: 0, height: 0, startX: x, startY: y, endX: x, endY: y })
      return
    }
    
    // 否则开始绘制笔迹
    const [x, y] = getCoordinates(e)
    useAppStore.getState().startStroke()
    updateCurrentStroke([[x, y, e.pressure || 0.5]])
  }, [getCoordinates, updateCurrentStroke, tool, startShape, updateCurrentShape])
  
  // 绘制中
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    
    // 处理平移
    if (isPanning && lastPanPosition.current) {
      const dx = e.clientX - lastPanPosition.current.x
      const dy = e.clientY - lastPanPosition.current.y
      setViewBox({
        ...viewBox,
        x: viewBox.x + dx,
        y: viewBox.y + dy,
      })
      lastPanPosition.current = { x: e.clientX, y: e.clientY }
      return
    }
    
    // 处理形状绘制
    if (currentShape && shapeStartPoint.current) {
      const [x, y] = getCoordinates(e)
      const startX = shapeStartPoint.current.x
      const startY = shapeStartPoint.current.y
      const width = x - startX
      const height = y - startY
      
      // 箭头和直线使用起点终点坐标
      if (currentShape.type === 'arrow' || currentShape.type === 'line') {
        updateCurrentShape({
          startX,
          startY,
          endX: x,
          endY: y,
        })
      } else {
        // 矩形、圆形、三角形使用位置 + 尺寸
        updateCurrentShape({
          x: width < 0 ? x : startX,
          y: height < 0 ? y : startY,
          width: Math.abs(width),
          height: Math.abs(height),
        })
      }
      return
    }
    
    // 处理笔迹绘制
    const state = useAppStore.getState()
    if (!state.isDrawing || !state.currentStroke) return
    
    const [x, y] = getCoordinates(e)
    const pressure = e.pressure || 0.5
    setCurrentPressure(pressure)
    const newPoints = [...state.currentStroke.points, [x, y, pressure]]
    updateCurrentStroke(newPoints)
  }, [getCoordinates, updateCurrentStroke, isPanning, viewBox, setViewBox, currentShape, updateCurrentShape])
  
  // 结束绘制
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    
    // 结束平移
    if (isPanning) {
      setIsPanning(false)
      lastPanPosition.current = null
    }
    
    // 结束形状绘制
    if (currentShape && shapeStartPoint.current) {
      addShape(currentShape)
      shapeStartPoint.current = null
      const canvas = canvasRef.current
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId)
      }
      return
    }
    
    // 结束笔迹绘制
    const state = useAppStore.getState()
    if (!state.currentStroke) {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId)
      }
      return
    }
    
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId)
    }
    
    addStroke(state.currentStroke)
  }, [addStroke, addShape, isPanning, currentShape])
  
  // 渲染函数
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 保存当前变换状态
    ctx.save()
    
    // 应用画布变换（平移和缩放）
    ctx.translate(viewBox.x, viewBox.y)
    ctx.scale(viewBox.zoom, viewBox.zoom)
    
    // 渲染所有完成的笔迹
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke)
    })
    
    // 渲染所有完成的形状
    shapes.forEach((shape) => {
      renderShape(ctx, shape)
    })
    
    // 渲染当前笔迹
    if (currentStroke) {
      renderStroke(ctx, currentStroke)
    }
    
    // 渲染当前形状
    if (currentShape) {
      renderShape(ctx, currentShape)
    }
    
    // 恢复变换状态
    ctx.restore()
  }, [strokes, currentStroke, shapes, currentShape, viewBox])
  
  // 渲染单个笔迹
  const renderStroke = (ctx: CanvasRenderingContext2D, stroke: any) => {
    if (stroke.points.length === 0) return
    
    try {
      // 计算平均压力值
      const pressures = stroke.points.map((p: number[]) => p[2] || 0.5)
      const avgPressure = pressures.reduce((a: number, b: number) => a + b, 0) / pressures.length
      
      // 根据压力动态调整参数
      const pressureFactor = Math.max(0.2, Math.min(1.8, avgPressure * 2))
      
      const pathData = getStroke(stroke.points, {
        size: stroke.size * pressureFactor,
        thinning: 0.6 - (avgPressure * 0.4),
        smoothing: 0.5,
        streamline: 0.6,
        easing: (t) => t,
        start: {
          taper: avgPressure < 0.3 ? 8 : 0,
          cap: true,
        },
        end: {
          taper: avgPressure < 0.3 ? 8 : 0,
          cap: true,
        },
      })
      
      ctx.beginPath()
      ctx.moveTo(pathData[0][0], pathData[0][1])
      
      for (let i = 1; i < pathData.length; i++) {
        const [x, y] = pathData[i]
        ctx.lineTo(x, y)
      }
      
      ctx.closePath()
      
      // 根据压力调整透明度
      const alpha = Math.min(1, 0.7 + avgPressure * 0.3)
      const colorWithAlpha = stroke.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
      
      ctx.fillStyle = colorWithAlpha
      ctx.fill()
    } catch (error) {
      console.error('渲染笔迹失败:', error)
    }
  }
  
  // 渲染单个形状
  const renderShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    try {
      ctx.beginPath()
      ctx.strokeStyle = shape.color
      ctx.lineWidth = shape.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      if (shape.type === 'rectangle') {
        ctx.rect(shape.x, shape.y, shape.width, shape.height)
      } else if (shape.type === 'circle') {
        const radiusX = shape.width / 2
        const radiusY = shape.height / 2
        const centerX = shape.x + radiusX
        const centerY = shape.y + radiusY
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      } else if (shape.type === 'triangle') {
        const centerX = shape.x + shape.width / 2
        ctx.moveTo(centerX, shape.y)
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height)
        ctx.lineTo(shape.x, shape.y + shape.height)
        ctx.closePath()
      } else if (shape.type === 'line' && shape.startX != null && shape.endX != null) {
        ctx.moveTo(shape.startX, shape.startY!)
        ctx.lineTo(shape.endX, shape.endY!)
      } else if (shape.type === 'arrow' && shape.startX != null && shape.endX != null) {
        // 绘制箭头线
        const startX = shape.startX
        const startY = shape.startY!
        const endX = shape.endX
        const endY = shape.endY!
        
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        
        // 绘制箭头头部
        const headLength = 15 * (shape.size / 4)
        const angle = Math.atan2(endY - startY, endX - startX)
        
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        )
      }
      
      ctx.stroke()
    } catch (error) {
      console.error('渲染形状失败:', error)
    }
  }
  
  // 响应式调整画布大小
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return
      
      const { width, height } = containerRef.current.getBoundingClientRect()
      canvasRef.current.width = width * window.devicePixelRatio
      canvasRef.current.height = height * window.devicePixelRatio
      canvasRef.current.style.width = `${width}px`
      canvasRef.current.style.height = `${height}px`
      
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
      
      // 重新渲染
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      strokes.forEach((stroke) => {
        if (ctx) renderStroke(ctx, stroke)
      })
    }
    
    updateSize()
    
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => resizeObserver.disconnect()
  }, [strokes])
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        useAppStore.getState().undo()
      }
      
      // Ctrl/Cmd + S = 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        // 触发保存事件
        window.dispatchEvent(new CustomEvent('mindnotes-save'))
      }
      
      // Delete = 清空
      if (e.key === 'Delete') {
        e.preventDefault()
        if (confirm('确定要清空所有笔迹吗？')) {
          clearStrokes()
        }
      }
      
      // + = 放大
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        useAppStore.getState().zoomIn()
      }
      
      // - = 缩小
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        useAppStore.getState().zoomOut()
      }
      
      // 0 = 重置视图
      if (e.key === '0') {
        e.preventDefault()
        useAppStore.getState().resetView()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearStrokes])
  
  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const state = useAppStore.getState()
      if (e.deltaY < 0) {
        state.zoomIn()
      } else {
        state.zoomOut()
      }
    }
  }, [])
  
  return (
    <div 
      ref={containerRef}
      className="canvas-container w-full h-full bg-[var(--canvas-bg)]"
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ 
          touchAction: 'none',
          cursor: tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair'
        }}
      />
      
      {/* 画布变换指示器 */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-lg px-4 py-2 text-xs text-[var(--text-secondary)] shadow-lg border border-[var(--border-color)] pointer-events-none">
        <div className="flex items-center gap-3">
          <span>🔍 {Math.round(viewBox.zoom * 100)}%</span>
          <span className="opacity-50">|</span>
          <span>📍 {Math.round(viewBox.x)}, {Math.round(viewBox.y)}</span>
          <span className="opacity-50">|</span>
          <span>✏️ 压力：{Math.round(currentPressure * 100)}%</span>
        </div>
      </div>
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas
