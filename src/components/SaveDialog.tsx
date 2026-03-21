import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import { getStroke } from 'perfect-freehand'

interface SaveDialogProps {
  isOpen: boolean
  onClose: () => void
  canvas: HTMLCanvasElement | null
}

// 从 perfect-freehand 点数组生成 SVG 路径
function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )
  d.push('Z')
  return d.join(' ')
}

const SaveDialog: React.FC<SaveDialogProps> = ({ isOpen, onClose, canvas }) => {
  const { strokes, textElements, shapes } = useAppStore()
  const [format, setFormat] = useState<'png' | 'json' | 'pdf' | 'svg' | 'clipboard' | 'markdown'>('png')
  const [isSaving, setIsSaving] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  if (!isOpen) return null

  // 导出为 PNG
  const exportAsPNG = () => {
    if (!canvas) return

    setIsSaving(true)
    canvas.toBlob((blob) => {
      if (!blob) return
      saveAs(blob, `mindnotes-${Date.now()}.png`)
      setIsSaving(false)
      onClose()
    }, 'image/png')
  }

  // 导出为 JSON（完整画布数据）
  const exportAsJSON = () => {
    setIsSaving(true)
    try {
      const data = JSON.stringify({
        version: '1.2.2',
        exportedAt: new Date().toISOString(),
        strokes,
        shapes,
        textElements,
      }, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      saveAs(blob, `mindnotes-${Date.now()}.json`)
    } catch (error) {
      console.error('导出 JSON 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }

  // 导出为 SVG（包含笔迹 + 形状）
  const exportAsSVG = () => {
    setIsSaving(true)
    try {
      const { shapes } = useAppStore.getState()

      // 计算画布边界
      let minX = 0, minY = 0, maxX = 1920, maxY = 1080
      for (const s of strokes) {
        for (const p of s.points) {
          if (p[0] < minX) minX = p[0]
          if (p[1] < minY) minY = p[1]
          if (p[0] > maxX) maxX = p[0]
          if (p[1] > maxY) maxY = p[1]
        }
      }
      for (const s of shapes) {
        const sx = s.startX ?? s.x
        const sy = s.startY ?? s.y
        const ex = s.endX ?? s.x + s.width
        const ey = s.endY ?? s.y + s.height
        if (Math.min(sx, ex) < minX) minX = Math.min(sx, ex)
        if (Math.min(sy, ey) < minY) minY = Math.min(sy, ey)
        if (Math.max(sx, ex) > maxX) maxX = Math.max(sx, ex)
        if (Math.max(sy, ey) > maxY) maxY = Math.max(sy, ey)
      }

      const padding = 50
      minX -= padding; minY -= padding; maxX += padding; maxY += padding
      const vw = maxX - minX; const vh = maxY - minY

      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${vw} ${vh}" width="${vw}" height="${vh}">
  <rect x="${minX}" y="${minY}" width="${vw}" height="${vh}" fill="white"/>
`

      // 添加笔迹
      for (const stroke of strokes) {
        if (stroke.hidden || stroke.points.length < 2) continue
        const strokeOutline = getStroke(stroke.points, {
          size: stroke.size,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
        const pathData = getSvgPathFromStroke(strokeOutline)
        if (stroke.tool === 'eraser') continue // 跳过橡皮擦
        svgContent += `  <path d="${pathData}" fill="${stroke.color}"${stroke.opacity !== undefined ? ` opacity="${stroke.opacity}"` : ''} />
`
      }

      // 添加形状
      for (const shape of shapes) {
        if (shape.hidden) continue
        const opAttr = shape.opacity !== undefined ? ` opacity="${shape.opacity}"` : ''

        if (shape.type === 'rectangle') {
          const fillAttr = shape.fillColor ? ` fill="${shape.fillColor}" fill-opacity="${shape.fillOpacity ?? 0.2}"` : ' fill="none"'
          svgContent += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" stroke="${shape.color}" stroke-width="${shape.size}"${fillAttr} stroke-linecap="round" stroke-linejoin="round"${opAttr} />
`
        } else if (shape.type === 'circle') {
          const cx = shape.x + shape.width / 2
          const cy = shape.y + shape.height / 2
          const rx = Math.abs(shape.width) / 2
          const ry = Math.abs(shape.height) / 2
          const fillAttr = shape.fillColor ? ` fill="${shape.fillColor}" fill-opacity="${shape.fillOpacity ?? 0.2}"` : ' fill="none"'
          svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${shape.color}" stroke-width="${shape.size}"${fillAttr}${opAttr} />
`
        } else if (shape.type === 'triangle') {
          const pts = `${shape.x + shape.width / 2},${shape.y} ${shape.x + shape.width},${shape.y + shape.height} ${shape.x},${shape.y + shape.height}`
          const fillAttr = shape.fillColor ? ` fill="${shape.fillColor}" fill-opacity="${shape.fillOpacity ?? 0.2}"` : ' fill="none"'
          svgContent += `  <polygon points="${pts}" stroke="${shape.color}" stroke-width="${shape.size}"${fillAttr} stroke-linejoin="round"${opAttr} />
`
        } else if ((shape.type === 'line' || shape.type === 'arrow') && shape.startX !== undefined) {
          svgContent += `  <line x1="${shape.startX}" y1="${shape.startY}" x2="${shape.endX}" y2="${shape.endY}" stroke="${shape.color}" stroke-width="${shape.size}" stroke-linecap="round"${opAttr} />
`
          if (shape.type === 'arrow') {
            const angle = Math.atan2(shape.endY! - shape.startY!, shape.endX! - shape.startX!)
            const headLen = 15
            const ax1 = shape.endX! - headLen * Math.cos(angle - Math.PI / 6)
            const ay1 = shape.endY! - headLen * Math.sin(angle - Math.PI / 6)
            const ax2 = shape.endX! - headLen * Math.cos(angle + Math.PI / 6)
            const ay2 = shape.endY! - headLen * Math.sin(angle + Math.PI / 6)
            svgContent += `  <line x1="${shape.endX}" y1="${shape.endY}" x2="${ax1}" y2="${ay1}" stroke="${shape.color}" stroke-width="${shape.size}" stroke-linecap="round"${opAttr} />
  <line x1="${shape.endX}" y1="${shape.endY}" x2="${ax2}" y2="${ay2}" stroke="${shape.color}" stroke-width="${shape.size}" stroke-linecap="round"${opAttr} />
`
          }
        }
      }

      svgContent += `</svg>`

      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      saveAs(blob, `mindnotes-${Date.now()}.svg`)
    } catch (error) {
      console.error('导出 SVG 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!canvas) return
    setIsSaving(true)
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('无法生成图片'))
        }, 'image/png')
      })
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('复制到剪贴板失败:', error)
      alert('复制失败，可能是因为浏览器不支持或未授予权限。请尝试使用 PNG 导出后手动复制。')
    }
    setIsSaving(false)
  }

  // 导出为 Markdown
  const exportAsMarkdown = () => {
    setIsSaving(true)
    try {
      let md = `# MindNotes 导出\n\n`
      md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`

      // 提取文字内容
      const textEls = textElements.filter(t => t.text.trim())
      if (textEls.length > 0) {
        // 按 y 坐标排序（从上到下）
        textEls.sort((a, b) => a.y - b.y)
        for (const t of textEls) {
          md += `${t.text}\n\n`
        }
      }

      // 统计信息
      md += `---\n\n`
      md += `## 画布统计\n\n`
      md += `- 笔迹数量: ${strokes.filter(s => s.tool === 'pen').length}\n`
      md += `- 形状数量: ${shapes.length}\n`
      md += `- 文字数量: ${textEls.length}\n`

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      saveAs(blob, `mindnotes-${Date.now()}.md`)
    } catch (error) {
      console.error('导出 Markdown 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }

  // 导出为 PDF
  const exportAsPDF = () => {
    if (!canvas) return

    setIsSaving(true)
    try {
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`mindnotes-${Date.now()}.pdf`)
    } catch (error) {
      console.error('导出 PDF 失败:', error)
      alert('导出失败，请重试')
    }
    setIsSaving(false)
    onClose()
  }

  const handleSave = () => {
    switch (format) {
      case 'png':
        exportAsPNG()
        break
      case 'svg':
        exportAsSVG()
        break
      case 'json':
        exportAsJSON()
        break
      case 'pdf':
        exportAsPDF()
        break
      case 'clipboard':
        copyToClipboard()
        break
      case 'markdown':
        exportAsMarkdown()
        break
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">💾 保存笔记</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">选择导出格式</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFormat('png')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'png'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">🖼️</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">PNG 图片</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">适合分享</div>
            </button>

            <button
              onClick={() => setFormat('svg')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'svg'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">🎨</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">SVG 矢量</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">无损缩放</div>
            </button>

            <button
              onClick={() => setFormat('json')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'json'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON 数据</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">可再次编辑</div>
            </button>

            <button
              onClick={() => setFormat('pdf')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'pdf'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">📕</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF 文档</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">适合打印</div>
            </button>

            <button
              onClick={copyToClipboard}
              disabled={isSaving || !canvas}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                copySuccess
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${(!canvas) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-3xl mb-2">{copySuccess ? '✅' : '📋'}</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {copySuccess ? '已复制!' : '复制到剪贴板'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">直接粘贴分享</div>
            </button>

            <button
              onClick={() => setFormat('markdown')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                format === 'markdown'
                  ? 'border-primary bg-blue-50 dark:bg-blue-900/30 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-3xl mb-2">📝</div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Markdown</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">文字内容导出</div>
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            关闭
          </button>
          {format !== 'clipboard' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>💾 保存为 {format.toUpperCase()}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SaveDialog
