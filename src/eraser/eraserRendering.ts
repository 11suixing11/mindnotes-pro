import type { EraserPoint, EraserConfig } from './types'

/**
 * 根据磨损程度计算颜色偏移
 * 磨损越大，颜色越灰、越暗
 */
function getWearColorAdjustment(
  baseColor: string,
  wearLevel: number
): { r: number; g: number; b: number } {
  // 解析基础颜色
  const [r, g, b] = baseColor.split(',').map(Number)

  // 磨损灰度化：向中性灰偏移
  const grayFactor = wearLevel * 0.6 // 最大60%灰度化
  const targetGray = 128

  return {
    r: Math.round(r + (targetGray - r) * grayFactor),
    g: Math.round(g + (targetGray - g) * grayFactor),
    b: Math.round(b + (targetGray - b) * grayFactor),
  }
}

/**
 * 擦除轨迹渲染
 * 在交互层Canvas上绘制擦除预览效果
 * 支持磨损视觉增强
 */
export function drawEraserTrail(
  ctx: CanvasRenderingContext2D,
  trail: EraserPoint[],
  config: EraserConfig,
  isDarkMode: boolean,
  baseSize: number,
  wearLevel: number = 0
): void {
  if (trail.length < 2) return
  ctx.save()
  // 绘制擦除轨迹光晕
  drawEraserGlow(ctx, trail, config, isDarkMode, baseSize, wearLevel)
  // 绘制当前橡皮擦位置（压力感应大小 + 磨损视觉）
  const lastPoint = trail[trail.length - 1]
  drawEraserCursor(ctx, lastPoint, config, isDarkMode, baseSize, wearLevel)
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
  baseSize: number,
  wearLevel: number
): void {
  if (trail.length < 2) return

  const baseColor = isDarkMode ? '200, 160, 176' : '176, 125, 110'
  const wearColor = getWearColorAdjustment(baseColor, wearLevel)

  const gradient = ctx.createLinearGradient(
    trail[0].x,
    trail[0].y,
    trail[trail.length - 1].x,
    trail[trail.length - 1].y
  )

  // 磨损增加不透明度
  const baseOpacity = 0.1 + wearLevel * 0.2
  gradient.addColorStop(0, `rgba(${wearColor.r}, ${wearColor.g}, ${wearColor.b}, ${baseOpacity})`)
  gradient.addColorStop(1, `rgba(${wearColor.r}, ${wearColor.g}, ${wearColor.b}, ${baseOpacity + 0.2})`)

  ctx.strokeStyle = gradient
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 压力感应线宽 + 磨损增加半径
  const avgPressure =
    trail.reduce((sum, p) => sum + p.pressure, 0) / trail.length
  const wearRadiusIncrease = 1 + wearLevel * 0.5 // 磨损最多增加50%半径
  ctx.lineWidth = (baseSize * 2 * avgPressure * (1 - config.hardness * 0.3) * wearRadiusIncrease) / 2

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
 * 显示当前压力对应的擦除范围 + 磨损视觉效果
 */
function drawEraserCursor(
  ctx: CanvasRenderingContext2D,
  point: EraserPoint,
  config: EraserConfig,
  isDarkMode: boolean,
  baseSize: number,
  wearLevel: number
): void {
  const effectiveRadius = computeEffectiveRadius(
    point.pressure,
    config.hardness,
    config.pressureSensitivity,
    baseSize
  )

  // 磨损增加实际半径（橡皮变钝）
  const wearRadiusIncrease = 1 + wearLevel * 0.5
  const finalRadius = effectiveRadius * wearRadiusIncrease

  const baseColor = isDarkMode ? '200, 160, 176' : '176, 125, 110'
  const wearColor = getWearColorAdjustment(baseColor, wearLevel)
  const colorStr = `${wearColor.r}, ${wearColor.g}, ${wearColor.b}`

  ctx.save()
  ctx.translate(point.x, point.y)

  // 根据形状绘制不同的光标
  switch (config.shape) {
    case 'circle':
      drawCircleCursor(ctx, finalRadius, colorStr, wearLevel)
      break
    case 'square':
      ctx.rotate(config.rotation)
      drawRectCursor(ctx, finalRadius, finalRadius, colorStr, wearLevel)
      break
    case 'chisel': {
      const width = finalRadius * 2
      const height = width * 0.4
      const rotation = config.rotation + point.direction * config.directionInfluence
      ctx.rotate(rotation)
      drawRectCursor(ctx, width / 2, height / 2, colorStr, wearLevel)
      break
    }
  }

  ctx.restore()
}

/**
 * 绘制圆形橡皮擦光标（带磨损效果）
 */
function drawCircleCursor(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string,
  wearLevel: number
): void {
  // 磨损增加不透明度
  const opacityBase = 0.15 + wearLevel * 0.25
  const opacityInner = 0.3 + wearLevel * 0.3
  const opacityCenter = 0.6 + wearLevel * 0.2

  // 外圈光晕（磨损越大，光晕越扩散）
  const glowRadius = radius * (1 + wearLevel * 0.3)
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius)
  gradient.addColorStop(0, `rgba(${color}, ${opacityInner})`)
  gradient.addColorStop(0.6, `rgba(${color}, ${opacityBase})`)
  gradient.addColorStop(1, `rgba(${color}, 0.02)`)

  ctx.beginPath()
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // 内圈边框（磨损越大边框越粗）
  const borderWidth = 1.5 + wearLevel * 2
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${color}, ${0.4 + wearLevel * 0.3})`
  ctx.lineWidth = borderWidth
  ctx.stroke()

  // 中心点（磨损越大中心点越大）
  const centerSize = 2 + wearLevel * 3
  ctx.beginPath()
  ctx.arc(0, 0, centerSize, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${color}, ${opacityCenter})`
  ctx.fill()

  // 磨损指示器：在光标上显示磨损程度标记
  if (wearLevel > 0.3) {
    const wearIndicatorRadius = radius * 0.85
    const wearAngle = wearLevel * Math.PI * 2
    ctx.beginPath()
    ctx.arc(0, 0, wearIndicatorRadius, -Math.PI / 2, -Math.PI / 2 + wearAngle)
    ctx.strokeStyle = `rgba(128, 128, 128, ${0.3 + wearLevel * 0.4})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

/**
 * 绘制矩形橡皮擦光标（方形/凿形，带磨损效果）
 */
function drawRectCursor(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  halfH: number,
  color: string,
  wearLevel: number
): void {
  // 磨损增加不透明度
  const opacityBase = 0.05 + wearLevel * 0.15
  const opacityInner = 0.15 + wearLevel * 0.25
  const opacityCenter = 0.6 + wearLevel * 0.2

  // 磨损增加尺寸
  const wearIncrease = 1 + wearLevel * 0.4
  const finalHalfW = halfW * wearIncrease
  const finalHalfH = halfH * wearIncrease

  // 外圈光晕
  const gradient = ctx.createLinearGradient(-finalHalfW, 0, finalHalfW, 0)
  gradient.addColorStop(0, `rgba(${color}, ${opacityBase})`)
  gradient.addColorStop(0.3, `rgba(${color}, ${opacityInner})`)
  gradient.addColorStop(0.7, `rgba(${color}, ${opacityInner})`)
  gradient.addColorStop(1, `rgba(${color}, ${opacityBase})`)

  ctx.fillStyle = gradient
  ctx.fillRect(-finalHalfW, -finalHalfH, finalHalfW * 2, finalHalfH * 2)

  // 内圈边框（磨损越大边框越粗）
  const borderWidth = 1.5 + wearLevel * 2
  ctx.strokeStyle = `rgba(${color}, ${0.4 + wearLevel * 0.3})`
  ctx.lineWidth = borderWidth
  ctx.strokeRect(
    -finalHalfW * 0.7,
    -finalHalfH * 0.7,
    finalHalfW * 1.4,
    finalHalfH * 1.4
  )

  // 中心点
  const centerSize = 2 + wearLevel * 2
  ctx.beginPath()
  ctx.arc(0, 0, centerSize, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${color}, ${opacityCenter})`
  ctx.fill()

  // 磨损指示器
  if (wearLevel > 0.3) {
    ctx.fillStyle = `rgba(128, 128, 128, ${0.2 + wearLevel * 0.3})`
    ctx.fillRect(
      -finalHalfW * 0.6,
      finalHalfH * 0.5,
      finalHalfW * 1.2 * wearLevel,
      3
    )
  }
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
