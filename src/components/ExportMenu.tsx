import { useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useThemeStore } from '../store/useThemeStore'
import { useToastStore } from '../store/toastStore'
import type { CanvasElement } from '../store/types'

const I = {
  download: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  image: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  file: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.style.display = 'none'
  document.body.appendChild(a); a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
}
function ts() { return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') }
function getCanvas() { return document.querySelector('canvas') }

function withBg(c: HTMLCanvasElement, bg: string) {
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(c.width / dpr), h = Math.round(c.height / dpr)
  const t = document.createElement('canvas'); t.width = w; t.height = h
  const ctx = t.getContext('2d')!; ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h); return t
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildSVG(elements: CanvasElement[], isDarkMode: boolean): string {
  const c = getCanvas()
  if (!c) return ''
  const dpr = window.devicePixelRatio || 1
  const lw = Math.round(c.width / dpr), lh = Math.round(c.height / dpr)
  const bg = isDarkMode ? '#1C1A24' : '#fff'
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw}" height="${lh}"><rect width="100%" height="100%" fill="${bg}"/>\n`
  for (const el of elements) {
    if (el.type === 'stroke' && el.points.length >= 2) {
      let d = `M${el.points[0][0]} ${el.points[0][1]}`
      for (let i = 1; i < el.points.length; i++) d += `L${el.points[i][0]} ${el.points[i][1]}`
      s += `<path d="${d}" stroke="${el.color}" stroke-width="${el.size}" fill="none" stroke-linecap="round"/>\n`
    } else if (el.type === 'shape') {
      const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none'
      if (el.kind === 'rectangle') s += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" stroke="${el.color}" stroke-width="${el.size}" fill="${fill}" rx="3"/>\n`
      else if (el.kind === 'circle') s += `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${Math.abs(el.w) / 2}" ry="${Math.abs(el.h) / 2}" stroke="${el.color}" stroke-width="${el.size}" fill="${fill}"/>\n`
      else s += `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" stroke="${el.color}" stroke-width="${el.size}"/>\n`
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

function getContentBounds(elements: CanvasElement[]): { x: number; y: number; w: number; h: number } | null {
  if (elements.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    if (el.type === 'stroke') {
      for (const p of el.points) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }
    } else if (el.type === 'text' || el.type === 'image') {
      minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.width); maxY = Math.max(maxY, el.y + el.height)
    } else if (el.type === 'shape') {
      minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); maxX = Math.max(maxX, el.x + el.w); maxY = Math.max(maxY, el.y + el.h)
    }
  }
  const pad = 20
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

export async function exportContentToCanvas(elements: CanvasElement[], bg: string): Promise<HTMLCanvasElement | null> {
  const bounds = getContentBounds(elements)
  if (!bounds) return null
  const scale = 2
  const t = document.createElement('canvas'); t.width = bounds.w * scale; t.height = bounds.h * scale
  const ctx = t.getContext('2d')!; ctx.scale(scale, scale)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, bounds.w, bounds.h)
  ctx.translate(-bounds.x, -bounds.y)
  const imageElements = elements.filter((el) => el.type === 'image')
  const imageMap = new Map<string, HTMLImageElement>()
  await Promise.all(imageElements.map(async (el) => {
    try {
      const img = await loadImage(el.dataUrl)
      imageMap.set(el.id, img)
    } catch {
      // ignore failed image loads
    }
  }))
  for (const el of elements) {
    if (el.type === 'stroke' && el.points.length >= 2) {
      ctx.beginPath(); ctx.strokeStyle = el.color; ctx.lineWidth = el.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      if (el.brush === 'highlighter') ctx.globalAlpha = el.opacity ?? 0.3
      ctx.moveTo(el.points[0][0], el.points[0][1])
      for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i][0], el.points[i][1])
      ctx.stroke(); ctx.globalAlpha = 1
    } else if (el.type === 'shape') {
      ctx.strokeStyle = el.color; ctx.lineWidth = el.size
      const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : null
      if (el.kind === 'rectangle') { if (fill) { ctx.fillStyle = fill; ctx.fillRect(el.x, el.y, el.w, el.h) } ctx.strokeRect(el.x, el.y, el.w, el.h) }
      else if (el.kind === 'circle') { ctx.beginPath(); ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w) / 2, Math.abs(el.h) / 2, 0, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill() } ctx.stroke() }
      else { ctx.beginPath(); ctx.moveTo(el.x, el.y); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.stroke() }
    } else if (el.type === 'text') {
      ctx.fillStyle = el.color; ctx.font = `${el.fontSize}px 'Noto Sans SC', sans-serif`
      const lines = el.content.split('\n')
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], el.x, el.y + el.fontSize + i * el.fontSize * 1.4)
    } else if (el.type === 'image') {
      const img = imageMap.get(el.id)
      if (!img) continue
      const prevAlpha = ctx.globalAlpha
      if (typeof el.opacity === 'number') ctx.globalAlpha = el.opacity
      ctx.drawImage(img, el.x, el.y, el.width, el.height)
      ctx.globalAlpha = prevAlpha
    }
  }
  return t
}

