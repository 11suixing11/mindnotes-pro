import { useRef, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { tool, color, size } = useAppStore()

  // Keep refs in sync so event handlers always read the latest values
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const sizeRef = useRef(size)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { sizeRef.current = size }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 设置 Canvas 大小，使用离屏 canvas 保留已有内容
    const resize = () => {
      const offscreen = document.createElement('canvas')
      offscreen.width = canvas.width
      offscreen.height = canvas.height
      const offCtx = offscreen.getContext('2d')
      if (offCtx) offCtx.drawImage(canvas, 0, 0)

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.drawImage(offscreen, 0, 0)
      }
    }
    resize()
    window.addEventListener('resize', resize)

    // 获取 2D 上下文
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 绘制状态
    let isDrawing = false
    let lastX = 0
    let lastY = 0
    // Pan state
    let panLastX = 0
    let panLastY = 0

    // 获取坐标
    const getPosition = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      let clientX: number, clientY: number

      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = (e as MouseEvent).clientX
        clientY = (e as MouseEvent).clientY
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      }
    }

    // 开始绘制
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true
      const pos = getPosition(e)
      lastX = pos.x
      lastY = pos.y
      panLastX = pos.x
      panLastY = pos.y

      const currentTool = toolRef.current
      if (currentTool === 'pan') {
        canvas.style.cursor = 'grabbing'
        return
      }
      if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = colorRef.current
        ctx.lineWidth = sizeRef.current
        ctx.beginPath()
        ctx.moveTo(lastX, lastY)
      } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = sizeRef.current * 3
        ctx.beginPath()
        ctx.moveTo(lastX, lastY)
      }
    }

    // 绘制中
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return
      const pos = getPosition(e)
      const currentTool = toolRef.current

      if (currentTool === 'pan') {
        // 使用 drawImage 平移画布内容（比 getImageData/putImageData 更高效）
        const dx = pos.x - panLastX
        const dy = pos.y - panLastY
        const offscreen = document.createElement('canvas')
        offscreen.width = canvas.width
        offscreen.height = canvas.height
        const offCtx = offscreen.getContext('2d')
        if (offCtx) {
          offCtx.drawImage(canvas, 0, 0)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(offscreen, dx, dy)
        }
        panLastX = pos.x
        panLastY = pos.y
        return
      }

      if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = colorRef.current
        ctx.lineWidth = sizeRef.current
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
      } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = sizeRef.current * 3
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
      }

      lastX = pos.x
      lastY = pos.y
    }

    // 停止绘制
    const stopDrawing = () => {
      isDrawing = false
      ctx.globalCompositeOperation = 'source-over'
      // 恢复拖拽光标
      if (toolRef.current === 'pan') {
        canvas.style.cursor = 'grab'
      }
    }

    // 添加事件监听
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseout', stopDrawing)

    canvas.addEventListener('touchstart', startDrawing, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDrawing)

    console.log('✅ Canvas initialized')
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  // 根据工具显示对应光标
  const getCursor = () => {
    switch (tool) {
      case 'eraser':
        return 'cell'
      case 'pan':
        return 'grab'
      default:
        return 'crosshair'
    }
  }

  return (
    <div className="w-full h-screen">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{ touchAction: 'none', cursor: getCursor() }}
      />
    </div>
  )
}
