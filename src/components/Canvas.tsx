import React, { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getStroke } from 'perfect-freehand'

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { 
    strokes, 
    currentStroke, 
    isDrawing,
    updateCurrentStroke, 
    addStroke 
  } = useAppStore()
  
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
    
    if (!isDrawing || !currentStroke) return
    
    const [x, y] = getCoordinates(e)
    const newPoints = [...currentStroke.points, [x, y, e.pressure || 0.5]]
    updateCurrentStroke(newPoints)
  }, [isDrawing, currentStroke, getCoordinates, updateCurrentStroke])
  
  // 结束绘制
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    
    if (!currentStroke) return
    
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId)
    }
    
    addStroke(currentStroke)
  }, [currentStroke, addStroke])
  
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
  }
  
  // 响应式调整画布大小
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return
      
      const { width, height } = containerRef.current.getBoundingClientRect()
      canvasRef.current.width = width
      canvasRef.current.height = height
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  
  return (
    <div 
      ref={containerRef}
      className="canvas-container w-full h-full bg-white"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}

export default Canvas