export default function ExportMenu() {
  const toast = useToastStore((s) => s.show)
  const elements = useAppStore((s) => s.elements)
  const { isDarkMode } = useThemeStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 })

  const exportPNG = async () => {
    if (elements.length === 0) return toast('画布为空', 'warning')
    const t = await exportContentToCanvas(elements, 'transparent')
    if (!t) return toast('导出失败', 'error')
    t.toBlob((b) => { if (b) { download(b, `mindnotes-${ts()}.png`); toast('PNG 导出成功（透明背景）', 'success') } else toast('PNG 导出失败', 'error') }, 'image/png')
  }
  const exportJPG = async () => {
    if (elements.length === 0) return toast('画布为空', 'warning')
    const t = await exportContentToCanvas(elements, '#ffffff')
    if (!t) return toast('导出失败', 'error')
    t.toBlob((b) => { if (b) { download(b, `mindnotes-${ts()}.jpg`); toast('JPG 导出成功', 'success') } else toast('JPG 导出失败', 'error') }, 'image/jpeg', 0.92)
  }
  const exportPDF = async () => {
    const c = getCanvas(); if (!c) return toast('画布未就绪', 'warning')
    const t = withBg(c, isDarkMode ? '#1C1A24' : '#fff')
    const { jsPDF } = await import('jspdf')
    const DPI = 96; const MM_PER_INCH = 25.4
    const wMM = (t.width / DPI) * MM_PER_INCH; const hMM = (t.height / DPI) * MM_PER_INCH
    const p = new jsPDF({ orientation: t.width > t.height ? 'landscape' : 'portrait', unit: 'mm', format: [wMM, hMM] })
    p.addImage(t.toDataURL('image/png'), 'PNG', 0, 0, wMM, hMM); p.save(`mindnotes-${ts()}.pdf`)
    toast('PDF 导出成功', 'success')
  }
  const exportSVG = () => {
    const svgStr = buildSVG(elements, isDarkMode)
    if (!svgStr) return toast('画布为空', 'warning')
    download(new Blob([svgStr], { type: 'image/svg+xml' }), `mindnotes-${ts()}.svg`)
    toast('SVG 导出成功', 'success')
  }
  const exportWord = async () => {
    const c = getCanvas(); if (!c) return toast('画布未就绪', 'warning')
    const t = withBg(c, isDarkMode ? '#1C1A24' : '#fff')
    const d = t.toDataURL('image/png')
    const h = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>body{font-family:sans-serif}img{max-width:100%}</style></head><body><h1>MindNotes Pro</h1><p>导出时间：${new Date().toLocaleString('zh-CN')}</p><p><img src="${d}" width="${t.width}" height="${t.height}"/></p></body></html>`
    download(new Blob([h], { type: 'application/msword' }), `mindnotes-${ts()}.doc`)
  }
  const exportJSON = () => download(new Blob([JSON.stringify({ elements, version: 2 }, null, 2)], { type: 'application/json' }), `mindnotes-${ts()}.json`)
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const d = JSON.parse(r.result as string)
        if (d.elements) { useAppStore.getState().addElements(d.elements) }
        else if (d.strokes || d.shapes) {
          const els: any[] = []
          for (const s of d.strokes ?? []) { if (s.imageData) els.push({ type: 'image', id: s.id, x: s.points[0][0], y: s.points[0][1], width: s.imageWidth ?? 200, height: s.imageHeight ?? 200, dataUrl: s.imageData }); else if (s.name) els.push({ type: 'text', id: s.id, x: s.points[0][0], y: s.points[0][1], width: 200, height: 30, content: s.name, fontSize: 16, color: s.color }); else els.push({ type: 'stroke', id: s.id, points: s.points, color: s.color, size: s.size, brush: s.brush ?? 'pen' }) }
          for (const s of d.shapes ?? []) { if (s.type === 'text') continue; const sx = s.startX ?? s.x, sy = s.startY ?? s.y, ex = s.endX ?? s.x + s.width, ey = s.endY ?? s.y + s.height; els.push({ type: 'shape', id: s.id, kind: s.type, x: Math.min(sx, ex), y: Math.min(sy, ey), w: Math.abs(ex - sx), h: Math.abs(ey - sy), color: s.color, size: s.size }) }
          useAppStore.getState().addElements(els)
        } else { toast('文件格式不正确', 'error') }
      } catch { toast('无法解析文件', 'error') }
    }
    r.readAsText(f); e.target.value = ''
  }

  const EXPORTS = [
    { icon: I.image, label: 'PNG 图片', desc: '透明背景', action: exportPNG },
    { icon: I.image, label: 'JPG 图片', desc: '白色背景', action: exportJPG },
    { icon: I.file, label: 'PDF 文档', desc: 'mm 单位自适应', action: exportPDF },
    { icon: I.image, label: 'SVG 矢量', desc: '含图片+多行文字', action: exportSVG },
    { icon: I.file, label: 'Word 文档', desc: '嵌入截图', action: exportWord },
    { icon: I.download, label: 'JSON 数据', desc: '完整备份', action: exportJSON },
  ]

  return (
    <>
      <button ref={exportBtnRef} onClick={() => {
        if (!showExport && exportBtnRef.current) { const r = exportBtnRef.current.getBoundingClientRect(); setExportPos({ top: r.bottom + 8, right: window.innerWidth - r.right }) }
        setShowExport(!showExport)
      }} className="pill-btn primary">
        {I.download}
        <span>导出</span>
      </button>

      {showExport && (
        <div className="panel" style={{ position: 'fixed', top: exportPos.top, right: exportPos.right, minWidth: '200px', padding: '5px', zIndex: 100, animation: 'popIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
          {EXPORTS.map((item) => (
            <button key={item.label} onClick={() => { item.action(); setShowExport(false) }} className="ditem">
              <span className="di" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="dl">{item.label}</span>
                <span className="dd">{item.desc}</span>
              </div>
            </button>
          ))}
          <div className="dsep" />
          <button onClick={() => { fileRef.current?.click(); setShowExport(false) }} className="ditem">
            <span className="di" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.file}</span>
            <span className="dl">导入 JSON</span>
          </button>
        </div>
      )}

      {showExport && <div className="fixed inset-0" style={{ zIndex: 5 }} onClick={() => setShowExport(false)} />}

      <input ref={fileRef} type="file" accept=".json" onChange={importJSON}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
    </>
  )
}
