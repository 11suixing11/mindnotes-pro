import { useRef, useEffect } from 'react'
import type { CanvasElement } from '../../store/types'
import { elementBounds } from '../../store/types'

interface Props {
  elements: CanvasElement[]
  width?: number
  height?: number
  bgColor?: string
}

export default function CanvasPreview({
  elements,
  width = 56,
  height = 36,
  bgColor = '#F6F0E6',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)

    if (elements.length === 0) return

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const el of elements) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }

    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale = Math.min((width - 4) / rangeX, (height - 4) / rangeY)
    const offsetX = (width - rangeX * scale) / 2
    const offsetY = (height - rangeY * scale) / 2

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)
    ctx.translate(-minX, -minY)

    for (const el of elements) {
      if (el.type === 'stroke' && el.points.length >= 2) {
        ctx.beginPath()
        ctx.strokeStyle = el.color
        ctx.lineWidth = Math.max(el.size / scale, 0.5)
        ctx.lineCap = 'round'
        ctx.globalAlpha = el.brush === 'highlighter' ? 0.3 : 1
        ctx.moveTo(el.points[0][0], el.points[0][1])
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i][0], el.points[i][1])
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      } else if (el.type === 'shape') {
        ctx.strokeStyle = el.color
        ctx.lineWidth = Math.max(el.size / scale, 0.5)
        const hasFill = el.fillColor && el.fillColor !== 'transparent'
        if (el.kind === 'rectangle') {
          if (hasFill) {
            ctx.fillStyle = el.fillColor!
            ctx.fillRect(el.x, el.y, el.w, el.h)
          }
          ctx.strokeRect(el.x, el.y, el.w, el.h)
        } else if (el.kind === 'circle') {
          ctx.beginPath()
          ctx.ellipse(
            el.x + el.w / 2,
            el.y + el.h / 2,
            Math.abs(el.w) / 2,
            Math.abs(el.h) / 2,
            0,
            0,
            Math.PI * 2
          )
          if (hasFill) {
            ctx.fillStyle = el.fillColor!
            ctx.fill()
          }
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.moveTo(el.x, el.y)
          ctx.lineTo(el.x + el.w, el.y + el.h)
          ctx.stroke()
        }
      } else if (el.type === 'text') {
        ctx.fillStyle = el.color
        ctx.font = `${Math.max(10, el.fontSize)}px sans-serif`
        ctx.fillText(el.content.split('\n')[0].slice(0, 20), el.x, el.y + el.fontSize)
      }
    }

    ctx.restore()
  }, [elements, width, height, bgColor])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="画布预览"
      className="rounded-[6px] border border-[var(--border)] shrink-0"
      style={{ width, height }}
    />
  )
}
