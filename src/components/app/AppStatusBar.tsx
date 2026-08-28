import type { KeyboardEvent } from 'react'
import { getContentBounds } from '../../canvas/canvasUtils'
import { FEEDBACK_DISCUSSION_URL } from '../../productLinks'
import { useAppStore } from '../../store/appStore'
import type { ToolType } from '../../store/types'
import { createCanvasBackup } from '../../store/backup'
import { buildExportFilename } from '../export-menu/exportMenuModel'
import { createBlankDocument } from '../../store/slices/documentRecords'
import { useViewStore } from '../../store/useViewStore'

const TOOL_LABELS: Record<ToolType, string> = {
  select: '选择',
  pen: '画笔',
  eraser: '橡皮擦',
  pan: '平移',
  text: '文字',
  rectangle: '矩形',
  circle: '圆形',
  line: '直线',
  arrow: '箭头',
}

interface AppStatusBarProps {
  onOpenShortcuts: () => void
}

export function AppStatusBar({ onOpenShortcuts }: AppStatusBarProps) {
  const tool = useAppStore((state) => state.tool)
  const elementCount = useAppStore((state) => state.elements.length)
  const saveStatus = useAppStore((state) => state.saveStatus)
  const persistenceMode = useAppStore((state) => state.persistenceMode)
  const lastSavedAt = useAppStore((state) => state.lastSavedAt)
  const saveError = useAppStore((state) => state.saveError)
  const saveNow = useAppStore((state) => state.saveNow)
  const zoom = useViewStore((state) => state.viewBox.zoom)
  const zoomToFit = useViewStore((state) => state.zoomToFit)
  const savedTime = lastSavedAt
    ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(lastSavedAt)
    : null
  const saveFeedback =
    saveStatus === 'saving'
      ? { label: '保存中', ariaLabel: '正在保存' }
      : saveStatus === 'saved'
        ? { label: savedTime ? `已保存 ${savedTime}` : '已保存', ariaLabel: '已保存' }
        : saveStatus === 'error'
          ? {
              label: persistenceMode === 'memory-only' ? '仅保存在内存中' : '保存失败',
              ariaLabel: saveError ? `保存失败：${saveError}` : '保存失败',
            }
          : { label: '已启用本地保存', ariaLabel: '已启用本地保存' }

  const exportRecoveryBackup = () => {
    try {
      const state = useAppStore.getState()
      const currentDoc =
        state.docs.find((doc) => doc.id === state.currentDocId) ??
        state.docs[0] ??
        createBlankDocument()
      const backup = createCanvasBackup({
        ...currentDoc,
        elements: state.elements,
        layers: state.layers,
        activeLayerId: state.activeLayerId,
        bgColor: state.bgColor,
        backgroundStyle: state.backgroundStyle,
      })
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      )
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildExportFilename(currentDoc, 'json')
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 200)
    } catch {
      // The persistent error state remains visible if browser downloads are unavailable.
    }
  }

  const fitContent = () => {
    const bounds = getContentBounds(useAppStore.getState().elements)
    if (bounds) zoomToFit(bounds)
  }

  const handleZoomKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    fitContent()
  }

  return (
    <div className="status panel" role="status" aria-label="应用状态">
      <span className={`dot status-dot-${saveStatus}`} aria-hidden="true" />
      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{TOOL_LABELS[tool]}</span>
      <span className="vl" aria-hidden="true" />
      <span>{elementCount} 个元素</span>
      <span className="vl" aria-hidden="true" />
      <span>单画板</span>
      <span className="vl" aria-hidden="true" />
      <span
        style={{ cursor: 'pointer' }}
        onClick={fitContent}
        onKeyDown={handleZoomKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`缩放 ${Math.round(zoom * 100)}%，点击适应内容`}
      >
        {Math.round(zoom * 100)}%
      </span>
      <span className="vl" aria-hidden="true" />
      {saveStatus === 'error' ? (
        <span className="status-save-actions">
          <button
            type="button"
            className={`status-save status-save-${saveStatus}`}
            onClick={() => void saveNow()}
            aria-live="polite"
            aria-label={saveFeedback.ariaLabel}
            title={saveError ? `保存失败：${saveError}，点击重试` : '保存失败，点击重试'}
          >
            {saveFeedback.label}
          </button>
          <button
            type="button"
            className="status-recovery"
            onClick={exportRecoveryBackup}
            aria-label="导出恢复备份"
            title="导出恢复备份"
          >
            导出恢复
          </button>
        </span>
      ) : (
        <span
          className={`status-save status-save-${saveStatus}`}
          aria-live="polite"
          aria-label={saveFeedback.ariaLabel}
        >
          {saveFeedback.label}
        </span>
      )}
      <span className="vl" aria-hidden="true" />
      <a
        href={FEEDBACK_DISCUSSION_URL}
        target="_blank"
        rel="noreferrer"
        className="status-feedback"
        title="提交反馈"
        aria-label="提交反馈"
      >
        反馈
      </a>
      <span className="vl" aria-hidden="true" />
      <button
        onClick={onOpenShortcuts}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-4)',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '0 2px',
          lineHeight: 1,
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(event) => (event.currentTarget.style.color = 'var(--primary)')}
        onMouseLeave={(event) => (event.currentTarget.style.color = 'var(--text-4)')}
        title="键盘快捷键（?）"
        aria-label="键盘快捷键"
      >
        ?
      </button>
    </div>
  )
}
