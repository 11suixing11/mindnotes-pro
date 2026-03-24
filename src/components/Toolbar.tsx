import React, { Suspense, lazy, useCallback, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useThemeStore } from '../store/useThemeStore'
import { aiService, type CanvasAnalysisResult } from '../services/aiService'
import { useToast } from './ui/Toast'

const AIResultPanel = lazy(() => import('./AIResultPanel'))

declare global {
  interface Window {
    __MINDNOTES_TLDRAW_EDITOR__?: unknown
  }
}

const Toolbar: React.FC = () => {
  const { showInfo, showSuccess, showError } = useToast()
  const {
    tool,
    color,
    size,
    setTool,
    setColor,
    setSize,
    clearStrokes,
    undo,
    zoomIn,
    zoomOut,
    resetView,
  } = useAppStore()
  const { isDarkMode, toggleTheme } = useThemeStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<CanvasAnalysisResult | null>(null)
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)

  const blobToDataURL = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
          return
        }
        reject(new Error('图片转换失败：无法读取 base64 数据'))
      }
      reader.onerror = () => reject(new Error('图片转换失败：文件读取异常'))
      reader.readAsDataURL(blob)
    })
  }, [])

  const getTldrawImage = useCallback(async (): Promise<string | null> => {
    const editor = window.__MINDNOTES_TLDRAW_EDITOR__ as
      | { getCurrentPageShapeIds?: () => Set<unknown> }
      | undefined

    if (!editor) {
      return null
    }

    try {
      const tldrawModule = (await import('@tldraw/tldraw')) as {
        exportToBlob?: (input: {
          editor: unknown
          format?: 'png' | 'jpeg' | 'svg'
          darkMode?: boolean
          background?: boolean
          ids?: Set<unknown>
          padding?: number
        }) => Promise<Blob>
      }

      if (typeof tldrawModule.exportToBlob !== 'function') {
        return null
      }

      const ids = editor.getCurrentPageShapeIds?.()
      const blob = await tldrawModule.exportToBlob({
        editor,
        format: 'png',
        background: true,
        darkMode: false,
        padding: 16,
        ids,
      })

      return blobToDataURL(blob)
    } catch {
      return null
    }
  }, [blobToDataURL])

  const getVisibleCanvasImage = useCallback(async (): Promise<string> => {
    const tldrawImage = await getTldrawImage()
    if (tldrawImage) {
      return tldrawImage
    }

    const canvas = document.querySelector('[data-whiteboard-canvas="true"]') as HTMLCanvasElement | null
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const visibleLeft = Math.max(rect.left, 0)
      const visibleTop = Math.max(rect.top, 0)
      const visibleRight = Math.min(rect.right, window.innerWidth)
      const visibleBottom = Math.min(rect.bottom, window.innerHeight)

      const visibleWidth = visibleRight - visibleLeft
      const visibleHeight = visibleBottom - visibleTop

      if (visibleWidth <= 0 || visibleHeight <= 0) {
        throw new Error('当前画布不在可视区域内，无法分析')
      }

      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const sx = (visibleLeft - rect.left) * scaleX
      const sy = (visibleTop - rect.top) * scaleY
      const sw = visibleWidth * scaleX
      const sh = visibleHeight * scaleY

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = Math.max(1, Math.floor(sw))
      exportCanvas.height = Math.max(1, Math.floor(sh))

      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) {
        throw new Error('无法创建导出画布上下文')
      }

      exportCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, exportCanvas.width, exportCanvas.height)
      return exportCanvas.toDataURL('image/png')
    }

    const svg = document.querySelector('svg') as SVGSVGElement | null
    if (svg) {
      const rect = svg.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      const serializedSvg = new XMLSerializer().serializeToString(svg)
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(serializedSvg)))}`

      const svgImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('SVG 导出失败'))
        image.src = svgDataUrl
      })

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = width
      exportCanvas.height = height

      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) {
        throw new Error('无法创建 SVG 导出上下文')
      }

      exportCtx.drawImage(svgImage, 0, 0, width, height)
      return exportCanvas.toDataURL('image/png')
    }

    throw new Error('未找到可分析的 Canvas 或 SVG 内容')
  }, [getTldrawImage])

  const handleAnalyzeCanvas = useCallback(async () => {
    try {
      setIsAnalyzing(true)
      showInfo('正在分析当前白板，请稍候...')

      const base64Image = await getVisibleCanvasImage()
      const result = await aiService.analyzeWhiteboard(base64Image)

      setAnalysisResult(result)
      setShowAnalysisPanel(true)
      showSuccess('AI 智能分析完成', {
        label: '查看结果',
        onClick: () => setShowAnalysisPanel(true),
        variant: 'primary',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 分析失败，请稍后重试'
      showError(message)
    } finally {
      setIsAnalyzing(false)
    }
  }, [getVisibleCanvasImage, showError, showInfo, showSuccess])

  const colors = [
    '#000000', // 黑
    '#ef4444', // 红
    '#22c55e', // 绿
    '#3b82f6', // 蓝
    '#f59e0b', // 黄
    '#8b5cf6', // 紫
  ]

  const sizes = [2, 4, 6, 8, 10]

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-2xl shadow-xl border border-[var(--border-color)] px-6 py-3 flex items-center gap-4 z-10">
      {/* 工具选择 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool('pen')}
          className={`toolbar-btn ${tool === 'pen' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
        >
          ✏️ 笔
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`toolbar-btn ${tool === 'eraser' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
        >
          🧹 橡皮
        </button>
        <button
          onClick={() => setTool('pan')}
          className={`toolbar-btn ${tool === 'pan' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
        >
          ✋ 平移
        </button>
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 形状工具 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool('rectangle')}
          className={`toolbar-btn ${tool === 'rectangle' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
          title="矩形工具"
        >
          ⬜ 矩形
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`toolbar-btn ${tool === 'circle' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
          title="圆形工具"
        >
          ⭕ 圆形
        </button>
        <button
          onClick={() => setTool('triangle')}
          className={`toolbar-btn ${tool === 'triangle' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
          title="三角形工具"
        >
          🔺 三角
        </button>
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 箭头和连线工具 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool('line' as any)}
          className={`toolbar-btn ${tool === 'line' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
          title="直线工具"
        >
          📏 直线
        </button>
        <button
          onClick={() => setTool('arrow' as any)}
          className={`toolbar-btn ${tool === 'arrow' ? 'active' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
          title="箭头工具"
        >
          ➡️ 箭头
        </button>
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 颜色选择 */}
      <div className="flex items-center gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              color === c ? 'border-primary scale-110' : 'border-[var(--border-color)]'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 粗细选择 */}
      <div className="flex items-center gap-2">
        {sizes.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              size === s
                ? 'bg-primary text-white'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'
            }`}
          >
            <div className="rounded-full bg-current" style={{ width: s * 2, height: s * 2 }} />
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 缩放控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
          title="缩小 (-)"
        >
          🔍-
        </button>
        <button
          onClick={resetView}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
          title="重置视图 (0)"
        >
          🔍100%
        </button>
        <button
          onClick={zoomIn}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
          title="放大 (+)"
        >
          🔍+
        </button>
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
        >
          ↩️ 撤销
        </button>
        <button
          onClick={clearStrokes}
          className="toolbar-btn bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
        >
          🗑️ 清空
        </button>
      </div>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 主题切换 */}
      <button
        onClick={toggleTheme}
        className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
        title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
      >
        {isDarkMode ? '☀️ 浅色' : '🌙 深色'}
      </button>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* AI 智能分析 */}
      <button
        onClick={handleAnalyzeCanvas}
        disabled={isAnalyzing}
        className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--bg-tertiary)]"
        title="分析当前可视区域"
      >
        {isAnalyzing ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            分析中...
          </span>
        ) : (
          '✨ AI 智能分析'
        )}
      </button>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 快捷键帮助 */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-shortcuts'))}
        className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
        title="查看快捷键 (?)"
      >
        ⌨️ 帮助
      </button>

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 图层面板 */}
      <button
        onClick={() => {
          useAppStore.getState().toggleLayersPanel()
        }}
        className="toolbar-btn bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]"
        title="图层管理"
      >
        📑 图层
      </button>

      <Suspense
        fallback={
          showAnalysisPanel ? (
            <div className="fixed top-20 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-color)] bg-[var(--toolbar-bg)] p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-3 h-4 w-28 animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-[var(--bg-tertiary)]" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--bg-tertiary)]" />
                <div className="h-3 w-4/6 animate-pulse rounded bg-[var(--bg-tertiary)]" />
              </div>
            </div>
          ) : null
        }
      >
        <AIResultPanel
          open={showAnalysisPanel}
          result={analysisResult}
          onClose={() => setShowAnalysisPanel(false)}
        />
      </Suspense>
    </div>
  )
}

export default Toolbar
