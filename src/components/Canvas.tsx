import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getStroke } from 'perfect-freehand'

export interface CanvasRef {
  getCanvas: () => HTMLCanvasElement | null
}

const Canvas = forwardRef<CanvasRef>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { 
    strokes, 
    currentStroke, 
    isDrawing,
    updateCurrentStroke, 
    addStroke,
    clearStrokes
  } = useAppStore()
  
  // 导出 canvas 引用
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }))
  
  // 获取坐标
  const getCoordinates = useCallback((e: React.PointerEvent): [number, number] => {
    if (!canvasRef.current) return [0, 0]
    
    const rect = canvasRef.current.getBoundingClientRect()
    return [
      e.clientX - rect.left,
      e.clientY - rect.top,
    ]
  }, [])
  
  // 开始绘制
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.setPointerCapture(e.pointerId)
    
    const [x, y] = getCoordinates(e)
    useAppStore.getState().startStroke()
    updateCurrentStroke([[x, y, e.pressure || 0.5]])
  }, [getCoordinates, updateCurrentStroke])
  
  // 绘制中
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    
    const state = useAppStore.getState()
    if (!state.isDrawing || !state.currentStroke) return
    
    const [x, y] = getCoordinates(e)
    const newPoints = [...state.currentStroke.points, [x, y, e.pressure || 0.5]]
    updateCurrentStroke(newPoints)
  }, [getCoordinates, updateCurrentStroke])
  
  // 结束绘制
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    
    const state = useAppStore.getState()
    if (!state.currentStroke) return
    
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId)
    }
    
    addStroke(state.currentStroke)
  }, [addStroke])
  
  // 渲染函数
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 渲染所有完成的笔迹
    strokes.forEach((stroke) => {
      renderStroke(ctx, stroke)
    })
    
    // 渲染当前笔迹
    if (currentStroke) {
      renderStroke(ctx, currentStroke)
    }
  }, [strokes, currentStroke])
  
  // 渲染单个笔迹
  const renderStroke = (ctx: CanvasRenderingContext2D, stroke: any) => {
    if (stroke.points.length === 0) return
    
    try {
      const pathData = getStroke(stroke.points, {
        size: stroke.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t) => t,
        start: {
          taper: 0,
          cap: true,
        },
        end: {
          taper: 0,
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
      ctx.fillStyle = stroke.color
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
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearStrokes])
  
  return (
    <div 
      ref={containerRef}
      className="canvas-container w-full h-full bg-white"
      style={{ touchAction: 'none' }}
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
          cursor: 'crosshair'
        }}
      />
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas
