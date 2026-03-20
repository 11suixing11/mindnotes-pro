import { useRef, useEffect } from 'react'

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 设置 Canvas 大小
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 获取 2D 上下文
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置绘制样式
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 绘制状态
    let isDrawing = false
    let lastX = 0
    let lastY = 0

    // 开始绘制
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true
      const pos = getPosition(e)
      lastX = pos.x
      lastY = pos.y
    }

    // 绘制中
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return
      const pos = getPosition(e)
      
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      
      lastX = pos.x
      lastY = pos.y
    }

    // 停止绘制
    const stopDrawing = () => {
      isDrawing = false
    }

    // 获取坐标
    const getPosition = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      let clientX, clientY
      
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = (e as MouseEvent).clientX
        clientY = (e as MouseEvent).clientY
      }
      
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
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

  return (
    <div className="w-full h-screen">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}
