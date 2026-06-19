import type { EraserPoint, EraserConfig } from './types'

/**
 * 擦除轨迹渲染
 * 在交互层Canvas上绘制擦除预览效果
 */
export function drawEraserTrail(
  ctx: CanvasRenderingContext2D,
  trail: EraserPoint[],
  config: EraserConfig,
  isDarkMode: boolean,
  baseSize: number
): void {
  if (trail.length < 2) return

  ctx.save()

  // 绘制擦除轨迹光晕
  drawEraserGlow(ctx, trail, config, isDarkMode, baseSize)

  // 绘制当前橡皮擦位置（压力感应大小）
  const lastPoint = trail[trail.length - 1]
  drawEraserCursor(ctx, lastPoint, config, isDarkMode, baseSize)

  ctx.restore()
}

/**
 * 绘制擦除轨迹光晕效果
 */
function drawEraserGlow(
  ctx: CanvasRenderingContext2D,
  trail: EraserPoint[],
  config: EraserConfig,
  isDarkMode: boolean,
  baseSize: number
): void {
  if (trail.length < 2) return

  const gradient = ctx.createLinearGradient(
    trail[0].x,
    trail[0].y,
    trail[trail.length - 1].x,
    trail[trail.length - 1].y
  )
  const primaryColor = isDarkMode ? 'rgba(200, 160, 176, ' : 'rgba(176, 125, 110, '
  gradient.addColorStop(0, primaryColor + '0.1)')
  gradient.addColorStop(1, primaryColor + '0.3)')

  ctx.strokeStyle = gradient
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 压力感应线宽
  const avgPressure =
    trail.reduce((sum, p) => sum + p.pressure, 0) / trail.length
  ctx.lineWidth = (baseSize * 2 * avgPressure * (1 - config.hardness * 0.3)) / 2

  ctx.beginPath()
  ctx.moveTo(trail[0].x, trail[0].y)

  // 平滑曲线
  for (let i = 1; i < trail.length; i++) {
    const xc = (trail[i].x + trail[i - 1].x) / 2
    const yc = (trail[i].y + trail[i - 1].y) / 2
    ctx.quadraticCurveTo(trail[i - 1].x, trail[i - 1].y, xc, yc)
  }

  ctx.stroke()
}

/**
 * 绘制橡皮擦光标
 * 显示当前压力对应的擦除范围
 */
function drawEraserCursor(
  ctx: CanvasRenderingContext2D,
  point: EraserPoint,
  config: EraserConfig,
  isDarkMode: boolean,
  baseSize: number
): void {
  const effectiveRadius = computeEffectiveRadius(
    point.pressure,
    config.hardness,
    config.pressureSensitivity,
    baseSize
  )

  const primaryColor = isDarkMode ? '200, 160, 176' : '176, 125, 110'

  ctx.save()
  ctx.translate(point.x, point.y)

  // 根据形状绘制不同的光标
  switch (config.shape) {
    case 'circle':
      drawCircleCursor(ctx, effectiveRadius, primaryColor)
      break

    case 'square':
      ctx.rotate(config.rotation)
      drawRectCursor(ctx, effectiveRadius, effectiveRadius, primaryColor)
      break

    case 'chisel': {
      const width = effectiveRadius * 2
      const height = width * 0.4
      const rotation = config.rotation + point.direction * config.directionInfluence
      ctx.rotate(rotation)
      drawRectCursor(ctx, width / 2, height / 2, primaryColor)
      break
    }
  }

  ctx.restore()
}

/**
 * 绘制圆形橡皮擦光标
 */
function drawCircleCursor(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string
): void {
  // 外圈光晕
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
  gradient.addColorStop(0, `rgba(${color}, 0.3)`)
  gradient.addColorStop(0.7, `rgba(${color}, 0.15)`)
  gradient.addColorStop(1, `rgba(${color}, 0.05)`)
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // 内圈边框
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${color}, 0.5)`
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 中心点
  ctx.beginPath()
  ctx.arc(0, 0, 2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${color}, 0.8)`
  ctx.fill()
}

/**
 * 绘制矩形橡皮擦光标（方形/凿形）
 */
function drawRectCursor(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  halfH: number,
  color: string
): void {
  // 外圈光晕
  const gradient = ctx.createLinearGradient(-halfW, 0, halfW, 0)
  gradient.addColorStop(0, `rgba(${color}, 0.05)`)
  gradient.addColorStop(0.3, `rgba(${color}, 0.2)`)
  gradient.addColorStop(0.7, `rgba(${color}, 0.2)`)
  gradient.addColorStop(1, `rgba(${color}, 0.05)`)
  ctx.fillStyle = gradient
  ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2)

  // 内圈边框
  ctx.strokeStyle = `rgba(${color}, 0.5)`
  ctx.lineWidth = 1.5
  ctx.strokeRect(-halfW * 0.7, -halfH * 0.7, halfW * 1.4, halfH * 1.4)

  // 中心点
  ctx.beginPath()
  ctx.arc(0, 0, 2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${color}, 0.8)`
  ctx.fill()
}

/**
 * 计算有效擦除半径（与引擎算法一致）
 */
function computeEffectiveRadius(
  pressure: number,
  hardness: number,
  pressureSensitivity: number,
  baseSize: number
): number {
  const pressureFactor = 0.4 + pressure * 0.6 * pressureSensitivity
  const hardnessFactor = 1 - hardness * 0.3
  return baseSize * pressureFactor * hardnessFactor
}

/**
 * 简单擦除光标渲染（降级模式）
 */
export function drawSimpleEraserCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  isDarkMode: boolean
): void {
  ctx.save()

  const color = isDarkMode ? 'rgba(200, 160, 176, ' : 'rgba(176, 125, 110, '

  // 外圈
  ctx.beginPath()
  ctx.arc(x, y, size * 2, 0, Math.PI * 2)
  ctx.fillStyle = color + '0.15)'
  ctx.fill()
  ctx.strokeStyle = color + '0.5)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.restore()
}
