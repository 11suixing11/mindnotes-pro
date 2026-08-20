export function drawSelBox(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number },
  isDarkMode: boolean,
  zoom: number,
  options: { showResizeHandles?: boolean; showRotateHandle?: boolean } = {}
) {
  const addHandleCircle = (cx: number, cy: number, r: number) => {
    ctx.moveTo(cx + r, cy)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  const showResizeHandles = options.showResizeHandles ?? true
  const showRotateHandle = options.showRotateHandle ?? true
  const primary = isDarkMode ? '#C8A0B0' : '#B07D6E'
  const primaryLight = isDarkMode ? 'rgba(200,160,176,0.12)' : 'rgba(176,125,110,0.1)'
  ctx.save()
  ctx.strokeStyle = primary
  ctx.lineWidth = 1.5 / zoom
  ctx.setLineDash([5 / zoom, 5 / zoom])
  ctx.strokeRect(b.x, b.y, b.w, b.h)
  ctx.setLineDash([])
  ctx.fillStyle = primaryLight
  ctx.fillRect(b.x, b.y, b.w, b.h)

  // 边缘调整手柄 + 小形状防重叠优化
  // 问题: 小形状上角落手柄和边缘手柄重叠，用户很难准确抓住目标手柄
  // 解决方案:
  // 1. 添加 4 个边缘中间手柄（上、下、左、右）
  // 2. 当形状太小时，动态调整手柄位置避免重叠
  // 3. 角落手柄和边缘手柄使用不同大小，便于区分

  const cornerR = 4 / zoom
  const edgeR = 3.5 / zoom // 边缘手柄略小于角落手柄，便于区分

  // 计算最小安全间距，防止手柄重叠
  // 当形状尺寸小于 2 * (cornerR + edgeR + 间距) 时，边缘手柄会与角落手柄重叠
  const minSafeWidth = (cornerR + edgeR + 4 / zoom) * 2
  const minSafeHeight = (cornerR + edgeR + 4 / zoom) * 2

  // 动态计算边缘手柄位置，确保不与角落手柄重叠
  let edgeTopY = b.y
  let edgeBottomY = b.y + b.h
  let edgeLeftX = b.x
  let edgeRightX = b.x + b.w

  // 如果形状太窄，将左右边缘手柄向内偏移，避免与上下角落手柄重叠
  if (b.w < minSafeWidth) {
    const offset = (minSafeWidth - b.w) / 2 + 2 / zoom
    edgeLeftX = b.x + offset
    edgeRightX = b.x + b.w - offset
  }

  // 如果形状太矮，将上下边缘手柄向内偏移，避免与左右角落手柄重叠
  if (b.h < minSafeHeight) {
    const offset = (minSafeHeight - b.h) / 2 + 2 / zoom
    edgeTopY = b.y + offset
    edgeBottomY = b.y + b.h - offset
  }

  ctx.fillStyle = primary
  ctx.shadowColor = isDarkMode ? 'rgba(200,160,176,0.3)' : 'rgba(176,125,110,0.3)'
  ctx.shadowBlur = 4 / zoom

  if (showResizeHandles) {
    // 先绘制边缘手柄（在角落手柄下方）
    // 边缘手柄：上、下、左、右四边中点
    ctx.beginPath()
    addHandleCircle(b.x + b.w / 2, edgeTopY, edgeR) // 上边缘中点
    addHandleCircle(b.x + b.w / 2, edgeBottomY, edgeR) // 下边缘中点
    addHandleCircle(edgeLeftX, b.y + b.h / 2, edgeR) // 左边缘中点
    addHandleCircle(edgeRightX, b.y + b.h / 2, edgeR) // 右边缘中点
    ctx.fill()

    // P0 性能优化: 合并 4 个角落手柄为单次 beginPath/fill 调用
    // 角落手柄（后绘制，显示在边缘手柄上方）
    ctx.beginPath()
    addHandleCircle(b.x, b.y, cornerR)
    addHandleCircle(b.x + b.w, b.y, cornerR)
    addHandleCircle(b.x, b.y + b.h, cornerR)
    addHandleCircle(b.x + b.w, b.y + b.h, cornerR)
    ctx.fill()
  }

  // 旋转手柄
  // 专业设计工具标准：选择框顶部中央显示旋转手柄，拖拽即可旋转
  if (!showRotateHandle) {
    ctx.restore()
    return
  }
  const rotateHandleR = 5 / zoom
  const rotateHandleY = b.y - 20 / zoom
  const rotateHandleX = b.x + b.w / 2
  const connectorLength = 12 / zoom

  // 连接线：从选择框顶部到旋转手柄
  ctx.strokeStyle = primary
  ctx.lineWidth = 1.2 / zoom
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.moveTo(rotateHandleX, b.y)
  ctx.lineTo(rotateHandleX, rotateHandleY - connectorLength)
  ctx.stroke()

  // 旋转手柄圆圈
  ctx.shadowColor = isDarkMode ? 'rgba(200,160,176,0.4)' : 'rgba(176,125,110,0.4)'
  ctx.shadowBlur = 6 / zoom
  ctx.beginPath()
  addHandleCircle(rotateHandleX, rotateHandleY, rotateHandleR)
  ctx.fillStyle = primary
  ctx.fill()

  // 旋转图标（圆形箭头指示）
  ctx.shadowBlur = 0
  ctx.strokeStyle = isDarkMode ? '#1C1A24' : '#ffffff'
  ctx.lineWidth = 1.5 / zoom
  ctx.beginPath()
  ctx.arc(rotateHandleX, rotateHandleY, rotateHandleR * 0.5, -0.5, Math.PI * 1.2)
  ctx.stroke()
  // 箭头尖端
  ctx.beginPath()
  ctx.moveTo(
    rotateHandleX + rotateHandleR * 0.5 * Math.cos(Math.PI * 1.2),
    rotateHandleY + rotateHandleR * 0.5 * Math.sin(Math.PI * 1.2)
  )
  ctx.lineTo(
    rotateHandleX + rotateHandleR * 0.7 * Math.cos(Math.PI * 1.1),
    rotateHandleY + rotateHandleR * 0.7 * Math.sin(Math.PI * 1.1)
  )
  ctx.lineTo(
    rotateHandleX + rotateHandleR * 0.5 * Math.cos(Math.PI * 1.0),
    rotateHandleY + rotateHandleR * 0.5 * Math.sin(Math.PI * 1.0)
  )
  ctx.fillStyle = isDarkMode ? '#1C1A24' : '#ffffff'
  ctx.fill()

  ctx.restore()
}

export function drawZoomLevel(
  ctx: CanvasRenderingContext2D,
  viewBox: { zoom: number },
  canvasSize: { w: number; h: number },
  isDarkMode: boolean,
  dpr: number
) {
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const text = Math.round(viewBox.zoom * 100) + '%'
  ctx.font = '500 11px "Noto Sans SC", sans-serif'
  ctx.fillStyle = isDarkMode ? 'rgba(200,160,176,0.4)' : 'rgba(176,125,110,0.35)'
  ctx.textAlign = 'right'
  ctx.fillText(text, canvasSize.w - 16, 22)
  ctx.restore()
}
// 导出缓存失效函数 - 元素变化时主动清除缓存
