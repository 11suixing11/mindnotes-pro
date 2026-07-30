import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  FileJson,
  FileText,
  FileUp,
  Image as ImageIcon,
  Shapes,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/useThemeStore'
import { useToastStore } from '../../store/toastStore'
import type { CanvasDoc } from '../../store/types'
import { createCanvasBackup, parseCanvasImportJSON } from '../../store/backup'
import { getRenderableElements } from '../../store/layers'
import {
  canvasToBlob,
  EmptyDocumentError,
  getDocumentExportBounds,
  renderDocumentToCanvas,
  sanitizeExportFilename,
} from '../../canvas/documentExport'
import { buildSVGString } from '../../canvas/svgExport'

const DEFAULT_JPEG_QUALITY = 85

interface ExportContext {
  doc: CanvasDoc
  visibleElements: CanvasDoc['elements']
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  window.setTimeout(() => {
    anchor.remove()
    URL.revokeObjectURL(url)
  }, 200)
}

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
}

function exportFilename(doc: CanvasDoc, extension: string) {
  return `${sanitizeExportFilename(doc.title)}-${timestamp()}.${extension}`
}

function getExportContext(): ExportContext {
  const state = useAppStore.getState()
  const storedDoc = state.docs.find((doc) => doc.id === state.currentDocId)
  if (!storedDoc) throw new Error('当前文档未就绪')

  const doc: CanvasDoc = {
    ...storedDoc,
    elements: state.elements,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    bgColor: state.bgColor,
    backgroundStyle: state.backgroundStyle,
  }
  return {
    doc,
    visibleElements: getRenderableElements(state.elements, state.layers),
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ExportMenu = memo(function ExportMenu() {
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 })
  const [jpegQuality, setJpegQuality] = useState(DEFAULT_JPEG_QUALITY)
  const [jpegEstimate, setJpegEstimate] = useState('待估算')
  const isDarkMode = useThemeStore((state) => state.isDarkMode)
  const showToast = useToastStore((state) => state.show)

  const renderRaster = useCallback(
    async (transparent: boolean) => {
      const context = getExportContext()
      if (context.visibleElements.length === 0) throw new EmptyDocumentError()
      const rendered = await renderDocumentToCanvas(context.visibleElements, {
        bgColor: context.doc.bgColor,
        backgroundStyle: context.doc.backgroundStyle,
        isDarkMode,
        transparent,
      })
      return { ...context, ...rendered }
    },
    [isDarkMode]
  )

  useEffect(() => {
    if (!showExport) return
    let cancelled = false
    setJpegEstimate('估算中')

    const timer = window.setTimeout(() => {
      void renderRaster(false)
        .then(({ canvas }) => canvasToBlob(canvas, 'image/jpeg', jpegQuality / 100))
        .then((blob) => {
          if (!cancelled) setJpegEstimate(formatBytes(blob.size))
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setJpegEstimate(error instanceof EmptyDocumentError ? '无可见内容' : '无法估算')
        })
    }, 100)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [jpegQuality, renderRaster, showExport])

  const exportPNG = async () => {
    const { canvas, doc } = await renderRaster(true)
    const blob = await canvasToBlob(canvas)
    download(blob, exportFilename(doc, 'png'))
    showToast('PNG 导出成功', 'success')
  }

  const exportJPEG = async () => {
    const { canvas, doc } = await renderRaster(false)
    const blob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality / 100)
    download(blob, exportFilename(doc, 'jpg'))
    showToast('JPEG 导出成功', 'success')
  }

  const exportPDF = async () => {
    const { canvas, doc } = await renderRaster(false)
    const { jsPDF } = await import('jspdf')
    const imageData = canvas.toDataURL('image/png')
    const widthMm = canvas.width * 0.264583
    const heightMm = canvas.height * 0.264583
    const pdf = new jsPDF({
      orientation: widthMm > heightMm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm],
    })
    pdf.addImage(imageData, 'PNG', 0, 0, widthMm, heightMm)
    pdf.save(exportFilename(doc, 'pdf'))
    showToast('PDF 导出成功', 'success')
  }

  const exportSVG = async () => {
    const { doc, visibleElements } = getExportContext()
    const bounds = getDocumentExportBounds(visibleElements)
    if (!bounds) throw new EmptyDocumentError()
    const svg = buildSVGString(visibleElements, {
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: bounds.h,
      isDarkMode,
      backgroundColor: doc.bgColor,
      backgroundStyle: doc.backgroundStyle,
    })
    download(new Blob([svg], { type: 'image/svg+xml' }), exportFilename(doc, 'svg'))
    showToast('SVG 导出成功', 'success')
  }

  const exportJSON = async () => {
    const { doc } = getExportContext()
    const backup = createCanvasBackup(doc)
    download(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      exportFilename(doc, 'json')
    )
    showToast('JSON 备份导出成功', 'success')
  }

  const runExport = (action: () => Promise<void>) => {
    setShowExport(false)
    void action().catch((error: unknown) => {
      if (error instanceof EmptyDocumentError) {
        showToast(error.message, 'warning')
        return
      }
      const message = error instanceof Error ? error.message : '未知错误'
      showToast(`导出失败：${message}`, 'error')
    })
  }

  const importJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      const imported = parseCanvasImportJSON(await file.text())
      await useAppStore.getState().importDoc(imported)
      showToast('已导入为新的可编辑画布', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法解析文件'
      showToast(`导入失败：${message}`, 'error')
    } finally {
      input.value = ''
    }
  }

  const exports = [
    {
      icon: <ImageIcon size={16} />,
      label: 'PNG 图片',
      desc: '完整内容，透明背景',
      action: exportPNG,
    },
    {
      icon: <FileText size={16} />,
      label: 'PDF 文档',
      desc: '按内容尺寸生成页面',
      action: exportPDF,
    },
    {
      icon: <Shapes size={16} />,
      label: 'SVG 矢量图',
      desc: '保留矢量元素与图片',
      action: exportSVG,
    },
    {
      icon: <FileJson size={16} />,
      label: 'JSON 备份',
      desc: 'MindNotes Pro v4 完整文档',
      action: exportJSON,
    },
  ]

  const handleToggle = useCallback(() => {
    if (!showExport && exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect()
      setExportPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) })
    }
    setShowExport((open) => !open)
  }, [showExport])

  const renderExportItem = (item: (typeof exports)[number]) => (
    <button
      key={item.label}
      type="button"
      onClick={() => runExport(item.action)}
      className="ditem"
      role="menuitem"
      aria-label={item.label}
    >
      <span className="di em-icon">{item.icon}</span>
      <span className="em-labels">
        <span className="dl">{item.label}</span>
        <span className="dd">{item.desc}</span>
      </span>
    </button>
  )

  return (
    <>
      <button
        ref={exportBtnRef}
        type="button"
        onClick={handleToggle}
        className="pill-btn primary"
        aria-label="导出"
        aria-haspopup="true"
        aria-expanded={showExport}
        title="导出或导入画布"
      >
        <Download size={14} />
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
              {exports.slice(0, 1).map(renderExportItem)}
              <div className="em-jpeg-panel" role="group" aria-label="JPEG 导出设置">
                <button
                  type="button"
                  onClick={() => runExport(exportJPEG)}
                  className="ditem em-jpeg-action"
                  role="menuitem"
                  aria-label="JPEG 图片"
                >
                  <span className="di em-icon">
                    <ImageIcon size={16} />
                  </span>
                  <span className="em-labels">
                    <span className="dl">JPEG 图片</span>
                    <span className="dd">文档背景 · {jpegQuality}%</span>
                  </span>
                </button>
                <label className="em-quality-row">
                  <span>质量</span>
                  <strong>{jpegQuality}%</strong>
                  <input
                    aria-label="JPEG 质量"
                    type="range"
                    min="1"
                    max="100"
                    value={jpegQuality}
                    onChange={(event) => setJpegQuality(Number(event.target.value))}
                  />
                </label>
                <div className="em-estimate" aria-live="polite">
                  预计大小：{jpegEstimate}
                </div>
              </div>
              {exports.slice(1).map(renderExportItem)}
              <div className="dsep" />
              <button
                type="button"
                onClick={() => {
                  fileRef.current?.click()
                  setShowExport(false)
                }}
                className="ditem"
                role="menuitem"
                aria-label="导入 JSON"
              >
                <span className="di em-icon">
                  <FileUp size={16} />
                </span>
                <span className="em-labels">
                  <span className="dl">导入 JSON</span>
                  <span className="dd">作为新画布导入 v4、v3 或旧版文件</span>
                </span>
              </button>
            </div>
            <div className="em-overlay" onClick={() => setShowExport(false)} />
          </>,
          document.body
        )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={importJSON}
        className="em-hidden-input"
        aria-label="选择 JSON 文件"
      />
    </>
  )
})

export default ExportMenu
