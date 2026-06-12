import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useToastStore } from '../../store/toastStore'
import type { CanvasElement } from '../../store/types'

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
  const ctx = t.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h)
  return t
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSVG(elements: CanvasElement[], isDarkMode: boolean): string {
  const c = getCanvas()
  if (!c) return ''
  const dpr = window.devicePixelRatio || 1
  const lw = Math.round(c.width / dpr),
    lh = Math.round(c.height / dpr)
  const bg = isDarkMode ? DARK_BG : '#fff'
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw}" height="${lh}">\n`
  s += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="context-stroke"/></marker></defs>\n`
  s += `<rect width="100%" height="100%" fill="${bg}"/>\n`
  for (const el of elements) {
    if (el.type === 'stroke' && el.points.length >= 2) {
      let d = `M${el.points[0][0]} ${el.points[0][1]}`
      for (let i = 1; i < el.points.length; i++) d += `L${el.points[i][0]} ${el.points[i][1]}`
      s += `<path d="${d}" stroke="${el.color}" stroke-width="${el.size}" fill="none" stroke-linecap="round"/>\n`
    } else if (el.type === 'shape') {
      const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
      if (el.kind === 'rectangle')
        s += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" stroke="${el.color}" stroke-width="${el.size}" fill="${fill}" rx="3"/>\n`
      else if (el.kind === 'circle')
        s += `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${Math.abs(el.w) / 2}" ry="${Math.abs(el.h) / 2}" stroke="${el.color}" stroke-width="${el.size}" fill="${fill}"/>\n`
      else if (el.kind === 'arrow')
        s += `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" stroke="${el.color}" stroke-width="${el.size}" marker-end="url(#arrowhead)"/>\n`
      else
        s += `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" stroke="${el.color}" stroke-width="${el.size}"/>\n`
    } else if (el.type === 'text') {
      const lines = el.content.split('\n')
      const lineHeight = el.fontSize * 1.4
      if (lines.length === 1) {
        s += `<text x="${el.x}" y="${el.y + el.fontSize}" fill="${el.color}" font-size="${el.fontSize}" font-family="sans-serif">${escapeXml(lines[0])}</text>\n`
      } else {
        s += `<text x="${el.x}" y="${el.y + el.fontSize}" fill="${el.color}" font-size="${el.fontSize}" font-family="sans-serif">\n`
        for (let i = 0; i < lines.length; i++) {
          s += `  <tspan x="${el.x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(lines[i])}</tspan>\n`
        }
        s += `</text>\n`
      }
    } else if (el.type === 'image') {
      s += `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${el.dataUrl}" preserveAspectRatio="none"/>\n`
    }
  }
  s += '</svg>'
  return s
}

export default function ExportMenu() {
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 })
  const elements = useAppStore((s) => s.elements)
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
    const svgStr = buildSVG(elements, isDarkMode)
    if (!svgStr) return showToast('画布为空', 'warning')
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
  const exportJSON = () =>
    download(
      new Blob([JSON.stringify({ elements, version: 2 }, null, 2)], { type: 'application/json' }),
      `mindnotes-${ts()}.json`
    )

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
          const els: any[] = []
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

  const handleToggle = () => {
    if (!showExport && exportBtnRef.current) {
      const r = exportBtnRef.current.getBoundingClientRect()
      setExportPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    setShowExport(!showExport)
  }

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
}
