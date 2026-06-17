import { useRef, useEffect, useCallback, useState } from 'react'

interface ScreenPenStroke {
  points: number[][]
  color: string
  size: number
  opacity: number
  tool: 'pen' | 'eraser' | 'highlighter'
}

export function useScreenPen() {
  const [enabled, setEnabled] = useState(false)
  const [color, setColor] = useState('#ff0000')
  const [size, setSize] = useState(4)
  const [opacity, setOpacity] = useState(1)
  const [tool, setTool] = useState<'pen' | 'eraser' | 'highlighter'>('pen')
  const [strokes, setStrokes] = useState<ScreenPenStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<number[][]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Create overlay canvas when enabled
  useEffect(() => {
    if (!enabled) {
      // Remove canvas when disabled
      if (canvasRef.current) {
        canvasRef.current.remove()
        canvasRef.current = null
      }
      return
    }

    // Create full-screen overlay canvas
    const canvas = document.createElement('canvas')
    canvas.id = 'screen-pen-overlay'
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      pointer-events: auto;
      cursor: crosshair;
    `
    canvas.width = window.innerWidth * window.devicePixelRatio
    canvas.height = window.innerHeight * window.devicePixelRatio
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'

    document.body.appendChild(canvas)
    canvasRef.current = canvas

    // Handle resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth * window.devicePixelRatio
        canvasRef.current.height = window.innerHeight * window.devicePixelRatio
        canvasRef.current.style.width = window.innerWidth + 'px'
        canvasRef.current.style.height = window.innerHeight + 'px'
        redrawAll()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (canvasRef.current) {
        canvasRef.current.remove()
        canvasRef.current = null
      }
    }
  }, [enabled])

  // Redraw all strokes
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke)
    }

    // Draw current stroke
    if (currentStroke.length > 1) {
      drawStroke(ctx, {
        points: currentStroke,
        color,
        size,
        opacity,
        tool,
      })
    }
  }, [strokes, currentStroke, color, size, opacity, tool])

  // Draw a single stroke
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: ScreenPenStroke) => {
    if (stroke.points.length < 2) return

    ctx.save()
    ctx.globalAlpha = stroke.opacity
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.3
      ctx.lineWidth = stroke.size * 3
    }

    ctx.beginPath()
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1])

    for (let i = 1; i < stroke.points.length; i++) {
      const p0 = stroke.points[i - 1]
      const p1 = stroke.points[i]
      const midX = (p0[0] + p1[0]) / 2
      const midY = (p0[1] + p1[1]) / 2
      ctx.quadraticCurveTo(p0[0], p0[1], midX, midY)
    }

    ctx.stroke()
    ctx.restore()
  }, [])

  // Handle pointer events
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      setIsDrawing(true)
      setCurrentStroke([[e.clientX, e.clientY]])
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing) return
      setCurrentStroke((prev) => [...prev, [e.clientX, e.clientY]])
      redrawAll()
    }

    const handlePointerUp = () => {
      if (!isDrawing) return
      setIsDrawing(false)

      if (currentStroke.length > 1) {
        const newStroke: ScreenPenStroke = {
          points: currentStroke,
          color,
          size,
          opacity,
          tool,
        }
        setStrokes((prev) => [...prev, newStroke])
      }
      setCurrentStroke([])
      redrawAll()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [enabled, isDrawing, currentStroke, color, size, opacity, tool, redrawAll])

  // Clear all strokes
  const clearAll = useCallback(() => {
    setStrokes([])
    setCurrentStroke([])
    redrawAll()
  }, [redrawAll])

  // Undo last stroke
  const undo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1))
    redrawAll()
  }, [redrawAll])

  // Toggle enabled state
  const toggle = useCallback(() => {
    setEnabled((prev) => !prev)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P to toggle screen pen
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        toggle()
      }

      // Only handle shortcuts when enabled
      if (!enabled) return

      // Escape to disable
      if (e.key === 'Escape') {
        setEnabled(false)
      }

      // Ctrl+Z to undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
      }

      // Delete to clear all
      if (e.key === 'Delete') {
        clearAll()
      }

      // Number keys for tool selection
      if (e.key === '1') setTool('pen')
      if (e.key === '2') setTool('highlighter')
      if (e.key === '3') setTool('eraser')

      // Bracket keys for size
      if (e.key === '[') setSize((prev) => Math.max(1, prev - 2))
      if (e.key === ']') setSize((prev) => Math.min(20, prev + 2))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, toggle, undo, clearAll])

  return {
    enabled,
    color,
    size,
    opacity,
    tool,
    strokes,
    toggle,
    setColor,
    setSize,
    setOpacity,
    setTool,
    clearAll,
    undo,
  }
}
