import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
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
    tool
  } = useAppStore()
  
  const [isPanning, setIsPanning] = useState(false)
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null)
  const [currentPressure, setCurrentPressure] = useState(0)
  
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
    
    const [x, y] = getCoordinates(e)
    useAppStore.getState().startStroke()
    updateCurrentStroke([[x, y, e.pressure || 0.5]])
  }, [getCoordinates, updateCurrentStroke, tool])
  
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
    
    const state = useAppStore.getState()
    if (!state.isDrawing || !state.currentStroke) return
    
    const [x, y] = getCoordinates(e)
    const pressure = e.pressure || 0.5
    setCurrentPressure(pressure)
    const newPoints = [...state.currentStroke.points, [x, y, pressure]]
    updateCurrentStroke(newPoints)
  }, [getCoordinates, updateCurrentStroke, isPanning, viewBox, setViewBox])
  
  // 结束绘制
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    
    // 结束平移
    if (isPanning) {
      setIsPanning(false)
      lastPanPosition.current = null
    }
    
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
  }, [addStroke, isPanning])
  
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
    
    // 渲染当前笔迹
    if (currentStroke) {
      renderStroke(ctx, currentStroke)
    }
    
    // 恢复变换状态
    ctx.restore()
  }, [strokes, currentStroke, viewBox])
  
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
        size: stroke.size * pressureFactor, // 压力越大，线条越粗
        thinning: 0.6 - (avgPressure * 0.4), // 压力越大，thinning 越小（线条变化更明显）
        smoothing: 0.5,
        streamline: 0.6,
        easing: (t) => t,
        start: {
          taper: avgPressure < 0.3 ? 8 : 0, // 轻压力时自动变细
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
