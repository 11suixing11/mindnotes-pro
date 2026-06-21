import { useRef, useState, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useToastStore } from '../../store/toastStore'
import type { CanvasElement } from '../../store/types'
import { buildSVGString } from '../../canvas/svgExport'

const DARK_BG = '#1C1A24'

const I = {
  download: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  image: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  file: (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 200)
}
function ts() {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
}
function getCanvas() {
  return document.getElementById('main-canvas') as HTMLCanvasElement | null
}

function withBg(c: HTMLCanvasElement, bg: string) {
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(c.width / dpr),
    h = Math.round(c.height / dpr)
  const t = document.createElement('canvas')
  t.width = w
  t.height = h
  const ctx = t.getContext('2d')
  if (!ctx) return t
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h)
  return t
}

const ExportMenu = memo(function ExportMenu() {
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 })
  // P1-11 修复: 移除 elements 订阅，只在导出时通过 getState() 获取
  // 避免任何元素变化都触发 ExportMenu re-render
  const isDarkMode = useThemeStore((s) => s.isDarkMode)
  const showToast = useToastStore((s) => s.show)

  const requireCanvas = () => {
    const c = getCanvas()
    if (!c) {
      showToast('画布未就绪', 'warning')
      return null
    }
    return c
  }

  const exportPNG = () => {
    const c = requireCanvas()
    if (!c) return
    const t = withBg(c, 'transparent')
    t.toBlob((b) => {
      if (b) {
        download(b, `mindnotes-${ts()}.png`)
        showToast('PNG 导出成功', 'success')
      } else {
        showToast('PNG 导出失败', 'error')
      }
    })
  }
  const exportJPG = () => {
    const c = requireCanvas()
    if (!c) return
    const t = withBg(c, '#fff')
    t.toBlob(
      (b) => {
        if (b) {
          download(b, `mindnotes-${ts()}.jpg`)
          showToast('JPG 导出成功', 'success')
        } else {
          showToast('JPG 导出失败', 'error')
        }
      },
      'image/jpeg',
      0.92
    )
  }
  const exportPDF = async () => {
    const c = requireCanvas()
    if (!c) return
    const t = withBg(c, isDarkMode ? DARK_BG : '#fff')
    const { jsPDF } = await import('jspdf')
    const imgData = t.toDataURL('image/png')
    const pw = t.width * 0.264583,
      ph = t.height * 0.264583
    const p = new jsPDF({
      orientation: pw > ph ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pw, ph],
    })
    p.addImage(imgData, 'PNG', 0, 0, pw, ph)
    p.save(`mindnotes-${ts()}.pdf`)
    showToast('PDF 导出成功', 'success')
  }
  const exportSVG = () => {
    const c = getCanvas()
    if (!c) return showToast('画布为空', 'warning')
    const dpr = window.devicePixelRatio || 1
    const width = Math.round(c.width / dpr)
    const height = Math.round(c.height / dpr)
    // P1-11 修复: 导出时才获取 elements
    const elements = useAppStore.getState().elements
    const svgStr = buildSVGString(elements, { width, height, isDarkMode })
    download(new Blob([svgStr], { type: 'image/svg+xml' }), `mindnotes-${ts()}.svg`)
    showToast('SVG 导出成功', 'success')
  }
  const exportWord = () => {
    const c = requireCanvas()
    if (!c) return
    const t = withBg(c, isDarkMode ? DARK_BG : '#fff')
    const d = t.toDataURL('image/png')
    const h = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>body{font-family:sans-serif}img{max-width:100%}</style></head><body><h1>MindNotes Pro</h1><p>导出时间：${new Date().toLocaleString('zh-CN')}</p><p><img src="${d}" width="${t.width}" height="${t.height}"/></p></body></html>`
    download(new Blob([h], { type: 'application/msword' }), `mindnotes-${ts()}.doc`)
    showToast('Word 导出成功', 'success')
  }
  const exportJSON = () => {
    // P1-11 修复: 导出时才获取 elements
    const elements = useAppStore.getState().elements
    download(
      new Blob([JSON.stringify({ elements, version: 2 }, null, 2)], { type: 'application/json' }),
      `mindnotes-${ts()}.json`
    )
  }

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const d = JSON.parse(r.result as string)
        if (d.elements) {
          useAppStore.getState().addElements(d.elements)
        } else if (d.strokes || d.shapes) {
          const els: CanvasElement[] = []
          for (const s of d.strokes ?? []) {
            if (s.imageData)
              els.push({
                type: 'image',
                id: s.id,
                x: s.points[0][0],
                y: s.points[0][1],
                width: s.imageWidth ?? 200,
                height: s.imageHeight ?? 200,
                dataUrl: s.imageData,
              })
            else if (s.name)
              els.push({
                type: 'text',
                id: s.id,
                x: s.points[0][0],
                y: s.points[0][1],
                width: 200,
                height: 30,
                content: s.name,
                fontSize: 16,
                color: s.color,
              })
            else
              els.push({
                type: 'stroke',
                id: s.id,
                points: s.points,
                color: s.color,
                size: s.size,
                brush: s.brush ?? 'pen',
              })
          }
          for (const s of d.shapes ?? []) {
            if (s.type === 'text') continue
            const sx = s.startX ?? s.x,
              sy = s.startY ?? s.y,
              ex = s.endX ?? s.x + s.width,
              ey = s.endY ?? s.y + s.height
            els.push({
              type: 'shape',
              id: s.id,
              kind: s.type,
              x: Math.min(sx, ex),
              y: Math.min(sy, ey),
              w: Math.abs(ex - sx),
              h: Math.abs(ey - sy),
              color: s.color,
              size: s.size,
            })
          }
          useAppStore.getState().addElements(els)
        } else {
          showToast('文件格式不正确', 'error')
        }
      } catch {
        showToast('无法解析文件', 'error')
      }
    }
    r.readAsText(f)
    e.target.value = ''
  }

  const EXPORTS = [
    { icon: I.image, label: 'PNG 图片', desc: '透明背景', action: exportPNG },
    { icon: I.image, label: 'JPG 图片', desc: '白色背景', action: exportJPG },
    { icon: I.file, label: 'PDF 文档', desc: 'mm 单位自适应', action: exportPDF },
    { icon: I.image, label: 'SVG 矢量', desc: '含图片+多行文字', action: exportSVG },
    { icon: I.file, label: 'Word 文档', desc: '嵌入截图', action: exportWord },
    { icon: I.download, label: 'JSON 数据', desc: '完整备份', action: exportJSON },
  ]

  const handleToggle = useCallback(() => {
    if (!showExport && exportBtnRef.current) {
      const r = exportBtnRef.current.getBoundingClientRect()
      setExportPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setShowExport(!showExport)
  }, [showExport])

  return (
    <>
      <button
        ref={exportBtnRef}
        onClick={handleToggle}
        className="pill-btn primary"
        aria-label="导出"
        aria-haspopup="true"
        aria-expanded={showExport}
      >
        {I.download}
        <span>导出</span>
      </button>

      {showExport &&
        createPortal(
          <>
            <div
              className="panel em-menu"
              role="menu"
              aria-label="导出选项"
              style={{ top: exportPos.top, right: exportPos.right }}
            >
              {EXPORTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action()
                    setShowExport(false)
                  }}
                  className="ditem"
                  role="menuitem"
                  aria-label={item.label}
                >
                  <span className="di em-icon">{item.icon}</span>
                  <div className="em-labels">
                    <span className="dl">{item.label}</span>
                    <span className="dd">{item.desc}</span>
                  </div>
                </button>
              ))}
              <div className="dsep" />
              <button
                onClick={() => {
                  fileRef.current?.click()
                  setShowExport(false)
                }}
                className="ditem"
                role="menuitem"
                aria-label="导入 JSON"
              >
                <span className="di em-icon">{I.file}</span>
                <span className="dl">导入 JSON</span>
              </button>
            </div>

            <div className="em-overlay" onClick={() => setShowExport(false)} />
          </>,
          document.body
        )}

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={importJSON}
        className="em-hidden-input"
        aria-label="选择 JSON 文件"
      />
    </>
  )
})

export default ExportMenu
