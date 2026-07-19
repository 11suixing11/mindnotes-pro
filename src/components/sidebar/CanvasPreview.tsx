import { useEffect, useRef } from 'react'
import type { CanvasElement } from '../../store/types'
import { elementBounds } from '../../store/types'

interface CanvasPreviewProps {
  elements: CanvasElement[]
  width?: number
  height?: number
  bgColor?: string
}

export default function CanvasPreview({
  elements,
  width = 40,
  height = 28,
  bgColor = '#f6f0e6',
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.fillStyle = bgColor
    context.fillRect(0, 0, width, height)

    if (elements.length === 0) return

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const element of elements) {
      const bounds = elementBounds(element)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.w)
      maxY = Math.max(maxY, bounds.y + bounds.h)
    }

    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale = Math.min((width - 4) / rangeX, (height - 4) / rangeY)

    context.save()
    context.translate((width - rangeX * scale) / 2, (height - rangeY * scale) / 2)
    context.scale(scale, scale)
    context.translate(-minX, -minY)

    for (const element of elements) {
      if (element.type === 'stroke' && element.points.length >= 2) {
        context.beginPath()
        context.strokeStyle = element.color
        context.lineWidth = Math.max(element.size / scale, 0.5)
        context.lineCap = 'round'
        context.globalAlpha = element.brush === 'highlighter' ? 0.3 : 1
        context.moveTo(element.points[0][0], element.points[0][1])
        for (let index = 1; index < element.points.length; index += 1) {
          context.lineTo(element.points[index][0], element.points[index][1])
        }
        context.stroke()
        context.globalAlpha = 1
      } else if (element.type === 'shape') {
        context.strokeStyle = element.color
        context.lineWidth = Math.max(element.size / scale, 0.5)
        if (element.kind === 'rectangle') {
          context.strokeRect(element.x, element.y, element.w, element.h)
        } else if (element.kind === 'circle') {
          context.beginPath()
          context.ellipse(
            element.x + element.w / 2,
            element.y + element.h / 2,
            Math.abs(element.w) / 2,
            Math.abs(element.h) / 2,
            0,
            0,
            Math.PI * 2
          )
          context.stroke()
        } else {
          context.beginPath()
          context.moveTo(element.x, element.y)
          context.lineTo(element.x + element.w, element.y + element.h)
          context.stroke()
        }
      } else if (element.type === 'text') {
        context.fillStyle = element.color
        context.font = `${Math.max(10, element.fontSize)}px sans-serif`
        context.fillText(element.content.split('\n')[0].slice(0, 20), element.x, element.y)
      }
    }

    context.restore()
  }, [bgColor, elements, height, width])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="sb-doc-preview"
      style={{ width, height }}
    />
  )
}
