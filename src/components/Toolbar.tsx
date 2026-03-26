import React, { Suspense, lazy, useCallback, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useThemeStore } from '../store/useThemeStore'
import { aiService, type CanvasAnalysisResult } from '../services/aiService'
import { useToast } from './ui/Toast'
import { ToolSelector } from './Toolbar/ToolSelector'
import { PropertyPanel } from './Toolbar/PropertyPanel'
import { ViewControls } from './Toolbar/ViewControls'

const AIResultPanel = lazy(() => import('./AIResultPanel'))

declare global {
  interface Window {
    __MINDNOTES_TLDRAW_EDITOR__?: unknown
  }
}

const Toolbar: React.FC = () => {
  const { showInfo, showSuccess, showError } = useToast()
  useAppStore()
  useThemeStore()
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

    if (!editor) return null

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

      if (typeof tldrawModule.exportToBlob !== 'function') return null

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
    if (tldrawImage) return tldrawImage

    const canvas = document.querySelector('[data-whiteboard-canvas="true"]') as HTMLCanvasElement | null
    if (!canvas) throw new Error('未找到画布元素')

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
    if (!exportCtx) throw new Error('无法创建导出画布上下文')

    exportCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, exportCanvas.width, exportCanvas.height)
    return exportCanvas.toDataURL('image/png')
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

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[var(--toolbar-bg)] backdrop-blur-sm rounded-2xl shadow-xl border border-[var(--border-color)] px-6 py-3 flex items-center gap-4 z-10">
      {/* 工具选择 */}
      <ToolSelector />

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 属性设置 */}
      <PropertyPanel />

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* 视图控制 */}
      <ViewControls />

      <div className="w-px h-8 bg-[var(--border-color)]" />

      {/* AI 分析 */}
      <button
        onClick={handleAnalyzeCanvas}
        disabled={isAnalyzing}
        className={`toolbar-btn ${isAnalyzing ? 'loading' : ''}`}
        title="AI 智能分析白板内容"
      >
        {isAnalyzing ? '⏳ 分析中...' : '🤖 AI 分析'}
      </button>

      {/* AI 结果面板 */}
      {showAnalysisPanel && analysisResult && (
        <Suspense fallback={<div className="loading">加载中...</div>}>
          <AIResultPanel
            open={showAnalysisPanel}
            result={analysisResult}
            onClose={() => setShowAnalysisPanel(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default Toolbar
