import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileJson, FileText, FileUp, Image as ImageIcon, Shapes } from 'lucide-react'
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
} from '../../canvas/documentExport'
import { buildSVGString } from '../../canvas/svgExport'
import { ExportItemButton, JpegExportPanel } from './ExportMenuItems'
import {
  DEFAULT_JPEG_QUALITY,
  LOSSY_EXPORT_MAX_PIXELS,
  buildExportFilename,
  formatExportBytes,
  type ExportContext,
  type RasterExport,
} from './exportMenuModel'

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

function getExportContext(): ExportContext {
  const state = useAppStore.getState()
  const storedDoc = state.docs.find((doc) => doc.id === state.currentDocId) ?? state.docs[0]
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

const ExportMenu = memo(function ExportMenu() {
  const exportBtnRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const opaqueRasterRef = useRef<Promise<RasterExport> | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 })
  const [jpegQuality, setJpegQuality] = useState(DEFAULT_JPEG_QUALITY)
  const [jpegEstimate, setJpegEstimate] = useState('待估算')
  const isDarkMode = useThemeStore((state) => state.isDarkMode)
  const showToast = useToastStore((state) => state.show)

  const renderRaster = useCallback(
    async (transparent: boolean): Promise<RasterExport> => {
      const context = getExportContext()
      if (context.visibleElements.length === 0) throw new EmptyDocumentError()
      const rendered = await renderDocumentToCanvas(context.visibleElements, {
        bgColor: context.doc.bgColor,
        backgroundStyle: context.doc.backgroundStyle,
        isDarkMode,
        transparent,
        maxPixels: transparent ? undefined : LOSSY_EXPORT_MAX_PIXELS,
      })
      return { ...context, ...rendered }
    },
    [isDarkMode]
  )

  const renderOpaqueRaster = useCallback(() => {
    if (opaqueRasterRef.current) return opaqueRasterRef.current
    const pending = renderRaster(false).catch((error: unknown) => {
      if (opaqueRasterRef.current === pending) opaqueRasterRef.current = null
      throw error
    })
    opaqueRasterRef.current = pending
    return pending
  }, [renderRaster])

  const closeExport = useCallback((restoreFocus = true) => {
    setShowExport(false)
    opaqueRasterRef.current = null
    if (restoreFocus) queueMicrotask(() => exportBtnRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!showExport) return
    const focusTimer = window.setTimeout(() => {
      const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('button')
      firstButton?.focus()
    }, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeExport()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeExport, showExport])

  useEffect(() => {
    if (!showExport) return
    let cancelled = false
    setJpegEstimate('估算中')

    const timer = window.setTimeout(() => {
      void renderOpaqueRaster()
        .then(({ canvas }) => canvasToBlob(canvas, 'image/jpeg', jpegQuality / 100))
        .then((blob) => {
          if (!cancelled) setJpegEstimate(formatExportBytes(blob.size))
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
  }, [jpegQuality, renderOpaqueRaster, showExport])

  const exportPNG = async () => {
    const { canvas, doc } = await renderRaster(true)
    const blob = await canvasToBlob(canvas)
    download(blob, buildExportFilename(doc, 'png'))
    showToast('PNG 导出成功', 'success')
  }

  const exportJPEG = async () => {
    const { canvas, doc } = await renderOpaqueRaster()
    const blob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality / 100)
    download(blob, buildExportFilename(doc, 'jpg'))
    showToast('JPEG 导出成功', 'success')
  }

  const exportPDF = async () => {
    const { canvas, doc } = await renderOpaqueRaster()
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
    pdf.save(buildExportFilename(doc, 'pdf'))
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
    download(new Blob([svg], { type: 'image/svg+xml' }), buildExportFilename(doc, 'svg'))
    showToast('SVG 导出成功', 'success')
  }

  const exportJSON = async () => {
    const { doc } = getExportContext()
    const backup = createCanvasBackup(doc)
    download(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      buildExportFilename(doc, 'json')
    )
    showToast('JSON 备份导出成功', 'success')
  }

  const runExport = (action: () => Promise<void>) => {
    const pending = action()
    closeExport()
    void pending.catch((error: unknown) => {
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
      await useAppStore.getState().replaceCurrentDoc(imported)
      showToast('已导入并替换当前画板', 'success')
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
      desc: 'MindNotes Pro v5 完整文档',
      action: exportJSON,
    },
  ]

  const handleToggle = useCallback(() => {
    if (showExport) {
      closeExport(false)
      return
    }
    if (exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect()
      setExportPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) })
    }
    opaqueRasterRef.current = null
    setShowExport(true)
  }, [closeExport, showExport])

  const renderExportItem = (item: (typeof exports)[number]) => (
    <ExportItemButton
      key={item.label}
      icon={item.icon}
      label={item.label}
      description={item.desc}
      onClick={() => runExport(item.action)}
    />
  )

  return (
    <>
      <button
        ref={exportBtnRef}
        type="button"
        onClick={handleToggle}
        className="pill-btn primary"
        aria-label="导出"
        aria-haspopup="dialog"
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
              ref={dialogRef}
              className="panel em-menu"
              role="dialog"
              aria-modal="true"
              aria-label="导出选项"
              style={{ top: exportPos.top, right: exportPos.right }}
            >
              {exports.slice(0, 1).map(renderExportItem)}
              <JpegExportPanel
                quality={jpegQuality}
                estimate={jpegEstimate}
                onExport={() => runExport(exportJPEG)}
                onQualityChange={setJpegQuality}
              />
              {exports.slice(1).map(renderExportItem)}
              <div className="dsep" />
              <button
                type="button"
                onClick={() => {
                  fileRef.current?.click()
                  closeExport(false)
                }}
                className="ditem"
                aria-label="导入 JSON"
              >
                <span className="di em-icon">
                  <FileUp size={16} />
                </span>
                <span className="em-labels">
                  <span className="dl">导入 JSON</span>
                  <span className="dd">导入 v4、v3 或旧版文件，替换当前画板</span>
                </span>
              </button>
            </div>
            <div className="em-overlay" onClick={() => closeExport()} />
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
