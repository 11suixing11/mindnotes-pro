import type { ScreenStroke } from './screenInk.js'

// This function runs only in the trusted local screen renderer. No webpage receives it.
async function composeCapture(
  background: string,
  strokes: ScreenStroke[],
  logicalWidth: number,
  logicalHeight: number
): Promise<string> {
  const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('无法读取屏幕截图。'))
    image.src = background
  })
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.naturalWidth
  canvas.height = bitmap.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法生成批注图片。')
  context.drawImage(bitmap, 0, 0)
  context.scale(canvas.width / logicalWidth, canvas.height / logicalHeight)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const stroke of strokes) {
    context.globalAlpha = stroke.tool === 'highlight' ? 0.3 : 1
    context.strokeStyle = stroke.color
    context.fillStyle = stroke.color
    context.lineWidth = stroke.width
    context.beginPath()
    if (stroke.points.length === 1) {
      context.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2)
      context.fill()
    } else {
      context.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y)
      context.stroke()
    }
  }
  return canvas.toDataURL('image/png')
}

export function screenCaptureSource(
  background: string,
  strokes: ScreenStroke[],
  width: number,
  height: number
): string {
  return `(${composeCapture.toString()})(${JSON.stringify(background)},${JSON.stringify(strokes)},${width},${height})`
}
